import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useTheme } from "@/contexts/ThemeContext";
import { ParentNotificationBell } from "@/components/NotificationBell";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useToast } from "@/hooks/use-toast";
import { getDateLocale } from "@/i18n/config";
import { SlidingAdsCarousel } from "@/components/SlidingAdsCarousel";
import { SocialLoginButtons } from "@/components/SocialLoginButtons";
import {
  isNativeAndroidGooglePlayBillingAvailable,
  launchNativeGooglePlayPurchase,
  queryNativeGooglePlayProducts,
} from "@/lib/nativeGooglePlayBilling";
import type { NativeGooglePlayProduct } from "@/lib/nativeGooglePlayBilling";

const PAYMENT_TYPE_EMOJIS: Record<string, string> = {
  bank_transfer: "🏦", vodafone_cash: "📱", orange_money: "🟠", etisalat_cash: "🟣",
  we_pay: "💳", instapay: "⚡", fawry: "🎫", mobile_wallet: "📲", credit_card: "💳", other: "💰",
};

const STATUS_COLORS: Record<string, { color: string; bg: string; accent: string }> = {
  pending: { color: "text-amber-700", bg: "bg-amber-100", accent: "border-s-4 border-amber-400" },
  completed: { color: "text-emerald-700", bg: "bg-emerald-100", accent: "border-s-4 border-emerald-400" },
  cancelled: { color: "text-rose-700", bg: "bg-rose-100", accent: "border-s-4 border-rose-400" },
};

type PaymentCategory = "manual" | "egyptian_gateways" | "global" | "google";

const PAYMENT_CATEGORY_LABELS: Record<PaymentCategory, string> = {
  manual: "يدوي",
  egyptian_gateways: "بوابة مصرية",
  global: "بوابة عالمية",
  google: "Google Pay",
};

function resolvePaymentCategory(method: any): PaymentCategory {
  const category = method?.paymentCategory || method?.gatewayConfig?.paymentCategory;
  if (category === "manual" || category === "egyptian_gateways" || category === "global" || category === "google") {
    return category;
  }
  if (method?.type === "google_pay") return "google";
  return "global";
}

function resolveDepositCardStyle(method: any): "default" | "outlined" | "glass" | "warm" | "dark" {
  const style = method?.gatewayConfig?.depositCardStyle;
  if (style === "outlined" || style === "glass" || style === "warm" || style === "dark") {
    return style;
  }
  return "default";
}

function getDepositCardClass(style: "default" | "outlined" | "glass" | "warm" | "dark", isDark: boolean): string {
  if (style === "outlined") {
    return isDark
      ? "bg-transparent border-2 border-blue-500"
      : "bg-white border-2 border-blue-400";
  }

  if (style === "glass") {
    return isDark
      ? "bg-gradient-to-br from-slate-800/80 to-blue-900/60 border border-blue-700 backdrop-blur"
      : "bg-gradient-to-br from-white/80 to-blue-100/80 border border-blue-200 backdrop-blur";
  }

  if (style === "warm") {
    return isDark
      ? "bg-gradient-to-br from-amber-900/40 to-orange-800/40 border border-amber-700"
      : "bg-gradient-to-br from-amber-50 to-orange-100 border border-amber-200";
  }

  if (style === "dark") {
    return isDark
      ? "bg-gradient-to-br from-gray-900 to-slate-900 border border-gray-700"
      : "bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-700 text-white";
  }

  return isDark
    ? "bg-blue-900/30 border border-blue-800"
    : "bg-blue-50 border border-blue-200";
}

function getPaymentLabel(type: string, t: (key: string) => string) {
  const key = `wallet.paymentType.${type.replace(/_([a-z])/g, (_, c) => c.toUpperCase())}`;
  return { label: t(key), emoji: PAYMENT_TYPE_EMOJIS[type] || "💰" };
}

function getStatusLabel(status: string, t: (key: string) => string) {
  const keyMap: Record<string, string> = { pending: 'wallet.statusPending', completed: 'wallet.statusCompleted', cancelled: 'wallet.statusCancelled' };
  return { label: t(keyMap[status] || keyMap.pending), ...(STATUS_COLORS[status] || STATUS_COLORS.pending) };
}

const extractApiErrorMessage = (error: unknown, fallback: string): string => {
  if (!error || typeof error !== "object") return fallback;
  const message = (error as any)?.message;
  if (typeof message !== "string") return fallback;

  const jsonStart = message.indexOf("{");
  if (jsonStart >= 0) {
    try {
      const parsed = JSON.parse(message.slice(jsonStart));
      if (parsed?.message) return parsed.message;
    } catch {
      return message;
    }
  }

  return message;
};

