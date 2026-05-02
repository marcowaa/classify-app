import React, { useMemo, useState } from "react";
import i18next from "i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ProviderField = {
  key: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  type?: "text" | "password" | "url";
};

type ProviderConfig = {
  id: string;
  label: string;
  labelEn: string;
  emoji: string;
  integrationType: string;
  docsHint: string;
  fields: ProviderField[];
};

type PaymentCategory = "manual" | "egyptian_gateways" | "global" | "google";

type PaymentVisibility = Record<PaymentCategory, boolean>;

type GooglePlayMonetizationPolicy = {
  enabled: boolean;
  enforceAndroidDigitalPurchases: boolean;
  googlePlayMethodType: string;
  walletCheckoutEnabled: boolean;
  pointsPerCurrencyUnit: number;
  defaultCurrency: string;
  childRequestInvoicesEnabled: boolean;
};

interface PaymentMethod {
  id: string;
  parentId?: string | null;
  type: string;
  displayName?: string | null;
  accountNumber: string;
  accountName?: string;
  bankName?: string;
  phoneNumber?: string;
  supportedCountries?: string[];
  gatewayConfig?: Record<string, any> | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

interface AppSettingsResponse {
  success: boolean;
  data: Record<string, any>;
}

interface PaymentMethodsResponse {
  success: boolean;
  data: PaymentMethod[];
}

const PAYMENT_PROVIDERS: ProviderConfig[] = [
  { id: "bank_transfer", label: i18next.t("admin.paymentMethods.bankTransfer"), labelEn: "Bank Transfer", emoji: "🏦", integrationType: "Manual Transfer", docsHint: "إدخال بيانات الحساب البنكي فقط", fields: [] },
  {
    id: "paysky", label: "باي سكاي", labelEn: "Paysky", emoji: "🌐", integrationType: "Hosted Checkout / API", docsHint: "MID + TID + Secret Key + Checkout URL + Callback", fields: [
      { key: "payskyMID", label: "MID", required: true },
      { key: "payskyTID", label: "TID", required: true },
      { key: "payskySecretKey", label: "Secret Key", required: true, type: "password" },
      { key: "payskyCheckoutUrl", label: "Checkout URL", required: true, type: "url", placeholder: "https://..." },
    ]
  },
  {
    id: "paymob", label: "باي موب", labelEn: "Paymob", emoji: "🧾", integrationType: "Hosted Checkout / API", docsHint: "API Key + HMAC/Secret + Integration ID + Iframe ID", fields: [
      { key: "paymobApiKey", label: "API Key", required: true, type: "password" },
      { key: "paymobSecretKey", label: "HMAC / Secret", required: true, type: "password" },
      { key: "paymobIntegrationId", label: "Integration ID", required: true },
      { key: "paymobIframeId", label: "Iframe ID" },
      { key: "paymobPublicKey", label: "Public Key" },
      { key: "paymobCheckoutUrl", label: "Checkout URL", required: true, type: "url", placeholder: "https://..." },
    ]
  },
  {
    id: "fawry", label: "فوري", labelEn: "Fawry", emoji: "🎫", integrationType: "Hosted Checkout / REST API", docsHint: "Merchant Code + Secure Key + Callback URL", fields: [
      { key: "fawryMerchantCode", label: "Merchant Code", required: true },
      { key: "fawrySecureKey", label: "Secure Key", required: true, type: "password" },
      { key: "fawryCallbackUrl", label: "Callback URL", type: "url" },
      { key: "fawryCheckoutUrl", label: "Checkout URL", required: true, type: "url", placeholder: "https://..." },
    ]
  },
  {
    id: "aman", label: "أمان", labelEn: "Aman", emoji: "🛡️", integrationType: "Aggregator / API", docsHint: "Merchant ID + API Key + Secret", fields: [
      { key: "amanMerchantId", label: "Merchant ID", required: true },
      { key: "amanApiKey", label: "API Key", required: true, type: "password" },
      { key: "amanSecretKey", label: "Secret Key", type: "password" },
      { key: "amanCheckoutUrl", label: "Checkout URL", required: true, type: "url", placeholder: "https://..." },
    ]
  },
  {
    id: "masary", label: "مصاري", labelEn: "Masary", emoji: "💠", integrationType: "Aggregator / API", docsHint: "Merchant ID + API Key + Secret", fields: [
      { key: "masaryMerchantId", label: "Merchant ID", required: true },
      { key: "masaryApiKey", label: "API Key", required: true, type: "password" },
      { key: "masarySecretKey", label: "Secret Key", type: "password" },
      { key: "masaryCheckoutUrl", label: "Checkout URL", required: true, type: "url", placeholder: "https://..." },
    ]
  },
  {
    id: "bee", label: "Bee", labelEn: "Bee", emoji: "🐝", integrationType: "Aggregator / API", docsHint: "Merchant Code + Terminal ID + Secret", fields: [
      { key: "beeMerchantCode", label: "Merchant Code", required: true },
      { key: "beeTerminalId", label: "Terminal ID" },
      { key: "beeSecretKey", label: "Secret Key", type: "password" },
      { key: "beeCheckoutUrl", label: "Checkout URL", required: true, type: "url", placeholder: "https://..." },
    ]
  },
  {
    id: "khales", label: "خالص", labelEn: "Khales", emoji: "💸", integrationType: "Aggregator / API", docsHint: "Merchant ID + API Key + Secret", fields: [
      { key: "khalesMerchantId", label: "Merchant ID", required: true },
      { key: "khalesApiKey", label: "API Key", required: true, type: "password" },
      { key: "khalesSecretKey", label: "Secret Key", type: "password" },
      { key: "khalesCheckoutUrl", label: "Checkout URL", required: true, type: "url", placeholder: "https://..." },
    ]
  },
  {
    id: "valu", label: "ڤاليو", labelEn: "valU", emoji: "🛍️", integrationType: "BNPL API", docsHint: "Merchant ID + Client ID + Client Secret", fields: [
      { key: "valuMerchantId", label: "Merchant ID", required: true },
      { key: "valuClientId", label: "Client ID", required: true },
      { key: "valuClientSecret", label: "Client Secret", required: true, type: "password" },
      { key: "valuCheckoutUrl", label: "Checkout URL", required: true, type: "url", placeholder: "https://..." },
    ]
  },
  {
    id: "sympl", label: "سيمبل", labelEn: "Sympl", emoji: "🧩", integrationType: "BNPL API", docsHint: "Merchant ID + API Key + Secret", fields: [
      { key: "symplMerchantId", label: "Merchant ID", required: true },
      { key: "symplApiKey", label: "API Key", required: true, type: "password" },
      { key: "symplSecret", label: "Secret", type: "password" },
      { key: "symplCheckoutUrl", label: "Checkout URL", required: true, type: "url", placeholder: "https://..." },
    ]
  },
  {
    id: "forsa", label: "فرصة", labelEn: "Forsa", emoji: "🎯", integrationType: "Installments / API", docsHint: "Merchant ID + API Key", fields: [
      { key: "forsaMerchantId", label: "Merchant ID", required: true },
      { key: "forsaApiKey", label: "API Key", required: true, type: "password" },
      { key: "forsaCheckoutUrl", label: "Checkout URL", required: true, type: "url", placeholder: "https://..." },
    ]
  },
  {
    id: "contact_nowpay", label: "Contact NowPay", labelEn: "Contact NowPay", emoji: "💳", integrationType: "Installments / API", docsHint: "Merchant ID + API Key + Secret", fields: [
      { key: "contactMerchantId", label: "Merchant ID", required: true },
      { key: "contactApiKey", label: "API Key", required: true, type: "password" },
      { key: "contactSecret", label: "Secret", type: "password" },
      { key: "contactCheckoutUrl", label: "Checkout URL", required: true, type: "url", placeholder: "https://..." },
    ]
  },
  {
    id: "vodafone_cash", label: i18next.t("admin.paymentMethods.vodafoneCash"), labelEn: "Vodafone Cash", emoji: "📱", integrationType: "Mobile Wallet", docsHint: "Wallet Number / Merchant Code", fields: [
      { key: "walletNumber", label: "Wallet Number", required: true },
      { key: "walletMerchantCode", label: "Merchant Code" },
    ]
  },
  {
    id: "orange_money", label: i18next.t("admin.paymentMethods.orangeMoney"), labelEn: "Orange Cash", emoji: "🟠", integrationType: "Mobile Wallet", docsHint: "Wallet Number / Merchant Code", fields: [
      { key: "walletNumber", label: "Wallet Number", required: true },
      { key: "walletMerchantCode", label: "Merchant Code" },
    ]
  },
  {
    id: "etisalat_cash", label: "اتصالات كاش", labelEn: "e& Cash", emoji: "🟣", integrationType: "Mobile Wallet", docsHint: "Wallet Number / Merchant Code", fields: [
      { key: "walletNumber", label: "Wallet Number", required: true },
      { key: "walletMerchantCode", label: "Merchant Code" },
    ]
  },
  {
    id: "we_pay", label: "WE Pay", labelEn: "WE Pay", emoji: "🟦", integrationType: "Mobile Wallet", docsHint: "Wallet Number / Merchant Code", fields: [
      { key: "walletNumber", label: "Wallet Number", required: true },
    ]
  },
  {
    id: "instapay", label: "إنستاباي", labelEn: "InstaPay", emoji: "⚡", integrationType: "Bank Alias", docsHint: "Alias/Phone/Account", fields: [
      { key: "instapayAlias", label: "InstaPay Alias", required: true },
    ]
  },
  {
    id: "meeza", label: "ميزة", labelEn: "Meeza", emoji: "🇪🇬", integrationType: "Cards Network", docsHint: "عادة عبر بنك Acquirer", fields: [
      { key: "meezaMerchantId", label: "Merchant ID" },
      { key: "meezaTerminalId", label: "Terminal ID" },
      { key: "meezaCheckoutUrl", label: "Checkout URL", required: true, type: "url", placeholder: "https://..." },
    ]
  },
  {
    id: "nbe_accept", label: "NBE ePayment", labelEn: "NBE ePayment", emoji: "🏛️", integrationType: "Bank Gateway", docsHint: "Merchant ID + Terminal + Secret", fields: [
      { key: "nbeMerchantId", label: "Merchant ID", required: true },
      { key: "nbeTerminalId", label: "Terminal ID" },
      { key: "nbeSecret", label: "Secret", type: "password" },
      { key: "nbeCheckoutUrl", label: "Checkout URL", required: true, type: "url", placeholder: "https://..." },
    ]
  },
  {
    id: "banque_misr_gateway", label: "Banque Misr Gateway", labelEn: "Banque Misr Gateway", emoji: "🏦", integrationType: "Bank Gateway", docsHint: "Merchant Credentials + Callback", fields: [
      { key: "bmMerchantId", label: "Merchant ID", required: true },
      { key: "bmApiKey", label: "API Key", type: "password" },
      { key: "bmSecret", label: "Secret", type: "password" },
      { key: "bmCheckoutUrl", label: "Checkout URL", required: true, type: "url", placeholder: "https://..." },
    ]
  },
  {
    id: "cib_accept", label: "CIB Payment Gateway", labelEn: "CIB Payment Gateway", emoji: "🏦", integrationType: "Bank Gateway", docsHint: "Merchant Credentials + Secret", fields: [
      { key: "cibMerchantId", label: "Merchant ID", required: true },
      { key: "cibApiKey", label: "API Key", type: "password" },
      { key: "cibSecret", label: "Secret", type: "password" },
      { key: "cibCheckoutUrl", label: "Checkout URL", required: true, type: "url", placeholder: "https://..." },
    ]
  },
  { id: "mobile_wallet", label: "محفظة إلكترونية", labelEn: "Mobile Wallet", emoji: "📲", integrationType: "Manual / Aggregator", docsHint: "Wallet Number", fields: [{ key: "walletNumber", label: "Wallet Number", required: true }] },
  {
    id: "credit_card", label: "بطاقة ائتمان", labelEn: "Credit Card", emoji: "💳", integrationType: "Gateway Required", docsHint: "Provider + API Key", fields: [
      { key: "providerName", label: "Provider Name", required: true },
      { key: "providerApiKey", label: "Provider API Key", type: "password" },
    ]
  },
  {
    id: "paypal", label: "باي بال", labelEn: "PayPal", emoji: "🅿️", integrationType: "Gateway", docsHint: "Client ID + Secret", fields: [
      { key: "paypalClientId", label: "Client ID", required: true },
      { key: "paypalSecret", label: "Secret", required: true, type: "password" },
    ]
  },
  {
    id: "stripe", label: "سترايب", labelEn: "Stripe", emoji: "💠", integrationType: "Gateway", docsHint: "Publishable + Secret + Webhook", fields: [
      { key: "stripePublishableKey", label: "Publishable Key", required: true },
      { key: "stripeSecretKey", label: "Secret Key", required: true, type: "password" },
      { key: "stripeWebhookSecret", label: "Webhook Secret", type: "password" },
    ]
  },
  {
    id: "google_pay", label: "Google Play Billing", labelEn: "Google Play Billing", emoji: "📱", integrationType: "Policy-Gated", docsHint: "Hosted checkout is blocked for Android digital purchases until native BillingClient is integrated", fields: [
      { key: "googlePayCheckoutUrl", label: "Checkout URL", required: true, type: "url", placeholder: "https://..." },
      { key: "callbackSecret", label: "Callback Signature Secret", required: true, type: "password" },
      { key: "googlePayMerchantId", label: "Merchant ID" },
    ]
  },
  { id: "other", label: "أخرى", labelEn: "Other", emoji: "💰", integrationType: "Custom", docsHint: "أدخل الحقول الأساسية للمزود", fields: [] },
];

const GATEWAY_TYPES_REQUIRING_CALLBACK_SECRET = new Set([
  "paymob",
  "fawry",
  "aman",
  "masary",
  "bee",
  "khales",
  "valu",
  "sympl",
  "forsa",
  "contact_nowpay",
  "meeza",
  "nbe_accept",
  "banque_misr_gateway",
  "cib_accept",
  "google_pay",
]);

const CALLBACK_SECRET_KEYS = [
  "callbackSecret",
  "webhookSecret",
  "secretKey",
  "paymobSecretKey",
  "fawrySecureKey",
  "amanSecretKey",
  "masarySecretKey",
  "beeSecretKey",
  "khalesSecretKey",
  "valuClientSecret",
  "symplSecret",
  "contactSecret",
  "nbeSecret",
  "bmSecret",
  "cibSecret",
];

const PAYMENT_CATEGORY_OPTIONS: Array<{ value: PaymentCategory; label: string }> = [
  { value: "manual", label: "يدوي" },
  { value: "egyptian_gateways", label: "بوابات مصرية" },
  { value: "global", label: "بوابات عالمية" },
  { value: "google", label: "Google" },
];

const DEFAULT_VISIBILITY: PaymentVisibility = {
  manual: true,
  egyptian_gateways: true,
  global: true,
  google: true,
};

const GOOGLE_PLAY_POLICY_KEY = "googlePlayMonetizationPolicy";

const DEFAULT_GOOGLE_PLAY_POLICY: GooglePlayMonetizationPolicy = {
  enabled: true,
  enforceAndroidDigitalPurchases: true,
  googlePlayMethodType: "google_pay",
  walletCheckoutEnabled: false,
  pointsPerCurrencyUnit: 10,
  defaultCurrency: "EGP",
  childRequestInvoicesEnabled: true,
};

const PROVIDER_CATEGORIES: Record<string, PaymentCategory> = {
  bank_transfer: "manual",
  vodafone_cash: "manual",
  orange_money: "manual",
  etisalat_cash: "manual",
  we_pay: "manual",
  instapay: "manual",
  mobile_wallet: "manual",
  paymob: "egyptian_gateways",
  paysky: "egyptian_gateways",
  fawry: "egyptian_gateways",
  aman: "egyptian_gateways",
  masary: "egyptian_gateways",
  bee: "egyptian_gateways",
  khales: "egyptian_gateways",
  valu: "egyptian_gateways",
  sympl: "egyptian_gateways",
  forsa: "egyptian_gateways",
  contact_nowpay: "egyptian_gateways",
  meeza: "egyptian_gateways",
  nbe_accept: "egyptian_gateways",
  banque_misr_gateway: "egyptian_gateways",
  cib_accept: "egyptian_gateways",
  google_pay: "google",
};

const inferCategory = (type: string): PaymentCategory => {
  if (PROVIDER_CATEGORIES[type]) return PROVIDER_CATEGORIES[type];
  return "global";
};

export function PaymentMethodsTab({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [visibility, setVisibility] = useState<PaymentVisibility>(DEFAULT_VISIBILITY);
  const [googlePlayPolicy, setGooglePlayPolicy] = useState<GooglePlayMonetizationPolicy>(DEFAULT_GOOGLE_PLAY_POLICY);

  const [formData, setFormData] = useState({
    type: "bank_transfer",
    paymentCategory: "manual" as PaymentCategory,
    displayName: "",
    accountNumber: "",
    accountName: "",
    bankName: "",
    phoneNumber: "",
    supportedCountriesText: "",
    depositCardStyle: "default",
    depositCardNote: "",
    isDefault: false,
    isActive: true,
  });

  const [providerConfig, setProviderConfig] = useState<Record<string, string>>({});

  const selectedProvider = useMemo(
    () => PAYMENT_PROVIDERS.find((p) => p.id === formData.type) || PAYMENT_PROVIDERS[0],
    [formData.type]
  );

  const { data: paymentMethods, isLoading } = useQuery<PaymentMethodsResponse>({
    queryKey: ["payment-methods"],
    queryFn: async () => {
      const res = await fetch("/api/admin/payment-methods", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Failed to load payment methods");
      }
      return json;
    },
  });

  const { data: appSettings } = useQuery<AppSettingsResponse>({
    queryKey: ["admin-app-settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/app-settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Failed to load app settings");
      }
      return json;
    },
  });

