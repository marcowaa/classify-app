import { createHmac } from "node:crypto";
import { GoogleAuth } from "google-auth-library";
import { eq } from "drizzle-orm";
import { appSettings } from "../../../shared/schema";

const ANDROID_PUBLISHER_SCOPE = "https://www.googleapis.com/auth/androidpublisher";
const ANDROID_PUBLISHER_BASE_URL = "https://androidpublisher.googleapis.com/androidpublisher/v3";

export const GOOGLE_PLAY_WALLET_PRODUCTS_SETTING_KEY = "googlePlayWalletProducts";
const GOOGLE_PLAY_WALLET_PRODUCTS_ENV_KEY = "GOOGLE_PLAY_WALLET_PRODUCTS_JSON";

export type GooglePlayWalletProduct = {
    productId: string;
    walletAmount: number;
    currency: string;
    consumable: boolean;
    displayName?: string;
};

export type GooglePlayPurchaseVerification = {
    purchaseState: number;
    purchaseStateLabel: "purchased" | "canceled" | "pending" | "unknown";
    acknowledgementState: number;
    acknowledgementStateLabel: "acknowledged" | "not_acknowledged" | "unknown";
    consumptionState: number;
    consumptionStateLabel: "consumed" | "not_consumed" | "unknown";
    orderId: string;
    purchaseTimeMillis: string;
    quantity: number;
    obfuscatedExternalAccountId: string;
    rawPayload: Record<string, any>;
};

function normalizeCurrency(value: unknown): string {
    const raw = String(value || "").trim().toUpperCase();
    if (!raw) return "USD";
    if (!/^[A-Z]{3,10}$/.test(raw)) return "USD";
    return raw;
}

function normalizeProductsSource(raw: unknown): any[] {
    if (Array.isArray(raw)) return raw;

    if (raw && typeof raw === "object") {
        return Object.entries(raw as Record<string, any>).map(([productId, value]) => {
            if (value && typeof value === "object") {
                return {
                    ...(value as Record<string, any>),
                    productId: (value as Record<string, any>).productId || productId,
                };
            }
            return {
                productId,
                walletAmount: value,
            };
        });
    }

    return [];
}

function normalizeWalletProduct(raw: any): GooglePlayWalletProduct | null {
    const productId = String(raw?.productId || "").trim();
    const walletAmount = Number(raw?.walletAmount);

    if (!productId || !Number.isFinite(walletAmount) || walletAmount <= 0) {
        return null;
    }

    const displayNameRaw = String(raw?.displayName || "").trim();

    return {
        productId,
        walletAmount: Number(walletAmount.toFixed(2)),
        currency: normalizeCurrency(raw?.currency),
        consumable: raw?.consumable !== false,
        displayName: displayNameRaw || undefined,
    };
}

function parseProductsCatalog(rawJson: string): GooglePlayWalletProduct[] {
    if (!rawJson || !rawJson.trim()) return [];

    let parsed: unknown;
    try {
        parsed = JSON.parse(rawJson);
    } catch {
        return [];
    }

    const rows = normalizeProductsSource(parsed);
    const dedupe = new Map<string, GooglePlayWalletProduct>();

    for (const row of rows) {
        const normalized = normalizeWalletProduct(row);
        if (!normalized) continue;
        dedupe.set(normalized.productId, normalized);
    }

    return Array.from(dedupe.values()).sort((a, b) => a.walletAmount - b.walletAmount);
}

export async function getGooglePlayWalletProducts(db: any): Promise<GooglePlayWalletProduct[]> {
    const rows = await db
        .select({ value: appSettings.value })
        .from(appSettings)
        .where(eq(appSettings.key, GOOGLE_PLAY_WALLET_PRODUCTS_SETTING_KEY))
        .limit(1);

    const source = rows[0]?.value || process.env[GOOGLE_PLAY_WALLET_PRODUCTS_ENV_KEY] || "[]";
    return parseProductsCatalog(String(source || "[]"));
}

export function resolveGooglePlayPackageName(explicitPackageName?: string): string {
    const resolved = String(explicitPackageName || process.env.GOOGLE_PLAY_PACKAGE_NAME || "com.classi_fy.twa").trim();
    if (!resolved) {
        throw new Error("GOOGLE_PLAY_PACKAGE_NAME_MISSING");
    }
    return resolved;
}

export function buildGooglePlayObfuscatedAccountId(parentId: string): string {
    const secret = String(
        process.env.GOOGLE_PLAY_ACCOUNT_OBFUSCATION_SECRET
        || process.env.JWT_SECRET
        || "classify-google-play-obfuscation"
    );

    return createHmac("sha256", secret)
        .update(String(parentId || ""))
        .digest("hex");
}

function mapPurchaseState(purchaseState: number): GooglePlayPurchaseVerification["purchaseStateLabel"] {
    if (purchaseState === 0) return "purchased";
    if (purchaseState === 1) return "canceled";
    if (purchaseState === 2) return "pending";
    return "unknown";
}

