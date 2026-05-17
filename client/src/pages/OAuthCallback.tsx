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
          const token = params.get("token");
          const error = params.get("error");
          const provider = params.get("provider");
          const mode = params.get("mode") || "login";
          const returnToParam = params.get("returnTo") || "/parent-dashboard";
          const returnTo = returnToParam.startsWith("/") ? returnToParam : "/parent-dashboard";

          if (error) {
            persistOAuthLastResult({
              status: "failed",
              stage: "provider-callback",
              provider: provider || "unknown",
              mode,
              returnTo,
              reason: error,
              at: Date.now(),
            });
            navigate(`/parent-auth?error=${error}&provider=${provider || ""}`);
            return;
          }

          if (token) {
            localStorage.removeItem("childToken");
            localStorage.removeItem("childId");
            localStorage.removeItem("childAccountClassification");
            localStorage.setItem("token", token);
            localStorage.setItem("parentAccountClassification", "FULL");

            const tokenStored = localStorage.getItem("token") === token;
            const childCacheCleared =
              !localStorage.getItem("childToken")
              && !localStorage.getItem("childId")
              && !localStorage.getItem("childAccountClassification");

            if (!tokenStored) {
              persistOAuthLastResult({
                status: "failed",
                stage: "token-cache",
                provider: provider || "unknown",
                mode,
                returnTo,
                reason: "oauth_token_cache_failed",
                tokenStored: false,
                childCacheCleared,
                at: Date.now(),
              });
              navigate(`/parent-auth?error=oauth_token_cache_failed&provider=${provider || ""}`);
              return;
            }

            cacheAdultAccountSession({
              role: "parent",
              token,
              displayName: provider || undefined,
            });

            persistOAuthLastResult({
              status: "success",
              stage: "provider-callback",
              provider: provider || "unknown",
              mode,
              returnTo,
              tokenStored,
              childCacheCleared,
              at: Date.now(),
            });

            if (mode === "link") {
              sessionStorage.setItem("classify-social-link-status", JSON.stringify({
                provider: provider || "",
                success: true,
                at: Date.now(),
              }));
            }

            let target = returnTo;
            const trialFlowState = getTrialPurchaseFlowState();
            const trialChildToken = readTrialChildLinkData()?.trialChildToken?.trim() || "";
            const isTrialCheckoutFlow = trialFlowState === "captured"
              || trialFlowState === "linking"
              || trialFlowState === "linked"
              || trialFlowState === "hydrated";

            if (trialChildToken && isTrialCheckoutFlow) {
              if (trialFlowState === "captured" || trialFlowState === "linking") {
                setTrialPurchaseFlowState("linking");
              }

              const linked = await linkTrialChildToParent(token, trialChildToken);
              if (linked) {
                setTrialPurchaseFlowState("linked");
                clearTrialChildLinkData();
                trackTrialFunnelEvent("TRIAL_LINK_SUCCESS");
              } else {
                if (getTrialPurchaseFlowState() === "linking") {
                  setTrialPurchaseFlowState("captured");
                }
                trackTrialFunnelEvent("TRIAL_LINK_FAILED", { reason: "AUTO_LINK_FAILED" });
              }

              if (shouldRedirectToTrialInvoice({ trialLinkSucceeded: linked })) {
                target = "/parent-store?trialIntent=1";
              }
            }

            requestAnimationFrame(() => {
              try {
                const safeTarget = typeof target === "string" && target.startsWith("/") ? target : "/parent-dashboard";
                window.location.replace(safeTarget);
              } catch {
                window.location.replace(returnTo || "/parent-dashboard");
              }
            });
          } else {
            persistOAuthLastResult({
              status: "failed",
              stage: "provider-callback",
              provider: provider || "unknown",
              mode,
              returnTo,
              reason: "oauth_no_token",
              at: Date.now(),
            });
            navigate("/parent-auth?error=oauth_no_token");
          }
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
