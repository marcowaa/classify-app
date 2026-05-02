import { fawryAdapter } from "./adapters/fawryAdapter";
import { createGenericRedirectAdapter } from "./adapters/genericRedirectAdapter";
import { paymobAdapter } from "./adapters/paymobAdapter";
import { payskyAdapter } from "./adapters/payskyAdapter";
import type { PaymentAdapter, PaymentProvider } from "./types";

const amanAdapter = createGenericRedirectAdapter({
  provider: "aman",
  checkoutUrlAliases: ["amanCheckoutUrl", "checkoutUrl"],
  checkoutUrlEnv: "AMAN_CHECKOUT_URL",
  requiredConfig: [
    { aliases: ["amanMerchantId", "merchantId"] },
    { aliases: ["amanApiKey", "apiKey"] },
  ],
  queryConfig: [
    { queryKey: "merchantId", aliases: ["amanMerchantId", "merchantId"], required: true },
  ],
});

const masaryAdapter = createGenericRedirectAdapter({
  provider: "masary",
  checkoutUrlAliases: ["masaryCheckoutUrl", "checkoutUrl"],
  checkoutUrlEnv: "MASARY_CHECKOUT_URL",
  requiredConfig: [
    { aliases: ["masaryMerchantId", "merchantId"] },
    { aliases: ["masaryApiKey", "apiKey"] },
  ],
  queryConfig: [
    { queryKey: "merchantId", aliases: ["masaryMerchantId", "merchantId"], required: true },
  ],
});

const beeAdapter = createGenericRedirectAdapter({
  provider: "bee",
  checkoutUrlAliases: ["beeCheckoutUrl", "checkoutUrl"],
  checkoutUrlEnv: "BEE_CHECKOUT_URL",
  requiredConfig: [{ aliases: ["beeMerchantCode", "merchantCode"] }],
  queryConfig: [
    { queryKey: "merchantCode", aliases: ["beeMerchantCode", "merchantCode"], required: true },
  ],
});

const khalesAdapter = createGenericRedirectAdapter({
  provider: "khales",
  checkoutUrlAliases: ["khalesCheckoutUrl", "checkoutUrl"],
  checkoutUrlEnv: "KHALES_CHECKOUT_URL",
  requiredConfig: [
    { aliases: ["khalesMerchantId", "merchantId"] },
    { aliases: ["khalesApiKey", "apiKey"] },
  ],
  queryConfig: [
    { queryKey: "merchantId", aliases: ["khalesMerchantId", "merchantId"], required: true },
  ],
});

const valuAdapter = createGenericRedirectAdapter({
  provider: "valu",
  checkoutUrlAliases: ["valuCheckoutUrl", "checkoutUrl"],
  checkoutUrlEnv: "VALU_CHECKOUT_URL",
  requiredConfig: [
    { aliases: ["valuMerchantId", "merchantId"] },
    { aliases: ["valuClientId", "clientId"] },
    { aliases: ["valuClientSecret", "clientSecret"] },
  ],
  queryConfig: [
    { queryKey: "merchantId", aliases: ["valuMerchantId", "merchantId"], required: true },
  ],
});

const symplAdapter = createGenericRedirectAdapter({
  provider: "sympl",
  checkoutUrlAliases: ["symplCheckoutUrl", "checkoutUrl"],
  checkoutUrlEnv: "SYMPL_CHECKOUT_URL",
  requiredConfig: [
    { aliases: ["symplMerchantId", "merchantId"] },
    { aliases: ["symplApiKey", "apiKey"] },
  ],
  queryConfig: [
    { queryKey: "merchantId", aliases: ["symplMerchantId", "merchantId"], required: true },
  ],
});

const forsaAdapter = createGenericRedirectAdapter({
  provider: "forsa",
  checkoutUrlAliases: ["forsaCheckoutUrl", "checkoutUrl"],
  checkoutUrlEnv: "FORSA_CHECKOUT_URL",
  requiredConfig: [
    { aliases: ["forsaMerchantId", "merchantId"] },
    { aliases: ["forsaApiKey", "apiKey"] },
  ],
  queryConfig: [
    { queryKey: "merchantId", aliases: ["forsaMerchantId", "merchantId"], required: true },
  ],
});

