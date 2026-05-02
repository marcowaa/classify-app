type StorageLike = Pick<Storage, "getItem">;

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const ALLOWED_TRIAL_WRITE_PREFIXES = [
  "/api/auth/start-child-trial",
  "/api/auth/start-parent-trial",
  "/api/auth/check-email",
  "/api/auth/register",
  "/api/auth/login",
  "/api/auth/send-otp",
  "/api/auth/request-otp",
  "/api/auth/verify-otp",
  "/api/auth/logout",
  "/api/auth/oauth",
  "/api/auth/link-trial-child",
  "/api/trial-analytics",
];

const TRIAL_UPGRADE_MESSAGE =
  "هذه جلسة تجريبية مؤقتة. لحفظ البيانات ومتابعة التقدم، يرجى إنشاء حساب دائم. This is a temporary trial session. Create a full account to save data and keep progress.";

function normalizeClassification(value: string | null | undefined): string {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/-/g, "_");
}

function getStorage(storage?: StorageLike): StorageLike | undefined {
  if (storage) return storage;
  try {
    if (typeof localStorage !== "undefined") {
      return localStorage;
    }
  } catch {
  }
  return undefined;
}

function toPathname(url: string): string {
  const raw = String(url || "").trim();
  if (!raw) return "";
  if (raw.startsWith("/")) {
    return raw.split("?")[0]?.split("#")[0] || "";
  }

  try {
    const base = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const parsed = new URL(raw, base);
    return parsed.pathname || "";
  } catch {
    return raw;
  }
}

function isApiPath(url: string): boolean {
  const pathname = toPathname(url);
  return pathname.startsWith("/api/");
}

function isAllowedTrialWritePath(url: string): boolean {
  const pathname = toPathname(url);
  return ALLOWED_TRIAL_WRITE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function isTrialSession(storage?: StorageLike): boolean {
  const activeStorage = getStorage(storage);
  if (!activeStorage) return false;

  const parentClassification = normalizeClassification(activeStorage.getItem("parentAccountClassification"));

  if (parentClassification === "PARENT_TRIAL") return true;
  return false;
}

export function shouldBlockTrialWrite(method: string, url: string, storage?: StorageLike): boolean {
  const normalizedMethod = String(method || "").trim().toUpperCase();
  if (!WRITE_METHODS.has(normalizedMethod)) return false;
  if (!isApiPath(url)) return false;
  if (isAllowedTrialWritePath(url)) return false;
  return isTrialSession(storage);
}

export class TrialWriteBlockedError extends Error {
  public readonly status = 403;
  public readonly code = "TRIAL_UPGRADE_REQUIRED";
  public readonly upgradePath = "/parent-auth?mode=register&notice=complete-account";

  constructor() {
    super(TRIAL_UPGRADE_MESSAGE);
    this.name = "TrialWriteBlockedError";
  }
}

export function ensureTrialWriteAllowed(method: string, url: string, storage?: StorageLike): void {
  if (!shouldBlockTrialWrite(method, url, storage)) return;

  const error = new TrialWriteBlockedError();

  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(
      new CustomEvent("classify:trial-write-blocked", {
        detail: {
          message: error.message,
          code: error.code,
          status: error.status,
          method,
          url,
          upgradePath: error.upgradePath,
        },
      })
    );
  }

  throw error;
}