  React.useEffect(() => {
    const config = appSettings?.data?.paymentMethodVisibility;
    if (!config || typeof config !== "object") {
      setVisibility(DEFAULT_VISIBILITY);
      return;
    }
    setVisibility({
      manual: config.manual !== false,
      egyptian_gateways: config.egyptian_gateways !== false,
      global: config.global !== false,
      google: config.google !== false,
    });
  }, [appSettings]);

  React.useEffect(() => {
    const rawPolicy = appSettings?.data?.[GOOGLE_PLAY_POLICY_KEY];
    if (!rawPolicy || typeof rawPolicy !== "object") {
      setGooglePlayPolicy(DEFAULT_GOOGLE_PLAY_POLICY);
      return;
    }

    const pointsPerCurrencyUnit = Number((rawPolicy as any).pointsPerCurrencyUnit);
    const normalizedPointsPerCurrencyUnit = Number.isFinite(pointsPerCurrencyUnit)
      ? Math.max(1, Math.trunc(pointsPerCurrencyUnit))
      : DEFAULT_GOOGLE_PLAY_POLICY.pointsPerCurrencyUnit;

    const defaultCurrency = String((rawPolicy as any).defaultCurrency || DEFAULT_GOOGLE_PLAY_POLICY.defaultCurrency)
      .trim()
      .toUpperCase();

    setGooglePlayPolicy({
      enabled: (rawPolicy as any).enabled !== false,
      enforceAndroidDigitalPurchases: (rawPolicy as any).enforceAndroidDigitalPurchases !== false,
      googlePlayMethodType: String((rawPolicy as any).googlePlayMethodType || DEFAULT_GOOGLE_PLAY_POLICY.googlePlayMethodType).trim() || DEFAULT_GOOGLE_PLAY_POLICY.googlePlayMethodType,
      walletCheckoutEnabled: Boolean((rawPolicy as any).walletCheckoutEnabled),
      pointsPerCurrencyUnit: normalizedPointsPerCurrencyUnit,
      defaultCurrency: defaultCurrency || DEFAULT_GOOGLE_PLAY_POLICY.defaultCurrency,
      childRequestInvoicesEnabled: (rawPolicy as any).childRequestInvoicesEnabled !== false,
    });
  }, [appSettings]);

