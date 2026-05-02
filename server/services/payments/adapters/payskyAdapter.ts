import {
  buildQuery,
  hmacSha256,
  isSuccessStatus,
  resolveConfig,
  signState,
  toStr,
  verifyState,
} from "../helpers";
import type { PaymentAdapter, PaymentCallbackInput, PaymentCallbackResult, PaymentInitInput } from "../types";

function buildSignature(params: {
  orderId: string;
  amount: string;
  currency: string;
  status: string;
  transactionId: string;
  secretKey: string;
}) {
  const payload = [params.orderId, params.amount, params.currency, params.status, params.transactionId].join("|");
  return hmacSha256(payload, params.secretKey);
}

export const payskyAdapter: PaymentAdapter = {
  provider: "paysky",

  createRedirect(input: PaymentInitInput) {
    const mid = resolveConfig(input.gatewayConfig, ["payskyMID", "mid"]);
    const tid = resolveConfig(input.gatewayConfig, ["payskyTID", "tid"]);
    const secretKey = resolveConfig(input.gatewayConfig, ["payskySecretKey", "secretKey"]);
    const checkoutUrl = resolveConfig(input.gatewayConfig, ["payskyCheckoutUrl", "checkoutUrl"], "PAYSKY_CHECKOUT_URL");

    if (!mid || !tid || !secretKey || !checkoutUrl) {
      throw new Error("Paysky configuration is incomplete");
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

    const signature = buildSignature({
      orderId: input.purchaseId,
      amount: input.amount,
      currency: input.currency,
      status: "pending",
      transactionId: input.purchaseId,
      secretKey,
    });

    const paymentUrl = buildQuery(checkoutUrl, {
      mid,
      tid,
      orderId: input.purchaseId,
      amount: input.amount,
      currency: input.currency,
      state,
      callbackUrl: `${input.appBaseUrl}/api/payments/paysky/callback`,
      returnUrl: `${input.appBaseUrl}/api/payments/paysky/return`,
      signature,
    });

    return {
      provider: "paysky",
      paymentStatus: "pending",
      paymentUrl,
    };
  },

  parseCallback(input: PaymentCallbackInput): PaymentCallbackResult {
    const payload = input.payload || {};
    const state = toStr(payload.state || payload.State);
    const orderId = toStr(payload.orderId || payload.OrderId || input.fallbackPurchaseId);
    const status = payload.status || payload.Status || payload.responseCode || payload.ResponseCode;
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
