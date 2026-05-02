export type NotificationPermissionRole = "parent" | "child" | "teacher";

export type NotificationPermissionReason =
  | "default"
  | "denied"
  | "registration_error"
  | "subscription_error"
  | "unknown";

type NotificationPermissionDetail = {
  role: NotificationPermissionRole;
  reason: NotificationPermissionReason;
};

const EVENT_NAME = "classify:notification-permission-required";
const GRANTED_KEY_PREFIX = "classify_notification_permission_granted_";

function getGrantedKey(role: NotificationPermissionRole): string {
  return `${GRANTED_KEY_PREFIX}${role}`;
}

export function emitNotificationPermissionRequired(
  role: NotificationPermissionRole,
  reason: NotificationPermissionReason
) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<NotificationPermissionDetail>(EVENT_NAME, {
      detail: { role, reason },
    })
  );
}

export function onNotificationPermissionRequired(
  handler: (detail: NotificationPermissionDetail) => void
): () => void {
  if (typeof window === "undefined") return () => undefined;

  const listener = (event: Event) => {
    const detail = (event as CustomEvent<NotificationPermissionDetail>).detail;
    if (!detail?.role) return;
    handler(detail);
  };

  window.addEventListener(EVENT_NAME, listener as EventListener);
  return () => {
    window.removeEventListener(EVENT_NAME, listener as EventListener);
  };
}

export function markNotificationPermissionGranted(role: NotificationPermissionRole) {
  if (typeof window === "undefined") return;
  localStorage.setItem(getGrantedKey(role), "1");
}

export function hasNotificationPermissionBeenGranted(role: NotificationPermissionRole): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(getGrantedKey(role)) === "1";
}