export const Wallet = (): JSX.Element => {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const token = localStorage.getItem("token");
  const capacitor = (window as any)?.Capacitor;
  const isNativeAndroid = Boolean(
    capacitor?.isNativePlatform?.()
    && capacitor?.getPlatform?.() === "android"
  );
  const isGooglePlayBillingAvailable = isNativeAndroid && isNativeAndroidGooglePlayBillingAvailable();
  const platformRequestHeaders = isNativeAndroid ? { "X-Client-Platform": "android" } : undefined;
  const parentClassification = String(localStorage.getItem("parentAccountClassification") || "").trim().toUpperCase();
  const isParentTrial = parentClassification === "PARENT_TRIAL";
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showDeposit, setShowDeposit] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<any>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositTransactionId, setDepositTransactionId] = useState("");
  const [depositReceiptUrl, setDepositReceiptUrl] = useState("");
  const [depositNotes, setDepositNotes] = useState("");
  const [step, setStep] = useState<"select" | "confirm">("select");
  const [showTrialQuickRegister, setShowTrialQuickRegister] = useState(false);
  const [trialTapCount, setTrialTapCount] = useState<number>(() => {
    const raw = sessionStorage.getItem("parent-trial-wallet-tap-count");
    const parsed = Number(raw || 0);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  });

  const recordParentTrialTap = () => {
    if (!isParentTrial) return;

    setTrialTapCount((prev) => {
      const next = prev + 1;
      sessionStorage.setItem("parent-trial-wallet-tap-count", String(next));

      if (next % 7 === 0) {
        setShowTrialQuickRegister(true);
        toast({
          title: t("parentAuth.register"),
          description: t("parentDashboard.trialHintLinkingDesc"),
        });
      }

      return next;
    });
  };

  const { data: wallet, isLoading: isWalletLoading } = useQuery({
    queryKey: ["/api/parent/wallet"],
    enabled: !!token,
  });

  const { data: paymentMethodsRaw, isLoading: isPaymentMethodsLoading } = useQuery({
    queryKey: ["/api/parent/payment-methods"],
    enabled: !!token && !isNativeAndroid,
  });

  const {
    data: googlePlayCatalogRaw,
    isLoading: isGooglePlayCatalogLoading,
  } = useQuery({
    queryKey: ["/api/parent/google-play/products"],
    enabled: !!token && isNativeAndroid && isGooglePlayBillingAvailable,
  });

  const googlePlayCatalog = ((googlePlayCatalogRaw as any)?.data || googlePlayCatalogRaw || {}) as any;
  const googlePlayConfiguredProducts = Array.isArray(googlePlayCatalog?.products)
    ? googlePlayCatalog.products
    : [];
  const googlePlayAccountObfuscationId = String(googlePlayCatalog?.accountObfuscationId || "").trim();
  const googlePlayPackageName = String(googlePlayCatalog?.packageName || "").trim();
  const nativeGooglePlayProductIds = googlePlayConfiguredProducts
    .map((row: any) => String(row?.productId || "").trim())
    .filter((row: string) => !!row);

  const {
    data: nativeGooglePlayProductsRaw,
    isLoading: isNativeGooglePlayProductsLoading,
  } = useQuery({
    queryKey: ["google-play-native-products", nativeGooglePlayProductIds.join("|")],
    enabled: !!token && isNativeAndroid && isGooglePlayBillingAvailable && nativeGooglePlayProductIds.length > 0,
    queryFn: async () => queryNativeGooglePlayProducts(nativeGooglePlayProductIds),
  });

  const { data: depositsRaw, isLoading: isDepositsLoading } = useQuery({
    queryKey: ["/api/parent/deposits"],
    enabled: !!token,
  });

  const walletData = (wallet as any) || {};
  const paymentMethods = Array.isArray((paymentMethodsRaw as any)?.data)
    ? (paymentMethodsRaw as any).data
    : Array.isArray(paymentMethodsRaw)
      ? paymentMethodsRaw
      : [];
  const nativeGooglePlayProducts: NativeGooglePlayProduct[] = Array.isArray(nativeGooglePlayProductsRaw)
    ? (nativeGooglePlayProductsRaw as NativeGooglePlayProduct[])
    : [];
  const nativeGooglePlayEntries = nativeGooglePlayProducts
    .map((row): [string, NativeGooglePlayProduct] => [String(row?.productId || "").trim(), row])
    .filter((entry): entry is [string, NativeGooglePlayProduct] => !!entry[0]);
  const nativeGooglePlayByProductId = new Map<string, NativeGooglePlayProduct>(nativeGooglePlayEntries);
  const googlePlayProducts = googlePlayConfiguredProducts.map((row: any) => {
    const productId = String(row?.productId || "").trim();
    const native = nativeGooglePlayByProductId.get(productId);
    return {
      ...row,
      productId,
      title: String(native?.title || row?.displayName || productId || "").trim(),
      description: String(native?.description || "").trim(),
      formattedPrice: String(native?.formattedPrice || "").trim(),
      priceCurrencyCode: String(native?.priceCurrencyCode || row?.currency || "").trim(),
      priceAmountMicros: Number(native?.priceAmountMicros || 0),
    };
  });

  const depositSelectionOptions = isNativeAndroid ? googlePlayProducts : paymentMethods;
  const isDepositOptionsLoading = isNativeAndroid
    ? (isGooglePlayCatalogLoading || isNativeGooglePlayProductsLoading)
    : isPaymentMethodsLoading;
  const depositsList = Array.isArray((depositsRaw as any)?.data)
    ? (depositsRaw as any).data
    : Array.isArray(depositsRaw)
      ? depositsRaw
      : [];

  const pendingCount = depositsList.filter((d: any) => d.status === "pending").length;
  const completedCount = depositsList.filter((d: any) => d.status === "completed").length;
  const cancelledCount = depositsList.filter((d: any) => d.status === "cancelled").length;

  const depositMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/parent/deposit", {
        paymentMethodId: selectedMethod.id,
        amount: parseFloat(depositAmount),
        transactionId: depositTransactionId,
        receiptUrl: depositReceiptUrl || undefined,
        notes: depositNotes || undefined,
      }, {
        headers: platformRequestHeaders,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parent/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/deposits"] });
      setShowDeposit(false);
      setSelectedMethod(null);
      setDepositAmount("");
      setDepositTransactionId("");
      setDepositReceiptUrl("");
      setDepositNotes("");
      setStep("select");
      toast({ title: t("wallet.depositSuccess"), description: t("wallet.depositPending") });
    },
    onError: (error: any) => {
      toast({ title: t("errors.error", "خطأ"), description: extractApiErrorMessage(error, t('wallet.depositError')), variant: "destructive" });
    },
  });

  const googlePlayDepositMutation = useMutation({
    mutationFn: async (selectedProduct: any) => {
      const productId = String(selectedProduct?.productId || "").trim();
      if (!productId) {
        throw new Error("Google Play product is required");
      }

      if (!isGooglePlayBillingAvailable) {
        throw new Error("Google Play Billing is not available on this device");
      }

      const purchase = await launchNativeGooglePlayPurchase({
        productId,
        accountObfuscationId: googlePlayAccountObfuscationId || undefined,
      });

      return apiRequest("POST", "/api/parent/google-play/complete-purchase", {
        productId,
        purchaseToken: purchase.purchaseToken,
        orderId: purchase.orderId || undefined,
        packageName: purchase.packageName || googlePlayPackageName || undefined,
      }, {
        headers: platformRequestHeaders,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parent/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/deposits"] });
      setShowDeposit(false);
      setSelectedMethod(null);
      setDepositAmount("");
      setDepositTransactionId("");
      setDepositReceiptUrl("");
      setDepositNotes("");
      setStep("select");
      toast({ title: t("wallet.depositSuccess"), description: t("wallet.depositPending") });
    },
    onError: (error: any) => {
      toast({ title: t("errors.error", "خطأ"), description: extractApiErrorMessage(error, t("wallet.depositError")), variant: "destructive" });
    },
  });

  const getTypeInfo = (type: string) => getPaymentLabel(type, t);

  const resetDeposit = () => {
    setShowDeposit(false);
    setSelectedMethod(null);
    setDepositAmount("");
    setDepositTransactionId("");
    setDepositReceiptUrl("");
    setDepositNotes("");
    setStep("select");
  };

  const handleDepositSubmit = () => {
    if (!token || isParentTrial) {
      setShowTrialQuickRegister(true);
      toast({
        title: t("wallet.depositFunds"),
        description: `${t("store.orderFailed")} — ${t("parentAuth.register")}`,
        variant: "destructive",
      });
      return;
    }

    if (isNativeAndroid) {
      if (!isGooglePlayBillingAvailable) {
        toast({
          title: t("errors.error", "خطأ"),
          description: t("wallet.depositError"),
          variant: "destructive",
        });
        return;
      }

      if (!selectedMethod?.productId) {
        toast({
          title: t("wallet.depositFunds"),
          description: t("wallet.noPaymentMethods"),
          variant: "destructive",
        });
        return;
      }

      googlePlayDepositMutation.mutate(selectedMethod);
      return;
    }

    depositMutation.mutate();
  };

  const isAnyDepositMutationPending = depositMutation.isPending || googlePlayDepositMutation.isPending;

  const currentStepIndex = step === "select" ? 1 : 2;
  const pageShellClass = isDark
    ? "bg-gradient-to-b from-slate-950 via-slate-900 to-gray-900"
    : "bg-gradient-to-b from-blue-50 via-cyan-50 to-gray-50";
  const elevatedSurfaceClass = isDark
    ? "border border-white/10 bg-slate-900/82 backdrop-blur-xl shadow-[0_20px_34px_-24px_rgba(0,0,0,0.85)]"
    : "border border-white/70 bg-white/92 backdrop-blur-xl shadow-[0_20px_34px_-24px_rgba(15,23,42,0.55)]";
  const raisedControlClass = isDark
    ? "rounded-2xl border border-white/10 bg-slate-800/75 shadow-[0_14px_20px_-16px_rgba(0,0,0,0.85)] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-[1px]"
    : "rounded-2xl border border-white/45 bg-white/20 shadow-[0_14px_20px_-16px_rgba(15,23,42,0.65)] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-[1px]";
  const primaryGradientButtonClass = "bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 hover:from-blue-600 hover:via-indigo-600 hover:to-purple-600 shadow-[0_14px_24px_-14px_rgba(59,130,246,0.95)]";
  const successGradientButtonClass = "bg-gradient-to-br from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-[0_14px_24px_-14px_rgba(16,185,129,0.9)]";

  return (
    <div
      className={`relative min-h-screen overflow-x-clip px-4 py-5 sm:p-6 ${pageShellClass}`}
      onClickCapture={(event) => {
        if (!isParentTrial) return;
        const target = event.target as HTMLElement | null;
        if (!target) return;
        if (target.closest("button, a, [role='button']")) {
          recordParentTrialTap();
        }
      }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className={`absolute -top-24 ${isDark ? "bg-cyan-500/18" : "bg-cyan-300/40"} -right-24 h-72 w-72 rounded-full blur-3xl`} />
        <div className={`absolute top-1/3 ${isDark ? "bg-indigo-500/12" : "bg-indigo-200/55"} -left-24 h-80 w-80 rounded-full blur-3xl`} />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div
          className={`rounded-3xl px-4 py-4 sm:px-5 sm:py-5 ${elevatedSurfaceClass}`}
        >
          <div className="flex flex-col gap-4 sm:gap-5">
            <div>
              <h1 className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${isDark ? "text-white" : "text-gray-800"}`}>
                {t("wallet.title")}
              </h1>
              <p className={`mt-1 text-sm sm:text-base ${isDark ? "text-gray-400" : "text-gray-600"}`}>{t("wallet.subtitle")}</p>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <LanguageSelector />
              <ParentNotificationBell />
              <button
                onClick={toggleTheme}
                className={`h-11 min-w-11 text-white font-bold ${raisedControlClass} ${primaryGradientButtonClass}`}
                aria-label={isDark ? "Enable light mode" : "Enable dark mode"}
              >
                {isDark ? "☀️" : "🌙"}
              </button>
              <button
                onClick={() => window.history.length > 1 ? window.history.back() : navigate("/parent-dashboard")}
                className={`h-11 px-4 font-bold whitespace-nowrap ${raisedControlClass} ${isDark ? "text-gray-200" : "text-gray-700"}`}
              >
                {t("common.back")}
              </button>
            </div>
          </div>
        </div>

        {/* Wallet Balance */}
        <div className={`${isDark ? "bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900" : "bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600"} rounded-3xl p-5 sm:p-8 text-white shadow-[0_30px_42px_-28px_rgba(59,130,246,0.9)] ring-1 ring-white/20`}>
          <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <p className="text-base sm:text-lg opacity-90">{t("wallet.currentBalance")}</p>
              {isWalletLoading ? (
                <div className="mt-2 h-14 sm:h-16 w-44 rounded-2xl bg-white/20 animate-pulse" />
              ) : (
                <p className="mt-2 text-5xl sm:text-6xl font-extrabold leading-none">$ {Number(walletData?.balance || 0).toFixed(2)}</p>
              )}
            </div>

            <button
              onClick={() => setShowDeposit(true)}
              className={`h-14 px-6 text-white rounded-2xl font-bold text-lg ${successGradientButtonClass}`}
            >
              {t("wallet.depositFunds")}
            </button>
          </div>

          <div className="mt-5 rounded-2xl bg-white/10 ring-1 ring-white/15 px-4 py-3 text-sm sm:text-base">
            {isWalletLoading ? (
              <div className="space-y-2">
                <div className="h-4 w-56 rounded bg-white/20 animate-pulse" />
                <div className="h-4 w-52 rounded bg-white/20 animate-pulse" />
              </div>
            ) : (
              <div className="flex flex-col gap-1 opacity-95">
                <p>{t("wallet.totalDeposited", { amount: Number(walletData?.totalDeposited || 0).toFixed(2) })}</p>
                <p>{t("wallet.totalSpent", { amount: Number(walletData?.totalSpent || 0).toFixed(2) })}</p>
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-sm">
            <div className="rounded-xl bg-white/10 ring-1 ring-white/15 px-3 py-2.5">
              <p className="opacity-85">{t("wallet.statusPending")}</p>
              <p className="text-xl font-extrabold leading-tight">{isDepositsLoading ? "..." : pendingCount}</p>
            </div>
            <div className="rounded-xl bg-white/10 ring-1 ring-white/15 px-3 py-2.5">
              <p className="opacity-85">{t("wallet.statusCompleted")}</p>
              <p className="text-xl font-extrabold leading-tight">{isDepositsLoading ? "..." : completedCount}</p>
            </div>
            <div className="rounded-xl bg-white/10 ring-1 ring-white/15 px-3 py-2.5">
              <p className="opacity-85">{t("wallet.statusCancelled")}</p>
              <p className="text-xl font-extrabold leading-tight">{isDepositsLoading ? "..." : cancelledCount}</p>
            </div>
          </div>
        </div>

        {isParentTrial && showTrialQuickRegister && (
          <div className={`rounded-2xl p-4 sm:p-5 ${elevatedSurfaceClass}`}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className={`text-base sm:text-lg font-extrabold ${isDark ? "text-white" : "text-gray-900"}`}>
                  {t("parentAuth.register")}
                </h3>
                <p className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                  {t("parentDashboard.trialHintLinkingDesc")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTrialQuickRegister(false)}
                className={`px-2 py-1 rounded-lg text-xs font-bold ${isDark ? "bg-slate-700 text-gray-200 hover:bg-slate-600" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
              >
                {t("close")}
              </button>
            </div>

            <SocialLoginButtons
              className="mb-3"
              variant="compact"
              oauthMode="login"
              returnTo="/wallet"
            />

            <button
              type="button"
              onClick={() => {
                localStorage.removeItem("familyCode");
                navigate(`/parent-auth?mode=register&redirect=${encodeURIComponent("/wallet")}`);
              }}
              className="w-full sm:w-auto px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold shadow-[0_12px_22px_-16px_rgba(249,115,22,0.9)]"
            >
              {t("parentAuth.register")}
            </button>
          </div>
        )}

        {/* Ads Section */}
        <SlidingAdsCarousel audience="parents" variant="page" isDark={isDark} />

        {/* Deposit History */}
        <div className={`rounded-2xl p-5 sm:p-6 ${elevatedSurfaceClass}`}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
              {t("wallet.depositHistory")}
            </h2>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${isDark ? "bg-slate-800 text-gray-200" : "bg-gray-100 text-gray-700"
                }`}
            >
              {depositsList.length}
            </span>
          </div>
          {isDepositsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={`deposit-skeleton-${idx}`}
                  className={`p-4 rounded-xl border animate-pulse ${isDark ? "border-gray-700 bg-gray-700/20" : "border-gray-200 bg-gray-50"}`}
                >
                  <div className={`h-5 w-24 rounded mb-2 ${isDark ? "bg-gray-600" : "bg-gray-200"}`} />
                  <div className={`h-4 w-48 rounded mb-2 ${isDark ? "bg-gray-700" : "bg-gray-200"}`} />
                  <div className={`h-4 w-36 rounded ${isDark ? "bg-gray-700" : "bg-gray-200"}`} />
                </div>
              ))}
            </div>
          ) : depositsList.length === 0 ? (
            <p className={`rounded-xl px-4 py-6 text-center ${isDark ? "bg-slate-900/55 text-gray-400" : "bg-gray-50 text-gray-600"}`}>
              {t("wallet.noDeposits")}
            </p>
          ) : (
            <div className="space-y-3">
              {depositsList.map((deposit: any) => {
                const statusInfo = getStatusLabel(deposit.status, t);
                return (
                  <div
                    key={deposit.id}
                    className={`flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 p-4 rounded-xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${statusInfo.accent} ${isDark ? "border-slate-700 bg-slate-800/45 hover:bg-slate-800/60" : "border-gray-200 bg-white"
                      }`}
                  >
                    <div className="space-y-2">
                      <p className={`font-bold text-lg ${isDark ? "text-white" : "text-gray-800"}`}>
                        ${Number(deposit.amount).toFixed(2)}
                      </p>
                      <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        {new Date(deposit.createdAt).toLocaleDateString(getDateLocale())} — {new Date(deposit.createdAt).toLocaleTimeString(getDateLocale())}
                      </p>

                      {(deposit.methodType || deposit.methodBank || deposit.methodAccount) && (
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                          <span className={`px-2.5 py-1 rounded-full ${isDark ? "bg-gray-600/70 text-gray-200" : "bg-gray-100 text-gray-700"}`}>
                            💳 {getTypeInfo(deposit.methodType || "other").label}
                          </span>
                          {deposit.methodBank && (
                            <span className={`px-2.5 py-1 rounded-full ${isDark ? "bg-gray-700 text-gray-300" : "bg-slate-100 text-slate-700"}`}>
                              {deposit.methodBank}
                            </span>
                          )}
                          {deposit.methodAccount && (
                            <span className={`px-2.5 py-1 rounded-full font-mono ${isDark ? "bg-gray-700 text-gray-300" : "bg-slate-100 text-slate-700"}`}>
                              {deposit.methodAccount}
                            </span>
                          )}
                        </div>
                      )}

                      {deposit.transactionId && (
                        <div className="text-xs">
                          <span className={isDark ? "text-gray-400" : "text-gray-600"}>{t("wallet.transactionNumber")}</span>{" "}
                          <span className={`font-mono px-2 py-0.5 rounded ${isDark ? "bg-gray-700 text-gray-200" : "bg-gray-100 text-gray-800"}`}>
                            {deposit.transactionId}
                          </span>
                        </div>
                      )}
                      {deposit.receiptUrl && (
                        <a
                          href={deposit.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-xs mt-1 inline-block underline ${isDark ? "text-blue-400" : "text-blue-600"}`}
                        >
                          {t("wallet.viewReceipt")}
                        </a>
                      )}
                      {deposit.notes && (
                        <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                          📝 {deposit.notes}
                        </p>
                      )}
                      {deposit.adminNotes && (
                        <p className={`text-xs mt-1 ${isDark ? "text-blue-400" : "text-blue-600"}`}>
                          {t("wallet.adminNotes")} {deposit.adminNotes}
                        </p>
                      )}
                    </div>
                    <span
                      className={`self-start sm:self-auto px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${isDark
                        ? deposit.status === "pending"
                          ? "bg-amber-900/50 text-amber-200"
                          : deposit.status === "completed"
                            ? "bg-emerald-900/50 text-emerald-200"
                            : "bg-rose-900/50 text-rose-200"
                        : `${statusInfo.bg} ${statusInfo.color}`
                        }`}
                    >
                      {statusInfo.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Deposit Modal */}
      {showDeposit && (
        <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-[3px] flex items-center justify-center p-3 sm:p-4 z-50">
          <div className={`${isDark ? "bg-slate-900/95 border border-slate-700" : "bg-white/95 border border-white/70"} rounded-3xl p-5 sm:p-7 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-[0_34px_54px_-30px_rgba(15,23,42,0.9)]`}>
            <div className="mb-6">
              <div className="flex items-center gap-2">
                <span
                  className={`h-7 w-7 rounded-full text-xs font-extrabold flex items-center justify-center ${currentStepIndex >= 1
                    ? "bg-blue-500 text-white"
                    : isDark
                      ? "bg-gray-700 text-gray-300"
                      : "bg-gray-200 text-gray-600"
                    }`}
                >
                  1
                </span>
                <span className={`h-1 flex-1 rounded-full ${currentStepIndex >= 2 ? "bg-blue-500" : isDark ? "bg-gray-700" : "bg-gray-200"}`} />
                <span
                  className={`h-7 w-7 rounded-full text-xs font-extrabold flex items-center justify-center ${currentStepIndex >= 2
                    ? "bg-blue-500 text-white"
                    : isDark
                      ? "bg-gray-700 text-gray-300"
                      : "bg-gray-200 text-gray-600"
                    }`}
                >
                  2
                </span>
              </div>
            </div>

            {step === "select" && (
              <>
                <h2 className={`text-2xl font-extrabold mb-2 ${isDark ? "text-white" : "text-gray-800"}`}>
                  {t("wallet.depositFunds")}
                </h2>
                <p className={`text-sm mb-5 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  {t("wallet.selectPaymentMethod")}
                </p>

                <div className="space-y-3 mb-6">
                  {depositSelectionOptions.map((method: any) => {
                    const selectionKey = isNativeAndroid ? method.productId : method.id;
                    const isSelected = isNativeAndroid
                      ? selectedMethod?.productId === method.productId
                      : selectedMethod?.id === method.id;
                    const category = isNativeAndroid ? "google" : resolvePaymentCategory(method);
                    const typeInfo = isNativeAndroid
                      ? {
                        emoji: "🛒",
                        label: method.title || method.displayName || method.productId,
                      }
                      : getTypeInfo(method.type);
                    const subtitle = isNativeAndroid
                      ? (method.formattedPrice || `${method.priceCurrencyCode || method.currency || ""} ${Number(method.walletAmount || 0).toFixed(2)}`.trim())
                      : (method.bankName || method.accountNumber);
                    return (
                      <button
                        key={selectionKey}
                        onClick={() => setSelectedMethod(method)}
                        className={`w-full text-right p-4 rounded-2xl border-2 transition-all ${isSelected
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-[0_12px_22px_-16px_rgba(59,130,246,0.95)]"
                          : isDark
                            ? "border-slate-700 bg-slate-800/45 hover:border-slate-500"
                            : "border-gray-200 bg-white hover:border-gray-400"
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{typeInfo.emoji}</span>
                          <div className="flex-1">
                            <p className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                              {isNativeAndroid ? (method.title || method.displayName || typeInfo.label) : (method.displayName || typeInfo.label)}
                            </p>
                            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                              {subtitle}
                            </p>
                            <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                              {PAYMENT_CATEGORY_LABELS[category]}
                            </p>
                          </div>
                          {isSelected && <span className="text-blue-500 text-xl">✓</span>}
                          {!isNativeAndroid && method.isDefault && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">★</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {!isDepositOptionsLoading && depositSelectionOptions.length === 0 && (
                  <p className="text-center text-gray-500 py-4">{t("wallet.noPaymentMethods")}</p>
                )}

                {isDepositOptionsLoading && (
                  <div className="space-y-2 py-2">
                    <div className={`h-14 rounded-xl animate-pulse ${isDark ? "bg-gray-700" : "bg-gray-100"}`} />
                    <div className={`h-14 rounded-xl animate-pulse ${isDark ? "bg-gray-700" : "bg-gray-100"}`} />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <button
                    onClick={() => selectedMethod && setStep("confirm")}
                    disabled={!selectedMethod}
                    className={`px-4 py-3.5 text-white rounded-xl font-bold disabled:opacity-50 ${primaryGradientButtonClass}`}
                  >
                    {t("common.next")}
                  </button>
                  <button
                    onClick={resetDeposit}
                    className={`px-4 py-3.5 rounded-xl font-bold ${isDark ? "bg-slate-700 hover:bg-slate-600 text-gray-200" : "bg-gray-200 hover:bg-gray-300 text-gray-700"}`}
                  >
                    {t("common.cancel")}
                  </button>
                </div>
              </>
            )}

            {step === "confirm" && selectedMethod && (
              <>
                <h2 className={`text-2xl font-extrabold mb-2 ${isDark ? "text-white" : "text-gray-800"}`}>
                  {t("wallet.confirmDeposit")}
                </h2>
                <p className={`text-sm mb-4 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  {isNativeAndroid ? t("wallet.depositFunds") : t("wallet.transferInstructions")}
                </p>

                {!isNativeAndroid && (
                  <p className={`text-xs mb-4 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                    {t("wallet.transactionWarning")}
                  </p>
                )}

                {/* Payment details card */}
                <div className={`p-4 rounded-2xl mb-6 shadow-sm ${getDepositCardClass(resolveDepositCardStyle(selectedMethod), isDark)}`}>
                  {isNativeAndroid ? (
                    <>
                      <p className="font-bold text-lg mb-2">🛒 {selectedMethod.title || selectedMethod.displayName || selectedMethod.productId}</p>
                      <p className={`text-xs mb-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        {PAYMENT_CATEGORY_LABELS.google}
                      </p>
                      {!!selectedMethod.formattedPrice && (
                        <p className={`text-sm mb-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                          {selectedMethod.formattedPrice}
                        </p>
                      )}
                      <p className={`font-mono text-lg ${isDark ? "text-white" : "text-gray-800"}`}>
                        $ {Number(selectedMethod.walletAmount || 0).toFixed(2)}
                      </p>
                      {!!selectedMethod.description && (
                        <p className={`text-xs mt-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                          {selectedMethod.description}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="font-bold text-lg mb-2">
                        {getTypeInfo(selectedMethod.type).emoji} {getTypeInfo(selectedMethod.type).label}
                      </p>
                      <p className={`text-xs mb-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        {PAYMENT_CATEGORY_LABELS[resolvePaymentCategory(selectedMethod)]}
                      </p>
                      {selectedMethod?.gatewayConfig?.depositCardNote && (
                        <p className={`text-xs mb-2 ${isDark ? "text-blue-300" : "text-blue-700"}`}>
                          {selectedMethod.gatewayConfig.depositCardNote}
                        </p>
                      )}
                      <div className={`space-y-2 text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                        {selectedMethod.bankName && (
                          <p>🏦 <strong>{t("wallet.bank")}</strong> {selectedMethod.bankName}</p>
                        )}
                        <p className="font-mono text-lg">
                          🔢 <strong>{t("wallet.accountNumber")}</strong> {selectedMethod.accountNumber}
                        </p>
                        {selectedMethod.accountName && (
                          <p>👤 <strong>{t("wallet.accountName")}</strong> {selectedMethod.accountName}</p>
                        )}
                        {selectedMethod.phoneNumber && (
                          <p>📞 <strong>{t("wallet.phone")}</strong> {selectedMethod.phoneNumber}</p>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {!isNativeAndroid && (
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className={`block font-bold mb-2 ${isDark ? "text-white" : "text-gray-800"}`}>
                        {t("wallet.amountLabel")}
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        placeholder={t('wallet.amountPlaceholder')}
                        className={`w-full px-4 py-3 border-2 rounded-xl text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${isDark ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300 bg-white"
                          }`}
                      />
                    </div>

                    <div>
                      <label className={`block font-bold mb-2 ${isDark ? "text-white" : "text-gray-800"}`}>
                        {t("wallet.transactionIdLabel")}
                      </label>
                      <input
                        type="text"
                        value={depositTransactionId}
                        onChange={(e) => setDepositTransactionId(e.target.value)}
                        placeholder={t('wallet.transactionIdPlaceholder')}
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${isDark ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300 bg-white"
                          }`}
                      />
                    </div>

                    <div>
                      <label className={`block font-bold mb-2 ${isDark ? "text-white" : "text-gray-800"}`}>
                        {t("wallet.receiptUrlLabel")}
                      </label>
                      <input
                        type="url"
                        value={depositReceiptUrl}
                        onChange={(e) => setDepositReceiptUrl(e.target.value)}
                        placeholder="https://..."
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${isDark ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300 bg-white"
                          }`}
                      />
                    </div>

                    <div>
                      <label className={`block font-bold mb-2 ${isDark ? "text-white" : "text-gray-800"}`}>
                        {t("wallet.notesLabel")}
                      </label>
                      <textarea
                        value={depositNotes}
                        onChange={(e) => setDepositNotes(e.target.value)}
                        placeholder={t("wallet.notesPlaceholder")}
                        rows={2}
                        className={`w-full px-3 py-2.5 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${isDark ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300 bg-white"
                          }`}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={handleDepositSubmit}
                    disabled={
                      isAnyDepositMutationPending ||
                      (isNativeAndroid
                        ? !selectedMethod?.productId
                        : (
                          !depositAmount
                          || parseFloat(depositAmount) <= 0
                          || !depositTransactionId.trim()
                        ))
                    }
                    className={`sm:col-span-2 px-4 py-3.5 text-white rounded-xl font-bold text-lg disabled:opacity-50 ${successGradientButtonClass}`}
                  >
                    {isAnyDepositMutationPending ? t('wallet.submitting') : t('wallet.submitDeposit')}
                  </button>
                  <button
                    onClick={() => setStep("select")}
                    className={`px-4 py-3.5 rounded-xl font-bold ${isDark ? "bg-slate-700 hover:bg-slate-600 text-gray-200" : "bg-gray-200 hover:bg-gray-300 text-gray-800"}`}
                  >
                    {t("common.back")}
                  </button>
                  <button
                    onClick={resetDeposit}
                    className="px-4 py-3.5 bg-red-400 hover:bg-red-500 text-white rounded-xl font-bold"
                  >
                    {t("common.cancel")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
