import type { Express } from "express";
import { lookup } from "node:dns/promises";
import { storage } from "../storage";
import {
  products,
  productCategories,
  parentPurchases,
  parentPurchaseItems,
  parentOwnedProducts,
  gifts,
  notifications,
  children,
  parentWallet,
  paymentMethods,
  libraryProducts,
  libraries,
  libraryOrders,
  libraryDailySales,
  libraryReferrals,
  libraryActivityLogs,
  libraryReferralSettings,
  adConversions,
  ads,
  outboxEvents,
  parentChild,
  parents,
  appSettings,
} from "../../shared/schema";
import { eq, and, or, desc, asc, sql, isNull } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { authMiddleware, adminMiddleware, JWT_SECRET, requireLinkedChildForParentMonetization, requireParentToken } from "./middleware";
import { createNotification, notifyChildProductAssigned } from "../notifications";
import { emitGiftEvent } from "../giftEvents";
import { checkoutLimiter, publicApiLimiter } from "../utils/rateLimiters";
import { successResponse, errorResponse, ErrorCode } from "../utils/apiResponse";
import { NOTIFICATION_TYPES } from "../../shared/notificationTypes";
import {
  filterPaymentMethodsByCountry,
  resolveParentCountryCode,
  resolveRequestCountryCode,
} from "../utils/paymentCountry";
import {
  normalizeInHomeShippingInput,
  resolveInHomeShippingConfig,
  sanitizeInHomeShippingConfig,
  testInHomeShippingConnection,
  validateInHomeConnectorIsolation,
} from "../services/inHomeShipping";
import { buildLocalizedMap, getLocalizedValue, resolveLocaleCode } from "../services/productLocalization";
import { monitorWalletSpend } from "../services/riskMonitor";
import { monitorPaymentCallbackRejection } from "../services/riskMonitor";
import {
  createPaymentRedirectForMethod,
  parseProviderCallback,
  resolvePublicAppBaseUrl,
  setParentPurchaseStatus,
  verifyProviderCallbackSignature,
} from "../services/payments/paymentService";
import {
  getGooglePlayMonetizationPolicy,
  isDigitalProductType,
  resolveCheckoutPlatform,
  shouldEnforceGooglePlayForCheckout,
} from "../services/googlePlayMonetizationPolicy";

const db = storage.db;

interface StoreProduct {
  id: string;
  name: string;
  nameAr: string | null;
  nameI18n?: Record<string, string> | null;
  description: string | null;
  descriptionAr: string | null;
  descriptionI18n?: Record<string, string> | null;
  price: string;
  originalPrice: string | null;
  pointsPrice: number;
  image: string | null;
  images: string[] | null;
  stock: number;
  productType: string;
  brand: string | null;
  rating: string | null;
  reviewCount: number;
  isFeatured: boolean;
  categoryId: string | null;
  displayCountries?: string[] | null;
  displayCurrencies?: string[] | null;
  createdAt: Date;
  discountPercent?: number;
  isLibraryProduct?: boolean;
  libraryId?: string | null;
  libraryName?: string | null;
}

type StoreCampaignAudience = "all" | "parents" | "children" | "fathers" | "mothers";

function parsePromoParamsFromLink(linkUrl: string | null | undefined): {
  promoProductId: string;
  discountPercent: number | null;
} {
  if (!linkUrl) {
    return { promoProductId: "", discountPercent: null };
  }

  try {
    const isAbsolute = /^https?:\/\//i.test(linkUrl);
    const url = isAbsolute ? new URL(linkUrl) : new URL(linkUrl, "https://classify.local");
    const params = url.searchParams;
    const promoProductId = String(params.get("promoProductId") || "").trim();
    const parsedDiscount = Number.parseInt(String(params.get("promoDiscount") || ""), 10);
    const discountPercent = Number.isFinite(parsedDiscount)
      ? Math.min(90, Math.max(1, Math.trunc(parsedDiscount)))
      : null;

    return { promoProductId, discountPercent };
  } catch {
    return { promoProductId: "", discountPercent: null };
  }
}

function normalizeInternalRedirectPath(rawValue: unknown, fallback: string): string {
  const value = String(rawValue || "").trim();

  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  if (value.includes("\\") || /[\u0000-\u001F\u007F]/.test(value)) {
    return fallback;
  }

  try {
    const parsed = new URL(value, "https://classi-fy.com");
    if (parsed.origin !== "https://classi-fy.com") {
      return fallback;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

function isAudienceMatch(targetAudience: string | null | undefined, requestedAudience: StoreCampaignAudience): boolean {
  const target = String(targetAudience || "all").trim().toLowerCase();
  if (target === "all") return true;
  if (target === requestedAudience) return true;

  if (target === "parents" && (requestedAudience === "parents" || requestedAudience === "fathers" || requestedAudience === "mothers")) {
    return true;
  }

  if ((target === "fathers" || target === "mothers") && requestedAudience === "parents") {
    return true;
  }

  return false;
}

function isCampaignActiveNow(startDate: Date | null, endDate: Date | null, now: Date): boolean {
  if (startDate && now < startDate) return false;
  if (endDate && now > endDate) return false;
  return true;
}

function normalizeCodeList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim().toUpperCase())
      .filter((item, index, arr) => item.length > 0 && arr.indexOf(item) === index);
  }
  return [];
}

function matchesTargeting(
  selectedCountry: string,
  selectedCurrency: string,
  displayCountries: unknown,
  displayCurrencies: unknown,
): boolean {
  const countries = normalizeCodeList(displayCountries);
  const currencies = normalizeCodeList(displayCurrencies);

  const countryAllowed = countries.length === 0 || countries.includes(selectedCountry);
  const currencyAllowed = currencies.length === 0 || currencies.includes(selectedCurrency);
  return countryAllowed && currencyAllowed;
}

const INHOME_CONNECTOR_SETTINGS_KEY = "inHomeShippingConnector";
const TRIAL_POLICY_SETTING_KEY = "trialPolicy";
const PAYMENT_PENDING_TTL_MINUTES = Math.max(1, Number.parseInt(process.env.PAYMENT_PENDING_TTL_MINUTES || "20", 10) || 20);
const PAYMENT_PENDING_TTL_MS = PAYMENT_PENDING_TTL_MINUTES * 60 * 1000;

type TrialPolicyStoreSettings = {
  firstProductDiscountEnabled: boolean;
  firstProductDiscountPercent: number;
};

const DEFAULT_TRIAL_POLICY_SETTINGS: TrialPolicyStoreSettings = {
  firstProductDiscountEnabled: true,
  firstProductDiscountPercent: 15,
};

type CategoryAudience = "all" | "parents" | "children" | "fathers" | "mothers";

const CATEGORY_AUDIENCES: CategoryAudience[] = ["all", "parents", "children", "fathers", "mothers"];

function normalizeIdempotencyKey(raw: unknown): string {
  const value = String(raw || "").trim();
  if (!value) return "";
  return value.replace(/[^a-zA-Z0-9:_\-.]/g, "").slice(0, 128);
}

function isStrictIdempotencyKey(value: string): boolean {
  const normalized = String(value || "").trim();
  if (!normalized) return false;
  return /^[a-zA-Z0-9][a-zA-Z0-9:_\-.]{11,127}$/.test(normalized);
}

function buildPaymentIdempotencyInvoice(parentId: string, idempotencyKey: string): string {
  return `IDEMP:${parentId}:${idempotencyKey}`;
}

function toExpiryIso(createdAt: unknown): string {
  const createdTs = new Date(String(createdAt || new Date().toISOString())).getTime();
  return new Date(createdTs + PAYMENT_PENDING_TTL_MS).toISOString();
}

async function expireStalePendingPurchasesForParent(parentId: string) {
  const cutoff = new Date(Date.now() - PAYMENT_PENDING_TTL_MS);
  await db
    .update(parentPurchases)
    .set({ paymentStatus: "failed" })
    .where(and(
      eq(parentPurchases.parentId, parentId),
      eq(parentPurchases.paymentStatus, "pending"),
      sql`${parentPurchases.createdAt} < ${cutoff}`
    ));
}

async function getTrialPolicyStoreSettings(): Promise<TrialPolicyStoreSettings> {
  const rows = await db
    .select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, TRIAL_POLICY_SETTING_KEY))
    .limit(1);

  if (!rows[0]?.value) return DEFAULT_TRIAL_POLICY_SETTINGS;

  try {
    const parsed = JSON.parse(rows[0].value);
    const enabledRaw = parsed?.firstProductDiscountEnabled;
    const percentRaw = parsed?.firstProductDiscountPercent;

    const enabled = typeof enabledRaw === "boolean"
      ? enabledRaw
      : String(enabledRaw ?? "").trim().toLowerCase() === "true";

    const parsedPercent = typeof percentRaw === "number"
      ? percentRaw
      : Number.parseInt(String(percentRaw ?? ""), 10);

    return {
      firstProductDiscountEnabled: typeof enabledRaw === "undefined"
        ? DEFAULT_TRIAL_POLICY_SETTINGS.firstProductDiscountEnabled
        : enabled,
      firstProductDiscountPercent: Number.isFinite(parsedPercent)
        ? Math.min(90, Math.max(1, Math.trunc(parsedPercent)))
        : DEFAULT_TRIAL_POLICY_SETTINGS.firstProductDiscountPercent,
    };
  } catch {
    return DEFAULT_TRIAL_POLICY_SETTINGS;
  }
}

