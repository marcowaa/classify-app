const NOTIFICATION_SYNC_EVENT = "classify:notifications-updated";

export type NotificationSyncDetail = {
  source?: "sse" | "sw" | "mobile-push" | "action" | "manual";
  title?: string;
  body?: string;
  url?: string;
};

export function emitNotificationSync(detail: NotificationSyncDetail = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(NOTIFICATION_SYNC_EVENT, { detail }));
}

export function notificationSyncEventName() {
  return NOTIFICATION_SYNC_EVENT;
}
