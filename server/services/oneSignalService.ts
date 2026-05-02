import { storage } from "../storage";
import { getPaidServicesConfig } from "./paidServicesConfig";

type OneSignalResolvedConfig = {
  enabled: boolean;
  appId: string;
  restApiKey: string;
};

type OneSignalSendInput = {
  externalUserIds: string[];
  title: string;
  body: string;
  url?: string;
  data?: Record<string, any>;
};

const db = storage.db;
const ONESIGNAL_ENDPOINT = "https://onesignal.com/api/v1/notifications";
const CACHE_TTL_MS = 60_000;

let configCache: { value: OneSignalResolvedConfig; expiresAt: number } | null = null;

function toClean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function resolveOneSignalConfig(): Promise<OneSignalResolvedConfig> {
  const now = Date.now();
  if (configCache && configCache.expiresAt > now) {
    return configCache.value;
  }

  const paidConfig = await getPaidServicesConfig(db);
  const oneSignal = paidConfig.services.onesignal_push;

  const resolved: OneSignalResolvedConfig = {
    enabled: !!oneSignal?.enabled && oneSignal?.mode !== "disabled",
    appId: toClean(oneSignal?.settings?.appId),
    restApiKey: toClean(oneSignal?.settings?.restApiKey),
  };

  configCache = {
    value: resolved,
    expiresAt: now + CACHE_TTL_MS,
  };

  return resolved;
}

export async function isOneSignalReady(): Promise<boolean> {
  const cfg = await resolveOneSignalConfig();
  return cfg.enabled && cfg.appId.length > 0 && cfg.restApiKey.length > 0;
}

export async function sendOneSignalExternalUserNotification(input: OneSignalSendInput): Promise<void> {
  const cfg = await resolveOneSignalConfig();

  if (!cfg.enabled) return;
  if (!cfg.appId || !cfg.restApiKey) {
    throw new Error("ONESIGNAL_NOT_CONFIGURED");
  }

  const externalUserIds = (input.externalUserIds || []).map(toClean).filter(Boolean);
  if (externalUserIds.length === 0) {
    throw new Error("ONESIGNAL_RECIPIENT_MISSING");
  }

  const response = await fetch(ONESIGNAL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${cfg.restApiKey}`,
    },
    body: JSON.stringify({
      app_id: cfg.appId,
      include_external_user_ids: Array.from(new Set(externalUserIds)),
      channel_for_external_user_ids: "push",
      headings: { en: input.title || "New Notification", ar: input.title || "إشعار جديد" },
      contents: { en: input.body || "You have a new update", ar: input.body || "لديك تحديث جديد" },
      url: toClean(input.url) || undefined,
      data: input.data || {},
    }),
  });

  if (!response.ok) {
    const raw = await response.text();
    throw new Error(`ONESIGNAL_SEND_FAILED:${response.status}:${raw.slice(0, 300)}`);
  }
}
