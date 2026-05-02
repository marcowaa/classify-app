import { useEffect, useRef } from 'react';

/**
 * useWakeLock — Keeps the screen awake while games are active.
 * Uses the Screen Wake Lock API (navigator.wakeLock).
 * Automatically releases on unmount or when the tab becomes hidden.
 */
export function useWakeLock(enabled = true) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return;

    let released = false;

    const requestWakeLock = async () => {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        wakeLockRef.current?.addEventListener('release', () => {
          wakeLockRef.current = null;
        });
      } catch {
        // Wake Lock request failed (low battery, permission denied, etc.)
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !released) {
        requestWakeLock();
      }
    };

    requestWakeLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      released = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [enabled]);
}
