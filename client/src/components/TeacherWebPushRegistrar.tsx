import { useEffect } from "react";
import {
  emitNotificationPermissionRequired,
  markNotificationPermissionGranted,
} from "@/lib/notificationPermissionSignals";

const DEFAULT_RETRY_MS = 15 * 60 * 1000;
const DENIED_RETRY_MS = 6 * 60 * 60 * 1000;
const HEARTBEAT_SYNC_MS = 30 * 60 * 1000;
const LAST_PERMISSION_PROMPT_KEY = "teacher_push_last_permission_prompt_at";

function base64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function getOrCreateDeviceId(): string {
  const key = "teacher_push_device_id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const created = (globalThis.crypto?.randomUUID?.() || `dev_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  localStorage.setItem(key, created);
  return created;
}

export function TeacherWebPushRegistrar() {
  useEffect(() => {
    if ((window as any).__TEMP_DISABLE_CLIENT_CACHE__ === true) return;
    const token = localStorage.getItem("teacherToken");
    if (!token) return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;

    let cancelled = false;
    let retryTimer: number | null = null;
    let heartbeatTimer: number | null = null;

    const scheduleRetry = (ms: number) => {
      if (cancelled) return;
      if (retryTimer) window.clearTimeout(retryTimer);
      retryTimer = window.setTimeout(() => {
        run().catch(() => undefined);
      }, ms);
    };

    const canPromptAgain = (retryMs: number): boolean => {
      const lastRaw = localStorage.getItem(LAST_PERMISSION_PROMPT_KEY);
      const last = lastRaw ? Number(lastRaw) : 0;
      if (!Number.isFinite(last) || last <= 0) return true;
      return Date.now() - last >= retryMs;
    };

    const markPromptAttempt = () => {
      localStorage.setItem(LAST_PERMISSION_PROMPT_KEY, String(Date.now()));
    };

    const run = async () => {
      try {
        if (document.visibilityState !== "visible") {
          scheduleRetry(DEFAULT_RETRY_MS);
          return;
        }

        const registration = await navigator.serviceWorker.register("/sw.js");

        let permission = Notification.permission;
        if (permission === "default" && canPromptAgain(DEFAULT_RETRY_MS)) {
          markPromptAttempt();
          permission = await Notification.requestPermission();
        } else if (permission === "denied" && canPromptAgain(DENIED_RETRY_MS)) {
          markPromptAttempt();
          permission = await Notification.requestPermission();
        }

        if (permission !== "granted") {
          emitNotificationPermissionRequired("teacher", permission === "denied" ? "denied" : "default");
          scheduleRetry(permission === "denied" ? DENIED_RETRY_MS : DEFAULT_RETRY_MS);
          return;
        }

        markNotificationPermissionGranted("teacher");

        const keyRes = await fetch("/api/teacher/push-public-key", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!keyRes.ok) {
          emitNotificationPermissionRequired("teacher", "subscription_error");
          scheduleRetry(DEFAULT_RETRY_MS);
          return;
        }
        const keyJson = await keyRes.json();
        const publicKey = keyJson?.data?.publicKey;
        if (!publicKey) {
          emitNotificationPermissionRequired("teacher", "subscription_error");
          scheduleRetry(DEFAULT_RETRY_MS);
          return;
        }

        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          const vapidKey = base64ToUint8Array(publicKey);
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: vapidKey as unknown as BufferSource,
          });
        }

        if (!subscription || cancelled) {
          emitNotificationPermissionRequired("teacher", "subscription_error");
          scheduleRetry(DEFAULT_RETRY_MS);
          return;
        }

        const json = subscription.toJSON() as any;
        const endpoint = json?.endpoint;
        const p256dh = json?.keys?.p256dh;
        const auth = json?.keys?.auth;
        if (!endpoint || !p256dh || !auth) {
          emitNotificationPermissionRequired("teacher", "subscription_error");
          scheduleRetry(DEFAULT_RETRY_MS);
          return;
        }

        const saveRes = await fetch("/api/teacher/push-subscriptions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            platform: "web",
            endpoint,
            p256dh,
            auth,
            deviceId: getOrCreateDeviceId(),
          }),
        });

        if (!saveRes.ok) {
          emitNotificationPermissionRequired("teacher", "subscription_error");
          scheduleRetry(DEFAULT_RETRY_MS);
        }
      } catch (error) {
        console.error("Teacher web push registration error:", error);
        emitNotificationPermissionRequired("teacher", "registration_error");
        scheduleRetry(DEFAULT_RETRY_MS);
      }
    };

    const onWindowFocus = () => {
      run().catch(() => undefined);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        run().catch(() => undefined);
      }
    };

    window.addEventListener("focus", onWindowFocus);
    document.addEventListener("visibilitychange", onVisibility);

    run().catch(() => undefined);
    heartbeatTimer = window.setInterval(() => {
      run().catch(() => undefined);
    }, HEARTBEAT_SYNC_MS);

    return () => {
      cancelled = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      if (heartbeatTimer) window.clearInterval(heartbeatTimer);
      window.removeEventListener("focus", onWindowFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}

export default TeacherWebPushRegistrar;
