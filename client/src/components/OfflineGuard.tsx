import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { queryClient } from "@/lib/queryClient";

/* ──────────────────────────────────────────────────────────
 *  Localized strings — keyed by i18n language code.
 *  Falls back to English for unknown languages.
 * ────────────────────────────────────────────────────────── */
const translations: Record<string, {
  title: string;
  description: string;
  retry: string;
  checking: string;
  tip: string;
}> = {
  ar: {
    title: "لا يوجد اتصال بالإنترنت",
    description: "يبدو أن جهازك غير متصل بالإنترنت.\nتحقق من الشبكة وحاول مرة أخرى.",
    retry: "إعادة المحاولة",
    checking: "جاري التحقق…",
    tip: "💡 جرّب تشغيل وإيقاف وضع الطيران",
  },
  en: {
    title: "No Internet Connection",
    description: "It looks like your device is offline.\nCheck your network and try again.",
    retry: "Try Again",
    checking: "Checking…",
    tip: "💡 Try toggling Airplane mode on and off",
  },
  pt: {
    title: "Sem Conexão com a Internet",
    description: "Parece que seu dispositivo está off-line.\nVerifique sua rede e tente novamente.",
    retry: "Tentar Novamente",
    checking: "Verificando…",
    tip: "💡 Tente ativar e desativar o modo avião",
  },
};

function getLocale(): { lang: string; isRTL: boolean } {
  const stored = localStorage.getItem("i18nextLng");
  const lang = stored && stored in translations ? stored : "en";
  return { lang, isRTL: lang === "ar" };
}

function t(key: keyof typeof translations.en): string {
  const { lang } = getLocale();
  return (translations[lang] ?? translations.en)[key];
}

/* ──── SVG icons (inline to avoid extra deps) ──── */

const WifiOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    className="text-purple-500 dark:text-purple-400"
  >
    <path d="M12 20h.01" />
    <path d="M8.5 16.429a5 5 0 0 1 7 0" />
    <path d="M5 12.859a10 10 0 0 1 5.17-2.69" />
    <path d="M13.83 10.17A10 10 0 0 1 19 12.86" />
    <path d="M2 8.82a15 15 0 0 1 4.17-2.65" />
    <path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76" />
    <line x1="2" x2="22" y1="2" y2="22" className="text-red-400" />
  </svg>
);

const RefreshIcon = ({ spinning }: { spinning: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={spinning ? { animation: "spin .8s linear infinite" } : undefined}
  >
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    <path d="M3 21v-5h5" />
  </svg>
);

/* ──── Animated floating dots background ──── */
const FloatingDots = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
    {[...Array(6)].map((_, i) => (
      <span
        key={i}
        className="absolute rounded-full opacity-20 dark:opacity-10"
        style={{
          width: 10 + i * 8,
          height: 10 + i * 8,
          background: `hsl(${260 + i * 18}, 70%, 65%)`,
          left: `${10 + i * 15}%`,
          top: `${15 + ((i * 37) % 60)}%`,
          animation: `float${i % 3} ${4 + i}s ease-in-out infinite`,
        }}
      />
    ))}
  </div>
);

