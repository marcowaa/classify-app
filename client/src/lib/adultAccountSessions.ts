export type AdultAccountRole = "parent" | "school" | "teacher" | "library";

type RoleConfig = {
  tokenKey: string;
  dataKey: string | null;
  dashboardPath: string;
};

export type CachedAdultAccount = {
  id: string;
  role: AdultAccountRole;
  token: string;
  displayName: string;
  accountId: string;
  dashboardPath: string;
  tokenKey: string;
  dataKey: string | null;
  dataValue: string | null;
  updatedAt: string;
};

const CACHE_KEY = "classify_cached_adult_accounts_v1";
const MAX_CACHED_ACCOUNTS = 12;

const ROLE_CONFIG: Record<AdultAccountRole, RoleConfig> = {
  parent: { tokenKey: "token", dataKey: null, dashboardPath: "/parent-dashboard" },
  school: { tokenKey: "schoolToken", dataKey: "schoolData", dashboardPath: "/school/dashboard" },
  teacher: { tokenKey: "teacherToken", dataKey: "teacherData", dashboardPath: "/teacher/dashboard" },
  library: { tokenKey: "libraryToken", dataKey: "libraryData", dashboardPath: "/library/dashboard" },
};

function safeParseCache(raw: string | null): CachedAdultAccount[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => {
      if (!item || typeof item !== "object") return false;
      return (
        typeof item.id === "string" &&
        typeof item.role === "string" &&
        typeof item.token === "string" &&
        typeof item.displayName === "string" &&
        typeof item.accountId === "string" &&
        typeof item.dashboardPath === "string" &&
        typeof item.tokenKey === "string"
      );
    }) as CachedAdultAccount[];
  } catch {
    return [];
  }
}

function saveCache(entries: CachedAdultAccount[]): void {
  const sorted = [...entries]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, MAX_CACHED_ACCOUNTS);
  localStorage.setItem(CACHE_KEY, JSON.stringify(sorted));
}

function buildFallbackId(token: string): string {
  if (!token) return Date.now().toString();
  return token.slice(-16);
}

function normalizeDisplayName(value: unknown, accountId: string): string {
  const text = String(value || "").trim();
  if (text) return text;
  return accountId || "-";
}

function clearActiveAdultSessions(): void {
  localStorage.removeItem("token");
  localStorage.removeItem("userId");
  localStorage.removeItem("parentAccountClassification");

  localStorage.removeItem("schoolToken");
  localStorage.removeItem("schoolData");

  localStorage.removeItem("teacherToken");
  localStorage.removeItem("teacherData");

  localStorage.removeItem("libraryToken");
  localStorage.removeItem("libraryData");

  localStorage.removeItem("childToken");
  localStorage.removeItem("childId");
  localStorage.removeItem("childAccountClassification");
}

function normalizeDashboardPath(pathValue: unknown, role: AdultAccountRole): string {
  const fallback = ROLE_CONFIG[role].dashboardPath;
  const candidate = String(pathValue || "").trim();
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\")) {
    return fallback;
  }

  const rolePaths = Object.values(ROLE_CONFIG).map((entry) => entry.dashboardPath);
  if (!rolePaths.includes(candidate)) {
    return fallback;
  }

  return candidate;
}

export function getCachedAdultAccounts(): CachedAdultAccount[] {
  const raw = localStorage.getItem(CACHE_KEY);
  return safeParseCache(raw);
}

export function cacheAdultAccountSession(params: {
  role: AdultAccountRole;
  token: string;
  accountId?: string | number | null;
  displayName?: string | null;
  dataValue?: string | null;
}): void {
  const roleConfig = ROLE_CONFIG[params.role];
  const token = String(params.token || "").trim();
  if (!token) return;

  const accountId = String(params.accountId || "").trim() || buildFallbackId(token);
  const cacheId = `${params.role}:${accountId}`;
  const nowIso = new Date().toISOString();

  const nextItem: CachedAdultAccount = {
    id: cacheId,
    role: params.role,
    token,
    accountId,
    displayName: normalizeDisplayName(params.displayName, accountId),
    dashboardPath: roleConfig.dashboardPath,
    tokenKey: roleConfig.tokenKey,
    dataKey: roleConfig.dataKey,
    dataValue: roleConfig.dataKey ? (params.dataValue ?? localStorage.getItem(roleConfig.dataKey) ?? null) : null,
    updatedAt: nowIso,
  };

  const current = getCachedAdultAccounts();
  const withoutSame = current.filter((entry) => entry.id !== cacheId);
  saveCache([nextItem, ...withoutSame]);
}

export function clearCachedAdultAccounts(): void {
  localStorage.removeItem(CACHE_KEY);
}

export function switchToCachedAdultAccount(cacheId: string): string | null {
  const accounts = getCachedAdultAccounts();
  const account = accounts.find((entry) => entry.id === cacheId);
  if (!account || !account.token) return null;

  clearActiveAdultSessions();

  localStorage.setItem(account.tokenKey, account.token);
  if (account.dataKey && account.dataValue) {
    localStorage.setItem(account.dataKey, account.dataValue);
  }

  const nowIso = new Date().toISOString();
  const updated = accounts.map((entry) =>
    entry.id === cacheId ? { ...entry, updatedAt: nowIso } : entry
  );
  saveCache(updated);

  return normalizeDashboardPath(account.dashboardPath, account.role);
}

export function getRoleConfig(role: AdultAccountRole): RoleConfig {
  return ROLE_CONFIG[role];
}
