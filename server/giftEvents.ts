// Gift event emitter for Phase 1.3 & 1.4 integration
// Phase 1.3 emits events, Phase 1.4 consumes for notifications

import { EventEmitter } from "events";

type GiftEventType = "gift.sent" | "gift.unlocked" | "gift.activated" | "gift.revoked";

interface GiftEvent {
  type: GiftEventType;
  giftId: string;
  parentId: string;
  childId: string;
  productId: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// EventEmitter for Phase 1.4 to consume gift events
export const giftEventEmitter = new EventEmitter();

export function emitGiftEvent(event: GiftEvent): void {
  // Log for debugging
  console.log(`[GIFT_EVENT] ${event.type}`, {
    giftId: event.giftId,
    childId: event.childId,
    productId: event.productId,
    timestamp: event.timestamp.toISOString(),
  });
  
  // Emit event for Phase 1.4 listeners (notifications)
  giftEventEmitter.emit(event.type, event);
}

export type { GiftEvent, GiftEventType };