function mapAcknowledgementState(state: number): GooglePlayPurchaseVerification["acknowledgementStateLabel"] {
    if (state === 1) return "acknowledged";
    if (state === 0) return "not_acknowledged";
    return "unknown";
}

function mapConsumptionState(state: number): GooglePlayPurchaseVerification["consumptionStateLabel"] {
    if (state === 1) return "consumed";
    if (state === 0) return "not_consumed";
    return "unknown";
}

function buildProductTokenPath(params: {
    packageName: string;
    productId: string;
    purchaseToken: string;
}): string {
    return [
        "/applications",
        encodeURIComponent(params.packageName),
        "/purchases/products",
        encodeURIComponent(params.productId),
        "/tokens",
        encodeURIComponent(params.purchaseToken),
    ].join("");
}

async function getAndroidPublisherAccessToken(): Promise<string> {
    const rawServiceAccount = String(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON || "").trim();
    let credentials: Record<string, unknown> | undefined;

    if (rawServiceAccount) {
        try {
            credentials = JSON.parse(rawServiceAccount);
        } catch {
            throw new Error("GOOGLE_PLAY_SERVICE_ACCOUNT_INVALID_JSON");
        }
    }

    const auth = new GoogleAuth({
        credentials,
        scopes: [ANDROID_PUBLISHER_SCOPE],
    });

    const client = await auth.getClient();
    const tokenResult = await client.getAccessToken();
    const token = typeof tokenResult === "string" ? tokenResult : tokenResult?.token;

    if (!token) {
        throw new Error("GOOGLE_PLAY_ACCESS_TOKEN_UNAVAILABLE");
    }

    return token;
}

async function androidPublisherFetch(path: string, init?: RequestInit): Promise<Response> {
    const accessToken = await getAndroidPublisherAccessToken();
    const headers: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
    };

    if (init?.headers) {
        Object.assign(headers, init.headers as Record<string, string>);
    }

    return fetch(`${ANDROID_PUBLISHER_BASE_URL}${path}`, {
        ...init,
        headers,
    });
}

async function readResponseBody(response: Response): Promise<string> {
    try {
        return (await response.text()) || "";
    } catch {
        return "";
    }
}

function isAlreadyProcessedStatus(status: number, body: string): boolean {
    if (status === 409 || status === 410) return true;
    const normalized = body.toLowerCase();
    return normalized.includes("already") && (normalized.includes("acknow") || normalized.includes("consum"));
}

export async function verifyGooglePlayProductPurchase(params: {
    packageName: string;
    productId: string;
    purchaseToken: string;
}): Promise<GooglePlayPurchaseVerification> {
    const path = buildProductTokenPath(params);
    const response = await androidPublisherFetch(path, { method: "GET" });

    if (!response.ok) {
        const body = await readResponseBody(response);
        throw new Error(`GOOGLE_PLAY_VERIFY_HTTP_${response.status}:${body}`);
    }

    const payload = (await response.json().catch(() => ({}))) as Record<string, any>;
    const purchaseState = Number(payload.purchaseState);
    const acknowledgementState = Number(payload.acknowledgementState);
    const consumptionState = Number(payload.consumptionState);
    const quantity = Number(payload.quantity || 1);

    return {
        purchaseState,
        purchaseStateLabel: mapPurchaseState(purchaseState),
        acknowledgementState,
        acknowledgementStateLabel: mapAcknowledgementState(acknowledgementState),
        consumptionState,
        consumptionStateLabel: mapConsumptionState(consumptionState),
        orderId: String(payload.orderId || "").trim(),
        purchaseTimeMillis: String(payload.purchaseTimeMillis || "").trim(),
        quantity: Number.isFinite(quantity) && quantity > 0 ? Math.trunc(quantity) : 1,
        obfuscatedExternalAccountId: String(payload.obfuscatedExternalAccountId || "").trim(),
        rawPayload: payload,
    };
}

export async function acknowledgeGooglePlayProductPurchase(params: {
    packageName: string;
    productId: string;
    purchaseToken: string;
    developerPayload?: string;
}): Promise<void> {
    const path = `${buildProductTokenPath(params)}:acknowledge`;
    const response = await androidPublisherFetch(path, {
        method: "POST",
        body: JSON.stringify({
            developerPayload: String(params.developerPayload || "classify-google-play-wallet-topup"),
        }),
    });

    if (response.ok) return;

    const body = await readResponseBody(response);
    if (isAlreadyProcessedStatus(response.status, body)) {
        return;
    }

    throw new Error(`GOOGLE_PLAY_ACK_HTTP_${response.status}:${body}`);
}

export async function consumeGooglePlayProductPurchase(params: {
    packageName: string;
    productId: string;
    purchaseToken: string;
}): Promise<void> {
    const path = `${buildProductTokenPath(params)}:consume`;
    const response = await androidPublisherFetch(path, {
        method: "POST",
        body: JSON.stringify({}),
    });

    if (response.ok) return;

    const body = await readResponseBody(response);
    if (isAlreadyProcessedStatus(response.status, body)) {
        return;
    }

    throw new Error(`GOOGLE_PLAY_CONSUME_HTTP_${response.status}:${body}`);
}