async function validateProviderCallbackContext(provider: string, callback: any) {
  const claims = callback?.stateClaims;
  const stateProvider = String(claims?.provider || "").trim().toLowerCase();
  const stateParentId = String(claims?.parentId || "").trim();
  const stateMethodId = String(claims?.methodId || "").trim();
  const statePurchaseId = String(claims?.purchaseId || "").trim();

  if (!stateProvider || !stateParentId || !stateMethodId) {
    throw new Error("Missing required payment state claims");
  }

  if (stateProvider !== provider) {
    throw new Error("Provider mismatch in payment state");
  }

  if (statePurchaseId && statePurchaseId !== callback.purchaseId) {
    throw new Error("Purchase mismatch in payment state");
  }

  const purchaseRows = await db
    .select({
      id: parentPurchases.id,
      parentId: parentPurchases.parentId,
      paymentStatus: parentPurchases.paymentStatus,
    })
    .from(parentPurchases)
    .where(eq(parentPurchases.id, callback.purchaseId))
    .limit(1);

  const purchase = purchaseRows[0];
  if (!purchase) {
    throw new Error("Purchase not found");
  }

  if (purchase.parentId !== stateParentId) {
    throw new Error("Parent mismatch in payment callback");
  }

  const methodRows = await db
    .select({ id: paymentMethods.id, type: paymentMethods.type, gatewayConfig: paymentMethods.gatewayConfig })
    .from(paymentMethods)
    .where(and(eq(paymentMethods.id, stateMethodId), isNull(paymentMethods.parentId)))
    .limit(1);

  const method = methodRows[0];
  if (!method) {
    throw new Error("Payment method not found for callback state");
  }

  if (String(method.type).toLowerCase() !== provider) {
    throw new Error("Payment method/provider mismatch");
  }

  return {
    purchase,
    method,
  };
}

function normalizeGender(value: unknown): "male" | "female" | null {
  if (!value || typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (["male", "m", "man", "ذكر"].includes(normalized)) return "male";
  if (["female", "f", "woman", "أنثى", "انثى"].includes(normalized)) return "female";
  return null;
}

async function resolveAllowedCategoryAudiences(req: any): Promise<CategoryAudience[]> {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return ["all"];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded?.type === "child") {
      return ["all", "children"];
    }

    const parentId = decoded?.parentId || decoded?.userId;
    if (!parentId) return ["all"];

    const parentRows = await db
      .select({ gender: parents.gender })
      .from(parents)
      .where(eq(parents.id, parentId))
      .limit(1);

    const normalizedGender = normalizeGender(parentRows[0]?.gender);
    if (normalizedGender === "male") {
      return ["all", "parents", "fathers"];
    }
    if (normalizedGender === "female") {
      return ["all", "parents", "mothers"];
    }

    return ["all", "parents"];
  } catch {
    return ["all"];
  }
}

async function getInHomeConnectorConfig() {
  const envConfig = resolveInHomeShippingConfig();
  const rows = await db.select().from(appSettings).where(eq(appSettings.key, INHOME_CONNECTOR_SETTINGS_KEY));
  if (!rows[0]?.value) return envConfig;

  try {
    const parsed = JSON.parse(rows[0].value);
    const parsedBaseUrl = typeof parsed?.baseUrl === "string" ? parsed.baseUrl.trim() : "";
    const parsedApiKey = typeof parsed?.apiKey === "string" ? parsed.apiKey.trim() : "";
    const parsedWebhookSecret = typeof parsed?.webhookSecret === "string" ? parsed.webhookSecret.trim() : "";
    return resolveInHomeShippingConfig({
      enabled: typeof parsed?.enabled === "boolean" ? parsed.enabled : envConfig.enabled,
      baseUrl: parsedBaseUrl || envConfig.baseUrl,
      apiKey: parsedApiKey || envConfig.apiKey,
      timeoutMs: typeof parsed?.timeoutMs === "number" ? parsed.timeoutMs : envConfig.timeoutMs,
      webhookSecret: parsedWebhookSecret || envConfig.webhookSecret,
    });
  } catch {
    return envConfig;
  }
}

async function saveInHomeConnectorConfig(config: ReturnType<typeof resolveInHomeShippingConfig>) {
  const payload = JSON.stringify({
    enabled: config.enabled,
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    timeoutMs: config.timeoutMs,
    webhookSecret: config.webhookSecret,
  });

  const existing = await db.select().from(appSettings).where(eq(appSettings.key, INHOME_CONNECTOR_SETTINGS_KEY));
  if (existing[0]) {
    await db
      .update(appSettings)
      .set({ value: payload, updatedAt: new Date() })
      .where(eq(appSettings.key, INHOME_CONNECTOR_SETTINGS_KEY));
    return;
  }

  await db.insert(appSettings).values({
    key: INHOME_CONNECTOR_SETTINGS_KEY,
    value: payload,
  });
}

async function diagnoseInHomeConnector(config: ReturnType<typeof resolveInHomeShippingConfig>) {
  const hasBaseUrl = !!config.baseUrl;
  const hasApiKey = !!config.apiKey;
  const hasWebhookSecret = !!config.webhookSecret;
  const validation = validateInHomeConnectorIsolation(config);

  let parsedBaseUrl: URL | null = null;
  try {
    parsedBaseUrl = config.baseUrl ? new URL(config.baseUrl) : null;
  } catch {
    parsedBaseUrl = null;
  }

  let dnsCheck: {
    ok: boolean;
    hostname: string | null;
    address: string | null;
    family: number | null;
    message: string;
  } = {
    ok: false,
    hostname: parsedBaseUrl?.hostname || null,
    address: null,
    family: null,
    message: "No valid base URL",
  };

  if (parsedBaseUrl?.hostname) {
    try {
      const resolved = await lookup(parsedBaseUrl.hostname);
      dnsCheck = {
        ok: true,
        hostname: parsedBaseUrl.hostname,
        address: resolved.address,
        family: resolved.family,
        message: "DNS resolved",
      };
    } catch (error: any) {
      dnsCheck = {
        ok: false,
        hostname: parsedBaseUrl.hostname,
        address: null,
        family: null,
        message: error?.code || error?.message || "DNS lookup failed",
      };
    }
  }

  const probeResult = await testInHomeShippingConnection(config);

  const recommendations: string[] = [];
  if (!config.enabled) recommendations.push("Enable connector in admin settings first");
  if (!hasBaseUrl) recommendations.push("Set INHOME base URL (absolute https URL)");
  if (!hasApiKey) recommendations.push("Provide in-home API key");
  if (!hasWebhookSecret) recommendations.push("Provide webhook secret for signed callbacks");
  if (hasBaseUrl && !parsedBaseUrl) recommendations.push("Fix base URL format (example: https://inhome.classi-fy.com)");
  if (parsedBaseUrl && !dnsCheck.ok) recommendations.push("Fix DNS record for in-home host");
  if (!validation.ok) recommendations.push(`Validation failed: ${validation.message}`);
  if (!probeResult.ok) recommendations.push(`Connectivity probe failed: ${probeResult.message}`);

  return {
    connector: {
      enabled: config.enabled,
      baseUrl: config.baseUrl,
      hasApiKey,
      hasWebhookSecret,
      timeoutMs: config.timeoutMs,
    },
    checks: {
      validation,
      dns: dnsCheck,
      probe: probeResult,
    },
    recommendations,
    summary: {
      ok: validation.ok && dnsCheck.ok && probeResult.ok,
      message: validation.ok && dnsCheck.ok && probeResult.ok
        ? "In-home connector looks healthy"
        : "In-home connector has blocking issues",
    },
  };
}

function sanitizeGatewayConfigForPublic(config: unknown) {
  if (!config || typeof config !== "object") return null;
  const source = config as Record<string, unknown>;
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (/secret|token|password|private|api.?key|merchant/i.test(key)) continue;
    safe[key] = value;
  }
  return safe;
}

