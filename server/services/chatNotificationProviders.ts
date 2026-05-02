import { getPaidServicesConfig } from "./paidServicesConfig";
import { getChatChannelBinding, type ChatBindingRole } from "./chatChannelBindings";
import { storage } from "../storage";

type DispatchInput = {
  recipientType: ChatBindingRole;
  recipientId: string;
  title: string;
  body: string;
  url?: string;
  metadata?: Record<string, any>;
};

type ProviderResult = {
  provider: string;
  attempted: boolean;
  success: boolean;
  skippedReason?: string;
  error?: string;
};

export type DispatchResult = {
  results: ProviderResult[];
};

const db = storage.db;

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function audienceAllowed(audiences: any, recipientType: ChatBindingRole): boolean {
  const roleCfg = audiences?.[recipientType];
  if (!roleCfg || typeof roleCfg !== "object") return true;
  return roleCfg.enabled !== false;
}

async function sendTelegram(input: DispatchInput, telegramConfig: any): Promise<ProviderResult> {
  const enabled = toBoolean(telegramConfig?.enabled, false);
  const mode = clean(telegramConfig?.mode);
  const settings = telegramConfig?.settings || {};
  const audiences = telegramConfig?.audiences || {};

  if (!enabled || mode === "disabled") {
    return { provider: "telegram", attempted: false, success: false, skippedReason: "TELEGRAM_DISABLED" };
  }

  if (!audienceAllowed(audiences, input.recipientType)) {
    return { provider: "telegram", attempted: false, success: false, skippedReason: "TELEGRAM_ROLE_DISABLED" };
  }

  const botToken = clean(settings.botToken);
  if (!botToken) {
    return { provider: "telegram", attempted: false, success: false, skippedReason: "TELEGRAM_TOKEN_MISSING" };
  }

  const binding = await getChatChannelBinding(input.recipientType, input.recipientId);
  const chatId = clean(binding?.telegramChatId);
  const userEnabled = binding?.telegramEnabled === true;

  if (!chatId) {
    return { provider: "telegram", attempted: false, success: false, skippedReason: "TELEGRAM_CHAT_ID_MISSING" };
  }

  if (!userEnabled) {
    return { provider: "telegram", attempted: false, success: false, skippedReason: "TELEGRAM_USER_DISABLED" };
  }

  const endpoint = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const text = [input.title, input.body, input.url ? `\n${input.url}` : ""].filter(Boolean).join("\n");

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      const raw = await response.text();
      return {
        provider: "telegram",
        attempted: true,
        success: false,
        error: `TELEGRAM_SEND_FAILED:${response.status}:${raw.slice(0, 200)}`,
      };
    }

    return { provider: "telegram", attempted: true, success: true };
  } catch (error: any) {
    return {
      provider: "telegram",
      attempted: true,
      success: false,
      error: error?.message || "TELEGRAM_SEND_EXCEPTION",
    };
  }
}

async function sendApprise(input: DispatchInput, appriseConfig: any): Promise<ProviderResult> {
  const enabled = toBoolean(appriseConfig?.enabled, false);
  const mode = clean(appriseConfig?.mode);
  const settings = appriseConfig?.settings || {};
  const audiences = appriseConfig?.audiences || {};

  if (!enabled || mode === "disabled") {
    return { provider: "apprise", attempted: false, success: false, skippedReason: "APPRISE_DISABLED" };
  }

  if (!audienceAllowed(audiences, input.recipientType)) {
    return { provider: "apprise", attempted: false, success: false, skippedReason: "APPRISE_ROLE_DISABLED" };
  }

  const baseUrl = clean(settings.baseUrl).replace(/\/+$/, "");
  const key = clean(settings.key) || "apprise";
  const bearerToken = clean(settings.bearerToken);
  const roleTagPrefix = clean(settings.roleTagPrefix) || "role";
  const userTagPrefix = clean(settings.userTagPrefix) || "user";

  if (!baseUrl) {
    return { provider: "apprise", attempted: false, success: false, skippedReason: "APPRISE_BASE_URL_MISSING" };
  }

  const endpoint = `${baseUrl}/notify/${encodeURIComponent(key)}`;

  const payload: Record<string, any> = {
    title: input.title,
    body: input.body,
    format: "text",
    type: "info",
    tag: `${roleTagPrefix}:${input.recipientType},${userTagPrefix}:${input.recipientType}:${input.recipientId}`,
  };

  if (input.url) {
    payload.body = `${input.body}\n${input.url}`;
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const raw = await response.text();
      return {
        provider: "apprise",
        attempted: true,
        success: false,
        error: `APPRISE_SEND_FAILED:${response.status}:${raw.slice(0, 200)}`,
      };
    }

    return { provider: "apprise", attempted: true, success: true };
  } catch (error: any) {
    return {
      provider: "apprise",
      attempted: true,
      success: false,
      error: error?.message || "APPRISE_SEND_EXCEPTION",
    };
  }
}

export async function dispatchChatNotifications(input: DispatchInput): Promise<DispatchResult> {
  const paidConfig = await getPaidServicesConfig(db);

  const telegramCfg = paidConfig.services?.telegram_bot;
  const appriseCfg = paidConfig.services?.apprise_router;

  const results = await Promise.all([
    sendTelegram(input, telegramCfg),
    sendApprise(input, appriseCfg),
  ]);

  return { results };
}
