type NativeGoogleMode = "login" | "link";

type NativeGoogleConfigResponse = {
  success?: boolean;
  data?: {
    clientId?: string;
  };
  message?: string;
};

type NativeGoogleAuthResponse = {
  success?: boolean;
  data?: {
    token?: string;
    provider?: string;
    mode?: NativeGoogleMode;
    returnTo?: string;
  };
  message?: string;
  error?: string;
};

type NativeGoogleUser = {
  authentication?: {
    idToken?: string;
  };
  idToken?: string;
};

type NativeGooglePlugin = {
  initialize?: (options: {
    clientId: string;
    scopes?: string[];
    grantOfflineAccess?: boolean;
  }) => Promise<void> | void;
  signIn: () => Promise<NativeGoogleUser>;
};

let nativeGoogleInitialized = false;

function getNativeGooglePlugin(): NativeGooglePlugin | null {
  const capacitor = (window as any)?.Capacitor;
  if (!capacitor?.isNativePlatform?.()) return null;

  const plugin = capacitor?.Plugins?.GoogleAuth;
  if (!plugin || typeof plugin.signIn !== "function") return null;

  return plugin as NativeGooglePlugin;
}

export function isNativeGoogleSignInAvailable(): boolean {
  return Boolean(getNativeGooglePlugin());
}

async function getNativeGoogleClientId(): Promise<string> {
  const res = await fetch("/api/auth/oauth/google/native-config", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  const json = (await res.json().catch(() => null)) as NativeGoogleConfigResponse | null;
  const clientId = String(json?.data?.clientId || "").trim();

  if (!res.ok || !clientId) {
    throw new Error(json?.message || "Google native config is unavailable");
  }

  return clientId;
}

function buildOAuthCallbackPath(payload: {
  token: string;
  provider: string;
  mode: NativeGoogleMode;
  returnTo: string;
}) {
  const params = new URLSearchParams({
    token: payload.token,
    provider: payload.provider,
    mode: payload.mode,
    returnTo: payload.returnTo,
  });
  return `/auth/oauth-callback?${params.toString()}`;
}

export async function getNativeGoogleOAuthCallbackPath(input: {
  mode: NativeGoogleMode;
  returnTo: string;
  linkToken?: string;
}): Promise<string> {
  const plugin = getNativeGooglePlugin();
  if (!plugin) {
    throw new Error("Native Google sign-in is not available on this device");
  }

  const clientId = await getNativeGoogleClientId();
  if (!nativeGoogleInitialized && typeof plugin.initialize === "function") {
    await plugin.initialize({
      clientId,
      scopes: ["profile", "email"],
      grantOfflineAccess: true,
    });
    nativeGoogleInitialized = true;
  }

  const user = await plugin.signIn();
  const idToken = String(user?.authentication?.idToken || user?.idToken || "").trim();
  if (!idToken) {
    throw new Error("Google sign-in did not return an idToken");
  }

  const res = await fetch("/api/auth/oauth/google/native", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      idToken,
      mode: input.mode,
      returnTo: input.returnTo,
      linkToken: input.mode === "link" ? (input.linkToken || "") : undefined,
    }),
  });

  const json = (await res.json().catch(() => null)) as NativeGoogleAuthResponse | null;
  const token = String(json?.data?.token || "").trim();
  const provider = String(json?.data?.provider || "google").trim().toLowerCase() || "google";
  const mode = (String(json?.data?.mode || input.mode).trim().toLowerCase() === "link" ? "link" : "login") as NativeGoogleMode;
  const returnTo = String(json?.data?.returnTo || input.returnTo || "/parent-dashboard").trim();

  if (!res.ok || !token) {
    throw new Error(json?.message || json?.error || "Native Google authentication failed");
  }

  return buildOAuthCallbackPath({
    token,
    provider,
    mode,
    returnTo: returnTo.startsWith("/") ? returnTo : "/parent-dashboard",
  });
}
