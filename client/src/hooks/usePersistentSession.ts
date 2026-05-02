import { useEffect } from "react";

const SESSION_REFRESH_INTERVAL_MS = 15 * 60 * 1000;

/**
 * Keeps parent login alive across long app sessions using trusted-device refresh.
 * It never overrides an existing token and only runs when device trust markers exist.
 */
export function usePersistentSession() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;
    let intervalId: number | null = null;

    const tryRefresh = async () => {
      if (cancelled) return;

      const hasToken = !!localStorage.getItem("token");
      if (hasToken) return;

      const deviceTrusted = localStorage.getItem("deviceTrusted") === "true";
      const deviceId = localStorage.getItem("deviceId") || "";
      if (!deviceTrusted || !deviceId) return;

      try {
        const res = await fetch("/api/auth/device/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ deviceId }),
        });

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            localStorage.removeItem("deviceTrusted");
          }
          return;
        }

        const json = await res.json();
        const data = json?.data || json;

        if (data?.token) {
          localStorage.setItem("token", String(data.token));
          window.dispatchEvent(new CustomEvent("classify:session-refreshed"));
        }
        if (data?.parentId) {
          localStorage.setItem("userId", String(data.parentId));
        }
        if (data?.deviceTrusted) {
          localStorage.setItem("deviceTrusted", "true");
        }
      } catch {
        // Silent retry on next focus/interval
      }
    };

    const onFocus = () => {
      tryRefresh().catch(() => undefined);
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    tryRefresh().catch(() => undefined);
    intervalId = window.setInterval(() => {
      tryRefresh().catch(() => undefined);
    }, SESSION_REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, []);
}

export default usePersistentSession;
