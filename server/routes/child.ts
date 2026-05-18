import type { Express } from "express";
import { storage } from "../storage";
import { successResponse, errorResponse, ErrorCode } from "../utils/apiResponse";
import { validateBody } from "../validators";
import {
  childLinkSchema,
  childLoginRequestSchema,
  childRequestLoginByNameSchema,
  childLogoutSchema,
  childRefreshTokenSchema,
  childUpdateProfileSchema,
  childShowcaseSettingsSchema,
  childSubmitTaskSchema,
  childAnswerTaskSchema,
  childCompleteGameSchema,
  childTaskNotificationCompleteSchema,
  childPurchaseRequestSchema,
  childHelpRequestSchema,
  childHelpChatMessageSchema,
  childNotificationSettingsSchema,
  childPushSubscriptionSchema,
  childCreatePostSchema,
  childCheckLikesSchema,
  childCommentSchema,
  childFriendRequestSchema,
  childFriendActionSchema,
  childFollowSchema,
  childFollowCheckSchema,
  childNotifyAchievementSchema,
  childScreenTimeHeartbeatSchema,
} from "../validators/childSchemas";
import {
  parents,
  children,
  parentChild,
  tasks,
  taskResults,
  flashGames,
  products,
  orders,
  storeOrders,
  orderItems,
  childPurchases,
  childPurchaseRequests,
  parentOwnedProducts,
  childAssignedProducts,
  subjects,
  templateTasks,
  notifications,
  childGifts,
  childEvents,
  childNotificationSettings,
  childPushSubscriptions,
  gifts,
  entitlements,
  activityLog,
  childTrustedDevices,
  childGrowthTrees,
  childGrowthEvents,
  childLoginRequests,
  growthTreeSettings,
  childWateringLog,
  libraryProducts,
  libraries,
  libraryReferrals,
  libraryActivityLogs,
  libraryReferralSettings,
  childGameAssignments,
  gamePlayHistory,
  childFriendships,
  childFriendNotifications,
  childFollows,
  childPosts,
  childPostLikes,
  childPostComments,
  childTeacherAssignment,
  teacherChildPermissions,
  schools,
  schoolTeachers,
  schoolActivityLogs,
  scheduledSessions,
  scheduledSessionTasks,
  taskHelpRequests,
  taskHelpMessages,
  taskHelpFeedback,
  screenTimeSettings,
  childDailyUsage,
  appSettings,
  ads,
  childReferralVisits,
} from "../../shared/schema";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { eq, and, or, desc, sql, count, ilike, ne, inArray } from "drizzle-orm";
import jwt from "jsonwebtoken";
// Type declarations for `qrcode` are not present in the repo; silence TypeScript here
// @ts-ignore
import QRCode from "qrcode";
import { authMiddleware, JWT_SECRET } from "./middleware";
import {
  childLinkLimiter,
  childLoginRequestLimiter,
  childLoginStatusLimiter,
  refreshTokenLimiter,
  publicApiLimiter,
  sseConnectLimiter,
  gameCompletionLimiter,
} from "../utils/rateLimiters";
import { emitGiftEvent } from "../giftEvents";
import { unlockEligibleGifts } from "../giftUnlock";
import { createNotification } from "../notifications";
import { applyPointsDelta } from "../services/pointsService";
import { getVapidPublicKey } from "../services/webPushService";
import { notificationBus } from "../services/notificationBus";
import { NOTIFICATION_TYPES, NOTIFICATION_STYLES, NOTIFICATION_PRIORITIES } from "../../shared/notificationTypes";
import { activateOnLoginSessions, resumePausedSessions, pauseActiveSessions, handleSessionTaskCompletion } from "../services/scheduledSessionService";
import { sseManager } from "../utils/sseManager";
import {
  applyGardenEconomyDelta,
  calculateGardenBeauty,
  calculateGrowthPointsForTool,
  calculateHarvestReward,
  calculateSlotStageFromProgress,
} from "../services/gardenEconomy";
import { getGameIframePolicy, isGameUrlAllowed } from "../services/gameUrlPolicy";

const db = storage.db;

async function generateUniqueChildShareCode(): Promise<string> {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = Array.from({ length: 8 }, () => alphabet[crypto.randomInt(0, alphabet.length)] || "A").join("");
    const existing = await db
      .select({ id: children.id })
      .from(children)
      .where(eq(children.shareCode, candidate))
      .limit(1);
    if (!existing[0]) return candidate;
  }
  return `${Date.now().toString(36).toUpperCase().slice(-8)}`;
}

function decodeOptionalAuthUser(req: any): { parentId?: string; childId?: string } {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return {};
    const token = authHeader.split(" ")[1];
    if (!token) return {};
    const appSecret = process.env["APP_JWT_SECRET"] || process.env["JWT_SECRET"] || "classify-app-2025-secret";
    const decoded = jwt.verify(token, appSecret) as any;
    if (decoded.parentId || decoded.userId) {
      return { parentId: decoded.parentId || decoded.userId };
    }
    if (decoded.childId) {
      return { childId: decoded.childId };
    }
  } catch {
    // anonymous viewer
  }
  return {};
}

function buildChildLoginRequestKey(requestId: string): string {
  return crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`child-login:${requestId}`)
    .digest("hex");
}

function isValidRequestKey(requestId: string, providedKey: string): boolean {
  const expected = buildChildLoginRequestKey(requestId);
  if (!providedKey || providedKey.length !== expected.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(providedKey), Buffer.from(expected));
}

