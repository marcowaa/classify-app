import { AlertTriangle, Loader2 } from "lucide-react";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

export type DynamicGameIframeHandle = {
  switchGameUrl: (nextUrl: string) => boolean;
  reloadGame: () => void;
  getCurrentUrl: () => string;
  getIframeElement: () => HTMLIFrameElement | null;
};

type DynamicGameIframeProps = {
  src: string;
  title: string;
  className?: string;
  iframeClassName?: string;
  loadingLabel?: string;
  fallbackLabel?: string;
  retryLabel?: string;
  loadTimeoutMs?: number;
  sandbox?: string;
  allow?: string;
  allowedDomains?: string[];
  waitForReadyMessage?: boolean;
  readyMessageType?: string;
  readyFallbackGraceMs?: number;
  allowPopupEscapeSandbox?: boolean;
  onLoad?: (url: string) => void;
  onError?: (reason: "invalid-url" | "domain-blocked" | "load-timeout" | "domain-circuit-open") => void;
  onLoadingChange?: (loading: boolean) => void;
  onIframeRef?: (iframe: HTMLIFrameElement | null) => void;
  fallbackContent?: React.ReactNode;
};

const CIRCUIT_WINDOW_MS = 5 * 60 * 1000;
const CIRCUIT_COOLDOWN_MS = 3 * 60 * 1000;
const CIRCUIT_FAIL_THRESHOLD = 3;

type CircuitState = {
  fails: number[];
  blockedUntil: number;
};

function getCircuitStorageKey(hostname: string): string {
  return `game_iframe_circuit:${hostname}`;
}

function loadCircuitState(hostname: string): CircuitState {
  try {
    const raw = localStorage.getItem(getCircuitStorageKey(hostname));
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object") return { fails: [], blockedUntil: 0 };
    const fails = Array.isArray(parsed.fails) ? parsed.fails.filter((x: any) => Number.isFinite(Number(x))) : [];
    return { fails: fails.map((x: any) => Number(x)), blockedUntil: Number(parsed.blockedUntil) || 0 };
  } catch {
    return { fails: [], blockedUntil: 0 };
  }
}

function saveCircuitState(hostname: string, state: CircuitState) {
  try {
    localStorage.setItem(getCircuitStorageKey(hostname), JSON.stringify(state));
  } catch {
    // Ignore storage failures.
  }
}

function isCircuitOpen(hostname: string): boolean {
  const state = loadCircuitState(hostname);
  return state.blockedUntil > Date.now();
}

function markCircuitFailure(hostname: string) {
  const now = Date.now();
  const state = loadCircuitState(hostname);
  const recentFails = state.fails.filter((ts) => now - ts <= CIRCUIT_WINDOW_MS);
  recentFails.push(now);
  const blockedUntil = recentFails.length >= CIRCUIT_FAIL_THRESHOLD ? now + CIRCUIT_COOLDOWN_MS : state.blockedUntil;
  saveCircuitState(hostname, { fails: recentFails, blockedUntil });
}

function clearCircuitFailures(hostname: string) {
  saveCircuitState(hostname, { fails: [], blockedUntil: 0 });
}

function normalizeAllowedDomains(input: string[] | undefined): Set<string> {
  return new Set((input || []).map((item) => String(item || "").trim().toLowerCase()).filter(Boolean));
}

function parseUrlSafe(rawUrl: string): URL | null {
  const value = String(rawUrl || "").trim();
  if (!value) return null;

  try {
    // Supports both relative URLs (/games/...) and absolute URLs.
    return new URL(value, window.location.origin);
  } catch {
    return null;
  }
}

function isRelativeUrlCandidate(rawUrl: string): boolean {
  const value = String(rawUrl || "").trim();
  return (
    value.startsWith("/") ||
    value.startsWith("./") ||
    value.startsWith("../")
  );
}

