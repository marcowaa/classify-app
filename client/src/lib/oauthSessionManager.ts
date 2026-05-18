import { getNativeGoogleOAuthCallbackPath, isNativeGoogleSignInAvailable } from "./nativeGoogleAuth";

export type OAuthMode = "login" | "link";

export type OAuthProvider = "google" | "facebook" | (string & {});

export type OAuthStartResult =
  | { kind: "native-google"; redirectPath: string; traceId: string }
  | { kind: "legacy-redirect"; redirectUrl: string; traceId: string }
  | { kind: "web-popup-opened"; traceId: string }
  | { kind: "noop"; traceId: string; reason: string };

export type OAuthStartInput = {
  provider: OAuthProvider;
  mode: OAuthMode;
  returnTo: string;
  linkToken?: string;
  traceId?: string;
};

const TRACE_STORAGE_KEY = "classify-oauth-current-attempt";
const OAUTH_MESSAGE_TYPE = "OAUTH_NONCE_READY";
const OAUTH_MESSAGE_VERSION = 1;

type OAuthAttemptTrace = {
  traceId: string;
  startedAt: number;
  provider: string;
  mode: OAuthMode;
  returnTo: string;
  oauthStateToken?: string;
  handoffNonceRedeemed?: boolean;
};

function newTraceId(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c: any = window?.crypto;
    if (c?.randomUUID) return c.randomUUID();
  } catch {
    // ignore
  }
  return `trace_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function persistTrace(trace: OAuthAttemptTrace): void {
  try {
    sessionStorage.setItem(TRACE_STORAGE_KEY, JSON.stringify(trace));
  } catch {
    // ignore
  }
}

function readTrace(): OAuthAttemptTrace | null {
  try {
    const raw = sessionStorage.getItem(TRACE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OAuthAttemptTrace;
    if (!parsed?.traceId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function clearTrace(): void {
  try {
    sessionStorage.removeItem(TRACE_STORAGE_KEY);
  } catch {
    // ignore
  }
}

function traceLog(event: string, payload: Record<string, unknown> = {}): void {
  try {
    // eslint-disable-next-line no-console
    console.info("[oauth]", JSON.stringify({ event, ...payload }));
  } catch {
    // ignore
  }
}

function normalizeReturnTo(value: string): string {
  const v = String(value || "").trim();
  if (!v) return "/parent-dashboard";
  if (!v.startsWith("/")) return "/parent-dashboard";
  if (v.startsWith("//")) return "/parent-dashboard";
  return v;
}

function buildLegacyRedirectUrl(args: { provider: string; mode: OAuthMode; returnTo: string }): string {
  const safeProvider = encodeURIComponent(args.provider);
  const params = new URLSearchParams({ mode: args.mode });
  params.set("returnTo", normalizeReturnTo(args.returnTo));
  return `/api/auth/oauth/${safeProvider}?${params.toString()}`;
}

const isNativeRuntime = Boolean((window as any)?.Capacitor?.isNativePlatform?.());

const webPopupEnabled: boolean =
  String((import.meta as any).env?.VITE_OAUTH_WEB_POPUP_ENABLED ?? "").trim().toLowerCase() === "true";

let receiverInstalled = false;

async function redeemNonceForCurrentAttempt(args: { nonce: string; traceId: string; provider: string }) {
  traceLog("redeem_start", { traceId: args.traceId, provider: args.provider });

  const res = await fetch("/api/auth/oauth/redeem-nonce", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nonce: String(args.nonce) }),
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    traceLog("redeem_failure", {
      traceId: args.traceId,
      provider: args.provider,
      status: res.status,
      bodyPreview: text.slice(0, 200),
    });
    throw new Error("nonce_invalid_or_expired");
  }

  const json = (await res.json().catch(() => null)) as { token?: string; returnTo?: string } | null;
  const token = String(json?.token || "").trim();
  if (!token) {
    traceLog("redeem_failure", { traceId: args.traceId, provider: args.provider, reason: "missing_token" });
    throw new Error("oauth_no_token");
  }

  // Local token cache (no token in postMessage; only stored after redeem)
  localStorage.setItem("token", token);
  localStorage.setItem("classify-auth-token", token);

  traceLog("redeem_success", { traceId: args.traceId, provider: args.provider });

  clearTrace();

  const returnTo = typeof json?.returnTo === "string" && json.returnTo.trim() ? json.returnTo : "/parent-dashboard";
  window.location.replace(returnTo);
}

function installNonceHandoffReceiver() {
  if (receiverInstalled) return;
  receiverInstalled = true;

  window.addEventListener("message", async (event: MessageEvent) => {
    try {
      // Strict origin validation
      if (event.origin !== window.location.origin) return;

      const data = event.data as any;
      if (!data || typeof data !== "object") return;
      if (data.type !== OAUTH_MESSAGE_TYPE) return;
      if (data.v !== OAUTH_MESSAGE_VERSION) return;

      const traceFromMsg = String(data.traceId || "").trim();
      const nonce = String(data.nonce || "").trim();
      const provider = String(data.provider || "").trim().toLowerCase();

      if (!nonce || !provider) return;
      if (!nonce || nonce.length < 4) return;

      const current = readTrace();
      if (!current) {
        traceLog("handoff_message_ignored_no_trace", { msgTraceId: traceFromMsg });
        return;
      }
      // traceId is optional: popup may not have access to opener's traceId.
      if (traceFromMsg && current.traceId !== traceFromMsg) {
        traceLog("handoff_message_ignored_trace_mismatch", { msgTraceId: traceFromMsg, currentTraceId: current.traceId });
        return;
      }

      if (current.handoffNonceRedeemed) {
        traceLog("handoff_message_ignored_already_redeemed", { traceId: traceFromMsg });
        return;
      }

      // Redeem in opener (main window) — no tokens in postMessage
      persistTrace({ ...current, handoffNonceRedeemed: true });
      traceLog("deep_link_received", { traceId: traceFromMsg, provider });

      await redeemNonceForCurrentAttempt({ nonce, traceId: traceFromMsg, provider });
    } catch (err: any) {
      traceLog("handoff_error", { error: String(err?.message || err || "unknown") });
    }
  });
}

async function cancelOAuthFlow(args: { provider: string; oauthStateToken: string; traceId: string }) {
  try {
    traceLog("cancel", { traceId: args.traceId, provider: args.provider });
    await fetch(`/api/auth/oauth/${encodeURIComponent(args.provider)}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: args.oauthStateToken }),
      credentials: "include",
    });
  } catch {
    // ignore
  }
}