// Helper function to normalize answers - ensures each answer has a DETERMINISTIC id
// Uses hash of answer text + index to generate consistent IDs across calls
function normalizeAnswers(answers: any, taskQuestion?: string): any[] {
  if (!answers || !Array.isArray(answers)) return [];

  // Generate a simple hash for deterministic ID
  const hashText = (text: string, index: number): string => {
    const combined = `${taskQuestion || ''}-${text}-${index}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  };

  return answers.map((answer: any, index: number) => {
    // If answer is already an object with id, return as-is
    if (typeof answer === 'object' && answer !== null && answer.id) {
      return answer;
    }
    // If answer is a string, convert to object with generated deterministic id
    if (typeof answer === 'string') {
      return {
        id: `answer-${index}-${hashText(answer, index)}`,
        text: answer,
        isCorrect: index === 0 // First answer is correct by default for legacy data
      };
    }
    // If answer is an object without id, add one
    if (typeof answer === 'object' && answer !== null) {
      const text = answer.text || String(answer);
      return {
        ...answer,
        id: answer.id || `answer-${index}-${hashText(text, index)}`
      };
    }
    const text = String(answer);
    return { id: `answer-${index}-${hashText(text, index)}`, text, isCorrect: false };
  });
}

function normalizeSubjectLabel(value?: string | null): string {
  return String(value || "").trim().toLowerCase();
}

function normalizeServedGameEmbedUrl(raw: unknown): string {
  let value = String(raw || "").trim();
  if (!value) return "";

  // Repair common malformed internal paths seen in legacy/admin rows.
  value = value.replace(/^:+/, "/");
  value = value.replace(/^\/\/+/g, "/");
  value = value.replace(/^\/gamess\//i, "/games/");

  if (value.startsWith("/")) {
    return value;
  }

  try {
    const parsed = new URL(value);
    const protocol = parsed.protocol.toLowerCase();
    if (protocol !== "http:" && protocol !== "https:") return "";

    // First-party absolute URLs are normalized to app-relative for consistency.
    const host = parsed.hostname.toLowerCase();
    if (host === "classi-fy.com" || host === "www.classi-fy.com" || host === "localhost" || host === "127.0.0.1") {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }

    return parsed.toString();
  } catch {
    return "";
  }
}

async function getFailedAttemptCount(taskId: string, childId: string): Promise<number> {
  const failed = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(taskResults)
    .where(and(
      eq(taskResults.taskId, taskId),
      eq(taskResults.childId, childId),
      eq(taskResults.isCorrect, false)
    ));
  return failed[0]?.count ?? 0;
}

async function logTaskCompletion(childId: string, task: typeof tasks.$inferSelect, childName: string, failedAttempts: number) {
  const totalAttempts = failedAttempts + 1;

  await db.insert(childEvents).values({
    childId,
    eventType: "TASK_COMPLETED",
    relatedId: task.id,
    meta: {
      taskId: task.id,
      question: task.question,
      pointsEarned: task.pointsReward,
      failedAttempts,
      totalAttempts,
    },
    isAcknowledged: true,
    acknowledgedAt: new Date(),
  });

  const linkedParents = await db
    .select({ parentId: parentChild.parentId })
    .from(parentChild)
    .where(eq(parentChild.childId, childId));

  const parentIds = Array.from(new Set([
    ...(task.parentId ? [String(task.parentId)] : []),
    ...linkedParents.map((row: { parentId: string }) => String(row.parentId)),
  ]));

  for (const parentId of parentIds) {
    await createNotification({
      parentId,
      type: NOTIFICATION_TYPES.TASK_COMPLETED,
      title: "تم حل مهمة",
      message: `${childName} حل المهمة بنجاح وحصل على ${task.pointsReward} نقطة. عدد الإخفاقات: ${failedAttempts}.`,
      relatedId: task.id,
      metadata: {
        taskId: task.id,
        childId,
        failedAttempts,
        totalAttempts,
        pointsEarned: task.pointsReward,
      },
    });
  }

  if (task.teacherId) {
    await createNotification({
      teacherId: task.teacherId,
      type: NOTIFICATION_TYPES.TASK_COMPLETED,
      title: "تم حل مهمة",
      message: `${childName} أنهى المهمة بنجاح وحصل على ${task.pointsReward} نقطة.`,
      relatedId: task.id,
      metadata: {
        taskId: task.id,
        childId,
        failedAttempts,
        totalAttempts,
        pointsEarned: task.pointsReward,
      },
    });

    try {
      const teacher = await db
        .select({ schoolId: schoolTeachers.schoolId })
        .from(schoolTeachers)
        .where(eq(schoolTeachers.id, task.teacherId))
        .limit(1);

      if (teacher[0]?.schoolId) {
        await db.insert(schoolActivityLogs).values({
          schoolId: teacher[0].schoolId,
          teacherId: task.teacherId,
          action: "child_task_completed",
          points: 1,
          metadata: {
            taskId: task.id,
            childId,
            failedAttempts,
            totalAttempts,
            pointsEarned: task.pointsReward,
          },
        });
      }
    } catch (teacherLogErr: any) {
      console.error("Teacher completion activity log error:", teacherLogErr);
    }
  }
}

async function autoResolveActiveHelpRequests(task: typeof tasks.$inferSelect, childId: string) {
  const activeRequests = await db
    .select()
    .from(taskHelpRequests)
    .where(and(
      eq(taskHelpRequests.taskId, task.id),
      eq(taskHelpRequests.childId, childId),
      eq(taskHelpRequests.status, "active")
    ));

  if (activeRequests.length === 0) {
    return { resolvedCount: 0 };
  }

  const resolvedAt = new Date();
  const helpRequestIds = activeRequests.map((r: any) => r.id);

  await db
    .update(taskHelpRequests)
    .set({ status: "resolved", resolvedAt })
    .where(inArray(taskHelpRequests.id, helpRequestIds));

  try {
    await db
      .update(notifications)
      .set({ isRead: true, status: "resolved", resolvedAt })
      .where(and(
        inArray(notifications.relatedId, helpRequestIds),
        eq(notifications.type, NOTIFICATION_TYPES.TASK_HELP_REQUESTED)
      ));
  } catch (notifyUpdateErr: any) {
    console.error("Failed to mark help-request notifications resolved:", notifyUpdateErr);
  }

  const linkedParents = await db
    .select({ parentId: parentChild.parentId })
    .from(parentChild)
    .where(eq(parentChild.childId, childId));

  const parentIds = Array.from(new Set([
    ...(task.parentId ? [String(task.parentId)] : []),
    ...linkedParents.map((row: { parentId: string }) => String(row.parentId)),
  ]));

  for (const helpReq of activeRequests) {
    await createNotification({
      childId,
      type: NOTIFICATION_TYPES.TASK_HELP_MESSAGE,
      title: "تم إنهاء جلسة المساعدة",
      message: "تم إغلاق جلسة المساعدة تلقائيًا بعد إجابتك الصحيحة. أحسنت!",
      relatedId: helpReq.id,
      metadata: {
        helpRequestId: helpReq.id,
        taskId: task.id,
        autoResolved: true,
        reason: "task_completed_correctly",
      },
    });

    for (const parentId of parentIds) {
      await createNotification({
        parentId,
        type: NOTIFICATION_TYPES.TASK_HELP_MESSAGE,
        title: "إغلاق تلقائي لجلسة المساعدة",
        message: "تم إغلاق جلسة المساعدة تلقائيًا لأن الطفل أجاب إجابة صحيحة وأكمل المهمة.",
        relatedId: helpReq.id,
        metadata: {
          helpRequestId: helpReq.id,
          taskId: task.id,
          childId,
          autoResolved: true,
          reason: "task_completed_correctly",
        },
      });
    }

    if (task.teacherId) {
      await createNotification({
        teacherId: task.teacherId,
        type: NOTIFICATION_TYPES.TASK_HELP_MESSAGE,
        title: "إغلاق تلقائي لجلسة المساعدة",
        message: "تم إغلاق جلسة المساعدة تلقائيًا لأن الطفل أكمل المهمة بإجابة صحيحة.",
        relatedId: helpReq.id,
        metadata: {
          helpRequestId: helpReq.id,
          taskId: task.id,
          childId,
          autoResolved: true,
          reason: "task_completed_correctly",
        },
      });
    }
  }

  return { resolvedCount: activeRequests.length };
}

function getMotivationalMessage(speedLevel: string, totalPoints: number, tasksCompleted: number): string {
  const messages = {
    superfast: [
      "أنت نجم! استمر في التألق!",
      "رائع جداً! أنت من أفضل المتعلمين!",
      "سرعتك مذهلة! افتخر بنفسك!",
    ],
    fast: [
      "أحسنت! أنت تتقدم بسرعة رائعة!",
      "ممتاز! استمر على هذا المستوى!",
      "أنت بطل! كل يوم تصبح أفضل!",
    ],
    moderate: [
      "جيد جداً! يمكنك فعل المزيد!",
      "استمر! أنت على الطريق الصحيح!",
      "رائع! كل خطوة تقربك من هدفك!",
    ],
    slow: [
      "لا تستسلم! كل بداية صعبة!",
      "العب المزيد من الألعاب لتكسب النقاط!",
      "أنت قادر على تحقيق المزيد! جرب الآن!",
    ],
  } as const;

  const slowMessages = messages.slow;
  const levelMessages = (messages as Record<string, readonly string[]>)[speedLevel] ?? slowMessages;
  const randomIndex = Math.floor(Math.random() * levelMessages.length);
  return levelMessages[randomIndex] ?? slowMessages[0] ?? "أحسنت!";
}

async function getMandatoryTaskState(childId: string) {
  const [pending] = await db
    .select({ value: count(tasks.id) })
    .from(tasks)
    .where(and(eq(tasks.childId, childId), eq(tasks.status, "pending")));

  const pendingCount = Number(pending?.value || 0);

  const [topTask] = await db
    .select({ id: tasks.id, createdAt: tasks.createdAt })
    .from(tasks)
    .where(and(eq(tasks.childId, childId), eq(tasks.status, "pending")))
    .orderBy(desc(tasks.createdAt))
    .limit(1);

  return {
    mandatoryLockActive: pendingCount > 0,
    pendingTasksCount: pendingCount,
    topPendingTaskId: topTask?.id || null,
    topPendingTaskCreatedAt: topTask?.createdAt || null,
  };
}

interface GoalProgress {
  id: string;
  requiredPoints: number;
  progressPoints: number;
  status: string;
}

function parsePromoParamsFromLink(linkUrl: string | null | undefined): {
  promoProductId: string;
  discountPercent: number | null;
} {
  if (!linkUrl) {
    return { promoProductId: "", discountPercent: null };
  }

  try {
    const isAbsolute = /^https?:\/\//i.test(linkUrl);
    const url = isAbsolute ? new URL(linkUrl) : new URL(linkUrl, "https://classify.local");
    const params = url.searchParams;
    const promoProductId = String(params.get("promoProductId") || "").trim();
    const parsedDiscount = Number.parseInt(String(params.get("promoDiscount") || ""), 10);
    const discountPercent = Number.isFinite(parsedDiscount)
      ? Math.min(90, Math.max(1, Math.trunc(parsedDiscount)))
      : null;

    return { promoProductId, discountPercent };
  } catch {
    return { promoProductId: "", discountPercent: null };
  }
}

export async function registerChildRoutes(app: Express) {
  // SSE endpoint for real-time child notifications
  app.get("/api/child/events", sseConnectLimiter, async (req: any, res) => {
    const AUTH_TOKEN_COOKIE_NAME = "auth_token";
    const AUTH_REDEEM_COOKIE_WRITE_ENABLED =
      String(process.env.AUTH_REDEEM_COOKIE_WRITE_ENABLED || "")
        .trim()
        .toLowerCase() === "true";

    const headerAuth = req.headers?.authorization;
    const headerToken =
      typeof headerAuth === "string" && headerAuth.toLowerCase().startsWith("bearer ")
        ? String(headerAuth.slice(7)).trim()
        : "";

    const cookieToken = AUTH_REDEEM_COOKIE_WRITE_ENABLED
      ? String(req.cookies?.[AUTH_TOKEN_COOKIE_NAME] || "").trim()
      : "";

    const queryToken = typeof req.query?.token === "string" ? req.query.token.trim() : "";

    // Order: Authorization header -> auth_token cookie (if enabled) -> legacy ?token fallback
    const token = headerToken || cookieToken || queryToken;

    if (!token) {
      return res
        .status(401)
        .json(errorResponse(ErrorCode.UNAUTHORIZED, "Missing authentication token"));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (!decoded?.childId) {
        return res
          .status(401)
          .json(errorResponse(ErrorCode.UNAUTHORIZED, "Invalid authentication token"));
      }

      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });
      res.write("event: connected\ndata: {}\n\n");

      sseManager.addClient(decoded.childId, "child", res);

      const keepAlive = setInterval(() => {
        try { res.write(": ping\n\n"); } catch { clearInterval(keepAlive); }
      }, 30000);

      req.on("close", () => clearInterval(keepAlive));
    } catch {
      return res
        .status(401)
        .json(errorResponse(ErrorCode.UNAUTHORIZED, "Invalid authentication token"));
    }
  });

  // Link Child (from QR Code)
  app.post("/api/child/link", childLinkLimiter, async (req, res) => {
    try {
      const v = validateBody(childLinkSchema, req.body);
      if (!v.success) return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, v.error));
      const { childName, code, childBirthDate, childAge } = v.data;

      // Validate child name
      const trimmedName = childName.trim();

      // Import parents table at top
      // Find parent by unique code (NOT parentChild.parentId)
      const parentList = await db.select().from(parents).where(eq(parents.uniqueCode, code.toUpperCase()));
      if (!parentList[0]) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid parent code"));
      }

      let parsedBirthday: Date | undefined;
      if (childBirthDate) {
        const candidate = new Date(childBirthDate);
        if (!Number.isNaN(candidate.getTime())) {
          parsedBirthday = candidate;
        }
      }
      if (!parsedBirthday && typeof childAge === "number") {
        const approxBirthday = new Date();
        approxBirthday.setFullYear(approxBirthday.getFullYear() - childAge);
        parsedBirthday = approxBirthday;
      }

      // Create child
      const childResult = await db
        .insert(children)
        .values({
          name: trimmedName,
          ...(parsedBirthday ? { birthday: parsedBirthday } : {}),
        })
        .returning();

      // Check if already linked (to prevent duplicates)
      const existingLink = await db.select().from(parentChild).where(
        and(
          eq(parentChild.parentId, parentList[0].id),
          eq(parentChild.childId, childResult[0].id)
        )
      );

      if (existingLink[0]) {
        return res.status(409).json(errorResponse(ErrorCode.CONFLICT, "This child is already linked to this parent"));
      }

      // Link parent and child
      await db.insert(parentChild).values({
        parentId: parentList[0].id,
        childId: childResult[0].id,
      });

      // Initialize growth tree for the child
      await db.insert(childGrowthTrees).values({
        childId: childResult[0].id,
        currentStage: 1,
        totalGrowthPoints: 0,
      }).onConflictDoNothing();

      // Send notification to parent about new child linking
      await createNotification({
        parentId: parentList[0].id,
        type: NOTIFICATION_TYPES.CHILD_LINKED,
        title: "تم ربط طفل جديد!",
        message: `تم ربط ${trimmedName} بحسابك بنجاح`,
        metadata: { childId: childResult[0].id, childName: trimmedName },
      });

      try {
        const referral = await db
          .select()
          .from(libraryReferrals)
          .where(
            and(
              eq(libraryReferrals.referredParentId, parentList[0].id),
              or(
                eq(libraryReferrals.status, "clicked"),
                eq(libraryReferrals.status, "registered")
              )
            )
          )
          .orderBy(desc(libraryReferrals.createdAt))
          .limit(1);

        if (referral[0]) {
          const settings = await db.select().from(libraryReferralSettings).limit(1);
          const referralPoints = settings[0]?.pointsPerReferral ?? 50;

          await db
            .update(libraryReferrals)
            .set({
              status: "purchased",
              pointsAwarded: referralPoints,
              convertedAt: new Date(),
            })
            .where(eq(libraryReferrals.id, referral[0].id));

          await db.insert(libraryActivityLogs).values({
            libraryId: referral[0].libraryId,
            action: "referral_conversion",
            points: referralPoints,
            metadata: {
              parentId: parentList[0].id,
              childId: childResult[0].id,
              referralCode: referral[0].referralCode,
            },
          });

          await db
            .update(libraries)
            .set({
              activityScore: sql`${libraries.activityScore} + ${referralPoints}`,
              updatedAt: new Date(),
            })
            .where(eq(libraries.id, referral[0].libraryId));
        }
      } catch (referralRewardErr) {
        console.error("Library referral conversion on child-link failed:", referralRewardErr);
      }

      const token = jwt.sign({ childId: childResult[0].id, type: "child" }, JWT_SECRET, { expiresIn: "30d" });

      // Activate on_login scheduled sessions & resume paused ones
      activateOnLoginSessions(childResult[0].id).catch(err => console.error("Session activation on link error:", err));
      resumePausedSessions(childResult[0].id).catch(err => console.error("Session resume on link error:", err));

      res.status(201).json(successResponse({
        token,
        childId: childResult[0].id,
        childName: childResult[0].name,
      }, "Child linked successfully"));
    } catch (error: any) {
      console.error("Child link error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Linking failed"));
    }
  });

  // Verify child token for quick login
  app.post("/api/child/verify-token", authMiddleware, async (req: any, res) => {
    try {
      const child = await db.select().from(children).where(eq(children.id, req.user.childId));
      if (!child[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Child not found"));
      }
      res.json(successResponse({
        valid: true,
        childId: child[0].id,
        displayName: child[0].displayName || child[0].name,
      }, "Token verified"));
    } catch (error: any) {
      console.error("Token verification error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Verification failed"));
    }
  });

  // Get Child Info
  app.get("/api/child/info", authMiddleware, async (req: any, res) => {
    try {
      const child = await db.select().from(children).where(eq(children.id, req.user.childId));
      if (!child[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Child not found"));
      }
      const mandatoryTaskState = await getMandatoryTaskState(req.user.childId);
      res.json(successResponse({
        ...child[0],
        mandatoryTaskState,
      }, "Child info retrieved"));
    } catch (error: any) {
      console.error("Fetch child info error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch child info"));
    }
  });

  app.get("/api/child/mandatory-task-state", authMiddleware, async (req: any, res) => {
    try {
      const state = await getMandatoryTaskState(req.user.childId);
      res.json(successResponse(state));
    } catch (error: any) {
      console.error("Fetch mandatory task state error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch mandatory task state"));
    }
  });

  // Get Child Profile
  app.get("/api/child/profile", authMiddleware, async (req: any, res) => {
    try {
      const child = await db.select().from(children).where(eq(children.id, req.user.childId));
      if (!child[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "الطفل غير موجود"));
      }
      return res.json(successResponse({
        id: child[0].id,
        name: child[0].name,
        avatarUrl: child[0].avatarUrl,
        birthday: child[0].birthday,
        schoolName: child[0].schoolName,
        academicGrade: child[0].academicGrade,
        hobbies: child[0].hobbies,
        totalPoints: child[0].totalPoints,
      }));
    } catch (error: any) {
      console.error("Fetch child profile error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "حدث خطأ في تحميل الملف الشخصي"));
    }
  });

  // Update Child Profile
  app.put("/api/child/profile", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const { name, birthday, schoolName, academicGrade, hobbies } = req.body;

      if (!name || name.trim().length < 2) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "الاسم مطلوب (حرفين على الأقل)"));
      }

      const updateData: Record<string, any> = {
        name: name.trim(),
        schoolName: schoolName?.trim() || null,
        academicGrade: academicGrade?.trim() || null,
        hobbies: hobbies?.trim() || null,
      };

      if (birthday) {
        updateData["birthday"] = new Date(birthday);
      }

      await db.update(children).set(updateData).where(eq(children.id, childId));

      res.json(successResponse({ updated: true }, "تم تحديث الملف الشخصي بنجاح"));
    } catch (error: any) {
      console.error("Update child profile error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "فشل تحديث الملف الشخصي"));
    }
  });

  // Upload Child Avatar
  app.post("/api/child/avatar", authMiddleware, async (req: any, res) => {
    try {
      const multer = await import("multer");
      const path = await import("path");
      const fs = await import("fs");

      const uploadDir = path.join(process.cwd(), "uploads", "avatars");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const multerStorage = multer.default.diskStorage({
        destination: (_req: any, _file: any, cb: any) => {
          cb(null, uploadDir);
        },
        filename: (_req: any, file: any, cb: any) => {
          const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + path.extname(file.originalname));
        },
      });

      const upload = multer.default({
        storage: multerStorage,
        limits: { fileSize: 3 * 1024 * 1024 },
        fileFilter: (_req: any, file: any, cb: any) => {
          const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
          if (allowed.includes(file.mimetype)) {
            cb(null, true);
          } else {
            cb(new Error("نوع الملف غير مدعوم. يُسمح بـ JPG, PNG, WebP, GIF فقط"));
          }
        },
      }).single("avatar");

      upload(req, res, async (err: any) => {
        if (err) {
          console.error("Avatar upload error:", err);
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, err.message || "فشل رفع الصورة"));
        }

        if (!req.file) {
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "لم يتم اختيار صورة"));
        }

        try {
          const avatarUrl = `/uploads/avatars/${req.file.filename}`;

          const old = await db
            .select({ avatarUrl: children.avatarUrl })
            .from(children)
            .where(eq(children.id, req.user.childId));

          await db.update(children).set({ avatarUrl }).where(eq(children.id, req.user.childId));

          if (old[0]?.avatarUrl) {
            const oldPath = path.join(process.cwd(), old[0].avatarUrl.replace(/^\/+/, ""));
            if (fs.existsSync(oldPath)) {
              fs.unlinkSync(oldPath);
            }
          }

          return res.json(successResponse({ avatarUrl }, "تم رفع الصورة الشخصية بنجاح"));
        } catch (innerError: any) {
          console.error("Avatar save error:", innerError);
          return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "فشل حفظ الصورة الشخصية"));
        }
      });
    } catch (error: any) {
      console.error("Avatar upload error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "فشل رفع الصورة"));
    }
  });

  // Get Child Progress and Stats
  app.get("/api/child/progress", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;

      const child = await db.select().from(children).where(eq(children.id, childId));
      if (!child[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Child not found"));
      }

      const completedTasks = await db
        .select()
        .from(taskResults)
        .where(and(eq(taskResults.childId, childId), eq(taskResults.isCorrect, true)));

      const allTasks = await db.select().from(tasks).where(eq(tasks.childId, childId));

      const activeGoals = await db
        .select({
          id: childAssignedProducts.id,
          requiredPoints: childAssignedProducts.requiredPoints,
          progressPoints: childAssignedProducts.progressPoints,
          status: childAssignedProducts.status,
        })
        .from(childAssignedProducts)
        .where(eq(childAssignedProducts.childId, childId));

      const pendingGifts = await db
        .select()
        .from(childGifts)
        .where(and(eq(childGifts.childId, childId), eq(childGifts.status, "SENT")));

      const completedGifts = await db
        .select()
        .from(childGifts)
        .where(and(eq(childGifts.childId, childId), eq(childGifts.status, "CLAIMED")));

      const totalPoints = child[0].totalPoints;
      const tasksCompleted = completedTasks.length;
      const totalTasks = allTasks.length;
      const successRate = totalTasks > 0 ? Math.round((tasksCompleted / totalTasks) * 100) : 0;

      const daysSinceJoined = Math.max(
        1,
        Math.floor((Date.now() - new Date(child[0].createdAt).getTime()) / (1000 * 60 * 60 * 24)),
      );
      const pointsPerDay = Math.round(totalPoints / daysSinceJoined);

      let speedLevel = "slow";
      if (pointsPerDay >= 50) speedLevel = "superfast";
      else if (pointsPerDay >= 30) speedLevel = "fast";
      else if (pointsPerDay >= 15) speedLevel = "moderate";

      const closestGoal = activeGoals
        .filter((g: GoalProgress) => g.status === "active")
        .sort(
          (a: GoalProgress, b: GoalProgress) =>
            b.progressPoints / b.requiredPoints - a.progressPoints / a.requiredPoints,
        )[0];

      let nextMilestone = 100;
      const milestones = [100, 250, 500, 1000, 2500, 5000, 10000];
      for (const m of milestones) {
        if (totalPoints < m) {
          nextMilestone = m;
          break;
        }
      }

      return res.json(
        successResponse({
          currentPoints: totalPoints,
          tasksCompleted,
          totalTasks,
          successRate,
          pointsPerDay,
          speedLevel,
          daysSinceJoined,
          pendingGiftsCount: pendingGifts.length,
          claimedGiftsCount: completedGifts.length,
          activeGoalsCount: activeGoals.filter((g: GoalProgress) => g.status === "active").length,
          closestGoal: closestGoal
            ? {
              progress: Math.round((closestGoal.progressPoints / closestGoal.requiredPoints) * 100),
              pointsNeeded: closestGoal.requiredPoints - closestGoal.progressPoints,
            }
            : null,
          nextMilestone,
          milestoneProgress: Math.round((totalPoints / nextMilestone) * 100),
          motivationalMessage: getMotivationalMessage(speedLevel, totalPoints, tasksCompleted),
        }),
      );
    } catch (error: any) {
      console.error("Fetch child progress error:", error);
      return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch progress"));
    }
  });

  // Get Child Tasks
  app.get("/api/child/tasks", authMiddleware, async (req: any, res) => {
    try {
      const result = await db.select().from(tasks).where(eq(tasks.childId, req.user.childId));
      // Normalize answers to ensure each has an id
      const normalizedTasks = result.map((task: typeof result[number]) => ({
        ...task,
        answers: normalizeAnswers(task.answers, task.question)
      }));
      res.json(normalizedTasks);
    } catch (error: any) {
      console.error("Fetch tasks error:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  // Get Child Pending Tasks
  app.get("/api/child/pending-tasks", authMiddleware, async (req: any, res) => {
    try {
      const result = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.childId, req.user.childId), eq(tasks.status, "pending")));
      // Normalize answers to ensure each has an id
      const normalizedTasks = result.map((task: typeof result[number]) => ({
        ...task,
        answers: normalizeAnswers(task.answers, task.question)
      }));
      res.json(normalizedTasks);
    } catch (error: any) {
      console.error("Fetch pending tasks error:", error);
      res.status(500).json({ message: "Failed to fetch pending tasks" });
    }
  });

  // Get Child Scheduled Sessions (active/paused with tasks)
  app.get("/api/child/scheduled-sessions", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;

      const sessionList = await db
        .select()
        .from(scheduledSessions)
        .where(
          and(
            eq(scheduledSessions.childId, childId),
            or(
              eq(scheduledSessions.status, "active"),
              eq(scheduledSessions.status, "paused")
            )
          )
        )
        .orderBy(desc(scheduledSessions.createdAt));

      const result = await Promise.all(
        sessionList.map(async (session: any) => {
          const sessionTasks = await db
            .select()
            .from(scheduledSessionTasks)
            .where(eq(scheduledSessionTasks.sessionId, session.id))
            .orderBy(scheduledSessionTasks.orderIndex);

          // Find the current unlocked task and get its real task data
          const currentTask = sessionTasks.find((t: any) => t.status === "unlocked");
          let currentTaskData = null;
          if (currentTask?.taskId) {
            const taskRow = await db.select().from(tasks).where(eq(tasks.id, currentTask.taskId));
            if (taskRow[0]) {
              currentTaskData = {
                ...taskRow[0],
                answers: normalizeAnswers(taskRow[0].answers, taskRow[0].question),
              };
            }
          }

          return {
            id: session.id,
            title: session.title,
            description: session.description,
            status: session.status,
            intervalMinutes: session.intervalMinutes,
            totalTasks: session.totalTasks,
            completedTasks: session.completedTasks,
            totalPointsReward: session.totalPointsReward,
            actualStartAt: session.actualStartAt,
            createdAt: session.createdAt,
            tasks: sessionTasks.map((t: any) => ({
              id: t.id,
              orderIndex: t.orderIndex,
              status: t.status,
              pointsReward: t.pointsReward,
              unlockedAt: t.unlockedAt,
              completedAt: t.completedAt,
              isCorrect: t.isCorrect,
              pointsEarned: t.pointsEarned,
            })),
            currentTask: currentTaskData,
          };
        })
      );

      res.json(successResponse(result));
    } catch (error: any) {
      console.error("Fetch child scheduled sessions error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch scheduled sessions"));
    }
  });

  // Submit Task
  app.post("/api/child/submit-task", authMiddleware, async (req: any, res) => {
    try {
      const v = validateBody(childSubmitTaskSchema, req.body);
      if (!v.success) return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, v.error));
      const { taskId, selectedAnswerId } = v.data;

      const task = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, taskId), eq(tasks.childId, req.user.childId)));
      if (!task[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Task not found"));
      }

      // Normalize answers and find the correct one
      const normalizedAnswers = normalizeAnswers(task[0].answers, task[0].question);
      const selectedAnswer = normalizedAnswers.find((a: any) => a.id === selectedAnswerId);

      if (!selectedAnswer) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Selected answer not found"));
      }

      const isCorrect = selectedAnswer.isCorrect === true;

      const result = await db.transaction(async (tx: any) => {
        const existingCorrect = await tx
          .select()
          .from(taskResults)
          .where(and(
            eq(taskResults.taskId, taskId),
            eq(taskResults.childId, req.user.childId),
            eq(taskResults.isCorrect, true)
          ))
          .limit(1);

        if (existingCorrect[0]) {
          return {
            status: "already" as const,
            isCorrect: true,
            pointsEarned: existingCorrect[0].pointsEarned,
          };
        }

        if (!isCorrect) {
          await tx.insert(taskResults).values({
            taskId,
            childId: req.user.childId,
            selectedAnswerId,
            isCorrect: false,
            pointsEarned: 0,
          });
          return { status: "wrong" as const, isCorrect: false, pointsEarned: 0 };
        }

        const updated = await tx
          .update(tasks)
          .set({ status: "completed" })
          .where(and(eq(tasks.id, taskId), eq(tasks.status, "pending")))
          .returning();

        if (!updated[0]) {
          return { status: "conflict" as const };
        }

        await tx.insert(taskResults).values({
          taskId,
          childId: req.user.childId,
          selectedAnswerId,
          isCorrect: true,
          pointsEarned: task[0].pointsReward,
        });

        const pointsResult = await applyPointsDelta(tx, {
          childId: req.user.childId,
          delta: task[0].pointsReward,
          reason: "TASK_COMPLETED",
          taskId,
        });

        return {
          status: "correct" as const,
          isCorrect: true,
          pointsEarned: task[0].pointsReward,
          newTotalPoints: pointsResult.newTotalPoints,
          childName: pointsResult.childName || "طفلك",
        };
      });

      if (result.status === "conflict") {
        return res.status(409).json(errorResponse(ErrorCode.CONFLICT, "Task already completed"));
      }

      if (result.status === "already") {
        return res.json(successResponse({
          isCorrect: result.isCorrect,
          pointsEarned: result.pointsEarned,
        }));
      }

      if (result.status === "wrong") {
        return res.json(successResponse({
          isCorrect: result.isCorrect,
          pointsEarned: result.pointsEarned,
        }));
      }

      await unlockEligibleGifts(req.user.childId, result.newTotalPoints);

      // Mark related notifications for this task as resolved/read
      try {
        await db
          .update(notifications)
          .set({ isRead: true, status: "resolved", resolvedAt: new Date() })
          .where(and(eq(notifications.relatedId, taskId), eq(notifications.childId, req.user.childId)));
      } catch (notifyErr: any) {
        console.error("Failed to update notification after correct answer:", notifyErr);
      }

      const failedAttempts = await getFailedAttemptCount(taskId, req.user.childId);
      await logTaskCompletion(req.user.childId, task[0], result.childName, failedAttempts);
      const helpResolution = await autoResolveActiveHelpRequests(task[0], req.user.childId);

      // Check if this task belongs to a scheduled session and handle progression
      try {
        await handleSessionTaskCompletion(
          taskId,
          req.user.childId,
          selectedAnswerId,
          isCorrect,
          isCorrect ? task[0].pointsReward : 0
        );
      } catch (sessionErr: any) {
        console.error("Session task completion handler error:", sessionErr);
      }

      res.json(successResponse({
        isCorrect: result.isCorrect,
        pointsEarned: result.pointsEarned,
        helpAutoResolved: helpResolution.resolvedCount > 0,
        resolvedHelpRequestCount: helpResolution.resolvedCount,
      }));
    } catch (error: any) {
      console.error("Submit task error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to submit task"));
    }
  });

  // Answer Task
  app.post("/api/child/answer-task", authMiddleware, async (req: any, res) => {
    try {
      const v = validateBody(childAnswerTaskSchema, req.body);
      if (!v.success) return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, v.error));
      const { taskId, selectedAnswerId } = v.data;

      const task = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, taskId), eq(tasks.childId, req.user.childId)));
      if (!task[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Task not found"));
      }

      // Normalize answers and find the correct one
      const normalizedAnswers = normalizeAnswers(task[0].answers, task[0].question);
      const selectedAnswer = normalizedAnswers.find((a: any) => a.id === selectedAnswerId);

      if (!selectedAnswer) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Selected answer not found"));
      }

      const isCorrect = selectedAnswer.isCorrect === true;

      const result = await db.transaction(async (tx: any) => {
        const existingCorrect = await tx
          .select()
          .from(taskResults)
          .where(and(
            eq(taskResults.taskId, taskId),
            eq(taskResults.childId, req.user.childId),
            eq(taskResults.isCorrect, true)
          ))
          .limit(1);

        if (existingCorrect[0]) {
          return {
            status: "already" as const,
            isCorrect: true,
            pointsEarned: existingCorrect[0].pointsEarned,
          };
        }

        if (!isCorrect) {
          await tx.insert(taskResults).values({
            taskId,
            childId: req.user.childId,
            selectedAnswerId,
            isCorrect: false,
            pointsEarned: 0,
          });
          return { status: "wrong" as const, isCorrect: false, pointsEarned: 0 };
        }

        const updated = await tx
          .update(tasks)
          .set({ status: "completed" })
          .where(and(eq(tasks.id, taskId), eq(tasks.status, "pending")))
          .returning();

        if (!updated[0]) {
          return { status: "conflict" as const };
        }

        await tx.insert(taskResults).values({
          taskId,
          childId: req.user.childId,
          selectedAnswerId,
          isCorrect: true,
          pointsEarned: task[0].pointsReward,
        });

        const pointsResult = await applyPointsDelta(tx, {
          childId: req.user.childId,
          delta: task[0].pointsReward,
          reason: "TASK_COMPLETED",
          taskId,
        });

        return {
          status: "correct" as const,
          isCorrect: true,
          pointsEarned: task[0].pointsReward,
          newTotalPoints: pointsResult.newTotalPoints,
          childName: pointsResult.childName || "طفلك",
        };
      });

      if (result.status === "conflict") {
        return res.status(409).json(errorResponse(ErrorCode.CONFLICT, "Task already completed"));
      }

      if (result.status === "already") {
        return res.json(successResponse({
          isCorrect: result.isCorrect,
          pointsEarned: result.pointsEarned,
        }));
      }

      if (result.status === "wrong") {
        return res.json(successResponse({
          isCorrect: result.isCorrect,
          pointsEarned: result.pointsEarned,
        }));
      }

      await unlockEligibleGifts(req.user.childId, result.newTotalPoints);

      // Mark related notifications for this task as resolved/read
      try {
        await db
          .update(notifications)
          .set({ isRead: true, status: "resolved", resolvedAt: new Date() })
          .where(and(eq(notifications.relatedId, taskId), eq(notifications.childId, req.user.childId)));
      } catch (notifyErr: any) {
        console.error("Failed to update notification after correct answer:", notifyErr);
      }

      const failedAttempts = await getFailedAttemptCount(taskId, req.user.childId);
      await logTaskCompletion(req.user.childId, task[0], result.childName, failedAttempts);
      const helpResolution = await autoResolveActiveHelpRequests(task[0], req.user.childId);

      res.json(successResponse({
        isCorrect: result.isCorrect,
        pointsEarned: result.pointsEarned,
        helpAutoResolved: helpResolution.resolvedCount > 0,
        resolvedHelpRequestCount: helpResolution.resolvedCount,
      }));
    } catch (error: any) {
      console.error("Answer task error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to answer task"));
    }
  });

  // Get Games — filtered by child assignments (assigned games + unassigned global games)
  app.get("/api/games", publicApiLimiter, async (req: any, res) => {
    try {
      const iframePolicy = getGameIframePolicy();
      // Try to get child from token
      let childId: string | null = null;
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        try {
          const decoded: any = jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
          if (decoded.childId) childId = decoded.childId;
        } catch { }
      }

      const allActiveGames = await db.select().from(flashGames).where(eq(flashGames.isActive, true));

      // Normalize/repair malformed embed URLs before policy checks so trial mode
      // is resilient to legacy admin rows with typoed internal paths.
      const normalizedGames = allActiveGames
        .map((game: any) => ({
          ...game,
          embedUrl: normalizeServedGameEmbedUrl(game.embedUrl),
        }))
        .filter((game: any) => Boolean(game.embedUrl));

      const uniqueByEmbedUrl = new Map<string, any>();
      for (const game of normalizedGames) {
        if (!uniqueByEmbedUrl.has(game.embedUrl)) {
          uniqueByEmbedUrl.set(game.embedUrl, game);
        }
      }

      const policySafeGames = [...uniqueByEmbedUrl.values()].filter((game: any) => isGameUrlAllowed(game.embedUrl, iframePolicy));

      if (!childId) {
        // No auth — return all active games
        return res.json(successResponse(policySafeGames));
      }

      // Check if this child has ANY assignments
      const assignments = await db.select().from(childGameAssignments)
        .where(and(eq(childGameAssignments.childId, childId), eq(childGameAssignments.isActive, true)));

      if (assignments.length === 0) {
        // No assignments exist → return all active games (backwards compatible)
        return res.json(successResponse(policySafeGames));
      }

      // Child has assignments → return only assigned games
      const assignedGameIds = new Set(assignments.map((a: typeof assignments[number]) => a.gameId));
      const filteredGames = policySafeGames.filter((g: typeof policySafeGames[number]) => assignedGameIds.has(g.id));
      return res.json(successResponse(filteredGames));
    } catch (error: any) {
      console.error("Fetch games error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch games"));
    }
  });

  // Game iframe policy for frontend sandbox/domain configuration.
  app.get("/api/games/policy", publicApiLimiter, async (_req: any, res) => {
    try {
      return res.json(successResponse(getGameIframePolicy()));
    } catch (error: any) {
      console.error("Fetch games policy error:", error);
      return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch games policy"));
    }
  });

  // Complete Game — award points, record play history, update growth tree
  app.post("/api/child/complete-game", authMiddleware, gameCompletionLimiter, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const v = validateBody(childCompleteGameSchema, req.body);
      if (!v.success) return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, v.error));
      const { gameId, score: gameScore, totalQuestions: gameTotalQ } = v.data;

      // Verify game exists and is active
      const [game] = await db.select().from(flashGames).where(and(eq(flashGames.id, gameId), eq(flashGames.isActive, true)));
      if (!game) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Game not found or inactive"));
      }

      // Check daily play limit
      const effectiveMaxPlays = game.maxPlaysPerDay; // game-level default

      // Check child-specific assignment limit
      const [assignment] = await db.select().from(childGameAssignments)
        .where(and(eq(childGameAssignments.childId, childId), eq(childGameAssignments.gameId, gameId)));

      const maxPlays = (assignment?.maxPlaysPerDay && assignment.maxPlaysPerDay > 0)
        ? assignment.maxPlaysPerDay
        : effectiveMaxPlays;

      if (maxPlays > 0) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayPlays = await db.select({ count: sql<number>`count(*)` })
          .from(gamePlayHistory)
          .where(and(
            eq(gamePlayHistory.childId, childId),
            eq(gamePlayHistory.gameId, gameId),
            sql`${gamePlayHistory.playedAt} >= ${todayStart}`
          ));

        if (Number(todayPlays[0]?.count || 0) >= maxPlays) {
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Daily play limit reached for this game"));
        }
      }

      // Scale points by performance if score is provided
      const rawScore = typeof gameScore === 'number' ? gameScore : null;
      const rawTotal = typeof gameTotalQ === 'number' && gameTotalQ > 0 ? gameTotalQ : null;
      let earnedPoints = game.pointsPerPlay;

      if (rawScore !== null && rawTotal !== null) {
        const pct = rawScore / rawTotal;
        if (pct <= 0) {
          earnedPoints = 0;
        } else if (pct < 0.5) {
          earnedPoints = Math.max(1, Math.round(game.pointsPerPlay * 0.3));
        } else if (pct < 0.8) {
          earnedPoints = Math.round(game.pointsPerPlay * 0.7);
        }
        // pct >= 0.8 → full points
      }

      // Award points via transaction
      const result = await db.transaction(async (tx: any) => {
        const { newTotalPoints } = await applyPointsDelta(tx, {
          childId,
          delta: earnedPoints,
          reason: "GAME_COMPLETED",
          requestId: `game-${gameId}-${Date.now()}`,
        });

        // Record play history with score
        await tx.insert(gamePlayHistory).values({
          childId,
          gameId,
          pointsEarned: earnedPoints,
          ...(rawScore !== null ? { score: rawScore } : {}),
          ...(rawTotal !== null ? { totalQuestions: rawTotal } : {}),
        });

        return { newTotalPoints };
      });

      // Update growth tree (outside transaction, non-blocking)
      recordGrowthEvent(childId, "game_played", 3, { gameId, title: game.title }).catch(() => { });

      // Notify linked parents about game completion result.
      const parentLinks = await db
        .select({ parentId: parentChild.parentId })
        .from(parentChild)
        .where(eq(parentChild.childId, childId));

      const scorePercent = rawScore !== null && rawTotal !== null && rawTotal > 0
        ? Math.round((rawScore / rawTotal) * 100)
        : null;

      for (const link of parentLinks) {
        createNotification({
          parentId: link.parentId,
          type: NOTIFICATION_TYPES.CHILD_ACTIVITY,
          title: "🎮 نتيجة لعبة جديدة",
          message: scorePercent !== null
            ? `أنهى طفلك ${game.title} بنسبة ${scorePercent}% وربح ${earnedPoints} نقطة.`
            : `أنهى طفلك ${game.title} وربح ${earnedPoints} نقطة.`,
          style: NOTIFICATION_STYLES.TOAST,
          priority: NOTIFICATION_PRIORITIES.NORMAL,
          soundAlert: true,
          relatedId: gameId,
          ctaAction: "view_child_games",
          ctaTarget: "/child-games",
          metadata: {
            category: "game_completion",
            childId,
            gameId,
            gameTitle: game.title,
            pointsEarned: earnedPoints,
            score: rawScore,
            totalQuestions: rawTotal,
            scorePercent,
          },
        }).catch((err) => console.error("Game completion notify parent error:", err));
      }

      res.json(successResponse({
        pointsEarned: earnedPoints,
        newTotalPoints: result.newTotalPoints,
        score: rawScore,
        totalQuestions: rawTotal,
      }, "Game completed successfully"));
    } catch (error: any) {
      console.error("Complete game error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to complete game"));
    }
  });

  // Get Child Store - SEC-004 FIX: Correct query to get parent's products for child
  app.get("/api/child/store", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;

      // Get the parent ID from parentChild relationship
      const parentLink = await db
        .select({ parentId: parentChild.parentId })
        .from(parentChild)
        .where(eq(parentChild.childId, childId));

      if (!parentLink[0]) {
        return res.status(404).json({
          success: false,
          error: "NOT_FOUND",
          message: "Parent not found for this child"
        });
      }

      const parentId = parentLink[0].parentId;

      // Get products owned by parent that are available for the child
      const ownedProducts = await db
        .select({
          id: products.id,
          name: products.name,
          nameAr: products.nameAr,
          description: products.description,
          image: products.image,
          pointsPrice: products.pointsPrice,
        })
        .from(parentOwnedProducts)
        .innerJoin(products, eq(parentOwnedProducts.productId, products.id))
        .where(and(
          eq(parentOwnedProducts.parentId, parentId),
          eq(parentOwnedProducts.status, "active")
        ));

      res.json({ success: true, data: ownedProducts });
    } catch (error: any) {
      console.error("Fetch store error:", error);
      res.status(500).json({
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch store"
      });
    }
  });

  // Create Purchase Request (for parent approval)
  app.post("/api/child/store/purchase-request", authMiddleware, async (req: any, res) => {
    try {
      const { productId, quantity = 1 } = req.body;
      const requestedSourceAdId = String(req.body?.sourceAdId || "").trim();
      const normalizedQuantity = Math.max(1, parseInt(String(quantity), 10) || 1);

      if (!productId) {
        return res.status(400).json({ message: "Product ID is required" });
      }

      const child = await db.select().from(children).where(eq(children.id, req.user.childId));
      if (!child[0]) {
        return res.status(404).json({ message: "Child not found" });
      }

      // Get parent linked to this child
      const link = await db.select().from(parentChild).where(eq(parentChild.childId, req.user.childId));
      if (!link[0]) {
        let shareCode = child[0].shareCode;
        if (!shareCode) {
          shareCode = await generateUniqueChildShareCode();
          await db.update(children).set({ shareCode }).where(eq(children.id, req.user.childId));
        }

        const trialChildToken = jwt.sign(
          { purpose: "trial_child_link", childId: req.user.childId, shareCode, type: "trial_child_link" },
          JWT_SECRET,
          { expiresIn: "7d" },
        );
        const baseUrl = process.env["APP_URL"] || "";
        const trialChildLinkUrl = `${baseUrl || ""}/parent-auth?mode=register&trialChildToken=${encodeURIComponent(trialChildToken)}`;
        const trialChildQrCodeUrl = await QRCode.toDataURL(trialChildLinkUrl);

        return res.json(successResponse({
          requiresParentLink: true,
          parentLink: {
            childId: req.user.childId,
            childName: child[0].name,
            shareCode,
            trialChildToken,
            trialChildLinkUrl,
            trialChildQrCodeUrl,
          },
        }, "Parent link required before purchase approval"));
      }

      let resolvedProductId = String(productId);
      let resolvedLibraryProductId: string | null = null;
      let effectivePointsPerUnit = 0;
      let effectiveProductName = "";
      let effectiveProductImage: string | null = null;
      let appliedCampaignDiscountPercent: number | null = null;
      let appliedCampaignAdId: string | null = null;

      const regularProduct = await db.select().from(products).where(eq(products.id, String(productId)));
      if (regularProduct[0]) {
        effectivePointsPerUnit = regularProduct[0].pointsPrice;
        effectiveProductName = regularProduct[0].nameAr || regularProduct[0].name;
        effectiveProductImage = regularProduct[0].image;

        if (requestedSourceAdId) {
          const campaignRows = await db
            .select({
              id: ads.id,
              isActive: ads.isActive,
              targetAudience: ads.targetAudience,
              startDate: ads.startDate,
              endDate: ads.endDate,
              linkUrl: ads.linkUrl,
            })
            .from(ads)
            .where(eq(ads.id, requestedSourceAdId))
            .limit(1);

          const campaign = campaignRows[0];
          if (campaign?.isActive) {
            const now = new Date();
            const inWindow = (!campaign.startDate || now >= campaign.startDate) && (!campaign.endDate || now <= campaign.endDate);
            const audience = String(campaign.targetAudience || "all").trim().toLowerCase();
            const audienceOk = audience === "all" || audience === "children";
            const parsedPromo = parsePromoParamsFromLink(campaign.linkUrl);
            const isPromoTarget = parsedPromo.promoProductId === resolvedProductId;

            if (inWindow && audienceOk && isPromoTarget && parsedPromo.discountPercent && parsedPromo.discountPercent > 0) {
              const discounted = Math.round(effectivePointsPerUnit * (1 - parsedPromo.discountPercent / 100));
              effectivePointsPerUnit = Math.max(1, discounted);
              appliedCampaignDiscountPercent = parsedPromo.discountPercent;
              appliedCampaignAdId = campaign.id;
            }
          }
        }
      } else {
        const libraryProduct = await db
          .select({
            id: libraryProducts.id,
            libraryId: libraryProducts.libraryId,
            title: libraryProducts.title,
            description: libraryProducts.description,
            imageUrl: libraryProducts.imageUrl,
            price: libraryProducts.price,
            discountPercent: libraryProducts.discountPercent,
            stock: libraryProducts.stock,
            libraryName: libraries.name,
          })
          .from(libraryProducts)
          .innerJoin(libraries, eq(libraryProducts.libraryId, libraries.id))
          .where(
            and(
              eq(libraryProducts.id, String(productId)),
              eq(libraryProducts.isActive, true),
              eq(libraries.isActive, true)
            )
          );

        if (!libraryProduct[0]) {
          return res.status(404).json({ message: "Product not found" });
        }

        if (libraryProduct[0].stock < normalizedQuantity) {
          return res.status(400).json({ message: "Product out of stock" });
        }

        const unitPrice = libraryProduct[0].discountPercent > 0
          ? parseFloat(libraryProduct[0].price) * (1 - libraryProduct[0].discountPercent / 100)
          : parseFloat(libraryProduct[0].price);

        effectivePointsPerUnit = Math.round(unitPrice * 10);
        effectiveProductName = libraryProduct[0].title;
        effectiveProductImage = libraryProduct[0].imageUrl;
        resolvedLibraryProductId = libraryProduct[0].id;

        const snapshot = await db
          .insert(products)
          .values({
            parentId: link[0].parentId,
            name: libraryProduct[0].title,
            nameAr: libraryProduct[0].title,
            description: libraryProduct[0].description,
            descriptionAr: libraryProduct[0].description,
            price: unitPrice.toFixed(2),
            originalPrice: libraryProduct[0].discountPercent > 0 ? libraryProduct[0].price : null,
            pointsPrice: effectivePointsPerUnit,
            image: libraryProduct[0].imageUrl,
            images: libraryProduct[0].imageUrl ? [libraryProduct[0].imageUrl] : [],
            stock: 999,
            productType: "physical",
            brand: libraryProduct[0].libraryName,
            isFeatured: false,
            isActive: false,
          })
          .returning();

        resolvedProductId = snapshot[0].id;
      }

      const totalPointsNeeded = effectivePointsPerUnit * normalizedQuantity;
      if (child[0].totalPoints < totalPointsNeeded) {
        return res.status(400).json({ message: "Not enough points" });
      }

      // Check for existing pending request for same product
      const existingRequest = await db
        .select()
        .from(childPurchaseRequests)
        .where(
          and(
            eq(childPurchaseRequests.childId, req.user.childId),
            eq(childPurchaseRequests.status, "pending"),
            resolvedLibraryProductId
              ? eq(childPurchaseRequests.libraryProductId, resolvedLibraryProductId)
              : eq(childPurchaseRequests.productId, resolvedProductId)
          )
        );

      if (existingRequest[0]) {
        return res.status(400).json({ message: "You already have a pending request for this product" });
      }

      // Create purchase request (points NOT deducted yet)
      const requestResult = await db
        .insert(childPurchaseRequests)
        .values({
          childId: req.user.childId,
          parentId: link[0].parentId,
          productId: resolvedProductId,
          libraryProductId: resolvedLibraryProductId,
          quantity: normalizedQuantity,
          pointsPrice: totalPointsNeeded,
          status: "pending",
        })
        .returning();

      // Send notification to parent
      await createNotification({
        parentId: link[0].parentId,
        type: NOTIFICATION_TYPES.PURCHASE_REQUEST,
        title: "طلب شراء جديد!",
        message: `${child[0].name} يريد شراء ${effectiveProductName} بـ ${totalPointsNeeded} نقطة${appliedCampaignDiscountPercent ? ` (خصم ${appliedCampaignDiscountPercent}%)` : ""}`,
        metadata: {
          requestId: requestResult[0].id,
          childId: req.user.childId,
          childName: child[0].name,
          productId: resolvedProductId,
          libraryProductId: resolvedLibraryProductId,
          productName: effectiveProductName,
          productImage: effectiveProductImage,
          pointsPrice: totalPointsNeeded,
          quantity: normalizedQuantity,
          sourceAdId: appliedCampaignAdId,
          campaignDiscountPercent: appliedCampaignDiscountPercent,
        },
      });

      res.json({
        success: true,
        requestId: requestResult[0].id,
        message: "Purchase request sent to parent for approval"
      });
    } catch (error: any) {
      console.error("Purchase request error:", error);
      res.status(500).json({ message: "Failed to create purchase request" });
    }
  });

  // Get child's purchase requests
  app.get("/api/child/store/purchase-requests", authMiddleware, async (req: any, res) => {
    try {
      const requests = await db
        .select({
          id: childPurchaseRequests.id,
          productId: childPurchaseRequests.productId,
          quantity: childPurchaseRequests.quantity,
          pointsPrice: childPurchaseRequests.pointsPrice,
          status: childPurchaseRequests.status,
          rejectionReason: childPurchaseRequests.rejectionReason,
          orderId: childPurchaseRequests.orderId,
          createdAt: childPurchaseRequests.createdAt,
          decidedAt: childPurchaseRequests.decidedAt,
        })
        .from(childPurchaseRequests)
        .where(eq(childPurchaseRequests.childId, req.user.childId))
        .orderBy(sql`${childPurchaseRequests.createdAt} DESC`);

      // Get product details for each request
      const enrichedRequests = await Promise.all(requests.map(async (request: typeof requests[number]) => {
        const product = await db.select().from(products).where(eq(products.id, request.productId));
        return {
          ...request,
          product: product[0] ? {
            name: product[0].name,
            nameAr: product[0].nameAr,
            image: product[0].image,
          } : null
        };
      }));

      res.json({ success: true, data: enrichedRequests });
    } catch (error: any) {
      console.error("Get purchase requests error:", error);
      res.status(500).json({ message: "Failed to get purchase requests" });
    }
  });

  // Get child order details for an approved purchase request.
  app.get("/api/child/store/orders/:orderId", authMiddleware, async (req: any, res) => {
    try {
      const orderId = String(req.params?.orderId || "").trim();
      if (!orderId) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Order ID is required"));
      }

      const requestRow = await db
        .select({ id: childPurchaseRequests.id })
        .from(childPurchaseRequests)
        .where(and(
          eq(childPurchaseRequests.childId, req.user.childId),
          eq(childPurchaseRequests.orderId, orderId),
          eq(childPurchaseRequests.status, "approved"),
        ))
        .limit(1);

      if (!requestRow[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Order not found"));
      }

      const order = await db
        .select()
        .from(storeOrders)
        .where(eq(storeOrders.id, orderId))
        .limit(1);

      if (!order[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Order not found"));
      }

      const items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, orderId));

      const enrichedItems = await Promise.all(items.map(async (item: typeof items[number]) => {
        const product = await db
          .select({
            id: products.id,
            name: products.name,
            nameAr: products.nameAr,
            image: products.image,
          })
          .from(products)
          .where(eq(products.id, item.productId))
          .limit(1);

        return {
          ...item,
          product: product[0] || null,
        };
      }));

      return res.json(successResponse({ order: order[0], items: enrichedItems }));
    } catch (error: any) {
      console.error("Get child order error:", error);
      return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch order"));
    }
  });

  // Get Subjects
  app.get("/api/subjects", publicApiLimiter, async (req, res) => {
    try {
      const result = await db.select().from(subjects).where(eq(subjects.isActive, true));
      res.json(result);
    } catch (error: any) {
      console.error("Fetch subjects error:", error);
      res.status(500).json({ message: "Failed to fetch subjects" });
    }
  });

  // Get Template Tasks by Subject
  app.get("/api/subjects/:subjectId/templates", publicApiLimiter, async (req, res) => {
    try {
      const { subjectId } = req.params;
      const result = await db
        .select()
        .from(templateTasks)
        .where(and(eq(templateTasks.subjectId, subjectId), eq(templateTasks.isActive, true)));
      res.json(result);
    } catch (error: any) {
      console.error("Fetch templates error:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  // Get All Template Tasks
  app.get("/api/template-tasks", publicApiLimiter, async (req, res) => {
    try {
      const result = await db.select().from(templateTasks).where(eq(templateTasks.isActive, true));
      res.json(result);
    } catch (error: any) {
      console.error("Fetch all templates error:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  // الحصول على الأحداث والهدايا المعلقة للطفل

  // Get Child Notifications (in-app)
  app.get("/api/child/notifications", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const includeMeta = String(req.query.includeMeta || "").toLowerCase() === "1" || String(req.query.includeMeta || "").toLowerCase() === "true";
      const hasLimit = req.query.limit !== undefined;
      const hasOffset = req.query.offset !== undefined;
      const parsedLimit = Number(req.query.limit);
      const parsedOffset = Number(req.query.offset);

      const limit = hasLimit
        ? Math.min(200, Math.max(1, Number.isFinite(parsedLimit) ? Math.trunc(parsedLimit) : 50))
        : 50;
      const offset = hasOffset
        ? Math.max(0, Number.isFinite(parsedOffset) ? Math.trunc(parsedOffset) : 0)
        : 0;

      const shouldPaginate = includeMeta || hasLimit || hasOffset;

      if (!shouldPaginate) {
        const result = await db
          .select()
          .from(notifications)
          .where(eq(notifications.childId, childId))
          .orderBy(desc(notifications.createdAt), desc(notifications.id));

        return res.json({ success: true, data: result });
      }

      const items = await db
        .select()
        .from(notifications)
        .where(eq(notifications.childId, childId))
        .orderBy(desc(notifications.createdAt), desc(notifications.id))
        .limit(limit)
        .offset(offset);

      if (!includeMeta) {
        return res.json({ success: true, data: items });
      }

      const [row] = await db
        .select({ total: count() })
        .from(notifications)
        .where(eq(notifications.childId, childId));

      const total = Number(row?.total || 0);

      res.json({
        success: true,
        data: {
          items,
          total,
          limit,
          offset,
          hasMore: offset + items.length < total,
        },
      });
    } catch (error: any) {
      console.error("Fetch child notifications error:", error);
      res.status(500).json({ message: "Failed to fetch child notifications" });
    }
  });

  // Get Child Unread Notifications Count
  app.get("/api/child/notifications/unread-count", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const [row] = await db
        .select({ count: count() })
        .from(notifications)
        .where(and(eq(notifications.childId, childId), eq(notifications.isRead, false)));

      res.json({ success: true, data: { count: Number(row?.count || 0) } });
    } catch (error: any) {
      console.error("Fetch child unread count error:", error);
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  app.get("/api/child/notifications/stream", async (req: any, res) => {
    try {
      const token = typeof req.query.token === "string" ? req.query.token : "";
      if (!token) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, "Missing token"));
      }

      const payload = jwt.verify(token, JWT_SECRET) as { childId?: string; type?: string };
      if (!payload?.childId || payload?.type !== "child") {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, "Invalid child token"));
      }

      const childId = payload.childId;

      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      });

      res.write(`retry: 3000\n\n`);
      res.write(`event: ready\ndata: ${JSON.stringify({ success: true })}\n\n`);

      const heartbeat = setInterval(() => {
        res.write(`event: heartbeat\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`);
      }, 25000);

      const unsubscribe = notificationBus.subscribeChild(childId, (notification) => {
        res.write(`event: notification\ndata: ${JSON.stringify(notification)}\n\n`);
      });

      req.on("close", () => {
        clearInterval(heartbeat);
        unsubscribe();
        res.end();
      });
    } catch {
      return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, "Invalid token"));
    }
  });

  // Resolve / mark notification as handled by child
  app.post("/api/child/notifications/:id/resolve", authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const childId = req.user.childId;

      // Ensure notification belongs to child
      const notif = await db.select().from(notifications).where(and(eq(notifications.id, id), eq(notifications.childId, childId)));
      if (!notif[0]) return res.status(404).json({ message: "Notification not found" });

      const updated = await db
        .update(notifications)
        .set({ isRead: true, status: "resolved", resolvedAt: new Date() })
        .where(eq(notifications.id, id))
        .returning();

      res.json({ success: true, data: updated[0] });
    } catch (error: any) {
      console.error("Resolve notification error:", error);
      res.status(500).json({ message: "Failed to resolve notification" });
    }
  });

  // Mark notification as read (Phase 1.4 UI endpoint)
  app.put("/api/child/notifications/:id/read", authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const childId = req.user.childId;

      // Ensure notification belongs to child
      const notif = await db
        .select()
        .from(notifications)
        .where(and(eq(notifications.id, id), eq(notifications.childId, childId)));
      if (!notif[0]) {
        return res.status(404).json({ message: "Notification not found" });
      }

      // Mark as read with timestamp
      const updated = await db
        .update(notifications)
        .set({ isRead: true, readAt: new Date() })
        .where(eq(notifications.id, id))
        .returning();

      res.json({ success: true, data: updated[0] });
    } catch (error: any) {
      console.error("Mark read notification error:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // الاعتراف بحدث / هدية
  app.post("/api/child/events/ack/:eventId", authMiddleware, async (req: any, res) => {
    try {
      const { eventId } = req.params;
      const childId = req.user.childId;

      // التحقق من وجود الحدث والتأكد من أنه يخص هذا الطفل
      const event = await db
        .select()
        .from(childEvents)
        .where(and(eq(childEvents.id, eventId), eq(childEvents.childId, childId)));

      if (!event[0]) {
        return res.status(404).json({ message: "Event not found" });
      }

      // تحديث الحدث
      const updated = await db
        .update(childEvents)
        .set({
          isAcknowledged: true,
          acknowledgedAt: new Date(),
        })
        .where(eq(childEvents.id, eventId))
        .returning();

      // إذا كان نوع الحدث GIFT_ASSIGNED، تحديث حالة الهدية
      if (event[0].eventType === "GIFT_ASSIGNED" && event[0].relatedId) {
        await db
          .update(childGifts)
          .set({
            status: "delivered",
            deliveredAt: new Date(),
          })
          .where(eq(childGifts.id, event[0].relatedId));
      }

      res.json({
        success: true,
        data: {
          eventId,
          message: "Event acknowledged",
        },
      });
    } catch (error: any) {
      console.error("Acknowledge event error:", error);
      res.status(500).json({ message: "Failed to acknowledge event" });
    }
  });

  // الاعتراف بالهدية (تم فتح/استقبال الهدية)
  app.post("/api/child/gifts/:giftId/acknowledge", authMiddleware, async (req: any, res) => {
    try {
      const { giftId } = req.params;
      const childId = req.user.childId;

      const gift = await db
        .select()
        .from(childGifts)
        .where(and(eq(childGifts.id, giftId), eq(childGifts.childId, childId)));

      if (!gift[0]) {
        return res.status(404).json({ message: "Gift not found" });
      }

      const updated = await db
        .update(childGifts)
        .set({
          status: "acknowledged",
          acknowledgedAt: new Date(),
        })
        .where(eq(childGifts.id, giftId))
        .returning();

      res.json({
        success: true,
        data: updated[0],
      });
    } catch (error: any) {
      console.error("Acknowledge gift error:", error);
      res.status(500).json({ message: "Failed to acknowledge gift" });
    }
  });

  // الحصول على الهدايا السابقة / المستلمة (point-based rewards from childGifts table)
  // Note: Store gifts (parent-sent products) are at /api/child/store-gifts in store.ts
  app.get("/api/child/gifts", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const result = await db
        .select()
        .from(childGifts)
        .where(eq(childGifts.childId, childId));

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error("Fetch gifts error:", error);
      res.status(500).json({ message: "Failed to fetch gifts" });
    }
  });

  // Get child assigned rewards / products
  app.get("/api/child/rewards", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const assigned = await db.select().from(childAssignedProducts).where(eq(childAssignedProducts.childId, childId));

      const child = await db.select().from(children).where(eq(children.id, childId));
      const currentPoints = child[0]?.totalPoints || 0;

      const enriched = await Promise.all(
        assigned.map(async (a: any) => {
          const owned = await db.select().from(parentOwnedProducts).where(eq(parentOwnedProducts.id, a.parentOwnedProductId));
          const product = await db.select().from(products).where(eq(products.id, owned[0]?.productId));
          return {
            ...a,
            product: product[0] || null,
            progress: {
              currentPoints,
              requiredPoints: a.requiredPoints,
              ready: currentPoints >= a.requiredPoints,
            },
          };
        })
      );

      res.json({ success: true, data: enriched });
    } catch (error: any) {
      console.error("Fetch child rewards error:", error);
      res.status(500).json({ message: "Failed to fetch child rewards" });
    }
  });

  // تعديل إعدادات الإشعارات للطفل
  app.post("/api/child/notification-settings", authMiddleware, async (req: any, res) => {
    try {
      const v = validateBody(childNotificationSettingsSchema, req.body);
      if (!v.success) return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, v.error));
      const childId = req.user.childId;

      // Child accounts are not allowed to weaken task alert behavior.
      // We always enforce strict mandatory mode from this endpoint.
      const enforcedMode = "popup_strict";
      const enforcedRepeatDelayMinutes = 1;
      const enforcedRequireOverlayPermission = true;

      // التحقق من وجود الإعدادات
      const existing = await db
        .select()
        .from(childNotificationSettings)
        .where(eq(childNotificationSettings.childId, childId));

      let result;
      if (existing[0]) {
        result = await db
          .update(childNotificationSettings)
          .set({
            mode: enforcedMode,
            repeatDelayMinutes: enforcedRepeatDelayMinutes,
            requireOverlayPermission: enforcedRequireOverlayPermission,
            updatedAt: new Date(),
          })
          .where(eq(childNotificationSettings.childId, childId))
          .returning();
      } else {
        result = await db
          .insert(childNotificationSettings)
          .values({
            childId,
            mode: enforcedMode,
            repeatDelayMinutes: enforcedRepeatDelayMinutes,
            requireOverlayPermission: enforcedRequireOverlayPermission,
          })
          .returning();
      }

      res.json({
        success: true,
        data: result[0],
        message: "Task notification mode is enforced for child accounts",
      });
    } catch (error: any) {
      console.error("Update notification settings error:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  app.get("/api/child/push-subscriptions", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const rows = await db
        .select()
        .from(childPushSubscriptions)
        .where(eq(childPushSubscriptions.childId, childId));

      res.json({ success: true, data: rows });
    } catch (error: any) {
      console.error("Get child push subscriptions error:", error);
      res.status(500).json({ success: false, error: "INTERNAL_SERVER_ERROR", message: "Failed to fetch push subscriptions" });
    }
  });

  app.get("/api/child/push-public-key", authMiddleware, async (req: any, res) => {
    try {
      const publicKey = getVapidPublicKey();
      if (!publicKey) {
        return res.status(503).json({
          success: false,
          error: "WEB_PUSH_NOT_CONFIGURED",
          message: "Web push is not configured on server",
        });
      }

      res.json({ success: true, data: { publicKey } });
    } catch (error: any) {
      console.error("Get push public key error:", error);
      res.status(500).json({ success: false, error: "INTERNAL_SERVER_ERROR", message: "Failed to fetch public key" });
    }
  });

  app.post("/api/child/push-subscriptions", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const { platform, endpoint, token, p256dh, auth, deviceId } = req.body || {};

      if (!platform || !["web", "android", "ios"].includes(platform)) {
        return res.status(400).json({ success: false, error: "BAD_REQUEST", message: "platform must be one of: web, android, ios" });
      }

      if (!endpoint && !token) {
        return res.status(400).json({ success: false, error: "BAD_REQUEST", message: "endpoint or token is required" });
      }

      const existingRows = await db
        .select()
        .from(childPushSubscriptions)
        .where(eq(childPushSubscriptions.childId, childId));

      const existing = existingRows.find((row: any) => {
        if (deviceId && row.deviceId && row.deviceId === deviceId && row.platform === platform) return true;
        if (endpoint && row.endpoint && row.endpoint === endpoint) return true;
        if (token && row.token && row.token === token) return true;
        return false;
      });

      if (existing) {
        const [updated] = await db
          .update(childPushSubscriptions)
          .set({
            platform,
            endpoint: endpoint || null,
            token: token || null,
            p256dh: p256dh || null,
            auth: auth || null,
            deviceId: deviceId || null,
            isActive: true,
            lastSeenAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(childPushSubscriptions.id, existing.id))
          .returning();
        return res.json({ success: true, data: updated });
      }

      const [created] = await db
        .insert(childPushSubscriptions)
        .values({
          childId,
          platform,
          endpoint: endpoint || null,
          token: token || null,
          p256dh: p256dh || null,
          auth: auth || null,
          deviceId: deviceId || null,
          isActive: true,
        })
        .returning();

      res.json({ success: true, data: created });
    } catch (error: any) {
      console.error("Upsert child push subscription error:", error);
      res.status(500).json({ success: false, error: "INTERNAL_SERVER_ERROR", message: "Failed to save push subscription" });
    }
  });

  app.delete("/api/child/push-subscriptions/:id", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const { id } = req.params;

      const row = await db
        .select()
        .from(childPushSubscriptions)
        .where(eq(childPushSubscriptions.id, id));

      if (!row[0] || row[0].childId !== childId) {
        return res.status(404).json({ success: false, error: "NOT_FOUND", message: "Subscription not found" });
      }

      await db
        .update(childPushSubscriptions)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(childPushSubscriptions.id, id));

      res.json({ success: true, message: "Push subscription deactivated" });
    } catch (error: any) {
      console.error("Delete child push subscription error:", error);
      res.status(500).json({ success: false, error: "INTERNAL_SERVER_ERROR", message: "Failed to remove push subscription" });
    }
  });

  // ===== Phase 1.3: Gifts - List Child Gifts =====
  // LOGIC-001 FIX: Route conflict resolved
  // - /api/child/gifts (this file, line ~1022) → point-based rewards from childGifts table
  // - /api/child/store-gifts (store.ts) → parent-sent product gifts from gifts table

  // ===== Phase 1.3: Gifts - Activate Gift =====
  app.post("/api/child/gifts/:id/activate", authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const childId = req.user.childId;

      // Lock gift row
      const gift = await db.select().from(gifts).where(eq(gifts.id, id));
      if (!gift[0]) {
        return res.status(404).json({ message: "Gift not found" });
      }
      if (gift[0].childId !== childId) {
        return res.status(403).json({ message: "Gift does not belong to this child" });
      }
      if (gift[0].status === "ACTIVATED") {
        return res.json({ success: true, message: "Gift already activated" });
      }
      if (gift[0].status !== "UNLOCKED") {
        return res.status(400).json({ message: "Gift is not unlocked yet" });
      }

      // Update entitlement to ACTIVE (childId already set)
      const ent = await db
        .select()
        .from(entitlements)
        .where(
          and(
            eq(entitlements.productId, gift[0].productId),
            eq(entitlements.parentId, gift[0].parentId),
            eq(entitlements.childId, childId)
          )
        );
      if (ent[0]) {
        await db
          .update(entitlements)
          .set({
            status: "ACTIVE",
            metadata: { ...ent[0].metadata, giftId: id, activatedAt: new Date().toISOString() },
            updatedAt: new Date(),
          })
          .where(eq(entitlements.id, ent[0].id));
      }

      // Update gift to ACTIVATED
      await db
        .update(gifts)
        .set({ status: "ACTIVATED", activatedAt: new Date() })
        .where(and(eq(gifts.id, id), eq(gifts.status, "UNLOCKED")));

      // Activity log
      await db.insert(activityLog).values({
        adminId: null,
        action: "GIFT_ACTIVATED",
        entity: "gift",
        entityId: id,
        meta: { childId, productId: gift[0].productId },
      });

      // Emit stub event
      emitGiftEvent({
        type: "gift.activated",
        giftId: id,
        parentId: gift[0].parentId,
        childId,
        productId: gift[0].productId,
        timestamp: new Date(),
      });

      res.json({ success: true, message: "Gift activated" });
    } catch (error: any) {
      console.error("Activate gift error:", error);
      res.status(500).json({ message: "Failed to activate gift" });
    }
  });

  // ===== Task Notifications (Sponsored Ad Style) =====
  app.get("/api/child/task-notifications", authMiddleware, async (req: any, res) => {
    try {
      // SEC: Always use authenticated child's ID — never allow query param override
      const childId = req.user?.childId;

      if (!childId) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "childId is required"));
      }

      // Get pending tasks assigned to this child that need notification
      const pendingTasks = await db
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.childId, childId),
            eq(tasks.status, "pending")
          )
        )
        .orderBy(desc(tasks.createdAt))
        .limit(5);

      const pendingTaskIds = pendingTasks.map((task: typeof tasks.$inferSelect) => task.id);
      const failedAttemptsByTask: Record<string, number> = {};

      if (pendingTaskIds.length > 0) {
        const failedRows = await db
          .select({
            taskId: taskResults.taskId,
            failedCount: count(taskResults.id),
          })
          .from(taskResults)
          .where(
            and(
              eq(taskResults.childId, childId),
              inArray(taskResults.taskId, pendingTaskIds),
              eq(taskResults.isCorrect, false)
            )
          )
          .groupBy(taskResults.taskId);

        for (const row of failedRows) {
          failedAttemptsByTask[row.taskId] = Number(row.failedCount || 0);
        }
      }

      // Transform tasks into notification format expected by child popup UI.
      const taskNotifications = pendingTasks.map((task: typeof tasks.$inferSelect) => {
        const normalizedAnswers = normalizeAnswers(task.answers, task.question);
        const hasQuestionFlow = normalizedAnswers.length > 0 || !!task.question;

        return {
          id: task.id,
          title: "مهمة جديدة!",
          description: task.question,
          type: hasQuestionFlow ? "question" : "task",
          question: task.question,
          answers: normalizedAnswers,
          points: task.pointsReward,
          failedAttempts: failedAttemptsByTask[task.id] || 0,
          isMandatory: true,
          imageUrl: task.imageUrl,
          gifUrl: task.gifUrl,
        };
      });

      res.json(successResponse(taskNotifications));
    } catch (error: any) {
      console.error("Get task notifications error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to get task notifications"));
    }
  });

  app.post("/api/child/task-notifications/complete", authMiddleware, async (req: any, res) => {
    try {
      const WRONG_ATTEMPTS_THRESHOLD = 3;
      const COOLDOWN_WINDOW_SECONDS = 30;
      const COOLDOWN_SECONDS = 15;

      const v = validateBody(childTaskNotificationCompleteSchema, req.body);
      if (!v.success) return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, v.error));

      const { notificationId, answerId } = v.data;
      const childId = req.user.childId;

      // Find the task
      const task = await db.select().from(tasks).where(eq(tasks.id, notificationId));
      if (!task[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Task not found"));
      }

      // Verify task belongs to child
      if (task[0].childId !== childId) {
        return res.status(403).json(errorResponse(ErrorCode.FORBIDDEN, "Task does not belong to this child"));
      }

      const normalizedAnswers = normalizeAnswers(task[0].answers, task[0].question);
      const hasQuestionFlow = normalizedAnswers.length > 0;

      if (hasQuestionFlow && !answerId) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "answerId is required for question tasks"));
      }

      const [recentFailedAttempts] = await db
        .select({ value: count(taskResults.id) })
        .from(taskResults)
        .where(
          and(
            eq(taskResults.taskId, notificationId),
            eq(taskResults.childId, childId),
            eq(taskResults.isCorrect, false),
            sql`${taskResults.completedAt} >= now() - (${COOLDOWN_WINDOW_SECONDS} * interval '1 second')`
          )
        );

      const recentFailedCount = Number(recentFailedAttempts?.value || 0);
      if (recentFailedCount >= WRONG_ATTEMPTS_THRESHOLD) {
        res.setHeader("Retry-After", String(COOLDOWN_SECONDS));
        return res.status(429).json(
          errorResponse(
            ErrorCode.RATE_LIMITED,
            `Too many wrong attempts. Try again in ${COOLDOWN_SECONDS} seconds`
          )
        );
      }

      let selectedAnswerId = "auto_complete";
      let isCorrect = true;

      if (hasQuestionFlow) {
        const selectedAnswer = normalizedAnswers.find((ans: any) => ans.id === answerId);
        if (!selectedAnswer) {
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid answer"));
        }
        selectedAnswerId = answerId as string;
        isCorrect = selectedAnswer.isCorrect === true;
      }

      const result = await db.transaction(async (tx: any) => {
        const existingCorrect = await tx
          .select()
          .from(taskResults)
          .where(and(
            eq(taskResults.taskId, notificationId),
            eq(taskResults.childId, childId),
            eq(taskResults.isCorrect, true)
          ))
          .limit(1);

        if (existingCorrect[0]) {
          return {
            status: "already" as const,
            isCorrect: true,
            pointsAwarded: existingCorrect[0].pointsEarned,
          };
        }

        if (!isCorrect) {
          await tx.insert(taskResults).values({
            taskId: notificationId,
            childId,
            selectedAnswerId,
            isCorrect: false,
            pointsEarned: 0,
          });
          return { status: "wrong" as const };
        }

        const updated = await tx
          .update(tasks)
          .set({ status: "completed" })
          .where(and(eq(tasks.id, notificationId), eq(tasks.status, "pending")))
          .returning();

        if (!updated[0]) {
          return { status: "conflict" as const };
        }

        const pointsToAward = task[0].pointsReward;

        await tx.insert(taskResults).values({
          taskId: notificationId,
          childId,
          selectedAnswerId,
          isCorrect: true,
          pointsEarned: pointsToAward,
        });

        const pointsResult = await applyPointsDelta(tx, {
          childId,
          delta: pointsToAward,
          reason: "TASK_COMPLETED",
          taskId: notificationId,
        });

        return {
          status: "correct" as const,
          isCorrect: true,
          pointsAwarded: pointsToAward,
          newTotalPoints: pointsResult.newTotalPoints,
          childName: pointsResult.childName || "طفلك",
        };
      });

      if (result.status === "already") {
        return res.json(successResponse({
          isCorrect: result.isCorrect,
          pointsAwarded: result.pointsAwarded,
        }, "Task already completed"));
      }

      if (result.status === "wrong") {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Incorrect answer"));
      }

      if (result.status === "conflict") {
        return res.status(409).json(errorResponse(ErrorCode.CONFLICT, "Task already completed"));
      }

      await unlockEligibleGifts(childId, result.newTotalPoints);

      try {
        await db
          .update(notifications)
          .set({ isRead: true, status: "resolved", resolvedAt: new Date() })
          .where(and(eq(notifications.relatedId, notificationId), eq(notifications.childId, childId)));
      } catch (notifyErr: any) {
        console.error("Failed to update notification after correct answer:", notifyErr);
      }

      const failedAttempts = await getFailedAttemptCount(notificationId, childId);
      await logTaskCompletion(childId, task[0], result.childName, failedAttempts);
      const helpResolution = await autoResolveActiveHelpRequests(task[0], childId);

      res.json(successResponse({
        isCorrect: result.isCorrect,
        pointsAwarded: result.pointsAwarded,
        helpAutoResolved: helpResolution.resolvedCount > 0,
        resolvedHelpRequestCount: helpResolution.resolvedCount,
      }, "Task completed"));
    } catch (error: any) {
      console.error("Complete task notification error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to complete task"));
    }
  });

  // ===== Task Help System (نظام المساعدة في المهام) =====

  // Request help on a task
  app.post("/api/child/request-help", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const v = validateBody(childHelpRequestSchema, req.body);
      if (!v.success) return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, v.error));
      const { taskId, initialQuestion } = v.data;

      // Get the task
      const task = await db.select().from(tasks)
        .where(and(eq(tasks.id, taskId), eq(tasks.childId, childId)));

      if (!task[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "المهمة غير موجودة"));
      }

      // Check if help request already exists and is active
      const existingHelp = await db.select().from(taskHelpRequests)
        .where(and(
          eq(taskHelpRequests.taskId, taskId),
          eq(taskHelpRequests.childId, childId),
          eq(taskHelpRequests.status, "active")
        ));

      if (existingHelp[0]) {
        return res.json(successResponse({ helpRequestId: existingHelp[0].id, existing: true }));
      }

      const linkedParents = await db.select({ parentId: parentChild.parentId })
        .from(parentChild)
        .where(eq(parentChild.childId, childId));

      const parentCandidateIds: string[] = Array.from(
        new Set(linkedParents.map((p: any) => String(p.parentId)))
      );

      // Determine whether a teacher is an eligible helper for this task.
      const senderType = task[0].senderType || "parent";
      let teacherCandidateId: string | null = null;

      if (senderType === "teacher" && task[0].teacherId) {
        const teacherId = task[0].teacherId;

        const activePermission = await db.select({ id: teacherChildPermissions.id })
          .from(teacherChildPermissions)
          .where(and(
            eq(teacherChildPermissions.teacherId, teacherId),
            eq(teacherChildPermissions.childId, childId),
            eq(teacherChildPermissions.isActive, true)
          ))
          .limit(1);

        if (activePermission[0]) {
          let teacherIsResponsibleForSubject = true;

          if (task[0].subjectId) {
            const subjectRows = await db.select({ name: subjects.name })
              .from(subjects)
              .where(eq(subjects.id, task[0].subjectId))
              .limit(1);

            if (subjectRows[0]?.name) {
              const assignmentRows = await db.select({ subjectLabel: childTeacherAssignment.subjectLabel })
                .from(childTeacherAssignment)
                .where(and(
                  eq(childTeacherAssignment.childId, childId),
                  eq(childTeacherAssignment.teacherId, teacherId)
                ))
                .limit(1);

              const assignedSubject = normalizeSubjectLabel(assignmentRows[0]?.subjectLabel);
              const taskSubject = normalizeSubjectLabel(subjectRows[0].name);
              teacherIsResponsibleForSubject = !assignedSubject || assignedSubject === taskSubject;
            }
          }

          if (teacherIsResponsibleForSubject) {
            teacherCandidateId = teacherId;
          }
        }
      }

      const hasTeacherCandidate = Boolean(teacherCandidateId);
      const hasParentCandidates = parentCandidateIds.length > 0;

      if (!hasTeacherCandidate && !hasParentCandidates) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "لا يمكن تحديد المرسل"));
      }

      let helperType: "parent" | "teacher" | "unassigned" = "unassigned";
      let helperId = "";

      const candidateCount = (hasTeacherCandidate ? 1 : 0) + parentCandidateIds.length;
      if (candidateCount === 1) {
        if (hasTeacherCandidate) {
          helperType = "teacher";
          helperId = teacherCandidateId as string;
        } else {
          helperType = "parent";
          helperId = parentCandidateIds[0] as string;
        }
      }

      // Create help request
      const helpReq = await db.insert(taskHelpRequests).values({
        taskId,
        childId,
        helperType,
        helperId,
      }).returning();

      // Insert initial question as first message if provided
      if (initialQuestion && typeof initialQuestion === "string" && initialQuestion.trim()) {
        await db.insert(taskHelpMessages).values({
          helpRequestId: helpReq[0].id,
          senderType: "child",
          senderId: childId,
          messageType: "text",
          content: initialQuestion.trim(),
        });
      }

      // Get child name for notification
      const child = await db.select({ name: children.name }).from(children).where(eq(children.id, childId));
      const childName = child[0]?.name || "طفل";

      if (parentCandidateIds.length > 0) {
        await db.insert(notifications).values(
          parentCandidateIds.map((parentId: string) => ({
            parentId,
            type: "task_help_requested",
            title: "طلب مساعدة لطفلك",
            message: `${childName} يحتاج مساعدة في مهمة: ${task[0].question.substring(0, 40)}...`,
            relatedId: helpReq[0].id,
            metadata: { helpRequestId: helpReq[0].id, taskId, childId, canClaim: helperType === "unassigned" },
          }))
        );
      }

      if (teacherCandidateId) {
        await db.insert(notifications).values({
          teacherId: teacherCandidateId,
          type: "task_help_requested",
          title: "طلب مساعدة!",
          message: `${childName} يحتاج مساعدة في مهمة: ${task[0].question.substring(0, 40)}...`,
          relatedId: helpReq[0].id,
          metadata: { helpRequestId: helpReq[0].id, taskId, childId, canClaim: helperType === "unassigned" },
        });
      }

      res.json(successResponse({ helpRequestId: helpReq[0].id }));
    } catch (error: any) {
      console.error("Request help error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "فشل طلب المساعدة"));
    }
  });

  // Get child's help requests
  app.get("/api/child/help-requests", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const page = Math.max(1, parseInt(String(req.query.page)) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit)) || 20));
      const offset = (page - 1) * limit;

      const helpReqs = await db.select({
        helpRequest: taskHelpRequests,
        task: {
          id: tasks.id,
          question: tasks.question,
          senderType: tasks.senderType,
        },
      })
        .from(taskHelpRequests)
        .innerJoin(tasks, eq(taskHelpRequests.taskId, tasks.id))
        .where(eq(taskHelpRequests.childId, childId))
        .orderBy(desc(taskHelpRequests.createdAt))
        .limit(limit)
        .offset(offset);

      const result = helpReqs.map((h: any) => ({
        id: h.helpRequest.id,
        taskId: h.task.id,
        taskQuestion: h.task.question,
        helperType: h.helpRequest.helperType,
        helperAssigned: h.helpRequest.helperType !== "unassigned" && !!h.helpRequest.helperId,
        status: h.helpRequest.status,
        createdAt: h.helpRequest.createdAt,
        resolvedAt: h.helpRequest.resolvedAt,
      }));

      res.json(successResponse(result));
    } catch (error: any) {
      console.error("Get child help requests error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "فشل جلب طلبات المساعدة"));
    }
  });

  app.get("/api/child/help-requests/:helpRequestId/status", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const { helpRequestId } = req.params;

      const helpReq = await db.select().from(taskHelpRequests)
        .where(and(eq(taskHelpRequests.id, helpRequestId), eq(taskHelpRequests.childId, childId)))
        .limit(1);

      if (!helpReq[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "طلب المساعدة غير موجود"));
      }

      const feedback = await db.select({
        id: taskHelpFeedback.id,
        rating: taskHelpFeedback.rating,
        comment: taskHelpFeedback.comment,
      }).from(taskHelpFeedback)
        .where(eq(taskHelpFeedback.helpRequestId, helpRequestId))
        .limit(1);

      res.json(successResponse({
        helpRequestId,
        status: helpReq[0].status,
        helperType: helpReq[0].helperType,
        helperAssigned: helpReq[0].helperType !== "unassigned" && !!helpReq[0].helperId,
        resolvedAt: helpReq[0].resolvedAt,
        feedback: feedback[0] || null,
      }));
    } catch (error: any) {
      console.error("Get child help request status error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "فشل جلب حالة طلب المساعدة"));
    }
  });

  app.post("/api/child/help-requests/:helpRequestId/feedback", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const { helpRequestId } = req.params;
      const rating = Number(req.body?.rating || 0);
      const comment = typeof req.body?.comment === "string" ? req.body.comment.trim() : "";

      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "rating must be an integer between 1 and 5"));
      }

      const helpReq = await db.select().from(taskHelpRequests)
        .where(and(eq(taskHelpRequests.id, helpRequestId), eq(taskHelpRequests.childId, childId)))
        .limit(1);

      if (!helpReq[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "طلب المساعدة غير موجود"));
      }

      if (helpReq[0].status !== "resolved") {
        return res.status(409).json(errorResponse(ErrorCode.BAD_REQUEST, "يمكن التقييم بعد إغلاق جلسة المساعدة فقط"));
      }

      const existing = await db.select({ id: taskHelpFeedback.id })
        .from(taskHelpFeedback)
        .where(eq(taskHelpFeedback.helpRequestId, helpRequestId))
        .limit(1);

      if (existing[0]) {
        return res.status(409).json(errorResponse(ErrorCode.BAD_REQUEST, "تم إرسال التقييم مسبقاً"));
      }

      const insert = await db.insert(taskHelpFeedback).values({
        helpRequestId,
        taskId: helpReq[0].taskId,
        childId,
        teacherId: helpReq[0].helperType === "teacher" ? helpReq[0].helperId : null,
        parentId: helpReq[0].helperType === "parent" ? helpReq[0].helperId : null,
        rating,
        comment: comment || null,
      }).returning();

      res.json(successResponse(insert[0], "تم حفظ التقييم"));
    } catch (error: any) {
      console.error("Create child help feedback error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "فشل حفظ التقييم"));
    }
  });

  // Get messages for a help request (child)
  app.get("/api/child/help-chat/:helpRequestId/messages", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const { helpRequestId } = req.params;

      // Verify this help request belongs to this child
      const helpReq = await db.select().from(taskHelpRequests)
        .where(and(eq(taskHelpRequests.id, helpRequestId), eq(taskHelpRequests.childId, childId)));

      if (!helpReq[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "طلب المساعدة غير موجود"));
      }

      const messages = await db.select().from(taskHelpMessages)
        .where(eq(taskHelpMessages.helpRequestId, helpRequestId))
        .orderBy(taskHelpMessages.createdAt);

      const maskedMessages = messages.map((msg: any) => ({
        ...msg,
        senderType: msg.senderType === "child" ? "child" : "helper",
        senderId: msg.senderType === "child" ? msg.senderId : null,
      }));

      res.json(successResponse(maskedMessages));
    } catch (error: any) {
      console.error("Get child help chat messages error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "فشل جلب الرسائل"));
    }
  });

  // Send message in help chat (child)
  app.post("/api/child/help-chat/:helpRequestId/messages", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const { helpRequestId } = req.params;
      const { messageType, content, mediaUrl } = req.body;

      if (!messageType || !["text", "image", "voice"].includes(messageType)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "نوع الرسالة مطلوب"));
      }

      if (messageType === "text" && !content) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "محتوى الرسالة مطلوب"));
      }

      // Verify this help request belongs to this child
      const helpReq = await db.select().from(taskHelpRequests)
        .where(and(eq(taskHelpRequests.id, helpRequestId), eq(taskHelpRequests.childId, childId)));

      if (!helpReq[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "طلب المساعدة غير موجود"));
      }

      if (helpReq[0].status !== "active") {
        return res.status(409).json(errorResponse(ErrorCode.BAD_REQUEST, "تم إغلاق جلسة المساعدة"));
      }

      const helperAssigned = helpReq[0].helperType !== "unassigned" && !!helpReq[0].helperId;
      if (!helperAssigned) {
        return res.status(409).json(errorResponse(ErrorCode.BAD_REQUEST, "لا يمكن الإرسال قبل استلام طلب المساعدة من أحد المساعدين"));
      }

      const message = await db.insert(taskHelpMessages).values({
        helpRequestId,
        senderType: "child",
        senderId: childId,
        messageType,
        content: content || null,
        mediaUrl: mediaUrl || null,
      }).returning();

      // Notify the helper (parent/teacher) or all eligible claimers when still unassigned.
      if (helpReq[0].helperType === "parent") {
        await db.insert(notifications).values({
          parentId: helpReq[0].helperId,
          type: "task_help_message",
          title: "رد على طلب المساعدة",
          message: messageType === "text" ? (content?.substring(0, 50) || "رسالة جديدة") : "رسالة وسائط جديدة",
          relatedId: helpRequestId,
          metadata: { helpRequestId, messageId: message[0].id, childId },
        });
      } else if (helpReq[0].helperType === "teacher") {
        await db.insert(notifications).values({
          teacherId: helpReq[0].helperId,
          type: "task_help_message",
          title: "رد على طلب المساعدة",
          message: messageType === "text" ? (content?.substring(0, 50) || "رسالة جديدة") : "رسالة وسائط جديدة",
          relatedId: helpRequestId,
          metadata: { helpRequestId, messageId: message[0].id, childId },
        });

        // Promote teacher service score and keep an auditable school activity log.
        const teacherInfo = await db.select({ id: schoolTeachers.id, schoolId: schoolTeachers.schoolId })
          .from(schoolTeachers)
          .where(eq(schoolTeachers.id, helpReq[0].helperId))
          .limit(1);

        if (teacherInfo[0]) {
          await db.update(schoolTeachers)
            .set({
              activityScore: sql`${schoolTeachers.activityScore} + 1`,
              updatedAt: new Date(),
            })
            .where(eq(schoolTeachers.id, teacherInfo[0].id));

          await db.insert(schoolActivityLogs).values({
            schoolId: teacherInfo[0].schoolId,
            teacherId: teacherInfo[0].id,
            action: "task_help_child_reply",
            points: 1,
            metadata: {
              helpRequestId,
              childId,
              messageId: message[0].id,
              messageType,
            },
          });
        }
      } else {
        const taskRows = await db.select({ teacherId: tasks.teacherId })
          .from(tasks)
          .where(eq(tasks.id, helpReq[0].taskId))
          .limit(1);

        const parentRows = await db.select({ parentId: parentChild.parentId })
          .from(parentChild)
          .where(eq(parentChild.childId, childId));

        if (parentRows.length > 0) {
          await db.insert(notifications).values(
            parentRows.map((p: { parentId: string }) => ({
              parentId: p.parentId,
              type: "task_help_message",
              title: "رسالة جديدة في طلب المساعدة",
              message: messageType === "text" ? (content?.substring(0, 50) || "رسالة جديدة") : "رسالة وسائط جديدة",
              relatedId: helpRequestId,
              metadata: { helpRequestId, messageId: message[0].id, childId, canClaim: true },
            }))
          );
        }

        if (taskRows[0]?.teacherId) {
          const teacherPerm = await db.select({ id: teacherChildPermissions.id })
            .from(teacherChildPermissions)
            .where(and(
              eq(teacherChildPermissions.teacherId, taskRows[0].teacherId),
              eq(teacherChildPermissions.childId, childId),
              eq(teacherChildPermissions.isActive, true)
            ))
            .limit(1);

          if (!teacherPerm[0]) {
            return res.json(successResponse(message[0]));
          }

          await db.insert(notifications).values({
            teacherId: taskRows[0].teacherId,
            type: "task_help_message",
            title: "رسالة جديدة في طلب المساعدة",
            message: messageType === "text" ? (content?.substring(0, 50) || "رسالة جديدة") : "رسالة وسائط جديدة",
            relatedId: helpRequestId,
            metadata: { helpRequestId, messageId: message[0].id, childId, canClaim: true },
          });
        }
      }

      res.json(successResponse(message[0]));
    } catch (error: any) {
      console.error("Send child help chat message error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "فشل إرسال الرسالة"));
    }
  });

  // Upload media for help chat (child)
  app.post("/api/child/help-chat/upload-media", authMiddleware, async (req: any, res) => {
    try {
      const multer = (await import("multer")).default;
      const path = await import("path");
      const fs = await import("fs");
      const uploadDir = path.resolve(process.cwd(), "uploads", "help-chat");
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      const store = multer.diskStorage({
        destination: (_r: any, _f: any, cb: any) => cb(null, uploadDir),
        filename: (_r: any, file: any, cb: any) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`),
      });
      const upload = multer({
        storage: store,
        limits: { fileSize: 8 * 1024 * 1024 },
        fileFilter: (_r: any, f: any, cb: any) => {
          const allowed = new Set([
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "audio/webm",
            "audio/wav",
            "audio/mpeg",
            "audio/mp3",
            "audio/ogg",
          ]);
          if (allowed.has(String(f.mimetype || "").toLowerCase())) cb(null, true);
          else cb(new Error("Unsupported file type. Allowed: JPG/PNG/WEBP/GIF and WEBM/WAV/MP3/OGG"));
        },
      }).single("file");
      upload(req, res, (err: any) => {
        if (err) return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, err.message));
        const file = req.file;
        if (!file) return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "No file uploaded"));
        const url = `/uploads/help-chat/${file.filename}`;
        const type = file.mimetype.startsWith("audio/") ? "voice" : "image";
        res.json(successResponse({ url, type }));
      });
    } catch (error: any) {
      console.error("Upload child help chat media error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "فشل رفع الملف"));
    }
  });

  // ===== Child Login System =====
  // PIN-based login removed - now using parent approval flow only

  // Child refresh token (auto-login with saved device)
  app.post("/api/child/refresh-token", refreshTokenLimiter, async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ message: "Refresh token required" });
      }

      const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

      // Find trusted device
      const device = await db.select()
        .from(childTrustedDevices)
        .innerJoin(children, eq(childTrustedDevices.childId, children.id))
        .where(eq(childTrustedDevices.refreshTokenHash, refreshTokenHash));

      if (!device[0]) {
        return res.status(401).json({ message: "Invalid refresh token" });
      }

      const trustedDevice = device[0].child_trusted_devices;
      const child = device[0].children;

      // Check if device is expired or revoked
      if (trustedDevice.expiresAt < new Date() || trustedDevice.revokedAt) {
        return res.status(401).json({ message: "Token expired or revoked" });
      }

      // Update last used timestamp
      await db.update(childTrustedDevices)
        .set({ lastUsedAt: new Date() })
        .where(eq(childTrustedDevices.id, trustedDevice.id));

      // Generate new JWT
      const token = jwt.sign({ childId: child.id, type: "child" }, JWT_SECRET, { expiresIn: "30d" });

      // Activate on_login scheduled sessions & resume paused ones
      activateOnLoginSessions(child.id).catch(err => console.error("Session activation on refresh error:", err));
      resumePausedSessions(child.id).catch(err => console.error("Session resume on refresh error:", err));

      res.json({
        success: true,
        data: {
          token,
          childId: child.id,
          childName: child.name,
        },
      });
    } catch (error: any) {
      console.error("Refresh token error:", error);
      res.status(500).json({ message: "Token refresh failed" });
    }
  });

  // ===== Child Login Request Flow (طلب تسجيل دخول الطفل مع موافقة الوالد) =====

  // Step 1: Child requests login - creates request and notifies parent
  app.post("/api/child/login-request", childLoginRequestLimiter, async (req, res) => {
    try {
      const v = validateBody(childLoginRequestSchema, req.body);
      if (!v.success) return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, v.error));
      const { childName, parentCode, deviceId, childBirthDate, childAge } = v.data;

      // Find parent by code
      const parent = await db.select().from(parents).where(eq(parents.uniqueCode, parentCode.toUpperCase()));
      if (!parent[0]) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid parent code"));
      }

      // Find child by name linked to this parent
      const linkedChildren = await db.select({
        child: children,
      })
        .from(parentChild)
        .innerJoin(children, eq(parentChild.childId, children.id))
        .where(eq(parentChild.parentId, parent[0].id));

      const matchedChild = linkedChildren.find((lc: any) =>
        lc.child.name.toLowerCase() === childName.toLowerCase().trim()
      );

      if (!matchedChild) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Child not found"));
      }

      // If child profile has no birthday yet, use age-gate data when available.
      if (!matchedChild.child.birthday) {
        let birthdayToPersist: Date | null = null;
        if (childBirthDate) {
          const parsed = new Date(childBirthDate);
          if (!Number.isNaN(parsed.getTime())) {
            birthdayToPersist = parsed;
          }
        }
        if (!birthdayToPersist && typeof childAge === "number") {
          const approx = new Date();
          approx.setFullYear(approx.getFullYear() - childAge);
          birthdayToPersist = approx;
        }

        if (birthdayToPersist) {
          await db
            .update(children)
            .set({ birthday: birthdayToPersist })
            .where(eq(children.id, matchedChild.child.id));
        }
      }

      // Create login request (expires in 5 minutes)
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      const generatedDeviceId = deviceId || crypto.randomUUID();

      // Reuse an existing pending request for same child/device to avoid notification spam
      const existingPending = await db.select().from(childLoginRequests).where(
        and(
          eq(childLoginRequests.childId, matchedChild.child.id),
          eq(childLoginRequests.parentId, parent[0].id),
          eq(childLoginRequests.deviceId, generatedDeviceId),
          eq(childLoginRequests.status, "pending")
        )
      ).orderBy(desc(childLoginRequests.createdAt)).limit(1);

      if (existingPending[0] && existingPending[0].expiresAt > new Date()) {
        const requestKey = buildChildLoginRequestKey(existingPending[0].id);
        return res.json(successResponse({
          requestId: existingPending[0].id,
          requestKey,
          status: "pending",
          expiresAt: existingPending[0].expiresAt,
          message: "يوجد طلب دخول معلق بالفعل. انتظر موافقة الوالد.",
        }, "Existing login request reused"));
      }

      const loginRequest = await db.insert(childLoginRequests).values({
        childId: matchedChild.child.id,
        parentId: parent[0].id,
        deviceId: generatedDeviceId,
        deviceName: req.get("User-Agent") || "Unknown Device",
        browserInfo: req.get("User-Agent"),
        ipAddress: req.ip || req.connection?.remoteAddress || "unknown",
        status: "pending",
        expiresAt,
      }).returning();

      const requestKey = buildChildLoginRequestKey(loginRequest[0].id);

      // Notify parent
      await createNotification({
        parentId: parent[0].id,
        type: NOTIFICATION_TYPES.LOGIN_CODE_REQUEST,
        title: `طلب دخول من ${matchedChild.child.name}`,
        message: `${matchedChild.child.name} يطلب الدخول للتطبيق. هل توافق؟`,
        style: NOTIFICATION_STYLES.MODAL,
        priority: NOTIFICATION_PRIORITIES.URGENT,
        soundAlert: true,
        metadata: {
          childId: matchedChild.child.id,
          childName: matchedChild.child.name,
          parentCode: parent[0].uniqueCode,
          loginRequestId: loginRequest[0].id,
          deviceInfo: req.get("User-Agent"),
        },
      });

      res.json(successResponse({
        requestId: loginRequest[0].id,
        requestKey,
        status: "pending",
        expiresAt,
        message: "تم إرسال طلب الدخول للوالد. انتظر الموافقة.",
      }, "Login request created"));

    } catch (error: any) {
      console.error("Login request error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to create login request"));
    }
  });

  // Step 2: Child polls for login request status
  app.get("/api/child/login-request/:id/status", childLoginStatusLimiter, async (req, res) => {
    try {
      const { id } = req.params;
      const providedKey = (req.query.key || req.headers["x-login-key"] || "").toString();
      const providedDeviceId = (req.query.deviceId || req.headers["x-device-id"] || "").toString();

      if (!providedKey) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, "Missing request key"));
      }

      if (!providedDeviceId) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, "Missing device id"));
      }

      if (!isValidRequestKey(id, providedKey)) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, "Invalid request key"));
      }

      const request = await db.select().from(childLoginRequests).where(eq(childLoginRequests.id, id));

      if (!request[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Login request not found"));
      }

      const loginRequest = request[0];

      if (loginRequest.deviceId !== providedDeviceId) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, "Device mismatch"));
      }

      // Check if expired
      if (loginRequest.expiresAt < new Date() && loginRequest.status === "pending") {
        await db.update(childLoginRequests)
          .set({ status: "expired" })
          .where(eq(childLoginRequests.id, id));

        return res.json(successResponse({
          status: "expired",
          message: "انتهت صلاحية الطلب. يرجى إنشاء طلب جديد.",
        }, "Request expired"));
      }

      // If approved, return token when available and keep status as approved.
      // This prevents parent notifications from incorrectly flipping to "expired" after approval.
      if (loginRequest.status === "approved") {
        if (loginRequest.sessionToken) {
          const token = loginRequest.sessionToken;

          // Consume token after first successful read but preserve approved status.
          await db.update(childLoginRequests)
            .set({
              status: "approved",
              sessionToken: null,
            })
            .where(eq(childLoginRequests.id, id));

          return res.json(successResponse({
            status: "approved",
            token,
            message: "تمت الموافقة! جاري تسجيل الدخول...",
          }, "Login approved"));
        }

        return res.json(successResponse({
          status: "approved",
          message: "تمت الموافقة على الطلب.",
        }, "Login approved"));
      }

      // If rejected
      if (loginRequest.status === "rejected") {
        return res.json(successResponse({
          status: "rejected",
          message: "تم رفض طلب الدخول من قبل الوالد.",
        }, "Login rejected"));
      }

      // Still pending
      res.json(successResponse({
        status: "pending",
        message: "في انتظار موافقة الوالد...",
      }, "Request pending"));

    } catch (error: any) {
      console.error("Check login request status error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to check status"));
    }
  });

  // Get child's trusted devices
  app.get("/api/child/trusted-devices", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;

      const devices = await db.select({
        id: childTrustedDevices.id,
        deviceLabel: childTrustedDevices.deviceLabel,
        lastUsedAt: childTrustedDevices.lastUsedAt,
        createdAt: childTrustedDevices.createdAt,
      })
        .from(childTrustedDevices)
        .where(and(
          eq(childTrustedDevices.childId, childId),
          sql`${childTrustedDevices.revokedAt} IS NULL`
        ));

      res.json({ success: true, data: devices });
    } catch (error: any) {
      console.error("Get trusted devices error:", error);
      res.status(500).json({ message: "Failed to get trusted devices" });
    }
  });

  // Revoke child trusted device
  app.delete("/api/child/trusted-devices/:deviceId", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const { deviceId } = req.params;

      await db.update(childTrustedDevices)
        .set({ revokedAt: new Date() })
        .where(and(
          eq(childTrustedDevices.id, deviceId),
          eq(childTrustedDevices.childId, childId)
        ));

      res.json({ success: true, message: "Device revoked" });
    } catch (error: any) {
      console.error("Revoke device error:", error);
      res.status(500).json({ message: "Failed to revoke device" });
    }
  });

  // Request login - child enters name, parent receives approval notification
  // This endpoint finds all parents linked to a child and sends them login requests
  app.post("/api/child/request-login-by-name", async (req, res) => {
    try {
      const { childName, parentCode, deviceId } = req.body;

      if (!childName || childName.trim().length < 2) {
        return res.status(400).json({ message: "يرجى إدخال اسمك الكامل" });
      }

      if (!parentCode || String(parentCode).trim().length < 4) {
        return res.status(400).json({ message: "يرجى إدخال كود الوالد" });
      }

      const normalizedName = childName.toLowerCase().trim();
      const normalizedParentCode = String(parentCode).trim().toUpperCase();

      const parent = await db
        .select()
        .from(parents)
        .where(eq(parents.uniqueCode, normalizedParentCode))
        .limit(1);

      if (!parent[0]) {
        return res.status(400).json({ message: "كود الوالد غير صحيح" });
      }

      const linkedChildren = await db
        .select({ child: children })
        .from(parentChild)
        .innerJoin(children, eq(parentChild.childId, children.id))
        .where(eq(parentChild.parentId, parent[0].id));

      const matchedChild = linkedChildren.find((lc: any) =>
        lc.child.name.toLowerCase().trim() === normalizedName
      );

      if (!matchedChild) {
        return res.status(400).json({ message: "الاسم غير مطابق لأي طفل مرتبط بهذا الوالد" });
      }

      const generatedDeviceId = deviceId || crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      // Create login request
      const loginRequest = await db.insert(childLoginRequests).values({
        childId: matchedChild.child.id,
        parentId: parent[0].id,
        deviceId: generatedDeviceId,
        deviceName: req.get("User-Agent") || "Unknown Device",
        browserInfo: req.get("User-Agent"),
        ipAddress: req.ip || req.connection?.remoteAddress || "unknown",
        status: "pending",
        expiresAt,
      }).returning();

      // Notify parent with approve/reject buttons
      await createNotification({
        parentId: parent[0].id,
        type: NOTIFICATION_TYPES.LOGIN_CODE_REQUEST,
        title: `${matchedChild.child.name} يطلب الدخول`,
        message: `${matchedChild.child.name} يريد تسجيل الدخول للتطبيق. هل توافق؟`,
        style: NOTIFICATION_STYLES.MODAL,
        priority: NOTIFICATION_PRIORITIES.URGENT,
        soundAlert: true,
        metadata: {
          childId: matchedChild.child.id,
          childName: matchedChild.child.name,
          parentCode: parent[0].uniqueCode,
          loginRequestId: loginRequest[0].id,
          deviceInfo: req.get("User-Agent"),
        },
      });

      res.json({
        success: true,
        data: {
          requestId: loginRequest[0].id,
          status: "pending",
          expiresAt,
        },
        message: "تم إرسال طلب الدخول لوالديك. انتظر موافقتهم."
      });
    } catch (error: any) {
      console.error("Request login by name error:", error);
      res.status(500).json({ message: "حدث خطأ. حاول مرة أخرى." });
    }
  });

  // Child logout - with notification to parent
  app.post("/api/child/logout", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const { deviceId, revokeDevice } = req.body;

      // Get child info
      const child = await db.select().from(children).where(eq(children.id, childId));
      if (!child[0]) {
        return res.status(404).json({ message: "Child not found" });
      }

      // Get parent to send notification
      const parentLinks = await db.select({
        parent: parents,
      })
        .from(parentChild)
        .innerJoin(parents, eq(parentChild.parentId, parents.id))
        .where(eq(parentChild.childId, childId));

      // Revoke device if requested
      if (revokeDevice && deviceId) {
        await db.update(childTrustedDevices)
          .set({ revokedAt: new Date() })
          .where(and(
            eq(childTrustedDevices.id, deviceId),
            eq(childTrustedDevices.childId, childId)
          ));
      }

      // Send notification to all linked parents
      for (const link of parentLinks) {
        await createNotification({
          parentId: link.parent.id,
          type: NOTIFICATION_TYPES.CHILD_LOGOUT,
          title: "تسجيل خروج الطفل 👋",
          message: `${child[0].name} قام بتسجيل الخروج من التطبيق.`,
          style: NOTIFICATION_STYLES.TOAST,
          metadata: {
            childId: child[0].id,
            childName: child[0].name,
            logoutTime: new Date().toISOString(),
          },
        });
      }

      // Pause active scheduled sessions on logout
      pauseActiveSessions(childId).catch(err => console.error("Session pause on logout error:", err));

      res.json({ success: true, message: "Logged out successfully" });
    } catch (error: any) {
      console.error("Child logout error:", error);
      res.status(500).json({ message: "Logout failed" });
    }
  });

  // ============ GROWTH TREE ENDPOINTS ============

  // Growth tree stage thresholds (points needed for each stage)
  const GROWTH_STAGES = [
    { stage: 1, name: "seed", minPoints: 0 },
    { stage: 2, name: "sprout", minPoints: 50 },
    { stage: 3, name: "sapling", minPoints: 150 },
    { stage: 4, name: "youngPlant", minPoints: 350 },
    { stage: 5, name: "bush", minPoints: 600 },
    { stage: 6, name: "smallTree", minPoints: 1000 },
    { stage: 7, name: "growingTree", minPoints: 1600 },
    { stage: 8, name: "mediumTree", minPoints: 2500 },
    { stage: 9, name: "tallTree", minPoints: 3500 },
    { stage: 10, name: "strongTree", minPoints: 5000 },
    { stage: 11, name: "largeTree", minPoints: 7000 },
    { stage: 12, name: "matureTree", minPoints: 10000 },
    { stage: 13, name: "fruitTree", minPoints: 14000 },
    { stage: 14, name: "grandTree", minPoints: 19000 },
    { stage: 15, name: "ancientTree", minPoints: 25000 },
    { stage: 16, name: "goldenTree", minPoints: 33000 },
    { stage: 17, name: "crystalTree", minPoints: 42000 },
    { stage: 18, name: "diamondTree", minPoints: 55000 },
    { stage: 19, name: "legendaryTree", minPoints: 70000 },
    { stage: 20, name: "cosmicTree", minPoints: 100000 },
  ];

  type GardenToolConfig = {
    costPoints: number;
    growthPoints: number;
  };

  type GardenToolsPricing = {
    water: GardenToolConfig;
    fertilizer: GardenToolConfig;
    pruner: GardenToolConfig;
    spray: GardenToolConfig;
  };

  type GardenSeedCatalogItem = {
    id: string;
    order: number;
    labelEn: string;
    labelAr: string;
    type: "tree" | "flower";
    rarity: "common" | "rare";
    stages: number;
    plantCost: number;
    baseReward: number;
    bonusPerCare: number;
    descriptionEn: string;
    descriptionAr: string;
    isActive: boolean;
  };

  const DEFAULT_GARDEN_TOOLS_PRICING: GardenToolsPricing = {
    water: { costPoints: 10, growthPoints: 15 },
    fertilizer: { costPoints: 20, growthPoints: 35 },
    pruner: { costPoints: 15, growthPoints: 22 },
    spray: { costPoints: 12, growthPoints: 18 },
  };

  const DEFAULT_GARDEN_SEEDS: GardenSeedCatalogItem[] = [
    { id: "olive", order: 1, labelEn: "Olive", labelAr: "زيتون", type: "tree", rarity: "common", stages: 18, plantCost: 14, baseReward: 45, bonusPerCare: 1, descriptionEn: "Strong tree with steady growth and long life.", descriptionAr: "شجرة قوية بنمو ثابت وعمر طويل.", isActive: true },
    { id: "apple", order: 2, labelEn: "Apple", labelAr: "تفاح", type: "tree", rarity: "common", stages: 16, plantCost: 13, baseReward: 45, bonusPerCare: 1, descriptionEn: "Balanced fruit tree with smooth stage progression.", descriptionAr: "شجرة فاكهة متوازنة بمراحل نمو سلسة.", isActive: true },
    { id: "orange", order: 3, labelEn: "Orange", labelAr: "برتقال", type: "tree", rarity: "common", stages: 16, plantCost: 13, baseReward: 45, bonusPerCare: 1, descriptionEn: "Bright citrus tree that rewards regular care.", descriptionAr: "شجرة حمضيات مشرقة تكافئ العناية المنتظمة.", isActive: true },
    { id: "mango", order: 4, labelEn: "Mango", labelAr: "مانجو", type: "tree", rarity: "rare", stages: 20, plantCost: 22, baseReward: 70, bonusPerCare: 1, descriptionEn: "Rare tropical tree with many rich growth stages.", descriptionAr: "شجرة استوائية نادرة بمراحل نمو كثيرة وغنية.", isActive: true },
    { id: "pomegranate", order: 5, labelEn: "Pomegranate", labelAr: "رمان", type: "tree", rarity: "rare", stages: 18, plantCost: 20, baseReward: 70, bonusPerCare: 1, descriptionEn: "Royal tree that blooms beautifully with patience.", descriptionAr: "شجرة ملكية تزدهر بجمال مع الصبر.", isActive: true },
    { id: "rose", order: 6, labelEn: "Rose", labelAr: "ورد جوري", type: "flower", rarity: "common", stages: 14, plantCost: 10, baseReward: 45, bonusPerCare: 1, descriptionEn: "Classic flower with elegant petals and color shifts.", descriptionAr: "وردة كلاسيكية ببتلات أنيقة وتدرجات جميلة.", isActive: true },
    { id: "tulip", order: 7, labelEn: "Tulip", labelAr: "توليب", type: "flower", rarity: "common", stages: 12, plantCost: 9, baseReward: 45, bonusPerCare: 1, descriptionEn: "Gentle flower that opens fast with daily attention.", descriptionAr: "زهرة رقيقة تتفتح سريعًا مع الاهتمام اليومي.", isActive: true },
    { id: "sunflower", order: 8, labelEn: "Sunflower", labelAr: "عباد الشمس", type: "flower", rarity: "common", stages: 10, plantCost: 8, baseReward: 45, bonusPerCare: 1, descriptionEn: "Fast-growing sunny flower ideal for early progress.", descriptionAr: "زهرة سريعة النمو ومناسبة للتقدم المبكر.", isActive: true },
    { id: "lavender", order: 9, labelEn: "Lavender", labelAr: "لافندر", type: "flower", rarity: "rare", stages: 13, plantCost: 16, baseReward: 70, bonusPerCare: 1, descriptionEn: "Fragrant purple flower with graceful development.", descriptionAr: "زهرة بنفسجية عطرية بنمو أنيق ومتدرج.", isActive: true },
    { id: "jasmine", order: 10, labelEn: "Jasmine", labelAr: "ياسمين", type: "flower", rarity: "rare", stages: 12, plantCost: 15, baseReward: 70, bonusPerCare: 1, descriptionEn: "Delicate flower with high beauty when well cared for.", descriptionAr: "زهرة رقيقة ترتفع قيمتها الجمالية مع العناية.", isActive: true },
  ];

  type GardenSlotState = {
    seedId: string;
    progressPoints: number;
    stage: number;
    totalStages: number;
    plantedAt: string;
    careCount: number;
  };

  type ChildGardenState = {
    slots: Array<GardenSlotState | null>;
    beautyScore: number;
    economy: {
      totalSpentPoints: number;
      totalHarvestPoints: number;
      netPoints: number;
      plantedCount: number;
      harvestedCount: number;
      toolUsesCount: number;
      lastActionAt: string | null;
    };
    updatedAt: string;
  };

  const GARDEN_SLOT_COUNT = 12;

  type GardenEventId = "calm_day" | "rain_day" | "harvest_day";

  type GardenDailyEventConfig = {
    id: GardenEventId;
    titleAr: string;
    titleEn: string;
    growthMultiplier: number;
    harvestMultiplier: number;
  };

  type GardenDailyQuestState = {
    id: "plant" | "care" | "harvest";
    titleAr: string;
    titleEn: string;
    target: number;
    progress: number;
    rewardPoints: number;
    claimed: boolean;
  };

  type ChildGardenDailyState = {
    dayKey: string;
    event: GardenDailyEventConfig;
    quests: GardenDailyQuestState[];
    claimedAllReward: boolean;
    updatedAt: string;
  };

  type GardenWeeklyQuestState = {
    id: "plant" | "care" | "harvest";
    titleAr: string;
    titleEn: string;
    target: number;
    progress: number;
  };

  type ChildGardenWeeklyState = {
    weekKey: string;
    quests: GardenWeeklyQuestState[];
    claimedReward: boolean;
    updatedAt: string;
  };

  type ChildLoginRewardState = {
    dayKey: string;
    streakDays: number;
    totalClaims: number;
    lastClaimAt: string | null;
    updatedAt: string;
  };

  const GARDEN_DAILY_EVENTS: GardenDailyEventConfig[] = [
    {
      id: "calm_day",
      titleAr: "يوم هادئ",
      titleEn: "Calm Day",
      growthMultiplier: 1,
      harvestMultiplier: 1,
    },
    {
      id: "rain_day",
      titleAr: "يوم المطر",
      titleEn: "Rain Day",
      growthMultiplier: 1.2,
      harvestMultiplier: 1,
    },
    {
      id: "harvest_day",
      titleAr: "يوم الحصاد",
      titleEn: "Harvest Day",
      growthMultiplier: 1,
      harvestMultiplier: 1.15,
    },
  ];

  const GARDEN_DAILY_ALL_REWARD = 35;
  const GARDEN_WEEKLY_REWARD = 120;
  const LOGIN_STREAK_REWARDS = [20, 30, 40, 50, 75, 100, 200];
  const LOGIN_WEEKLY_STREAK_BONUS = 80;

  function getLocalDayKeyForGarden(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function getLocalWeekKeyForGarden(date: Date): string {
    const local = new Date(date);
    local.setHours(0, 0, 0, 0);
    const day = local.getDay();
    const deltaToMonday = day === 0 ? -6 : 1 - day;
    local.setDate(local.getDate() + deltaToMonday);
    return getLocalDayKeyForGarden(local);
  }

  function selectGardenDailyEvent(dayKey: string): GardenDailyEventConfig {
    const numeric = Number(dayKey.replace(/-/g, "")) || 0;
    const idx = Math.abs(numeric) % GARDEN_DAILY_EVENTS.length;
    return GARDEN_DAILY_EVENTS[idx] || GARDEN_DAILY_EVENTS[0];
  }

  function createDefaultGardenDailyState(dayKey: string): ChildGardenDailyState {
    return {
      dayKey,
      event: selectGardenDailyEvent(dayKey),
      quests: [
        {
          id: "plant",
          titleAr: "ازرع بذرتين",
          titleEn: "Plant 2 seeds",
          target: 2,
          progress: 0,
          rewardPoints: 10,
          claimed: false,
        },
        {
          id: "care",
          titleAr: "نفّذ 3 عنايات",
          titleEn: "Use 3 care actions",
          target: 3,
          progress: 0,
          rewardPoints: 12,
          claimed: false,
        },
        {
          id: "harvest",
          titleAr: "احصد نبتة واحدة",
          titleEn: "Harvest 1 plant",
          target: 1,
          progress: 0,
          rewardPoints: 13,
          claimed: false,
        },
      ],
      claimedAllReward: false,
      updatedAt: new Date().toISOString(),
    };
  }

  function getGardenDailyStateKey(childId: string, dayKey: string): string {
    return `garden_daily_${childId}_${dayKey}`;
  }

  function getGardenWeeklyStateKey(childId: string, weekKey: string): string {
    return `garden_weekly_${childId}_${weekKey}`;
  }

  function getChildLoginRewardStateKey(childId: string): string {
    return `child_login_reward_${childId}`;
  }

  function createDefaultChildLoginRewardState(dayKey: string): ChildLoginRewardState {
    return {
      dayKey,
      streakDays: 0,
      totalClaims: 0,
      lastClaimAt: null,
      updatedAt: new Date().toISOString(),
    };
  }

  function createDefaultGardenWeeklyState(weekKey: string): ChildGardenWeeklyState {
    return {
      weekKey,
      quests: [
        {
          id: "plant",
          titleAr: "ازرع 12 بذرة",
          titleEn: "Plant 12 seeds",
          target: 12,
          progress: 0,
        },
        {
          id: "care",
          titleAr: "نفّذ 20 عناية",
          titleEn: "Use 20 care actions",
          target: 20,
          progress: 0,
        },
        {
          id: "harvest",
          titleAr: "احصد 8 نباتات",
          titleEn: "Harvest 8 plants",
          target: 8,
          progress: 0,
        },
      ],
      claimedReward: false,
      updatedAt: new Date().toISOString(),
    };
  }

  function normalizeGardenDailyState(raw: any, dayKey: string): ChildGardenDailyState {
    const base = createDefaultGardenDailyState(dayKey);
    if (!raw || typeof raw !== "object") return base;

    const eventId = String(raw?.event?.id || base.event.id) as GardenEventId;
    const event = GARDEN_DAILY_EVENTS.find((item) => item.id === eventId) || base.event;
    const rawQuests = Array.isArray(raw.quests) ? raw.quests : [];

    const quests = base.quests.map((quest) => {
      const current = rawQuests.find((q: any) => q?.id === quest.id);
      const progress = Math.max(0, Math.min(quest.target, Number(current?.progress) || 0));
      return {
        ...quest,
        progress,
        claimed: Boolean(current?.claimed),
      };
    });

    return {
      dayKey,
      event,
      quests,
      claimedAllReward: Boolean(raw.claimedAllReward),
      updatedAt: String(raw.updatedAt || new Date().toISOString()),
    };
  }

  async function getChildGardenDailyState(childId: string, dayKey?: string): Promise<ChildGardenDailyState> {
    const resolvedDay = dayKey || getLocalDayKeyForGarden(new Date());
    const key = getGardenDailyStateKey(childId, resolvedDay);
    const row = await db.select().from(appSettings).where(eq(appSettings.key, key));
    if (!row[0]) {
      return createDefaultGardenDailyState(resolvedDay);
    }

    try {
      const parsed = JSON.parse(row[0].value);
      return normalizeGardenDailyState(parsed, resolvedDay);
    } catch {
      return createDefaultGardenDailyState(resolvedDay);
    }
  }

  async function saveChildGardenDailyState(childId: string, state: ChildGardenDailyState): Promise<void> {
    const key = getGardenDailyStateKey(childId, state.dayKey);
    const payload = JSON.stringify({ ...state, updatedAt: new Date().toISOString() });
    const row = await db.select().from(appSettings).where(eq(appSettings.key, key));
    if (row[0]) {
      await db.update(appSettings)
        .set({ value: payload, updatedAt: new Date() })
        .where(eq(appSettings.key, key));
      return;
    }

    await db.insert(appSettings).values({ key, value: payload });
  }

  function normalizeGardenWeeklyState(raw: any, weekKey: string): ChildGardenWeeklyState {
    const base = createDefaultGardenWeeklyState(weekKey);
    if (!raw || typeof raw !== "object") return base;
    const rawQuests = Array.isArray(raw.quests) ? raw.quests : [];

    const quests = base.quests.map((quest) => {
      const current = rawQuests.find((q: any) => q?.id === quest.id);
      return {
        ...quest,
        progress: Math.max(0, Math.min(quest.target, Number(current?.progress) || 0)),
      };
    });

    return {
      weekKey,
      quests,
      claimedReward: Boolean(raw.claimedReward),
      updatedAt: String(raw.updatedAt || new Date().toISOString()),
    };
  }

  async function getChildGardenWeeklyState(childId: string, weekKey?: string): Promise<ChildGardenWeeklyState> {
    const resolvedWeek = weekKey || getLocalWeekKeyForGarden(new Date());
    const key = getGardenWeeklyStateKey(childId, resolvedWeek);
    const row = await db.select().from(appSettings).where(eq(appSettings.key, key));
    if (!row[0]) {
      return createDefaultGardenWeeklyState(resolvedWeek);
    }

    try {
      const parsed = JSON.parse(row[0].value);
      return normalizeGardenWeeklyState(parsed, resolvedWeek);
    } catch {
      return createDefaultGardenWeeklyState(resolvedWeek);
    }
  }

  async function saveChildGardenWeeklyState(childId: string, state: ChildGardenWeeklyState): Promise<void> {
    const key = getGardenWeeklyStateKey(childId, state.weekKey);
    const payload = JSON.stringify({ ...state, updatedAt: new Date().toISOString() });
    const row = await db.select().from(appSettings).where(eq(appSettings.key, key));
    if (row[0]) {
      await db.update(appSettings)
        .set({ value: payload, updatedAt: new Date() })
        .where(eq(appSettings.key, key));
      return;
    }

    await db.insert(appSettings).values({ key, value: payload });
  }

  function normalizeChildLoginRewardState(raw: any, dayKey: string): ChildLoginRewardState {
    const base = createDefaultChildLoginRewardState(dayKey);
    if (!raw || typeof raw !== "object") return base;

    return {
      dayKey: String(raw.dayKey || dayKey),
      streakDays: Math.max(0, Number(raw.streakDays) || 0),
      totalClaims: Math.max(0, Number(raw.totalClaims) || 0),
      lastClaimAt: raw.lastClaimAt ? String(raw.lastClaimAt) : null,
      updatedAt: String(raw.updatedAt || new Date().toISOString()),
    };
  }

  async function getChildLoginRewardState(childId: string): Promise<ChildLoginRewardState> {
    const dayKey = getLocalDayKeyForGarden(new Date());
    const key = getChildLoginRewardStateKey(childId);
    const row = await db.select().from(appSettings).where(eq(appSettings.key, key));
    if (!row[0]) {
      return createDefaultChildLoginRewardState(dayKey);
    }

    try {
      const parsed = JSON.parse(row[0].value);
      return normalizeChildLoginRewardState(parsed, dayKey);
    } catch {
      return createDefaultChildLoginRewardState(dayKey);
    }
  }

  async function saveChildLoginRewardState(childId: string, state: ChildLoginRewardState): Promise<void> {
    const key = getChildLoginRewardStateKey(childId);
    const payload = JSON.stringify({ ...state, updatedAt: new Date().toISOString() });
    const row = await db.select().from(appSettings).where(eq(appSettings.key, key));
    if (row[0]) {
      await db.update(appSettings)
        .set({ value: payload, updatedAt: new Date() })
        .where(eq(appSettings.key, key));
      return;
    }

    await db.insert(appSettings).values({ key, value: payload });
  }

  async function updateGardenDailyProgress(
    childId: string,
    delta: { plant?: number; care?: number; harvest?: number },
  ): Promise<ChildGardenDailyState> {
    const dailyState = await getChildGardenDailyState(childId);
    const plantInc = Math.max(0, Number(delta.plant) || 0);
    const careInc = Math.max(0, Number(delta.care) || 0);
    const harvestInc = Math.max(0, Number(delta.harvest) || 0);

    dailyState.quests = dailyState.quests.map((quest) => {
      if (quest.id === "plant") {
        return { ...quest, progress: Math.min(quest.target, quest.progress + plantInc) };
      }
      if (quest.id === "care") {
        return { ...quest, progress: Math.min(quest.target, quest.progress + careInc) };
      }
      if (quest.id === "harvest") {
        return { ...quest, progress: Math.min(quest.target, quest.progress + harvestInc) };
      }
      return quest;
    });

    await saveChildGardenDailyState(childId, dailyState);
    return dailyState;
  }

  async function updateGardenWeeklyProgress(
    childId: string,
    delta: { plant?: number; care?: number; harvest?: number },
  ): Promise<ChildGardenWeeklyState> {
    const weeklyState = await getChildGardenWeeklyState(childId);
    const plantInc = Math.max(0, Number(delta.plant) || 0);
    const careInc = Math.max(0, Number(delta.care) || 0);
    const harvestInc = Math.max(0, Number(delta.harvest) || 0);

    weeklyState.quests = weeklyState.quests.map((quest) => {
      if (quest.id === "plant") {
        return { ...quest, progress: Math.min(quest.target, quest.progress + plantInc) };
      }
      if (quest.id === "care") {
        return { ...quest, progress: Math.min(quest.target, quest.progress + careInc) };
      }
      if (quest.id === "harvest") {
        return { ...quest, progress: Math.min(quest.target, quest.progress + harvestInc) };
      }
      return quest;
    });

    await saveChildGardenWeeklyState(childId, weeklyState);
    return weeklyState;
  }

  function isValidGardenSlotIndex(slotIndex: number): boolean {
    return Number.isInteger(slotIndex) && slotIndex >= 0 && slotIndex < GARDEN_SLOT_COUNT;
  }

  function getGardenStateKey(childId: string): string {
    return `garden_state_${childId}`;
  }

  function createDefaultGardenState(): ChildGardenState {
    return {
      slots: Array.from({ length: GARDEN_SLOT_COUNT }, () => null),
      beautyScore: 0,
      economy: {
        totalSpentPoints: 0,
        totalHarvestPoints: 0,
        netPoints: 0,
        plantedCount: 0,
        harvestedCount: 0,
        toolUsesCount: 0,
        lastActionAt: null,
      },
      updatedAt: new Date().toISOString(),
    };
  }

  function getGardenStateInsights(state: ChildGardenState) {
    const slots = Array.isArray(state?.slots) ? state.slots : [];
    const planted = slots.filter((slot) => Boolean(slot)) as GardenSlotState[];
    const plantedCount = planted.length;
    const totalSlots = Math.max(1, slots.length || GARDEN_SLOT_COUNT);
    const readyToHarvestCount = planted.filter((slot) => slot.stage >= slot.totalStages).length;
    const averageCarePerPlant = plantedCount > 0
      ? Math.round((planted.reduce((sum, slot) => sum + Math.max(0, Number(slot.careCount) || 0), 0) / plantedCount) * 10) / 10
      : 0;
    const plotUsagePercent = Math.round((plantedCount / totalSlots) * 100);

    let recommendedAction: "harvest" | "plant" | "care" = "care";
    if (readyToHarvestCount > 0) {
      recommendedAction = "harvest";
    } else if (plantedCount < totalSlots) {
      recommendedAction = "plant";
    }

    return {
      totalSlots,
      plantedCount,
      emptySlots: Math.max(0, totalSlots - plantedCount),
      readyToHarvestCount,
      plotUsagePercent,
      averageCarePerPlant,
      recommendedAction,
    };
  }

  function normalizeGardenState(raw: any): ChildGardenState {
    const base = createDefaultGardenState();
    if (!raw || typeof raw !== "object") {
      return base;
    }

    const slots = Array.isArray(raw.slots) ? raw.slots.slice(0, GARDEN_SLOT_COUNT) : [...base.slots];
    while (slots.length < GARDEN_SLOT_COUNT) slots.push(null);

    return {
      slots: slots.map((slot: any) => {
        if (!slot || typeof slot !== "object" || typeof slot.seedId !== "string") return null;
        return {
          seedId: slot.seedId,
          progressPoints: Math.max(0, Number(slot.progressPoints) || 0),
          stage: Math.max(1, Number(slot.stage) || 1),
          totalStages: Math.max(1, Number(slot.totalStages) || 1),
          plantedAt: String(slot.plantedAt || new Date().toISOString()),
          careCount: Math.max(0, Number(slot.careCount) || 0),
        };
      }),
      beautyScore: Math.max(0, Math.min(100, Number(raw.beautyScore) || 0)),
      economy: {
        totalSpentPoints: Math.max(0, Number(raw?.economy?.totalSpentPoints) || 0),
        totalHarvestPoints: Math.max(0, Number(raw?.economy?.totalHarvestPoints) || 0),
        netPoints: Number(raw?.economy?.netPoints) || 0,
        plantedCount: Math.max(0, Number(raw?.economy?.plantedCount) || 0),
        harvestedCount: Math.max(0, Number(raw?.economy?.harvestedCount) || 0),
        toolUsesCount: Math.max(0, Number(raw?.economy?.toolUsesCount) || 0),
        lastActionAt: raw?.economy?.lastActionAt ? String(raw.economy.lastActionAt) : null,
      },
      updatedAt: String(raw.updatedAt || new Date().toISOString()),
    };
  }

  function applyPassiveGrowthToGardenState(
    state: ChildGardenState,
    seedCatalog: GardenSeedCatalogItem[],
    event: GardenDailyEventConfig,
  ): boolean {
    let changed = false;
    const now = Date.now();
    const growthMultiplier = Math.max(0.5, Number(event.growthMultiplier) || 1);

    state.slots = state.slots.map((slot) => {
      if (!slot) return null;

      const seed = seedCatalog.find((item) => item.id === slot.seedId);
      const plantedAt = new Date(slot.plantedAt).getTime();
      if (!Number.isFinite(plantedAt)) return slot;

      const elapsedHours = Math.max(0, (now - plantedAt) / (1000 * 60 * 60));
      const basePerHour = seed?.type === "flower" ? 7 : 5;
      const rarityBoost = seed?.rarity === "rare" ? 1.06 : 1;
      const passiveProgress = Math.floor(elapsedHours * basePerHour * rarityBoost * growthMultiplier);

      if (passiveProgress <= slot.progressPoints) {
        return slot;
      }

      changed = true;
      const totalStages = seed?.stages || slot.totalStages || 1;
      const stage = calculateSlotStageFromProgress(passiveProgress, totalStages);

      return {
        ...slot,
        progressPoints: passiveProgress,
        totalStages,
        stage,
      };
    });

    if (changed) {
      state.beautyScore = calculateGardenBeauty(state.slots);
    }

    return changed;
  }

  function normalizeGardenSeeds(raw: unknown): GardenSeedCatalogItem[] {
    if (!Array.isArray(raw)) {
      return DEFAULT_GARDEN_SEEDS;
    }

    const normalized = raw
      .filter((item) => item && typeof item === "object")
      .map((item: any, index: number) => {
        const id = String(item.id || "").trim().toLowerCase();
        if (!id) return null;

        const fallback = DEFAULT_GARDEN_SEEDS.find((seed) => seed.id === id);
        const type: "tree" | "flower" = item.type === "flower" ? "flower" : "tree";
        const rarity: "common" | "rare" = item.rarity === "rare" ? "rare" : "common";
        const stages = Math.max(3, Math.min(30, Number(item.stages) || fallback?.stages || 10));
        const baseReward = Math.max(10, Math.min(300, Number(item.baseReward) || fallback?.baseReward || (rarity === "rare" ? 70 : 45)));
        const plantCost = Math.max(5, Math.min(120, Number(item.plantCost) || fallback?.plantCost || (rarity === "rare" ? 18 : 10)));
        const bonusPerCare = Math.max(0, Math.min(10, Number(item.bonusPerCare) || fallback?.bonusPerCare || 1));
        const fallbackOrder = typeof fallback?.order === "number" ? fallback.order : index + 1;
        const rawOrder = Number(item.order);
        const order = Number.isFinite(rawOrder)
          ? Math.max(1, Math.min(999, Math.floor(rawOrder)))
          : fallbackOrder;

        return {
          id,
          order,
          labelEn: String(item.labelEn || fallback?.labelEn || id),
          labelAr: String(item.labelAr || fallback?.labelAr || id),
          type,
          rarity,
          stages,
          plantCost,
          baseReward,
          bonusPerCare,
          descriptionEn: String(item.descriptionEn || fallback?.descriptionEn || ""),
          descriptionAr: String(item.descriptionAr || fallback?.descriptionAr || ""),
          isActive: item.isActive !== false,
        } as GardenSeedCatalogItem;
      })
      .filter((item): item is GardenSeedCatalogItem => Boolean(item));

    if (!normalized.length) {
      return DEFAULT_GARDEN_SEEDS;
    }

    const uniqueById: GardenSeedCatalogItem[] = [];
    const seen = new Set<string>();
    for (const item of normalized) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      uniqueById.push(item);
    }

    return uniqueById
      .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
      .map((seed, index) => ({
        ...seed,
        order: index + 1,
      }));
  }

  async function getGardenSeedsCatalog(): Promise<GardenSeedCatalogItem[]> {
    const existing = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, "garden_seed_catalog"));

    if (!existing[0]) {
      return DEFAULT_GARDEN_SEEDS;
    }

    try {
      return normalizeGardenSeeds(JSON.parse(existing[0].value));
    } catch {
      return DEFAULT_GARDEN_SEEDS;
    }
  }

  async function getChildGardenState(childId: string): Promise<ChildGardenState> {
    const key = getGardenStateKey(childId);
    const existing = await db.select().from(appSettings).where(eq(appSettings.key, key));
    if (!existing[0]) {
      return createDefaultGardenState();
    }
    try {
      const parsed = JSON.parse(existing[0].value);
      return normalizeGardenState(parsed);
    } catch {
      return createDefaultGardenState();
    }
  }

  async function saveChildGardenState(childId: string, state: ChildGardenState): Promise<void> {
    const key = getGardenStateKey(childId);
    const payload = JSON.stringify({ ...state, updatedAt: new Date().toISOString() });
    const existing = await db.select().from(appSettings).where(eq(appSettings.key, key));
    if (existing[0]) {
      await db.update(appSettings)
        .set({ value: payload, updatedAt: new Date() })
        .where(eq(appSettings.key, key));
      return;
    }
    await db.insert(appSettings).values({ key, value: payload });
  }

  async function getGardenToolsPricing(): Promise<GardenToolsPricing> {
    const existing = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, "garden_tool_prices"));

    if (!existing[0]) {
      return DEFAULT_GARDEN_TOOLS_PRICING;
    }

    try {
      const parsed = JSON.parse(existing[0].value) as Partial<GardenToolsPricing>;
      return {
        water: { ...DEFAULT_GARDEN_TOOLS_PRICING.water, ...(parsed.water || {}) },
        fertilizer: { ...DEFAULT_GARDEN_TOOLS_PRICING.fertilizer, ...(parsed.fertilizer || {}) },
        pruner: { ...DEFAULT_GARDEN_TOOLS_PRICING.pruner, ...(parsed.pruner || {}) },
        spray: { ...DEFAULT_GARDEN_TOOLS_PRICING.spray, ...(parsed.spray || {}) },
      };
    } catch {
      return DEFAULT_GARDEN_TOOLS_PRICING;
    }
  }

  function calculateTreeStage(totalPoints: number): number {
    for (let i = GROWTH_STAGES.length - 1; i >= 0; i--) {
      const stage = GROWTH_STAGES[i];
      if (stage && totalPoints >= stage.minPoints) {
        return stage.stage;
      }
    }
    return 1;
  }

  // Get child's growth tree
  app.get("/api/child/growth-tree", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;

      // Get or create growth tree
      let tree = await db.select().from(childGrowthTrees).where(eq(childGrowthTrees.childId, childId));

      if (!tree[0]) {
        // Initialize growth tree if not exists
        const newTree = await db.insert(childGrowthTrees).values({
          childId,
          currentStage: 1,
          totalGrowthPoints: 0,
        }).returning();
        tree = newTree;
      }

      // Get recent growth events
      const recentEvents = await db.select()
        .from(childGrowthEvents)
        .where(eq(childGrowthEvents.childId, childId))
        .orderBy(sql`${childGrowthEvents.occurredAt} DESC`)
        .limit(10);

      // Calculate next stage info
      const currentStageInfo = GROWTH_STAGES.find(s => s.stage === tree[0].currentStage);
      const nextStageInfo = GROWTH_STAGES.find(s => s.stage === tree[0].currentStage + 1);

      // Fetch custom stage icons from settings (if any)
      const treeSettings = await db.select().from(growthTreeSettings);
      const stageIcons: string[] = (treeSettings[0]?.stageIcons as string[]) || [];

      const response = {
        tree: tree[0],
        stages: GROWTH_STAGES,
        currentStageName: currentStageInfo?.name || "seed",
        nextStageName: nextStageInfo?.name || null,
        pointsToNextStage: nextStageInfo ? nextStageInfo.minPoints - tree[0].totalGrowthPoints : 0,
        progress: nextStageInfo
          ? Math.min(100, ((tree[0].totalGrowthPoints - (currentStageInfo?.minPoints || 0)) /
            (nextStageInfo.minPoints - (currentStageInfo?.minPoints || 0))) * 100)
          : 100,
        recentEvents,
        stageIcons,
      };

      res.json({ success: true, data: response });
    } catch (error: any) {
      console.error("Get growth tree error:", error);
      res.status(500).json({ message: "Failed to get growth tree" });
    }
  });

  // Water the growth tree (costs child points, gives growth points — NO parent approval)
  app.post("/api/child/water-tree", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;

      // Get watering settings (read-only, safe outside tx)
      const settings = await db.select().from(growthTreeSettings);
      const config = settings[0];

      if (!config || !config.wateringEnabled) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Watering is currently disabled"));
      }

      // All financial + state mutations in a single transaction to prevent race conditions
      const result = await db.transaction(async (tx: any) => {
        // Check daily limit inside transaction
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayWaterings = await tx.select({ count: count() })
          .from(childWateringLog)
          .where(and(
            eq(childWateringLog.childId, childId),
            sql`${childWateringLog.wateredAt} >= ${today}`
          ));

        if ((todayWaterings[0]?.count || 0) >= config.maxWateringsPerDay) {
          throw new Error("MAX_DAILY_WATERINGS");
        }

        // Lock child row with FOR UPDATE to prevent concurrent point deductions
        const child = await tx.select().from(children)
          .where(eq(children.id, childId))
          .for("update");
        if (!child[0]) {
          throw new Error("CHILD_NOT_FOUND");
        }

        if (child[0].totalPoints < config.wateringCostPoints) {
          throw new Error("INSUFFICIENT_POINTS");
        }

        // Atomic deduct points
        await tx.update(children)
          .set({ totalPoints: sql`${children.totalPoints} - ${config.wateringCostPoints}` })
          .where(and(
            eq(children.id, childId),
            sql`${children.totalPoints} >= ${config.wateringCostPoints}`
          ));

        // Log the watering
        await tx.insert(childWateringLog).values({
          childId,
          pointsSpent: config.wateringCostPoints,
          growthPointsEarned: config.wateringGrowthPoints,
        });

        // Record growth event and update tree
        let tree = await tx.select().from(childGrowthTrees).where(eq(childGrowthTrees.childId, childId));

        if (!tree[0]) {
          await tx.insert(childGrowthTrees).values({
            childId,
            currentStage: 1,
            totalGrowthPoints: config.wateringGrowthPoints,
            wateringsCount: 1,
          });
        } else {
          const newTotal = tree[0].totalGrowthPoints + config.wateringGrowthPoints;
          const newStage = calculateTreeStage(newTotal);

          await tx.update(childGrowthTrees)
            .set({
              totalGrowthPoints: newTotal,
              wateringsCount: tree[0].wateringsCount + 1,
              currentStage: Math.max(tree[0].currentStage, newStage),
              lastGrowthAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(childGrowthTrees.childId, childId));
        }

        // Record growth event
        await tx.insert(childGrowthEvents).values({
          childId,
          eventType: "watering",
          growthPoints: config.wateringGrowthPoints,
          metadata: { pointsSpent: config.wateringCostPoints },
        });

        // Get updated tree for response
        const updatedTree = await tx.select().from(childGrowthTrees).where(eq(childGrowthTrees.childId, childId));
        const remainingWaterings = config.maxWateringsPerDay - ((todayWaterings[0]?.count || 0) + 1);

        return {
          pointsDeducted: config.wateringCostPoints,
          growthPointsEarned: config.wateringGrowthPoints,
          remainingWateringsToday: remainingWaterings,
          newTotalPoints: child[0].totalPoints - config.wateringCostPoints,
          tree: updatedTree[0],
        };
      });

      res.json({
        success: true,
        data: result,
        message: "Tree watered successfully!",
      });
    } catch (error: any) {
      if (error.message === "MAX_DAILY_WATERINGS") {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Maximum daily waterings reached"));
      }
      if (error.message === "CHILD_NOT_FOUND") {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Child not found"));
      }
      if (error.message === "INSUFFICIENT_POINTS") {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Not enough points for watering"));
      }
      console.error("Water tree error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to water tree"));
    }
  });

  // Get watering info for child
  app.get("/api/child/watering-info", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;

      // Get settings
      const settings = await db.select().from(growthTreeSettings);
      const config = settings[0];

      if (!config) {
        return res.json({ success: true, data: { wateringEnabled: false } });
      }

      // Get today's watering count
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayWaterings = await db.select({ count: count() })
        .from(childWateringLog)
        .where(and(
          eq(childWateringLog.childId, childId),
          sql`${childWateringLog.wateredAt} >= ${today}`
        ));

      res.json({
        success: true,
        data: {
          wateringEnabled: config.wateringEnabled,
          wateringCostPoints: config.wateringCostPoints,
          wateringGrowthPoints: config.wateringGrowthPoints,
          maxWateringsPerDay: config.maxWateringsPerDay,
          wateringsToday: todayWaterings[0]?.count || 0,
          remainingWateringsToday: config.maxWateringsPerDay - (todayWaterings[0]?.count || 0),
        },
      });
    } catch (error: any) {
      console.error("Get watering info error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to get watering info"));
    }
  });

  // Garden catalog for child (seed options + admin-controlled tool prices)
  app.get("/api/child/garden-catalog", authMiddleware, async (_req: any, res) => {
    try {
      const tools = await getGardenToolsPricing();
      const seedCatalog = await getGardenSeedsCatalog();
      res.json(successResponse({
        seeds: seedCatalog.filter((seed) => seed.isActive),
        tools,
      }));
    } catch (error: any) {
      console.error("Get garden catalog error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to get garden catalog"));
    }
  });

  // Get persistent garden state for child
  app.get("/api/child/garden-state", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const seedCatalog = await getGardenSeedsCatalog();
      const dailyState = await getChildGardenDailyState(childId);
      const state = await getChildGardenState(childId);
      const hasPassiveUpdate = applyPassiveGrowthToGardenState(state, seedCatalog, dailyState.event);
      if (hasPassiveUpdate) {
        await saveChildGardenState(childId, state);
      }
      const insights = getGardenStateInsights(state);
      res.json(successResponse({
        ...state,
        insights,
      }));
    } catch (error: any) {
      console.error("Get garden state error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to get garden state"));
    }
  });

  app.get("/api/child/garden-daily", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const state = await getChildGardenDailyState(childId);
      const allCompleted = state.quests.every((quest) => quest.progress >= quest.target);
      const allClaimed = state.quests.every((quest) => quest.claimed);

      res.json(successResponse({
        dayKey: state.dayKey,
        event: state.event,
        quests: state.quests,
        allCompleted,
        allClaimed,
        allRewardPoints: GARDEN_DAILY_ALL_REWARD,
      }));
    } catch (error: any) {
      console.error("Get garden daily error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to get daily garden data"));
    }
  });

  app.post("/api/child/garden-daily/claim-all", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const dailyState = await getChildGardenDailyState(childId);
      const allCompleted = dailyState.quests.every((quest) => quest.progress >= quest.target);

      if (!allCompleted) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Complete all daily quests first"));
      }

      if (dailyState.claimedAllReward) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Daily reward already claimed"));
      }

      await db.transaction(async (tx: any) => {
        const child = await tx
          .select()
          .from(children)
          .where(eq(children.id, childId))
          .for("update");

        if (!child[0]) {
          throw new Error("CHILD_NOT_FOUND");
        }

        await tx
          .update(children)
          .set({ totalPoints: sql`${children.totalPoints} + ${GARDEN_DAILY_ALL_REWARD}` })
          .where(eq(children.id, childId));
      });

      dailyState.claimedAllReward = true;
      dailyState.quests = dailyState.quests.map((quest) => ({ ...quest, claimed: true }));
      await saveChildGardenDailyState(childId, dailyState);

      res.json(successResponse({
        rewardPoints: GARDEN_DAILY_ALL_REWARD,
        dayKey: dailyState.dayKey,
        claimed: true,
      }, "Daily garden reward claimed"));
    } catch (error: any) {
      if (error.message === "CHILD_NOT_FOUND") {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Child not found"));
      }
      console.error("Claim garden daily reward error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to claim daily reward"));
    }
  });

  app.get("/api/child/garden-weekly", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const state = await getChildGardenWeeklyState(childId);
      const allCompleted = state.quests.every((quest) => quest.progress >= quest.target);

      res.json(successResponse({
        weekKey: state.weekKey,
        quests: state.quests,
        allCompleted,
        claimed: state.claimedReward,
        rewardPoints: GARDEN_WEEKLY_REWARD,
      }));
    } catch (error: any) {
      console.error("Get garden weekly error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to get weekly garden data"));
    }
  });

  app.post("/api/child/garden-weekly/claim", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const weeklyState = await getChildGardenWeeklyState(childId);
      const allCompleted = weeklyState.quests.every((quest) => quest.progress >= quest.target);

      if (!allCompleted) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Complete all weekly quests first"));
      }

      if (weeklyState.claimedReward) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Weekly reward already claimed"));
      }

      await db.transaction(async (tx: any) => {
        const child = await tx
          .select()
          .from(children)
          .where(eq(children.id, childId))
          .for("update");

        if (!child[0]) {
          throw new Error("CHILD_NOT_FOUND");
        }

        await tx
          .update(children)
          .set({ totalPoints: sql`${children.totalPoints} + ${GARDEN_WEEKLY_REWARD}` })
          .where(eq(children.id, childId));
      });

      weeklyState.claimedReward = true;
      await saveChildGardenWeeklyState(childId, weeklyState);

      res.json(successResponse({
        rewardPoints: GARDEN_WEEKLY_REWARD,
        weekKey: weeklyState.weekKey,
        claimed: true,
      }, "Weekly garden reward claimed"));
    } catch (error: any) {
      if (error.message === "CHILD_NOT_FOUND") {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Child not found"));
      }
      console.error("Claim garden weekly reward error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to claim weekly reward"));
    }
  });

  app.get("/api/child/login-reward", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const state = await getChildLoginRewardState(childId);
      const todayKey = getLocalDayKeyForGarden(new Date());
      const claimedToday = state.dayKey === todayKey && Boolean(state.lastClaimAt);
      const weeklyBonusAwarded = state.streakDays > 0 && state.streakDays % 7 === 0;
      const nextWeeklyBonusInDays = state.streakDays > 0
        ? (7 - (state.streakDays % 7)) || 7
        : 7;
      const currentDayIndex = claimedToday
        ? (((Math.max(1, state.streakDays) - 1) % LOGIN_STREAK_REWARDS.length) + 1)
        : ((Math.max(0, state.streakDays) % LOGIN_STREAK_REWARDS.length) + 1);

      res.json(successResponse({
        dayKey: todayKey,
        streakDays: state.streakDays,
        totalClaims: state.totalClaims,
        claimedToday,
        currentDayIndex,
        currentRewardPoints: LOGIN_STREAK_REWARDS[currentDayIndex - 1] || LOGIN_STREAK_REWARDS[0],
        weeklyBonusPoints: LOGIN_WEEKLY_STREAK_BONUS,
        weeklyBonusAwarded,
        nextWeeklyBonusInDays,
        rewardTable: LOGIN_STREAK_REWARDS,
      }));
    } catch (error: any) {
      console.error("Get child login reward error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to get login reward state"));
    }
  });

  app.post("/api/child/login-reward/claim", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const today = new Date();
      const todayKey = getLocalDayKeyForGarden(today);
      const state = await getChildLoginRewardState(childId);

      if (state.dayKey === todayKey && state.lastClaimAt) {
        const currentDayIndex = (((Math.max(1, state.streakDays) - 1) % LOGIN_STREAK_REWARDS.length) + 1);
        const weeklyBonusAwarded = state.streakDays > 0 && state.streakDays % 7 === 0;
        const nextWeeklyBonusInDays = state.streakDays > 0
          ? (7 - (state.streakDays % 7)) || 7
          : 7;
        return res.json(successResponse({
          claimedToday: true,
          streakDays: state.streakDays,
          currentDayIndex,
          rewardPoints: 0,
          baseRewardPoints: 0,
          weeklyBonusPoints: LOGIN_WEEKLY_STREAK_BONUS,
          weeklyBonusAwarded,
          nextWeeklyBonusInDays,
          totalClaims: state.totalClaims,
          rewardTable: LOGIN_STREAK_REWARDS,
        }, "Login reward already claimed today"));
      }

      const prevClaimDate = state.lastClaimAt ? new Date(state.lastClaimAt) : null;
      let nextStreak = 1;
      if (prevClaimDate && Number.isFinite(prevClaimDate.getTime())) {
        const prevDay = new Date(prevClaimDate);
        prevDay.setHours(0, 0, 0, 0);
        const currDay = new Date(today);
        currDay.setHours(0, 0, 0, 0);
        const dayDiff = Math.floor((currDay.getTime() - prevDay.getTime()) / (1000 * 60 * 60 * 24));
        if (dayDiff === 1) {
          nextStreak = Math.max(1, state.streakDays + 1);
        } else {
          nextStreak = 1;
        }
      }

      const dayIndex = (((nextStreak - 1) % LOGIN_STREAK_REWARDS.length) + 1);
      const baseRewardPoints = LOGIN_STREAK_REWARDS[dayIndex - 1] || LOGIN_STREAK_REWARDS[0];
      const weeklyBonusAwarded = nextStreak > 0 && nextStreak % 7 === 0;
      const weeklyBonusPoints = weeklyBonusAwarded ? LOGIN_WEEKLY_STREAK_BONUS : 0;
      const rewardPoints = baseRewardPoints + weeklyBonusPoints;
      const nextWeeklyBonusInDays = (7 - (nextStreak % 7)) || 7;

      await db.transaction(async (tx: any) => {
        const child = await tx
          .select()
          .from(children)
          .where(eq(children.id, childId))
          .for("update");

        if (!child[0]) {
          throw new Error("CHILD_NOT_FOUND");
        }

        await tx
          .update(children)
          .set({ totalPoints: sql`${children.totalPoints} + ${rewardPoints}` })
          .where(eq(children.id, childId));

        // Internal analytics event for login reward loop performance tracking.
        await tx.insert(childGrowthEvents).values({
          childId,
          eventType: weeklyBonusAwarded ? "login_reward_weekly_bonus_unlocked" : "login_reward_claim",
          growthPoints: 0,
          metadata: {
            rewardPoints,
            baseRewardPoints,
            weeklyBonusPoints,
            weeklyBonusAwarded,
            streakDays: nextStreak,
            dayIndex,
          },
        });
      });

      const nextState: ChildLoginRewardState = {
        dayKey: todayKey,
        streakDays: nextStreak,
        totalClaims: state.totalClaims + 1,
        lastClaimAt: today.toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveChildLoginRewardState(childId, nextState);

      res.json(successResponse({
        claimedToday: true,
        streakDays: nextState.streakDays,
        currentDayIndex: dayIndex,
        rewardPoints,
        baseRewardPoints,
        weeklyBonusPoints: LOGIN_WEEKLY_STREAK_BONUS,
        weeklyBonusAwarded,
        nextWeeklyBonusInDays,
        totalClaims: nextState.totalClaims,
        rewardTable: LOGIN_STREAK_REWARDS,
      }, "Login reward claimed"));
    } catch (error: any) {
      if (error.message === "CHILD_NOT_FOUND") {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Child not found"));
      }
      console.error("Claim child login reward error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to claim login reward"));
    }
  });

  // Plant selected seed in a specific slot
  app.post("/api/child/plant-seed", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const slotIndex = Number(req.body?.slotIndex);
      const seedId = String(req.body?.seedId || "");
      const seedCatalog = await getGardenSeedsCatalog();

      if (!isValidGardenSlotIndex(slotIndex)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid slot index"));
      }

      const seed = seedCatalog.find((item) => item.id === seedId && item.isActive);
      if (!seed) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid seed"));
      }

      const state = await getChildGardenState(childId);
      if (state.slots[slotIndex]) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Slot is already planted"));
      }

      const plantCost = Math.max(0, seed.plantCost || 0);

      const txResult = await db.transaction(async (tx: any) => {
        const child = await tx
          .select()
          .from(children)
          .where(eq(children.id, childId))
          .for("update");

        if (!child[0]) {
          throw new Error("CHILD_NOT_FOUND");
        }

        if (child[0].totalPoints < plantCost) {
          throw new Error("INSUFFICIENT_POINTS");
        }

        await tx
          .update(children)
          .set({ totalPoints: sql`${children.totalPoints} - ${plantCost}` })
          .where(and(eq(children.id, childId), sql`${children.totalPoints} >= ${plantCost}`));

        return {
          pointsDeducted: plantCost,
          newTotalPoints: child[0].totalPoints - plantCost,
        };
      });

      state.slots[slotIndex] = {
        seedId,
        progressPoints: 0,
        stage: 1,
        totalStages: seed.stages,
        plantedAt: new Date().toISOString(),
        careCount: 0,
      };
      state.beautyScore = calculateGardenBeauty(state.slots);
      applyGardenEconomyDelta(state, {
        spent: txResult.pointsDeducted,
        planted: 1,
      });

      await saveChildGardenState(childId, state);
      const dailyState = await updateGardenDailyProgress(childId, { plant: 1 });
      await updateGardenWeeklyProgress(childId, { plant: 1 });
      res.json(successResponse({
        ...state,
        plantedSeedId: seedId,
        pointsDeducted: txResult.pointsDeducted,
        newTotalPoints: txResult.newTotalPoints,
        daily: {
          dayKey: dailyState.dayKey,
          event: dailyState.event,
          quests: dailyState.quests,
          claimedAllReward: dailyState.claimedAllReward,
        },
      }, "Seed planted successfully"));
    } catch (error: any) {
      if (error.message === "CHILD_NOT_FOUND") {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Child not found"));
      }
      if (error.message === "INSUFFICIENT_POINTS") {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Not enough points for planting"));
      }
      console.error("Plant seed error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to plant seed"));
    }
  });

  // Use a garden tool (deduct points + add growth points)
  app.post("/api/child/use-garden-tool", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const toolKey = String(req.body?.toolKey || "") as keyof GardenToolsPricing;
      const slotIndex = req.body?.slotIndex !== undefined ? Number(req.body.slotIndex) : null;
      const pricing = await getGardenToolsPricing();
      const seedCatalog = await getGardenSeedsCatalog();

      if (!["water", "fertilizer", "pruner", "spray"].includes(toolKey)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid garden tool"));
      }

      const toolConfig = pricing[toolKey];
      const gardenState = await getChildGardenState(childId);
      const dailyState = await getChildGardenDailyState(childId);
      const hadPassiveGrowth = applyPassiveGrowthToGardenState(gardenState, seedCatalog, dailyState.event);
      const selectedSlot = slotIndex !== null && isValidGardenSlotIndex(slotIndex)
        ? gardenState.slots[slotIndex]
        : null;
      const selectedSeed = selectedSlot ? seedCatalog.find((item) => item.id === selectedSlot.seedId) : undefined;
      const growthPointsBase = selectedSlot
        ? calculateGrowthPointsForTool(selectedSlot, selectedSeed, toolConfig, toolKey)
        : toolConfig.growthPoints;
      const growthPointsEarned = Math.max(1, Math.round(growthPointsBase * dailyState.event.growthMultiplier));

      const result = await db.transaction(async (tx: any) => {
        const child = await tx
          .select()
          .from(children)
          .where(eq(children.id, childId))
          .for("update");

        if (!child[0]) {
          throw new Error("CHILD_NOT_FOUND");
        }

        if (child[0].totalPoints < toolConfig.costPoints) {
          throw new Error("INSUFFICIENT_POINTS");
        }

        await tx
          .update(children)
          .set({ totalPoints: sql`${children.totalPoints} - ${toolConfig.costPoints}` })
          .where(and(
            eq(children.id, childId),
            sql`${children.totalPoints} >= ${toolConfig.costPoints}`
          ));

        let tree = await tx.select().from(childGrowthTrees).where(eq(childGrowthTrees.childId, childId));

        if (!tree[0]) {
          await tx.insert(childGrowthTrees).values({
            childId,
            currentStage: 1,
            totalGrowthPoints: growthPointsEarned,
            ...(toolKey === "water" ? { wateringsCount: 1 } : {}),
          });
          tree = await tx.select().from(childGrowthTrees).where(eq(childGrowthTrees.childId, childId));
        } else {
          const newTotal = tree[0].totalGrowthPoints + growthPointsEarned;
          const newStage = calculateTreeStage(newTotal);
          const updateData: Record<string, any> = {
            totalGrowthPoints: newTotal,
            currentStage: Math.max(tree[0].currentStage, newStage),
            lastGrowthAt: new Date(),
            updatedAt: new Date(),
          };

          if (toolKey === "water") {
            updateData["wateringsCount"] = tree[0].wateringsCount + 1;
          }

          await tx
            .update(childGrowthTrees)
            .set(updateData)
            .where(eq(childGrowthTrees.childId, childId));

          tree = await tx.select().from(childGrowthTrees).where(eq(childGrowthTrees.childId, childId));
        }

        await tx.insert(childGrowthEvents).values({
          childId,
          eventType: "garden_tool_use",
          growthPoints: growthPointsEarned,
          metadata: {
            toolKey,
            slotIndex,
            pointsSpent: toolConfig.costPoints,
            slotGrowthPoints: growthPointsEarned,
            seedId: selectedSlot?.seedId,
          },
        });

        return {
          toolKey,
          pointsDeducted: toolConfig.costPoints,
          growthPointsEarned,
          newTotalPoints: child[0].totalPoints - toolConfig.costPoints,
          tree: tree[0],
        };
      });

      if (slotIndex !== null && isValidGardenSlotIndex(slotIndex)) {
        const slot = gardenState.slots[slotIndex];
        if (slot) {
          const seed = seedCatalog.find((item) => item.id === slot.seedId);
          const totalStages = seed?.stages || slot.totalStages || 1;
          const nextPoints = slot.progressPoints + growthPointsEarned;
          const computedStage = calculateSlotStageFromProgress(nextPoints, totalStages);
          gardenState.slots[slotIndex] = {
            ...slot,
            progressPoints: nextPoints,
            stage: computedStage,
            totalStages,
            careCount: slot.careCount + 1,
          };
          gardenState.beautyScore = calculateGardenBeauty(gardenState.slots);
          applyGardenEconomyDelta(gardenState, {
            spent: toolConfig.costPoints,
            toolUse: 1,
          });
          const nextDailyState = await updateGardenDailyProgress(childId, { care: 1 });
          await updateGardenWeeklyProgress(childId, { care: 1 });
          await saveChildGardenState(childId, gardenState);
          res.json(successResponse({
            ...result,
            gardenState,
            daily: {
              dayKey: nextDailyState.dayKey,
              event: nextDailyState.event,
              quests: nextDailyState.quests,
              claimedAllReward: nextDailyState.claimedAllReward,
            },
          }, "Garden tool used successfully"));
          return;
        }
      }

      if (hadPassiveGrowth) {
        await saveChildGardenState(childId, gardenState);
      }
      const nextDailyState = await updateGardenDailyProgress(childId, { care: 1 });
      await updateGardenWeeklyProgress(childId, { care: 1 });
      res.json(successResponse({
        ...result,
        gardenState,
        daily: {
          dayKey: nextDailyState.dayKey,
          event: nextDailyState.event,
          quests: nextDailyState.quests,
          claimedAllReward: nextDailyState.claimedAllReward,
        },
      }, "Garden tool used successfully"));
    } catch (error: any) {
      if (error.message === "CHILD_NOT_FOUND") {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Child not found"));
      }
      if (error.message === "INSUFFICIENT_POINTS") {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Not enough points for this tool"));
      }
      console.error("Use garden tool error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to use garden tool"));
    }
  });

  // Harvest a fully grown plant from a garden slot (awards child points)
  app.post("/api/child/harvest-garden-slot", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const slotIndex = Number(req.body?.slotIndex);
      const seedCatalog = await getGardenSeedsCatalog();

      if (!isValidGardenSlotIndex(slotIndex)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid slot index"));
      }

      const gardenState = await getChildGardenState(childId);
      const dailyState = await getChildGardenDailyState(childId);
      const hasPassiveUpdate = applyPassiveGrowthToGardenState(gardenState, seedCatalog, dailyState.event);
      if (hasPassiveUpdate) {
        await saveChildGardenState(childId, gardenState);
      }
      const slot = gardenState.slots[slotIndex];

      if (!slot) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "No planted slot to harvest"));
      }

      if (slot.stage < slot.totalStages) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Plant is not fully grown yet"));
      }

      const seed = seedCatalog.find((item) => item.id === slot.seedId);
      const grossRewardPoints = calculateHarvestReward(slot, seed);
      const qualityBonus = Math.max(0, Math.min(20, Math.floor(slot.careCount / 2)));
      const eventReward = Math.round((grossRewardPoints + qualityBonus) * dailyState.event.harvestMultiplier);
      const finalRewardPoints = Math.max(1, eventReward);

      const result = await db.transaction(async (tx: any) => {
        const child = await tx
          .select()
          .from(children)
          .where(eq(children.id, childId))
          .for("update");

        if (!child[0]) {
          throw new Error("CHILD_NOT_FOUND");
        }

        await tx
          .update(children)
          .set({ totalPoints: sql`${children.totalPoints} + ${finalRewardPoints}` })
          .where(eq(children.id, childId));

        await tx
          .update(childGrowthTrees)
          .set({
            rewardsEarned: sql`${childGrowthTrees.rewardsEarned} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(childGrowthTrees.childId, childId));

        await tx.insert(childGrowthEvents).values({
          childId,
          eventType: "garden_harvest",
          growthPoints: 0,
          metadata: {
            rewardPoints: finalRewardPoints,
            grossRewardPoints,
            qualityBonus,
            slotIndex,
            seedId: slot.seedId,
            stage: slot.stage,
            totalStages: slot.totalStages,
            careCount: slot.careCount,
          },
        });

        return {
          rewardPoints: finalRewardPoints,
          grossRewardPoints,
          qualityBonus,
          newTotalPoints: child[0].totalPoints + finalRewardPoints,
        };
      });

      gardenState.slots[slotIndex] = null;
      gardenState.beautyScore = calculateGardenBeauty(gardenState.slots);
      applyGardenEconomyDelta(gardenState, {
        harvest: result.rewardPoints,
        harvested: 1,
      });
      await saveChildGardenState(childId, gardenState);
      const nextDailyState = await updateGardenDailyProgress(childId, { harvest: 1 });
      await updateGardenWeeklyProgress(childId, { harvest: 1 });

      res.json(successResponse({
        slotIndex,
        ...result,
        gardenState,
        daily: {
          dayKey: nextDailyState.dayKey,
          event: nextDailyState.event,
          quests: nextDailyState.quests,
          claimedAllReward: nextDailyState.claimedAllReward,
        },
      }, "Plant harvested successfully"));
    } catch (error: any) {
      if (error.message === "CHILD_NOT_FOUND") {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Child not found"));
      }
      console.error("Harvest garden slot error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to harvest plant"));
    }
  });

  // Record a growth event (internal function)
  async function recordGrowthEvent(childId: string, eventType: string, growthPoints: number, metadata?: Record<string, any>) {
    try {
      // Insert event
      await db.insert(childGrowthEvents).values({
        childId,
        eventType,
        growthPoints,
        metadata,
      });

      // Update growth tree
      let tree = await db.select().from(childGrowthTrees).where(eq(childGrowthTrees.childId, childId));

      if (!tree[0]) {
        // Initialize if not exists
        await db.insert(childGrowthTrees).values({
          childId,
          currentStage: 1,
          totalGrowthPoints: growthPoints,
        });
        tree = await db.select().from(childGrowthTrees).where(eq(childGrowthTrees.childId, childId));
      } else {
        // Update existing tree
        const newTotal = tree[0].totalGrowthPoints + growthPoints;
        const newStage = calculateTreeStage(newTotal);

        const updateData: Record<string, any> = {
          totalGrowthPoints: newTotal,
          lastGrowthAt: new Date(),
          updatedAt: new Date(),
        };

        // Update specific counters
        if (eventType === "task_complete") {
          updateData["tasksCompleted"] = tree[0].tasksCompleted + 1;
        } else if (eventType === "game_played") {
          updateData["gamesPlayed"] = tree[0].gamesPlayed + 1;
        } else if (eventType === "reward_earned") {
          updateData["rewardsEarned"] = tree[0].rewardsEarned + 1;
        }

        // Update stage if changed
        if (newStage > tree[0].currentStage) {
          updateData["currentStage"] = newStage;
        }

        await db.update(childGrowthTrees)
          .set(updateData)
          .where(eq(childGrowthTrees.childId, childId));
      }
    } catch (error) {
      console.error("Record growth event error:", error);
    }
  }

  // Export for use in other routes
  (global as any).recordGrowthEvent = recordGrowthEvent;

  // Get annual report for a child
  app.get("/api/child/annual-report", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const year = parseInt(req.query.year as string) || new Date().getFullYear();

      // Get monthly data for the year
      const monthlyData = [];

      for (let month = 1; month <= 12; month++) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        // Count tasks completed in this month
        const tasksCompleted = await db.select({ count: sql<number>`count(*)` })
          .from(taskResults)
          .where(and(
            eq(taskResults.childId, childId),
            eq(taskResults.isCorrect, true),
            sql`${taskResults.completedAt} >= ${startDate}`,
            sql`${taskResults.completedAt} <= ${endDate}`
          ));

        // Count growth points in this month
        const growthEvents = await db.select({
          totalPoints: sql<number>`COALESCE(SUM(${childGrowthEvents.growthPoints}), 0)`
        })
          .from(childGrowthEvents)
          .where(and(
            eq(childGrowthEvents.childId, childId),
            sql`${childGrowthEvents.occurredAt} >= ${startDate}`,
            sql`${childGrowthEvents.occurredAt} <= ${endDate}`
          ));

        monthlyData.push({
          month,
          monthName: new Date(year, month - 1).toLocaleDateString('ar-EG', { month: 'long' }),
          tasksCompleted: Number(tasksCompleted[0]?.count || 0),
          growthPoints: Number(growthEvents[0]?.totalPoints || 0),
        });
      }

      // Get yearly totals
      const yearlyTotals = await db.select({
        totalTasks: sql<number>`count(*)`,
        totalPoints: sql<number>`COALESCE(SUM(${taskResults.pointsEarned}), 0)`
      })
        .from(taskResults)
        .where(and(
          eq(taskResults.childId, childId),
          sql`EXTRACT(YEAR FROM ${taskResults.completedAt}) = ${year}`
        ));

      res.json({
        success: true,
        data: {
          year,
          monthlyData,
          yearlyTotals: {
            totalTasks: Number(yearlyTotals[0]?.totalTasks || 0),
            totalPoints: Number(yearlyTotals[0]?.totalPoints || 0),
          }
        }
      });
    } catch (error: any) {
      console.error("Get annual report error:", error);
      res.status(500).json({ message: "Failed to get annual report" });
    }
  });

  // Parent endpoint: Get child's annual report
  app.get("/api/parent/children/:childId/annual-report", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { childId } = req.params;
      const year = parseInt(req.query.year as string) || new Date().getFullYear();

      // Verify parent owns this child
      const link = await db.select().from(parentChild).where(and(
        eq(parentChild.parentId, parentId),
        eq(parentChild.childId, childId)
      ));

      if (!link[0]) {
        return res.status(403).json(errorResponse(ErrorCode.PARENT_CHILD_MISMATCH, "Access denied"));
      }

      // Get monthly data for the year
      const monthlyData = [];

      for (let month = 1; month <= 12; month++) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const tasksCompleted = await db.select({ count: sql<number>`count(*)` })
          .from(taskResults)
          .where(and(
            eq(taskResults.childId, childId),
            eq(taskResults.isCorrect, true),
            sql`${taskResults.completedAt} >= ${startDate}`,
            sql`${taskResults.completedAt} <= ${endDate}`
          ));

        const growthEvents = await db.select({
          totalPoints: sql<number>`COALESCE(SUM(${childGrowthEvents.growthPoints}), 0)`
        })
          .from(childGrowthEvents)
          .where(and(
            eq(childGrowthEvents.childId, childId),
            sql`${childGrowthEvents.occurredAt} >= ${startDate}`,
            sql`${childGrowthEvents.occurredAt} <= ${endDate}`
          ));

        monthlyData.push({
          month,
          monthName: new Date(year, month - 1).toLocaleDateString('ar-EG', { month: 'long' }),
          tasksCompleted: Number(tasksCompleted[0]?.count || 0),
          growthPoints: Number(growthEvents[0]?.totalPoints || 0),
        });
      }

      // Get yearly totals
      const yearlyTotals = await db.select({
        totalTasks: sql<number>`count(*)`,
        totalPoints: sql<number>`COALESCE(SUM(${taskResults.pointsEarned}), 0)`
      })
        .from(taskResults)
        .where(and(
          eq(taskResults.childId, childId),
          sql`EXTRACT(YEAR FROM ${taskResults.completedAt}) = ${year}`
        ));

      // Get child's growth tree
      const tree = await db.select().from(childGrowthTrees).where(eq(childGrowthTrees.childId, childId));

      res.json({
        success: true,
        data: {
          year,
          monthlyData,
          yearlyTotals: {
            totalTasks: Number(yearlyTotals[0]?.totalTasks || 0),
            totalPoints: Number(yearlyTotals[0]?.totalPoints || 0),
          },
          growthTree: tree[0] || null,
        }
      });
    } catch (error: any) {
      console.error("Get child annual report error:", error);
      res.status(500).json({ message: "Failed to get annual report" });
    }
  });

  // ==========================================
  // ===== SHOWCASE PROFILE & FRIEND SYSTEM =====
  // ==========================================

  // Generate share code for a child (if not exists)
  async function ensureShareCode(childId: string): Promise<string> {
    const child = await db.select({ shareCode: children.shareCode }).from(children).where(eq(children.id, childId));
    if (child[0]?.shareCode) return child[0].shareCode;
    const code = crypto.randomBytes(4).toString("hex").toUpperCase(); // 8-char hex code
    await db.update(children).set({ shareCode: code }).where(eq(children.id, childId));
    return code;
  }

  // Get full showcase profile for current child
  app.get("/api/child/showcase", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const child = await db.select().from(children).where(eq(children.id, childId));
      if (!child[0]) return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Child not found"));

      const shareCode = await ensureShareCode(childId);

      // Growth tree
      const tree = await db.select().from(childGrowthTrees).where(eq(childGrowthTrees.childId, childId));

      // Task stats
      const completedTasks = await db.select({ count: count() }).from(taskResults)
        .where(and(eq(taskResults.childId, childId), eq(taskResults.isCorrect, true)));

      // Game stats
      const gamesPlayed = await db.select({ count: count() }).from(gamePlayHistory)
        .where(eq(gamePlayHistory.childId, childId));

      // Waterings
      const wateringsCount = tree[0]?.wateringsCount || 0;

      // Streaks — calculate current task streak
      const recentTasks = await db.select({ completedAt: taskResults.completedAt })
        .from(taskResults)
        .where(and(eq(taskResults.childId, childId), eq(taskResults.isCorrect, true)))
        .orderBy(sql`${taskResults.completedAt} DESC`)
        .limit(60);

      let streak = 0;
      if (recentTasks.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let checkDate = new Date(today);
        for (let i = 0; i < 60; i++) {
          const dayStr = checkDate.toISOString().split("T")[0];
          const hasTask = recentTasks.some((t: any) => {
            const tDate = new Date(t.completedAt!);
            return tDate.toISOString().split("T")[0] === dayStr;
          });
          if (hasTask) { streak++; checkDate.setDate(checkDate.getDate() - 1); }
          else break;
        }
      }

      // Build achievement badges
      const achievements: { id: string; icon: string; title: string; description: string; earned: boolean }[] = [];
      const totalPts = child[0].totalPoints;
      const tasksCount = Number(completedTasks[0]?.count || 0);
      const gamesCount = Number(gamesPlayed[0]?.count || 0);
      const treeStage = tree[0]?.currentStage || 1;

      // Points milestones
      const pointMilestones = [
        { pts: 100, id: "pts100", icon: "⭐", title: "نجمة مبتدئ", titleEn: "Rising Star" },
        { pts: 500, id: "pts500", icon: "🌟", title: "نجمة لامعة", titleEn: "Shining Star" },
        { pts: 1000, id: "pts1000", icon: "💫", title: "نجمة خارقة", titleEn: "Super Star" },
        { pts: 5000, id: "pts5000", icon: "🏆", title: "بطل النقاط", titleEn: "Points Champion" },
        { pts: 10000, id: "pts10000", icon: "👑", title: "ملك النقاط", titleEn: "Points King" },
      ];
      for (const m of pointMilestones) {
        achievements.push({ id: m.id, icon: m.icon, title: m.title, description: `${m.pts}+ ${m.titleEn}`, earned: totalPts >= m.pts });
      }

      // Task milestones
      const taskMilestones = [
        { count: 10, id: "tasks10", icon: "📝", title: "منجز المهام", titleEn: "Task Achiever" },
        { count: 50, id: "tasks50", icon: "📚", title: "عالم المهام", titleEn: "Task Scholar" },
        { count: 100, id: "tasks100", icon: "🎓", title: "خبير المهام", titleEn: "Task Expert" },
      ];
      for (const m of taskMilestones) {
        achievements.push({ id: m.id, icon: m.icon, title: m.title, description: `${m.count}+ ${m.titleEn}`, earned: tasksCount >= m.count });
      }

      // Game milestones
      const gameMilestones = [
        { count: 10, id: "games10", icon: "🎮", title: "لاعب نشط", titleEn: "Active Gamer" },
        { count: 50, id: "games50", icon: "🕹️", title: "لاعب محترف", titleEn: "Pro Gamer" },
      ];
      for (const m of gameMilestones) {
        achievements.push({ id: m.id, icon: m.icon, title: m.title, description: `${m.count}+ ${m.titleEn}`, earned: gamesCount >= m.count });
      }

      // Tree milestones
      const treeMilestones = [
        { stage: 5, id: "tree5", icon: "🌱", title: "مزارع مبتدئ", titleEn: "Young Gardener" },
        { stage: 10, id: "tree10", icon: "🌳", title: "مزارع ماهر", titleEn: "Skilled Gardener" },
        { stage: 15, id: "tree15", icon: "🌲", title: "سيد الشجرة", titleEn: "Tree Master" },
        { stage: 20, id: "tree20", icon: "✨", title: "الشجرة الأسطورية", titleEn: "Legendary Tree" },
      ];
      for (const m of treeMilestones) {
        achievements.push({ id: m.id, icon: m.icon, title: m.title, description: `Stage ${m.stage}+`, earned: treeStage >= m.stage });
      }

      // Streak milestones
      if (streak >= 3) achievements.push({ id: "streak3", icon: "🔥", title: "نشاط مستمر", description: "3-day streak", earned: true });
      if (streak >= 7) achievements.push({ id: "streak7", icon: "💪", title: "أسبوع كامل", description: "7-day streak", earned: true });
      if (streak >= 30) achievements.push({ id: "streak30", icon: "🏅", title: "شهر من النجاح", description: "30-day streak", earned: true });

      // Watering milestones
      if (wateringsCount >= 10) achievements.push({ id: "water10", icon: "💧", title: "ساقي الشجرة", description: "10+ waterings", earned: true });
      if (wateringsCount >= 50) achievements.push({ id: "water50", icon: "🌊", title: "ملك الري", description: "50+ waterings", earned: true });

      // Friend count
      const friendCount = await db.select({ count: count() }).from(childFriendships)
        .where(and(
          or(eq(childFriendships.requesterId, childId), eq(childFriendships.addresseeId, childId)),
          eq(childFriendships.status, "accepted")
        ));
      const fCount = Number(friendCount[0]?.count || 0);

      res.json(successResponse({
        child: {
          id: child[0].id,
          name: child[0].name,
          avatarUrl: child[0].avatarUrl,
          coverImageUrl: child[0].coverImageUrl,
          bio: child[0].bio,
          schoolName: child[0].schoolName,
          academicGrade: child[0].academicGrade,
          hobbies: child[0].hobbies,
          governorate: child[0].governorate,
          interests: child[0].interests,
          totalPoints: child[0].totalPoints,
          shareCode,
          joinedAt: child[0].createdAt,
        },
        stats: {
          totalPoints: totalPts,
          tasksCompleted: tasksCount,
          gamesPlayed: gamesCount,
          treeStage,
          wateringsCount,
          streak,
          friendCount: fCount,
        },
        achievements,
        growthTree: tree[0] || null,
      }));
    } catch (error: any) {
      console.error("Get child showcase error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to get showcase profile"));
    }
  });

  // Get a child's public profile by share code
  app.get("/api/child/profile/:shareCode", async (req, res) => {
    try {
      const { shareCode } = req.params;
      const child = await db.select().from(children).where(eq(children.shareCode, shareCode));
      if (!child[0] || !child[0].profilePublic) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Profile not found"));
      }

      const viewer = decodeOptionalAuthUser(req);
      const visitorIp = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "")
        .split(",")[0]?.trim() || null;
      const visitorUserAgent = String(req.headers["user-agent"] || "").trim() || null;
      await db.insert(childReferralVisits).values({
        childId: child[0].id,
        shareCode: child[0].shareCode || shareCode,
        visitorParentId: viewer.parentId || null,
        visitorChildId: viewer.childId || null,
        visitorIp,
        visitorUserAgent,
      });

      const tree = await db.select().from(childGrowthTrees).where(eq(childGrowthTrees.childId, child[0].id));
      const completedTasks = await db.select({ count: count() }).from(taskResults)
        .where(and(eq(taskResults.childId, child[0].id), eq(taskResults.isCorrect, true)));
      const gamesPlayed = await db.select({ count: count() }).from(gamePlayHistory)
        .where(eq(gamePlayHistory.childId, child[0].id));

      res.json(successResponse({
        name: child[0].name,
        avatarUrl: child[0].avatarUrl,
        coverImageUrl: child[0].coverImageUrl,
        bio: child[0].bio,
        schoolName: child[0].schoolName,
        governorate: child[0].governorate,
        totalPoints: child[0].totalPoints,
        treeStage: tree[0]?.currentStage || 1,
        tasksCompleted: Number(completedTasks[0]?.count || 0),
        gamesPlayed: Number(gamesPlayed[0]?.count || 0),
      }));
    } catch (error: any) {
      console.error("Get public profile error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to get profile"));
    }
  });

  // Upload cover image
  app.post("/api/child/cover-image", authMiddleware, async (req: any, res) => {
    try {
      const multer = await import("multer");
      const path = await import("path");
      const fs = await import("fs");

      const uploadDir = path.join(process.cwd(), "uploads", "covers");
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

      const storage = multer.default.diskStorage({
        destination: (_r: any, _f: any, cb: any) => cb(null, uploadDir),
        filename: (_r: any, file: any, cb: any) => {
          const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
          cb(null, unique + path.extname(file.originalname));
        },
      });
      const upload = multer.default({
        storage,
        limits: { fileSize: 5 * 1024 * 1024 },
        fileFilter: (_r: any, file: any, cb: any) => {
          const allowed = ["image/jpeg", "image/png", "image/webp"];
          if (!allowed.includes(file.mimetype)) {
            return cb(new Error("Unsupported file type. JPG, PNG, WebP only"));
          }
          cb(null, true);
        },
      }).single("cover");

      upload(req, res, async (err: any) => {
        if (err) return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, err.message || "Upload failed"));
        if (!req.file) return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "No image selected"));

        try {
          const coverUrl = `/uploads/covers/${req.file.filename}`;

          // Delete old cover
          const old = await db.select({ coverImageUrl: children.coverImageUrl }).from(children).where(eq(children.id, req.user.childId));
          if (old[0]?.coverImageUrl) {
            const oldPath = path.join(process.cwd(), old[0].coverImageUrl.replace(/^\/+/, ""));
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
          }

          await db.update(children).set({ coverImageUrl: coverUrl }).where(eq(children.id, req.user.childId));
          return res.json(successResponse({ coverImageUrl: coverUrl }, "Cover image uploaded"));
        } catch (innerError: any) {
          console.error("Cover save error:", innerError);
          return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to save cover image"));
        }
      });
    } catch (error: any) {
      console.error("Cover upload error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to upload cover"));
    }
  });

  // Update bio & interests
  app.put("/api/child/showcase-settings", authMiddleware, async (req: any, res) => {
    try {
      const { bio, interests, profilePublic } = req.body;
      const updateData: Record<string, any> = {};
      if (bio !== undefined) updateData.bio = (bio || "").slice(0, 300);
      if (interests !== undefined) updateData.interests = Array.isArray(interests) ? interests.slice(0, 10) : [];
      if (profilePublic !== undefined) updateData.profilePublic = !!profilePublic;

      await db.update(children).set(updateData).where(eq(children.id, req.user.childId));
      res.json(successResponse({ updated: true }));
    } catch (error: any) {
      console.error("Update showcase settings error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to update settings"));
    }
  });

  // ===== FRIENDSHIP ENDPOINTS =====

  // Send friend request
  app.post("/api/child/friends/request", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const { friendId } = req.body;

      if (!friendId || friendId === childId) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid friend ID"));
      }

      // Check friend exists
      const friend = await db.select({ id: children.id }).from(children).where(eq(children.id, friendId));
      if (!friend[0]) return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Child not found"));

      // Check existing friendship in either direction
      const existing = await db.select().from(childFriendships).where(
        or(
          and(eq(childFriendships.requesterId, childId), eq(childFriendships.addresseeId, friendId)),
          and(eq(childFriendships.requesterId, friendId), eq(childFriendships.addresseeId, childId))
        )
      );

      if (existing[0]) {
        if (existing[0].status === "accepted") return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Already friends"));
        if (existing[0].status === "pending") return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Request already pending"));
        if (existing[0].status === "blocked") return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Cannot send request"));
        // If rejected, allow re-request by updating
        await db.update(childFriendships).set({ status: "pending", requesterId: childId, addresseeId: friendId, updatedAt: new Date() }).where(eq(childFriendships.id, existing[0].id));
        return res.json(successResponse({ sent: true }));
      }

      await db.insert(childFriendships).values({ requesterId: childId, addresseeId: friendId, status: "pending" });

      // Notify the addressee
      const requester = await db.select({ name: children.name }).from(children).where(eq(children.id, childId));
      await db.insert(childFriendNotifications).values({
        childId: friendId,
        fromChildId: childId,
        type: "new_friend",
        title: "طلب صداقة جديد",
        message: `${requester[0]?.name || "طفل"} يريد أن يكون صديقك!`,
      });

      res.json(successResponse({ sent: true }));
    } catch (error: any) {
      console.error("Send friend request error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to send request"));
    }
  });

  // Accept/Reject friend request
  app.put("/api/child/friends/:friendshipId", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const { friendshipId } = req.params;
      const { action } = req.body; // "accept" or "reject"

      const friendship = await db.select().from(childFriendships).where(eq(childFriendships.id, friendshipId));
      if (!friendship[0] || friendship[0].addresseeId !== childId) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Request not found"));
      }

      if (friendship[0].status !== "pending") {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Request is not pending"));
      }

      const newStatus = action === "accept" ? "accepted" : "rejected";
      await db.update(childFriendships).set({ status: newStatus, updatedAt: new Date() }).where(eq(childFriendships.id, friendshipId));

      if (action === "accept") {
        // Notify the requester
        const child = await db.select({ name: children.name }).from(children).where(eq(children.id, childId));
        await db.insert(childFriendNotifications).values({
          childId: friendship[0].requesterId,
          fromChildId: childId,
          type: "new_friend",
          title: "تم قبول طلب الصداقة",
          message: `${child[0]?.name || "طفل"} وافق على طلب صداقتك! 🎉`,
        });
      }

      res.json(successResponse({ status: newStatus }));
    } catch (error: any) {
      console.error("Handle friend request error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to handle request"));
    }
  });

  // Remove friendship
  app.delete("/api/child/friends/:friendshipId", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const { friendshipId } = req.params;

      const friendship = await db.select().from(childFriendships).where(eq(childFriendships.id, friendshipId));
      if (!friendship[0]) return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Friendship not found"));
      if (friendship[0].requesterId !== childId && friendship[0].addresseeId !== childId) {
        return res.status(403).json(errorResponse(ErrorCode.FORBIDDEN, "Not authorized"));
      }

      await db.delete(childFriendships).where(eq(childFriendships.id, friendshipId));
      res.json(successResponse({ removed: true }));
    } catch (error: any) {
      console.error("Remove friend error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to remove friend"));
    }
  });

  // Get my friends list
  app.get("/api/child/friends", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;

      const friendships = await db.select().from(childFriendships).where(
        and(
          or(eq(childFriendships.requesterId, childId), eq(childFriendships.addresseeId, childId)),
          eq(childFriendships.status, "accepted")
        )
      );

      const friendIds = friendships.map((f: any) => f.requesterId === childId ? f.addresseeId : f.requesterId);
      if (friendIds.length === 0) return res.json(successResponse({ friends: [], pending: [] }));

      const friends = await db.select({
        id: children.id,
        name: children.name,
        avatarUrl: children.avatarUrl,
        schoolName: children.schoolName,
        governorate: children.governorate,
        totalPoints: children.totalPoints,
      }).from(children).where(sql`${children.id} IN (${sql.join(friendIds.map((id: any) => sql`${id}`), sql`, `)})`);

      // Add friendship ID and growth tree stage
      const friendsWithMeta = await Promise.all(friends.map(async (f: any) => {
        const tree = await db.select({ currentStage: childGrowthTrees.currentStage }).from(childGrowthTrees).where(eq(childGrowthTrees.childId, f.id));
        const friendship = friendships.find((fs: any) => fs.requesterId === f.id || fs.addresseeId === f.id);
        return { ...f, treeStage: tree[0]?.currentStage || 1, friendshipId: friendship?.id };
      }));

      // Pending requests (incoming)
      const pending = await db.select().from(childFriendships).where(
        and(eq(childFriendships.addresseeId, childId), eq(childFriendships.status, "pending"))
      );

      const pendingDetails = await Promise.all(pending.map(async (p: any) => {
        const child = await db.select({ id: children.id, name: children.name, avatarUrl: children.avatarUrl, schoolName: children.schoolName })
          .from(children).where(eq(children.id, p.requesterId));
        return { ...p, requester: child[0] || null };
      }));

      res.json(successResponse({ friends: friendsWithMeta, pending: pendingDetails }));
    } catch (error: any) {
      console.error("Get friends error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to get friends"));
    }
  });

  // Get friend suggestions (by geography, school, interests)
  app.get("/api/child/friends/suggestions", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const child = await db.select().from(children).where(eq(children.id, childId));
      if (!child[0]) return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Child not found"));

      // Get existing friend IDs + pending
      const existingFriendships = await db.select().from(childFriendships).where(
        or(eq(childFriendships.requesterId, childId), eq(childFriendships.addresseeId, childId))
      );
      const excludeIds = new Set<string>([childId]);
      existingFriendships.forEach((f: any) => {
        excludeIds.add(f.requesterId);
        excludeIds.add(f.addresseeId);
      });

      // Get all children who are not already friends/pending
      const allChildren = await db.select({
        id: children.id,
        name: children.name,
        avatarUrl: children.avatarUrl,
        schoolName: children.schoolName,
        governorate: children.governorate,
        hobbies: children.hobbies,
        interests: children.interests,
        academicGrade: children.academicGrade,
        profilePublic: children.profilePublic,
      }).from(children).where(sql`${children.profilePublic} = true`).limit(200);

      const mySchool = child[0].schoolName?.toLowerCase().trim();
      const myGov = child[0].governorate?.toLowerCase().trim();
      const myHobbies = (child[0].hobbies || "").toLowerCase().split(/[,،\s]+/).filter(Boolean);
      const myInterests: string[] = (child[0].interests as string[]) || [];
      const myGrade = child[0].academicGrade;

      const scored = allChildren
        .filter((c: any) => !excludeIds.has(c.id))
        .map((c: any) => {
          let score = 0;
          const reasons: string[] = [];

          // Same school (+40)
          if (mySchool && c.schoolName && c.schoolName.toLowerCase().trim() === mySchool) {
            score += 40; reasons.push("school");
          }

          // Same governorate (+25)
          if (myGov && c.governorate && c.governorate.toLowerCase().trim() === myGov) {
            score += 25; reasons.push("location");
          }

          // Same grade (+15)
          if (myGrade && c.academicGrade && c.academicGrade === myGrade) {
            score += 15; reasons.push("grade");
          }

          // Shared hobbies (+10 each)
          const theirHobbies = (c.hobbies || "").toLowerCase().split(/[,،\s]+/).filter(Boolean);
          const hobbyMatch = myHobbies.filter((h: any) => theirHobbies.includes(h)).length;
          if (hobbyMatch > 0) { score += hobbyMatch * 10; reasons.push("hobbies"); }

          // Shared interests (+8 each)
          const theirInterests: string[] = (c.interests as string[]) || [];
          const interestMatch = myInterests.filter(i => theirInterests.includes(i)).length;
          if (interestMatch > 0) { score += interestMatch * 8; reasons.push("interests"); }

          return { ...c, score, reasons };
        })
        .filter((c: any) => c.score > 0)
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 20);

      res.json(successResponse({ suggestions: scored }));
    } catch (error: any) {
      console.error("Get friend suggestions error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to get suggestions"));
    }
  });

  // Get friend notifications
  app.get("/api/child/friends/notifications", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const notifs = await db.select().from(childFriendNotifications)
        .where(eq(childFriendNotifications.childId, childId))
        .orderBy(sql`${childFriendNotifications.createdAt} DESC`)
        .limit(50);

      // Enrich with friend names
      const enriched = await Promise.all(notifs.map(async (n: any) => {
        const friend = await db.select({ name: children.name, avatarUrl: children.avatarUrl })
          .from(children).where(eq(children.id, n.fromChildId));
        return { ...n, friendName: friend[0]?.name, friendAvatar: friend[0]?.avatarUrl };
      }));

      const unreadCount = enriched.filter(n => !n.isRead).length;

      res.json(successResponse({ notifications: enriched, unreadCount }));
    } catch (error: any) {
      console.error("Get friend notifications error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to get notifications"));
    }
  });

  // Mark friend notification as read
  app.put("/api/child/friends/notifications/:notifId/read", authMiddleware, async (req: any, res) => {
    try {
      await db.update(childFriendNotifications).set({ isRead: true })
        .where(and(
          eq(childFriendNotifications.id, req.params.notifId),
          eq(childFriendNotifications.childId, req.user.childId)
        ));
      res.json(successResponse({ read: true }));
    } catch (error: any) {
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed"));
    }
  });

  // Mark all friend notifications as read
  app.put("/api/child/friends/notifications/read-all", authMiddleware, async (req: any, res) => {
    try {
      await db.update(childFriendNotifications).set({ isRead: true })
        .where(eq(childFriendNotifications.childId, req.user.childId));
      res.json(successResponse({ read: true }));
    } catch (error: any) {
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed"));
    }
  });

  // ===== AUTO-ACHIEVEMENT NOTIFICATION HELPER =====
  // This is called internally when a child achieves something notable
  async function notifyFriendsOfAchievement(childId: string, type: string, title: string, message: string, metadata?: Record<string, any>) {
    try {
      const friendships = await db.select().from(childFriendships).where(
        and(
          or(eq(childFriendships.requesterId, childId), eq(childFriendships.addresseeId, childId)),
          eq(childFriendships.status, "accepted")
        )
      );

      const friendIds = friendships.map((f: any) => f.requesterId === childId ? f.addresseeId : f.requesterId);
      if (friendIds.length === 0) return;

      const notifications = friendIds.map((fId: any) => ({
        childId: fId,
        fromChildId: childId,
        type,
        title,
        message,
        metadata: metadata || {},
      }));

      await db.insert(childFriendNotifications).values(notifications);
    } catch (err) {
      console.error("Failed to notify friends:", err);
    }
  }

  // Hook: Achievement notification on growth tree level up
  // This can be called from the water-tree or growth event processing
  app.post("/api/child/friends/notify-achievement", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const { type, title, message } = req.body;
      if (!type || !title || !message) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Missing fields"));
      }

      const child = await db.select({ name: children.name }).from(children).where(eq(children.id, childId));
      const finalMessage = message.replace("{name}", child[0]?.name || "طفل");

      await notifyFriendsOfAchievement(childId, type, title, finalMessage);
      res.json(successResponse({ notified: true }));
    } catch (error: any) {
      console.error("Notify achievement error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed"));
    }
  });

  // ===== FOLLOW SYSTEM (نظام المتابعة) =====

  // Follow a child, school, or teacher
  app.post("/api/child/follow", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const { followingId, followingType } = req.body;

      if (!followingId || !followingType) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Missing followingId or followingType"));
      }
      if (!["child", "school", "teacher"].includes(followingType)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid followingType"));
      }
      // Can't follow yourself
      if (followingType === "child" && followingId === childId) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Cannot follow yourself"));
      }

      // Verify the target exists
      if (followingType === "child") {
        const target = await db.select({ id: children.id }).from(children).where(eq(children.id, followingId));
        if (!target.length) return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Child not found"));
      } else if (followingType === "school") {
        const target = await db.select({ id: schools.id }).from(schools).where(and(eq(schools.id, followingId), eq(schools.isActive, true)));
        if (!target.length) return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "School not found"));
      } else if (followingType === "teacher") {
        const target = await db.select({ id: schoolTeachers.id }).from(schoolTeachers).where(and(eq(schoolTeachers.id, followingId), eq(schoolTeachers.isActive, true)));
        if (!target.length) return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Teacher not found"));
      }

      // Check if already following
      const existing = await db.select({ id: childFollows.id }).from(childFollows)
        .where(and(
          eq(childFollows.followerId, childId),
          eq(childFollows.followingId, followingId),
          eq(childFollows.followingType, followingType)
        ));
      if (existing.length) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Already following"));
      }

      const [follow] = await db.insert(childFollows).values({
        followerId: childId,
        followingId,
        followingType,
      }).returning();

      res.json(successResponse({ follow }));
    } catch (error: any) {
      console.error("Follow error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to follow"));
    }
  });

  // Unfollow
  app.delete("/api/child/follow", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const { followingId, followingType } = req.body;

      if (!followingId || !followingType) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Missing followingId or followingType"));
      }

      const deleted = await db.delete(childFollows)
        .where(and(
          eq(childFollows.followerId, childId),
          eq(childFollows.followingId, followingId),
          eq(childFollows.followingType, followingType)
        )).returning();

      if (!deleted.length) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Follow not found"));
      }

      res.json(successResponse({ unfollowed: true }));
    } catch (error: any) {
      console.error("Unfollow error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to unfollow"));
    }
  });

  // Get who the child is following (with optional type filter)
  app.get("/api/child/following", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const type = req.query.type as string | undefined; // 'child', 'school', 'teacher', or undefined = all

      const conditions = [eq(childFollows.followerId, childId)];
      if (type && ["child", "school", "teacher"].includes(type)) {
        conditions.push(eq(childFollows.followingType, type));
      }

      const follows = await db.select().from(childFollows).where(and(...conditions)).orderBy(desc(childFollows.createdAt));

      // Enrich with entity details
      const enriched = await Promise.all(follows.map(async (f: any) => {
        if (f.followingType === "child") {
          const [child] = await db.select({
            id: children.id, name: children.name, avatarUrl: children.avatarUrl,
            schoolName: children.schoolName, governorate: children.governorate, totalPoints: children.totalPoints,
          }).from(children).where(eq(children.id, f.followingId));
          return { ...f, entity: child || null };
        } else if (f.followingType === "school") {
          const [school] = await db.select({
            id: schools.id, name: schools.name, nameAr: schools.nameAr,
            imageUrl: schools.imageUrl, governorate: schools.governorate,
            totalStudents: schools.totalStudents, totalTeachers: schools.totalTeachers,
          }).from(schools).where(eq(schools.id, f.followingId));
          return { ...f, entity: school || null };
        } else if (f.followingType === "teacher") {
          const [teacher] = await db.select({
            id: schoolTeachers.id, name: schoolTeachers.name, avatarUrl: schoolTeachers.avatarUrl,
            subject: schoolTeachers.subject, bio: schoolTeachers.bio,
          }).from(schoolTeachers).where(eq(schoolTeachers.id, f.followingId));
          return { ...f, entity: teacher || null };
        }
        return { ...f, entity: null };
      }));

      res.json(successResponse({ following: enriched }));
    } catch (error: any) {
      console.error("Get following error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed"));
    }
  });

  // Get child's followers (other children who follow this child)
  app.get("/api/child/followers", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;

      const followers = await db.select({
        id: childFollows.id,
        followerId: childFollows.followerId,
        createdAt: childFollows.createdAt,
      }).from(childFollows)
        .where(and(eq(childFollows.followingId, childId), eq(childFollows.followingType, "child")))
        .orderBy(desc(childFollows.createdAt));

      // Enrich with child details
      const enriched = await Promise.all(followers.map(async (f: any) => {
        const [child] = await db.select({
          id: children.id, name: children.name, avatarUrl: children.avatarUrl,
          schoolName: children.schoolName, governorate: children.governorate, totalPoints: children.totalPoints,
        }).from(children).where(eq(children.id, f.followerId));
        return { ...f, child: child || null };
      }));

      res.json(successResponse({ followers: enriched }));
    } catch (error: any) {
      console.error("Get followers error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed"));
    }
  });

  // Get follow counts for current child
  app.get("/api/child/follow-counts", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;

      const [followingCount] = await db.select({ count: count() }).from(childFollows)
        .where(eq(childFollows.followerId, childId));

      const [followersCount] = await db.select({ count: count() }).from(childFollows)
        .where(and(eq(childFollows.followingId, childId), eq(childFollows.followingType, "child")));

      res.json(successResponse({
        followingCount: followingCount?.count || 0,
        followersCount: followersCount?.count || 0,
      }));
    } catch (error: any) {
      console.error("Follow counts error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed"));
    }
  });

  // Check if following specific entities
  app.post("/api/child/follow-check", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const { targets } = req.body; // [{ id, type }]

      if (!targets || !Array.isArray(targets)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Missing targets"));
      }

      const results: Record<string, boolean> = {};
      for (const t of targets) {
        const existing = await db.select({ id: childFollows.id }).from(childFollows)
          .where(and(
            eq(childFollows.followerId, childId),
            eq(childFollows.followingId, t.id),
            eq(childFollows.followingType, t.type)
          ));
        results[`${t.type}:${t.id}`] = existing.length > 0;
      }

      res.json(successResponse({ follows: results }));
    } catch (error: any) {
      console.error("Follow check error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed"));
    }
  });

  // ===== SEARCH & DISCOVER (البحث والاكتشاف) =====
  app.get("/api/child/search", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const q = (req.query.q as string || "").trim();
      const type = req.query.type as string || "all"; // all, children, schools, teachers

      if (q.length < 2) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Query too short (min 2 chars)"));
      }

      const pattern = `%${q}%`;
      const results: any = {};

      // Search children
      if (type === "all" || type === "children") {
        const childResults = await db.select({
          id: children.id, name: children.name, avatarUrl: children.avatarUrl,
          schoolName: children.schoolName, governorate: children.governorate,
          totalPoints: children.totalPoints, bio: children.bio,
        }).from(children)
          .where(and(
            ne(children.id, childId),
            eq(children.profilePublic, true),
            or(
              ilike(children.name, pattern),
              ilike(sql`COALESCE(${children.schoolName}, '')`, pattern),
              ilike(sql`COALESCE(${children.governorate}, '')`, pattern),
              ilike(sql`COALESCE(${children.bio}, '')`, pattern),
            )
          ))
          .limit(20);

        // Check follow status for children
        const childrenWithFollow = await Promise.all(childResults.map(async (c: any) => {
          const [follow] = await db.select({ id: childFollows.id }).from(childFollows)
            .where(and(
              eq(childFollows.followerId, childId),
              eq(childFollows.followingId, c.id),
              eq(childFollows.followingType, "child")
            ));
          return { ...c, isFollowing: !!follow };
        }));

        results.children = childrenWithFollow;
      }

      // Search schools
      if (type === "all" || type === "schools") {
        const schoolResults = await db.select({
          id: schools.id, name: schools.name, nameAr: schools.nameAr,
          imageUrl: schools.imageUrl, governorate: schools.governorate,
          totalStudents: schools.totalStudents, totalTeachers: schools.totalTeachers,
          description: schools.description,
        }).from(schools)
          .where(and(
            eq(schools.isActive, true),
            or(
              ilike(schools.name, pattern),
              ilike(sql`COALESCE(${schools.nameAr}, '')`, pattern),
              ilike(sql`COALESCE(${schools.governorate}, '')`, pattern),
              ilike(sql`COALESCE(${schools.description}, '')`, pattern),
              ilike(sql`COALESCE(${schools.city}, '')`, pattern),
            )
          ))
          .limit(20);

        const schoolsWithFollow = await Promise.all(schoolResults.map(async (s: any) => {
          const [follow] = await db.select({ id: childFollows.id }).from(childFollows)
            .where(and(
              eq(childFollows.followerId, childId),
              eq(childFollows.followingId, s.id),
              eq(childFollows.followingType, "school")
            ));
          return { ...s, isFollowing: !!follow };
        }));

        results.schools = schoolsWithFollow;
      }

      // Search teachers
      if (type === "all" || type === "teachers") {
        const teacherResults = await db.select({
          id: schoolTeachers.id, name: schoolTeachers.name, avatarUrl: schoolTeachers.avatarUrl,
          subject: schoolTeachers.subject, bio: schoolTeachers.bio,
        }).from(schoolTeachers)
          .where(and(
            eq(schoolTeachers.isActive, true),
            or(
              ilike(schoolTeachers.name, pattern),
              ilike(sql`COALESCE(${schoolTeachers.subject}, '')`, pattern),
              ilike(sql`COALESCE(${schoolTeachers.bio}, '')`, pattern),
            )
          ))
          .limit(20);

        // Enrich teachers with school name
        const teachersEnriched = await Promise.all(teacherResults.map(async (t: any) => {
          const [school] = await db.select({ name: schools.name, nameAr: schools.nameAr })
            .from(schools).where(eq(schools.id, sql`(SELECT school_id FROM school_teachers WHERE id = ${t.id})`));
          const [follow] = await db.select({ id: childFollows.id }).from(childFollows)
            .where(and(
              eq(childFollows.followerId, childId),
              eq(childFollows.followingId, t.id),
              eq(childFollows.followingType, "teacher")
            ));
          return { ...t, schoolName: school?.name || null, schoolNameAr: school?.nameAr || null, isFollowing: !!follow };
        }));

        results.teachers = teachersEnriched;
      }

      res.json(successResponse(results));
    } catch (error: any) {
      console.error("Search error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Search failed"));
    }
  });

  // Discover: Get popular/trending entities to follow
  app.get("/api/child/discover", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;

      // Popular children (by points, excluding self)
      const popularChildren = await db.select({
        id: children.id, name: children.name, avatarUrl: children.avatarUrl,
        schoolName: children.schoolName, governorate: children.governorate,
        totalPoints: children.totalPoints,
      }).from(children)
        .where(and(ne(children.id, childId), eq(children.profilePublic, true)))
        .orderBy(desc(children.totalPoints))
        .limit(10);

      const childrenWithFollow = await Promise.all(popularChildren.map(async (c: any) => {
        const [follow] = await db.select({ id: childFollows.id }).from(childFollows)
          .where(and(
            eq(childFollows.followerId, childId),
            eq(childFollows.followingId, c.id),
            eq(childFollows.followingType, "child")
          ));
        return { ...c, isFollowing: !!follow };
      }));

      // Active schools
      const activeSchools = await db.select({
        id: schools.id, name: schools.name, nameAr: schools.nameAr,
        imageUrl: schools.imageUrl, governorate: schools.governorate,
        totalStudents: schools.totalStudents, totalTeachers: schools.totalTeachers,
      }).from(schools)
        .where(eq(schools.isActive, true))
        .orderBy(desc(schools.activityScore))
        .limit(10);

      const schoolsWithFollow = await Promise.all(activeSchools.map(async (s: any) => {
        const [follow] = await db.select({ id: childFollows.id }).from(childFollows)
          .where(and(
            eq(childFollows.followerId, childId),
            eq(childFollows.followingId, s.id),
            eq(childFollows.followingType, "school")
          ));
        return { ...s, isFollowing: !!follow };
      }));

      // Active teachers
      const activeTeachers = await db.select({
        id: schoolTeachers.id, name: schoolTeachers.name, avatarUrl: schoolTeachers.avatarUrl,
        subject: schoolTeachers.subject, bio: schoolTeachers.bio,
      }).from(schoolTeachers)
        .where(eq(schoolTeachers.isActive, true))
        .orderBy(desc(schoolTeachers.activityScore))
        .limit(10);

      const teachersWithFollow = await Promise.all(activeTeachers.map(async (t: any) => {
        const [school] = await db.select({ name: schools.name, nameAr: schools.nameAr })
          .from(schools).where(eq(schools.id, sql`(SELECT school_id FROM school_teachers WHERE id = ${t.id})`));
        const [follow] = await db.select({ id: childFollows.id }).from(childFollows)
          .where(and(
            eq(childFollows.followerId, childId),
            eq(childFollows.followingId, t.id),
            eq(childFollows.followingType, "teacher")
          ));
        return { ...t, schoolName: school?.name || null, schoolNameAr: school?.nameAr || null, isFollowing: !!follow };
      }));

      res.json(successResponse({
        children: childrenWithFollow,
        schools: schoolsWithFollow,
        teachers: teachersWithFollow,
      }));
    } catch (error: any) {
      console.error("Discover error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Discover failed"));
    }
  });

  // ====================================================
  // ===== CHILD POSTS SYSTEM (منشورات الأطفال) =====
  // ====================================================

  // Create a post
  app.post("/api/child/posts", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const { content, mediaUrls, mediaTypes } = req.body;
      if (!content || typeof content !== "string" || content.trim().length < 1) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Content is required"));
      }
      if (content.length > 2000) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Content too long (max 2000)"));
      }
      const [post] = await db.insert(childPosts).values({
        childId,
        content: content.trim(),
        mediaUrls: Array.isArray(mediaUrls) ? mediaUrls.slice(0, 5) : [],
        mediaTypes: Array.isArray(mediaTypes) ? mediaTypes.slice(0, 5) : [],
      }).returning();

      // Detect game share and notify related people
      if (content.includes("###GAME_SHARE###")) {
        try {
          const jsonMatch = content.match(/###GAME_SHARE###([\s\S]*?)###END_GAME_SHARE###/);
          let gameData: { gameName?: string; score?: number; stars?: number } = {};
          if (jsonMatch) {
            try { gameData = JSON.parse(jsonMatch[1]); } catch { }
          }

          // Get child info
          const [childInfo] = await db.select({ name: children.name }).from(children).where(eq(children.id, childId));
          const childName = childInfo?.name || "طفل";
          const gameName = gameData.gameName || "لعبة";
          const score = gameData.score ?? 0;
          const stars = gameData.stars ?? 0;
          const starsEmoji = "⭐".repeat(Math.min(stars, 5));

          // 1) Notify parent(s) of this child
          const parentLinks = await db
            .select({ parentId: parentChild.parentId })
            .from(parentChild)
            .where(eq(parentChild.childId, childId));

          for (const link of parentLinks) {
            createNotification({
              parentId: link.parentId,
              type: NOTIFICATION_TYPES.GAME_SHARED,
              title: `🎮 ${childName} شارك نتيجة لعبة`,
              message: `${childName} حقق ${score} نقطة ${starsEmoji} في ${gameName}!`,
              style: NOTIFICATION_STYLES.TOAST,
              priority: NOTIFICATION_PRIORITIES.NORMAL,
              soundAlert: true,
              relatedId: post.id,
              ctaAction: "view_post",
              ctaTarget: `/child-profile/${childId}`,
              metadata: { childId, childName, gameName, score, stars, postId: post.id },
            }).catch(err => console.error("Game share notify parent error:", err));
          }

          // 2) Notify followers (other children who follow this child)
          const followers = await db
            .select({ followerId: childFollows.followerId })
            .from(childFollows)
            .where(and(
              eq(childFollows.followingId, childId),
              eq(childFollows.followingType, "child")
            ));

          for (const f of followers) {
            createNotification({
              childId: f.followerId,
              type: NOTIFICATION_TYPES.GAME_SHARED,
              title: `🎮 ${childName} شارك نتيجة`,
              message: `${childName} حقق ${score} نقطة ${starsEmoji} في ${gameName}!`,
              style: NOTIFICATION_STYLES.TOAST,
              priority: NOTIFICATION_PRIORITIES.NORMAL,
              relatedId: post.id,
              ctaAction: "view_post",
              ctaTarget: `/child-profile/${childId}`,
              metadata: { childId, childName, gameName, score, stars, postId: post.id },
            }).catch(err => console.error("Game share notify follower error:", err));
          }

          // 3) Notify friends (accepted friendships)
          const friendships = await db
            .select({
              requesterId: childFriendships.requesterId,
              addresseeId: childFriendships.addresseeId,
            })
            .from(childFriendships)
            .where(and(
              or(
                eq(childFriendships.requesterId, childId),
                eq(childFriendships.addresseeId, childId)
              ),
              eq(childFriendships.status, "accepted")
            ));

          const followerIds = new Set(followers.map((f: any) => f.followerId));
          for (const fr of friendships) {
            const friendId = fr.requesterId === childId ? fr.addresseeId : fr.requesterId;
            if (followerIds.has(friendId)) continue; // skip if already notified as follower
            createNotification({
              childId: friendId,
              type: NOTIFICATION_TYPES.GAME_SHARED,
              title: `🎮 ${childName} شارك نتيجة`,
              message: `صديقك ${childName} حقق ${score} نقطة ${starsEmoji} في ${gameName}!`,
              style: NOTIFICATION_STYLES.TOAST,
              priority: NOTIFICATION_PRIORITIES.NORMAL,
              relatedId: post.id,
              ctaAction: "view_post",
              ctaTarget: `/child-profile/${childId}`,
              metadata: { childId, childName, gameName, score, stars, postId: post.id },
            }).catch(err => console.error("Game share notify friend error:", err));
          }
        } catch (notifErr) {
          // Non-blocking: don't fail the post creation if notifications fail
          console.error("Game share notification error:", notifErr);
        }
      }

      res.json({ success: true, data: post });
    } catch (error: any) {
      console.error("Create child post error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to create post"));
    }
  });

  // Upload post media
  app.post("/api/child/posts/media", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      if (!childId) return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, "Not authorized"));

      const multer = (await import("multer")).default;
      const path = await import("path");
      const fs = await import("fs");
      const uploadDir = path.resolve(process.cwd(), "uploads", "child-posts");
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

      const storage_m = multer.diskStorage({
        destination: (_req: any, _file: any, cb: any) => cb(null, uploadDir),
        filename: (_req: any, file: any, cb: any) => cb(null, `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${path.extname(file.originalname)}`),
      });
      const upload = multer({
        storage: storage_m, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: (_req: any, file: any, cb: any) => {
          if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) cb(null, true);
          else cb(new Error("Only images and videos allowed"));
        }
      }).array("media", 5);

      upload(req, res, (err: any) => {
        if (err) return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, err.message));
        const files = (req as any).files as any[];
        if (!files || files.length === 0) return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "No files uploaded"));
        const urls = files.map((f: any) => `/uploads/child-posts/${f.filename}`);
        const types = files.map((f: any) => f.mimetype.startsWith("video/") ? "video" : "image");
        res.json({ success: true, data: { urls, types } });
      });
    } catch (error: any) {
      console.error("Upload post media error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Upload failed"));
    }
  });

  // Get own posts
  app.get("/api/child/posts", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const posts = await db.select().from(childPosts)
        .where(and(eq(childPosts.childId, childId), eq(childPosts.isActive, true)))
        .orderBy(desc(childPosts.isPinned), desc(childPosts.createdAt));

      const child = await db.select({ name: children.name, avatarUrl: children.avatarUrl })
        .from(children).where(eq(children.id, childId));

      const postsWithAuthor = posts.map((p: any) => ({
        ...p,
        authorName: child[0]?.name || "",
        authorAvatar: child[0]?.avatarUrl || null,
      }));

      res.json({ success: true, data: postsWithAuthor });
    } catch (error: any) {
      console.error("Get child posts error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to get posts"));
    }
  });

  // Get a child's posts by childId (public for friends/followers)
  app.get("/api/child/posts/:childId", authMiddleware, async (req: any, res) => {
    try {
      const targetChildId = req.params.childId;
      const posts = await db.select().from(childPosts)
        .where(and(eq(childPosts.childId, targetChildId), eq(childPosts.isActive, true)))
        .orderBy(desc(childPosts.isPinned), desc(childPosts.createdAt));

      const child = await db.select({ name: children.name, avatarUrl: children.avatarUrl })
        .from(children).where(eq(children.id, targetChildId));

      const postsWithAuthor = posts.map((p: any) => ({
        ...p,
        authorName: child[0]?.name || "",
        authorAvatar: child[0]?.avatarUrl || null,
      }));

      res.json({ success: true, data: postsWithAuthor });
    } catch (error: any) {
      console.error("Get child posts by id error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to get posts"));
    }
  });

  // Delete own post
  app.delete("/api/child/posts/:postId", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const { postId } = req.params;
      const [post] = await db.select().from(childPosts)
        .where(and(eq(childPosts.id, postId), eq(childPosts.childId, childId)));
      if (!post) return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Post not found"));

      await db.update(childPosts).set({ isActive: false }).where(eq(childPosts.id, postId));
      res.json({ success: true, message: "Post deleted" });
    } catch (error: any) {
      console.error("Delete child post error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to delete post"));
    }
  });

  // Bulk check liked posts
  app.post("/api/child/posts/check-likes", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const { postIds } = req.body;
      if (!Array.isArray(postIds) || postIds.length === 0) {
        return res.json({ success: true, data: {} });
      }
      // Sanitize postIds to strings and use parameterized inArray (prevents SQL injection)
      const safePostIds = postIds.map((id: any) => String(id)).slice(0, 200);
      const likes = await db.select({ postId: childPostLikes.postId }).from(childPostLikes)
        .where(and(eq(childPostLikes.childId, childId), inArray(childPostLikes.postId, safePostIds)));
      const likedMap: Record<string, boolean> = {};
      likes.forEach((l: any) => { likedMap[l.postId] = true; });
      res.json({ success: true, data: likedMap });
    } catch (error: any) {
      console.error("Check likes error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to check likes"));
    }
  });

  // Like / unlike a post
  app.post("/api/child/posts/:postId/like", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const { postId } = req.params;

      const [existingLike] = await db.select().from(childPostLikes)
        .where(and(eq(childPostLikes.postId, postId), eq(childPostLikes.childId, childId)));

      let liked: boolean;
      if (existingLike) {
        await db.delete(childPostLikes).where(eq(childPostLikes.id, existingLike.id));
        await db.update(childPosts).set({ likesCount: sql`GREATEST(likes_count - 1, 0)` }).where(eq(childPosts.id, postId));
        liked = false;
      } else {
        await db.insert(childPostLikes).values({ postId, childId });
        await db.update(childPosts).set({ likesCount: sql`likes_count + 1` }).where(eq(childPosts.id, postId));
        liked = true;
      }

      const [updated] = await db.select({ likesCount: childPosts.likesCount }).from(childPosts).where(eq(childPosts.id, postId));
      res.json({ success: true, liked, likesCount: updated?.likesCount || 0 });
    } catch (error: any) {
      console.error("Like post error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to like post"));
    }
  });

  // Get post comments
  app.get("/api/child/posts/:postId/comments", authMiddleware, async (req: any, res) => {
    try {
      const { postId } = req.params;
      const comments = await db.select().from(childPostComments)
        .where(and(eq(childPostComments.postId, postId), eq(childPostComments.isActive, true)))
        .orderBy(desc(childPostComments.createdAt));
      res.json({ success: true, data: comments });
    } catch (error: any) {
      console.error("Get comments error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to get comments"));
    }
  });

  // Add comment to a post
  app.post("/api/child/posts/:postId/comment", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const { postId } = req.params;
      const { content } = req.body;
      if (!content || typeof content !== "string" || content.trim().length < 1) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Comment content is required"));
      }
      if (content.length > 500) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Comment too long (max 500)"));
      }

      const [child] = await db.select({ name: children.name, avatarUrl: children.avatarUrl })
        .from(children).where(eq(children.id, childId));

      const [comment] = await db.insert(childPostComments).values({
        postId,
        childId,
        authorName: child?.name || "طفل",
        authorAvatar: child?.avatarUrl || null,
        content: content.trim(),
      }).returning();

      await db.update(childPosts).set({ commentsCount: sql`comments_count + 1` }).where(eq(childPosts.id, postId));
      res.json({ success: true, data: comment });
    } catch (error: any) {
      console.error("Add comment error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to add comment"));
    }
  });

  // ===== Screen Time =====

  app.get("/api/child/screen-time-status", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const today = new Date().toISOString().split("T")[0];

      const [settings] = await db.select().from(screenTimeSettings)
        .where(eq(screenTimeSettings.childId, childId));

      const [usage] = await db.select().from(childDailyUsage)
        .where(and(eq(childDailyUsage.childId, childId), eq(childDailyUsage.date, today)));

      const isEnabled = settings?.isEnabled ?? false;
      const dailyLimit = settings?.dailyLimitMinutes ?? 120;
      const usedMinutes = usage?.totalMinutes ?? 0;
      const remainingMinutes = Math.max(0, dailyLimit - usedMinutes);
      const isLimitReached = isEnabled && usedMinutes >= dailyLimit;

      // Check time window
      let isWithinAllowedTime = true;
      if (isEnabled && settings?.allowedStartTime && settings?.allowedEndTime) {
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        isWithinAllowedTime = currentTime >= settings.allowedStartTime && currentTime <= settings.allowedEndTime;
      }

      res.json({
        success: true,
        data: {
          isEnabled,
          dailyLimitMinutes: dailyLimit,
          usedMinutes,
          remainingMinutes,
          isLimitReached,
          isWithinAllowedTime,
          allowedStartTime: settings?.allowedStartTime || "08:00",
          allowedEndTime: settings?.allowedEndTime || "20:00",
        },
      });
    } catch (error: any) {
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to get screen time status"));
    }
  });

  app.post("/api/child/screen-time-heartbeat", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const today = new Date().toISOString().split("T")[0];
      const incrementMinutes = Math.min(5, Math.max(1, Number(req.body?.minutes) || 1));

      const [existing] = await db.select().from(childDailyUsage)
        .where(and(eq(childDailyUsage.childId, childId), eq(childDailyUsage.date, today)));

      if (existing) {
        await db.update(childDailyUsage).set({
          totalMinutes: existing.totalMinutes + incrementMinutes,
          sessionsCount: existing.sessionsCount + 1,
          lastActivityAt: new Date(),
          updatedAt: new Date(),
        }).where(eq(childDailyUsage.id, existing.id));
      } else {
        await db.insert(childDailyUsage).values({
          childId,
          date: today,
          totalMinutes: incrementMinutes,
          sessionsCount: 1,
          lastActivityAt: new Date(),
        });
      }

      // Check limit
      const [settings] = await db.select().from(screenTimeSettings)
        .where(eq(screenTimeSettings.childId, childId));
      const dailyLimit = settings?.dailyLimitMinutes ?? 120;
      const usedNow = (existing?.totalMinutes ?? 0) + incrementMinutes;
      const isLimitReached = settings?.isEnabled && usedNow >= dailyLimit;

      res.json({
        success: true,
        data: {
          usedMinutes: usedNow,
          remainingMinutes: Math.max(0, dailyLimit - usedNow),
          isLimitReached: !!isLimitReached,
        },
      });
    } catch (error: any) {
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to update screen time"));
    }
  });

}
