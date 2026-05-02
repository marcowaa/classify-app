import { storage } from "./storage";
import { children, products, admins } from "../shared/schema";
import { eq } from "drizzle-orm";
import { notificationOrchestrator } from "./services/notificationOrchestrator";
import {
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_STYLES,
  NOTIFICATION_TYPES,
  type NotificationPriority,
  type NotificationStyle,
  type NotificationType,
} from "../shared/notificationTypes";
import { resolveCampaignDeliveryDecision } from "./services/decisionChannels";

const db = storage.db;

interface NotificationParams {
  parentId?: string | null;
  childId?: string | null;
  teacherId?: string | null;
  adminId?: string | null;
  type: NotificationType;
  title?: string | null;
  message: string;
  style?: NotificationStyle;
  priority?: NotificationPriority;
  channels?: ("in_app" | "email" | "web_push" | "mobile_push")[];
  soundAlert?: boolean;
  vibration?: boolean;
  relatedId?: string | null;
  ctaAction?: string | null;
  ctaTarget?: string | null;
  metadata?: Record<string, any> | null;
}

function mapPriorityToScore(priority: NotificationPriority | undefined): number {
  if (priority === NOTIFICATION_PRIORITIES.URGENT) return 9;
  if (priority === NOTIFICATION_PRIORITIES.WARNING) return 6;
  return 2;
}

function buildNotificationDecisionSeed(input: {
  recipientType: string;
  recipientId: string;
  type: NotificationType;
  relatedId?: string | null;
}) {
  return `notification:${input.recipientType}:${input.recipientId}:${input.type}:${input.relatedId || "none"}`;
}

export async function createNotification(params: NotificationParams) {
  const parentId = params.parentId ?? null;
  const childId = params.childId ?? null;
  const teacherId = params.teacherId ?? null;
  const adminId = params.adminId ?? null;
  const type = params.type;
  const title = params.title ?? null;
  const message = params.message;
  const relatedId = params.relatedId ?? null;
  const ctaAction = params.ctaAction ?? null;
  const ctaTarget = params.ctaTarget ?? null;
  const vibration = params.vibration ?? false;

  try {
    if (!parentId && !childId && !teacherId && !adminId) {
      throw new Error("NOTIFICATION_RECIPIENT_REQUIRED");
    }

    const recipientType = childId ? "child" : teacherId ? "teacher" : adminId ? "admin" : "parent";
    const recipientId = childId || teacherId || adminId || (parentId as string);

    const decision = resolveCampaignDeliveryDecision({
      priorityRaw: mapPriorityToScore(params.priority),
      actorId: adminId || parentId || teacherId || childId,
      seed: buildNotificationDecisionSeed({ recipientType, recipientId, type, relatedId }),
    });

    const style = params.style ?? decision.selected.style;
    const priority = params.priority ?? decision.selected.priority;
    const channels = (params.channels && params.channels.length > 0
      ? params.channels
      : decision.selected.channels) as ("in_app" | "email" | "web_push" | "mobile_push")[];
    const soundAlert = typeof params.soundAlert === "boolean" ? params.soundAlert : decision.selected.soundAlert;
    const metadata = {
      ...(params.metadata || {}),
      decisionPathVersion: decision.pathVersion,
      decisionCanaryPercent: decision.canary.percent,
      decisionCanaryBucket: decision.canary.bucket,
      decisionCanaryAllowList: decision.canary.inAllowList,
      decisionDualPathTelemetry: decision.dualPathTelemetry,
      decisionV1V2Differs: decision.differs,
    };

    return await notificationOrchestrator.send({
      recipientType,
      recipientId,
      type,
      title,
      message,
      style,
      priority,
      channels,
      soundAlert,
      vibration,
      relatedId,
      ctaAction,
      ctaTarget,
      metadata,
    });
  } catch (err) {
    console.error('createNotification error:', err);
    throw err;
  }
}

/**
 * Send a notification to ALL admins in the system.
 * This creates one notification row per admin and pushes via SSE.
 */
export async function notifyAllAdmins(params: Omit<NotificationParams, "parentId" | "childId" | "adminId">) {
  try {
    const allAdmins = await db.select({ id: admins.id }).from(admins);
    const results = [];
    for (const admin of allAdmins) {
      try {
        const result = await createNotification({ ...params, adminId: admin.id });
        results.push(result);
      } catch (err) {
        console.error(`notifyAllAdmins: failed for admin ${admin.id}:`, err);
      }
    }
    return results;
  } catch (err) {
    console.error("notifyAllAdmins error:", err);
    return [];
  }
}

export async function notifyChildPointsEarned(childId: string, pointsEarned: number, reason: string, relatedId?: string) {
  const childData = await db.select().from(children).where(eq(children.id, childId));
  const child = childData[0];
  if (!child) return null;

  return createNotification({
    childId,
    type: NOTIFICATION_TYPES.POINTS_EARNED,
    title: "نقاط جديدة!",
    message: `أحسنت! لقد ربحت ${pointsEarned} نقطة من ${reason}`,
    style: NOTIFICATION_STYLES.TOAST,
    priority: NOTIFICATION_PRIORITIES.NORMAL,
    soundAlert: true,
    relatedId: relatedId ?? null,
    metadata: { pointsEarned, newTotal: child.points + pointsEarned },
  });
}

export async function notifyChildRewardUnlocked(childId: string, rewardName: string, rewardId: string) {
  return createNotification({
    childId,
    type: NOTIFICATION_TYPES.REWARD_UNLOCKED,
    title: "مكافأة جديدة!",
    message: `تهانينا! لقد فتحت مكافأة "${rewardName}"`,
    style: NOTIFICATION_STYLES.MODAL,
    priority: NOTIFICATION_PRIORITIES.URGENT,
    soundAlert: true,
    vibration: true,
    relatedId: rewardId,
    ctaAction: "view_reward",
    ctaTarget: `/rewards/${rewardId}`,
    metadata: { rewardName },
  });
}

