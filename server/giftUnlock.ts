// Gift unlock helper (Phase 1.3)
// Automatically unlocks gifts when points threshold is reached

import { storage } from "./storage";
import { gifts, children, activityLog } from "../shared/schema";
import { eq, and, sql, lte } from "drizzle-orm";
import { emitGiftEvent } from "./giftEvents";

const db = storage.db;

/**
 * Unlocks eligible gifts for a child when points threshold is reached
 * Idempotent: multiple calls with same points value are safe
 */
export async function unlockEligibleGifts(childId: string, newTotalPoints: number): Promise<void> {
  try {
    // Find gifts that are SENT and threshold <= newTotalPoints
    const eligibleGifts = await db
      .select()
      .from(gifts)
      .where(
        and(
          eq(gifts.childId, childId),
          eq(gifts.status, "SENT"),
          lte(gifts.pointsThreshold, newTotalPoints)
        )
      );

    for (const gift of eligibleGifts) {
      // Update gift to UNLOCKED (idempotent with WHERE status='SENT')
      const updated = await db
        .update(gifts)
        .set({ status: "UNLOCKED", unlockedAt: new Date() })
        .where(and(eq(gifts.id, gift.id), eq(gifts.status, "SENT")))
        .returning();

      if (updated[0]) {
        // Activity log
        await db.insert(activityLog).values({
          adminId: null,
          action: "GIFT_UNLOCKED",
          entity: "gift",
          entityId: gift.id,
          meta: { childId, pointsThreshold: gift.pointsThreshold, currentPoints: newTotalPoints },
        });

        // Emit stub event
        emitGiftEvent({
          type: "gift.unlocked",
          giftId: gift.id,
          parentId: gift.parentId,
          childId,
          productId: gift.productId,
          timestamp: new Date(),
          metadata: { pointsThreshold: gift.pointsThreshold, currentPoints: newTotalPoints },
        });

        console.log(`[GIFT_UNLOCK] Gift ${gift.id} unlocked for child ${childId} (points: ${newTotalPoints}/${gift.pointsThreshold})`);
      }
    }
  } catch (error: any) {
    console.error("Unlock eligible gifts error:", error);
    // Don't throw - this is a background operation
  }
}
