import { eq } from "drizzle-orm";
import { siteSettings } from "../../shared/schema";

export type PaidServiceId =
  | "ably_realtime"
  | "pusher_channels"
  | "onesignal_push"
  | "openai_assistant"
  | "telegram_bot"
  | "apprise_router";

export type PaidServiceAudienceRole = "parent" | "child" | "teacher" | "school" | "admin";

export type PaidServiceAudiencePolicy = {
  enabled: boolean;
  visibleToUser: boolean;
};

export type PaidServiceMode = "disabled" | "trial" | "active";

type FieldType = "text" | "secret";

type ServiceField = {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
};

type ServiceCatalogItem = {
  id: PaidServiceId;
  label: string;
  description: string;
  status: "commented" | "ready";
  fields: ServiceField[];
};

export type PaidServiceConfigEntry = {
  id: PaidServiceId;
  label: string;
  description: string;
  provider: string;
  enabled: boolean;
  mode: PaidServiceMode;
  status: "commented" | "ready";
  fields: ServiceField[];
  settings: Record<string, string>;
  audiences: Record<PaidServiceAudienceRole, PaidServiceAudiencePolicy>;
};

export type PaidServicesConfig = {
  version: 1;
  services: Record<PaidServiceId, PaidServiceConfigEntry>;
  updatedAt: string;
};

export type AdminPaidServicesView = {
  version: 1;
  services: Record<PaidServiceId, PaidServiceConfigEntry & { secretConfigured: Record<string, boolean> }>;
  updatedAt: string;
};

export type PublicPaidServicesView = {
  version: 1;
  services: Record<
    PaidServiceId,
    {
      id: PaidServiceId;
      label: string;
      description: string;
      provider: string;
      enabled: boolean;
      mode: PaidServiceMode;
      status: "commented" | "ready";
      settings: Record<string, string>;
      audiences: Record<PaidServiceAudienceRole, PaidServiceAudiencePolicy>;
    }
  >;
  updatedAt: string;
};

const SETTINGS_KEY = "paid_services_config_v1";

const AUDIENCE_ROLES: PaidServiceAudienceRole[] = ["parent", "child", "teacher", "school", "admin"];

function defaultAudiences(): Record<PaidServiceAudienceRole, PaidServiceAudiencePolicy> {
  return {
    parent: { enabled: true, visibleToUser: true },
    child: { enabled: true, visibleToUser: true },
    teacher: { enabled: true, visibleToUser: true },
    school: { enabled: true, visibleToUser: true },
    admin: { enabled: true, visibleToUser: false },
  };
}

