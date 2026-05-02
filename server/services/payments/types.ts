export type PaymentProvider =
  | "paysky"
  | "paymob"
  | "fawry"
  | "google_pay"
  | "aman"
  | "masary"
  | "bee"
  | "khales"
  | "valu"
  | "sympl"
  | "forsa"
  | "contact_nowpay"
  | "meeza"
  | "nbe_accept"
  | "banque_misr_gateway"
  | "cib_accept";

export type PaymentRedirectResult = {
  paymentUrl: string;
  paymentStatus: "pending";
  provider: PaymentProvider;
};

export type PaymentInitInput = {
  provider: PaymentProvider;
  purchaseId: string;
  parentId: string;
  amount: string;
  currency: string;
  appBaseUrl: string;
  methodId: string;
  gatewayConfig: Record<string, any>;
  jwtSecret: string;
};

export type PaymentCallbackInput = {
  provider: PaymentProvider;
  payload: Record<string, any>;
  jwtSecret: string;
  fallbackPurchaseId?: string;
};

export type PaymentCallbackResult = {
  purchaseId: string;
  success: boolean;
  stateClaims?: {
    purchaseId?: string;
    parentId?: string;
    methodId?: string;
    provider?: string;
  };
};

export type PaymentAdapter = {
  provider: PaymentProvider;
  createRedirect(input: PaymentInitInput): PaymentRedirectResult;
  parseCallback(input: PaymentCallbackInput): PaymentCallbackResult;
};
