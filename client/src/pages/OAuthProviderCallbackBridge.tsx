import { useEffect } from "react";
import { Loader2 } from "lucide-react";

function persistBridgeFailure(reason: string, provider = "unknown") {
  try {
    const payload = JSON.stringify({
      status: "failed",
      stage: "provider-callback",
      provider,
      mode: "login",
      returnTo: "/parent-dashboard",
      reason,
      at: Date.now(),
    });
    localStorage.setItem("classify-oauth-last-result", payload);
    sessionStorage.setItem("classify-oauth-last-result", payload);
  } catch {
    // Ignore storage errors in restricted environments.
  }
}

function resolveProviderFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/auth\/([^/]+)\/callback\/?$/i);
  if (!match?.[1]) return null;
  return decodeURIComponent(match[1]).toLowerCase();
}

export function OAuthProviderCallbackBridge() {
  useEffect(() => {
    const provider = resolveProviderFromPath(window.location.pathname);

    if (!provider) {
      persistBridgeFailure("oauth_missing_provider");
      window.location.replace("/parent-auth?error=oauth_missing_provider");
      return;
    }

    // Compatibility bridge for provider consoles configured with /auth/:provider/callback.
    const target = `/api/auth/oauth/${provider}/callback${window.location.search || ""}`;
    window.location.replace(target);
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
    </div>
  );
}
