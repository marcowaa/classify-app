import { createHash } from "crypto";
import {
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_STYLES,
  NOTIFICATION_TYPES,
  type NotificationPriority,
  type NotificationStyle,
  type NotificationType,
} from "../../shared/notificationTypes";

type RecipientType = "child" | "parent" | "admin" | "teacher" | "school";
type Channel = "in_app" | "email" | "web_push" | "mobile_push";

export type NotificationDeliveryProfile = {
  style: NotificationStyle;
  priority: NotificationPriority;
  soundAlert: boolean;
  vibration: boolean;
  channels: Channel[];
  dedupeWindowSeconds: number;
};

const HIGH_URGENCY_TYPES = new Set<NotificationType>([
  NOTIFICATION_TYPES.SECURITY_ALERT,
  NOTIFICATION_TYPES.LOGIN_CODE_REQUEST,
  NOTIFICATION_TYPES.DEPOSIT_REQUEST,
  NOTIFICATION_TYPES.SHIPMENT_REQUESTED,
  NOTIFICATION_TYPES.PURCHASE_PAID,
  NOTIFICATION_TYPES.TASK_NOTIFICATION_ESCALATION,
]);

const WARNING_TYPES = new Set<NotificationType>([
  NOTIFICATION_TYPES.DEPOSIT_REJECTED,
  NOTIFICATION_TYPES.LOGIN_REJECTED,
  NOTIFICATION_TYPES.LOW_POINTS_WARNING,
  NOTIFICATION_TYPES.PURCHASE_REJECTED,
]);

function levelFromType(type: NotificationType): NotificationPriority {
  if (HIGH_URGENCY_TYPES.has(type)) return NOTIFICATION_PRIORITIES.URGENT;
  if (WARNING_TYPES.has(type)) return NOTIFICATION_PRIORITIES.WARNING;
  return NOTIFICATION_PRIORITIES.NORMAL;
}

export function resolveNotificationProfile(input: {
  type: NotificationType;
  recipientType: RecipientType;
  requestedPriority?: NotificationPriority;
  requestedStyle?: NotificationStyle;
  requestedSound?: boolean;
  requestedVibration?: boolean;
  requestedChannels?: Channel[];
}): NotificationDeliveryProfile {
  const basePriority = input.requestedPriority || levelFromType(input.type);

  const defaultStyle: NotificationStyle =
    basePriority === NOTIFICATION_PRIORITIES.BLOCKING
      ? NOTIFICATION_STYLES.FULLSCREEN
      : basePriority === NOTIFICATION_PRIORITIES.URGENT
        ? NOTIFICATION_STYLES.MODAL
        : basePriority === NOTIFICATION_PRIORITIES.WARNING
          ? NOTIFICATION_STYLES.BANNER
          : NOTIFICATION_STYLES.TOAST;

  const soundAlert =
    typeof input.requestedSound === "boolean"
      ? input.requestedSound
      : basePriority === NOTIFICATION_PRIORITIES.URGENT || basePriority === NOTIFICATION_PRIORITIES.BLOCKING;

  const vibration =
    typeof input.requestedVibration === "boolean"
      ? input.requestedVibration
      : basePriority === NOTIFICATION_PRIORITIES.URGENT || basePriority === NOTIFICATION_PRIORITIES.BLOCKING;

  const defaultChannels: Channel[] = ["in_app"];
  const supportsPushChannels =
    input.recipientType === "parent" ||
    input.recipientType === "child" ||
    input.recipientType === "teacher" ||
    input.recipientType === "admin" ||
    input.recipientType === "school";

  // Keep delivery reliable even when app is closed by defaulting to push channels
  // for recipients that support device/web subscriptions.
  if (supportsPushChannels) {
    defaultChannels.push("web_push", "mobile_push");
  }

  const dedupeWindowSeconds =
    basePriority === NOTIFICATION_PRIORITIES.BLOCKING || basePriority === NOTIFICATION_PRIORITIES.URGENT
      ? 45
      : basePriority === NOTIFICATION_PRIORITIES.WARNING
        ? 90
        : 120;

  return {
    style: input.requestedStyle || defaultStyle,
    priority: basePriority,
    soundAlert,
    vibration,
    channels: input.requestedChannels?.length ? input.requestedChannels : defaultChannels,
    dedupeWindowSeconds,
  };
}

export function buildNotificationDedupeKey(input: {
  recipientType: RecipientType;
  recipientId: string;
  type: NotificationType;
  relatedId?: string | null;
  title?: string | null;
  message: string;
  metadata?: Record<string, any> | null;
}): string {
  const semanticCategory = String(input.metadata?.category || "").trim().toLowerCase();
  const normalizedTitle = String(input.title || "").trim().toLowerCase();
  const normalizedMessage = String(input.message || "").trim().toLowerCase().slice(0, 180);
  const relatedId = String(input.relatedId || "").trim().toLowerCase();

  const basis = [
    input.recipientType,
    input.recipientId,
    input.type,
    relatedId,
    semanticCategory,
    normalizedTitle,
    normalizedMessage,
  ].join("|");

  return createHash("sha256").update(basis).digest("hex");
}