export const DynamicGameIframe = forwardRef<DynamicGameIframeHandle, DynamicGameIframeProps>(
  (
    {
      src,
      title,
      className,
      iframeClassName,
      loadingLabel,
      fallbackLabel,
      retryLabel,
      loadTimeoutMs = 15000,
      sandbox = "allow-scripts allow-same-origin allow-popups",
      allow = "fullscreen; autoplay; clipboard-read; clipboard-write",
      allowedDomains,
      waitForReadyMessage = false,
      readyMessageType = "GAME_READY",
      readyFallbackGraceMs = 2500,
      allowPopupEscapeSandbox = false,
      onLoad,
      onError,
      onLoadingChange,
      onIframeRef,
      fallbackContent,
    },
    ref
  ) => {
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const timeoutRef = useRef<number | null>(null);
    const readyFallbackTimeoutRef = useRef<number | null>(null);
    const domReadyPollRef = useRef<number | null>(null);

    const [currentUrl, setCurrentUrl] = useState(() => String(src || ""));
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<null | "invalid-url" | "domain-blocked" | "load-timeout" | "domain-circuit-open">(null);

    const allowedDomainSet = useMemo(() => normalizeAllowedDomains(allowedDomains), [allowedDomains]);

    const clearPendingTimeout = useCallback(() => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }, []);

    const clearReadyFallbackTimeout = useCallback(() => {
      if (readyFallbackTimeoutRef.current !== null) {
        window.clearTimeout(readyFallbackTimeoutRef.current);
        readyFallbackTimeoutRef.current = null;
      }
    }, []);

    const clearDomReadyPoll = useCallback(() => {
      if (domReadyPollRef.current !== null) {
        window.clearInterval(domReadyPollRef.current);
        domReadyPollRef.current = null;
      }
    }, []);

    const markLoadedSuccess = useCallback(() => {
      const parsed = parseUrlSafe(currentUrl);
      if (parsed && parsed.origin !== window.location.origin) {
        clearCircuitFailures(parsed.hostname.toLowerCase());
      }

      clearPendingTimeout();
      clearReadyFallbackTimeout();
      clearDomReadyPoll();
      setError(null);
      setLoading(false);
      onLoadingChange?.(false);
      onLoad?.(currentUrl);
    }, [clearDomReadyPoll, clearPendingTimeout, clearReadyFallbackTimeout, currentUrl, onLoad, onLoadingChange]);

    const validateUrl = useCallback((candidate: string): { ok: boolean; reason?: "invalid-url" | "domain-blocked" | "domain-circuit-open" } => {
      const parsed = parseUrlSafe(candidate);
      if (!parsed) return { ok: false, reason: "invalid-url" };

      const protocol = parsed.protocol.toLowerCase();
      const isSameOrigin = parsed.origin === window.location.origin;
      const isRelativeLike = isRelativeUrlCandidate(candidate);

      // Native WebViews can use custom schemes (e.g., capacitor://localhost).
      // Accept same-origin and relative game URLs regardless of scheme.
      if (!isSameOrigin && !isRelativeLike && protocol !== "http:" && protocol !== "https:") {
        return { ok: false, reason: "invalid-url" };
      }

      // Domain allow-list is optional. If provided, cross-domain URLs must be explicitly listed.
      if (allowedDomainSet.size > 0) {
        const host = parsed.hostname.toLowerCase();
        if (!isSameOrigin && !allowedDomainSet.has(host)) {
          return { ok: false, reason: "domain-blocked" };
        }
      }

      const isExternal = parsed.origin !== window.location.origin;
      if (isExternal && isCircuitOpen(parsed.hostname.toLowerCase())) {
        return { ok: false, reason: "domain-circuit-open" };
      }

      return { ok: true };
    }, [allowedDomainSet]);

    const switchGameUrl = useCallback((nextUrl: string) => {
      const next = String(nextUrl || "").trim();
      const validation = validateUrl(next);
      if (!validation.ok) {
        const reason = validation.reason || "invalid-url";
        setError(reason);
        setLoading(false);
        onLoadingChange?.(false);
        onError?.(reason);
        return false;
      }

      setError(null);
      setLoading(true);
      clearReadyFallbackTimeout();
      onLoadingChange?.(true);
      setCurrentUrl(next);
      return true;
    }, [clearReadyFallbackTimeout, onError, onLoadingChange, validateUrl]);

    const reloadGame = useCallback(() => {
      if (!currentUrl) return;
      switchGameUrl(currentUrl);
    }, [currentUrl, switchGameUrl]);

    useImperativeHandle(ref, () => ({
      switchGameUrl,
      reloadGame,
      getCurrentUrl: () => currentUrl,
      getIframeElement: () => iframeRef.current,
    }), [currentUrl, reloadGame, switchGameUrl]);

    useEffect(() => {
      const next = String(src || "").trim();
      const current = String(currentUrl || "").trim();

      // Parent re-renders can recreate callback props and re-run this effect.
      // Avoid resetting loader/iframe state when URL did not actually change.
      if (next === current) return;

      switchGameUrl(next);
    }, [currentUrl, src, switchGameUrl]);

    useEffect(() => {
      onIframeRef?.(iframeRef.current);
      return () => onIframeRef?.(null);
    }, [onIframeRef]);

    useEffect(() => {
      clearPendingTimeout();
      clearReadyFallbackTimeout();
      clearDomReadyPoll();

      if (!loading || error) return;

      // Some same-origin uploaded games can render visually while waiting on slow
      // external sub-resources, delaying iframe onLoad. Probe DOM readiness to
      // avoid keeping the loading overlay stuck in this state.
      const parsed = parseUrlSafe(currentUrl);
      if (parsed && parsed.origin === window.location.origin) {
        domReadyPollRef.current = window.setInterval(() => {
          const iframe = iframeRef.current;
          if (!iframe) return;
          try {
            const doc = iframe.contentDocument;
            if (!doc) return;
            const readyState = doc.readyState;
            const hasRenderableContent = Boolean(doc.body?.childElementCount || doc.body?.textContent?.trim());
            if ((readyState === "interactive" || readyState === "complete") && hasRenderableContent) {
              markLoadedSuccess();
            }
          } catch {
            // Ignore cross-origin access failures.
          }
        }, 350);
      }

      timeoutRef.current = window.setTimeout(() => {
        const parsed = parseUrlSafe(currentUrl);
        if (parsed && parsed.origin !== window.location.origin) {
          markCircuitFailure(parsed.hostname.toLowerCase());
        }
        setError("load-timeout");
        setLoading(false);
        onLoadingChange?.(false);
        onError?.("load-timeout");
      }, Math.max(3000, loadTimeoutMs));

      return () => {
        clearPendingTimeout();
        clearReadyFallbackTimeout();
        clearDomReadyPoll();
      };
    }, [clearDomReadyPoll, clearPendingTimeout, clearReadyFallbackTimeout, currentUrl, error, loadTimeoutMs, loading, markLoadedSuccess, onError, onLoadingChange]);

    const handleLoad = useCallback(() => {
      if (waitForReadyMessage) {
        const parsed = parseUrlSafe(currentUrl);
        // Same-origin games can be trusted on iframe load. This avoids missing
        // a fast GAME_READY message due to listener timing races.
        if (parsed && parsed.origin === window.location.origin) {
          markLoadedSuccess();
          return;
        }

        // For cross-origin games, wait for GAME_READY when available, but
        // gracefully continue after a short grace period if no handshake arrives.
        clearPendingTimeout();
        clearReadyFallbackTimeout();
        readyFallbackTimeoutRef.current = window.setTimeout(() => {
          setError(null);
          setLoading(false);
          onLoadingChange?.(false);
          onLoad?.(currentUrl);
        }, Math.max(1200, readyFallbackGraceMs));
        return;
      }
      markLoadedSuccess();
    }, [clearPendingTimeout, clearReadyFallbackTimeout, currentUrl, markLoadedSuccess, onLoad, onLoadingChange, readyFallbackGraceMs, waitForReadyMessage]);

    useEffect(() => {
      if (!waitForReadyMessage || !loading) return;

      const onMessage = (event: MessageEvent) => {
        if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;

        const isSameOrigin = event.origin === window.location.origin;
        if (!isSameOrigin) {
          const parsed = parseUrlSafe(currentUrl);
          if (!parsed) return;

          // Accept cross-origin READY only from the exact iframe origin.
          if (event.origin !== parsed.origin) return;

          // Mirror server policy behavior:
          // - If allow-list exists, host must be listed.
          // - If allow-list is empty, external origins are allowed.
          if (allowedDomainSet.size > 0) {
            const allowedHost = allowedDomainSet.has(parsed.hostname.toLowerCase());
            if (!allowedHost) return;
          }
        }

        if (event.data?.type !== readyMessageType) return;

        const parsed = parseUrlSafe(currentUrl);
        if (parsed && parsed.origin !== window.location.origin) {
          clearCircuitFailures(parsed.hostname.toLowerCase());
        }

        markLoadedSuccess();
      };

      window.addEventListener("message", onMessage);
      return () => {
        window.removeEventListener("message", onMessage);
        clearReadyFallbackTimeout();
      };
    }, [allowedDomainSet, clearPendingTimeout, clearReadyFallbackTimeout, currentUrl, loading, markLoadedSuccess, onLoad, onLoadingChange, readyMessageType, waitForReadyMessage]);

    const showFallback = !!error;

    const resolvedSandbox = useMemo(() => {
      if (!allowPopupEscapeSandbox || sandbox.includes("allow-popups-to-escape-sandbox")) {
        return sandbox;
      }
      return `${sandbox} allow-popups-to-escape-sandbox`;
    }, [allowPopupEscapeSandbox, sandbox]);

    return (
      <div className={className || "relative w-full h-full min-h-0"}>
        {loading && !showFallback && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/35">
            <div className="text-center">
              <Loader2 className="mx-auto mb-2 h-10 w-10 animate-spin text-purple-300" />
              {loadingLabel ? <p className="text-sm text-white/85">{loadingLabel}</p> : null}
            </div>
          </div>
        )}

        {showFallback ? (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/75 p-4">
            {fallbackContent || (
              <div className="max-w-md rounded-xl border border-red-400/45 bg-red-950/35 p-4 text-center text-white">
                <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-red-300" />
                {fallbackLabel ? <p className="text-sm font-semibold">{fallbackLabel}</p> : null}
                <button
                  type="button"
                  onClick={reloadGame}
                  className="mt-3 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-black"
                  aria-label={retryLabel || fallbackLabel || undefined}
                >
                  {retryLabel || "↻"}
                </button>
              </div>
            )}
          </div>
        ) : null}

        <iframe
          ref={iframeRef}
          src={currentUrl}
          title={title}
          className={iframeClassName || "h-full w-full border-0"}
          // Sandbox allows game scripts/popups while still containing broader frame capabilities.
          sandbox={resolvedSandbox}
          allow={allow}
          allowFullScreen
          // Important for cross-domain hosts: keeps referrer strict while still allowing remote loads.
          referrerPolicy="strict-origin-when-cross-origin"
          loading="eager"
          onLoad={handleLoad}
        />
      </div>
    );
  }
);

DynamicGameIframe.displayName = "DynamicGameIframe";
