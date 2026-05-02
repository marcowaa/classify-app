import type { Express, Request, Response } from "express";
import express from "express";
import Stripe from "stripe";
import { storage } from "../storage";
import { successResponse, errorResponse, ErrorCode } from "../utils/apiResponse";
import { ensureWallet, recalcWalletBalance } from "../utils/walletHelper";
import {
  webhookEvents,
  storeOrders,
  orderItems,
  transactions,
  refunds,
  wallets,
  walletTransfers,
  entitlements,
  products,
} from "../../shared/schema";
import { eq, and } from "drizzle-orm";

const db = storage.db;
const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: "2023-10-16" }) : null;

async function upsertTransaction(params: {
  orderId: string;
  providerRef: string;
  amount: number;
  idempotencyKey: string;
}) {
  const existing = await db
    .select()
    .from(transactions)
    .where(eq(transactions.idempotencyKey, params.idempotencyKey));
  if (existing[0]) return existing[0];
  const inserted = await db
    .insert(transactions)
    .values({
      orderId: params.orderId,
      provider: "stripe",
      providerRef: params.providerRef,
      status: "completed",
      amount: params.amount,
      idempotencyKey: params.idempotencyKey,
      verifiedAt: new Date(),
    })
    .returning();
  return inserted[0];
}

async function fulfillOrder(orderId: string) {
  const order = await db.select().from(storeOrders).where(eq(storeOrders.id, orderId));
  if (!order[0]) return;
  const items = await db
    .select({ item: orderItems, product: products })
    .from(orderItems)
    .innerJoin(products, eq(orderItems.productId, products.id))
    .where(eq(orderItems.orderId, orderId));

  const wallet = await ensureWallet(order[0].parentId);

  for (const row of items) {
    const product = row.product;
    const item = row.item;
    if (product.productType === "wallet_topup") {
      const existing = await db
        .select()
        .from(walletTransfers)
        .where(and(eq(walletTransfers.relatedOrderId, orderId), eq(walletTransfers.type, "DEPOSIT")));
      if (existing.length === 0) {
        await db.insert(walletTransfers).values({
          walletId: wallet.id,
          type: "DEPOSIT",
          amount: item.unitAmount,
          reason: "Wallet top-up purchase",
          relatedOrderId: orderId,
        });
        await recalcWalletBalance(wallet.id);
      }
    } else {
      const existingEntitlement = await db
        .select()
        .from(entitlements)
        .where(and(eq(entitlements.orderId, orderId), eq(entitlements.productId, product.id)));
      if (existingEntitlement.length === 0) {
        await db.insert(entitlements).values({
          parentId: order[0].parentId,
          childId: null,
          productId: product.id,
          orderId,
          status: "ACTIVE",
          metadata: { orderId, orderItemId: item.id },
        });
      }
    }
  }
}

export function registerPaymentRoutes(app: Express) {
  if (!stripe || !stripeWebhookSecret) {
    console.warn("Stripe webhook not configured; skipping /api/payments/stripe/webhook route");
    return;
  }

  app.post(
    "/api/payments/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      const sig = req.headers["stripe-signature"] as string;
      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, stripeWebhookSecret);
      } catch (err: any) {
        console.error("Webhook signature verification failed", err.message);
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, "Webhook signature verification failed"));
      }

      // Log event with dedupe
      await db
        .insert(webhookEvents)
        .values({
          provider: "stripe",
          eventType: event.type,
          dedupeKey: event.id,
          payload: event as any,
          signatureVerified: true,
        })
        .onConflictDoNothing();

      // Acknowledge immediately
      res.status(200).send("ok");

      // Process asynchronously
      try {
        if (event.type === "checkout.session.completed") {
          const session = event.data.object as Stripe.Checkout.Session;
          const orderId = session.metadata?.orderId;
          if (!orderId) return;
          const order = await db.select().from(storeOrders).where(eq(storeOrders.id, orderId));
          if (!order[0]) return;

          // Idempotent transaction insert
          const amount = (session.amount_total || 0) / 100;
          await upsertTransaction({
            orderId,
            providerRef: (session.payment_intent as string) || session.id,
            amount,
            idempotencyKey: session.id,
          });

          // Mark order paid
          await db
            .update(storeOrders)
            .set({ status: "PAID", failureReason: null, updatedAt: new Date() })
            .where(eq(storeOrders.id, orderId));

          // Fulfill (idempotent)
          await fulfillOrder(orderId);
        }

        if (event.type === "checkout.session.expired") {
          const session = event.data.object as Stripe.Checkout.Session;
          const orderId = session.metadata?.orderId;
          if (!orderId) return;
          await db
            .update(storeOrders)
            .set({ status: "FAILED", failureReason: "session_expired", updatedAt: new Date() })
            .where(eq(storeOrders.id, orderId));
        }

        if (event.type === "charge.refunded") {
          const charge = event.data.object as Stripe.Charge;
          const paymentIntentId = charge.payment_intent as string;
          const txn = await db
            .select()
            .from(transactions)
            .where(eq(transactions.providerRef, paymentIntentId));
          if (!txn[0]) return;
          const orderId = txn[0].orderId;

          const existingRefund = await db
            .select()
            .from(refunds)
            .where(eq(refunds.transactionId, txn[0].id));
          if (existingRefund.length === 0) {
            await db.insert(refunds).values({
              transactionId: txn[0].id,
              amount: (charge.amount_refunded || 0) / 100,
              status: "completed",
              providerRef: charge.id,
              reason: charge.refunds?.data?.[0]?.reason || "requested_by_customer",
            });
          }

          // Reverse fulfillment
          const order = await db.select().from(storeOrders).where(eq(storeOrders.id, orderId));
          if (order[0]) {
            // Remove entitlements
            await db.delete(entitlements).where(eq(entitlements.orderId, orderId));
            // Reverse wallet transfer
            const walletTransfer = await db
              .select()
              .from(walletTransfers)
              .where(and(eq(walletTransfers.relatedOrderId, orderId), eq(walletTransfers.type, "DEPOSIT")));
            if (walletTransfer[0]) {
              await db.insert(walletTransfers).values({
                walletId: walletTransfer[0].walletId,
                type: "REFUND",
                amount: `-${walletTransfer[0].amount}`,
                reason: "Refund reversal",
                relatedOrderId: orderId,
              });
              await recalcWalletBalance(walletTransfer[0].walletId);
            }
            await db
              .update(storeOrders)
              .set({ status: "REFUNDED", failureReason: null, updatedAt: new Date() })
              .where(eq(storeOrders.id, orderId));
          }
        }

        // Mark webhook processed
        await db
          .update(webhookEvents)
          .set({ processedAt: new Date(), errorMessage: null })
          .where(eq(webhookEvents.dedupeKey, event.id));
      } catch (err: any) {
        console.error("Webhook processing error", err);
        await db
          .update(webhookEvents)
          .set({ errorMessage: err.message })
          .where(eq(webhookEvents.dedupeKey, event.id));
      }
    }
  );
}
