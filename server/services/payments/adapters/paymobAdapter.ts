import { buildQuery, isSuccessStatus, resolveConfig, signState, toStr, verifyState } from "../helpers";
import type { PaymentAdapter, PaymentCallbackInput, PaymentCallbackResult, PaymentInitInput } from "../types";

export const paymobAdapter: PaymentAdapter = {
  provider: "paymob",

  createRedirect(input: PaymentInitInput) {
    const checkoutUrl = resolveConfig(input.gatewayConfig, ["paymobCheckoutUrl", "checkoutUrl"], "PAYMOB_CHECKOUT_URL");
    const publicKey = resolveConfig(input.gatewayConfig, ["paymobPublicKey", "publicKey"]);
    const integrationId = resolveConfig(input.gatewayConfig, ["paymobIntegrationId", "integrationId"]);

    if (!checkoutUrl || !integrationId) {
      throw new Error("Paymob configuration is incomplete");
    }

    const state = signState(
      {
        purchaseId: input.purchaseId,
        parentId: input.parentId,
        methodId: input.methodId,
        provider: input.provider,
      },
      input.jwtSecret
    );

    const paymentUrl = buildQuery(checkoutUrl, {
      amount: input.amount,
      currency: input.currency,
      merchant_order_id: input.purchaseId,
      integration_id: integrationId,
      public_key: publicKey,
      state,
      callback_url: `${input.appBaseUrl}/api/payments/paymob/callback`,
      return_url: `${input.appBaseUrl}/api/payments/paymob/return`,
    });

    return {
      provider: "paymob",
      paymentStatus: "pending",
      paymentUrl,
    };
  },

  parseCallback(input: PaymentCallbackInput): PaymentCallbackResult {
    const payload = input.payload || {};
    const state = toStr(payload.state || payload.State);
    const orderId = toStr(payload.orderId || payload.order_id || payload.merchant_order_id || input.fallbackPurchaseId);
    const status = payload.status || payload.success || payload.txn_response_code;
    let stateClaims: Record<string, any> | undefined;

    if (!state && !orderId) {
      throw new Error("Missing payment state/order id");
    }

    let purchaseId = orderId;
    if (state) {
      const decoded = verifyState(state, input.jwtSecret);
      stateClaims = decoded;
      purchaseId = purchaseId || toStr(decoded.purchaseId);
    }

    if (!purchaseId) {
      throw new Error("Missing purchase id");
    }

    return {
      purchaseId,
      success: isSuccessStatus(status),
      stateClaims: stateClaims
        ? {
          purchaseId: toStr(stateClaims.purchaseId),
          parentId: toStr(stateClaims.parentId),
          methodId: toStr(stateClaims.methodId),
          provider: toStr(stateClaims.provider),
        }
        : undefined,
    };
  },
};
