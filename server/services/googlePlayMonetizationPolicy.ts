import { eq } from "drizzle-orm";
import { appSettings } from "../../shared/schema";

export const GOOGLE_PLAY_MONETIZATION_POLICY_KEY = "googlePlayMonetizationPolicy";

export type PurchasePlatform = "android" | "ios" | "web" | "unknown";

export type GooglePlayMonetizationPolicy = {
    enabled: boolean;
    enforceAndroidDigitalPurchases: boolean;
    walletCheckoutEnabled: boolean;
    childRequestInvoicesEnabled: boolean;
    pointsPerCurrencyUnit: number;
    defaultCurrency: string;
    googlePlayMethodType: string;
};

export const DEFAULT_GOOGLE_PLAY_MONETIZATION_POLICY: GooglePlayMonetizationPolicy = {
    enabled: true,
    enforceAndroidDigitalPurchases: true,
    walletCheckoutEnabled: false,
    childRequestInvoicesEnabled: true,
    pointsPerCurrencyUnit: 10,
    defaultCurrency: "EGP",
    googlePlayMethodType: "google_pay",
};

function parseBoolean(value: unknown, fallback: boolean): boolean {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (normalized === "true") return true;
        if (normalized === "false") return false;
    }
    return fallback;
}

function normalizeCurrency(value: unknown): string {
    const raw = String(value || "").trim().toUpperCase();
    if (!/^[A-Z]{3,10}$/.test(raw)) return DEFAULT_GOOGLE_PLAY_MONETIZATION_POLICY.defaultCurrency;
    return raw;
}

function normalizeGooglePlayMethodType(value: unknown): string {
    const raw = String(value || "").trim().toLowerCase();
    if (!raw) return DEFAULT_GOOGLE_PLAY_MONETIZATION_POLICY.googlePlayMethodType;
    return raw;
}

export function normalizeGooglePlayMonetizationPolicy(raw: any): GooglePlayMonetizationPolicy {
    if (!raw || typeof raw !== "object") {
        return { ...DEFAULT_GOOGLE_PLAY_MONETIZATION_POLICY };
    }

    const parsedPoints = Number.parseInt(String(raw.pointsPerCurrencyUnit ?? ""), 10);

    return {
        enabled: parseBoolean(raw.enabled, DEFAULT_GOOGLE_PLAY_MONETIZATION_POLICY.enabled),
        enforceAndroidDigitalPurchases: parseBoolean(
            raw.enforceAndroidDigitalPurchases,
            DEFAULT_GOOGLE_PLAY_MONETIZATION_POLICY.enforceAndroidDigitalPurchases,
        ),
        walletCheckoutEnabled: parseBoolean(
            raw.walletCheckoutEnabled,
            DEFAULT_GOOGLE_PLAY_MONETIZATION_POLICY.walletCheckoutEnabled,
        ),
        childRequestInvoicesEnabled: parseBoolean(
            raw.childRequestInvoicesEnabled,
            DEFAULT_GOOGLE_PLAY_MONETIZATION_POLICY.childRequestInvoicesEnabled,
        ),
        pointsPerCurrencyUnit: Number.isFinite(parsedPoints)
            ? Math.min(100000, Math.max(1, Math.trunc(parsedPoints)))
            : DEFAULT_GOOGLE_PLAY_MONETIZATION_POLICY.pointsPerCurrencyUnit,
        defaultCurrency: normalizeCurrency(raw.defaultCurrency),
        googlePlayMethodType: normalizeGooglePlayMethodType(raw.googlePlayMethodType),
    };
}

export async function getGooglePlayMonetizationPolicy(db: any): Promise<GooglePlayMonetizationPolicy> {
    const rows = await db
        .select({ value: appSettings.value })
        .from(appSettings)
        .where(eq(appSettings.key, GOOGLE_PLAY_MONETIZATION_POLICY_KEY))
        .limit(1);

    if (!rows[0]?.value) return { ...DEFAULT_GOOGLE_PLAY_MONETIZATION_POLICY };

    try {
        const parsed = JSON.parse(rows[0].value);
        return normalizeGooglePlayMonetizationPolicy(parsed);
    } catch {
        return { ...DEFAULT_GOOGLE_PLAY_MONETIZATION_POLICY };
    }
}

export function resolveCheckoutPlatform(value: unknown): PurchasePlatform {
    const raw = String(value || "").trim().toLowerCase();
    if (raw === "android") return "android";
    if (raw === "ios") return "ios";
    if (raw === "web") return "web";
    return "unknown";
}

export function isDigitalProductType(productType: unknown): boolean {
    const type = String(productType || "").trim().toLowerCase();
    return type === "digital" || type === "subscription";
}

export function isGooglePlayPaymentMethodType(
    paymentMethodType: unknown,
    policy: Pick<GooglePlayMonetizationPolicy, "googlePlayMethodType"> = DEFAULT_GOOGLE_PLAY_MONETIZATION_POLICY,
): boolean {
    return String(paymentMethodType || "").trim().toLowerCase() === policy.googlePlayMethodType;
}

export function shouldEnforceGooglePlayForCheckout(input: {
    policy: GooglePlayMonetizationPolicy;
    platform: PurchasePlatform;
    hasDigitalItems: boolean;
}): boolean {
    return (
        input.policy.enabled
        && input.policy.enforceAndroidDigitalPurchases
        && input.platform === "android"
        && input.hasDigitalItems
    );
}
