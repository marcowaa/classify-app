// Phase 1.4: Gift Event → In-App Notification Handlers
// Consumes events from server/giftEvents.ts and creates in-app notifications

import { giftEventEmitter, type GiftEvent } from "./giftEvents";
import { createNotification } from "./notifications";
import { NOTIFICATION_STYLES, NOTIFICATION_TYPES } from "../shared/notificationTypes";


/**
 * Initialize all gift event listeners (Phase 1.4)
 * Called on server startup to set up notification consumption
 */
export async function initializeGiftNotificationHandlers(): Promise<void> {
  console.log("[NOTIFICATION_HANDLERS] Initializing gift event listeners...");

  // Listen for gift.unlocked → notify child
  giftEventEmitter.on("gift.unlocked", async (event: GiftEvent) => {
    await handleGiftUnlocked(event);
  });

  // Listen for gift.activated → notify child
  giftEventEmitter.on("gift.activated", async (event: GiftEvent) => {
    await handleGiftActivated(event);
  });

  // Listen for gift.sent → optional: log only
  giftEventEmitter.on("gift.sent", async (event: GiftEvent) => {
    console.log(`[NOTIFICATION] Gift sent: ${event.giftId} from parent ${event.parentId}`);
  });

  // Listen for gift.revoked → optional: notify if applicable
  giftEventEmitter.on("gift.revoked", async (event: GiftEvent) => {
    console.log(`[NOTIFICATION] Gift revoked: ${event.giftId}`);
  });

  console.log("[NOTIFICATION_HANDLERS] ✅ All listeners initialized");
}

/**
 * Handle gift.unlocked event → create modal notification
 * Child has earned enough points to claim their gift
 */
async function handleGiftUnlocked(event: GiftEvent): Promise<void> {
  try {
    await createNotification({
      childId: event.childId,
      type: NOTIFICATION_TYPES.GIFT_UNLOCKED,
      title: "🎁 تم فتح الهدية!",
      message: "أحسنت! لقد جمعت نقاطاً كافية للحصول على هديتك!",
      style: NOTIFICATION_STYLES.MODAL,
      priority: "normal",
      soundAlert: true,
      vibration: false,
    });

    console.log(
      `[NOTIFICATION] Gift unlocked notification created for child ${event.childId}`
    );
  } catch (error: any) {
    console.error("[NOTIFICATION_ERROR] Failed to create gift_unlocked notification:", error.message);
  }
}

/**
 * Handle gift.activated event → create toast notification
 * Child has successfully claimed their gift
 */
async function handleGiftActivated(event: GiftEvent): Promise<void> {
  try {
    await createNotification({
      childId: event.childId,
      type: NOTIFICATION_TYPES.GIFT_ACTIVATED,
      title: "✨ تم استلام الهدية!",
      message: "تهانينا! لقد حصلت على هديتك بنجاح!",
      style: NOTIFICATION_STYLES.TOAST,
      priority: "normal",
      soundAlert: false,
      vibration: false,
    });

    console.log(
      `[NOTIFICATION] Gift activated notification created for child ${event.childId}`
    );
  } catch (error: any) {
    console.error("[NOTIFICATION_ERROR] Failed to create gift_activated notification:", error.message);
  }
}

export type { GiftEvent };
