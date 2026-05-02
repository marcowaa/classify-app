import { buildQuery, isSuccessStatus, resolveConfig, signState, toStr, verifyState } from "../helpers";
import type { PaymentAdapter, PaymentCallbackInput, PaymentCallbackResult, PaymentInitInput } from "../types";

export const fawryAdapter: PaymentAdapter = {
  provider: "fawry",

  createRedirect(input: PaymentInitInput) {
    const checkoutUrl = resolveConfig(input.gatewayConfig, ["fawryCheckoutUrl", "checkoutUrl"], "FAWRY_CHECKOUT_URL");
    const merchantCode = resolveConfig(input.gatewayConfig, ["fawryMerchantCode", "merchantCode"]);

    if (!checkoutUrl || !merchantCode) {
      throw new Error("Fawry configuration is incomplete");
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
      merchantCode,
      merchantRefNum: input.purchaseId,
      amount: input.amount,
      currencyCode: input.currency,
      state,
      callbackUrl: `${input.appBaseUrl}/api/payments/fawry/callback`,
      returnUrl: `${input.appBaseUrl}/api/payments/fawry/return`,
    });

    return {
      provider: "fawry",
      paymentStatus: "pending",
      paymentUrl,
    };
  },

  parseCallback(input: PaymentCallbackInput): PaymentCallbackResult {
    const payload = input.payload || {};
    const state = toStr(payload.state || payload.State);
    const orderId = toStr(payload.orderId || payload.merchantRefNum || payload.OrderId || input.fallbackPurchaseId);
    const status = payload.paymentStatus || payload.status || payload.orderStatus;
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
