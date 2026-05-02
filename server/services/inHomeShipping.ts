type InHomeOrderItem = {
  productId: string;
  productName: string;
  productImage?: string;
  quantity: number;
  price: string;
  total: string;
};

type InHomeShippingAddress = {
  name?: string;
  line1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
};

export type InHomeCheckoutPayload = {
  purchaseId: string;
  parentId: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: InHomeShippingAddress;
  items: InHomeOrderItem[];
  total: string;
  sourceChannel: "parents" | "libraries" | "mixed";
};

export type SuggestedShippingProvider = {
  id: string;
  key: string;
  enabled: boolean;
  recommended: boolean;
  supports: Array<"parents" | "libraries">;
  labelAr: string;
  labelEn: string;
  descriptionAr: string;
  descriptionEn: string;
};

export type InHomeShippingConfig = {
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  timeoutMs: number;
  webhookSecret: string;
};

export type InHomeSyncResult = {
  ok: boolean;
  status?: number;
  message: string;
  orderId?: string;
  trackingCode?: string;
};

export type InHomeConfigValidationResult = {
  ok: boolean;
  message: string;
};

const DEFAULT_TIMEOUT_MS = 5000;

function toBoolean(value?: string): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function getTimeoutMs(): number {
  const raw = Number(process.env.INHOME_SHIPPING_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_TIMEOUT_MS;
  return raw;
}

function getBaseUrl(): string {
  return (process.env.INHOME_SHIPPING_BASE_URL || "").trim().replace(/\/$/, "");
}

function getApiKey(): string {
  return (process.env.INHOME_SHIPPING_API_KEY || "").trim();
}

function getWebhookSecret(): string {
  return (process.env.INHOME_SHIPPING_WEBHOOK_SECRET || "").trim();
}

function clampTimeoutMs(value: unknown): number {
  const raw = Number(value);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_TIMEOUT_MS;
  return Math.min(Math.max(Math.trunc(raw), 500), 30000);
}

function normalizeBaseUrl(value?: string): string {
  return (value || "").trim().replace(/\/$/, "");
}

function parseBaseUrl(baseUrl: string): URL | null {
  try {
    return new URL(baseUrl);
  } catch {
    return null;
  }
}

function isPrivateOrLocalHost(hostname: string): boolean {
  const host = (hostname || "").toLowerCase();
  if (!host) return true;

  if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
    return true;
  }

  if (host.startsWith("10.")) return true;
  if (host.startsWith("192.168.")) return true;
  if (host.startsWith("127.")) return true;

  const match172 = host.match(/^172\.(\d{1,3})\./);
  if (match172) {
    const secondOctet = Number(match172[1]);
    if (Number.isFinite(secondOctet) && secondOctet >= 16 && secondOctet <= 31) {
      return true;
    }
  }

  return false;
}

export function validateInHomeConnectorIsolation(
  configOverride?: Partial<InHomeShippingConfig> | null,
): InHomeConfigValidationResult {
  const config = resolveInHomeShippingConfig(configOverride);

  if (!config.enabled) {
    return { ok: true, message: "Connector is disabled" };
  }

  if (!config.baseUrl || !config.apiKey) {
    return { ok: false, message: "Missing base URL or API key" };
  }

  const parsed = parseBaseUrl(config.baseUrl);
  if (!parsed) {
    return { ok: false, message: "baseUrl must be a valid absolute URL" };
  }

  const isProd = process.env.NODE_ENV === "production";
  const allowPrivateHosts = toBoolean(process.env.INHOME_ALLOW_PRIVATE_HOSTS);

  if (isProd && parsed.protocol !== "https:") {
    return {
      ok: false,
      message: "in-home baseUrl must use HTTPS in production",
    };
  }

  if (isProd && !allowPrivateHosts && isPrivateOrLocalHost(parsed.hostname)) {
    return {
      ok: false,
      message: "in-home baseUrl cannot point to localhost/private network in production",
    };
  }

  return { ok: true, message: "Connector configuration is valid" };
}

export function resolveInHomeShippingConfig(
  override?: Partial<InHomeShippingConfig> | null,
): InHomeShippingConfig {
  return {
    enabled: override?.enabled ?? isInHomeShippingEnabled(),
    baseUrl: normalizeBaseUrl(override?.baseUrl ?? getBaseUrl()),
    apiKey: ((override?.apiKey ?? getApiKey()) || "").trim(),
    timeoutMs: clampTimeoutMs(override?.timeoutMs ?? getTimeoutMs()),
    webhookSecret: ((override?.webhookSecret ?? getWebhookSecret()) || "").trim(),
  };
}

export function sanitizeInHomeShippingConfig(config: InHomeShippingConfig) {
  return {
    ...config,
    apiKeyMasked: config.apiKey ? `${config.apiKey.slice(0, 4)}***${config.apiKey.slice(-2)}` : "",
    apiKey: "",
    webhookSecretMasked: config.webhookSecret
      ? `${config.webhookSecret.slice(0, 3)}***${config.webhookSecret.slice(-2)}`
      : "",
    webhookSecret: "",
  };
}

export function upsertMaskedSecret(nextValue: unknown, currentValue: string): string {
  const value = typeof nextValue === "string" ? nextValue.trim() : "";
  if (!value) return "";
  if (value.includes("***")) return currentValue;
  return value;
}