const CATALOG: ServiceCatalogItem[] = [
  {
    id: "ably_realtime",
    label: "Ably Realtime",
    description: "Managed realtime channels for chat/events with scale-ready fanout.",
    status: "commented",
    fields: [
      { key: "apiKey", label: "API Key", type: "secret", placeholder: "ably api key" },
      { key: "channelNamespace", label: "Channel Namespace", type: "text", placeholder: "classify" },
      { key: "fallbackTransport", label: "Fallback Transport", type: "text", placeholder: "websocket" },
    ],
  },
  {
    id: "pusher_channels",
    label: "Pusher Channels",
    description: "Hosted pub/sub channels for notifications and realtime activity feeds.",
    status: "commented",
    fields: [
      { key: "appId", label: "App ID", type: "text", placeholder: "pusher app id" },
      { key: "key", label: "Key", type: "secret", placeholder: "pusher key" },
      { key: "secret", label: "Secret", type: "secret", placeholder: "pusher secret" },
      { key: "cluster", label: "Cluster", type: "text", placeholder: "eu" },
    ],
  },
  {
    id: "onesignal_push",
    label: "OneSignal",
    description: "Cross-platform push campaigns and delivery analytics.",
    status: "commented",
    fields: [
      { key: "appId", label: "App ID", type: "text", placeholder: "onesignal app id" },
      { key: "restApiKey", label: "REST API Key", type: "secret", placeholder: "onesignal rest api key" },
    ],
  },
  {
    id: "openai_assistant",
    label: "OpenAI / Azure OpenAI",
    description: "AI-assisted smart replies and moderation workflows.",
    status: "commented",
    fields: [
      { key: "endpoint", label: "Endpoint", type: "text", placeholder: "https://..." },
      { key: "apiKey", label: "API Key", type: "secret", placeholder: "openai api key" },
      { key: "model", label: "Model", type: "text", placeholder: "gpt-4o-mini" },
    ],
  },
  {
    id: "telegram_bot",
    label: "Telegram Bot",
    description: "Free bot-based notifications to Telegram chats per account binding.",
    status: "ready",
    fields: [
      { key: "botToken", label: "Bot Token", type: "secret", placeholder: "telegram bot token" },
      { key: "parseMode", label: "Parse Mode", type: "text", placeholder: "Markdown" },
    ],
  },
  {
    id: "apprise_router",
    label: "Apprise Router",
    description: "Self-hosted fan-out gateway for popular chat apps and notification channels.",
    status: "ready",
    fields: [
      { key: "baseUrl", label: "Base URL", type: "text", placeholder: "http://apprise-api:8000" },
      { key: "key", label: "Config Key", type: "text", placeholder: "apprise" },
      { key: "bearerToken", label: "Bearer Token", type: "secret", placeholder: "optional bearer token" },
      { key: "roleTagPrefix", label: "Role Tag Prefix", type: "text", placeholder: "role" },
      { key: "userTagPrefix", label: "User Tag Prefix", type: "text", placeholder: "user" },
    ],
  },
];

function nowIso() {
  return new Date().toISOString();
}

function buildDefaultConfig(): PaidServicesConfig {
  const services = CATALOG.reduce((acc, item) => {
    const settings = item.fields.reduce((settingsAcc, field) => {
      settingsAcc[field.key] = "";
      return settingsAcc;
    }, {} as Record<string, string>);

    acc[item.id] = {
      id: item.id,
      label: item.label,
      description: item.description,
      provider: item.id,
      enabled: false,
      mode: "disabled",
      status: item.status,
      fields: item.fields,
      settings,
      audiences: defaultAudiences(),
    };
    return acc;
  }, {} as Record<PaidServiceId, PaidServiceConfigEntry>);

  return {
    version: 1,
    services,
    updatedAt: nowIso(),
  };
}

function sanitizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeMode(value: unknown): PaidServiceMode {
  if (value === "trial" || value === "active") return value;
  return "disabled";
}

function mergeServiceEntry(
  base: PaidServiceConfigEntry,
  input: unknown,
  keepSecretFrom?: PaidServiceConfigEntry,
): PaidServiceConfigEntry {
  const source = (input && typeof input === "object" ? (input as Record<string, unknown>) : {}) || {};
  const inputSettings =
    source.settings && typeof source.settings === "object" ? (source.settings as Record<string, unknown>) : {};

  const settings = base.fields.reduce((acc, field) => {
    const nextRaw = sanitizeString(inputSettings[field.key]);
    const baseRaw = sanitizeString(base.settings[field.key]);
    const keepRaw = sanitizeString(keepSecretFrom?.settings?.[field.key]);

    if (field.type === "secret") {
      acc[field.key] = nextRaw || keepRaw || baseRaw;
    } else {
      acc[field.key] = nextRaw || baseRaw;
    }
    return acc;
  }, {} as Record<string, string>);

  const inputAudiences =
    source.audiences && typeof source.audiences === "object"
      ? (source.audiences as Record<string, unknown>)
      : {};

  const audiences = AUDIENCE_ROLES.reduce((acc, role) => {
    const raw = inputAudiences[role];
    const prev = keepSecretFrom?.audiences?.[role] || base.audiences[role] || { enabled: true, visibleToUser: true };
    const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

    acc[role] = {
      enabled: typeof src.enabled === "boolean" ? src.enabled : prev.enabled,
      visibleToUser: typeof src.visibleToUser === "boolean" ? src.visibleToUser : prev.visibleToUser,
    };
    return acc;
  }, {} as Record<PaidServiceAudienceRole, PaidServiceAudiencePolicy>);

  return {
    ...base,
    provider: sanitizeString(source.provider) || base.provider,
    enabled: source.enabled === true,
    mode: sanitizeMode(source.mode),
    settings,
    audiences,
  };
}

