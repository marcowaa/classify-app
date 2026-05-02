import { and, eq, isNull } from "drizzle-orm";
import {
  buildCanonicalPayloadString,
  hmacSha256,
  resolveConfig,
  safeEquals,
  toStr,
} from "./helpers";
import {
  libraryActivityLogs,
  libraryOrders,
  libraryReferralSettings,
  libraries,
  parentOwnedProducts,
  parentPurchases,
  paymentMethods,
} from "../../../shared/schema";
import { storage } from "../../storage";
import { getPaymentAdapter, isSupportedPaymentProvider } from "./registry";
import type { PaymentProvider } from "./types";

const db = storage.db;

function trimTrailingSlashes(value: string): string {
  let end = value.length;
  while (end > 0 && value.charCodeAt(end - 1) === 47) {
    end -= 1;
  }
  return value.slice(0, end);
}

export function resolvePublicAppBaseUrl(req: any): string {
  const configured = process.env.PUBLIC_APP_URL || process.env.APP_BASE_URL || process.env.PUBLIC_BASE_URL;
  if (configured) return trimTrailingSlashes(configured);

  const forwardedProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const proto = forwardedProto || req.protocol || "https";
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
  return trimTrailingSlashes(`${proto}://${host}`);
}

export function verifyProviderCallbackSignature(params: {
  provider: string;
  payload: Record<string, any>;
  gatewayConfig: Record<string, any>;
}) {
  const provider = String(params.provider || "").toLowerCase();
  const payload = params.payload || {};
  const gatewayConfig = params.gatewayConfig || {};

  const incomingSignature =
    toStr(payload.signature) ||
    toStr(payload.Signature) ||
    toStr(payload.hmac) ||
    toStr(payload.HMAC) ||
    toStr(payload.hash);

  if (!incomingSignature) {
    return { verified: false, reason: "missing_signature" };
  }

  if (provider === "paysky") {
    const secret = resolveConfig(gatewayConfig, ["payskySecretKey", "secretKey"]);
    if (!secret) {
      return { verified: false, reason: "missing_provider_secret" };
    }

    const orderId = toStr(payload.orderId || payload.OrderId || payload.merchantRefNum || payload.merchant_order_id);
    const amount = toStr(payload.amount || payload.Amount);
    const currency = toStr(payload.currency || payload.currencyCode || payload.Currency || "EGP");
    const status = toStr(payload.status || payload.Status || payload.responseCode || payload.ResponseCode);
    const transactionId = toStr(payload.transactionId || payload.TransactionId || payload.txnId || orderId);

    if (!orderId || !amount || !status || !transactionId) {
      return { verified: false, reason: "missing_required_signature_fields" };
    }

    const base = [orderId, amount, currency, status, transactionId].join("|");
    const expected = hmacSha256(base, secret);
    return { verified: safeEquals(expected.toLowerCase(), incomingSignature.toLowerCase()), reason: "paysky_hmac" };
  }

  // Generic fallback: configurable callback secret + canonical payload HMAC.
  // Works when provider supports custom HMAC over callback fields.
  const callbackSecret = resolveConfig(gatewayConfig, ["callbackSecret", "webhookSecret", "secretKey"]);
  if (!callbackSecret) {
    return { verified: false, reason: "missing_callback_secret" };
  }

  const canonical = buildCanonicalPayloadString(payload, ["signature", "Signature", "hmac", "HMAC", "hash"]);
  if (!canonical) {
    return { verified: false, reason: "empty_payload" };
  }

  const expected = hmacSha256(canonical, callbackSecret);
  return { verified: safeEquals(expected.toLowerCase(), incomingSignature.toLowerCase()), reason: "generic_hmac" };
}

async function awardLibrarySaleActivityForPurchase(tx: any, purchaseId: string, parentId: string) {
  const referralSettingsRows = await tx.select().from(libraryReferralSettings).limit(1);
  const saleActivityPoints = referralSettingsRows[0]?.pointsPerSale ?? 10;

  const orders = await tx
    .select({
      id: libraryOrders.id,
      libraryId: libraryOrders.libraryId,
      quantity: libraryOrders.quantity,
      subtotal: libraryOrders.subtotal,
      libraryProductId: libraryOrders.libraryProductId,
    })
    .from(libraryOrders)
    .where(eq(libraryOrders.parentPurchaseId, purchaseId));

  for (const order of orders) {
    await tx.insert(libraryActivityLogs).values({
      libraryId: order.libraryId,
      action: "sale",
      points: saleActivityPoints,
      metadata: {
        purchaseId,
        parentId,
        libraryProductId: order.libraryProductId,
        quantity: order.quantity,
        amount: String(order.subtotal),
      },
    });

    await tx
      .update(libraries)
      .set({
        activityScore: libraries.activityScore + saleActivityPoints,
        updatedAt: new Date(),
      })
      .where(eq(libraries.id, order.libraryId));
  }
}