function normalizeProvider(provider: string): string {
  return String(provider || "").trim().toLowerCase();
}

export async function startOAuth(input: OAuthStartInput): Promise<OAuthStartResult> {
  const traceId = input.traceId || newTraceId();
  const provider = normalizeProvider(String(input.provider || ""));

  const trace: OAuthAttemptTrace = {
    traceId,
    startedAt: Date.now(),
    provider,
    mode: input.mode,
    returnTo: normalizeReturnTo(input.returnTo),
  };

  persistTrace(trace);
  installNonceHandoffReceiver();
  traceLog("start", { traceId, provider, mode: input.mode, returnTo: trace.returnTo });

  // Provider-specific: Google native (must not be broken)
  if (provider === "google" && isNativeGoogleSignInAvailable()) {
    // Keep Google native untouched
    const callbackPath = await getNativeGoogleOAuthCallbackPath({
      mode: input.mode,
      returnTo: trace.returnTo,
    });
    traceLog("redirect", { traceId, kind: "native-google", provider });
    return { kind: "native-google", redirectPath: callbackPath, traceId };
  }

  // Phase 2 popup (web) only behind feature flag
  const canUseWebPopup = webPopupEnabled && !isNativeRuntime;

  if (provider !== "google" && canUseWebPopup) {
    traceLog("popup_open_attempt", { traceId, provider });

    const mode = input.mode;
    const res = await fetch(`/api/auth/oauth/${encodeURIComponent(provider)}/popup/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, returnTo: trace.returnTo }),
      credentials: "include",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      traceLog("popup_start_failure", { traceId, provider, status: res.status, bodyPreview: text.slice(0, 200) });
      throw new Error("oauth_popup_start_failed");
    }

    const json = (await res.json().catch(() => null)) as
      | { authUrl?: string; oauthStateToken?: string }
      | null;

    const authUrl = String(json?.authUrl || "").trim();
    const oauthStateToken = String(json?.oauthStateToken || "").trim();

    if (!authUrl || !oauthStateToken) {
      traceLog("popup_start_failure", { traceId, provider, reason: "missing_authUrl_or_stateToken" });
      throw new Error("oauth_popup_start_invalid_response");
    }

    persistTrace({ ...trace, oauthStateToken });

    // Open popup (do not use noopener; we need window.opener for nonce handoff)
    const popup = window.open(
      authUrl,
      "classify_oauth_popup",
      "popup=1,width=520,height=760,noopener=false,noreferrer=false",
    );

    if (!popup) {
      traceLog("popup_blocked", { traceId, provider });
      clearTrace();
      throw new Error("oauth_popup_blocked");
    }

    traceLog("popup_opened", { traceId, provider });

    // Cancellation on timeout/popup-close
    const TIMEOUT_MS = 120_000;
    const startAt = Date.now();

    const intervalId = window.setInterval(() => {
      try {
        const current = readTrace();
        if (!current || current.traceId !== traceId) return;

        if (current.handoffNonceRedeemed) {
          window.clearInterval(intervalId);
          return;
        }

        if (popup.closed) {
          window.clearInterval(intervalId);
          if (current.oauthStateToken) {
            cancelOAuthFlow({ provider, oauthStateToken: current.oauthStateToken, traceId });
          }
          clearTrace();
          return;
        }

        if (Date.now() - startAt > TIMEOUT_MS) {
          window.clearInterval(intervalId);
          if (current.oauthStateToken) {
            cancelOAuthFlow({ provider, oauthStateToken: current.oauthStateToken, traceId });
          }
          clearTrace();
          traceLog("timeout", { traceId, provider });
        }
      } catch {
        // ignore
      }
    }, 500);

    return { kind: "web-popup-opened", traceId };
  }

  // Default: legacy redirect (backward compatibility)
  const redirectUrl = buildLegacyRedirectUrl({
    provider,
    mode: input.mode,
    returnTo: trace.returnTo,
  });

  traceLog("redirect", { traceId, kind: "legacy-redirect", provider });
  return { kind: "legacy-redirect", redirectUrl, traceId };
}