export async function notifyChildProductAssigned(childId: string, productId: string, requiredPoints: number) {
  const productData = await db.select().from(products).where(eq(products.id, productId));
  const product = productData[0];
  if (!product) return null;

  return createNotification({
    childId,
    type: NOTIFICATION_TYPES.PRODUCT_ASSIGNED,
    title: "هدية جديدة في انتظارك!",
    message: `أضاف والداك "${product.nameAr || product.name}" كهدية! اجمع ${requiredPoints} نقطة للحصول عليها`,
    style: NOTIFICATION_STYLES.FULLSCREEN,
    priority: NOTIFICATION_PRIORITIES.URGENT,
    soundAlert: true,
    vibration: true,
    relatedId: productId,
    ctaAction: "view_goal",
    ctaTarget: `/goals`,
    metadata: { productName: product.name, productNameAr: product.nameAr, requiredPoints, productImage: product.image },
  });
}

export async function notifyChildTaskReminder(childId: string, taskId: string, taskTitle: string) {
  return createNotification({
    childId,
    type: NOTIFICATION_TYPES.TASK_REMINDER,
    title: "تذكير بالمهمة",
    message: `لا تنسى إتمام مهمة: ${taskTitle}`,
    style: NOTIFICATION_STYLES.BANNER,
    priority: NOTIFICATION_PRIORITIES.NORMAL,
    relatedId: taskId,
    ctaAction: "view_task",
    ctaTarget: `/tasks/${taskId}`,
  });
}

export async function notifyChildAchievement(childId: string, achievementName: string, description: string) {
  return createNotification({
    childId,
    type: NOTIFICATION_TYPES.ACHIEVEMENT,
    title: "إنجاز جديد!",
    message: description,
    style: NOTIFICATION_STYLES.FULLSCREEN,
    priority: NOTIFICATION_PRIORITIES.URGENT,
    soundAlert: true,
    vibration: true,
    metadata: { achievementName },
  });
}

export async function notifyChildDailyChallenge(childId: string, challengeId: string, challengeTitle: string, pointsReward: number) {
  return createNotification({
    childId,
    type: NOTIFICATION_TYPES.DAILY_CHALLENGE,
    title: "تحدي اليوم!",
    message: `تحدي جديد: ${challengeTitle} - اربح ${pointsReward} نقطة!`,
    style: NOTIFICATION_STYLES.MODAL,
    priority: NOTIFICATION_PRIORITIES.NORMAL,
    soundAlert: true,
    relatedId: challengeId,
    ctaAction: "start_challenge",
    ctaTarget: `/challenges/${challengeId}`,
    metadata: { pointsReward },
  });
}

export async function notifyChildGoalProgress(childId: string, productId: string, currentPoints: number, requiredPoints: number) {
  const percentage = Math.round((currentPoints / requiredPoints) * 100);
  const productData = await db.select().from(products).where(eq(products.id, productId));
  const product = productData[0];

  const milestones = [25, 50, 75, 90];
  let milestone = null;
  for (const m of milestones) {
    if (percentage >= m && (currentPoints - 1) / requiredPoints * 100 < m) {
      milestone = m;
      break;
    }
  }

  if (!milestone) return null;

  return createNotification({
    childId,
    type: NOTIFICATION_TYPES.GOAL_PROGRESS,
    title: `تقدم رائع! ${milestone}%`,
    message: `أنت على بعد ${requiredPoints - currentPoints} نقطة فقط من الحصول على "${product?.nameAr || product?.name}"!`,
    style: NOTIFICATION_STYLES.TOAST,
    priority: NOTIFICATION_PRIORITIES.NORMAL,
    soundAlert: true,
    relatedId: productId,
    metadata: { percentage, milestone, remaining: requiredPoints - currentPoints },
  });
}

export async function notifyParentChildActivity(parentId: string, childId: string, activityType: string, details: string, childName?: string) {
  const resolvedName = childName || (await (async () => {
    const childData = await db.select().from(children).where(eq(children.id, childId));
    return childData[0]?.name || "طفلك";
  })());
  return createNotification({
    parentId,
    type: NOTIFICATION_TYPES.CHILD_ACTIVITY,
    title: `نشاط ${resolvedName}`,
    message: details,
    style: NOTIFICATION_STYLES.TOAST,
    priority: NOTIFICATION_PRIORITIES.NORMAL,
    relatedId: childId,
    metadata: { activityType, childId, childName: resolvedName },
  });
}

export async function notifyParentLowPoints(parentId: string, childId: string, childName: string, currentPoints: number) {
  return createNotification({
    parentId,
    type: NOTIFICATION_TYPES.LOW_POINTS_WARNING,
    title: "تنبيه النقاط",
    message: `${childName} لديه ${currentPoints} نقطة فقط. قد يحتاج للتشجيع!`,
    style: NOTIFICATION_STYLES.BANNER,
    priority: NOTIFICATION_PRIORITIES.WARNING,
    relatedId: childId,
    metadata: { childName, currentPoints },
  });
}

export default {
  createNotification,
  notifyAllAdmins,
  notifyChildPointsEarned,
  notifyChildRewardUnlocked,
  notifyChildProductAssigned,
  notifyChildTaskReminder,
  notifyChildAchievement,
  notifyChildDailyChallenge,
  notifyChildGoalProgress,
  notifyParentChildActivity,
  notifyParentLowPoints,
};
