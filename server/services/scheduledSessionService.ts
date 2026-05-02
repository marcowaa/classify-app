/**
 * Scheduled Session Service
 * Handles activation, task unlocking, and progress tracking for scheduled sessions
 */
import { storage } from "../storage";
import {
  scheduledSessions,
  scheduledSessionTasks,
  tasks,
  parentWallet,
  children,
  parentChild,
} from "../../shared/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { createNotification } from "../notifications";
import { NOTIFICATION_TYPES } from "../../shared/notificationTypes";

const db = storage.db;

/**
 * Activate all "on_login" sessions for a child when they log in
 * This finds all draft sessions with activationType="on_login" and activates them
 */
export async function activateOnLoginSessions(childId: string): Promise<void> {
  try {
    // Find all draft sessions with on_login activation for this child
    const sessions = await db.select().from(scheduledSessions)
      .where(and(
        eq(scheduledSessions.childId, childId),
        eq(scheduledSessions.status, "draft"),
        eq(scheduledSessions.activationType, "on_login")
      ));

    if (sessions.length === 0) return;

    for (const session of sessions) {
      await activateSession(session);
    }
  } catch (error) {
    console.error("[SCHEDULED_SESSION] Error activating on_login sessions:", error);
  }
}

/**
 * Activate a single session - sets it to active and unlocks the first task
 */
