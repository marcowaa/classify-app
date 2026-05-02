export type SessionChannel = "child" | "parent" | "family-pin" | "none";

type StorageLike = {
  getItem: (key: string) => string | null;
};

function hasValue(storage: StorageLike, key: string): boolean {
  const value = String(storage.getItem(key) || "").trim();
  return value.length > 0;
}

export function resolveSessionChannel(storage: StorageLike): SessionChannel {
  if (hasValue(storage, "childToken")) return "child";
  if (hasValue(storage, "token")) return "parent";
  if (hasValue(storage, "familyCode")) return "family-pin";
  return "none";
}

export function resolveBrowserSessionChannel(): SessionChannel {
  if (typeof window === "undefined" || !window.localStorage) return "none";
  return resolveSessionChannel(window.localStorage);
}
