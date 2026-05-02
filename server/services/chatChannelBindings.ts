import { eq } from "drizzle-orm";
import { siteSettings } from "../../shared/schema";
import { storage } from "../storage";

const db = storage.db;
const SETTINGS_KEY = "chat_channel_bindings_v1";

export type ChatBindingRole = "parent" | "child" | "teacher" | "school" | "admin";

export type ChatChannelBinding = {
  role: ChatBindingRole;
  userId: string;
  telegramChatId?: string;
  telegramEnabled?: boolean;
  whatsappNumber?: string;
  whatsappEnabled?: boolean;
  updatedAt: string;
};

type BindingsStore = {
  version: 1;
  bindings: Record<string, ChatChannelBinding>;
  updatedAt: string;
};

function nowIso() {
  return new Date().toISOString();
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function keyFor(role: ChatBindingRole, userId: string): string {
  return `${role}:${userId}`;
}

function defaultStore(): BindingsStore {
  return {
    version: 1,
    bindings: {},
    updatedAt: nowIso(),
  };
}

function sanitizeBinding(input: unknown, role: ChatBindingRole, userId: string): ChatChannelBinding {
  const source = (input && typeof input === "object" ? (input as Record<string, unknown>) : {}) || {};

  return {
    role,
    userId,
    telegramChatId: clean(source.telegramChatId) || undefined,
    telegramEnabled: source.telegramEnabled === true,
    whatsappNumber: clean(source.whatsappNumber) || undefined,
    whatsappEnabled: source.whatsappEnabled === true,
    updatedAt: nowIso(),
  };
}

export async function getChatChannelBindingsStore(): Promise<BindingsStore> {
  const rows = await db.select().from(siteSettings).where(eq(siteSettings.key, SETTINGS_KEY)).limit(1);
  const row = rows[0];
  if (!row?.value) return defaultStore();

  try {
    const parsed = JSON.parse(row.value) as Partial<BindingsStore>;
    const bindings = parsed?.bindings && typeof parsed.bindings === "object" ? parsed.bindings : {};

    return {
      version: 1,
      bindings: bindings as Record<string, ChatChannelBinding>,
      updatedAt: clean(parsed?.updatedAt) || nowIso(),
    };
  } catch {
    return defaultStore();
  }
}

export async function saveChatChannelBindingsStore(store: BindingsStore): Promise<void> {
  const value = JSON.stringify({
    version: 1,
    bindings: store.bindings || {},
    updatedAt: nowIso(),
  });

  await db
    .insert(siteSettings)
    .values({ key: SETTINGS_KEY, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value, updatedAt: new Date() },
    });
}

export async function getChatChannelBinding(role: ChatBindingRole, userId: string): Promise<ChatChannelBinding | null> {
  const store = await getChatChannelBindingsStore();
  const key = keyFor(role, userId);
  return store.bindings[key] || null;
}

export async function upsertChatChannelBinding(input: {
  role: ChatBindingRole;
  userId: string;
  telegramChatId?: string;
  telegramEnabled?: boolean;
  whatsappNumber?: string;
  whatsappEnabled?: boolean;
}): Promise<ChatChannelBinding> {
  const role = input.role;
  const userId = clean(input.userId);
  if (!userId) {
    throw new Error("CHAT_BINDING_USER_ID_REQUIRED");
  }

  const store = await getChatChannelBindingsStore();
  const key = keyFor(role, userId);
  const existing = store.bindings[key];

  const next = sanitizeBinding(
    {
      telegramChatId: input.telegramChatId,
      telegramEnabled: input.telegramEnabled,
      whatsappNumber: input.whatsappNumber,
      whatsappEnabled: input.whatsappEnabled,
    },
    role,
    userId,
  );

  store.bindings[key] = {
    ...existing,
    ...next,
    role,
    userId,
    updatedAt: nowIso(),
  };

  store.updatedAt = nowIso();
  await saveChatChannelBindingsStore(store);

  return store.bindings[key];
}

export async function listChatChannelBindings(filters?: {
  role?: ChatBindingRole;
  limit?: number;
}): Promise<ChatChannelBinding[]> {
  const store = await getChatChannelBindingsStore();
  const role = filters?.role;
  const limit = Math.max(1, Math.min(Number(filters?.limit || 200), 5000));

  const all = Object.values(store.bindings || {});
  const filtered = role ? all.filter((b) => b.role === role) : all;

  return filtered
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    .slice(0, limit);
}