const contactNowPayAdapter = createGenericRedirectAdapter({
  provider: "contact_nowpay",
  checkoutUrlAliases: ["contactCheckoutUrl", "checkoutUrl"],
  checkoutUrlEnv: "CONTACT_NOWPAY_CHECKOUT_URL",
  requiredConfig: [
    { aliases: ["contactMerchantId", "merchantId"] },
    { aliases: ["contactApiKey", "apiKey"] },
  ],
  queryConfig: [
    { queryKey: "merchantId", aliases: ["contactMerchantId", "merchantId"], required: true },
  ],
});

const meezaAdapter = createGenericRedirectAdapter({
  provider: "meeza",
  checkoutUrlAliases: ["meezaCheckoutUrl", "checkoutUrl"],
  checkoutUrlEnv: "MEEZA_CHECKOUT_URL",
  requiredConfig: [{ aliases: ["meezaMerchantId", "merchantId"] }],
  queryConfig: [
    { queryKey: "merchantId", aliases: ["meezaMerchantId", "merchantId"], required: true },
  ],
});

const nbeAdapter = createGenericRedirectAdapter({
  provider: "nbe_accept",
  checkoutUrlAliases: ["nbeCheckoutUrl", "checkoutUrl"],
  checkoutUrlEnv: "NBE_CHECKOUT_URL",
  requiredConfig: [{ aliases: ["nbeMerchantId", "merchantId"] }],
  queryConfig: [
    { queryKey: "merchantId", aliases: ["nbeMerchantId", "merchantId"], required: true },
  ],
});

const banqueMisrAdapter = createGenericRedirectAdapter({
  provider: "banque_misr_gateway",
  checkoutUrlAliases: ["bmCheckoutUrl", "checkoutUrl"],
  checkoutUrlEnv: "BANQUE_MISR_CHECKOUT_URL",
  requiredConfig: [{ aliases: ["bmMerchantId", "merchantId"] }],
  queryConfig: [
    { queryKey: "merchantId", aliases: ["bmMerchantId", "merchantId"], required: true },
  ],
});

const cibAdapter = createGenericRedirectAdapter({
  provider: "cib_accept",
  checkoutUrlAliases: ["cibCheckoutUrl", "checkoutUrl"],
  checkoutUrlEnv: "CIB_CHECKOUT_URL",
  requiredConfig: [{ aliases: ["cibMerchantId", "merchantId"] }],
  queryConfig: [
    { queryKey: "merchantId", aliases: ["cibMerchantId", "merchantId"], required: true },
  ],
});

const googlePayAdapter = createGenericRedirectAdapter({
  provider: "google_pay",
  checkoutUrlAliases: ["googlePayCheckoutUrl", "checkoutUrl"],
  checkoutUrlEnv: "GOOGLE_PAY_CHECKOUT_URL",
  requiredConfig: [
    { aliases: ["googlePayCheckoutUrl", "checkoutUrl"] },
    { aliases: ["callbackSecret", "webhookSecret", "secretKey"] },
  ],
  queryConfig: [
    { queryKey: "method", aliases: ["googlePayMethod", "method"], required: false },
    { queryKey: "merchantId", aliases: ["googlePayMerchantId", "merchantId"], required: false },
  ],
});

const adapters: Record<PaymentProvider, PaymentAdapter> = {
  paysky: payskyAdapter,
  paymob: paymobAdapter,
  fawry: fawryAdapter,
  google_pay: googlePayAdapter,
  aman: amanAdapter,
  masary: masaryAdapter,
  bee: beeAdapter,
  khales: khalesAdapter,
  valu: valuAdapter,
  sympl: symplAdapter,
  forsa: forsaAdapter,
  contact_nowpay: contactNowPayAdapter,
  meeza: meezaAdapter,
  nbe_accept: nbeAdapter,
  banque_misr_gateway: banqueMisrAdapter,
  cib_accept: cibAdapter,
};

export function isSupportedPaymentProvider(value: unknown): value is PaymentProvider {
  if (typeof value !== "string") return false;
  return value in adapters;
}

export function getPaymentAdapter(provider: PaymentProvider): PaymentAdapter {
  return adapters[provider];
}