/* ──── Keyframes injected once ──── */
const styleId = "offline-guard-keyframes";
function ensureKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById(styleId)) return;
  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    @keyframes float0{0%,100%{transform:translateY(0)}50%{transform:translateY(-18px)}}
    @keyframes float1{0%,100%{transform:translateY(0)}50%{transform:translateY(14px)}}
    @keyframes float2{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-10px) rotate(8deg)}}
    @keyframes pulse-ring{0%{transform:scale(.85);opacity:.6}50%{transform:scale(1.05);opacity:.2}100%{transform:scale(.85);opacity:.6}}
    @keyframes fade-up{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
    @keyframes spin{to{transform:rotate(360deg)}}
  `;
  document.head.appendChild(style);
}

/**
 * OfflineGuard — Shows a beautiful, localized offline screen when
 * there's no internet connection. Supports ar / en / pt.
 * Required for Google Play: apps must not show blank/error screens offline.
 */
export function OfflineGuard({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [apiHealthy, setApiHealthy] = useState(true);
  const [checking, setChecking] = useState(false);
  // Track whether we were ever offline so we can refetch on reconnect
  const wasOffline = useRef(false);

  useEffect(() => {
    ensureKeyframes();
  }, []);

  const comeOnline = useCallback(() => {
    setIsOnline(true);
    // If we were offline, refresh all stale React-Query data
    if (wasOffline.current) {
      wasOffline.current = false;
      queryClient.invalidateQueries();
    }
  }, []);

  useEffect(() => {
    const goOnline = () => comeOnline();
    const goOffline = () => {
      wasOffline.current = true;
      setIsOnline(false);
      setApiHealthy(false);
    };

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [comeOnline]);

  // Auto-retry every 10 s when offline
  useEffect(() => {
    if (isOnline) return;
    const id = setInterval(async () => {
      try {
        const apiBase = (window as any).__API_BASE__ || "";
        const res = await fetch(apiBase + "/api/health", { method: "GET", cache: "no-store" });
        if (res.ok) {
          setApiHealthy(true);
          comeOnline();
        }
      } catch { /* still offline */ }
    }, 10_000);
    return () => clearInterval(id);
  }, [isOnline, comeOnline]);

  // While browser is online, keep probing API health and surface degraded mode.
  useEffect(() => {
    if (!isOnline) return;

    let cancelled = false;

    const probeApiHealth = async () => {
      try {
        const apiBase = (window as any).__API_BASE__ || "";
        const res = await fetch(apiBase + "/api/health", { method: "GET", cache: "no-store" });
        if (!cancelled) {
          setApiHealthy(res.ok);
        }
      } catch {
        if (!cancelled) {
          setApiHealthy(false);
        }
      }
    };

    probeApiHealth();
    const id = setInterval(probeApiHealth, 20_000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isOnline]);

  const handleRetry = useCallback(async () => {
    setChecking(true);
    try {
      const apiBase = (window as any).__API_BASE__ || "";
      const res = await fetch(apiBase + "/api/health", { method: "GET", cache: "no-store" });
      setApiHealthy(res.ok);
      if (res.ok) comeOnline();
    } catch {
      setIsOnline(false);
      setApiHealthy(false);
    } finally {
      setChecking(false);
    }
  }, [comeOnline]);

  const { isRTL } = getLocale();

  return (
    <>
      {/* Always keep children mounted so state/navigation is preserved */}
      {children}

      {/* Overlay — shown on top when offline */}
      {!isOnline && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-6
                     bg-gradient-to-br from-slate-50/95 via-purple-50/95 to-indigo-100/95
                     dark:from-gray-950/95 dark:via-gray-900/95 dark:to-indigo-950/95
                     backdrop-blur-sm transition-colors"
          dir={isRTL ? "rtl" : "ltr"}
        >
          {/* animated background */}
          <FloatingDots />

          <div
            className="relative z-10 text-center max-w-md w-full space-y-7"
            style={{ animation: "fade-up .6s ease-out both" }}
          >
            {/* Pulsing ring + icon */}
            <div className="relative mx-auto w-28 h-28 flex items-center justify-center">
              <span
                className="absolute inset-0 rounded-full bg-purple-200 dark:bg-purple-800/40"
                style={{ animation: "pulse-ring 2.5s ease-in-out infinite" }}
              />
              <div className="relative bg-white dark:bg-gray-800 w-24 h-24 rounded-full flex items-center justify-center shadow-lg shadow-purple-200/50 dark:shadow-purple-900/30">
                <WifiOffIcon />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 dark:text-gray-50 tracking-tight">
              {t("title")}
            </h1>

            {/* Description */}
            <p className="text-gray-500 dark:text-gray-400 leading-relaxed whitespace-pre-line text-base">
              {t("description")}
            </p>

            {/* Retry button */}
            <button
              onClick={handleRetry}
              disabled={checking}
              className="inline-flex items-center gap-2.5 px-8 py-3.5
                         bg-gradient-to-r from-purple-600 to-indigo-600
                         hover:from-purple-700 hover:to-indigo-700
                         disabled:from-purple-400 disabled:to-indigo-400
                         text-white rounded-2xl font-semibold text-base
                         shadow-lg shadow-purple-300/40 dark:shadow-purple-900/40
                         transition-all active:scale-95"
            >
              <RefreshIcon spinning={checking} />
              {checking ? t("checking") : t("retry")}
            </button>

            {/* Tip */}
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {t("tip")}
            </p>

            {/* Branding */}
            <p className="text-xs text-gray-300 dark:text-gray-600 pt-2 font-medium tracking-widest uppercase">
              Classify
            </p>
          </div>
        </div>
      )}

      {/* Degraded mode banner — user is online but backend is unhealthy */}
      {isOnline && !apiHealthy && (
        <div className="fixed top-0 inset-x-0 z-[9998] px-3 pt-3" dir={isRTL ? "rtl" : "ltr"}>
          <div className="mx-auto max-w-3xl rounded-xl border border-amber-300 bg-amber-50 text-amber-900 shadow-md">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-bold leading-tight">{t("title")}</p>
                <p className="text-xs opacity-90 line-clamp-2">{t("description")}</p>
              </div>
              <button
                onClick={handleRetry}
                disabled={checking}
                className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700 disabled:bg-amber-400"
              >
                {checking ? t("checking") : t("retry")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
