import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { X, ExternalLink, Megaphone } from "lucide-react";

/**
 * RandomAdPopup — shows ads at random intervals during app usage.
 * - Only shows when user is logged in (has token in localStorage)
 * - Tracks shown ads per user in localStorage to avoid repetition
 * - Random delay between 45s–120s between popups
 * - Max 3 popups per session
 * - Doesn't show on home page (/) or admin pages
 */

const STORAGE_KEY = "classify-ad-popup-history";
const SESSION_KEY = "classify-ad-popup-session";
const MAX_PER_SESSION = 3;
const MIN_DELAY_MS = 45_000;   // 45 seconds minimum
const MAX_DELAY_MS = 120_000;  // 120 seconds maximum

interface Ad {
  id: string;
  title: string;
  content: string;
  imageUrl: string | null;
  linkUrl: string | null;
  targetAudience: string;
  priority: number;
}

interface AdHistory {
  [adId: string]: { count: number; lastShown: number };
}

function getAdHistory(): AdHistory {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveAdHistory(history: AdHistory) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function getSessionCount(): number {
  try {
    return parseInt(sessionStorage.getItem(SESSION_KEY) || "0", 10);
  } catch {
    return 0;
  }
}

function incrementSessionCount() {
  sessionStorage.setItem(SESSION_KEY, String(getSessionCount() + 1));
}

function pickRandomAd(ads: Ad[]): Ad | null {
  if (ads.length === 0) return null;
  const history = getAdHistory();

  // Score ads: prefer less-shown ads + higher priority
  const scored = ads.map((ad) => {
    const h = history[ad.id] || { count: 0, lastShown: 0 };
    const recency = Date.now() - h.lastShown;
    // Lower count = higher score, higher priority = higher score, more recency = higher score
    const score = (10 - Math.min(h.count, 10)) * 100 + ad.priority * 50 + Math.min(recency / 60000, 1000);
    return { ad, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Pick from top 3 with some randomness
  const top = scored.slice(0, Math.min(3, scored.length));
  const pick = top[Math.floor(Math.random() * top.length)];
  if (!pick) return null;
  return pick.ad;
}

function getRandomDelay(): number {
  return MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
}

function isSensitiveWindow(pathname: string): boolean {
  if (sessionStorage.getItem("classify-child-silent-window") === "1") {
    return true;
  }

  return (
    pathname.includes("checkout")
    || pathname.includes("payment")
    || pathname.includes("otp")
    || pathname.includes("auth")
    || pathname.startsWith("/child-tasks")
  );
}

export function RandomAdPopup() {
  const { t } = useTranslation();
  const [visibleAd, setVisibleAd] = useState<Ad | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Determine audience from token type
  const token = localStorage.getItem("token");
  const childToken = localStorage.getItem("childToken");
  const audience = childToken ? "children" : token ? "parents" : null;

  const { data: adsData } = useQuery<Ad[]>({
    queryKey: ["/api/ads", audience || "none"],
    queryFn: async () => {
      if (!audience) return [];
      const res = await fetch(`/api/ads?audience=${audience}`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!audience,
  });

  const adsList = Array.isArray(adsData) ? adsData : [];

  const scheduleNext = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    // Check if we should show more
    if (getSessionCount() >= MAX_PER_SESSION) return;
    if (adsList.length === 0) return;

    // Don't show on home, admin, or auth pages
    const path = window.location.pathname;
    if (path === "/" || path.startsWith("/admin") || isSensitiveWindow(path)) return;

    const delay = getRandomDelay();
    timerRef.current = setTimeout(() => {
      // Re-check conditions at display time
      const currentPath = window.location.pathname;
      if (currentPath === "/" || currentPath.startsWith("/admin") || isSensitiveWindow(currentPath)) {
        scheduleNext();
        return;
      }
      if (getSessionCount() >= MAX_PER_SESSION) return;

      const ad = pickRandomAd(adsList);
      if (ad) {
        // Record in history
        const history = getAdHistory();
        history[ad.id] = {
          count: (history[ad.id]?.count || 0) + 1,
          lastShown: Date.now(),
        };
        saveAdHistory(history);
        incrementSessionCount();

        // Track view
        fetch(`/api/ads/${ad.id}/view`, { method: "POST" }).catch(() => {});

        setVisibleAd(ad);
        setIsClosing(false);
      }
    }, delay);
  }, [adsList]);

  // Start scheduling when ads are loaded
  useEffect(() => {
    if (adsList.length > 0 && audience) {
      scheduleNext();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [adsList.length, audience, scheduleNext]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setVisibleAd(null);
      setIsClosing(false);
      scheduleNext();
    }, 300);
  }, [scheduleNext]);

  const handleClick = useCallback((ad: Ad) => {
    const authToken = localStorage.getItem("token");
    fetch(`/api/ads/${ad.id}/click`, {
      method: "POST",
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
    }).catch(() => {});
    if (ad.linkUrl) {
      if (ad.linkUrl.startsWith("/")) {
        window.location.href = ad.linkUrl;
        return;
      }
      const url = /^https?:\/\//i.test(ad.linkUrl) ? ad.linkUrl : `https://${ad.linkUrl}`;
      window.open(url, "_blank", "noopener,noreferrer");
    }
    handleClose();
  }, [handleClose]);

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    if (visibleAd && !isClosing) {
      const autoClose = setTimeout(handleClose, 8000);
      return () => clearTimeout(autoClose);
    }
  }, [visibleAd, isClosing, handleClose]);

  if (!visibleAd) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 pointer-events-none">
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 backdrop-blur-sm pointer-events-auto transition-opacity duration-300 ${isClosing ? "opacity-0" : "opacity-100"}`}
        onClick={handleClose}
      />

      {/* Popup Card */}
      <div
        className={`relative w-full max-w-md pointer-events-auto transition-all duration-300 transform ${
          isClosing
            ? "translate-y-8 opacity-0 scale-95"
            : "translate-y-0 opacity-100 scale-100"
        }`}
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-gray-200 dark:ring-gray-700">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-3 left-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Sponsored label */}
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1 px-2 py-1 rounded-full bg-black/30 backdrop-blur-sm text-white/80 text-[10px] font-medium">
            <Megaphone className="h-3 w-3" />
            إعلان
          </div>

          {/* Content */}
          <div className="cursor-pointer" onClick={() => handleClick(visibleAd)}>
            {visibleAd.imageUrl ? (
              <div className="relative">
                <img
                  src={visibleAd.imageUrl}
                  alt={visibleAd.title}
                  className="w-full h-48 object-cover"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    img.style.display = "none";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-0 inset-x-0 p-5">
                  <h3 className="text-white font-bold text-lg leading-tight">{visibleAd.title}</h3>
                  <p className="text-white/80 text-sm mt-1 line-clamp-2">{visibleAd.content}</p>
                </div>
              </div>
            ) : (
              <div className="p-6 pt-12">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">{visibleAd.title}</h3>
                <p className="text-sm mt-2 text-gray-600 dark:text-gray-400 line-clamp-3">{visibleAd.content}</p>
              </div>
            )}
          </div>

          {/* Action bar */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-700">
            {visibleAd.linkUrl ? (
              <button
                onClick={() => handleClick(visibleAd)}
                className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                عرض التفاصيل
              </button>
            ) : (
              <span />
            )}
            <button
              onClick={handleClose}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              إغلاق
            </button>
          </div>

          {/* Auto-dismiss progress bar */}
          <div className="h-0.5 bg-gray-100 dark:bg-gray-700">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
              style={{
                animation: "shrink-bar 8s linear forwards",
              }}
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shrink-bar {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
