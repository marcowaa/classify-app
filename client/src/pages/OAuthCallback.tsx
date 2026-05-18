import { useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { cacheAdultAccountSession } from "@/lib/adultAccountSessions";
import { clearTrialChildLinkData, readTrialChildLinkData } from "@/lib/trialChildLinkStorage";
import { getTrialPurchaseFlowState, setTrialPurchaseFlowState, shouldRedirectToTrialInvoice } from "@/lib/trialPurchaseFlow";
import { trackTrialFunnelEvent } from "@/lib/trialAnalytics";

type OAuthLastResult = {
  status: "success" | "failed";
  stage: "provider-callback" | "token-cache";
  provider: string;
  mode: string;
  returnTo: string;
  reason?: string;
  tokenStored?: boolean;
  childCacheCleared?: boolean;
  at: number;
};

function persistOAuthLastResult(payload: OAuthLastResult) {
  try {
    const serialized = JSON.stringify(payload);
    localStorage.setItem("classify-oauth-last-result", serialized);
    sessionStorage.setItem("classify-oauth-last-result", serialized);
  } catch {
    // Ignore storage errors in restricted environments.
  }
}

async function linkTrialChildToParent(parentToken: string, trialToken: string): Promise<boolean> {
  const normalizedParentToken = String(parentToken || "").trim();
  const normalizedTrialToken = String(trialToken || "").trim();
  if (!normalizedParentToken || !normalizedTrialToken) return false;

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 10_000);

  try {
    const linkResponse = await fetch("/api/auth/link-trial-child", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${normalizedParentToken}`,
      },
      body: JSON.stringify({ trialChildToken: normalizedTrialToken }),
      signal: controller.signal,
    });

    return linkResponse.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function OAuthCallback() {
  const [, navigate] = useLocation();

  useEffect(() => {
    const TIMEOUT_MS = 20_000;

    const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number) => {
      let timeoutId: number | null = null;

      const timeoutPromise = new Promise<T>((_, reject) => {
        timeoutId = window.setTimeout(() => reject(new Error("oauth_callback_timeout")), timeoutMs);
      });

      return Promise.race([promise, timeoutPromise]).finally(() => {
        if (timeoutId) window.clearTimeout(timeoutId);
      });
    };

    (async () => {
      try {
        await withTimeout((async () => {
          const params = new URLSearchParams(window.location.search);
          const nonce = params.get("nonce");
          const error = params.get("error");
          const provider = params.get("provider") || "google";
          const mode = params.get("mode") || "login";

          // حالة الخطأ
          if (error) {
            sessionStorage.setItem(
              "classify-oauth-last-result",
              JSON.stringify({ status: "failed", error }),
            );
            window.location.replace(`/parent-auth?error=${error}&provider=${provider}`);
            return;
          }

          // حالة النجاح — استرجاع token عبر nonce
          if (nonce) {
            // Popup handoff: if we have an opener window, do NOT redeem in the popup.
            // Instead, post the nonce back to the opener (main window) which will redeem.
            const hasOpener = typeof window !== "undefined" && window.opener && !window.opener.closed;

            if (hasOpener) {
              try {
                window.opener.postMessage(
                  {
                    type: "OAUTH_NONCE_READY",
                    v: 1,
                    traceId: "",
                    nonce,
                    provider,
                  },
                  window.location.origin,
                );
              } catch {
                // Ignore and fall back to legacy redemption below.
              }

              // Best-effort close (may be blocked; still prevent redemption in popup).
              try {
                window.close();
              } catch {
                // ignore
              }
              return;
            }

            // Legacy: redeem in this window (non-popup)
            fetch("/api/auth/oauth/redeem-nonce", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ nonce }),
            })
              .then((res) => {
                if (!res.ok) throw new Error("nonce_invalid");
                return res.json();
              })
              .then(({ token, returnTo }) => {
                if (!token) throw new Error("no_token");
                localStorage.setItem("token", token);
                localStorage.setItem("classify-auth-token", token);
                requestAnimationFrame(() => {
                  window.location.replace(returnTo || "/parent");
                });
              })
              .catch((err) => {
                window.location.replace(
                  `/parent-auth?error=${err.message}&provider=${provider}`,
                );
              });
            return;
          }

          // لا nonce ولا error
          window.location.replace("/parent-auth?error=oauth_missing_nonce");
        })(), TIMEOUT_MS);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e || "");
        persistOAuthLastResult({
          status: "failed",
          stage: "provider-callback",
          provider: new URLSearchParams(window.location.search).get("provider") || "unknown",
          mode: new URLSearchParams(window.location.search).get("mode") || "login",
          returnTo: new URLSearchParams(window.location.search).get("returnTo") || "/parent-dashboard",
          reason: message === "oauth_callback_timeout" ? "oauth_timeout" : message || "oauth_callback_failed",
          at: Date.now(),
        });
        navigate("/parent-auth?error=oauth_timeout");
      }
    })();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
    </div>
  );
}