export function normalizeInHomeShippingInput(input: any, current: InHomeShippingConfig): InHomeShippingConfig {
  return {
    enabled: typeof input?.enabled === "boolean" ? input.enabled : current.enabled,
    baseUrl: normalizeBaseUrl(typeof input?.baseUrl === "string" ? input.baseUrl : current.baseUrl),
    apiKey: upsertMaskedSecret(input?.apiKey, current.apiKey),
    timeoutMs: clampTimeoutMs(input?.timeoutMs ?? current.timeoutMs),
    webhookSecret: upsertMaskedSecret(input?.webhookSecret, current.webhookSecret),
  };
}

export function isInHomeShippingEnabled(): boolean {
  return toBoolean(process.env.INHOME_SHIPPING_ENABLED);
}

export function getSuggestedShippingProviders(
  configOverride?: Partial<InHomeShippingConfig> | null,
): SuggestedShippingProvider[] {
  const config = resolveInHomeShippingConfig(configOverride);
  return [
    {
      id: "in-home-shipping",
      key: "in_home",
      enabled: config.enabled,
      recommended: true,
      supports: ["parents", "libraries"],
      labelAr: "in-home للشحن",
      labelEn: "in-home Delivery",
      descriptionAr: "خيار شحن مقترح للأهالي والمكتبات مع تتبع سريع.",
      descriptionEn: "Suggested shipping provider for parents and libraries with fast tracking.",
    },
  ];
}

function formatAddress(address: InHomeShippingAddress): string {
  const parts = [address.line1, address.state, address.city, address.postalCode, address.country]
    .map((p) => (p || "").trim())
    .filter(Boolean);
  return parts.join(" - ");
}

export async function testInHomeShippingConnection(
  configOverride?: Partial<InHomeShippingConfig> | null,
): Promise<InHomeSyncResult> {
  const config = resolveInHomeShippingConfig(configOverride);
  if (!config.enabled) {
    return { ok: false, message: "Connector is disabled" };
  }
  const validation = validateInHomeConnectorIsolation(config);
  if (!validation.ok) {
    return { ok: false, message: validation.message };
  }

  const endpoint = `${config.baseUrl}/api/v1/orders`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const probe = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": config.apiKey,
      },
      body: JSON.stringify({
        customerName: "Classify Probe",
        customerPhone: "0000000000",
        customerAddress: "Connectivity test",
        customerCity: "NA",
        customerNotes: "connectivity_probe",
        items: [{
          productId: "probe",
          productName: "Probe",
          quantity: 0,
          price: "0.00",
          total: "0.00",
        }],
        total: "0.00",
        subtotal: "0.00",
      }),
      signal: controller.signal,
    });

    const body = await probe.text().catch(() => "");
    if (probe.ok) {
      return {
        ok: true,
        status: probe.status,
        message: "Connected successfully",
      };
    }

    const acceptableProbeStatus = [400, 422].includes(probe.status);
    return {
      ok: acceptableProbeStatus,
      status: probe.status,
      message: acceptableProbeStatus
        ? "Connected (validation response from in-home)"
        : (body || "Unexpected in-home response"),
    };
  } catch (error: any) {
    const reason = error?.name === "AbortError" ? "Connection timeout" : (error?.message || "Unknown error");
    return { ok: false, message: reason };
  } finally {
    clearTimeout(timeout);
  }
}

export async function syncCheckoutToInHome(
  payload: InHomeCheckoutPayload,
  configOverride?: Partial<InHomeShippingConfig> | null,
): Promise<InHomeSyncResult> {
  const config = resolveInHomeShippingConfig(configOverride);
  if (!config.enabled) {
    return { ok: false, message: "Connector disabled" };
  }

  const validation = validateInHomeConnectorIsolation(config);
  if (!validation.ok) {
    console.warn(`[in-home-shipping] Invalid connector config: ${validation.message}`);
    return { ok: false, message: validation.message };
  }

  const baseUrl = config.baseUrl;
  const apiKey = config.apiKey;
  if (!baseUrl || !apiKey) {
    console.warn("[in-home-shipping] Connector enabled but missing INHOME_SHIPPING_BASE_URL or INHOME_SHIPPING_API_KEY");
    return { ok: false, message: "Missing connector configuration" };
  }

  const endpoint = `${baseUrl}/api/v1/orders`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  const customerName = payload.customerName?.trim() || payload.shippingAddress?.name?.trim() || "Classify Parent";
  const customerPhone = payload.customerPhone?.trim() || "0000000000";
  const addressText = formatAddress(payload.shippingAddress);

  const requestBody = {
    customerName,
    customerPhone,
    customerAddress: addressText || "Address not specified",
    customerCity: payload.shippingAddress?.city || "",
    customerNotes: `Source: classify_store | channel: ${payload.sourceChannel} | purchaseId: ${payload.purchaseId} | parentId: ${payload.parentId}`,
    items: payload.items,
    total: payload.total,
    subtotal: payload.total,
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.warn(`[in-home-shipping] Sync failed (${response.status}): ${errText}`);
      return {
        ok: false,
        status: response.status,
        message: errText || "in-home request failed",
      };
    }

    const result = await response.json().catch(() => ({}));
    console.info("[in-home-shipping] Checkout synced", {
      purchaseId: payload.purchaseId,
      inHomeOrderId: result?.order?.id,
      trackingCode: result?.order?.trackingCode,
    });
    return {
      ok: true,
      status: response.status,
      message: "Checkout synced",
      orderId: result?.order?.id,
      trackingCode: result?.order?.trackingCode,
    };
  } catch (error: any) {
    const reason = error?.name === "AbortError" ? "timeout" : (error?.message || "unknown");
    console.warn(`[in-home-shipping] Sync error: ${reason}`);
    return {
      ok: false,
      message: reason,
    };
  } finally {
    clearTimeout(timeout);
  }
}