export async function activateSession(session: any): Promise<void> {
  try {
    // Find first locked task
    const firstTask = await db.select().from(scheduledSessionTasks)
      .where(and(
        eq(scheduledSessionTasks.sessionId, session.id),
        eq(scheduledSessionTasks.status, "locked")
      ))
      .orderBy(scheduledSessionTasks.orderIndex)
      .limit(1);

    await db.transaction(async (tx: any) => {
      // Update session to active
      await tx.update(scheduledSessions)
        .set({
          status: "active",
          actualStartAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(scheduledSessions.id, session.id));

      // Unlock first task if available
      if (firstTask[0]) {
        // Create actual task
        const [realTask] = await tx.insert(tasks).values({
          parentId: session.parentId,
          childId: session.childId,
          question: firstTask[0].question,
          answers: firstTask[0].answers,
          pointsReward: firstTask[0].pointsReward,
          status: "pending",
          imageUrl: firstTask[0].imageUrl,
        }).returning();

        // Update session task status
        await tx.update(scheduledSessionTasks)
          .set({
            status: "unlocked",
            unlockedAt: new Date(),
            taskId: realTask.id,
          })
          .where(eq(scheduledSessionTasks.id, firstTask[0].id));
      }
    });

    // Notify child
    await createNotification({
      childId: session.childId,
      type: NOTIFICATION_TYPES.SCHEDULED_SESSION_ACTIVATED,
      title: "جلسة المهام بدأت!",
      message: `جلسة "${session.title}" بدأت. ابدأ بحل المهمة الأولى!`,
      relatedId: session.id,
      metadata: { sessionId: session.id, totalTasks: session.totalTasks },
    });

    if (firstTask[0]) {
      await createNotification({
        childId: session.childId,
        type: NOTIFICATION_TYPES.SCHEDULED_TASK_UNLOCKED,
        title: "مهمة متاحة!",
        message: `المهمة الأولى في جلسة "${session.title}" متاحة الآن`,
        relatedId: session.id,
        metadata: { sessionId: session.id, taskOrder: firstTask[0].orderIndex },
      });
    }

    console.log(`[SCHEDULED_SESSION] Activated session ${session.id} for child ${session.childId}`);
  } catch (error) {
    console.error(`[SCHEDULED_SESSION] Error activating session ${session.id}:`, error);
  }
}

/**
 * Handle task completion within a session
 * Called when a child completes a task that belongs to a scheduled session
 * Unlocks the next task after the interval, or completes the session
 */
export async function handleSessionTaskCompletion(
  taskId: string,
  childId: string,
  selectedAnswerId: string,
  isCorrect: boolean,
  pointsEarned: number
): Promise<{ sessionCompleted: boolean; nextTaskUnlocked: boolean } | null> {
  try {
    // Find session task by taskId
    const sessionTaskResult = await db.select().from(scheduledSessionTasks)
      .where(eq(scheduledSessionTasks.taskId, taskId));

    if (!sessionTaskResult[0]) return null; // Not a session task

    const sessionTask = sessionTaskResult[0];
    const sessionId = sessionTask.sessionId;

    // Get the session
    const sessionResult = await db.select().from(scheduledSessions)
      .where(eq(scheduledSessions.id, sessionId));

    if (!sessionResult[0] || sessionResult[0].status !== "active") return null;
    const session = sessionResult[0];

    // Atomically update session task and increment completed count
    const shouldComplete = await db.transaction(async (tx: any) => {
      // Update session task as completed
      await tx.update(scheduledSessionTasks)
        .set({
          status: "completed",
          completedAt: new Date(),
          selectedAnswerId,
          isCorrect,
          pointsEarned,
        })
        .where(eq(scheduledSessionTasks.id, sessionTask.id));

      // Increment completed tasks count atomically using SQL
      const [updatedSession] = await tx.update(scheduledSessions)
        .set({
          completedTasks: sql`${scheduledSessions.completedTasks} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(scheduledSessions.id, sessionId))
        .returning();

      const newCompletedCount = updatedSession.completedTasks;

      // Check if all tasks completed
      if (newCompletedCount >= session.totalTasks) {
        // Session completed!
        await tx.update(scheduledSessions)
          .set({ status: "completed", updatedAt: new Date() })
          .where(eq(scheduledSessions.id, sessionId));
        return true;
      }
      return false;
    });

    if (shouldComplete) {

      // Calculate total earned
      const allTasks = await db.select().from(scheduledSessionTasks)
        .where(eq(scheduledSessionTasks.sessionId, sessionId));
      const totalEarned = allTasks.reduce((sum: number, t: any) => sum + (t.pointsEarned || 0), 0);
      const correctCount = allTasks.filter((t: any) => t.isCorrect === true).length;

      // Notify child
      await createNotification({
        childId: session.childId,
        type: NOTIFICATION_TYPES.SCHEDULED_SESSION_COMPLETED,
        title: "أحسنت! جلسة مكتملة! 🎉",
        message: `أكملت جلسة "${session.title}"! حصلت على ${totalEarned} نقطة (${correctCount}/${session.totalTasks} صحيحة)`,
        relatedId: sessionId,
        metadata: {
          sessionId,
          totalTasks: session.totalTasks,
          correctCount,
          totalEarned,
        },
      });

      // Notify parent
      await createNotification({
        parentId: session.parentId,
        type: NOTIFICATION_TYPES.SCHEDULED_SESSION_COMPLETED,
        title: "طفلك أكمل جلسة المهام! 🎉",
        message: `أكمل طفلك جلسة "${session.title}" (${correctCount}/${session.totalTasks} إجابات صحيحة)`,
        relatedId: sessionId,
        metadata: {
          sessionId,
          totalTasks: session.totalTasks,
          correctCount,
          totalEarned,
          childId: session.childId,
        },
      });

      return { sessionCompleted: true, nextTaskUnlocked: false };
    }

    // Find next locked task
    const nextTask = await db.select().from(scheduledSessionTasks)
      .where(and(
        eq(scheduledSessionTasks.sessionId, sessionId),
        eq(scheduledSessionTasks.status, "locked")
      ))
      .orderBy(scheduledSessionTasks.orderIndex)
      .limit(1);

    if (nextTask[0]) {
      // Schedule unlock after interval
      const intervalMs = (session.intervalMinutes || 0) * 60 * 1000;
      
      if (intervalMs <= 0) {
        // Immediate unlock (no interval)
        await unlockNextSessionTask(session, nextTask[0]);
        return { sessionCompleted: false, nextTaskUnlocked: true };
      } else {
        // Delayed unlock using setTimeout
        setTimeout(async () => {
          try {
            // Re-check session status before unlocking
            const freshSession = await db.select().from(scheduledSessions)
              .where(eq(scheduledSessions.id, sessionId));
            
            if (freshSession[0]?.status === "active") {
              await unlockNextSessionTask(session, nextTask[0]);
            }
          } catch (err) {
            console.error(`[SCHEDULED_SESSION] Error in delayed unlock:`, err);
          }
        }, intervalMs);

        return { sessionCompleted: false, nextTaskUnlocked: false };
      }
    }

    return { sessionCompleted: false, nextTaskUnlocked: false };
  } catch (error) {
    console.error("[SCHEDULED_SESSION] Error handling task completion:", error);
    return null;
  }
}

/**
 * Unlock the next task in a session
 */
async function unlockNextSessionTask(session: any, nextTask: any): Promise<void> {
  try {
    await db.transaction(async (tx: any) => {
      // Create actual task
      const [realTask] = await tx.insert(tasks).values({
        parentId: session.parentId,
        childId: session.childId,
        question: nextTask.question,
        answers: nextTask.answers,
        pointsReward: nextTask.pointsReward,
        status: "pending",
        imageUrl: nextTask.imageUrl,
      }).returning();

      // Update session task
      await tx.update(scheduledSessionTasks)
        .set({
          status: "unlocked",
          unlockedAt: new Date(),
          taskId: realTask.id,
        })
        .where(eq(scheduledSessionTasks.id, nextTask.id));
    });

    // Notify child about next task
    await createNotification({
      childId: session.childId,
      type: NOTIFICATION_TYPES.SCHEDULED_TASK_UNLOCKED,
      title: "مهمة جديدة متاحة! 📝",
      message: `المهمة رقم ${nextTask.orderIndex} في جلسة "${session.title}" متاحة الآن`,
      relatedId: session.id,
      metadata: {
        sessionId: session.id,
        taskOrder: nextTask.orderIndex,
      },
    });

    console.log(`[SCHEDULED_SESSION] Unlocked task ${nextTask.orderIndex} in session ${session.id}`);
  } catch (error) {
    console.error(`[SCHEDULED_SESSION] Error unlocking task:`, error);
  }
}

/**
 * Pause all active sessions for a child (on logout)
 */
export async function pauseActiveSessions(childId: string): Promise<void> {
  try {
    const activeSessions = await db.select().from(scheduledSessions)
      .where(and(
        eq(scheduledSessions.childId, childId),
        eq(scheduledSessions.status, "active")
      ));

    if (activeSessions.length === 0) return;

    for (const session of activeSessions) {
      await db.update(scheduledSessions)
        .set({
          status: "paused",
          pausedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(scheduledSessions.id, session.id));
    }

    console.log(`[SCHEDULED_SESSION] Paused ${activeSessions.length} sessions for child ${childId}`);
  } catch (error) {
    console.error("[SCHEDULED_SESSION] Error pausing sessions:", error);
  }
}

/**
 * Resume paused "on_login" sessions when child logs back in
 */
export async function resumePausedSessions(childId: string): Promise<void> {
  try {
    const pausedSessions = await db.select().from(scheduledSessions)
      .where(and(
        eq(scheduledSessions.childId, childId),
        eq(scheduledSessions.status, "paused"),
        eq(scheduledSessions.activationType, "on_login")
      ));

    if (pausedSessions.length === 0) return;

    for (const session of pausedSessions) {
      // Check if there's still an unlocked (but not completed) task
      const unlockedTask = await db.select().from(scheduledSessionTasks)
        .where(and(
          eq(scheduledSessionTasks.sessionId, session.id),
          eq(scheduledSessionTasks.status, "unlocked")
        ))
        .limit(1);

      if (unlockedTask[0]) {
        // Resume session - task is already unlocked
        await db.update(scheduledSessions)
          .set({ status: "active", pausedAt: null, updatedAt: new Date() })
          .where(eq(scheduledSessions.id, session.id));

        await createNotification({
          childId,
          type: NOTIFICATION_TYPES.SCHEDULED_SESSION_ACTIVATED,
          title: "جلسة المهام مستمرة!",
          message: `جلسة "${session.title}" مستمرة. لديك مهمة تنتظرك!`,
          relatedId: session.id,
          metadata: { sessionId: session.id },
        });
      } else {
        // No unlocked task, unlock next one
        const nextLocked = await db.select().from(scheduledSessionTasks)
          .where(and(
            eq(scheduledSessionTasks.sessionId, session.id),
            eq(scheduledSessionTasks.status, "locked")
          ))
          .orderBy(scheduledSessionTasks.orderIndex)
          .limit(1);

        if (nextLocked[0]) {
          await db.update(scheduledSessions)
            .set({ status: "active", pausedAt: null, updatedAt: new Date() })
            .where(eq(scheduledSessions.id, session.id));

          await unlockNextSessionTask(session, nextLocked[0]);
        }
      }
    }

    console.log(`[SCHEDULED_SESSION] Resumed ${pausedSessions.length} paused sessions for child ${childId}`);
  } catch (error) {
    console.error("[SCHEDULED_SESSION] Error resuming sessions:", error);
  }
}

/**
 * Startup recovery sweep — finds active sessions with completed tasks
 * awaiting delayed unlock (lost due to server restart) and processes them.
 * Should be called once during server startup.
 */
export async function recoverPendingSessionUnlocks(): Promise<void> {
  try {
    // Find all active sessions
    const activeSessions = await db.select().from(scheduledSessions)
      .where(eq(scheduledSessions.status, "active"));

    let recoveredCount = 0;
    for (const session of activeSessions) {
      // Check if there are completed tasks but no unlocked/locked tasks ready
      const sessionTasks = await db.select().from(scheduledSessionTasks)
        .where(eq(scheduledSessionTasks.sessionId, session.id))
        .orderBy(scheduledSessionTasks.orderIndex);

      const hasUnlocked = sessionTasks.some((t: any) => t.status === "unlocked");
      const hasLocked = sessionTasks.some((t: any) => t.status === "locked");
      const completedCount = sessionTasks.filter((t: any) => t.status === "completed").length;

      // If there are no unlocked tasks but there are locked tasks remaining,
      // and we have completed tasks, it means a timer was lost
      if (!hasUnlocked && hasLocked && completedCount > 0) {
        // Find next locked task to unlock
        const nextLocked = sessionTasks.find((t: any) => t.status === "locked");
        if (nextLocked) {
          await unlockNextSessionTask(session, nextLocked);
          recoveredCount++;
        }
      }

      // Also check if session should be marked completed
      if (!hasLocked && !hasUnlocked && completedCount >= session.totalTasks && completedCount > 0) {
        await db.update(scheduledSessions)
          .set({ status: "completed", completedTasks: completedCount, updatedAt: new Date() })
          .where(eq(scheduledSessions.id, session.id));
        recoveredCount++;
      }
    }

    if (recoveredCount > 0) {
      console.log(`[SCHEDULED_SESSION] Recovered ${recoveredCount} pending session unlocks on startup`);
    }
  } catch (error) {
    console.error("[SCHEDULED_SESSION] Error in startup recovery:", error);
  }
}