export async function setParentPurchaseStatus(
  purchaseId: string,
  paymentStatus: "paid" | "failed"
): Promise<{ updated: boolean; finalStatus: "paid" | "failed" | "pending" }> {
  return db.transaction(async (tx: any) => {
    if (paymentStatus === "paid") {
      const updatedPurchase = await tx
        .update(parentPurchases)
        .set({ paymentStatus: "paid" })
        .where(and(eq(parentPurchases.id, purchaseId), eq(parentPurchases.paymentStatus, "pending")))
        .returning({ id: parentPurchases.id, parentId: parentPurchases.parentId });

      if (!updatedPurchase[0]) {
        const existing = await tx
          .select({ paymentStatus: parentPurchases.paymentStatus })
          .from(parentPurchases)
          .where(eq(parentPurchases.id, purchaseId))
          .limit(1);
        return { updated: false, finalStatus: (existing[0]?.paymentStatus || "pending") as "paid" | "failed" | "pending" };
      }

      await tx
        .update(parentOwnedProducts)
        .set({ status: "active", updatedAt: new Date() })
        .where(and(
          eq(parentOwnedProducts.sourcePurchaseId, purchaseId),
          eq(parentOwnedProducts.status, "pending_admin_approval")
        ));

      await awardLibrarySaleActivityForPurchase(tx, purchaseId, updatedPurchase[0].parentId);
      return { updated: true, finalStatus: "paid" };
    }

    const updatedPurchase = await tx
      .update(parentPurchases)
      .set({ paymentStatus: "failed" })
      .where(and(eq(parentPurchases.id, purchaseId), eq(parentPurchases.paymentStatus, "pending")))
      .returning({ id: parentPurchases.id });

    if (!updatedPurchase[0]) {
      const existing = await tx
        .select({ paymentStatus: parentPurchases.paymentStatus })
        .from(parentPurchases)
        .where(eq(parentPurchases.id, purchaseId))
        .limit(1);
      return { updated: false, finalStatus: (existing[0]?.paymentStatus || "pending") as "paid" | "failed" | "pending" };
    }

    return { updated: true, finalStatus: "failed" };
  });
}

export async function createPaymentRedirectForMethod(params: {
  paymentMethodId: string;
  purchaseId: string;
  parentId: string;
  amount: string;
  currency: string;
  appBaseUrl: string;
  jwtSecret: string;
}) {
  const methodRows = await db
    .select()
    .from(paymentMethods)
    .where(and(
      eq(paymentMethods.id, params.paymentMethodId),
      isNull(paymentMethods.parentId),
      eq(paymentMethods.isActive, true)
    ))
    .limit(1);

  const method = methodRows[0];
  if (!method) {
    throw new Error("Invalid payment method");
  }

  if (!isSupportedPaymentProvider(method.type)) {
    return null;
  }

  const provider = method.type as PaymentProvider;
  const adapter = getPaymentAdapter(provider);

  const gatewayConfig = method.gatewayConfig && typeof method.gatewayConfig === "object"
    ? (method.gatewayConfig as Record<string, any>)
    : {};

  return adapter.createRedirect({
    provider,
    purchaseId: params.purchaseId,
    parentId: params.parentId,
    amount: params.amount,
    currency: params.currency,
    appBaseUrl: params.appBaseUrl,
    methodId: method.id,
    gatewayConfig,
    jwtSecret: params.jwtSecret,
  });
}

export async function parseProviderCallback(params: {
  providerRaw: string;
  payload: Record<string, any>;
  jwtSecret: string;
  fallbackPurchaseId?: string;
}) {
  if (!isSupportedPaymentProvider(params.providerRaw)) {
    throw new Error("Unsupported payment provider");
  }

  const provider = params.providerRaw;
  const adapter = getPaymentAdapter(provider);
  return adapter.parseCallback({
    provider,
    payload: params.payload,
    jwtSecret: params.jwtSecret,
    fallbackPurchaseId: params.fallbackPurchaseId,
  });
}
