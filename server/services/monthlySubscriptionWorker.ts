/**
 * Monthly Subscription Worker
 * 
 * Runs on the 1st of each month (checked hourly).
 * For each active teacherChildPermission, deducts monthlyPoints from the parent's wallet
 * and credits the teacher's available balance.
 */

import { storage } from "../storage";
import {
  teacherChildPermissions,
  parentWallet,
  teacherBalances,
  notifications,
  monthlySubscriptionDeductions,
  parents,
  children,
  schoolTeachers,
} from "../../shared/schema";
import { eq, and, sql } from "drizzle-orm";

const db = storage.db;

let isRunning = false;
let intervalId: NodeJS.Timeout | null = null;

async function processMonthlyDeductions() {
  if (isRunning) return;
  isRunning = true;

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  try {
    // Get all active permissions
    const activePermissions = await db.select().from(teacherChildPermissions)
      .where(eq(teacherChildPermissions.isActive, true));

    let successCount = 0;
    let failCount = 0;

    for (const perm of activePermissions) {
      try {
        // Check if already deducted this month
        const [existing] = await db.select().from(monthlySubscriptionDeductions)
          .where(and(
            eq(monthlySubscriptionDeductions.permissionId, perm.id),
            eq(monthlySubscriptionDeductions.month, currentMonth)
          ));

        if (existing) continue; // Already processed

        const pointsToDeduct = perm.monthlyPoints;
        if (pointsToDeduct <= 0) continue;

        // Get parent wallet
        const [wallet] = await db.select().from(parentWallet)
          .where(eq(parentWallet.parentId, perm.parentId));

        const balance = Number(wallet?.balance || 0);

        if (balance < pointsToDeduct) {
          // Insufficient balance
          await db.insert(monthlySubscriptionDeductions).values({
            permissionId: perm.id,
            parentId: perm.parentId,
            teacherId: perm.teacherId,
            childId: perm.childId,
            pointsDeducted: 0,
            month: currentMonth,
            status: "insufficient_balance",
            failureReason: `الرصيد غير كافٍ: ${balance} < ${pointsToDeduct}`,
          });

          // Notify parent
          await db.insert(notifications).values({
            parentId: perm.parentId,
            type: "subscription_failed",
            title: "فشل خصم اشتراك المعلم",
            message: `رصيدك غير كافٍ لخصم اشتراك المعلم الشهري (${pointsToDeduct} نقطة). يرجى شحن رصيدك.`,
            isRead: false,
          });

          failCount++;
          continue;
        }

        // Deduct from parent wallet
        await db.update(parentWallet).set({
          balance: sql`${parentWallet.balance} - ${pointsToDeduct}`,
          totalSpent: sql`${parentWallet.totalSpent} + ${pointsToDeduct}`,
          updatedAt: new Date(),
        }).where(eq(parentWallet.parentId, perm.parentId));

        // Credit teacher balance
        const [existingBalance] = await db.select().from(teacherBalances)
          .where(eq(teacherBalances.teacherId, perm.teacherId));

        if (existingBalance) {
          await db.update(teacherBalances).set({
            availableBalance: sql`${teacherBalances.availableBalance} + ${pointsToDeduct}`,
            totalSalesAmount: sql`${teacherBalances.totalSalesAmount} + ${pointsToDeduct}`,
            updatedAt: new Date(),
          }).where(eq(teacherBalances.teacherId, perm.teacherId));
        } else {
          await db.insert(teacherBalances).values({
            teacherId: perm.teacherId,
            availableBalance: String(pointsToDeduct),
            totalSalesAmount: String(pointsToDeduct),
          });
        }

        // Record deduction
        await db.insert(monthlySubscriptionDeductions).values({
          permissionId: perm.id,
          parentId: perm.parentId,
          teacherId: perm.teacherId,
          childId: perm.childId,
          pointsDeducted: pointsToDeduct,
          month: currentMonth,
          status: "success",
        });

        // Get names for notifications
        const [child] = await db.select().from(children).where(eq(children.id, perm.childId));
        const [teacher] = await db.select().from(schoolTeachers).where(eq(schoolTeachers.id, perm.teacherId));

        // Notify parent
        await db.insert(notifications).values({
          parentId: perm.parentId,
          type: "subscription_deducted",
          title: "تم خصم اشتراك المعلم الشهري",
          message: `تم خصم ${pointsToDeduct} نقطة لاشتراك المعلم ${teacher?.name || ""} للطفل ${child?.name || ""}`,
          isRead: false,
        });

        // Notify teacher 
        await db.insert(notifications).values({
          teacherId: perm.teacherId,
          type: "subscription_received",
          title: "تم استلام رسوم الاشتراك الشهري",
          message: `تم إضافة ${pointsToDeduct} نقطة لرصيدك من اشتراك الطفل ${child?.name || ""}`,
          isRead: false,
        });

        successCount++;
      } catch (err) {
        console.error(`Monthly deduction error for permission ${perm.id}:`, err);
        failCount++;
      }
    }

    if (successCount > 0 || failCount > 0) {
      console.log(`[MonthlySubscription] Processed: ${successCount} success, ${failCount} failed for ${currentMonth}`);
    }
  } catch (error) {
    console.error("[MonthlySubscription] Critical error:", error);
  } finally {
    isRunning = false;
  }
}

/**
 * Start the monthly subscription worker.
 * Checks every hour if it's the 1st of the month and processes deductions.
 */
export function startMonthlySubscriptionWorker() {
  const CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour

  const check = () => {
    const now = new Date();
    // Run on the 1st of the month (any hour, the dedup prevents re-processing)
    if (now.getDate() === 1) {
      processMonthlyDeductions().catch(console.error);
    }
  };

  // Initial check after 30 seconds
  setTimeout(check, 30000);

  // Then check every hour
  intervalId = setInterval(check, CHECK_INTERVAL);

  console.log("[MonthlySubscription] Worker started - checks hourly on 1st of month");
}

export function stopMonthlySubscriptionWorker() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