export async function getPaidServicesConfig(db: any): Promise<PaidServicesConfig> {
  const defaults = buildDefaultConfig();

  const rows = await db.select().from(siteSettings).where(eq(siteSettings.key, SETTINGS_KEY)).limit(1);
  const row = rows[0];
  if (!row?.value) return defaults;

  try {
    const parsed = JSON.parse(row.value) as Partial<PaidServicesConfig>;
    const merged = { ...defaults, ...(parsed || {}) } as PaidServicesConfig;
    const services = { ...defaults.services } as Record<PaidServiceId, PaidServiceConfigEntry>;

    for (const catalogItem of CATALOG) {
      const id = catalogItem.id;
      services[id] = mergeServiceEntry(defaults.services[id], parsed?.services?.[id]);
    }

    return {
      version: 1,
      services,
      updatedAt: sanitizeString(merged.updatedAt) || defaults.updatedAt,
    };
  } catch {
    return defaults;
  }
}

export async function savePaidServicesConfig(db: any, input: unknown): Promise<PaidServicesConfig> {
  const existing = await getPaidServicesConfig(db);
  const defaults = buildDefaultConfig();
  const source = (input && typeof input === "object" ? (input as Record<string, unknown>) : {}) || {};
  const sourceServices =
    source.services && typeof source.services === "object"
      ? (source.services as Record<string, unknown>)
      : {};

  const services = { ...defaults.services } as Record<PaidServiceId, PaidServiceConfigEntry>;

  for (const item of CATALOG) {
    services[item.id] = mergeServiceEntry(defaults.services[item.id], sourceServices[item.id], existing.services[item.id]);
  }

  const nextConfig: PaidServicesConfig = {
    version: 1,
    services,
    updatedAt: nowIso(),
  };

  await db
    .insert(siteSettings)
    .values({ key: SETTINGS_KEY, value: JSON.stringify(nextConfig), updatedAt: new Date() })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value: JSON.stringify(nextConfig), updatedAt: new Date() },
    });

  return nextConfig;
}

export function toAdminPaidServicesView(config: PaidServicesConfig): AdminPaidServicesView {
  const services = {} as AdminPaidServicesView["services"];

  for (const item of CATALOG) {
    const entry = config.services[item.id];
    const secretConfigured: Record<string, boolean> = {};
    const settings: Record<string, string> = {};

    for (const field of item.fields) {
      const raw = sanitizeString(entry.settings[field.key]);
      if (field.type === "secret") {
        secretConfigured[field.key] = raw.length > 0;
        settings[field.key] = "";
      } else {
        settings[field.key] = raw;
      }
    }

    services[item.id] = {
      ...entry,
      settings,
      secretConfigured,
      audiences: { ...entry.audiences },
    };
  }

  return {
    version: 1,
    services,
    updatedAt: config.updatedAt,
  };
}

export function toPublicPaidServicesView(config: PaidServicesConfig): PublicPaidServicesView {
  const services = {} as PublicPaidServicesView["services"];

  for (const item of CATALOG) {
    const entry = config.services[item.id];
    const settings: Record<string, string> = {};

    for (const field of item.fields) {
      if (field.type !== "secret") {
        settings[field.key] = sanitizeString(entry.settings[field.key]);
      }
    }

    services[item.id] = {
      id: entry.id,
      label: entry.label,
      description: entry.description,
      provider: entry.provider,
      enabled: entry.enabled,
      mode: entry.mode,
      status: entry.status,
      settings,
      audiences: { ...entry.audiences },
    };
  }

  return {
    version: 1,
    services,
    updatedAt: config.updatedAt,
  };
}
