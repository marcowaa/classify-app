import {
  buildQuery,
  isSuccessStatus,
  resolveConfig,
  signState,
  toStr,
  verifyState,
} from "../helpers";
import type { PaymentAdapter, PaymentCallbackInput, PaymentCallbackResult, PaymentInitInput, PaymentProvider } from "../types";

type RequiredConfigRule = {
  aliases: string[];
  envKey?: string;
};

type QueryConfigRule = {
  queryKey: string;
  aliases: string[];
  envKey?: string;
  required?: boolean;
};

type GenericAdapterOptions = {
  provider: PaymentProvider;
  checkoutUrlAliases: string[];
  checkoutUrlEnv?: string;
  requiredConfig?: RequiredConfigRule[];
  queryConfig?: QueryConfigRule[];
  orderIdFields?: string[];
  statusFields?: string[];
};

export function createGenericRedirectAdapter(options: GenericAdapterOptions): PaymentAdapter {
  const orderIdFields = options.orderIdFields || ["orderId", "OrderId", "order_id", "merchantRefNum", "merchant_order_id", "purchaseId"];
  const statusFields = options.statusFields || ["status", "Status", "paymentStatus", "orderStatus", "success", "responseCode", "ResponseCode", "txn_response_code"];

  return {
    provider: options.provider,

    createRedirect(input: PaymentInitInput) {
      const checkoutUrl = resolveConfig(input.gatewayConfig, options.checkoutUrlAliases, options.checkoutUrlEnv);
      if (!checkoutUrl) {
        throw new Error(`${options.provider} checkout URL is missing`);
      }

      for (const rule of options.requiredConfig || []) {
        const value = resolveConfig(input.gatewayConfig, rule.aliases, rule.envKey);
        if (!value) {
          throw new Error(`${options.provider} configuration is incomplete: ${rule.aliases[0]}`);
        }
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

      const query: Record<string, string> = {
        orderId: input.purchaseId,
        amount: input.amount,
        currency: input.currency,
        state,
        callbackUrl: `${input.appBaseUrl}/api/payments/${options.provider}/callback`,
        returnUrl: `${input.appBaseUrl}/api/payments/${options.provider}/return`,
        callback_url: `${input.appBaseUrl}/api/payments/${options.provider}/callback`,
        return_url: `${input.appBaseUrl}/api/payments/${options.provider}/return`,
      };

      for (const cfg of options.queryConfig || []) {
        const value = resolveConfig(input.gatewayConfig, cfg.aliases, cfg.envKey);
        if (cfg.required && !value) {
          throw new Error(`${options.provider} configuration is incomplete: ${cfg.aliases[0]}`);
        }
        if (value) {
          query[cfg.queryKey] = value;
        }
      }

      return {
        provider: options.provider,
        paymentStatus: "pending",
        paymentUrl: buildQuery(checkoutUrl, query),
      };
    },

    parseCallback(input: PaymentCallbackInput): PaymentCallbackResult {
      const payload = input.payload || {};
      const state = toStr(payload.state || payload.State);
      let stateClaims: Record<string, any> | undefined;

      let purchaseId = "";
      for (const field of orderIdFields) {
        if (!purchaseId) {
          purchaseId = toStr(payload[field]);
        }
      }
      purchaseId = purchaseId || toStr(input.fallbackPurchaseId);

      if (!state && !purchaseId) {
        throw new Error("Missing payment state/order id");
      }

      if (state) {
        const decoded = verifyState(state, input.jwtSecret);
        stateClaims = decoded;
        purchaseId = purchaseId || toStr(decoded.purchaseId);
      }

      if (!purchaseId) {
        throw new Error("Missing purchase id");
      }

      let statusValue: unknown = "";
      for (const field of statusFields) {
        if (!statusValue) {
          statusValue = payload[field];
        }
      }

      return {
        purchaseId,
        success: isSuccessStatus(statusValue),
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
}