  const saveVisibilityMutation = useMutation({
    mutationFn: async (nextVisibility: PaymentVisibility) => {
      const res = await fetch("/api/admin/app-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ paymentMethodVisibility: nextVisibility }),
      });
      const json = await res.json();
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Failed to save visibility settings");
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-app-settings"] });
      toast({ title: "تم حفظ إظهار الأقسام للمستخدمين" });
    },
    onError: (error: any) => {
      toast({ title: "فشل حفظ إعدادات الأقسام", description: error?.message || "حاول مرة أخرى", variant: "destructive" });
    },
  });

  const saveGooglePlayPolicyMutation = useMutation({
    mutationFn: async (policy: GooglePlayMonetizationPolicy) => {
      const payload: GooglePlayMonetizationPolicy = {
        ...policy,
        googlePlayMethodType: String(policy.googlePlayMethodType || DEFAULT_GOOGLE_PLAY_POLICY.googlePlayMethodType).trim() || DEFAULT_GOOGLE_PLAY_POLICY.googlePlayMethodType,
        pointsPerCurrencyUnit: Math.max(1, Math.trunc(Number(policy.pointsPerCurrencyUnit) || DEFAULT_GOOGLE_PLAY_POLICY.pointsPerCurrencyUnit)),
        defaultCurrency: String(policy.defaultCurrency || DEFAULT_GOOGLE_PLAY_POLICY.defaultCurrency).trim().toUpperCase() || DEFAULT_GOOGLE_PLAY_POLICY.defaultCurrency,
      };

      const res = await fetch("/api/admin/app-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ [GOOGLE_PLAY_POLICY_KEY]: payload }),
      });
      const json = await res.json();
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Failed to save Google Play policy settings");
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-app-settings"] });
      toast({ title: t("admin.paymentMethods.googlePlayPolicy.saved") });
    },
    onError: (error: any) => {
      toast({
        title: t("admin.paymentMethods.googlePlayPolicy.saveFailed"),
        description: error?.message || t("common.retry", "Try again"),
        variant: "destructive",
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/admin/payment-methods", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Failed to create payment method");
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
      resetForm();
      setShowForm(false);
      toast({ title: "تم إنشاء وسيلة الدفع بنجاح" });
    },
    onError: (error: any) => {
      toast({ title: "فشل إنشاء وسيلة الدفع", description: error?.message || "حاول مرة أخرى", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/admin/payment-methods/${editingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Failed to update payment method");
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
      resetForm();
      setShowForm(false);
      toast({ title: "تم تحديث وسيلة الدفع بنجاح" });
    },
    onError: (error: any) => {
      toast({ title: "فشل تحديث وسيلة الدفع", description: error?.message || "حاول مرة أخرى", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/payment-methods/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Failed to delete payment method");
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
      toast({ title: "تم حذف وسيلة الدفع" });
    },
    onError: (error: any) => {
      toast({ title: "فشل حذف وسيلة الدفع", description: error?.message || "حاول مرة أخرى", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      type: "bank_transfer",
      paymentCategory: "manual",
      displayName: "",
      accountNumber: "",
      accountName: "",
      bankName: "",
      phoneNumber: "",
      supportedCountriesText: "",
      depositCardStyle: "default",
      depositCardNote: "",
      isDefault: false,
      isActive: true,
    });
    setProviderConfig({});
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    for (const field of selectedProvider.fields) {
      if (field.required && !String(providerConfig[field.key] || "").trim()) {
        toast({
          title: "بيانات ناقصة",
          description: `الحقل ${field.label} مطلوب لوسيلة ${selectedProvider.labelEn}`,
          variant: "destructive",
        });
        return;
      }
    }

    if (formData.isActive && GATEWAY_TYPES_REQUIRING_CALLBACK_SECRET.has(formData.type)) {
      const hasCallbackSecret = CALLBACK_SECRET_KEYS.some((key) => String(providerConfig[key] || "").trim().length > 0);
      if (!hasCallbackSecret) {
        toast({
          title: "فشل التفعيل الأمني",
          description: "لا يمكن تفعيل وسيلة الدفع بدون Callback Signature Secret (callbackSecret/webhookSecret/secretKey).",
          variant: "destructive",
        });
        return;
      }
    }

    const payload = {
      type: formData.type,
      displayName: formData.displayName,
      accountNumber: formData.accountNumber || `${formData.type}-merchant`,
      accountName: formData.accountName,
      bankName: formData.bankName,
      phoneNumber: formData.phoneNumber,
      supportedCountries: formData.supportedCountriesText
        .split(",")
        .map((v) => v.trim().toUpperCase())
        .filter(Boolean),
      gatewayConfig: Object.fromEntries(
        Object.entries({
          ...providerConfig,
          paymentCategory: formData.paymentCategory,
          depositCardStyle: formData.depositCardStyle,
          depositCardNote: formData.depositCardNote,
        }).map(([k, v]) => [k, String(v || "").trim() || null])
      ),
      isDefault: formData.isDefault,
      isActive: formData.isActive,
    };

    if (editingId) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (method: PaymentMethod) => {
    const rawConfig = method.gatewayConfig && typeof method.gatewayConfig === "object"
      ? method.gatewayConfig
      : {};

    const mappedConfig: Record<string, string> = {};
    Object.entries(rawConfig).forEach(([key, value]) => {
      mappedConfig[key] = value == null ? "" : String(value);
    });

    setFormData({
      type: method.type,
      paymentCategory: (mappedConfig.paymentCategory as PaymentCategory) || inferCategory(method.type),
      displayName: method.displayName || "",
      accountNumber: method.accountNumber,
      accountName: method.accountName || "",
      bankName: method.bankName || "",
      phoneNumber: method.phoneNumber || "",
      supportedCountriesText: Array.isArray(method.supportedCountries) ? method.supportedCountries.join(", ") : "",
      depositCardStyle: mappedConfig.depositCardStyle || "default",
      depositCardNote: mappedConfig.depositCardNote || "",
      isDefault: method.isDefault,
      isActive: method.isActive,
    });

    setProviderConfig(mappedConfig);
    setEditingId(method.id);
    setShowForm(true);
  };

  const methods = paymentMethods?.data || [];
  const filtered = filterActive === null ? methods : methods.filter((m) => m.isActive === filterActive);

  const getTypeInfo = (typeId: string) =>
    PAYMENT_PROVIDERS.find((t) => t.id === typeId) || { id: typeId, label: typeId, labelEn: typeId, emoji: "💰" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">وسائل الدفع المصرية</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">اختر الوسيلة وسيتم إظهار المدخلات المطلوبة لها فقط</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={18} />
          إضافة وسيلة دفع
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
        <h3 className="font-bold text-base mb-3">إظهار أقسام وسائل الدفع للمستخدمين</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {PAYMENT_CATEGORY_OPTIONS.map((category) => (
            <label key={category.value} className="flex items-center gap-2 p-3 rounded border dark:border-gray-700">
              <input
                type="checkbox"
                checked={visibility[category.value]}
                onChange={(e) => setVisibility((prev) => ({ ...prev, [category.value]: e.target.checked }))}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm font-medium">{category.label}</span>
            </label>
          ))}
        </div>
        <button
          onClick={() => saveVisibilityMutation.mutate(visibility)}
          disabled={saveVisibilityMutation.isPending}
          className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          حفظ إظهار الأقسام
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700 space-y-4">
        <h3 className="font-bold text-base">{t("admin.paymentMethods.googlePlayPolicy.title")}</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="flex items-center gap-2 p-3 rounded border dark:border-gray-700">
            <input
              type="checkbox"
              checked={googlePlayPolicy.enabled}
              onChange={(e) => setGooglePlayPolicy((prev) => ({ ...prev, enabled: e.target.checked }))}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm font-medium">{t("admin.paymentMethods.googlePlayPolicy.enabled")}</span>
          </label>

          <label className="flex items-center gap-2 p-3 rounded border dark:border-gray-700">
            <input
              type="checkbox"
              checked={googlePlayPolicy.enforceAndroidDigitalPurchases}
              onChange={(e) => setGooglePlayPolicy((prev) => ({ ...prev, enforceAndroidDigitalPurchases: e.target.checked }))}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm font-medium">{t("admin.paymentMethods.googlePlayPolicy.enforceAndroidDigitalPurchases")}</span>
          </label>

          <label className="flex items-center gap-2 p-3 rounded border dark:border-gray-700">
            <input
              type="checkbox"
              checked={googlePlayPolicy.walletCheckoutEnabled}
              onChange={(e) => setGooglePlayPolicy((prev) => ({ ...prev, walletCheckoutEnabled: e.target.checked }))}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm font-medium">{t("admin.paymentMethods.googlePlayPolicy.walletCheckoutEnabled")}</span>
          </label>

          <label className="flex items-center gap-2 p-3 rounded border dark:border-gray-700">
            <input
              type="checkbox"
              checked={googlePlayPolicy.childRequestInvoicesEnabled}
              onChange={(e) => setGooglePlayPolicy((prev) => ({ ...prev, childRequestInvoicesEnabled: e.target.checked }))}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm font-medium">{t("admin.paymentMethods.googlePlayPolicy.childRequestInvoicesEnabled")}</span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">{t("admin.paymentMethods.googlePlayPolicy.googlePlayMethodType")}</label>
            <select
              value={googlePlayPolicy.googlePlayMethodType}
              onChange={(e) => setGooglePlayPolicy((prev) => ({ ...prev, googlePlayMethodType: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="google_pay">google_pay</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t("admin.paymentMethods.googlePlayPolicy.pointsPerCurrencyUnit")}</label>
            <input
              type="number"
              min={1}
              step={1}
              value={googlePlayPolicy.pointsPerCurrencyUnit}
              onChange={(e) => setGooglePlayPolicy((prev) => ({
                ...prev,
                pointsPerCurrencyUnit: Math.max(1, Math.trunc(Number(e.target.value) || 1)),
              }))}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t("admin.paymentMethods.googlePlayPolicy.defaultCurrency")}</label>
            <input
              type="text"
              value={googlePlayPolicy.defaultCurrency}
              onChange={(e) => setGooglePlayPolicy((prev) => ({
                ...prev,
                defaultCurrency: e.target.value.toUpperCase(),
              }))}
              placeholder="EGP"
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
        </div>

        <button
          onClick={() => saveGooglePlayPolicyMutation.mutate(googlePlayPolicy)}
          disabled={saveGooglePlayPolicyMutation.isPending}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {t("admin.paymentMethods.googlePlayPolicy.save")}
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border dark:border-gray-700">
          <h3 className="font-bold text-lg mb-4">{editingId ? "تعديل وسيلة الدفع" : "إضافة وسيلة دفع جديدة"}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">نوع وسيلة الدفع *</label>
                <select
                  value={formData.type}
                  onChange={(e) => {
                    const nextType = e.target.value;
                    setFormData({ ...formData, type: nextType, paymentCategory: inferCategory(nextType) });
                    setProviderConfig({});
                  }}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                >
                  {PAYMENT_PROVIDERS.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.emoji} {type.label} ({type.labelEn})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">تصنيف وسيلة الدفع</label>
                <select
                  value={formData.paymentCategory}
                  onChange={(e) => setFormData({ ...formData, paymentCategory: e.target.value as PaymentCategory })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                >
                  {PAYMENT_CATEGORY_OPTIONS.map((category) => (
                    <option key={category.value} value={category.value}>{category.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">الاسم الظاهر للمستخدم</label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="مثال: دفع عبر FawryPay"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">نمط كارت الإيداع</label>
                <select
                  value={formData.depositCardStyle}
                  onChange={(e) => setFormData({ ...formData, depositCardStyle: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="default">افتراضي</option>
                  <option value="outlined">حدود واضحة</option>
                  <option value="glass">زجاجي</option>
                  <option value="warm">دافئ</option>
                  <option value="dark">داكن</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">ملاحظة داخل كارت الإيداع</label>
                <input
                  type="text"
                  value={formData.depositCardNote}
                  onChange={(e) => setFormData({ ...formData, depositCardNote: e.target.value })}
                  placeholder="مثال: التحويل يصل خلال 5 دقائق"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">رقم حساب/مرجع داخلي</label>
                <input
                  type="text"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  placeholder="اختياري للبوابات"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">اسم صاحب الحساب</label>
                <input
                  type="text"
                  value={formData.accountName}
                  onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                  placeholder="Classify Payments"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">اسم البنك / الجهة</label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  placeholder="Banque Misr / Paymob"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">رقم الهاتف (اختياري)</label>
                <input
                  type="text"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  placeholder="+2010..."
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">الدول المدعومة (اختياري)</label>
                <input
                  type="text"
                  value={formData.supportedCountriesText}
                  onChange={(e) => setFormData({ ...formData, supportedCountriesText: e.target.value })}
                  placeholder="EG"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
                <p className="text-xs mt-1 text-gray-500">اتركه فارغًا لتظهر الوسيلة في كل الدول</p>
              </div>
            </div>

            <div className="rounded-lg border dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-700/30 space-y-1">
              <p className="text-sm font-semibold">نوع الربط: {selectedProvider.integrationType}</p>
              <p className="text-xs text-gray-600 dark:text-gray-300">{selectedProvider.docsHint}</p>
            </div>

            {selectedProvider.fields.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedProvider.fields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium mb-1">
                      {field.label} {field.required ? "*" : ""}
                    </label>
                    <input
                      type={field.type || "text"}
                      value={providerConfig[field.key] || ""}
                      onChange={(e) => setProviderConfig((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.placeholder || field.label}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3 bg-gray-50 dark:bg-gray-700/50 p-3 rounded">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">وسيلة الدفع الافتراضية</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">نشطة (تظهر للمستخدمين)</span>
              </label>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {editingId ? "تحديث" : "إنشاء"}
              </button>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => setFilterActive(null)}
          className={`px-4 py-2 rounded-lg ${filterActive === null ? "bg-blue-600 text-white" : "border dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
        >
          الكل ({methods.length})
        </button>
        <button
          onClick={() => setFilterActive(true)}
          className={`px-4 py-2 rounded-lg ${filterActive === true ? "bg-green-600 text-white" : "border dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
        >
          نشطة ({methods.filter((m) => m.isActive).length})
        </button>
        <button
          onClick={() => setFilterActive(false)}
          className={`px-4 py-2 rounded-lg ${filterActive === false ? "bg-red-600 text-white" : "border dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
        >
          معطلة ({methods.filter((m) => !m.isActive).length})
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-4xl mb-2">💳</p>
          <p>لا توجد وسائل دفع</p>
          <p className="text-sm">أضف وسيلة دفع ليتمكن الوالدين من الإيداع</p>
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-lg dark:border-gray-700">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-right font-semibold">النوع</th>
                <th className="px-4 py-3 text-right font-semibold">الاسم الظاهر</th>
                <th className="px-4 py-3 text-right font-semibold">التصنيف</th>
                <th className="px-4 py-3 text-right font-semibold">رقم الحساب</th>
                <th className="px-4 py-3 text-right font-semibold">اسم الحساب</th>
                <th className="px-4 py-3 text-right font-semibold">البنك / الجهة</th>
                <th className="px-4 py-3 text-right font-semibold">الهاتف</th>
                <th className="px-4 py-3 text-right font-semibold">افتراضي</th>
                <th className="px-4 py-3 text-right font-semibold">الحالة</th>
                <th className="px-4 py-3 text-right font-semibold">الدول</th>
                <th className="px-4 py-3 text-right font-semibold">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((method) => {
                const typeInfo = getTypeInfo(method.type);
                const methodCategory = ((method.gatewayConfig as any)?.paymentCategory as PaymentCategory) || inferCategory(method.type);
                const categoryLabel = PAYMENT_CATEGORY_OPTIONS.find((item) => item.value === methodCategory)?.label || "-";
                return (
                  <tr key={method.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded text-xs font-semibold">
                        {typeInfo.emoji} {typeInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{method.displayName || "-"}</td>
                    <td className="px-4 py-3 text-sm">{categoryLabel}</td>
                    <td className="px-4 py-3 font-mono text-sm">{method.accountNumber}</td>
                    <td className="px-4 py-3 text-sm">{method.accountName || "-"}</td>
                    <td className="px-4 py-3 text-sm">{method.bankName || "-"}</td>
                    <td className="px-4 py-3 text-sm font-mono">{method.phoneNumber || "-"}</td>
                    <td className="px-4 py-3">{method.isDefault ? <span className="text-yellow-600 dark:text-yellow-400 font-semibold">★ افتراضي</span> : "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${method.isActive ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"}`}>
                        {method.isActive ? "نشطة" : "معطلة"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                      {Array.isArray(method.supportedCountries) && method.supportedCountries.length > 0 ? method.supportedCountries.join(", ") : "ALL"}
                    </td>
                    <td className="px-4 py-3 flex gap-2">
                      <button
                        onClick={() => handleEdit(method)}
                        className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900 rounded transition-colors"
                        title="تعديل"
                      >
                        <Edit2 size={16} className="text-blue-600" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("هل تريد حذف وسيلة الدفع هذه؟")) {
                            deleteMutation.mutate(method.id);
                          }
                        }}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors"
                        title="حذف"
                      >
                        <Trash2 size={16} className="text-red-600" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
