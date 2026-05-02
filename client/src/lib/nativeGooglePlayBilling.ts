type NativeGooglePlayBillingPlugin = {
    isReady?: () => Promise<{ ready: boolean }>;
    queryProducts: (options: { productIds: string[] }) => Promise<{ products?: NativeGooglePlayProduct[] }>;
    purchaseProduct: (options: {
        productId: string;
        accountObfuscationId?: string;
    }) => Promise<NativeGooglePlayPurchaseResult>;
};

export type NativeGooglePlayProduct = {
    productId: string;
    title?: string;
    description?: string;
    formattedPrice?: string;
    priceCurrencyCode?: string;
    priceAmountMicros?: number;
};

export type NativeGooglePlayPurchaseResult = {
    productId: string;
    purchaseToken: string;
    orderId?: string;
    purchaseState?: number;
    isAcknowledged?: boolean;
    packageName?: string;
    purchaseTime?: string;
    originalJson?: string;
    signature?: string;
};

function getNativeGooglePlayBillingPlugin(): NativeGooglePlayBillingPlugin | null {
    const capacitor = (window as any)?.Capacitor;
    if (!capacitor?.isNativePlatform?.()) return null;
    if (capacitor?.getPlatform?.() !== "android") return null;

    const plugin = capacitor?.Plugins?.GooglePlayBilling;
    if (!plugin || typeof plugin.purchaseProduct !== "function" || typeof plugin.queryProducts !== "function") {
        return null;
    }

    return plugin as NativeGooglePlayBillingPlugin;
}

export function isNativeAndroidGooglePlayBillingAvailable(): boolean {
    return Boolean(getNativeGooglePlayBillingPlugin());
}

export async function queryNativeGooglePlayProducts(productIds: string[]): Promise<NativeGooglePlayProduct[]> {
    const plugin = getNativeGooglePlayBillingPlugin();
    if (!plugin) {
        throw new Error("Google Play Billing plugin is not available on this device");
    }

    const uniqueProductIds = Array.from(new Set(
        productIds
            .map((item) => String(item || "").trim())
            .filter(Boolean)
    ));

    if (uniqueProductIds.length === 0) {
        return [];
    }

    if (typeof plugin.isReady === "function") {
        await plugin.isReady();
    }

    const response = await plugin.queryProducts({ productIds: uniqueProductIds });
    return Array.isArray(response?.products) ? response.products : [];
}

export async function launchNativeGooglePlayPurchase(input: {
    productId: string;
    accountObfuscationId?: string;
}): Promise<NativeGooglePlayPurchaseResult> {
    const plugin = getNativeGooglePlayBillingPlugin();
    if (!plugin) {
        throw new Error("Google Play Billing plugin is not available on this device");
    }

    const productId = String(input.productId || "").trim();
    if (!productId) {
        throw new Error("productId is required");
    }

    if (typeof plugin.isReady === "function") {
        await plugin.isReady();
    }

    const result = await plugin.purchaseProduct({
        productId,
        accountObfuscationId: String(input.accountObfuscationId || "").trim() || undefined,
    });

    if (!result?.purchaseToken) {
        throw new Error("Purchase token is missing from Google Play purchase result");
    }

    return result;
}
