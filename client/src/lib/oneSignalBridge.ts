type JwtPayload = Record<string, any>;

type Identity = {
  type: "parent" | "child" | "teacher" | "admin";
  id: string;
  externalId: string;
};

type PublicPaidService = {
  enabled: boolean;
  mode: "disabled" | "trial" | "active";
  settings?: Record<string, string>;
};

type PublicPaidServicesResponse = {
  services?: Record<string, PublicPaidService>;
};

declare global {
  interface Window {
    OneSignal?: any;
  }
}

const ONESIGNAL_SDK_URL = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
let bootPromise: Promise<void> | null = null;

function decodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "="));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function getIdentityFromStorage(): Identity | null {
  const childToken = localStorage.getItem("childToken");
  if (childToken) {
    const payload = decodeJwt(childToken);
    const childId = String(payload?.childId || "").trim();
    if (childId) return { type: "child", id: childId, externalId: `child:${childId}` };
  }

  const teacherToken = localStorage.getItem("teacherToken");
  if (teacherToken) {
    const payload = decodeJwt(teacherToken);
    const teacherId = String(payload?.teacherId || "").trim();
    if (teacherId) return { type: "teacher", id: teacherId, externalId: `teacher:${teacherId}` };
  }

  const parentToken = localStorage.getItem("token");
  if (parentToken) {
    const payload = decodeJwt(parentToken);
    const parentId = String(payload?.userId || payload?.parentId || "").trim();
    if (parentId) return { type: "parent", id: parentId, externalId: `parent:${parentId}` };
  }

  const adminToken = localStorage.getItem("adminToken");
  if (adminToken) {
    const payload = decodeJwt(adminToken);
    const adminId = String(payload?.adminId || payload?.userId || "").trim();
    if (adminId) return { type: "admin", id: adminId, externalId: `admin:${adminId}` };
  }

  return null;
}

async function fetchOneSignalPublicConfig(): Promise<{ enabled: boolean; appId: string }> {
  try {
    const res = await fetch("/api/paid-services-config");
    if (!res.ok) return { enabled: false, appId: "" };
    const json = await res.json();
    const data = (json?.data || {}) as PublicPaidServicesResponse;
    const oneSignal = data?.services?.onesignal_push;

    const enabled = !!oneSignal?.enabled && oneSignal?.mode !== "disabled";
    const appId = String(oneSignal?.settings?.appId || "").trim();

    return { enabled, appId };
  } catch {
    return { enabled: false, appId: "" };
  }
}

function loadOneSignalSdk(): Promise<void> {
  if ((window as any).OneSignal) return Promise.resolve();

  const existing = document.querySelector<HTMLScriptElement>(`script[src='${ONESIGNAL_SDK_URL}']`);
  if (existing && existing.dataset.loaded === "true") return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = existing || document.createElement("script");
    script.src = ONESIGNAL_SDK_URL;
    script.async = true;

    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error("ONESIGNAL_SDK_LOAD_FAILED"));

    if (!existing) document.head.appendChild(script);
  });
}

async function ensureOneSignalInit(appId: string): Promise<any | null> {
  if (!appId) return null;

  await loadOneSignalSdk();
  const OneSignal = (window as any).OneSignal;
  if (!OneSignal) return null;

  if (!OneSignal.__classifyInitDone) {
    await OneSignal.init({
      appId,
      allowLocalhostAsSecureOrigin: true,
      serviceWorkerPath: "/OneSignalSDKWorker.js",
      serviceWorkerUpdaterPath: "/OneSignalSDKUpdaterWorker.js",
    });
    OneSignal.__classifyInitDone = true;
  }

  return OneSignal;
}

async function syncIdentity(): Promise<void> {
  const { enabled, appId } = await fetchOneSignalPublicConfig();
  if (!enabled || !appId) return;

  const oneSignal = await ensureOneSignalInit(appId);
  if (!oneSignal) return;

  const identity = getIdentityFromStorage();
  if (!identity) {
    if (typeof oneSignal.logout === "function") {
      await oneSignal.logout();
    }
    return;
  }

  if (typeof oneSignal.login === "function") {
    await oneSignal.login(identity.externalId);
  }

  if (oneSignal.User && typeof oneSignal.User.addAlias === "function") {
    await oneSignal.User.addAlias("recipient_type", identity.type);
    await oneSignal.User.addAlias("recipient_id", identity.id);
  }
}

export function bootOneSignalIdentitySync(): void {
  if (bootPromise) return;

  const safeSync = () => {
    syncIdentity().catch(() => undefined);
  };

  bootPromise = Promise.resolve().then(safeSync);

  window.addEventListener("storage", safeSync);
  window.addEventListener("focus", safeSync);

  setInterval(safeSync, 60_000);
}
