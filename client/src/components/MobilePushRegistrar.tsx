import { useEffect } from "react";
import { PushNotifications } from "@capacitor/push-notifications";
import {
  emitNotificationPermissionRequired,
  markNotificationPermissionGranted,
} from "@/lib/notificationPermissionSignals";
import { emitNotificationSync } from "@/lib/notificationRealtime";

const DEFAULT_RETRY_MS = 15 * 60 * 1000;
const DENIED_RETRY_MS = 6 * 60 * 60 * 1000;

type PushRole = "child" | "parent" | "teacher";

type MobilePushRegistrarProps = {
  tokenStorageKey: string;
  apiSubscriptionEndpoint: string;
  role: PushRole;
};

function getOrCreateDeviceId(role: PushRole): string {
  const key = `${role}_mobile_push_device_id`;
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const created =
    globalThis.crypto?.randomUUID?.() || `mob_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(key, created);
  return created;
}

function isNativeCapacitor(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as any)?.Capacitor?.isNativePlatform?.();
}

function getNativePlatform(): "android" | "ios" | "web" {
  const platform = (window as any)?.Capacitor?.getPlatform?.() || "web";
  if (platform === "android" || platform === "ios") return platform;
  return "web";
}

async function ensureAndroidChannels() {
  // High-impact channels matching backend notification levels.
  await PushNotifications.createChannel({
    id: "critical_alerts",
    name: "Critical Alerts",
    description: "Critical and blocking notifications",
    importance: 5,
    visibility: 1,
    sound: "default",
    vibration: true,
    lights: true,
    lightColor: "#FF1744",
  });

  await PushNotifications.createChannel({
    id: "high_priority",
    name: "High Priority",
    description: "Urgent notifications",
    importance: 4,
    visibility: 1,
    sound: "default",
    vibration: true,
    lights: true,
    lightColor: "#FF9100",
  });

  await PushNotifications.createChannel({
    id: "general",
    name: "General",
    description: "Normal notifications",
    importance: 3,
    visibility: 1,
    sound: "default",
    vibration: false,
    lights: true,
    lightColor: "#00C853",
  });
}

export function MobilePushRegistrar({ tokenStorageKey, apiSubscriptionEndpoint, role }: MobilePushRegistrarProps) {
  useEffect(() => {
    if (!isNativeCapacitor()) return;

    const token = localStorage.getItem(tokenStorageKey);
    if (!token) return;

    const platform = getNativePlatform();
    if (platform !== "android" && platform !== "ios") return;

    let disposed = false;
    let retryTimer: number | null = null;
    let registrationHandle: { remove: () => Promise<void> } | null = null;
    let registrationErrorHandle: { remove: () => Promise<void> } | null = null;
    let foregroundPushHandle: { remove: () => Promise<void> } | null = null;
    let actionPerformedHandle: { remove: () => Promise<void> } | null = null;

    const scheduleRetry = (ms: number) => {
      if (disposed) return;
      if (retryTimer) window.clearTimeout(retryTimer);
      retryTimer = window.setTimeout(() => {
        run().catch(() => undefined);
      }, ms);
    };

    const run = async () => {
      try {
        const permissionState = await PushNotifications.checkPermissions();
        let receivePermission = permissionState.receive;

        if (receivePermission !== "granted") {
          const requested = await PushNotifications.requestPermissions();
          receivePermission = requested.receive;
        }

        if (receivePermission !== "granted") {
          emitNotificationPermissionRequired(role, receivePermission === "denied" ? "denied" : "default");
          scheduleRetry(receivePermission === "denied" ? DENIED_RETRY_MS : DEFAULT_RETRY_MS);
          return;
        }

        markNotificationPermissionGranted(role);

        if (platform === "android") {
          try {
            await ensureAndroidChannels();
          } catch (error) {
            console.warn("Mobile push channel setup warning:", error);
          }
        }

        registrationHandle = await PushNotifications.addListener("registration", async (result) => {
          if (disposed || !result?.value) return;

          try {
            const saveRes = await fetch(apiSubscriptionEndpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                platform,
                token: result.value,
                deviceId: getOrCreateDeviceId(role),
              }),
            });

            if (!saveRes.ok) {
              emitNotificationPermissionRequired(role, "subscription_error");
              scheduleRetry(DEFAULT_RETRY_MS);
            }
          } catch (error) {
            console.error("Mobile push subscription save error:", error);
            emitNotificationPermissionRequired(role, "subscription_error");
            scheduleRetry(DEFAULT_RETRY_MS);
          }
        });

        registrationErrorHandle = await PushNotifications.addListener("registrationError", (error) => {
          if (disposed) return;
          console.error("Mobile push registration error:", error);
          emitNotificationPermissionRequired(role, "registration_error");
          scheduleRetry(DEFAULT_RETRY_MS);
        });

        foregroundPushHandle = await PushNotifications.addListener("pushNotificationReceived", (notification) => {
          if (disposed) return;
          const data = (notification?.data || {}) as Record<string, any>;
          emitNotificationSync({
            source: "mobile-push",
            title: notification?.title || "إشعار جديد",
            body: notification?.body || "لديك تحديث جديد",
            url: typeof data.url === "string" ? data.url : "/notifications",
          });
          window.dispatchEvent(
            new CustomEvent("classify:foreground-notification", {
              detail: {
                title: notification?.title || "إشعار جديد",
                body: notification?.body || "لديك تحديث جديد",
                url: typeof data.url === "string" ? data.url : "/notifications",
              },
            })
          );
        });

        actionPerformedHandle = await PushNotifications.addListener("pushNotificationActionPerformed", (event) => {
          if (disposed) return;
          const data = (event?.notification?.data || {}) as Record<string, any>;
          const url = typeof data.url === "string" ? data.url : "/notifications";
          emitNotificationSync({ source: "mobile-push", url });
          window.dispatchEvent(
            new CustomEvent("classify:notification-open", {
              detail: { url },
            })
          );
        });

        await PushNotifications.register();
      } catch (error) {
        console.error("Mobile push registrar init error:", error);
        emitNotificationPermissionRequired(role, "registration_error");
        scheduleRetry(DEFAULT_RETRY_MS);
      }
    };

    run().catch(() => undefined);

    return () => {
      disposed = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      if (registrationHandle) {
        registrationHandle.remove().catch(() => undefined);
      }
      if (registrationErrorHandle) {
        registrationErrorHandle.remove().catch(() => undefined);
      }
      if (foregroundPushHandle) {
        foregroundPushHandle.remove().catch(() => undefined);
      }
      if (actionPerformedHandle) {
        actionPerformedHandle.remove().catch(() => undefined);
      }
    };
  }, [apiSubscriptionEndpoint, role, tokenStorageKey]);

  return null;
}

export default MobilePushRegistrar;