export async function registerStoreRoutes(app: Express) {
  // PUBLIC: Get active payment methods visible to ALL users (no auth required)
  // This allows visitors to see available payment methods before registering
  app.get("/api/public/payment-methods", publicApiLimiter, async (req: any, res) => {
    try {
      const policy = await getGooglePlayMonetizationPolicy(db);
      const methods = await db
        .select({
          id: paymentMethods.id,
          type: paymentMethods.type,
          displayName: paymentMethods.displayName,
          accountName: paymentMethods.accountName,
          bankName: paymentMethods.bankName,
          accountNumber: paymentMethods.accountNumber,
          phoneNumber: paymentMethods.phoneNumber,
          supportedCountries: paymentMethods.supportedCountries,
          gatewayConfig: paymentMethods.gatewayConfig,
          isDefault: paymentMethods.isDefault,
        })
        .from(paymentMethods)
        .where(and(
          isNull(paymentMethods.parentId),
          eq(paymentMethods.isActive, true)
        ));

      const platform = resolveCheckoutPlatform(req.query?.platform || req.headers["x-client-platform"]);
      const purchaseKind = String(req.query?.purchaseKind || req.query?.productType || "").trim().toLowerCase();
      const hasDigitalItems = purchaseKind === "digital" || purchaseKind === "subscription" || purchaseKind === "mixed";
      const googlePlayEnforced = shouldEnforceGooglePlayForCheckout({
        policy,
        platform,
        hasDigitalItems,
      });

      const requestCountryCode = resolveRequestCountryCode(req);
      const filteredMethods = filterPaymentMethodsByCountry(methods, requestCountryCode);
      const complianceFilteredMethods = googlePlayEnforced
        ? []
        : filteredMethods;
      const safeMethods = complianceFilteredMethods.map((method: any) => ({
        ...method,
        gatewayConfig: sanitizeGatewayConfigForPublic(method.gatewayConfig),
      }));

      res.json({
        success: true,
        data: safeMethods,
        meta: {
          platform,
          googlePlayEnforced,
          walletCheckoutEnabled: policy.walletCheckoutEnabled,
          googlePlayMethodType: policy.googlePlayMethodType,
        },
      });
    } catch (error: any) {
      console.error("Get public payment methods error:", error);
      res.status(500).json({ success: false, error: "INTERNAL_SERVER_ERROR", message: "Failed to get payment methods" });
    }
  });

  // Get active payment methods for store checkout (admin-configured only, safe fields)
  app.get("/api/store/payment-methods", authMiddleware, requireParentToken, async (req: any, res) => {
    try {
      const policy = await getGooglePlayMonetizationPolicy(db);
      const methods = await db
        .select({
          id: paymentMethods.id,
          type: paymentMethods.type,
          displayName: paymentMethods.displayName,
          accountName: paymentMethods.accountName,
          bankName: paymentMethods.bankName,
          accountNumber: paymentMethods.accountNumber,
          phoneNumber: paymentMethods.phoneNumber,
          supportedCountries: paymentMethods.supportedCountries,
          gatewayConfig: paymentMethods.gatewayConfig,
        })
        .from(paymentMethods)
        .where(and(
          isNull(paymentMethods.parentId),
          eq(paymentMethods.isActive, true)
        ));

      const parentId = req.user?.parentId || req.user?.userId;
      const shippingCountryCode = await resolveParentCountryCode(db, parentId);
      const queryCountryCode = String(req.query?.country || "").trim().toUpperCase();
      const requestCountryCode = queryCountryCode || resolveRequestCountryCode(req);
      const platform = resolveCheckoutPlatform(req.query?.platform || req.headers["x-client-platform"]);
      const purchaseKind = String(req.query?.purchaseKind || req.query?.productType || "").trim().toLowerCase();
      const hasDigitalItems = purchaseKind === "digital" || purchaseKind === "subscription" || purchaseKind === "mixed";
      const googlePlayEnforced = shouldEnforceGooglePlayForCheckout({
        policy,
        platform,
        hasDigitalItems,
      });
      const effectiveCountryCode = shippingCountryCode || requestCountryCode;
      const filteredMethods = filterPaymentMethodsByCountry(methods, effectiveCountryCode);
      const complianceFilteredMethods = googlePlayEnforced
        ? []
        : filteredMethods;
      const safeMethods = complianceFilteredMethods.map((method: any) => ({
        ...method,
        gatewayConfig: sanitizeGatewayConfigForPublic(method.gatewayConfig),
      }));

      res.json({
        success: true,
        data: safeMethods,
        meta: {
          platform,
          googlePlayEnforced,
          walletCheckoutEnabled: policy.walletCheckoutEnabled,
          googlePlayMethodType: policy.googlePlayMethodType,
        },
      });
    } catch (error: any) {
      console.error("Get store payment methods error:", error);
      res.status(500).json({ success: false, error: "INTERNAL_SERVER_ERROR", message: "Failed to get payment methods" });
    }
  });

  app.get("/api/store/checkout-policy", authMiddleware, requireParentToken, async (req: any, res) => {
    try {
      const policy = await getGooglePlayMonetizationPolicy(db);
      const platform = resolveCheckoutPlatform(req.query?.platform || req.headers["x-client-platform"]);
      const purchaseKind = String(req.query?.purchaseKind || req.query?.productType || "").trim().toLowerCase();
      const hasDigitalItems = purchaseKind === "digital" || purchaseKind === "subscription" || purchaseKind === "mixed";
      const googlePlayEnforced = shouldEnforceGooglePlayForCheckout({
        policy,
        platform,
        hasDigitalItems,
      });

      return res.json(successResponse({
        ...policy,
        platform,
        purchaseKind,
        googlePlayEnforced,
      }));
    } catch (error: any) {
      console.error("Get checkout policy error:", error);
      return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to load checkout policy"));
    }
  });

  app.post("/api/payments/:provider/callback", async (req: any, res) => {
    try {
      const provider = String(req.params.provider || "").trim().toLowerCase();
      const payload = req.body && typeof req.body === "object" ? req.body : {};
      const callback = await parseProviderCallback({
        providerRaw: provider,
        payload,
        jwtSecret: JWT_SECRET,
      });

      const { purchase, method } = await validateProviderCallbackContext(provider, callback);
      if (purchase.paymentStatus !== "pending") {
        return res.json({ success: true, data: { purchaseId: callback.purchaseId, paymentStatus: purchase.paymentStatus } });
      }

      const gatewayConfig = method?.gatewayConfig && typeof method.gatewayConfig === "object"
        ? (method.gatewayConfig as Record<string, any>)
        : {};
      const verification = verifyProviderCallbackSignature({
        provider,
        payload,
        gatewayConfig,
      });

      if (!verification.verified) {
        void monitorPaymentCallbackRejection({
          provider,
          purchaseId: callback.purchaseId,
          parentId: purchase.parentId,
          reason: `unverified_callback:${verification.reason}`,
          ip: req.ip || null,
          userAgent: req.headers["user-agent"] ? String(req.headers["user-agent"]) : null,
        }).catch((riskError: any) => {
          console.error("Risk monitor (callback rejection) failed:", riskError?.message || riskError);
        });

        return res.status(400).json(errorResponse(
          ErrorCode.BAD_REQUEST,
          `Unverified payment callback (${verification.reason})`
        ));
      }

      const nextStatus = callback.success ? "paid" : "failed";
      const result = await setParentPurchaseStatus(callback.purchaseId, nextStatus);
      return res.json({ success: true, data: { purchaseId: callback.purchaseId, paymentStatus: result.finalStatus } });
    } catch (error: any) {
      console.error("Provider callback error:", error);
      const provider = String(req.params.provider || "").trim().toLowerCase();
      const payload = req.body && typeof req.body === "object" ? req.body : {};
      const fallbackPurchaseId = String(payload.orderId || payload.OrderId || payload.merchantRefNum || payload.merchant_order_id || "").trim() || null;

      void monitorPaymentCallbackRejection({
        provider,
        purchaseId: fallbackPurchaseId,
        reason: error?.message || "invalid_callback",
        ip: req.ip || null,
        userAgent: req.headers["user-agent"] ? String(req.headers["user-agent"]) : null,
      }).catch((riskError: any) => {
        console.error("Risk monitor (callback rejection) failed:", riskError?.message || riskError);
      });

      return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, error?.message || "Invalid payment callback"));
    }
  });

  app.get("/api/payments/:provider/return", async (req: any, res) => {
    try {
      const provider = String(req.params.provider || "").trim().toLowerCase();
      const payload = req.query && typeof req.query === "object" ? (req.query as Record<string, any>) : {};

      const callback = await parseProviderCallback({
        providerRaw: provider,
        payload,
        jwtSecret: JWT_SECRET,
      });

      const { purchase } = await validateProviderCallbackContext(provider, callback);
      const finalStatus = purchase.paymentStatus;

      const paymentQuery = finalStatus === "paid"
        ? "success"
        : finalStatus === "failed"
          ? "failed"
          : "pending";

      const redirectPath = `/parent-store?payment=${encodeURIComponent(paymentQuery)}&provider=${encodeURIComponent(provider)}&purchaseId=${encodeURIComponent(callback.purchaseId || "")}`;
      const safeRedirectPath = normalizeInternalRedirectPath(redirectPath, "/parent-store?payment=failed");

      return res.redirect(302, safeRedirectPath);
    } catch (error: any) {
      console.error("Provider return error:", error);
      return res.redirect(302, "/parent-store?payment=failed");
    }
  });

  app.get("/api/store/categories", publicApiLimiter, async (req: any, res) => {
    try {
      const allowedAudiences = await resolveAllowedCategoryAudiences(req);
      const audienceFilter =
        allowedAudiences.length === 1
          ? eq(productCategories.targetAudience, allowedAudiences[0])
          : or(...allowedAudiences.map((audience) => eq(productCategories.targetAudience, audience)));

      const categories = await db
        .select()
        .from(productCategories)
        .where(and(eq(productCategories.isActive, true), audienceFilter))
        .orderBy(asc(productCategories.sortOrder));

      res.json({ success: true, data: categories });
    } catch (error: any) {
      console.error("Get categories error:", error);
      res.status(500).json({ message: "Failed to get categories" });
    }
  });

  app.get("/api/admin/store/inhome-shipping-config", adminMiddleware, async (_req: any, res) => {
    try {
      const connectorConfig = await getInHomeConnectorConfig();

      res.json({
        success: true,
        data: {
          config: sanitizeInHomeShippingConfig(connectorConfig),
          providers: [],
          webhookUrl: null,
          lastWebhookEvent: null,
        },
      });
    } catch (error: any) {
      console.error("Get admin in-home shipping config error:", error);
      res.status(500).json({ success: false, message: "Failed to load connector config" });
    }
  });

  app.put("/api/admin/store/inhome-shipping-config", adminMiddleware, async (req: any, res) => {
    try {
      const current = await getInHomeConnectorConfig();
      const next = normalizeInHomeShippingInput(req.body || {}, current);

      if (next.enabled && (!next.baseUrl || !next.apiKey)) {
        return res.status(400).json({
          success: false,
          error: "BAD_REQUEST",
          message: "baseUrl and apiKey are required when connector is enabled",
        });
      }

      const validation = validateInHomeConnectorIsolation(next);
      if (!validation.ok) {
        return res.status(400).json({
          success: false,
          error: "BAD_REQUEST",
          message: validation.message,
        });
      }

      await saveInHomeConnectorConfig(next);
      res.json({ success: true, data: sanitizeInHomeShippingConfig(next), message: "Connector config saved" });
    } catch (error: any) {
      console.error("Update admin in-home shipping config error:", error);
      res.status(500).json({ success: false, message: "Failed to save connector config" });
    }
  });

  app.post("/api/admin/store/inhome-shipping-config/test", adminMiddleware, async (_req: any, res) => {
    try {
      const connectorConfig = await getInHomeConnectorConfig();
      const result = await testInHomeShippingConnection(connectorConfig);
      res.status(result.ok ? 200 : 400).json({ success: result.ok, data: result });
    } catch (error: any) {
      console.error("Test in-home connector error:", error);
      res.status(500).json({ success: false, message: "Failed to test connector" });
    }
  });

  app.get("/api/admin/store/inhome-shipping-config/diagnose", adminMiddleware, async (_req: any, res) => {
    try {
      const connectorConfig = await getInHomeConnectorConfig();
      const diagnosis = await diagnoseInHomeConnector(connectorConfig);
      res.status(diagnosis.summary.ok ? 200 : 400).json({ success: diagnosis.summary.ok, data: diagnosis });
    } catch (error: any) {
      console.error("Diagnose in-home connector error:", error);
      res.status(500).json({ success: false, message: "Failed to diagnose connector" });
    }
  });

  app.get("/api/store/campaign/resolve", publicApiLimiter, async (req: any, res) => {
    try {
      const promoAdId = String(req.query?.promoAdId || "").trim();
      const fallbackPromoProductId = String(req.query?.promoProductId || "").trim();
      const audienceQuery = String(req.query?.audience || "all").trim().toLowerCase();
      const requestedAudience: StoreCampaignAudience = ["all", "parents", "children", "fathers", "mothers"].includes(audienceQuery)
        ? (audienceQuery as StoreCampaignAudience)
        : "all";

      if (!promoAdId && !fallbackPromoProductId) {
        return res.json({ success: true, data: { active: false, reason: "MISSING_PARAMS" } });
      }

      let resolvedPromoProductId = fallbackPromoProductId;
      let resolvedSourceAdId = "";
      let resolvedDiscountPercent: number | null = null;
      let campaignStartDate: string | null = null;
      let campaignEndDate: string | null = null;

      if (promoAdId) {
        const adRows = await db
          .select({
            id: ads.id,
            isActive: ads.isActive,
            targetAudience: ads.targetAudience,
            startDate: ads.startDate,
            endDate: ads.endDate,
            linkUrl: ads.linkUrl,
          })
          .from(ads)
          .where(eq(ads.id, promoAdId))
          .limit(1);

        const ad = adRows[0];
        if (!ad || !ad.isActive) {
          return res.json({ success: true, data: { active: false, reason: "AD_NOT_ACTIVE" } });
        }

        if (!isAudienceMatch(ad.targetAudience, requestedAudience)) {
          return res.json({ success: true, data: { active: false, reason: "AUDIENCE_MISMATCH" } });
        }

        const now = new Date();
        if (!isCampaignActiveNow(ad.startDate, ad.endDate, now)) {
          return res.json({ success: true, data: { active: false, reason: "OUTSIDE_ACTIVE_WINDOW" } });
        }

        const parsedFromLink = parsePromoParamsFromLink(ad.linkUrl);
        if (!resolvedPromoProductId && parsedFromLink.promoProductId) {
          resolvedPromoProductId = parsedFromLink.promoProductId;
        }
        resolvedDiscountPercent = parsedFromLink.discountPercent;
        resolvedSourceAdId = ad.id;
        campaignStartDate = ad.startDate ? ad.startDate.toISOString() : null;
        campaignEndDate = ad.endDate ? ad.endDate.toISOString() : null;
      }

      if (!resolvedPromoProductId) {
        return res.json({ success: true, data: { active: false, reason: "MISSING_PROMO_PRODUCT" } });
      }

      const productRows = await db
        .select({ id: products.id })
        .from(products)
        .where(and(
          eq(products.id, resolvedPromoProductId),
          eq(products.isActive, true),
          isNull(products.parentId),
          eq(products.moderationStatus, "approved")
        ))
        .limit(1);

      if (!productRows[0]) {
        return res.json({ success: true, data: { active: false, reason: "PROMO_PRODUCT_NOT_FOUND" } });
      }

      return res.json({
        success: true,
        data: {
          active: true,
          campaign: {
            promoProductId: resolvedPromoProductId,
            sourceAdId: resolvedSourceAdId || null,
            discountPercent: resolvedDiscountPercent,
            targetAudience: requestedAudience,
            startDate: campaignStartDate,
            endDate: campaignEndDate,
          },
        },
      });
    } catch (error: any) {
      console.error("Resolve store campaign error:", error);
      return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to resolve campaign"));
    }
  });

  app.get("/api/store/products", publicApiLimiter, async (req: any, res) => {
    try {
      const { categoryId, search, sort = "featured" } = req.query;
      const selectedCountry = String(req.query?.country || resolveRequestCountryCode(req) || "EG").trim().toUpperCase();
      const selectedCurrency = String(req.query?.currency || "EGP").trim().toUpperCase();
      const requestLanguage = resolveLocaleCode(
        (req.query?.lang as string | undefined) ||
        (req.headers["accept-language"] as string | undefined)?.split(",")?.[0],
      );

      // Fetch regular products
      const regularProducts = await db
        .select({
          id: products.id,
          name: products.name,
          nameAr: products.nameAr,
          nameI18n: products.nameI18n,
          description: products.description,
          descriptionAr: products.descriptionAr,
          descriptionI18n: products.descriptionI18n,
          price: products.price,
          originalPrice: products.originalPrice,
          pointsPrice: products.pointsPrice,
          image: products.image,
          images: products.images,
          stock: products.stock,
          productType: products.productType,
          brand: products.brand,
          rating: products.rating,
          reviewCount: products.reviewCount,
          isFeatured: products.isFeatured,
          categoryId: products.categoryId,
          displayCountries: products.displayCountries,
          displayCurrencies: products.displayCurrencies,
          createdAt: products.createdAt,
        })
        .from(products)
        .where(and(
          eq(products.isActive, true),
          isNull(products.parentId),
          eq(products.moderationStatus, "approved")
        ));

      // Map regular products to StoreProduct format with discount info
      const mappedRegularProducts: StoreProduct[] = await Promise.all(
        regularProducts.map(async (p: typeof regularProducts[number]) => {
          let nameMap = p.nameI18n || null;
          let descriptionMap = p.descriptionI18n || null;
          let nameArValue = p.nameAr;
          let descriptionArValue = p.descriptionAr;
          let shouldPersist = false;

          if (!nameMap || !nameMap[requestLanguage]) {
            const nameLocalization = await buildLocalizedMap({
              primaryText: p.name,
              arabicText: p.nameAr,
            });
            if (Object.keys(nameLocalization.map).length > 0) {
              nameMap = nameLocalization.map;
              nameArValue = nameLocalization.arabicText;
              shouldPersist = true;
            }
          }

          if ((!descriptionMap || !descriptionMap[requestLanguage]) && (p.description || p.descriptionAr)) {
            const descriptionLocalization = await buildLocalizedMap({
              primaryText: p.description,
              arabicText: p.descriptionAr,
            });
            if (Object.keys(descriptionLocalization.map).length > 0) {
              descriptionMap = descriptionLocalization.map;
              descriptionArValue = descriptionLocalization.arabicText;
              shouldPersist = true;
            }
          }

          if (shouldPersist) {
            await db
              .update(products)
              .set({
                nameI18n: nameMap,
                nameAr: nameArValue,
                descriptionI18n: descriptionMap,
                descriptionAr: descriptionArValue,
              })
              .where(eq(products.id, p.id));
          }

          const localizedName = getLocalizedValue(nameMap, requestLanguage, p.name, nameArValue);
          const localizedDescription = getLocalizedValue(
            descriptionMap,
            requestLanguage,
            p.description,
            descriptionArValue,
          );

          return {
            ...p,
            nameI18n: nameMap,
            name: localizedName || p.name,
            nameAr: nameArValue,
            descriptionI18n: descriptionMap,
            description: localizedDescription || p.description,
            descriptionAr: descriptionArValue,
            discountPercent: p.originalPrice && parseFloat(p.originalPrice) > parseFloat(p.price)
              ? Math.round((1 - parseFloat(p.price) / parseFloat(p.originalPrice)) * 100)
              : 0,
            isLibraryProduct: false,
            libraryId: null,
            libraryName: null,
          };
        })
      );

      // Fetch library products with library info
      const libProducts = await db
        .select({
          id: libraryProducts.id,
          title: libraryProducts.title,
          description: libraryProducts.description,
          imageUrl: libraryProducts.imageUrl,
          price: libraryProducts.price,
          discountPercent: libraryProducts.discountPercent,
          displayCountries: libraryProducts.displayCountries,
          displayCurrencies: libraryProducts.displayCurrencies,
          stock: libraryProducts.stock,
          libraryId: libraryProducts.libraryId,
          createdAt: libraryProducts.createdAt,
          libraryName: libraries.name,
        })
        .from(libraryProducts)
        .leftJoin(libraries, eq(libraryProducts.libraryId, libraries.id))
        .where(and(
          eq(libraryProducts.isActive, true),
          eq(libraryProducts.moderationStatus, "approved"),
          eq(libraries.isActive, true)
        ));

      // Map library products to StoreProduct format
      const mappedLibProducts: StoreProduct[] = libProducts.map((lp: typeof libProducts[number]) => {
        const originalPrice = lp.price;
        const discountedPrice = lp.discountPercent > 0
          ? (parseFloat(lp.price) * (1 - lp.discountPercent / 100)).toFixed(2)
          : lp.price;
        const pointsPrice = Math.round(parseFloat(discountedPrice) * 10); // 10 points per currency unit

        return {
          id: lp.id,
          name: lp.title,
          nameAr: lp.title,
          nameI18n: { [requestLanguage]: lp.title, en: lp.title, ar: lp.title },
          description: lp.description,
          descriptionAr: lp.description,
          descriptionI18n: { [requestLanguage]: lp.description, en: lp.description, ar: lp.description },
          price: discountedPrice,
          originalPrice: lp.discountPercent > 0 ? originalPrice : null,
          pointsPrice,
          image: lp.imageUrl,
          images: lp.imageUrl ? [lp.imageUrl] : null,
          stock: lp.stock,
          productType: "physical",
          brand: lp.libraryName,
          rating: null,
          reviewCount: 0,
          isFeatured: false,
          categoryId: null,
          createdAt: lp.createdAt,
          discountPercent: lp.discountPercent,
          isLibraryProduct: true,
          libraryId: lp.libraryId,
          libraryName: lp.libraryName,
          displayCountries: lp.displayCountries,
          displayCurrencies: lp.displayCurrencies,
        };
      });

      // Combine all products
      let allProducts: StoreProduct[] = [...mappedRegularProducts, ...mappedLibProducts];

      // Filter by stock
      let filteredProducts = allProducts.filter(p => p.stock > 0);

      filteredProducts = filteredProducts.filter((p: StoreProduct) =>
        matchesTargeting(selectedCountry, selectedCurrency, p.displayCountries, p.displayCurrencies)
      );

      if (categoryId) {
        // When filtering by a main category, also include products in its subcategories
        const subcategoryIds = await db.select({ id: productCategories.id })
          .from(productCategories)
          .where(eq(productCategories.parentId, categoryId as string));
        const matchIds = new Set([categoryId as string, ...subcategoryIds.map((s: { id: string }) => s.id)]);
        filteredProducts = filteredProducts.filter((p: StoreProduct) => p.categoryId && matchIds.has(p.categoryId));
      }

      if (search) {
        const searchLower = (search as string).toLowerCase();
        filteredProducts = filteredProducts.filter((p: StoreProduct) =>
          p.name.toLowerCase().includes(searchLower) ||
          (p.nameAr && p.nameAr.toLowerCase().includes(searchLower)) ||
          (p.description && p.description.toLowerCase().includes(searchLower)) ||
          (p.brand && p.brand.toLowerCase().includes(searchLower)) ||
          (p.libraryName && p.libraryName.toLowerCase().includes(searchLower))
        );
      }

      switch (sort) {
        case "price_asc":
          filteredProducts.sort((a: StoreProduct, b: StoreProduct) => parseFloat(a.price) - parseFloat(b.price));
          break;
        case "price_desc":
          filteredProducts.sort((a: StoreProduct, b: StoreProduct) => parseFloat(b.price) - parseFloat(a.price));
          break;
        case "newest":
          filteredProducts.sort((a: StoreProduct, b: StoreProduct) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          break;
        case "rating":
          filteredProducts.sort((a: StoreProduct, b: StoreProduct) => parseFloat(b.rating || "0") - parseFloat(a.rating || "0"));
          break;
        case "featured":
        default:
          // Featured first, then discounted products, then rest
          filteredProducts.sort((a: StoreProduct, b: StoreProduct) => {
            if (a.isFeatured !== b.isFeatured) return b.isFeatured ? 1 : -1;
            if ((a.discountPercent || 0) !== (b.discountPercent || 0)) return (b.discountPercent || 0) - (a.discountPercent || 0);
            return 0;
          });
          break;
      }

      res.json({ success: true, data: filteredProducts });
    } catch (error: any) {
      console.error("Get products error:", error);
      res.status(500).json({ message: "Failed to get products" });
    }
  });

  app.post("/api/store/checkout", authMiddleware, requireParentToken, requireLinkedChildForParentMonetization, checkoutLimiter, async (req: any, res) => {
    try {
      const { items, paymentMethodId, shippingAddress, referralCode, currency, sourceAdId, platform } = req.body;
      const parentId = req.user?.parentId || req.user?.userId;

      const checkoutCurrency = String(currency || "EGP").trim().toUpperCase() || "EGP";
      const rawIdempotency = req.headers["idempotency-key"] || req.headers["x-idempotency-key"] || req.body?.idempotencyKey;
      const idempotencyKey = normalizeIdempotencyKey(rawIdempotency);

      if (paymentMethodId !== "wallet" && !isStrictIdempotencyKey(idempotencyKey)) {
        return res.status(400).json(errorResponse(
          ErrorCode.BAD_REQUEST,
          "idempotencyKey is required and must be 12-128 safe characters for non-wallet checkout"
        ));
      }

      if (!items || items.length === 0) {
        return res.status(400).json({ message: "No items in cart" });
      }

      const normalizedItems = items.map((item: any) => ({
        productId: item?.productId,
        quantity: Math.max(1, parseInt(String(item?.quantity || 1), 10) || 1),
      }));

      type CheckoutItem =
        | {
          kind: "regular";
          quantity: number;
          unitPrice: number;
          subtotal: number;
          regularProduct: typeof products.$inferSelect;
        }
        | {
          kind: "library";
          quantity: number;
          unitPrice: number;
          subtotal: number;
          libraryProduct: {
            id: string;
            libraryId: string;
            title: string;
            description: string | null;
            imageUrl: string | null;
            price: string;
            discountPercent: number;
            stock: number;
            libraryName: string;
            commissionRatePct: string;
          };
        };

      const checkoutItems: CheckoutItem[] = [];

      for (const item of normalizedItems) {
        if (!item.productId) {
          return res.status(400).json({ message: "Invalid product in cart" });
        }

        const regularProduct = await db.select().from(products).where(eq(products.id, item.productId));
        if (regularProduct[0]) {
          const regular: any = regularProduct[0];
          if (regular.moderationStatus && regular.moderationStatus !== "approved") {
            return res.status(400).json({ message: "Product is not approved for sale" });
          }
          if (regularProduct[0].stock < item.quantity) {
            return res.status(400).json({ message: `Insufficient stock for ${regularProduct[0].name}` });
          }

          const unitPrice = parseFloat(regularProduct[0].price);
          checkoutItems.push({
            kind: "regular",
            quantity: item.quantity,
            unitPrice,
            subtotal: unitPrice * item.quantity,
            regularProduct: regularProduct[0],
          });
          continue;
        }

        const libraryProduct = await db
          .select({
            id: libraryProducts.id,
            libraryId: libraryProducts.libraryId,
            title: libraryProducts.title,
            description: libraryProducts.description,
            imageUrl: libraryProducts.imageUrl,
            price: libraryProducts.price,
            discountPercent: libraryProducts.discountPercent,
            stock: libraryProducts.stock,
            libraryName: libraries.name,
            commissionRatePct: libraries.commissionRatePct,
          })
          .from(libraryProducts)
          .innerJoin(libraries, eq(libraryProducts.libraryId, libraries.id))
          .where(
            and(
              eq(libraryProducts.id, item.productId),
              eq(libraryProducts.isActive, true),
              eq(libraryProducts.moderationStatus, "approved"),
              eq(libraries.isActive, true)
            )
          );

        if (!libraryProduct[0]) {
          return res.status(404).json({ message: "Product not found" });
        }

        if (libraryProduct[0].stock < item.quantity) {
          return res.status(400).json({ message: `Insufficient stock for ${libraryProduct[0].title}` });
        }

        const rawPrice = parseFloat(libraryProduct[0].price);
        const unitPrice = libraryProduct[0].discountPercent > 0
          ? rawPrice * (1 - libraryProduct[0].discountPercent / 100)
          : rawPrice;

        checkoutItems.push({
          kind: "library",
          quantity: item.quantity,
          unitPrice,
          subtotal: unitPrice * item.quantity,
          libraryProduct: {
            ...libraryProduct[0],
            libraryName: libraryProduct[0].libraryName || "Library",
            commissionRatePct: libraryProduct[0].commissionRatePct || "10.00",
          },
        });
      }

      const monetizationPolicy = await getGooglePlayMonetizationPolicy(db);
      const checkoutPlatform = resolveCheckoutPlatform(platform || req.headers["x-client-platform"]);
      const hasDigitalItems = checkoutItems.some((item) => {
        if (item.kind === "library") return false;
        return isDigitalProductType(item.regularProduct.productType);
      });
      const enforceGooglePlay = shouldEnforceGooglePlayForCheckout({
        policy: monetizationPolicy,
        platform: checkoutPlatform,
        hasDigitalItems,
      });

      if (monetizationPolicy.enabled && !monetizationPolicy.walletCheckoutEnabled && paymentMethodId === "wallet") {
        return res.status(400).json(errorResponse(
          ErrorCode.BAD_REQUEST,
          "Wallet checkout is disabled. Choose an approved payment method.",
        ));
      }

      if (enforceGooglePlay && paymentMethodId === "wallet") {
        return res.status(400).json(errorResponse(
          ErrorCode.BAD_REQUEST,
          "Digital purchases on Android must use Google Play Billing.",
        ));
      }

      const computedTotal = checkoutItems.reduce((sum, item) => sum + item.subtotal, 0);
      const trialPolicy = await getTrialPolicyStoreSettings();
      const paidPurchasesCountRows = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(parentPurchases)
        .where(and(
          eq(parentPurchases.parentId, parentId),
          eq(parentPurchases.paymentStatus, "paid")
        ));

      const paidPurchasesCount = Number(paidPurchasesCountRows[0]?.count || 0);
      const firstPurchaseEligible = paidPurchasesCount === 0;
      const discountEnabled = trialPolicy.firstProductDiscountEnabled;
      const discountPercent = trialPolicy.firstProductDiscountPercent;

      let appliedFirstProductDiscountAmount = 0;
      if (discountEnabled && firstPurchaseEligible && checkoutItems.length > 0) {
        const firstItem = checkoutItems[0];
        const baseSubtotal = Number(firstItem.subtotal || 0);
        if (baseSubtotal > 0) {
          const rawDiscount = Number((baseSubtotal * (discountPercent / 100)).toFixed(2));
          appliedFirstProductDiscountAmount = Math.min(baseSubtotal, Math.max(0, rawDiscount));

          if (appliedFirstProductDiscountAmount > 0) {
            const discountedSubtotal = Number((baseSubtotal - appliedFirstProductDiscountAmount).toFixed(2));
            const effectiveUnitPrice = Number((discountedSubtotal / Math.max(1, firstItem.quantity)).toFixed(2));
            firstItem.subtotal = discountedSubtotal;
            firstItem.unitPrice = effectiveUnitPrice;
          }
        }
      }

      const totalAfterDiscount = Number((computedTotal - appliedFirstProductDiscountAmount).toFixed(2));
      const usedWalletPayment = paymentMethodId === "wallet";

      let selectedGatewayMethod: any = null;
      if (!usedWalletPayment) {
        const methodRows = await db
          .select()
          .from(paymentMethods)
          .where(and(
            eq(paymentMethods.id, String(paymentMethodId || "")),
            isNull(paymentMethods.parentId),
            eq(paymentMethods.isActive, true)
          ))
          .limit(1);

        selectedGatewayMethod = methodRows[0] || null;
        if (!selectedGatewayMethod) {
          return res.status(400).json({ message: "Invalid payment method" });
        }

        if (enforceGooglePlay) {
          return res.status(400).json(errorResponse(
            ErrorCode.BAD_REQUEST,
            "Android digital purchases are unavailable until native Google Play Billing integration is enabled.",
          ));
        }

        await expireStalePendingPurchasesForParent(parentId);

        if (idempotencyKey) {
          const idempotencyInvoice = buildPaymentIdempotencyInvoice(parentId, idempotencyKey);
          const existingRows = await db
            .select({
              id: parentPurchases.id,
              totalAmount: parentPurchases.totalAmount,
              currency: parentPurchases.currency,
              paymentStatus: parentPurchases.paymentStatus,
              createdAt: parentPurchases.createdAt,
            })
            .from(parentPurchases)
            .where(and(
              eq(parentPurchases.parentId, parentId),
              eq(parentPurchases.invoiceNumber, idempotencyInvoice),
              eq(parentPurchases.paymentStatus, "pending")
            ))
            .limit(1);

          const existingPending = existingRows[0];
          if (existingPending) {
            const redirect = await createPaymentRedirectForMethod({
              paymentMethodId: selectedGatewayMethod.id,
              purchaseId: existingPending.id,
              parentId,
              amount: String(existingPending.totalAmount),
              currency: existingPending.currency || checkoutCurrency,
              appBaseUrl: resolvePublicAppBaseUrl(req),
              jwtSecret: JWT_SECRET,
            });

            if (redirect) {
              return res.json({
                success: true,
                message: `Resumed pending payment via ${redirect.provider}`,
                purchaseId: existingPending.id,
                paymentRequired: true,
                paymentStatus: redirect.paymentStatus,
                paymentProvider: redirect.provider,
                paymentUrl: redirect.paymentUrl,
                checkoutExpiresAt: toExpiryIso(existingPending.createdAt),
                resumedPendingPayment: true,
                shippingProviderKey: null,
              });
            }
          }
        }
      }

      const idempotencyInvoiceNumber = !usedWalletPayment && idempotencyKey
        ? buildPaymentIdempotencyInvoice(parentId, idempotencyKey)
        : `INV-WALLET-${Date.now()}-${parentId.slice(0, 8)}`;

      const [purchase] = await db.transaction(async (tx: any) => {
        const referralSettingsRows = await tx.select().from(libraryReferralSettings);
        const saleActivityPoints = referralSettingsRows[0]?.pointsPerSale ?? 10;

        if (paymentMethodId === "wallet") {
          // Atomic check-and-deduct: prevents race condition / double-spend
          const updated = await tx
            .update(parentWallet)
            .set({
              balance: sql`${parentWallet.balance} - ${totalAfterDiscount}`,
              totalSpent: sql`${parentWallet.totalSpent} + ${totalAfterDiscount}`,
              updatedAt: new Date(),
            })
            .where(and(
              eq(parentWallet.parentId, parentId),
              sql`${parentWallet.balance} >= ${totalAfterDiscount}`
            ))
            .returning();

          if (!updated[0]) {
            throw new Error("INSUFFICIENT_BALANCE");
          }
        }

        const createdPurchase = await tx
          .insert(parentPurchases)
          .values({
            parentId,
            totalAmount: totalAfterDiscount.toFixed(2),
            currency: checkoutCurrency,
            paymentStatus: paymentMethodId === "wallet" ? "paid" : "pending",
            invoiceNumber: idempotencyInvoiceNumber,
          })
          .returning();

        for (const item of checkoutItems) {
          let ownedProductId = "";

          if (item.kind === "regular") {
            ownedProductId = item.regularProduct.id;

            await tx.insert(parentPurchaseItems).values({
              purchaseId: createdPurchase[0].id,
              productId: ownedProductId,
              quantity: item.quantity,
              unitPrice: item.unitPrice.toFixed(2),
              subtotal: item.subtotal.toFixed(2),
            });

            await tx
              .update(products)
              .set({ stock: sql`${products.stock} - ${item.quantity}` })
              .where(eq(products.id, item.regularProduct.id));
          } else {
            const pointsPrice = Math.round(item.unitPrice * 10);
            const librarySnapshot = await tx
              .insert(products)
              .values({
                parentId,
                name: item.libraryProduct.title,
                nameAr: item.libraryProduct.title,
                description: item.libraryProduct.description,
                descriptionAr: item.libraryProduct.description,
                price: item.unitPrice.toFixed(2),
                originalPrice:
                  item.libraryProduct.discountPercent > 0
                    ? item.libraryProduct.price
                    : null,
                pointsPrice,
                image: item.libraryProduct.imageUrl,
                images: item.libraryProduct.imageUrl
                  ? [item.libraryProduct.imageUrl]
                  : [],
                stock: 999,
                productType: "physical",
                brand: item.libraryProduct.libraryName,
                isFeatured: false,
                isActive: false,
              })
              .returning();

            ownedProductId = librarySnapshot[0].id;

            await tx.insert(parentPurchaseItems).values({
              purchaseId: createdPurchase[0].id,
              productId: ownedProductId,
              quantity: item.quantity,
              unitPrice: item.unitPrice.toFixed(2),
              subtotal: item.subtotal.toFixed(2),
            });

            await tx
              .update(libraryProducts)
              .set({ stock: sql`${libraryProducts.stock} - ${item.quantity}`, updatedAt: new Date() })
              .where(eq(libraryProducts.id, item.libraryProduct.id));

            await tx
              .update(libraries)
              .set({ totalSales: sql`${libraries.totalSales} + ${item.quantity}`, updatedAt: new Date() })
              .where(eq(libraries.id, item.libraryProduct.libraryId));

            const commissionRate = parseFloat(item.libraryProduct.commissionRatePct || "10.00");
            const commissionAmount = item.subtotal * (commissionRate / 100);
            const libraryNetAmount = item.subtotal - commissionAmount;

            await tx.insert(libraryOrders).values({
              parentPurchaseId: createdPurchase[0].id,
              buyerParentId: parentId,
              libraryId: item.libraryProduct.libraryId,
              libraryProductId: item.libraryProduct.id,
              quantity: item.quantity,
              unitPrice: item.unitPrice.toFixed(2),
              subtotal: item.subtotal.toFixed(2),
              shippingAddress: shippingAddress || null,
              status: "pending_admin",
              commissionRatePct: commissionRate.toFixed(2),
              commissionAmount: commissionAmount.toFixed(2),
              libraryEarningAmount: libraryNetAmount.toFixed(2),
              holdDays: 15,
            });

            const dayStart = new Date();
            dayStart.setHours(0, 0, 0, 0);

            const existingDaily = await tx
              .select()
              .from(libraryDailySales)
              .where(
                and(
                  eq(libraryDailySales.libraryId, item.libraryProduct.libraryId),
                  eq(libraryDailySales.saleDate, dayStart)
                )
              );

            if (existingDaily[0]) {
              await tx
                .update(libraryDailySales)
                .set({
                  totalSalesAmount: sql`${libraryDailySales.totalSalesAmount} + ${item.subtotal.toFixed(2)}`,
                  totalPointsSales: sql`${libraryDailySales.totalPointsSales} + ${Math.round(item.subtotal * 10)}`,
                  totalOrders: sql`${libraryDailySales.totalOrders} + 1`,
                  commissionAmount: sql`${libraryDailySales.commissionAmount} + ${commissionAmount.toFixed(2)}`,
                  updatedAt: new Date(),
                })
                .where(eq(libraryDailySales.id, existingDaily[0].id));
            } else {
              await tx.insert(libraryDailySales).values({
                libraryId: item.libraryProduct.libraryId,
                saleDate: dayStart,
                totalSalesAmount: item.subtotal.toFixed(2),
                totalPointsSales: Math.round(item.subtotal * 10),
                totalOrders: 1,
                commissionRatePct: commissionRate.toFixed(2),
                commissionAmount: commissionAmount.toFixed(2),
                isPaid: false,
              });
            }

            const referralMatch = await tx
              .select()
              .from(libraryReferrals)
              .where(
                and(
                  eq(libraryReferrals.libraryId, item.libraryProduct.libraryId),
                  or(
                    eq(libraryReferrals.status, "clicked"),
                    eq(libraryReferrals.status, "registered")
                  ),
                  referralCode
                    ? eq(libraryReferrals.referralCode, String(referralCode))
                    : or(
                      eq(libraryReferrals.referredParentId, parentId),
                      isNull(libraryReferrals.referredParentId)
                    )
                )
              )
              .orderBy(desc(libraryReferrals.createdAt))
              .limit(1);

            if (referralMatch[0]) {
              await tx
                .update(libraryReferrals)
                .set({
                  status: "purchased",
                  referredParentId: parentId,
                  convertedAt: new Date(),
                })
                .where(eq(libraryReferrals.id, referralMatch[0].id));
            }

            if (usedWalletPayment) {
              await tx.insert(libraryActivityLogs).values({
                libraryId: item.libraryProduct.libraryId,
                action: "sale",
                points: saleActivityPoints,
                metadata: {
                  purchaseId: createdPurchase[0].id,
                  parentId,
                  libraryProductId: item.libraryProduct.id,
                  quantity: item.quantity,
                  amount: item.subtotal.toFixed(2),
                },
              });

              await tx
                .update(libraries)
                .set({
                  activityScore: sql`${libraries.activityScore} + ${saleActivityPoints}`,
                  updatedAt: new Date(),
                })
                .where(eq(libraries.id, item.libraryProduct.libraryId));
            }
          }

          await tx.insert(parentOwnedProducts).values({
            parentId,
            productId: ownedProductId,
            sourcePurchaseId: createdPurchase[0].id,
            status: paymentMethodId === "wallet" ? "active" : "pending_admin_approval",
          });

          if (sourceAdId) {
            await tx.insert(adConversions).values({
              adId: String(sourceAdId),
              parentId,
              purchaseId: createdPurchase[0].id,
              productId: ownedProductId,
              quantity: item.quantity,
              subtotal: item.subtotal.toFixed(2),
              currency: checkoutCurrency,
            });
          }
        }

        await tx.insert(outboxEvents).values({
          type: "TRIAL_FUNNEL_EVENT",
          payloadJson: {
            eventName: "TRIAL_PURCHASE_COMPLETED",
            parentId,
            purchaseId: createdPurchase[0].id,
            sourceAdId: sourceAdId ? String(sourceAdId) : null,
            itemCount: normalizedItems.length,
            totalAfterDiscount: totalAfterDiscount.toFixed(2),
            at: new Date().toISOString(),
          },
          status: "pending",
          availableAt: new Date(),
        });

        return createdPurchase;
      });

      if (usedWalletPayment) {
        void monitorWalletSpend({
          parentId,
          amount: totalAfterDiscount,
          source: "store_checkout",
          relatedId: purchase.id,
        }).catch((error: any) => {
          console.error("Risk monitor (wallet spend) failed:", error?.message || error);
        });
      }

      if (selectedGatewayMethod?.id) {
        try {
          const redirect = await createPaymentRedirectForMethod({
            paymentMethodId: selectedGatewayMethod.id,
            purchaseId: purchase.id,
            parentId,
            amount: totalAfterDiscount.toFixed(2),
            currency: checkoutCurrency,
            appBaseUrl: resolvePublicAppBaseUrl(req),
            jwtSecret: JWT_SECRET,
          });

          if (redirect) {
            return res.json({
              success: true,
              message: `Redirect to ${redirect.provider} to complete payment`,
              purchaseId: purchase.id,
              paymentRequired: true,
              paymentStatus: redirect.paymentStatus,
              paymentProvider: redirect.provider,
              paymentUrl: redirect.paymentUrl,
              checkoutExpiresAt: toExpiryIso((purchase as any).createdAt),
              shippingProviderKey: null,
            });
          }
        } catch (error: any) {
          return res.status(400).json({
            success: false,
            error: "BAD_REQUEST",
            message: error?.message || "Payment provider configuration is invalid",
          });
        }
      }

      res.json({
        success: true,
        message: "Purchase completed successfully",
        purchaseId: purchase.id,
        discount: appliedFirstProductDiscountAmount > 0 ? {
          type: "first_product",
          percent: discountPercent,
          amount: appliedFirstProductDiscountAmount.toFixed(2),
        } : null,
        shippingProviderKey: null,
      });
    } catch (error: any) {
      if (error.message === "INSUFFICIENT_BALANCE") {
        return res.status(400).json({ message: "Insufficient wallet balance" });
      }
      console.error("Checkout error:", error);
      res.status(500).json({ message: "Checkout failed" });
    }
  });

  app.post("/api/store/purchases/:purchaseId/cancel-payment", authMiddleware, requireParentToken, async (req: any, res) => {
    try {
      const parentId = req.user?.parentId || req.user?.userId;
      const purchaseId = String(req.params.purchaseId || "").trim();

      if (!purchaseId) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "purchaseId is required"));
      }

      const purchaseRows = await db
        .select({ id: parentPurchases.id, parentId: parentPurchases.parentId, paymentStatus: parentPurchases.paymentStatus })
        .from(parentPurchases)
        .where(eq(parentPurchases.id, purchaseId))
        .limit(1);

      const purchase = purchaseRows[0];
      if (!purchase) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Purchase not found"));
      }

      if (purchase.parentId !== parentId) {
        return res.status(403).json(errorResponse(ErrorCode.FORBIDDEN, "Not authorized to cancel this payment"));
      }

      if (purchase.paymentStatus !== "pending") {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Only pending payments can be canceled"));
      }

      const result = await setParentPurchaseStatus(purchaseId, "failed");
      return res.json({
        success: true,
        data: {
          purchaseId,
          paymentStatus: result.finalStatus,
          canceled: result.updated,
        },
        message: "Payment canceled",
      });
    } catch (error: any) {
      console.error("Cancel payment error:", error);
      return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to cancel payment"));
    }
  });

  app.post("/api/parent/assign-product", authMiddleware, async (req: any, res) => {
    try {
      const { productId, childId, requiredPoints } = req.body;
      const parentId = req.user?.parentId || req.user?.userId;
      const requiredPointsNum = Number.parseInt(String(requiredPoints), 10);

      if (!productId || !childId || Number.isNaN(requiredPointsNum) || requiredPointsNum <= 0) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // SEC: Verify parent owns this child
      const ownership = await db.select().from(parentChild).where(
        and(eq(parentChild.parentId, parentId), eq(parentChild.childId, childId))
      );
      if (!ownership[0]) {
        return res.status(403).json(errorResponse(ErrorCode.FORBIDDEN, "Not authorized to assign products to this child"));
      }

      const product = await db.select().from(products).where(eq(products.id, productId));
      if (!product[0]) {
        return res.status(404).json({ message: "Product not found" });
      }

      const child = await db.select().from(children).where(eq(children.id, childId));
      if (!child[0]) {
        return res.status(404).json({ message: "Child not found" });
      }

      const childCurrentPoints = Number(child[0].totalPoints || 0);
      const initialGiftStatus = childCurrentPoints >= requiredPointsNum ? "UNLOCKED" : "SENT";

      const [gift] = await db.insert(gifts).values({
        parentId,
        childId,
        productId,
        pointsThreshold: requiredPointsNum,
        status: initialGiftStatus,
        message:
          initialGiftStatus === "UNLOCKED"
            ? `هدية جديدة: ${product[0].nameAr || product[0].name}! يمكنك تفعيلها الآن.`
            : `هدية جديدة: ${product[0].nameAr || product[0].name}! اجمع ${requiredPointsNum} نقطة للحصول عليها!`,
      }).returning();

      if (initialGiftStatus === "UNLOCKED") {
        await createNotification({
          childId,
          type: NOTIFICATION_TYPES.GIFT_UNLOCKED,
          title: "🎉 هديتك جاهزة الآن!",
          message: `أصبحت هدية "${product[0].nameAr || product[0].name}" جاهزة للتفعيل`,
          relatedId: gift.id,
          metadata: {
            productId,
            pointsThreshold: requiredPointsNum,
            currentPoints: childCurrentPoints,
          },
        });

        emitGiftEvent({
          type: "gift.unlocked",
          giftId: gift.id,
          parentId,
          childId,
          productId,
          timestamp: new Date(),
          metadata: { pointsThreshold: requiredPointsNum, currentPoints: childCurrentPoints },
        });
      } else {
        await notifyChildProductAssigned(childId, productId, requiredPointsNum);
      }

      res.json({
        success: true,
        message: "Product assigned successfully",
        giftId: gift.id,
        status: initialGiftStatus,
      });
    } catch (error: any) {
      console.error("Assign product error:", error);
      res.status(500).json({ message: "Assignment failed" });
    }
  });

  app.get("/api/parent/owned-products", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user?.parentId || req.user?.userId;

      const owned = await db
        .select({
          id: parentOwnedProducts.id,
          status: parentOwnedProducts.status,
          createdAt: parentOwnedProducts.createdAt,
          product: {
            id: products.id,
            name: products.name,
            nameAr: products.nameAr,
            price: products.price,
            image: products.image,
            pointsPrice: products.pointsPrice,
          }
        })
        .from(parentOwnedProducts)
        .innerJoin(products, eq(parentOwnedProducts.productId, products.id))
        .where(eq(parentOwnedProducts.parentId, parentId));

      res.json({ success: true, data: owned });
    } catch (error: any) {
      console.error("Get owned products error:", error);
      res.status(500).json({ message: "Failed to get owned products" });
    }
  });

  // LOGIC-001 FIX: Changed from /api/child/gifts to avoid conflict with child.ts:1022
  // This route fetches parent-sent product gifts (from gifts table)
  // While child.ts:/api/child/gifts fetches point-rewards history (from childGifts table)
  app.get("/api/child/store-gifts", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, "Child token required"));
      }

      const childGifts = await db
        .select({
          id: gifts.id,
          pointsThreshold: gifts.pointsThreshold,
          status: gifts.status,
          message: gifts.message,
          createdAt: gifts.createdAt,
          product: {
            id: products.id,
            name: products.name,
            nameAr: products.nameAr,
            image: products.image,
            description: products.description,
          }
        })
        .from(gifts)
        .innerJoin(products, eq(gifts.productId, products.id))
        .where(eq(gifts.childId, childId))
        .orderBy(desc(gifts.createdAt));

      const child = await db.select().from(children).where(eq(children.id, childId));
      const currentPoints = child[0]?.totalPoints || 0;

      const enrichedGifts = childGifts.map((gift: any) => ({
        ...gift,
        currentPoints,
        progress: Math.min(100, Math.round((currentPoints / gift.pointsThreshold) * 100)),
        isUnlocked: currentPoints >= gift.pointsThreshold,
      }));

      res.json({ success: true, data: enrichedGifts });
    } catch (error: any) {
      console.error("Get child gifts error:", error);
      res.status(500).json({ message: "Failed to get gifts" });
    }
  });

  app.get("/api/admin/categories", adminMiddleware, async (req: any, res) => {
    try {
      const categories = await db.select().from(productCategories).orderBy(asc(productCategories.sortOrder));
      res.json({ success: true, data: categories });
    } catch (error: any) {
      console.error("Get admin categories error:", error);
      res.status(500).json({ message: "Failed to get categories" });
    }
  });

  app.post("/api/admin/categories", adminMiddleware, async (req: any, res) => {
    try {
      const { name, nameAr, namePt, icon, color, sortOrder, isActive, parentId, targetAudience } = req.body;
      const normalizedAudience: CategoryAudience = CATEGORY_AUDIENCES.includes(targetAudience)
        ? targetAudience
        : "all";

      const [category] = await db.insert(productCategories).values({
        name,
        nameAr,
        namePt: namePt || null,
        parentId: parentId || null,
        targetAudience: normalizedAudience,
        icon: icon || "Package",
        color: color || "#667eea",
        sortOrder: sortOrder || 0,
        isActive: typeof isActive === "boolean" ? isActive : true,
      }).returning();
      res.json({ success: true, data: category });
    } catch (error: any) {
      console.error("Create category error:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.put("/api/admin/categories/:id", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { name, nameAr, namePt, icon, color, sortOrder, isActive, parentId, targetAudience } = req.body;
      const normalizedAudience: CategoryAudience = CATEGORY_AUDIENCES.includes(targetAudience)
        ? targetAudience
        : "all";

      const [category] = await db.update(productCategories)
        .set({
          name,
          nameAr,
          namePt: namePt || null,
          icon,
          color,
          sortOrder,
          isActive,
          parentId: parentId || null,
          targetAudience: normalizedAudience,
        })
        .where(eq(productCategories.id, id))
        .returning();
      res.json({ success: true, data: category });
    } catch (error: any) {
      console.error("Update category error:", error);
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  app.delete("/api/admin/categories/:id", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      await db.delete(productCategories).where(eq(productCategories.id, id));
      res.json({ success: true, message: "Category deleted" });
    } catch (error: any) {
      console.error("Delete category error:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });
}
