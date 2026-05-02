import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { X, Sparkles, ExternalLink } from "lucide-react";
import { FEATURE_HIGHLIGHTS, type FeatureHighlight } from "@/lib/featureHighlightCatalog";

type HistoryMap = Record<string, { count: number; lastShown: number }>;

const HISTORY_KEY = "classify-feature-pulse-history";
const SESSION_KEY = "classify-feature-pulse-session";
const MAX_PER_SESSION = 8;
const MIN_DELAY_MS = 25_000;
const MAX_DELAY_MS = 90_000;

function getHistory(): HistoryMap {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveHistory(history: HistoryMap) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function getSessionCount(): number {
  try {
    return Number(sessionStorage.getItem(SESSION_KEY) || "0");
  } catch {
    return 0;
  }
}

function incrementSessionCount() {
  sessionStorage.setItem(SESSION_KEY, String(getSessionCount() + 1));
}

function randomDelay() {
  return MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
}

function pickFeature(pool: FeatureHighlight[]): FeatureHighlight | null {
  if (!pool.length) return null;

  const history = getHistory();
  const scored = pool
    .map((item) => {
      const h = history[item.id] || { count: 0, lastShown: 0 };
      const recencyMinutes = Math.max(1, (Date.now() - h.lastShown) / 60_000);
      const score = (10 - Math.min(h.count, 10)) * 80 + Math.min(recencyMinutes, 500);
      return { item, score };
    })
    .sort((a, b) => b.score - a.score);

  const top = scored.slice(0, Math.min(4, scored.length));
  if (!top.length) return null;

  return top[Math.floor(Math.random() * top.length)]?.item || null;
}

function shouldRunOnPath(pathname: string): boolean {
  if (!pathname) return false;
  if (pathname.startsWith("/admin") || pathname.includes("auth")) return false;

  return (
    pathname.startsWith("/parent") ||
    pathname === "/wallet" ||
    pathname === "/notifications" ||
    pathname === "/subjects" ||
    pathname === "/settings"
  );
}

async function notifySystem(feature: FeatureHighlight) {
  if (typeof window === "undefined" || typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;

  try {
    const reg = await navigator.serviceWorker?.ready;
    if (!reg) return;

    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "SHOW_FEATURE_NOTIFICATION",
        payload: {
          title: feature.title,
          body: feature.message,
          url: feature.route,
        },
      });
      return;
    }

    await reg.showNotification(feature.title, {
      body: feature.message,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-96.png",
      data: { url: feature.route },
      tag: `feature-${feature.id}`,
    });
  } catch {
  }
}

export function ParentFeaturePulse() {
  const [location, navigate] = useLocation();
  const [feature, setFeature] = useState<FeatureHighlight | null>(null);
  const [closing, setClosing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isParentSession = useMemo(() => Boolean(localStorage.getItem("token") && !localStorage.getItem("childToken")), []);

  const schedule = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!isParentSession) return;
    if (!shouldRunOnPath(location)) return;
    if (getSessionCount() >= MAX_PER_SESSION) return;

    timerRef.current = setTimeout(async () => {
      if (!isParentSession || !shouldRunOnPath(window.location.pathname)) {
        schedule();
        return;
      }

      const picked = pickFeature(FEATURE_HIGHLIGHTS);
      if (!picked) return;

      const history = getHistory();
      history[picked.id] = {
        count: (history[picked.id]?.count || 0) + 1,
        lastShown: Date.now(),
      };
      saveHistory(history);
      incrementSessionCount();

      setFeature(picked);
      setClosing(false);
      await notifySystem(picked);
    }, randomDelay());
  }, [isParentSession, location]);

  useEffect(() => {
    schedule();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [schedule]);

  const close = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setFeature(null);
      setClosing(false);
      schedule();
    }, 220);
  }, [schedule]);

  const openTarget = useCallback(() => {
    if (!feature) return;
    navigate(feature.route);
    close();
  }, [close, feature, navigate]);

  useEffect(() => {
    if (!feature || closing) return;
    const auto = setTimeout(() => close(), 12000);
    return () => clearTimeout(auto);
  }, [feature, closing, close]);

  if (!feature) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center p-4 pointer-events-none">
      <div
        className={`fixed inset-0 bg-black/35 backdrop-blur-sm pointer-events-auto transition-opacity duration-200 ${closing ? "opacity-0" : "opacity-100"}`}
        onClick={close}
      />

      <div
        className={`pointer-events-auto relative w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 shadow-2xl overflow-hidden ring-1 ring-black/10 dark:ring-white/10 transition-all duration-200 ${closing ? "opacity-0 translate-y-4 scale-95" : "opacity-100 translate-y-0 scale-100"}`}
      >
        <button
          onClick={close}
          className="absolute top-3 left-3 z-10 h-8 w-8 rounded-full bg-black/45 text-white flex items-center justify-center"
          aria-label="Close feature popup"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="absolute top-3 right-3 z-10 px-2 py-1 rounded-full text-[10px] font-semibold bg-indigo-600 text-white flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          ميزة قوية
        </div>

        <button onClick={openTarget} className="w-full text-right block p-6 pt-12">
          <div className="text-4xl mb-3">{feature.emoji}</div>
          <h3 className="text-xl font-extrabold text-gray-900 dark:text-white leading-tight">{feature.title}</h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{feature.message}</p>
        </button>

        <div className="px-6 pb-5 flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-4">
          <button onClick={openTarget} className="text-sm font-bold text-indigo-600 dark:text-indigo-300 inline-flex items-center gap-1.5 hover:underline">
            <ExternalLink className="h-4 w-4" />
            {feature.cta}
          </button>
          <button onClick={close} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            لاحقًا
          </button>
        </div>
      </div>
    </div>
  );
}

export default ParentFeaturePulse;
