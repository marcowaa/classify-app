import type { Express } from "express";
import { z } from "zod";
import { createHash } from "node:crypto";
import { storage } from "../storage";
import { successResponse, errorResponse, ErrorCode } from "../utils/apiResponse";
import { validateBody } from "../validators";
import {
  updateProfileSchema,
  changePasswordSchema,
  deleteAccountSchema,
  roleInterestRequestSchema,
  depositSchema,
  createTaskSchema,
  createProductSchema,
  updateProductSchema,
  storePurchaseSchema,
  checkoutPreviewSchema,
  checkoutConfirmSchema,
  assignProductToChildSchema,
  requestShippingSchema,
  sendGiftSchema,
  revokeGiftSchema,
  teacherAssignmentSchema,
  helpChatMessageSchema,
  respondLoginSchema,
  updateChildGamesSchema,
  createPostSchema,
  checkLikesSchema,
  commentSchema,
  socialLinksSchema,
  pushSubscriptionSchema,
  notificationPreferencesSchema,
  screenTimeSchema,
  createTaskFromTemplateSchema,
  createCustomTaskSchema,
  createAndSendTaskSchema,
  sendTemplateTaskSchema,
  scheduledTaskSchema,
  scheduledSessionSchema,
} from "../validators/parentSchemas";
import { ensureWallet } from "../utils/walletHelper";
import { trackOtpEvent } from "../utils/otpMonitoring";
import {
  parents,
  parentSocialIdentities,
  otpCodes,
  children,
  parentChild,
  tasks,
  taskResults,
  products,
  orders,
  parentWallet,
  paymentMethods,
  deposits,
  googlePlayPurchases,
  notifications,
  childGifts,
  childEvents,
  subjects,
  templateTasks,
  appSettings,
  seoSettings,
  supportSettings,
  tasksSettings,
  outboxEvents,
  schools,
  schoolEnrollments,
  childSchoolAssignment,
  teacherAssignmentRequests,
  teacherAssignmentRequestChildren,
  teacherChildPermissions,
  taskHelpRequests,
  taskHelpMessages,
  teacherHelpSessionPayments,
  schoolTeachers,
} from "../../shared/schema";
import {
  parentPurchases,
  parentPurchaseItems,
  parentOwnedProducts,
  childAssignedProducts,
  shippingRequests,
  entitlements,
  gifts,
  activityLog,
  scheduledTasks,
  profitTransactions,
  parentNotifications,
  childPurchaseRequests,
  childLoginRequests,
  libraryProducts,
  libraryOrders,
  libraryBalances,
  libraries,
  libraryDailySales,
  libraryActivityLogs,
  libraryReferralSettings,
  libraryReturnRequests,
  flashGames,
  childGameAssignments,
  gamePlayHistory,
  childGrowthTrees,
  parentPosts,
  parentPostComments,
  parentPostLikes,
  scheduledSessions,
  scheduledSessionTasks,
  parentPushSubscriptions,
  parentNotificationPreferences,
  screenTimeSettings,
  childDailyUsage,
  parentAuditLogs,
  taskCreateIdempotency,
  parentQuickTasks,
  parentQuickTaskCompletions,
  parentTeacherConversations,
  parentTeacherMessages,
  parentParentSync,
  parentStickers,
  parentStickerUsages,
} from "../../shared/schema";
import jwt from "jsonwebtoken";
import { JWT_SECRET, authMiddleware, requireLinkedChildForParentMonetization } from "./middleware";
import { createNotification, notifyAllAdmins } from "../notifications";
import { getVapidPublicKey } from "../services/webPushService";
import { emitGiftEvent } from "../giftEvents";
import { eq, and, sql, isNull, inArray, or, desc, gte, count } from "drizzle-orm";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { applyPointsDelta } from "../services/pointsService";
import { monitorDepositCreation } from "../services/riskMonitor";
import { activateOnLoginSessions, resumePausedSessions } from "../services/scheduledSessionService";
import {
  compareOTP,
  validateExpiry,
  incrementAttemptsAtomic,
  blockOTP,
  MAX_ATTEMPTS,
  markVerifiedAtomic,
} from "../services/otpService";
import { NOTIFICATION_TYPES, NOTIFICATION_STYLES, NOTIFICATION_PRIORITIES } from "../../shared/notificationTypes";
import { createPresignedUpload, finalizeUpload, resolveUploadProxyTargetByObjectPath } from "../services/uploadService";
import { finalizeUploadSchema } from "../../shared/media";
import {
  depositLimiter,
  sensitiveParentLimiter,
  screenTimeLimiter,
  teacherAssignmentLimiter,
  uploadProxyLimiter,
  walletLimiter,
} from "../utils/rateLimiters";
import { logParentAction } from "../utils/auditLog";
import { sseManager } from "../utils/sseManager";
import {
  awardParentQuickTaskIfQualified,
  ensureParentQuickTasksSeeded,
  isParentQuickVerificationKey,
  verifyParentQuickTask,
} from "../services/parentQuickTasksService";
import {
  filterPaymentMethodsByCountry,
  resolveParentCountryCode,
  resolveRequestCountryCode,
} from "../utils/paymentCountry";
import {
  getGooglePlayMonetizationPolicy,
} from "../services/googlePlayMonetizationPolicy";
import {
  acknowledgeGooglePlayProductPurchase,
  buildGooglePlayObfuscatedAccountId,
  consumeGooglePlayProductPurchase,
  getGooglePlayWalletProducts,
  resolveGooglePlayPackageName,
  verifyGooglePlayProductPurchase,
} from "../services/payments/googlePlayBillingService";

const db = storage.db;
const HELP_AUTO_ASSIGN_TIMEOUT_SECONDS = 60;
const HELP_FIRST_RESPONSE_SLA_SECONDS = Number(process.env.HELP_FIRST_RESPONSE_SLA_SECONDS || "120");
const TASK_CREATE_IDEMPOTENCY_WINDOW_MS = Math.max(5000, Number(process.env.TASK_CREATE_IDEMPOTENCY_WINDOW_MS || "45000"));

type PaymentCategory = "manual" | "egyptian_gateways" | "global" | "google";

const PAYMENT_CATEGORY_TYPES: Record<PaymentCategory, Set<string>> = {
  manual: new Set([
    "bank_transfer",
    "vodafone_cash",
    "orange_money",
    "etisalat_cash",
    "we_pay",
    "instapay",
    "mobile_wallet",
  ]),
  egyptian_gateways: new Set([
    "paymob",
    "paysky",
    "fawry",
    "aman",
    "masary",
    "bee",
    "khales",
    "valu",
    "sympl",
    "forsa",
    "contact_nowpay",
    "meeza",
    "nbe_accept",
    "banque_misr_gateway",
    "cib_accept",
  ]),
  global: new Set([
    "credit_card",
    "paypal",
    "stripe",
    "tabby",
    "tamara",
    "mada",
    "apple_pay",
    "stc_pay",
    "other",
  ]),
  google: new Set(["google_pay"]),
};

function resolvePaymentCategory(method: any): PaymentCategory {
  const category = method?.gatewayConfig?.paymentCategory;
  if (category === "manual" || category === "egyptian_gateways" || category === "global" || category === "google") {
    return category;
  }

  const type = String(method?.type || "");
  if (PAYMENT_CATEGORY_TYPES.google.has(type)) return "google";
  if (PAYMENT_CATEGORY_TYPES.manual.has(type)) return "manual";
  if (PAYMENT_CATEGORY_TYPES.egyptian_gateways.has(type)) return "egyptian_gateways";
  return "global";
}

function normalizePaymentVisibility(raw: any): Record<PaymentCategory, boolean> {
  const value = raw && typeof raw === "object" ? raw : {};
  return {
    manual: value.manual !== false,
    egyptian_gateways: value.egyptian_gateways !== false,
    global: value.global !== false,
    google: value.google !== false,
  };
}

const createTasksBulkSchema = z.object({
  mode: z.enum(["all_or_nothing", "partial"]).optional().default("all_or_nothing"),
  tasks: z.array(createTaskSchema).min(1).max(20),
});

const completeGooglePlayPurchaseSchema = z.object({
  productId: z.string().trim().min(1).max(255),
  purchaseToken: z.string().trim().min(10).max(4096),
  packageName: z.string().trim().min(3).max(255).optional(),
  orderId: z.string().trim().min(3).max(500).optional(),
});

const IDEMPOTENCY_STATUS_PROCESSING = "processing";
const IDEMPOTENCY_STATUS_COMPLETED = "completed";
const IDEMPOTENCY_STATUS_FAILED = "failed";

function normalizeIdempotencyKey(raw: unknown): string {
  const value = String(raw || "").trim();
  if (!value) return "";
  return value.replace(/[^a-zA-Z0-9:_\-.]/g, "").slice(0, 128);
}

function extractIdempotencyKey(req: any): string {
  return normalizeIdempotencyKey(
    req.headers?.["idempotency-key"] || req.headers?.["x-idempotency-key"] || req.body?.idempotencyKey
  );
}

function normalizeQuestionForFingerprint(question: string): string {
  return String(question || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function normalizeAnswersForFingerprint(answers: any[]): Array<{ text: string; isCorrect: boolean }> {
  return (answers || []).map((answer: any) => {
    if (typeof answer === "string") {
      return { text: answer.trim(), isCorrect: false };
    }
    return {
      text: String(answer?.text || "").trim(),
      isCorrect: !!answer?.isCorrect,
    };
  });
}

function buildTaskCreateFingerprint(input: {
  parentId: string;
  childId: string;
  subjectId?: string | null;
  question: string;
  answers: any[];
  pointsReward: number;
  imageUrl?: string | null;
  gifUrl?: string | null;
}) {
  const canonical = JSON.stringify({
    parentId: input.parentId,
    childId: input.childId,
    subjectId: input.subjectId || null,
    question: normalizeQuestionForFingerprint(input.question),
    answers: normalizeAnswersForFingerprint(input.answers),
    pointsReward: Number(input.pointsReward || 0),
    imageUrl: input.imageUrl || null,
    gifUrl: input.gifUrl || null,
  });

  return createHash("sha256").update(canonical).digest("hex");
}

function stableStringify(value: any): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function buildRequestHash(payload: Record<string, any>): string {
  return createHash("sha256").update(stableStringify(payload)).digest("hex");
}

function isLikelyNativeAndroidClient(req: any): boolean {
  const platformHeader = String(req.headers?.["x-client-platform"] || "").trim().toLowerCase();
  if (platformHeader === "android" || platformHeader === "android-native") {
    return true;
  }

  const userAgent = String(req.headers?.["user-agent"] || "").toLowerCase();
  if (!userAgent.includes("android")) {
    return false;
  }

  return userAgent.includes("wv") || userAgent.includes("capacitor") || userAgent.includes("crosswalk");
}

type IdempotencyClaimResult =
  | { status: "new" }
  | { status: "completed"; responsePayload: Record<string, any> | null }
  | { status: "processing" }
  | { status: "conflict" };

async function claimTaskCreateIdempotency(params: {
  parentId: string;
  endpoint: string;
  idempotencyKey: string;
  requestHash: string;
}): Promise<IdempotencyClaimResult> {
  const { parentId, endpoint, idempotencyKey, requestHash } = params;

  const findRecord = async () => {
    const rows = await db
      .select()
      .from(taskCreateIdempotency)
      .where(and(
        eq(taskCreateIdempotency.parentId, parentId),
        eq(taskCreateIdempotency.endpoint, endpoint),
        eq(taskCreateIdempotency.idempotencyKey, idempotencyKey)
      ))
      .limit(1);
    return rows[0] || null;
  };

  const existing = await findRecord();
  if (existing) {
    if (existing.requestHash !== requestHash) return { status: "conflict" };
    if (existing.status === IDEMPOTENCY_STATUS_COMPLETED) {
      return {
        status: "completed",
        responsePayload: (existing.responsePayload as Record<string, any> | null) || null,
      };
    }
    if (existing.status === IDEMPOTENCY_STATUS_FAILED) {
      await db
        .update(taskCreateIdempotency)
        .set({
          status: IDEMPOTENCY_STATUS_PROCESSING,
          lastError: null,
          updatedAt: new Date(),
        })
        .where(eq(taskCreateIdempotency.id, existing.id));
      return { status: "new" };
    }
    return { status: "processing" };
  }

  const inserted = await db
    .insert(taskCreateIdempotency)
    .values({
      parentId,
      endpoint,
      idempotencyKey,
      requestHash,
      status: IDEMPOTENCY_STATUS_PROCESSING,
      responsePayload: null,
    })
    .onConflictDoNothing()
    .returning({ id: taskCreateIdempotency.id });

  if (inserted[0]) return { status: "new" };

  const afterConflict = await findRecord();
  if (!afterConflict) return { status: "processing" };
  if (afterConflict.requestHash !== requestHash) return { status: "conflict" };
  if (afterConflict.status === IDEMPOTENCY_STATUS_COMPLETED) {
    return {
      status: "completed",
      responsePayload: (afterConflict.responsePayload as Record<string, any> | null) || null,
    };
  }
  return { status: "processing" };
}

async function completeTaskCreateIdempotency(params: {
  parentId: string;
  endpoint: string;
  idempotencyKey: string;
  responsePayload: Record<string, any>;
}) {
  const { parentId, endpoint, idempotencyKey, responsePayload } = params;
  await db
    .update(taskCreateIdempotency)
    .set({
      status: IDEMPOTENCY_STATUS_COMPLETED,
      responsePayload,
      lastError: null,
      updatedAt: new Date(),
    })
    .where(and(
      eq(taskCreateIdempotency.parentId, parentId),
      eq(taskCreateIdempotency.endpoint, endpoint),
      eq(taskCreateIdempotency.idempotencyKey, idempotencyKey)
    ));
}

async function failTaskCreateIdempotency(params: {
  parentId: string;
  endpoint: string;
  idempotencyKey: string;
  errorMessage: string;
}) {
  const { parentId, endpoint, idempotencyKey, errorMessage } = params;
  await db
    .update(taskCreateIdempotency)
    .set({
      status: IDEMPOTENCY_STATUS_FAILED,
      lastError: errorMessage.slice(0, 500),
      updatedAt: new Date(),
    })
    .where(and(
      eq(taskCreateIdempotency.parentId, parentId),
      eq(taskCreateIdempotency.endpoint, endpoint),
      eq(taskCreateIdempotency.idempotencyKey, idempotencyKey)
    ));
}

async function findRecentEquivalentTask(params: {
  parentId: string;
  childId: string;
  question: string;
  pointsReward: number;
  subjectId?: string | null;
  imageUrl?: string | null;
  gifUrl?: string | null;
  answers: any[];
}) {
  const cutoff = new Date(Date.now() - TASK_CREATE_IDEMPOTENCY_WINDOW_MS);
  const recent = await db
    .select({
      id: tasks.id,
      parentId: tasks.parentId,
      childId: tasks.childId,
      subjectId: tasks.subjectId,
      question: tasks.question,
      pointsReward: tasks.pointsReward,
      answers: tasks.answers,
      imageUrl: tasks.imageUrl,
      gifUrl: tasks.gifUrl,
      createdAt: tasks.createdAt,
    })
    .from(tasks)
    .where(and(
      eq(tasks.parentId, params.parentId),
      eq(tasks.childId, params.childId),
      eq(tasks.question, params.question),
      eq(tasks.pointsReward, params.pointsReward),
      gte(tasks.createdAt, cutoff)
    ))
    .orderBy(desc(tasks.createdAt))
    .limit(5);

  const incomingFingerprint = buildTaskCreateFingerprint({
    ...params,
    subjectId: params.subjectId || null,
    imageUrl: params.imageUrl || null,
    gifUrl: params.gifUrl || null,
  });

  for (const row of recent) {
    const rowFingerprint = buildTaskCreateFingerprint({
      parentId: row.parentId || "",
      childId: row.childId,
      subjectId: row.subjectId || null,
      question: row.question,
      answers: Array.isArray(row.answers) ? row.answers : [],
      pointsReward: Number(row.pointsReward || 0),
      imageUrl: row.imageUrl || null,
      gifUrl: row.gifUrl || null,
    });

    if (rowFingerprint === incomingFingerprint) {
      return row;
    }
  }

  return null;
}

// Helper function to normalize answers - ensures each answer has an id
function normalizeAnswersForStorage(answers: any, correctAnswerIndex: number = 0): any[] {
  if (!answers || !Array.isArray(answers)) return [];

  const normalizeText = (value: unknown): string => {
    return typeof value === "string" ? value.trim() : "";
  };

  const normalizeMedia = (value: any) => {
    if (!value || typeof value !== "object") return undefined;

    const url = normalizeText(value.url);
    if (!url) return undefined;

    return {
      objectPath: typeof value.objectPath === "string" ? value.objectPath : undefined,
      url,
      mimeType: typeof value.mimeType === "string" ? value.mimeType : undefined,
      size: typeof value.size === "number" ? value.size : undefined,
      width: typeof value.width === "number" ? value.width : undefined,
      height: typeof value.height === "number" ? value.height : undefined,
      purpose: typeof value.purpose === "string" ? value.purpose : undefined,
      uploadedByType: ["admin", "parent", "teacher", "child"].includes(value.uploadedByType)
        ? value.uploadedByType
        : undefined,
      uploadedById: typeof value.uploadedById === "string" ? value.uploadedById : undefined,
      createdAt: typeof value.createdAt === "string" ? value.createdAt : undefined,
    };
  };

  const hasAnswerContent = (answer: { text?: string; imageUrl?: string; media?: any }) => {
    return !!normalizeText(answer.text) || !!normalizeText(answer.imageUrl) || !!answer.media?.url;
  };

  return answers.map((answer: any, index: number) => {
    const id = `answer-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`;

    // If answer is a string, convert to object
    if (typeof answer === 'string') {
      const text = normalizeText(answer);
      if (!text) return null;
      return {
        id,
        text,
        isCorrect: index === correctAnswerIndex
      };
    }
    // If answer is an object, ensure it has an id
    if (typeof answer === 'object' && answer !== null) {
      const normalizedMedia = normalizeMedia(answer.media);
      const normalizedText = normalizeText(answer.text);
      const normalizedImageUrl = normalizeText(answer.imageUrl);

      if (!hasAnswerContent({ text: normalizedText, imageUrl: normalizedImageUrl, media: normalizedMedia })) {
        return null;
      }

      return {
        id: answer.id || id,
        text: normalizedText,
        isCorrect: answer.isCorrect !== undefined ? !!answer.isCorrect : index === correctAnswerIndex,
        imageUrl: normalizedImageUrl || undefined,
        media: normalizedMedia?.url ? normalizedMedia : undefined,
        stickerId: typeof answer.stickerId === "string" ? answer.stickerId : undefined,
        stickerVariant: ["full", "circle", "rounded", "diamond"].includes(answer.stickerVariant)
          ? answer.stickerVariant
          : undefined,
      };
    }
    const text = normalizeText(String(answer));
    if (!text) return null;
    return { id, text, isCorrect: index === correctAnswerIndex };
  }).filter((answer) => !!answer);
}

async function trackStickerUsagesForAnswers({
  answers,
  usedByParentId,
  taskId,
  templateTaskId,
}: {
  answers: any[];
  usedByParentId: string;
  taskId?: string;
  templateTaskId?: string;
}) {
  const stickerIds = Array.from(new Set((answers || [])
    .map((a: any) => (typeof a?.stickerId === "string" ? a.stickerId : ""))
    .filter(Boolean)));

  if (!stickerIds.length) return;

  const stickers = await db
    .select({ id: parentStickers.id, parentId: parentStickers.parentId })
    .from(parentStickers)
    .where(inArray(parentStickers.id, stickerIds));

  for (const sticker of stickers) {
    await db
      .insert(parentStickerUsages)
      .values({
        stickerId: sticker.id,
        ownerParentId: sticker.parentId,
        usedByParentId,
        taskId: taskId || null,
        templateTaskId: templateTaskId || null,
      })
      .onConflictDoNothing();
  }
}

async function trackTaskCreationMetric(
  parentId: string,
  action: string,
  details: Record<string, any>,
  req?: any
) {
  await logParentAction(parentId, action, "task_metric", null, details, req);
}

function isGeneratedPhoneEmail(email: unknown): boolean {
  const normalized = String(email || "").trim().toLowerCase();
  return Boolean(normalized) && (normalized.endsWith("@phone.local") || normalized.startsWith("phone_"));
}

function shouldReplaceParentName(currentName: unknown, currentEmail: unknown): boolean {
  const normalizedName = String(currentName || "").trim();
  if (!normalizedName) return true;

  const loweredName = normalizedName.toLowerCase();
  if (
    loweredName === "parent"
    || loweredName === "parent account"
    || loweredName === "account"
    || loweredName === "user"
    || loweredName === "ولي الأمر"
    || loweredName.startsWith("phone_")
  ) {
    return true;
  }

  const normalizedEmail = String(currentEmail || "").trim().toLowerCase();
  if (normalizedEmail.includes("@")) {
    const prefix = normalizedEmail.split("@")[0];
    if (prefix && loweredName === prefix) {
      return true;
    }
  }

  return false;
}

async function ensureGooglePlayPaymentMethod(tx: any, methodType: string) {
  const normalizedType = String(methodType || "google_pay").trim().toLowerCase() || "google_pay";

  const existing = await tx
    .select({ id: paymentMethods.id })
    .from(paymentMethods)
    .where(and(
      isNull(paymentMethods.parentId),
      eq(paymentMethods.type, normalizedType),
      eq(paymentMethods.isActive, true)
    ))
    .limit(1);

  if (existing[0]?.id) {
    return existing[0].id;
  }

  const inserted = await tx
    .insert(paymentMethods)
    .values({
      type: normalizedType,
      displayName: "Google Play Billing",
      accountNumber: "GOOGLE_PLAY_BILLING",
      accountName: "Google Play",
      bankName: "Google",
      phoneNumber: null,
      supportedCountries: ["ALL"],
      gatewayConfig: {
        paymentCategory: "google",
        googlePlayManaged: true,
      },
      isDefault: false,
      isActive: true,
    })
    .returning({ id: paymentMethods.id });

  if (!inserted[0]?.id) {
    throw new Error("GOOGLE_PLAY_METHOD_CREATE_FAILED");
  }

  return inserted[0].id;
}

export async function registerParentRoutes(app: Express) {
  // Get Parent Info
  app.get("/api/parent/info", authMiddleware, async (req: any, res) => {
    try {
      const parent = await db.select().from(parents).where(eq(parents.id, req.user.userId)).limit(1);
      if (!parent[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Parent not found"));
      }

      const socialIdentities = await db
        .select({
          provider: parentSocialIdentities.provider,
          email: parentSocialIdentities.email,
          name: parentSocialIdentities.name,
          avatarUrl: parentSocialIdentities.avatarUrl,
          updatedAt: parentSocialIdentities.updatedAt,
          createdAt: parentSocialIdentities.createdAt,
        })
        .from(parentSocialIdentities)
        .where(eq(parentSocialIdentities.parentId, parent[0].id))
        .orderBy(desc(parentSocialIdentities.updatedAt), desc(parentSocialIdentities.createdAt));

      const primarySocialIdentity = socialIdentities[0] || null;
      const suggestedEmailRaw = String(primarySocialIdentity?.email || "").trim().toLowerCase();
      const suggestedEmail = suggestedEmailRaw && !isGeneratedPhoneEmail(suggestedEmailRaw)
        ? suggestedEmailRaw
        : "";
      const suggestedName = String(primarySocialIdentity?.name || "").trim();

      const socialProviders = Array.from(new Set(
        socialIdentities
          .map((identity: { provider: string | null }) => String(identity.provider || "").trim().toLowerCase())
          .filter(Boolean)
      ));

      const parentEmail = String(parent[0].email || "").trim().toLowerCase();
      const generatedPhoneEmail = isGeneratedPhoneEmail(parentEmail);

      const linkedMethods: Array<"email" | "phone" | "social"> = [];
      if (parent[0].phoneNumber) linkedMethods.push("phone");
      if (parentEmail && !generatedPhoneEmail) linkedMethods.push("email");
      if (socialProviders.length > 0) linkedMethods.push("social");

      let primaryMethod: "email" | "phone" | "social" | "manual" | "unknown" = "unknown";
      if (socialProviders.length > 0) {
        primaryMethod = "social";
      } else if (generatedPhoneEmail || parent[0].phoneNumber) {
        primaryMethod = "phone";
      } else if (parentEmail) {
        primaryMethod = "email";
      }

      if (primaryMethod !== "unknown" && !linkedMethods.includes(primaryMethod as any)) {
        if (primaryMethod === "email" || primaryMethod === "phone" || primaryMethod === "social") {
          linkedMethods.unshift(primaryMethod);
        }
      }

      const { password, ...safe } = parent[0];

      res.json(successResponse({
        ...safe,
        authProfile: {
          primaryMethod,
          linkedMethods,
          socialProviders,
          generatedPhoneEmail,
          suggestedProfile: {
            name: suggestedName && shouldReplaceParentName(parent[0].name, parent[0].email) ? suggestedName : null,
            email: generatedPhoneEmail && suggestedEmail ? suggestedEmail : null,
            phoneNumber: null,
          },
        },
      }, "Parent info retrieved"));
    } catch (error: any) {
      console.error("Fetch parent info error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch parent info"));
    }
  });

  // SSE endpoint for real-time notifications
  app.get("/api/parent/events", async (req: any, res) => {
    // SSE can't send auth headers, so accept token via query param
    const token = (req.query.token as string) || req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res
        .status(401)
        .json(errorResponse(ErrorCode.UNAUTHORIZED, "Missing authentication token"));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (!decoded?.userId) {
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

      sseManager.addClient(decoded.userId, "parent", res);

      // Keep-alive ping every 30s
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

  // Get Parent's Children
  app.get("/api/parent/children", authMiddleware, async (req: any, res) => {
    try {
      const result = await db
        .select()
        .from(children)
        .innerJoin(parentChild, and(eq(parentChild.childId, children.id), eq(parentChild.parentId, req.user.userId)));

      res.json(successResponse(result.map((r: any) => r.children), "Children retrieved"));
    } catch (error: any) {
      console.error("Fetch children error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch children"));
    }
  });

  // Compatibility alias: keep docs/clients using /api/family/children working.
  app.get("/api/family/children", authMiddleware, async (req: any, res) => {
    try {
      const result = await db
        .select()
        .from(children)
        .innerJoin(parentChild, and(eq(parentChild.childId, children.id), eq(parentChild.parentId, req.user.userId)));

      return res.json(successResponse(result.map((r: any) => r.children), "Children retrieved"));
    } catch (error: any) {
      console.error("Fetch family children error:", error);
      return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch children"));
    }
  });

  // Compatibility alias: create child via /api/family/children.
  app.post("/api/family/children", authMiddleware, async (req: any, res) => {
    try {
      const schema = z.object({
        name: z.string().trim().min(2).max(100),
        birthday: z.string().optional(),
        governorate: z.string().trim().max(100).optional(),
        academicGrade: z.string().trim().max(100).optional(),
        schoolName: z.string().trim().max(200).optional(),
        hobbies: z.string().trim().max(500).optional(),
        avatarUrl: z.string().trim().max(2048).optional(),
        coverImageUrl: z.string().trim().max(2048).optional(),
        bio: z.string().trim().max(500).optional(),
      });

      const body = schema.parse(req.body || {});
      const parentId = req.user.userId;

      const insertData: Record<string, any> = {
        name: body.name,
      };

      if (body.birthday) {
        const parsedDate = new Date(body.birthday);
        if (Number.isNaN(parsedDate.getTime())) {
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid birthday format"));
        }
        insertData.birthday = parsedDate;
      }
      if (body.governorate) insertData.governorate = body.governorate;
      if (body.academicGrade) insertData.academicGrade = body.academicGrade;
      if (body.schoolName) insertData.schoolName = body.schoolName;
      if (body.hobbies) insertData.hobbies = body.hobbies;
      if (body.avatarUrl) insertData.avatarUrl = body.avatarUrl;
      if (body.coverImageUrl) insertData.coverImageUrl = body.coverImageUrl;
      if (body.bio) insertData.bio = body.bio;

      const [newChild] = await db.insert(children).values(insertData).returning();

      await db.insert(parentChild).values({
        parentId,
        childId: newChild.id,
        relationshipRole: "owner",
        linkSource: "manual",
        linkedByParentId: parentId,
      });

      await db.insert(childGrowthTrees).values({
        childId: newChild.id,
        currentStage: 1,
        totalGrowthPoints: 0,
      }).onConflictDoNothing();

      // If this parent has an active co-parent sync, mirror the new child immediately.
      const activeSyncs = await db
        .select()
        .from(parentParentSync)
        .where(
          and(
            eq(parentParentSync.primaryParentId, parentId),
            eq(parentParentSync.syncStatus, "active")
          )
        );

      for (const sync of activeSyncs) {
        await db
          .insert(parentChild)
          .values({
            parentId: sync.secondaryParentId,
            childId: newChild.id,
            relationshipRole: "co_guardian",
            linkSource: "approved_request",
            linkedByParentId: parentId,
          })
          .onConflictDoNothing();

        const currentShared = Array.isArray(sync.sharedChildren) ? sync.sharedChildren : [];
        if (!currentShared.includes(newChild.id)) {
          await db
            .update(parentParentSync)
            .set({
              sharedChildren: [...currentShared, newChild.id],
              lastSyncedAt: new Date(),
            })
            .where(eq(parentParentSync.id, sync.id));
        }

        await createNotification({
          parentId: sync.secondaryParentId,
          type: NOTIFICATION_TYPES.CHILD_LINKED,
          title: "👨‍👩‍👧 تمت مزامنة طفل جديد",
          message: `تمت إضافة ${newChild.name} تلقائيًا إلى حسابك عبر ربط الوالدين.`,
          style: NOTIFICATION_STYLES.TOAST,
          priority: NOTIFICATION_PRIORITIES.NORMAL,
          soundAlert: true,
          metadata: {
            childId: newChild.id,
            childName: newChild.name,
            source: "parent_sync_auto_share",
          },
        });
      }

      return res.status(201).json(successResponse(newChild, "Child created successfully"));
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, error.errors[0]?.message || "Invalid request body"));
      }
      console.error("Create family child error:", error);
      return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to create child"));
    }
  });

  // Compatibility alias: update child via /api/family/children/:id.
  app.put("/api/family/children/:id", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const childId = req.params.id;

      const [link] = await db
        .select()
        .from(parentChild)
        .where(and(eq(parentChild.parentId, parentId), eq(parentChild.childId, childId)));

      if (!link) {
        return res.status(403).json(errorResponse(ErrorCode.PARENT_CHILD_MISMATCH, "Child not linked to this parent"));
      }

      if (link.relationshipRole === "viewer") {
        return res.status(403).json(errorResponse(ErrorCode.PARENT_CHILD_MISMATCH, "Viewer parent cannot edit child profile"));
      }

      const schema = z.object({
        name: z.string().trim().min(2).max(100).optional(),
        birthday: z.string().optional(),
        governorate: z.string().trim().max(100).optional(),
        academicGrade: z.string().trim().max(100).optional(),
        schoolName: z.string().trim().max(200).optional(),
        hobbies: z.string().trim().max(500).optional(),
        avatarUrl: z.string().trim().max(2048).nullable().optional(),
        coverImageUrl: z.string().trim().max(2048).nullable().optional(),
        bio: z.string().trim().max(500).nullable().optional(),
      });

      const body = schema.parse(req.body || {});
      const updateData: Record<string, any> = {};

      if (body.name !== undefined) updateData.name = body.name;
      if (body.birthday !== undefined) {
        if (body.birthday === "") {
          updateData.birthday = null;
        } else {
          const parsedDate = new Date(body.birthday);
          if (Number.isNaN(parsedDate.getTime())) {
            return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid birthday format"));
          }
          updateData.birthday = parsedDate;
        }
      }
      if (body.governorate !== undefined) updateData.governorate = body.governorate || null;
      if (body.academicGrade !== undefined) updateData.academicGrade = body.academicGrade || null;
      if (body.schoolName !== undefined) updateData.schoolName = body.schoolName || null;
      if (body.hobbies !== undefined) updateData.hobbies = body.hobbies || null;
      if (body.avatarUrl !== undefined) updateData.avatarUrl = body.avatarUrl;
      if (body.coverImageUrl !== undefined) updateData.coverImageUrl = body.coverImageUrl;
      if (body.bio !== undefined) updateData.bio = body.bio;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "No fields to update"));
      }

      const [updatedChild] = await db
        .update(children)
        .set(updateData)
        .where(eq(children.id, childId))
        .returning();

      if (!updatedChild) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Child not found"));
      }

      return res.json(successResponse(updatedChild, "Child updated successfully"));
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, error.errors[0]?.message || "Invalid request body"));
      }
      console.error("Update family child error:", error);
      return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to update child"));
    }
  });

  // Compatibility alias: delete child via /api/family/children/:id.
  app.delete("/api/family/children/:id", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const childId = req.params.id;

      const [link] = await db
        .select()
        .from(parentChild)
        .where(and(eq(parentChild.parentId, parentId), eq(parentChild.childId, childId)));

      if (!link) {
        return res.status(403).json(errorResponse(ErrorCode.PARENT_CHILD_MISMATCH, "Child not linked to this parent"));
      }

      if (link.relationshipRole !== "owner") {
        return res.status(403).json(errorResponse(ErrorCode.PARENT_CHILD_MISMATCH, "Only the owner parent can delete this child"));
      }

      const deleted = await db
        .delete(children)
        .where(eq(children.id, childId))
        .returning({ id: children.id });

      if (!deleted.length) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Child not found"));
      }

      return res.json(successResponse({ deleted: true, childId }, "Child deleted successfully"));
    } catch (error: any) {
      console.error("Delete family child error:", error);
      return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to delete child"));
    }
  });

  // Get Children Status Report (for background polling) - Optimized for 5000+ concurrent users
  app.get("/api/parent/children/status", authMiddleware, async (req: any, res) => {
    try {
      const result = await db
        .select()
        .from(children)
        .innerJoin(parentChild, and(eq(parentChild.childId, children.id), eq(parentChild.parentId, req.user.userId)));

      const childrenList = result.map((r: any) => r.children);

      if (childrenList.length === 0) {
        return res.json(successResponse({
          children: [],
          timestamp: new Date().toISOString(),
          refreshInterval: 300000,
        }, "No children found"));
      }

      const childIds = childrenList.map((c: any) => c.id);

      const parentId = req.user.userId;

      // Batch query: Get all task counts in one query (scoped to parent's children AND parent's tasks)
      const taskCounts = await db
        .select({
          childId: tasks.childId,
          count: sql<number>`count(*)`
        })
        .from(tasks)
        .where(and(
          eq(tasks.parentId, parentId),
          inArray(tasks.childId, childIds),
          eq(tasks.status, "completed")
        ))
        .groupBy(tasks.childId);

      // Batch query: Get all pending gift counts in one query (scoped to parent's children AND parent's gifts)
      const giftCounts = await db
        .select({
          childId: childGifts.childId,
          count: sql<number>`count(*)`
        })
        .from(childGifts)
        .where(and(
          eq(childGifts.parentId, parentId),
          inArray(childGifts.childId, childIds),
          eq(childGifts.status, "pending")
        ))
        .groupBy(childGifts.childId);

      // Batch query: Get all notification counts in one query (scoped to child AND parent)
      // Include: system notifications (null parentId) OR notifications from this parent
      const notifCounts = await db
        .select({
          childId: notifications.childId,
          count: sql<number>`count(*)`
        })
        .from(notifications)
        .where(and(
          inArray(notifications.childId, childIds),
          or(isNull(notifications.parentId), eq(notifications.parentId, parentId))
        ))
        .groupBy(notifications.childId);

      // Create lookup maps for O(1) access
      const taskMap = new Map(taskCounts.map((t: any) => [t.childId, Number(t.count)]));
      const giftMap = new Map(giftCounts.map((g: any) => [g.childId, Number(g.count)]));
      const notifMap = new Map(notifCounts.map((n: any) => [n.childId, Number(n.count)]));

      // Batch query: Get games played count from gamePlayHistory
      const gamePlayCounts = await db
        .select({
          childId: gamePlayHistory.childId,
          count: sql<number>`count(*)`,
        })
        .from(gamePlayHistory)
        .where(inArray(gamePlayHistory.childId, childIds))
        .groupBy(gamePlayHistory.childId);

      // Today's game plays
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const gameTodayCounts = await db
        .select({
          childId: gamePlayHistory.childId,
          count: sql<number>`count(*)`,
        })
        .from(gamePlayHistory)
        .where(and(
          inArray(gamePlayHistory.childId, childIds),
          sql`${gamePlayHistory.playedAt} >= ${todayStart}`
        ))
        .groupBy(gamePlayHistory.childId);

      const gameMap = new Map(gamePlayCounts.map((g: any) => [g.childId, Number(g.count)]));
      const gameTodayMap = new Map(gameTodayCounts.map((g: any) => [g.childId, Number(g.count)]));

      const statusReports = childrenList.map((child: any) => {
        // Calculate days since joined
        const createdAt = new Date(child.createdAt || Date.now());
        const daysSinceJoined = Math.max(1, Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)));
        const points = child.totalPoints || 0;
        const pointsPerDay = Math.round(points / daysSinceJoined);

        // Determine speed level
        let speedLevel = "slow";
        if (pointsPerDay >= 50) speedLevel = "superfast";
        else if (pointsPerDay >= 30) speedLevel = "fast";
        else if (pointsPerDay >= 15) speedLevel = "moderate";

        // Determine status
        let status = "active";
        let statusMessage = "نشط";
        if (pointsPerDay < 5 && daysSinceJoined > 3) {
          status = "needs_attention";
          statusMessage = "يحتاج تشجيع";
        } else if (pointsPerDay >= 30) {
          status = "excellent";
          statusMessage = "ممتاز";
        }

        return {
          id: child.id,
          name: child.name,
          avatar: child.avatar,
          age: child.age,
          points,
          tasksCompleted: taskMap.get(child.id) || 0,
          pendingGifts: giftMap.get(child.id) || 0,
          unreadNotifications: notifMap.get(child.id) || 0,
          gamesPlayed: gameMap.get(child.id) || 0,
          gamesToday: gameTodayMap.get(child.id) || 0,
          speedLevel,
          pointsPerDay,
          daysSinceJoined,
          status,
          statusMessage,
          lastUpdate: new Date().toISOString(),
        };
      });

      res.json(successResponse({
        children: statusReports,
        timestamp: new Date().toISOString(),
        refreshInterval: 300000, // 5 minutes in ms
      }, "Children status retrieved"));
    } catch (error: any) {
      console.error("Fetch children status error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch children status"));
    }
  });

  // Update Parent Profile
  app.post("/api/parent/profile/update", authMiddleware, async (req: any, res) => {
    try {
      const v = validateBody(updateProfileSchema, req.body);
      if (!v.success) return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, v.error));
      const { name, email, phoneNumber, governorate, bio, city, avatarUrl, coverImageUrl, currentPassword } = v.data;

      const [existingParent] = await db
        .select({
          id: parents.id,
          password: parents.password,
        })
        .from(parents)
        .where(eq(parents.id, req.user.userId))
        .limit(1);

      if (!existingParent) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Parent not found"));
      }

      const updatesSensitiveFields =
        name !== undefined ||
        email !== undefined ||
        phoneNumber !== undefined ||
        governorate !== undefined ||
        bio !== undefined ||
        city !== undefined;
      const requiresPassword = updatesSensitiveFields;

      if (requiresPassword) {
        if (!currentPassword || !String(currentPassword).trim()) {
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Current password is required"));
        }

        const passwordMatch = await bcrypt.compare(String(currentPassword), existingParent.password);
        if (!passwordMatch) {
          return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, "Current password is incorrect"));
        }
      }

      const updates: any = {};
      if (name) updates.name = name;
      if (email !== undefined) updates.email = String(email || "").trim().toLowerCase();
      if (phoneNumber) updates.phoneNumber = phoneNumber;
      if (governorate !== undefined) updates.governorate = governorate || null;
      if (bio !== undefined) updates.bio = bio || null;
      if (city !== undefined) updates.city = city || null;
      if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl || null;
      if (coverImageUrl !== undefined) updates.coverImageUrl = coverImageUrl || null;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "At least one editable field is required"));
      }

      await db.update(parents).set(updates).where(eq(parents.id, req.user.userId));

      const [updatedParent] = await db
        .select({
          id: parents.id,
          name: parents.name,
          email: parents.email,
          phoneNumber: parents.phoneNumber,
          governorate: parents.governorate,
          city: parents.city,
          avatarUrl: parents.avatarUrl,
          coverImageUrl: parents.coverImageUrl,
          bio: parents.bio,
          socialLinks: parents.socialLinks,
          createdAt: parents.createdAt,
        })
        .from(parents)
        .where(eq(parents.id, req.user.userId))
        .limit(1);

      logParentAction(req.user.userId, "PROFILE_UPDATED", "profile", req.user.userId, { fields: Object.keys(updates) }, req);
      res.json(successResponse({
        updated: true,
        parent: updatedParent,
        profileRequiresPassword: true,
      }, "Profile updated"));
    } catch (error: any) {
      console.error("Update profile error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Profile update failed"));
    }
  });

  // Change Parent Password
  app.post("/api/parent/profile/change-password", authMiddleware, sensitiveParentLimiter, async (req: any, res) => {
    try {
      const v = validateBody(changePasswordSchema, req.body);
      if (!v.success) return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, v.error));
      const { oldPassword, newPassword, otpMethod } = v.data;
      const finalOtpCode = (v.data.otpCode || v.data.code || "").trim();
      const otpId = v.data.otpId;

      const parent = await db.select().from(parents).where(eq(parents.id, req.user.userId));
      if (!parent[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Parent not found"));
      }

      const passwordMatch = await bcrypt.compare(oldPassword, parent[0].password);
      if (!passwordMatch) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, "Old password is incorrect"));
      }

      if (otpMethod === "sms" && (!parent[0].phoneNumber || !parent[0].smsEnabled)) {
        return res.status(400).json(errorResponse(ErrorCode.SMS_NOT_ENABLED, "SMS OTP is not enabled for this account"));
      }

      if (otpMethod === "whatsapp" && !parent[0].phoneNumber) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "WhatsApp OTP is not available for this account"));
      }

      if (!finalOtpCode) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "OTP code is required"));
      }

      const destination = otpMethod === "email" ? parent[0].email : parent[0].phoneNumber;
      const methodCondition = otpMethod !== "email" ? eq(otpCodes.method, otpMethod) : undefined;
      const pendingCondition = or(eq(otpCodes.status, "pending"), isNull(otpCodes.status));
      let record: typeof otpCodes.$inferSelect | undefined;

      if (otpId) {
        const byId = await db
          .select()
          .from(otpCodes)
          .where(and(
            eq(otpCodes.id, otpId),
            eq(otpCodes.parentId, parent[0].id),
            eq(otpCodes.destination, destination),
            eq(otpCodes.purpose, "change_password"),
            ...(methodCondition ? [methodCondition] : []),
            pendingCondition
          ))
          .orderBy(desc(otpCodes.createdAt))
          .limit(1);
        record = byId[0];
      } else {
        const latest = await db
          .select()
          .from(otpCodes)
          .where(and(
            eq(otpCodes.parentId, parent[0].id),
            eq(otpCodes.destination, destination),
            eq(otpCodes.purpose, "change_password"),
            ...(methodCondition ? [methodCondition] : []),
            pendingCondition
          ))
          .orderBy(desc(otpCodes.createdAt))
          .limit(1);
        record = latest[0];
      }

      if (!record || !validateExpiry(record.expiresAt)) {
        if (record) {
          await db.update(otpCodes).set({ status: "expired" }).where(eq(otpCodes.id, record.id));
          trackOtpEvent("verify_failed", {
            purpose: "change_password",
            method: otpMethod,
            destination,
            parentId: parent[0].id,
            reason: "expired",
            otpId: record.id,
          });
        } else {
          trackOtpEvent("verify_failed", {
            purpose: "change_password",
            method: otpMethod,
            destination,
            parentId: parent[0].id,
            reason: "not_found",
            otpId,
          });
        }
        return res.status(400).json(errorResponse(ErrorCode.OTP_EXPIRED, "Invalid or expired OTP"));
      }

      const otpOk = await compareOTP(finalOtpCode, record.code);
      if (!otpOk) {
        const attempts = await incrementAttemptsAtomic(db, record.id);
        if (attempts !== null && attempts >= MAX_ATTEMPTS) {
          await blockOTP(db, record.id);
          trackOtpEvent("blocked", {
            purpose: "change_password",
            method: otpMethod,
            destination,
            parentId: parent[0].id,
            reason: "max_attempts",
            otpId: record.id,
          });
        }
        if (attempts === null) {
          trackOtpEvent("verify_failed", {
            purpose: "change_password",
            method: otpMethod,
            destination,
            parentId: parent[0].id,
            reason: "used",
            otpId: record.id,
          });
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "OTP already used"));
        }
        trackOtpEvent("verify_failed", {
          purpose: "change_password",
          method: otpMethod,
          destination,
          parentId: parent[0].id,
          reason: "invalid",
          otpId: record.id,
        });
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid OTP"));
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.update(parents).set({ password: hashedPassword }).where(eq(parents.id, req.user.userId));

      const verifiedId = await markVerifiedAtomic(db, record.id);
      if (!verifiedId) {
        trackOtpEvent("verify_failed", {
          purpose: "change_password",
          method: otpMethod,
          destination,
          parentId: parent[0].id,
          reason: "used",
          otpId: record.id,
        });
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "OTP already used"));
      }

      trackOtpEvent("verify_success", {
        purpose: "change_password",
        method: otpMethod,
        destination,
        parentId: parent[0].id,
        otpId: record.id,
        action: "consume",
      });

      logParentAction(req.user.userId, "PASSWORD_CHANGED", "password", req.user.userId, null, req);
      res.json(successResponse({ changed: true }, "Password changed successfully"));
    } catch (error: any) {
      console.error("Change password error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Password change failed"));
    }
  });

  // Delete Parent Account
  app.post("/api/parent/delete-account", authMiddleware, sensitiveParentLimiter, async (req: any, res) => {
    try {
      const v = validateBody(deleteAccountSchema, req.body);
      if (!v.success) return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, v.error));
      const { confirmPassword } = v.data;

      const parent = await db.select().from(parents).where(eq(parents.id, req.user.userId));
      if (!parent[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Parent not found"));
      }

      const passwordMatch = await bcrypt.compare(confirmPassword, parent[0].password);
      if (!passwordMatch) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, "Password is incorrect"));
      }

      await db.update(seoSettings).set({ updatedBy: null }).where(eq(seoSettings.updatedBy, req.user.userId));
      await db.update(supportSettings).set({ updatedBy: null }).where(eq(supportSettings.updatedBy, req.user.userId));

      await db.delete(parents).where(eq(parents.id, req.user.userId));

      res.json(successResponse({ deleted: true }, "Account deleted"));
    } catch (error: any) {
      console.error("Delete account error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Account deletion failed"));
    }
  });

  // Parent account role-interest request (teacher/school/library)
  app.post("/api/parent/account-role-request", authMiddleware, sensitiveParentLimiter, async (req: any, res) => {
    try {
      const v = validateBody(roleInterestRequestSchema, req.body);
      if (!v.success) return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, v.error));

      const { roleType, phoneNumber } = v.data;
      const parentId = req.user.userId;

      const parentRow = await db
        .select({
          id: parents.id,
          name: parents.name,
          email: parents.email,
          phoneNumber: parents.phoneNumber,
        })
        .from(parents)
        .where(eq(parents.id, parentId));

      if (!parentRow[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Parent not found"));
      }

      const roleLabels: Record<string, string> = {
        teacher: "مدرس",
        school: "مدرسة",
        library: "مكتبة",
      };

      await notifyAllAdmins({
        type: NOTIFICATION_TYPES.SYSTEM_ALERT,
        title: "📥 طلب جديد من ولي أمر",
        message: `${parentRow[0].name || "ولي أمر"} طلب التواصل بخصوص (${roleLabels[roleType] || roleType})`,
        style: NOTIFICATION_STYLES.TOAST,
        priority: NOTIFICATION_PRIORITIES.URGENT,
        soundAlert: true,
        metadata: {
          category: "account_role_request",
          roleType,
          roleLabelAr: roleLabels[roleType] || roleType,
          requestedPhone: phoneNumber,
          parentId: parentRow[0].id,
          parentName: parentRow[0].name,
          parentEmail: parentRow[0].email,
          parentPhone: parentRow[0].phoneNumber,
          requestedAt: new Date().toISOString(),
        },
      });

      logParentAction(parentId, "ACCOUNT_ROLE_REQUESTED", "profile", parentId, { roleType, phoneNumber }, req);
      return res.json(successResponse({ requested: true }, "Request submitted"));
    } catch (error: any) {
      console.error("Parent account role request error:", error);
      return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to submit request"));
    }
  });

  // ===== Store Core: migrated to /api/store/* =====
  app.get("/api/parent/store/products", authMiddleware, async (_req: any, res) => {
    return res.status(410).json(errorResponse(
      ErrorCode.BAD_REQUEST,
      "This endpoint is retired. Use /api/store/products and /api/store/checkout-policy instead."
    ));
  });

  // ===== Store Core: migrated to /api/store/checkout =====
  app.post("/api/parent/store/checkout", authMiddleware, requireLinkedChildForParentMonetization, async (req: any, res) => {
    return res.status(410).json(errorResponse(
      ErrorCode.BAD_REQUEST,
      "This endpoint is retired. Use /api/store/checkout."
    ));
  });

  // Get parent orders (legacy dashboard dependency)
  app.get("/api/parent/store/orders", authMiddleware, async (req: any, res) => {
    return res.status(410).json(errorResponse(
      ErrorCode.BAD_REQUEST,
      "This endpoint is retired. Use /api/parent/purchases."
    ));
  });

  // Get single order with items (legacy dashboard dependency)
  app.get("/api/parent/store/orders/:orderId", authMiddleware, async (req: any, res) => {
    return res.status(410).json(errorResponse(
      ErrorCode.BAD_REQUEST,
      "This endpoint is retired. Use /api/parent/purchases and /api/child/store/orders/:orderId."
    ));
  });

  // Create Task
  app.post("/api/parent/create-task", authMiddleware, async (req: any, res) => {
    const endpoint = "/api/parent/create-task";
    let claimedIdempotency = false;
    let idempotencyKeyForFailure = "";
    try {
      const startedAt = Date.now();
      const v = validateBody(createTaskSchema, req.body);
      if (!v.success) return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, v.error));
      const { childId, subjectId, question, answers, pointsReward, imageUrl, gifUrl } = v.data;
      const normalizedQuestion = String(question || "").trim();
      const hasQuestionText = normalizedQuestion.length > 0;
      const hasQuestionMedia = !!String(imageUrl || "").trim() || !!String(gifUrl || "").trim();
      const questionForStorage = hasQuestionText ? normalizedQuestion : "سؤال وسائط";
      const idempotencyKey = extractIdempotencyKey(req);
      idempotencyKeyForFailure = idempotencyKey;

      if (!hasQuestionText && !hasQuestionMedia) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Question text or media is required"));
      }

      // Validate pointsReward: must be a positive integer within bounds
      const pointsRewardNum = Number(pointsReward);
      if (!Number.isInteger(pointsRewardNum) || pointsRewardNum < 1 || pointsRewardNum > 10000) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Points reward must be between 1 and 10,000"));
      }

      // Verify parent owns this child
      const link = await db
        .select()
        .from(parentChild)
        .where(and(eq(parentChild.parentId, req.user.userId), eq(parentChild.childId, childId)));

      if (!link[0]) {
        return res.status(403).json(errorResponse(ErrorCode.PARENT_CHILD_MISMATCH, "Unauthorized"));
      }

      const normalizedAnswers = normalizeAnswersForStorage(answers, 0);
      const correctCount = normalizedAnswers.filter((a) => a.isCorrect).length;
      if (correctCount !== 1) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Exactly one correct answer is required"));
      }

      if (idempotencyKey) {
        const requestHash = buildRequestHash({
          endpoint,
          parentId: req.user.userId,
          childId,
          subjectId: subjectId || null,
          question: normalizeQuestionForFingerprint(questionForStorage),
          pointsReward: pointsRewardNum,
          answers: normalizeAnswersForFingerprint(normalizedAnswers),
          imageUrl: imageUrl || null,
          gifUrl: gifUrl || null,
        });

        const claim = await claimTaskCreateIdempotency({
          parentId: req.user.userId,
          endpoint,
          idempotencyKey,
          requestHash,
        });

        if (claim.status === "conflict") {
          return res.status(409).json(errorResponse(
            ErrorCode.BAD_REQUEST,
            "Idempotency key reuse with different payload"
          ));
        }
        if (claim.status === "processing") {
          return res.status(409).json(errorResponse(
            ErrorCode.RATE_LIMITED,
            "A request with this idempotency key is already in progress"
          ));
        }
        if (claim.status === "completed") {
          const replayPayload = claim.responsePayload || {};
          await trackTaskCreationMetric(req.user.userId, "TASK_CREATE_REPLAY_SINGLE", {
            endpoint,
            childId,
            subjectId: subjectId || null,
            replaySource: "idempotency_ledger",
            durationMs: Date.now() - startedAt,
          }, req);
          return res.json(successResponse({
            ...replayPayload,
            idempotentReplay: true,
          }));
        }

        claimedIdempotency = true;
      }

      // Smart replay prevention for rapid retries / double-clicks.
      // If same task payload was created recently, return existing task instead of charging again.
      if (!idempotencyKey) {
        const replayTask = await findRecentEquivalentTask({
          parentId: req.user.userId,
          childId,
          subjectId: subjectId || null,
          question: questionForStorage,
          answers: normalizedAnswers,
          pointsReward,
          imageUrl: imageUrl || null,
          gifUrl: gifUrl || null,
        });

        if (replayTask) {
          await trackTaskCreationMetric(req.user.userId, "TASK_CREATE_REPLAY_SINGLE", {
            endpoint: "/api/parent/create-task",
            childId,
            subjectId: subjectId || null,
            replayWindowMs: TASK_CREATE_IDEMPOTENCY_WINDOW_MS,
            durationMs: Date.now() - startedAt,
          }, req);

          return res.json(successResponse({
            taskId: replayTask.id,
            idempotentReplay: true,
            replayWindowMs: TASK_CREATE_IDEMPOTENCY_WINDOW_MS,
          }));
        }
      }

      // Atomic check-and-deduct wallet balance + create task in a single transaction
      const result = await db.transaction(async (tx: any) => {
        // Atomic: only deducts if balance >= pointsReward (prevents race condition / double-spend)
        const updated = await tx.update(parentWallet)
          .set({
            balance: sql`${parentWallet.balance} - ${pointsReward}`,
            totalSpent: sql`${parentWallet.totalSpent} + ${pointsReward}`,
            updatedAt: new Date(),
          })
          .where(and(
            eq(parentWallet.parentId, req.user.userId),
            sql`${parentWallet.balance} >= ${pointsReward}`
          ))
          .returning();

        if (!updated[0]) {
          throw new Error("INSUFFICIENT_BALANCE");
        }

        const inserted = await tx
          .insert(tasks)
          .values({
            parentId: req.user.userId,
            childId,
            subjectId: subjectId || null,
            question: questionForStorage,
            answers: normalizedAnswers,
            pointsReward,
            imageUrl,
            gifUrl: gifUrl || null,
          })
          .returning();

        return inserted;
      });

      await createNotification({
        childId,
        type: NOTIFICATION_TYPES.TASK_ASSIGNED_ALT,
        title: "مهمة جديدة!",
        message: `لديك مهمة جديدة: ${questionForStorage.substring(0, 50)}...`,
        relatedId: result[0].id,
        metadata: { taskId: result[0].id, subjectId: subjectId || null },
      });

      await trackTaskCreationMetric(req.user.userId, "TASK_CREATE_SINGLE", {
        endpoint,
        childId,
        subjectId: subjectId || null,
        pointsReward: pointsReward,
        durationMs: Date.now() - startedAt,
      }, req);

      const responsePayload = { taskId: result[0].id };
      if (idempotencyKey) {
        await completeTaskCreateIdempotency({
          parentId: req.user.userId,
          endpoint,
          idempotencyKey,
          responsePayload,
        });
      }

      res.json(successResponse(responsePayload));
    } catch (error: any) {
      if (claimedIdempotency && idempotencyKeyForFailure) {
        await failTaskCreateIdempotency({
          parentId: req.user.userId,
          endpoint,
          idempotencyKey: idempotencyKeyForFailure,
          errorMessage: error?.message || "unknown_error",
        });
      }
      if (error.message === "INSUFFICIENT_BALANCE") {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "رصيدك غير كافي لإرسال هذه المهمة"));
      }
      console.error("Create task error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to create task"));
    }
  });

  // Bulk Create Tasks (backend capability for high-performance task creation)
  app.post("/api/parent/create-tasks/bulk", authMiddleware, async (req: any, res) => {
    const endpoint = "/api/parent/create-tasks/bulk";
    let claimedIdempotency = false;
    let idempotencyKeyForFailure = "";
    try {
      const startedAt = Date.now();
      const v = validateBody(createTasksBulkSchema, req.body);
      if (!v.success) return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, v.error));

      const parentId = req.user.userId;
      const mode = v.data.mode || "all_or_nothing";
      const inputTasks = v.data.tasks;
      const idempotencyKey = extractIdempotencyKey(req);
      idempotencyKeyForFailure = idempotencyKey;

      if (idempotencyKey) {
        const requestHash = buildRequestHash({
          endpoint,
          parentId,
          mode,
          tasks: inputTasks.map((task) => ({
            childId: task.childId,
            subjectId: task.subjectId || null,
            question: normalizeQuestionForFingerprint(String(task.question || "").trim() || "سؤال وسائط"),
            pointsReward: Number(task.pointsReward),
            answers: normalizeAnswersForFingerprint(normalizeAnswersForStorage(task.answers, 0)),
            imageUrl: task.imageUrl || null,
            gifUrl: task.gifUrl || null,
          })),
        });

        const claim = await claimTaskCreateIdempotency({
          parentId,
          endpoint,
          idempotencyKey,
          requestHash,
        });

        if (claim.status === "conflict") {
          return res.status(409).json(errorResponse(
            ErrorCode.BAD_REQUEST,
            "Idempotency key reuse with different payload"
          ));
        }
        if (claim.status === "processing") {
          return res.status(409).json(errorResponse(
            ErrorCode.RATE_LIMITED,
            "A request with this idempotency key is already in progress"
          ));
        }
        if (claim.status === "completed") {
          await trackTaskCreationMetric(parentId, "TASK_CREATE_REPLAY_BULK", {
            endpoint,
            mode,
            replaySource: "idempotency_ledger",
            durationMs: Date.now() - startedAt,
          }, req);

          return res.json(successResponse({
            ...(claim.responsePayload || {}),
            idempotentReplay: true,
          }));
        }

        claimedIdempotency = true;
      }

      const uniqueChildIds = Array.from(new Set(inputTasks.map((item) => item.childId)));
      const linkedChildren = await db
        .select({ childId: parentChild.childId })
        .from(parentChild)
        .where(and(
          eq(parentChild.parentId, parentId),
          inArray(parentChild.childId, uniqueChildIds)
        ));

      const linkedSet = new Set(linkedChildren.map((row: any) => row.childId));
      const unauthorizedChildIds = uniqueChildIds.filter((childId) => !linkedSet.has(childId));
      if (mode === "all_or_nothing" && unauthorizedChildIds.length > 0) {
        return res.status(403).json(errorResponse(ErrorCode.PARENT_CHILD_MISMATCH, "Unauthorized"));
      }

      const settingsRows = await db.select().from(tasksSettings).limit(1);
      const maxPerDay = settingsRows[0]?.maxTasksPerDay ?? 10;
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const rejected: Array<{ index: number; code: string; message: string; childId?: string }> = [];
      const payload: Array<{
        index: number;
        childId: string;
        subjectId: string | null;
        question: string;
        answers: any[];
        pointsReward: number;
        imageUrl: string | null;
        gifUrl: string | null;
      }> = [];

      for (const [index, item] of inputTasks.entries()) {
        if (!linkedSet.has(item.childId)) {
          if (mode === "all_or_nothing") {
            return res.status(403).json(errorResponse(ErrorCode.PARENT_CHILD_MISMATCH, "Unauthorized"));
          }
          rejected.push({
            index,
            code: ErrorCode.PARENT_CHILD_MISMATCH,
            message: "Unauthorized",
            childId: item.childId,
          });
          continue;
        }

        const normalizedQuestion = String(item.question || "").trim();
        const hasQuestionText = normalizedQuestion.length > 0;
        const hasQuestionMedia = !!String(item.imageUrl || "").trim() || !!String(item.gifUrl || "").trim();
        if (!hasQuestionText && !hasQuestionMedia) {
          if (mode === "all_or_nothing") {
            throw new Error(`INVALID_QUESTION_CONTENT:${index}`);
          }
          rejected.push({
            index,
            code: ErrorCode.BAD_REQUEST,
            message: "Question text or media is required",
            childId: item.childId,
          });
          continue;
        }

        const normalizedAnswers = normalizeAnswersForStorage(item.answers, 0);
        if (normalizedAnswers.length < 2) {
          if (mode === "all_or_nothing") {
            throw new Error(`INVALID_ANSWER_CONTENT:${index}`);
          }
          rejected.push({
            index,
            code: ErrorCode.BAD_REQUEST,
            message: "At least two non-empty answers are required",
            childId: item.childId,
          });
          continue;
        }

        const correctCount = normalizedAnswers.filter((a) => a.isCorrect).length;
        if (correctCount !== 1) {
          if (mode === "all_or_nothing") {
            throw new Error(`INVALID_CORRECT_ANSWER_COUNT:${index}`);
          }
          rejected.push({
            index,
            code: ErrorCode.BAD_REQUEST,
            message: "Exactly one correct answer is required",
            childId: item.childId,
          });
          continue;
        }

        const reward = Number(item.pointsReward);
        if (!Number.isInteger(reward) || reward < 1 || reward > 10000) {
          if (mode === "all_or_nothing") {
            throw new Error(`INVALID_POINTS_REWARD:${index}`);
          }
          rejected.push({
            index,
            code: ErrorCode.BAD_REQUEST,
            message: "Points reward must be between 1 and 10,000",
            childId: item.childId,
          });
          continue;
        }

        payload.push({
          index,
          childId: item.childId,
          subjectId: item.subjectId || null,
          question: hasQuestionText ? normalizedQuestion : "سؤال وسائط",
          answers: normalizedAnswers,
          pointsReward: reward,
          imageUrl: item.imageUrl || null,
          gifUrl: item.gifUrl || null,
        });
      }

      // Guard daily limit per child before charging wallet.
      const cappedPayload: typeof payload = [];
      const byChild = new Map<string, typeof payload>();
      for (const item of payload) {
        if (!byChild.has(item.childId)) byChild.set(item.childId, []);
        byChild.get(item.childId)!.push(item);
      }

      for (const childId of Array.from(byChild.keys())) {
        const [todayCount] = await db
          .select({ total: count() })
          .from(tasks)
          .where(and(eq(tasks.childId, childId), gte(tasks.createdAt, todayStart)));

        const incoming = byChild.get(childId) || [];
        const incomingForChild = incoming.length;
        const projected = Number(todayCount?.total || 0) + incomingForChild;
        if (projected <= maxPerDay) {
          cappedPayload.push(...incoming);
          continue;
        }

        if (mode === "all_or_nothing") {
          return res.status(429).json(errorResponse(
            ErrorCode.RATE_LIMITED,
            `Daily task limit exceeded for child ${childId}. max=${maxPerDay}, current=${todayCount?.total || 0}, incoming=${incomingForChild}`
          ));
        }

        const remainingSlots = Math.max(0, maxPerDay - Number(todayCount?.total || 0));
        if (remainingSlots > 0) {
          cappedPayload.push(...incoming.slice(0, remainingSlots));
        }
        for (const rejectedItem of incoming.slice(remainingSlots)) {
          rejected.push({
            index: rejectedItem.index,
            code: ErrorCode.RATE_LIMITED,
            message: `Daily task limit exceeded for child ${childId}`,
            childId,
          });
        }
      }

      if (mode === "partial" && cappedPayload.length === 0) {
        const responsePayload = {
          mode,
          createdCount: 0,
          totalReward: 0,
          taskIds: [],
          rejectedCount: rejected.length,
          rejected,
        };
        if (idempotencyKey) {
          await completeTaskCreateIdempotency({
            parentId,
            endpoint,
            idempotencyKey,
            responsePayload,
          });
        }
        return res.json(successResponse(responsePayload, "No tasks created in partial mode"));
      }

      const totalReward = cappedPayload.reduce((sum, item) => sum + item.pointsReward, 0);
      if (totalReward <= 0) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Total points reward must be positive"));
      }

      const createdTasks = await db.transaction(async (tx: any) => {
        const deducted = await tx
          .update(parentWallet)
          .set({
            balance: sql`${parentWallet.balance} - ${totalReward}`,
            totalSpent: sql`${parentWallet.totalSpent} + ${totalReward}`,
            updatedAt: new Date(),
          })
          .where(and(
            eq(parentWallet.parentId, parentId),
            sql`${parentWallet.balance} >= ${totalReward}`
          ))
          .returning({ id: parentWallet.id });

        if (!deducted[0]) {
          throw new Error("INSUFFICIENT_BALANCE");
        }

        const inserted = await tx
          .insert(tasks)
          .values(cappedPayload.map((item) => ({
            parentId,
            childId: item.childId,
            subjectId: item.subjectId,
            question: item.question,
            answers: item.answers,
            pointsReward: item.pointsReward,
            imageUrl: item.imageUrl,
            gifUrl: item.gifUrl,
            status: "pending",
          })))
          .returning();

        return inserted;
      });

      for (const task of createdTasks) {
        await createNotification({
          childId: task.childId,
          type: NOTIFICATION_TYPES.TASK_ASSIGNED_ALT,
          title: "مهام جديدة!",
          message: `لديك مهمة جديدة: ${String(task.question || "").substring(0, 50)}...`,
          relatedId: task.id,
          metadata: { taskId: task.id, subjectId: task.subjectId || null },
        });
      }

      const durationMs = Date.now() - startedAt;
      await trackTaskCreationMetric(parentId, "TASK_CREATE_BULK", {
        endpoint,
        mode,
        createdCount: createdTasks.length,
        rejectedCount: rejected.length,
        totalReward,
        uniqueChildren: uniqueChildIds.length,
        durationMs,
        avgTaskLatencyMs: createdTasks.length > 0 ? Math.round(durationMs / createdTasks.length) : 0,
      }, req);

      const responsePayload = {
        mode,
        createdCount: createdTasks.length,
        totalReward,
        taskIds: createdTasks.map((task: any) => task.id),
        rejectedCount: rejected.length,
        rejected,
      };

      if (idempotencyKey) {
        await completeTaskCreateIdempotency({
          parentId,
          endpoint,
          idempotencyKey,
          responsePayload,
        });
      }

      return res.json(successResponse(responsePayload, "Tasks created successfully"));
    } catch (error: any) {
      if (claimedIdempotency && idempotencyKeyForFailure) {
        await failTaskCreateIdempotency({
          parentId: req.user.userId,
          endpoint,
          idempotencyKey: idempotencyKeyForFailure,
          errorMessage: error?.message || "unknown_error",
        });
      }
      if (error?.message === "INSUFFICIENT_BALANCE") {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "رصيدك غير كافي لإرسال هذه المهام"));
      }
      if (typeof error?.message === "string" && error.message.startsWith("INVALID_CORRECT_ANSWER_COUNT:")) {
        const idx = Number(error.message.split(":")[1] || -1);
        return res.status(400).json(errorResponse(
          ErrorCode.BAD_REQUEST,
          `Exactly one correct answer is required in task index ${idx}`
        ));
      }
      if (typeof error?.message === "string" && error.message.startsWith("INVALID_POINTS_REWARD:")) {
        const idx = Number(error.message.split(":")[1] || -1);
        return res.status(400).json(errorResponse(
          ErrorCode.BAD_REQUEST,
          `Points reward must be between 1 and 10,000 in task index ${idx}`
        ));
      }
      if (typeof error?.message === "string" && error.message.startsWith("INVALID_QUESTION_CONTENT:")) {
        const idx = Number(error.message.split(":")[1] || -1);
        return res.status(400).json(errorResponse(
          ErrorCode.BAD_REQUEST,
          `Question text or media is required in task index ${idx}`
        ));
      }
      if (typeof error?.message === "string" && error.message.startsWith("INVALID_ANSWER_CONTENT:")) {
        const idx = Number(error.message.split(":")[1] || -1);
        return res.status(400).json(errorResponse(
          ErrorCode.BAD_REQUEST,
          `At least two non-empty answers are required in task index ${idx}`
        ));
      }

      console.error("Create tasks bulk error:", error);
      return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to create tasks in bulk"));
    }
  });

  // Get Parent Products
  app.get("/api/parent/products", authMiddleware, async (req: any, res) => {
    try {
      const result = await db.select().from(products).where(eq(products.parentId, req.user.userId));
      res.json(result);
    } catch (error: any) {
      console.error("Fetch products error:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  // Create Product
  app.post("/api/parent/create-product", authMiddleware, async (req: any, res) => {
    try {
      const v = validateBody(createProductSchema, req.body);
      if (!v.success) return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, v.error));
      const { name, description, price, pointsPrice, image, stock } = v.data;

      const result = await db
        .insert(products)
        .values({
          parentId: req.user.userId,
          name,
          description,
          price,
          pointsPrice,
          image,
          stock: stock || 999,
        })
        .returning();

      res.json({ success: true, productId: result[0].id });
    } catch (error: any) {
      console.error("Create product error:", error);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  // Update Product
  app.post("/api/parent/products", authMiddleware, async (req: any, res) => {
    try {
      const v = validateBody(updateProductSchema, req.body);
      if (!v.success) return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, v.error));
      const { id, name, description, price, pointsPrice, image, stock } = v.data;

      const product = await db.select().from(products).where(eq(products.id, id));
      if (!product[0] || product[0].parentId !== req.user.userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      await db
        .update(products)
        .set({
          name,
          description,
          price,
          pointsPrice,
          image,
          stock,
        })
        .where(eq(products.id, id));

      res.json({ success: true, message: "Product updated" });
    } catch (error: any) {
      console.error("Update product error:", error);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  // Delete Product
  app.delete("/api/parent/products/:id", authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;

      const product = await db.select().from(products).where(eq(products.id, id));
      if (!product[0] || product[0].parentId !== req.user.userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      await db.delete(products).where(eq(products.id, id));
      res.json({ success: true, message: "Product deleted" });
    } catch (error: any) {
      console.error("Delete product error:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Get Parent Wallet
  app.get("/api/parent/wallet", authMiddleware, async (req: any, res) => {
    try {
      const result = await db.select().from(parentWallet).where(eq(parentWallet.parentId, req.user.userId));
      if (!result[0]) {
        res.json(successResponse({ balance: 0, totalDeposited: 0, totalSpent: 0 }, "Wallet retrieved"));
      } else {
        res.json(successResponse(result[0], "Wallet retrieved"));
      }
    } catch (error: any) {
      console.error("Fetch wallet error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch wallet"));
    }
  });

  // Parent quick-start checklist (auto-verified + auto rewards)
  app.get("/api/parent/quick-start/tasks", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      await ensureParentQuickTasksSeeded(db);

      const [taskRows, completionRows] = await Promise.all([
        db
          .select()
          .from(parentQuickTasks)
          .where(eq(parentQuickTasks.isActive, true)),
        db
          .select()
          .from(parentQuickTaskCompletions)
          .where(eq(parentQuickTaskCompletions.parentId, parentId)),
      ]);

      const completionByTaskId = new Map(completionRows.map((row: any) => [row.taskId, row]));
      const autoCompleted: string[] = [];

      for (const task of taskRows) {
        if (completionByTaskId.has(task.id)) {
          continue;
        }

        const verificationKey = String(task.verificationKey || "").trim();
        if (!isParentQuickVerificationKey(verificationKey)) {
          continue;
        }

        const verification = await verifyParentQuickTask({
          db,
          parentId,
          verificationKey,
        });

        if (!verification.matched) {
          continue;
        }

        const rewardPoints = Math.max(1, Math.trunc(Number(task.rewardPoints || 0)));
        const awardResult = await awardParentQuickTaskIfQualified({
          db,
          parentId,
          taskId: task.id,
          verificationKey,
          rewardPoints,
          metadata: verification.metadata || {},
        });

        if (awardResult.awarded) {
          autoCompleted.push(task.id);
        }
      }

      const latestCompletions = await db
        .select()
        .from(parentQuickTaskCompletions)
        .where(eq(parentQuickTaskCompletions.parentId, parentId));
      const latestMap = new Map(latestCompletions.map((row: any) => [row.taskId, row]));

      const responseTasks = taskRows
        .slice()
        .sort((a: any, b: any) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0))
        .map((task: any) => {
          const completion = latestMap.get(task.id) as Record<string, any> | undefined;
          const completedAt = completion ? completion["completedAt"] : null;
          const awardedPoints = completion ? Number(completion["awardedPoints"] || 0) : 0;
          return {
            id: task.id,
            code: task.code,
            title: task.title,
            description: task.description,
            rewardPoints: Number(task.rewardPoints || 0),
            completed: Boolean(completion),
            completedAt,
            awardedPoints,
            verificationKey: task.verificationKey,
          };
        });

      return res.json(successResponse({ tasks: responseTasks, autoCompletedTaskIds: autoCompleted }));
    } catch (error: any) {
      console.error("Parent quick-start tasks error:", error);
      return res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch quick-start tasks"));
    }
  });

  // Get Payment Methods (admin-created, visible to all parents)
  app.get("/api/parent/payment-methods", authMiddleware, async (req: any, res) => {
    try {
      const result = await db
        .select()
        .from(paymentMethods)
        .where(and(isNull(paymentMethods.parentId), eq(paymentMethods.isActive, true)));

      const [visibilitySetting] = await db
        .select({ value: appSettings.value })
        .from(appSettings)
        .where(eq(appSettings.key, "paymentMethodVisibility"))
        .limit(1);

      let visibilityRaw: any = {};
      if (visibilitySetting?.value) {
        try {
          visibilityRaw = JSON.parse(visibilitySetting.value);
        } catch {
          visibilityRaw = {};
        }
      }
      const visibility = normalizePaymentVisibility(visibilityRaw);

      const shippingCountryCode = await resolveParentCountryCode(db, req.user.userId);
      const requestCountryCode = resolveRequestCountryCode(req);
      const effectiveCountryCode = shippingCountryCode || requestCountryCode;
      const filtered = filterPaymentMethodsByCountry(result, effectiveCountryCode);

      const visibleMethods = filtered
        .map((method: any) => ({ ...method, paymentCategory: resolvePaymentCategory(method) }))
        .filter((method: any) => visibility[method.paymentCategory as PaymentCategory]);

      res.json(successResponse(visibleMethods, "Payment methods retrieved"));
    } catch (error: any) {
      console.error("Fetch payment methods error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch payment methods"));
    }
  });

  app.get("/api/parent/google-play/products", authMiddleware, async (req: any, res) => {
    try {
      const products = await getGooglePlayWalletProducts(db);
      if (products.length === 0) {
        return res.status(503).json(errorResponse(
          ErrorCode.BAD_REQUEST,
          "Google Play wallet products are not configured",
        ));
      }

      const packageName = resolveGooglePlayPackageName();
      const accountObfuscationId = buildGooglePlayObfuscatedAccountId(req.user.userId);

      return res.json(successResponse({
        packageName,
        accountObfuscationId,
        products,
      }, "Google Play products retrieved"));
    } catch (error: any) {
      console.error("Fetch Google Play products error:", error);
      return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch Google Play products"));
    }
  });

  app.post("/api/parent/google-play/complete-purchase", authMiddleware, depositLimiter, async (req: any, res) => {
    try {
      if (!isLikelyNativeAndroidClient(req)) {
        return res.status(400).json(errorResponse(
          ErrorCode.BAD_REQUEST,
          "Google Play purchase completion is available only for native Android clients",
        ));
      }

      const v = validateBody(completeGooglePlayPurchaseSchema, req.body);
      if (!v.success) return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, v.error));

      const parentId = req.user.userId;
      const purchaseToken = v.data.purchaseToken;
      const productId = v.data.productId;
      const packageName = resolveGooglePlayPackageName(v.data.packageName);

      const configuredProducts = await getGooglePlayWalletProducts(db);
      const configuredProduct = configuredProducts.find((row) => row.productId === productId);
      if (!configuredProduct) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Unknown Google Play productId"));
      }

      const verification = await verifyGooglePlayProductPurchase({
        packageName,
        productId,
        purchaseToken,
      });

      if (verification.purchaseStateLabel === "pending") {
        return res.status(409).json(errorResponse(ErrorCode.BAD_REQUEST, "Purchase is still pending and cannot be credited yet"));
      }

      if (verification.purchaseStateLabel !== "purchased") {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Purchase is not in PURCHASED state"));
      }

      const expectedObfuscatedAccountId = buildGooglePlayObfuscatedAccountId(parentId);
      if (!verification.obfuscatedExternalAccountId || verification.obfuscatedExternalAccountId !== expectedObfuscatedAccountId) {
        return res.status(403).json(errorResponse(ErrorCode.UNAUTHORIZED, "Purchase account mapping mismatch"));
      }

      if (verification.acknowledgementStateLabel !== "acknowledged") {
        await acknowledgeGooglePlayProductPurchase({
          packageName,
          productId,
          purchaseToken,
          developerPayload: `parent:${parentId}`,
        });
      }

      if (configuredProduct.consumable && verification.consumptionStateLabel !== "consumed") {
        await consumeGooglePlayProductPurchase({
          packageName,
          productId,
          purchaseToken,
        });
      }

      const quantity = Math.max(1, Number.isFinite(verification.quantity) ? Math.trunc(verification.quantity) : 1);
      const walletAmount = Number((configuredProduct.walletAmount * quantity).toFixed(2));
      const normalizedOrderId = String(v.data.orderId || verification.orderId || "").trim();
      const monetizationPolicy = await getGooglePlayMonetizationPolicy(db);

      const txResult = await db.transaction(async (tx: any) => {
        const now = new Date();

        const existingRows = await tx
          .select()
          .from(googlePlayPurchases)
          .where(eq(googlePlayPurchases.purchaseToken, purchaseToken))
          .for("update");

        const existing = existingRows[0] || null;
        if (existing && existing.parentId !== parentId) {
          throw new Error("GOOGLE_PLAY_TOKEN_PARENT_MISMATCH");
        }

        const purchasePayload = {
          orderId: normalizedOrderId || null,
          packageName,
          productId,
          walletAmount: walletAmount.toFixed(2),
          currency: configuredProduct.currency,
          purchaseState: verification.purchaseStateLabel,
          acknowledgementState: verification.acknowledgementStateLabel,
          consumptionState: verification.consumptionStateLabel,
          rawPayload: verification.rawPayload,
          verifiedAt: now,
          updatedAt: now,
        };

        if (!existing) {
          await tx.insert(googlePlayPurchases).values({
            parentId,
            purchaseToken,
            ...purchasePayload,
          });
        } else {
          await tx
            .update(googlePlayPurchases)
            .set(purchasePayload)
            .where(eq(googlePlayPurchases.id, existing.id));
        }

        const refreshedRows = await tx
          .select()
          .from(googlePlayPurchases)
          .where(eq(googlePlayPurchases.purchaseToken, purchaseToken))
          .for("update");

        const refreshedPurchase = refreshedRows[0];
        if (!refreshedPurchase) {
          throw new Error("GOOGLE_PLAY_PURCHASE_NOT_PERSISTED");
        }

        if (refreshedPurchase.creditedAt) {
          const walletRows = await tx
            .select({ balance: parentWallet.balance })
            .from(parentWallet)
            .where(eq(parentWallet.parentId, parentId))
            .limit(1);

          return {
            alreadyProcessed: true,
            creditedNow: false,
            depositId: refreshedPurchase.depositId,
            walletBalance: String(walletRows[0]?.balance || "0"),
            balanceDelta: 0,
          };
        }

        const googlePlayMethodId = await ensureGooglePlayPaymentMethod(tx, monetizationPolicy.googlePlayMethodType);

        const walletRows = await tx
          .select()
          .from(parentWallet)
          .where(eq(parentWallet.parentId, parentId))
          .limit(1);

        if (walletRows[0]) {
          await tx
            .update(parentWallet)
            .set({
              balance: sql`${parentWallet.balance} + ${walletAmount}`,
              totalDeposited: sql`${parentWallet.totalDeposited} + ${walletAmount}`,
              updatedAt: now,
            })
            .where(eq(parentWallet.parentId, parentId));
        } else {
          await tx.insert(parentWallet).values({
            parentId,
            balance: walletAmount.toFixed(2),
            totalDeposited: walletAmount.toFixed(2),
            totalSpent: "0",
            updatedAt: now,
          });
        }

        const depositRows = await tx
          .insert(deposits)
          .values({
            parentId,
            paymentMethodId: googlePlayMethodId,
            amount: walletAmount.toFixed(2),
            status: "completed",
            transactionId: `gpb:${purchaseToken}`,
            receiptUrl: null,
            notes: `Google Play product ${productId}${quantity > 1 ? ` x${quantity}` : ""}`,
            adminNotes: "Auto-verified via Google Play purchase token",
            reviewedAt: now,
            createdAt: now,
            completedAt: now,
          })
          .returning({ id: deposits.id });

        const depositId = depositRows[0]?.id || null;

        await tx
          .update(googlePlayPurchases)
          .set({
            depositId,
            creditedAt: now,
            updatedAt: now,
          })
          .where(eq(googlePlayPurchases.id, refreshedPurchase.id));

        const updatedWalletRows = await tx
          .select({ balance: parentWallet.balance })
          .from(parentWallet)
          .where(eq(parentWallet.parentId, parentId))
          .limit(1);

        return {
          alreadyProcessed: false,
          creditedNow: true,
          depositId,
          walletBalance: String(updatedWalletRows[0]?.balance || "0"),
          balanceDelta: walletAmount,
        };
      });

      if (txResult.creditedNow) {
        await createNotification({
          parentId,
          type: NOTIFICATION_TYPES.DEPOSIT_APPROVED,
          title: "✅ تم قبول الإيداع",
          message: `تمت إضافة ${walletAmount.toFixed(2)} إلى رصيدك عبر Google Play`,
          style: NOTIFICATION_STYLES.MODAL,
          priority: NOTIFICATION_PRIORITIES.NORMAL,
          soundAlert: true,
          metadata: {
            purchaseToken,
            productId,
            amount: walletAmount,
          },
        });
      }

      return res.json(successResponse({
        alreadyProcessed: txResult.alreadyProcessed,
        creditedNow: txResult.creditedNow,
        amount: walletAmount,
        balance: txResult.walletBalance,
        depositId: txResult.depositId,
        purchaseToken,
      }, txResult.alreadyProcessed ? "Google Play purchase already processed" : "Google Play purchase processed"));
    } catch (error: any) {
      const message = String(error?.message || "");

      if (error?.code === "23505" && String(error?.constraint || "").includes("google_play_purchases_purchase_token_uq")) {
        const parentId = req.user?.userId;
        const purchaseToken = String(req.body?.purchaseToken || "").trim();
        if (parentId && purchaseToken) {
          const existingPurchase = await db
            .select({ parentId: googlePlayPurchases.parentId })
            .from(googlePlayPurchases)
            .where(eq(googlePlayPurchases.purchaseToken, purchaseToken))
            .limit(1);

          if (existingPurchase[0]?.parentId === parentId) {
            const walletRows = await db
              .select({ balance: parentWallet.balance })
              .from(parentWallet)
              .where(eq(parentWallet.parentId, parentId))
              .limit(1);

            return res.json(successResponse({
              alreadyProcessed: true,
              creditedNow: false,
              amount: 0,
              balance: String(walletRows[0]?.balance || "0"),
              purchaseToken,
            }, "Google Play purchase already processed"));
          }
        }
      }

      if (message === "GOOGLE_PLAY_TOKEN_PARENT_MISMATCH") {
        return res.status(403).json(errorResponse(ErrorCode.UNAUTHORIZED, "Purchase token already belongs to another account"));
      }

      if (message.startsWith("GOOGLE_PLAY_VERIFY_HTTP_404")) {
        return res.status(404).json(errorResponse(ErrorCode.BAD_REQUEST, "Purchase token was not found on Google Play"));
      }

      if (
        message.startsWith("GOOGLE_PLAY_VERIFY_HTTP_")
        || message.startsWith("GOOGLE_PLAY_ACK_HTTP_")
        || message.startsWith("GOOGLE_PLAY_CONSUME_HTTP_")
      ) {
        return res.status(502).json(errorResponse(ErrorCode.PAYMENT_FAILED, "Google Play purchase verification failed"));
      }

      console.error("Complete Google Play purchase error:", error);
      return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to complete Google Play purchase"));
    }
  });

  // Create Deposit (parent confirms external payment)
  app.post("/api/parent/deposit", authMiddleware, depositLimiter, async (req: any, res) => {
    try {
      if (isLikelyNativeAndroidClient(req)) {
        return res.status(400).json(errorResponse(
          ErrorCode.BAD_REQUEST,
          "Android wallet top-up must use Google Play Billing",
        ));
      }

      const v = validateBody(depositSchema, req.body);
      if (!v.success) return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, v.error));
      const { paymentMethodId, amount: parsedAmount, notes, transactionId: rawTxId, receiptUrl: rawReceipt } = v.data;

      const normalizedTransactionId = typeof rawTxId === "string" ? rawTxId.trim() : "";
      const normalizedReceiptUrl = typeof rawReceipt === "string" ? rawReceipt.trim() : "";

      if (!normalizedTransactionId) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Transaction ID is required"));
      }

      if (normalizedTransactionId.length < 4 || normalizedTransactionId.length > 120) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Transaction ID must be between 4 and 120 characters"));
      }

      if (normalizedReceiptUrl) {
        try {
          const parsedUrl = new URL(normalizedReceiptUrl);
          if (!["http:", "https:"].includes(parsedUrl.protocol)) {
            return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Receipt URL must start with http:// or https://"));
          }
        } catch {
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid receipt URL"));
        }
      }

      if (parsedAmount > 100000) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Maximum deposit amount is 100,000"));
      }

      // Rate limit: max 5 pending deposits per parent
      const pendingDeposits = await db
        .select({ id: deposits.id })
        .from(deposits)
        .where(and(eq(deposits.parentId, req.user.userId), eq(deposits.status, "pending")));
      if (pendingDeposits.length >= 5) {
        return res.status(429).json(errorResponse("RATE_LIMITED" as any, "لديك 5 طلبات إيداع قيد المراجعة بالفعل"));
      }

      // Idempotency: reject duplicate transactionId for the same parent
      const duplicateDeposit = await db
        .select({ id: deposits.id })
        .from(deposits)
        .where(and(eq(deposits.parentId, req.user.userId), eq(deposits.transactionId, normalizedTransactionId)))
        .limit(1);
      if (duplicateDeposit.length > 0) {
        return res.status(409).json(errorResponse(ErrorCode.BAD_REQUEST, "رقم التحويل مستخدم بالفعل في طلب إيداع سابق"));
      }

      // Verify the payment method exists, is admin-created (parentId null), and is active
      const method = await db
        .select()
        .from(paymentMethods)
        .where(and(eq(paymentMethods.id, paymentMethodId), isNull(paymentMethods.parentId), eq(paymentMethods.isActive, true)));

      if (!method[0]) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid or inactive payment method"));
      }

      const result = await db
        .insert(deposits)
        .values({
          parentId: req.user.userId,
          paymentMethodId,
          amount: parsedAmount.toString(),
          status: "pending",
          transactionId: normalizedTransactionId,
          receiptUrl: normalizedReceiptUrl || null,
          notes: notes ? String(notes).substring(0, 500) : null,
        })
        .returning();

      // Get parent info for admin notification
      const parent = await db.select({ name: parents.name, email: parents.email }).from(parents).where(eq(parents.id, req.user.userId));
      const parentName = parent[0]?.name || "مستخدم";

      // Notify admin (all admins receive real-time notifications)
      await notifyAllAdmins({
        type: NOTIFICATION_TYPES.DEPOSIT_REQUEST,
        title: "طلب إيداع جديد",
        message: `${parentName} طلب إيداع $${parsedAmount} عبر ${method[0].type} (Ref: ...${normalizedTransactionId.slice(-4)})${notes ? ` — "${String(notes).substring(0, 100)}"` : ""}`,
        style: NOTIFICATION_STYLES.TOAST,
        priority: NOTIFICATION_PRIORITIES.URGENT,
        soundAlert: true,
        relatedId: result[0].id,
        metadata: { depositId: result[0].id, parentId: req.user.userId, amount: parsedAmount },
      });

      void monitorDepositCreation({
        parentId: req.user.userId,
        amount: parsedAmount,
        depositId: result[0].id,
      }).catch((error: any) => {
        console.error("Risk monitor (deposit create) failed:", error?.message || error);
      });

      logParentAction(req.user.userId, "DEPOSIT_REQUESTED", "deposit", result[0].id, { amount: parsedAmount, paymentMethodId }, req);
      res.json(successResponse({ depositId: result[0].id }, "Deposit request created"));
    } catch (error: any) {
      console.error("Create deposit error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to create deposit"));
    }
  });

  // Get Deposits (ordered: newest first)
  app.get("/api/parent/deposits", authMiddleware, async (req: any, res) => {
    try {
      const result = await db
        .select({
          id: deposits.id,
          parentId: deposits.parentId,
          paymentMethodId: deposits.paymentMethodId,
          amount: deposits.amount,
          status: deposits.status,
          transactionId: deposits.transactionId,
          receiptUrl: deposits.receiptUrl,
          notes: deposits.notes,
          adminNotes: deposits.adminNotes,
          reviewedAt: deposits.reviewedAt,
          createdAt: deposits.createdAt,
          completedAt: deposits.completedAt,
          methodType: paymentMethods.type,
          methodBank: paymentMethods.bankName,
          methodAccount: paymentMethods.accountNumber,
        })
        .from(deposits)
        .leftJoin(paymentMethods, eq(deposits.paymentMethodId, paymentMethods.id))
        .where(eq(deposits.parentId, req.user.userId))
        .orderBy(desc(deposits.createdAt))
        .limit(100);
      res.json(successResponse(result, "Deposits retrieved"));
    } catch (error: any) {
      console.error("Fetch deposits error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch deposits"));
    }
  });

  // Enrich login request notifications with current status from childLoginRequests table
  async function enrichLoginRequestStatus(items: any[]): Promise<any[]> {
    const loginNotifications = items.filter(
      (n: any) => n.type === "login_code_request" && n.metadata?.loginRequestId
    );
    if (loginNotifications.length === 0) return items;

    const loginRequestIds = loginNotifications.map((n: any) => n.metadata.loginRequestId);
    const loginRequests: any[] = await db
      .select()
      .from(childLoginRequests)
      .where(inArray(childLoginRequests.id, loginRequestIds));

    const loginRequestMap = new Map(loginRequests.map((lr: any) => [lr.id, lr]));

    const now = new Date();
    const EXPIRY_MINUTES = 5;

    return items.map((n: any) => {
      if (n.type !== "login_code_request" || !n.metadata?.loginRequestId) return n;

      const lr: any = loginRequestMap.get(n.metadata.loginRequestId);
      if (!lr) {
        return { ...n, loginRequestStatus: "expired" };
      }

      let resolvedStatus = lr.status;
      // Auto-expire pending requests older than 5 minutes
      if (lr.status === "pending") {
        const ageMs = now.getTime() - new Date(lr.createdAt).getTime();
        if (ageMs > EXPIRY_MINUTES * 60 * 1000) {
          resolvedStatus = "expired";
          // Fire-and-forget: update the DB record
          db.update(childLoginRequests)
            .set({ status: "expired" })
            .where(eq(childLoginRequests.id, lr.id))
            .then(() => { })
            .catch(() => { });
        }
      }

      return {
        ...n,
        loginRequestStatus: resolvedStatus,
        loginRequestRespondedAt: lr.respondedAt,
      };
    });
  }

  // Get Notifications (ordered: unread first, then newest)
  app.get("/api/parent/notifications", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
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
        const result = await db.select()
          .from(notifications)
          .where(eq(notifications.parentId, parentId))
          .orderBy(sql`${notifications.isRead} ASC, ${notifications.createdAt} DESC, ${notifications.id} DESC`);

        const enriched = await enrichLoginRequestStatus(result);
        return res.json(successResponse(enriched, "Notifications retrieved"));
      }

      const items = await db.select()
        .from(notifications)
        .where(eq(notifications.parentId, parentId))
        .orderBy(sql`${notifications.isRead} ASC, ${notifications.createdAt} DESC, ${notifications.id} DESC`)
        .limit(limit)
        .offset(offset);

      const enrichedItems = await enrichLoginRequestStatus(items);

      if (!includeMeta) {
        return res.json(successResponse(enrichedItems, "Notifications retrieved"));
      }

      const [{ total }] = await db
        .select({ total: count() })
        .from(notifications)
        .where(eq(notifications.parentId, parentId));

      const totalCount = Number(total || 0);
      return res.json(successResponse({
        items: enrichedItems,
        total: totalCount,
        limit,
        offset,
        hasMore: offset + enrichedItems.length < totalCount,
      }, "Notifications retrieved"));
    } catch (error: any) {
      console.error("Fetch notifications error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch notifications"));
    }
  });

  // Get unread notifications count (lightweight)
  app.get("/api/parent/notifications/unread-count", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const [row] = await db
        .select({ count: count() })
        .from(notifications)
        .where(and(eq(notifications.parentId, parentId), eq(notifications.isRead, false)));

      res.json(successResponse({ count: Number(row?.count || 0) }, "Unread notifications count retrieved"));
    } catch (error: any) {
      console.error("Fetch unread notifications count error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch unread notifications count"));
    }
  });

  // Mark all parent notifications as read
  app.post("/api/parent/notifications/read-all", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;

      const updated = await db
        .update(notifications)
        .set({ isRead: true, readAt: new Date() })
        .where(and(eq(notifications.parentId, parentId), eq(notifications.isRead, false)))
        .returning({ id: notifications.id });

      res.json(successResponse({ updated: updated.length }, "All notifications marked as read"));
    } catch (error: any) {
      console.error("Mark all notifications error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to mark all notifications"));
    }
  });

  // Mark Notification as Read - SEC-003 FIX: Added ownership verification
  app.post("/api/parent/notifications/:id/read", authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const parentId = req.user.userId;

      // Verify ownership before updating
      const updated = await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(eq(notifications.id, id), eq(notifications.parentId, parentId)))
        .returning();

      if (!updated[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Notification not found or not authorized"));
      }

      res.json(successResponse({ marked: true }, "Notification marked as read"));
    } catch (error: any) {
      console.error("Mark notification error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to mark notification"));
    }
  });

  // Delete Notification
  app.delete("/api/parent/notifications/:id", authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const deleted = await db
        .delete(notifications)
        .where(and(eq(notifications.id, id), eq(notifications.parentId, req.user.userId)))
        .returning();

      if (!deleted[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Notification not found"));
      }

      res.json(successResponse({ deleted: true }, "Notification deleted"));
    } catch (error: any) {
      console.error("Delete notification error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to delete notification"));
    }
  });

  // Respond to Child Login Request (approve/reject)
  app.post("/api/parent/notifications/:id/respond-login", authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const v = validateBody(respondLoginSchema, req.body);
      if (!v.success) return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, v.error));
      const { action } = v.data;

      const notification = await db.select().from(notifications).where(eq(notifications.id, id));
      if (!notification[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Notification not found"));
      }

      if (notification[0].parentId !== req.user.userId) {
        return res.status(403).json(errorResponse(ErrorCode.FORBIDDEN, "Not authorized"));
      }

      const metadata = notification[0].metadata as any;
      const childId = metadata?.childId;
      const childName = metadata?.childName;
      const loginRequestId = metadata?.loginRequestId;

      // Check if login request exists and is still valid (not expired)
      if (loginRequestId) {
        const loginRequest = await db.select().from(childLoginRequests).where(eq(childLoginRequests.id, loginRequestId));

        if (!loginRequest[0]) {
          return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Login request not found"));
        }

        // Check if already processed (prevent reuse)
        if (loginRequest[0].status !== "pending") {
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "هذا الطلب تم معالجته بالفعل"));
        }

        // Check if expired
        if (loginRequest[0].expiresAt < new Date()) {
          await db.update(childLoginRequests)
            .set({ status: "expired" })
            .where(eq(childLoginRequests.id, loginRequestId));
          return res.status(410).json(errorResponse(ErrorCode.BAD_REQUEST, "انتهت صلاحية هذا الطلب. يجب على الطفل إرسال طلب جديد."));
        }
      }

      // Mark notification as read
      await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));

      if (action === "approve") {
        // Generate JWT token for the child
        const sessionToken = jwt.sign({ childId, type: "child" }, JWT_SECRET, { expiresIn: "30d" });

        // Activate scheduled sessions on child login approval
        if (childId) {
          activateOnLoginSessions(childId).catch((err: any) => console.error("Session activation on login approval error:", err));
          resumePausedSessions(childId).catch((err: any) => console.error("Session resume on login approval error:", err));
        }

        // Update login request with approved status and token
        if (loginRequestId) {
          await db.update(childLoginRequests)
            .set({
              status: "approved",
              sessionToken,
              respondedAt: new Date(),
            })
            .where(eq(childLoginRequests.id, loginRequestId));
        }

        res.json(successResponse({ approved: true, loginRequestId }, "Login request approved"));
      } else {
        // Update login request with rejected status
        if (loginRequestId) {
          await db.update(childLoginRequests)
            .set({
              status: "rejected",
              respondedAt: new Date(),
            })
            .where(eq(childLoginRequests.id, loginRequestId));
        }

        // Notify child
        if (childId) {
          await createNotification({
            childId,
            type: NOTIFICATION_TYPES.LOGIN_REJECTED,
            title: "تم رفض طلب الدخول",
            message: `${childName}، تم رفض طلب دخولك من قبل والديك.`,
            style: NOTIFICATION_STYLES.TOAST,
            priority: NOTIFICATION_PRIORITIES.WARNING,
          });
        }

        res.json(successResponse({ rejected: true, loginRequestId }, "Login request rejected"));
      }
    } catch (error: any) {
      console.error("Respond to login error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to respond to login request"));
    }
  });

  // Respond to purchase reward offer (accept product or exchange to wallet)
  app.post("/api/parent/notifications/:id/respond-reward-offer", authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { action } = req.body || {};
      const parentId = req.user.userId;

      if (!action || !["accept_product", "cash_exchange"].includes(action)) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid action"));
      }

      const rows = await db
        .select()
        .from(notifications)
        .where(and(eq(notifications.id, id), eq(notifications.parentId, parentId)));

      if (!rows[0]) {
        return res
          .status(404)
          .json(errorResponse(ErrorCode.NOT_FOUND, "Notification not found"));
      }

      const n = rows[0] as any;
      if (n.type !== NOTIFICATION_TYPES.REWARD_UNLOCKED) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, "Notification is not a reward offer"));
      }

      const rewardOffer = (n.metadata as any)?.rewardOffer;
      if (!rewardOffer?.productId) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, "Reward offer metadata is missing"));
      }

      const currentClaimStatus = String(rewardOffer.claimStatus || "pending");
      if (currentClaimStatus !== "pending") {
        return res
          .status(409)
          .json(errorResponse(ErrorCode.BAD_REQUEST, "This reward offer has already been processed"));
      }

      const purchaseId = String(rewardOffer.purchaseId || n.relatedId || "");
      const productId = String(rewardOffer.productId);
      const rewardValueNum = Number(rewardOffer.rewardValue || 0);
      const now = new Date();

      const updatedMetadata = {
        ...(n.metadata || {}),
        rewardOffer: {
          ...rewardOffer,
          claimStatus: action === "accept_product" ? "accepted_product" : "cash_exchanged",
          claimAction: action,
          claimedAt: now.toISOString(),
        },
      };

      let walletBalanceAfter: number | null = null;

      await db.transaction(async (tx: any) => {
        if (action === "accept_product") {
          const existingOwned = await tx.select().from(parentOwnedProducts).where(
            and(
              eq(parentOwnedProducts.parentId, parentId),
              eq(parentOwnedProducts.productId, productId),
              eq(parentOwnedProducts.sourcePurchaseId, purchaseId)
            )
          );

          if (existingOwned[0]) {
            await tx
              .update(parentOwnedProducts)
              .set({ status: "active", updatedAt: now })
              .where(eq(parentOwnedProducts.id, existingOwned[0].id));
          } else {
            await tx.insert(parentOwnedProducts).values({
              parentId,
              productId,
              sourcePurchaseId: purchaseId || null,
              status: "active",
            });
          }
        } else {
          const wallet = await tx.select().from(parentWallet).where(eq(parentWallet.parentId, parentId));
          if (!wallet[0]) {
            const inserted = await tx
              .insert(parentWallet)
              .values({
                parentId,
                balance: String(rewardValueNum),
                totalDeposited: String(rewardValueNum),
                totalSpent: "0",
                updatedAt: now,
              })
              .returning();
            walletBalanceAfter = Number(inserted[0]?.balance || rewardValueNum);
          } else {
            const updated = await tx
              .update(parentWallet)
              .set({
                balance: sql`${parentWallet.balance} + ${rewardValueNum}`,
                totalDeposited: sql`${parentWallet.totalDeposited} + ${rewardValueNum}`,
                updatedAt: now,
              })
              .where(eq(parentWallet.parentId, parentId))
              .returning();
            walletBalanceAfter = Number(updated[0]?.balance || 0);
          }
        }

        await tx
          .update(notifications)
          .set({
            isRead: true,
            status: "resolved",
            resolvedAt: now,
            metadata: updatedMetadata,
          })
          .where(eq(notifications.id, id));
      });

      if (action === "accept_product") {
        await createNotification({
          parentId,
          type: NOTIFICATION_TYPES.REWARD,
          title: "✅ تم تأكيد استلام الهدية",
          message: "تمت إضافة المنتج الهدية إلى قسم مخزوني بنجاح.",
          relatedId: purchaseId || null,
          ctaTarget: "/parent-inventory",
          metadata: { rewardOffer: updatedMetadata.rewardOffer },
        });
      } else {
        await createNotification({
          parentId,
          type: NOTIFICATION_TYPES.REWARD,
          title: "💰 تم تحويل قيمة الهدية للمحفظة",
          message: `تمت إضافة ${rewardValueNum.toFixed(2)} إلى محفظتك بنجاح.`,
          relatedId: purchaseId || null,
          ctaTarget: "/wallet",
          metadata: { rewardOffer: updatedMetadata.rewardOffer, walletBalanceAfter },
        });
      }

      const parentRows = await db
        .select({ name: parents.name, email: parents.email })
        .from(parents)
        .where(eq(parents.id, parentId))
        .limit(1);

      const parentName = parentRows[0]?.name || "ولي الأمر";
      const parentEmail = parentRows[0]?.email || null;

      await notifyAllAdmins({
        type: NOTIFICATION_TYPES.REWARD_OFFER_UPDATED,
        title: action === "accept_product" ? "✅ تم تأكيد هدية مشتريات" : "💰 تم استبدال هدية مشتريات نقدًا",
        message:
          action === "accept_product"
            ? `${parentName} أكد استلام عرض الهدية للطلب ${purchaseId || "-"}.`
            : `${parentName} استبدل عرض الهدية نقدًا بقيمة ${rewardValueNum.toFixed(2)} للطلب ${purchaseId || "-"}.`,
        relatedId: purchaseId || null,
        ctaAction: "review_reward_offer",
        ctaTarget: "/admin-dashboard",
        style: NOTIFICATION_STYLES.TOAST,
        priority: NOTIFICATION_PRIORITIES.NORMAL,
        soundAlert: true,
        metadata: {
          rewardOffer: updatedMetadata.rewardOffer,
          parentId,
          parentName,
          parentEmail,
          action,
          walletBalanceAfter,
        },
      });

      res.json(successResponse({
        action,
        walletBalanceAfter,
        rewardOffer: updatedMetadata.rewardOffer,
      }, "Reward offer processed"));
    } catch (error: any) {
      console.error("Respond reward offer error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to process reward offer"));
    }
  });

  // Get pending purchase requests from children
  app.get("/api/parent/purchase-requests", authMiddleware, async (req: any, res) => {
    try {
      const requests = await db
        .select({
          id: childPurchaseRequests.id,
          childId: childPurchaseRequests.childId,
          productId: childPurchaseRequests.productId,
          libraryProductId: childPurchaseRequests.libraryProductId,
          quantity: childPurchaseRequests.quantity,
          pointsPrice: childPurchaseRequests.pointsPrice,
          status: childPurchaseRequests.status,
          createdAt: childPurchaseRequests.createdAt,
        })
        .from(childPurchaseRequests)
        .where(and(
          eq(childPurchaseRequests.parentId, req.user.userId),
          eq(childPurchaseRequests.status, "pending")
        ))
        .orderBy(sql`${childPurchaseRequests.createdAt} DESC`);

      // Enrich with child and product details
      const enrichedRequests = await Promise.all(requests.map(async (request: typeof requests[number]) => {
        const child = await db.select().from(children).where(eq(children.id, request.childId));
        const product = await db.select().from(products).where(eq(products.id, request.productId));
        return {
          ...request,
          child: child[0] ? { id: child[0].id, name: child[0].name, avatarUrl: child[0].avatarUrl } : null,
          product: product[0] ? {
            id: product[0].id,
            name: product[0].name,
            nameAr: product[0].nameAr,
            image: product[0].image,
            pointsPrice: product[0].pointsPrice,
          } : null
        };
      }));

      res.json(successResponse(enrichedRequests, "Purchase requests retrieved"));
    } catch (error: any) {
      console.error("Get purchase requests error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch purchase requests"));
    }
  });

  // Approve or reject a child purchase request
  app.patch("/api/parent/purchase-requests/:id/decision", authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { decision, rejectionReason, shippingAddress } = req.body;
      const normalizedRejectionReason = typeof rejectionReason === "string" ? rejectionReason.trim() : "";
      const normalizedShippingAddress = typeof shippingAddress === "string" ? shippingAddress.trim() : "";

      if (!decision || !["approve", "reject"].includes(decision)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Decision must be 'approve' or 'reject'"));
      }

      if (decision === "reject" && !normalizedRejectionReason) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Rejection reason is required"));
      }

      if (decision === "approve" && !normalizedShippingAddress) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Shipping address is required for approval"));
      }

      // Get the request
      const request = await db.select().from(childPurchaseRequests).where(
        and(eq(childPurchaseRequests.id, id), eq(childPurchaseRequests.parentId, req.user.userId))
      );

      if (!request[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Purchase request not found"));
      }

      if (request[0].status !== "pending") {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Request already processed"));
      }

      const child = await db.select().from(children).where(eq(children.id, request[0].childId));
      if (!child[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Child not found"));
      }

      const product = await db.select().from(products).where(eq(products.id, request[0].productId));
      if (!product[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Product not found"));
      }

      const monetizationPolicy = await getGooglePlayMonetizationPolicy(db);

      if (decision === "approve") {
        let decisionResult: {
          order: typeof orders.$inferSelect;
          invoice: typeof parentPurchases.$inferSelect | null;
        } | null = null;
        try {
          decisionResult = await db.transaction(async (tx: any) => {
            const referralSettingsRows = await tx.select().from(libraryReferralSettings);
            const saleActivityPoints = referralSettingsRows[0]?.pointsPerSale ?? 10;

            const walletUpdate = await tx
              .update(parentWallet)
              .set({
                balance: sql`${parentWallet.balance} - ${request[0].pointsPrice}`,
                totalSpent: sql`${parentWallet.totalSpent} + ${request[0].pointsPrice}`,
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(parentWallet.parentId, req.user.userId),
                  sql`${parentWallet.balance} >= ${request[0].pointsPrice}`
                )
              )
              .returning({ balance: parentWallet.balance });

            if (!walletUpdate[0]) {
              throw new Error("INSUFFICIENT_PARENT_WALLET");
            }

            const createdOrder = await tx
              .insert(orders)
              .values({
                parentId: req.user.userId,
                childId: request[0].childId,
                productId: request[0].productId,
                quantity: request[0].quantity,
                pointsPrice: request[0].pointsPrice,
                status: "processing",
                shippingAddress: normalizedShippingAddress,
              })
              .returning();

            let createdInvoice: typeof parentPurchases.$inferSelect | null = null;
            if (monetizationPolicy.childRequestInvoicesEnabled) {
              const pointsPerCurrencyUnit = Math.max(1, Number(monetizationPolicy.pointsPerCurrencyUnit || 10));
              const quantity = Math.max(1, Number(request[0].quantity || 1));
              const totalAmount = Number((Number(request[0].pointsPrice || 0) / pointsPerCurrencyUnit).toFixed(2));
              const unitAmount = Number((totalAmount / quantity).toFixed(2));

              const createdInvoiceRows = await tx
                .insert(parentPurchases)
                .values({
                  parentId: req.user.userId,
                  totalAmount: totalAmount.toFixed(2),
                  currency: String(monetizationPolicy.defaultCurrency || "EGP").toUpperCase(),
                  paymentStatus: "paid",
                  invoiceNumber: `CHILD-REQ-${id}-${Date.now().toString(36).toUpperCase()}`,
                })
                .returning();

              createdInvoice = createdInvoiceRows[0] || null;

              if (createdInvoice) {
                await tx.insert(parentPurchaseItems).values({
                  purchaseId: createdInvoice.id,
                  productId: request[0].productId,
                  quantity,
                  unitPrice: unitAmount.toFixed(2),
                  subtotal: totalAmount.toFixed(2),
                });
              }
            }

            await tx
              .update(childPurchaseRequests)
              .set({
                status: "approved",
                parentDecision: "approve",
                shippingAddress: normalizedShippingAddress,
                orderId: createdOrder[0].id,
                decidedAt: new Date(),
              })
              .where(eq(childPurchaseRequests.id, id));

            if (request[0].libraryProductId) {
              const libraryItem = await tx
                .select({
                  id: libraryProducts.id,
                  libraryId: libraryProducts.libraryId,
                  stock: libraryProducts.stock,
                  commissionRatePct: libraries.commissionRatePct,
                })
                .from(libraryProducts)
                .innerJoin(libraries, eq(libraryProducts.libraryId, libraries.id))
                .where(eq(libraryProducts.id, request[0].libraryProductId));

              if (!libraryItem[0] || libraryItem[0].stock < request[0].quantity) {
                throw new Error("LIBRARY_STOCK_UNAVAILABLE");
              }

              await tx
                .update(libraryProducts)
                .set({
                  stock: sql`${libraryProducts.stock} - ${request[0].quantity}`,
                  updatedAt: new Date(),
                })
                .where(eq(libraryProducts.id, request[0].libraryProductId));

              await tx
                .update(libraries)
                .set({
                  totalSales: sql`${libraries.totalSales} + ${request[0].quantity}`,
                  updatedAt: new Date(),
                })
                .where(eq(libraries.id, libraryItem[0].libraryId));

              const dayStart = new Date();
              dayStart.setHours(0, 0, 0, 0);

              const existingDaily = await tx
                .select()
                .from(libraryDailySales)
                .where(
                  and(
                    eq(libraryDailySales.libraryId, libraryItem[0].libraryId),
                    eq(libraryDailySales.saleDate, dayStart)
                  )
                );

              if (existingDaily[0]) {
                await tx
                  .update(libraryDailySales)
                  .set({
                    totalPointsSales: sql`${libraryDailySales.totalPointsSales} + ${request[0].pointsPrice}`,
                    totalOrders: sql`${libraryDailySales.totalOrders} + 1`,
                    updatedAt: new Date(),
                  })
                  .where(eq(libraryDailySales.id, existingDaily[0].id));
              } else {
                await tx.insert(libraryDailySales).values({
                  libraryId: libraryItem[0].libraryId,
                  saleDate: dayStart,
                  totalSalesAmount: "0.00",
                  totalPointsSales: request[0].pointsPrice,
                  totalOrders: 1,
                  commissionRatePct: libraryItem[0].commissionRatePct || "10.00",
                  commissionAmount: "0.00",
                  isPaid: false,
                });
              }

              await tx.insert(libraryActivityLogs).values({
                libraryId: libraryItem[0].libraryId,
                action: "sale",
                points: saleActivityPoints,
                metadata: {
                  orderId: createdOrder[0].id,
                  parentId: req.user.userId,
                  childId: request[0].childId,
                  requestId: id,
                  libraryProductId: request[0].libraryProductId,
                  quantity: request[0].quantity,
                  pointsPrice: request[0].pointsPrice,
                },
              });

              await tx
                .update(libraries)
                .set({
                  activityScore: sql`${libraries.activityScore} + ${saleActivityPoints}`,
                  updatedAt: new Date(),
                })
                .where(eq(libraries.id, libraryItem[0].libraryId));
            }

            return {
              order: createdOrder[0],
              invoice: createdInvoice,
            };
          });
        } catch (error: any) {
          if (error?.message === "INSUFFICIENT_PARENT_WALLET") {
            return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Parent wallet balance is insufficient"));
          }
          if (error?.message === "LIBRARY_STOCK_UNAVAILABLE") {
            return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Library product is out of stock"));
          }
          throw error;
        }

        // Notify child
        await createNotification({
          parentId: req.user.userId,
          childId: request[0].childId,
          type: NOTIFICATION_TYPES.PURCHASE_APPROVED,
          title: "تم قبول طلبك!",
          message: `تمت الموافقة على طلب شراء ${product[0].nameAr || product[0].name}`,
          metadata: {
            requestId: id,
            productId: request[0].productId,
            orderId: decisionResult?.order.id,
            invoiceId: decisionResult?.invoice?.id || null,
          },
        });

        sseManager.sendToUser(String(request[0].childId), "child", "purchase_request_decision", {
          requestId: id,
          status: "approved",
          orderId: decisionResult?.order.id,
          invoiceId: decisionResult?.invoice?.id || null,
        });

        res.json(successResponse({
          requestId: id,
          orderId: decisionResult?.order.id,
          invoiceId: decisionResult?.invoice?.id || null,
          invoiceNumber: decisionResult?.invoice?.invoiceNumber || null,
          status: "approved",
        }, "Purchase request approved"));

      } else {
        // Reject the request - points NOT deducted, so nothing to refund
        await db
          .update(childPurchaseRequests)
          .set({
            status: "rejected",
            parentDecision: "reject",
            rejectionReason: normalizedRejectionReason,
            decidedAt: new Date(),
          })
          .where(eq(childPurchaseRequests.id, id));

        await createNotification({
          parentId: req.user.userId,
          childId: request[0].childId,
          type: NOTIFICATION_TYPES.PURCHASE_REJECTED,
          title: "تم رفض طلبك",
          message: `تم رفض طلب شراء ${product[0].nameAr || product[0].name}: ${normalizedRejectionReason}`,
          metadata: {
            requestId: id,
            productId: request[0].productId,
            reason: normalizedRejectionReason,
          },
        });

        sseManager.sendToUser(String(request[0].childId), "child", "purchase_request_decision", {
          requestId: id,
          status: "rejected",
          reason: normalizedRejectionReason,
        });

        res.json(successResponse({
          requestId: id,
          status: "rejected"
        }, "Purchase request rejected"));
      }
    } catch (error: any) {
      console.error("Purchase decision error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to process decision"));
    }
  });

  // شراء منتج كهدية للطفل
  app.post("/api/parent/store/purchase", authMiddleware, requireLinkedChildForParentMonetization, async (req: any, res) => {
    return res.status(410).json(errorResponse(
      ErrorCode.BAD_REQUEST,
      "This endpoint is retired. Use /api/store/checkout, then assign owned products through supported flows."
    ));
  });

  // Checkout invoice preview (manual purchase flow)
  app.post("/api/parent/store/checkout/preview", authMiddleware, requireLinkedChildForParentMonetization, async (req: any, res) => {
    return res.status(410).json(errorResponse(
      ErrorCode.BAD_REQUEST,
      "This endpoint is retired. Use /api/store/checkout with client-side cart preview."
    ));
  });

  // Confirm checkout (after successful payment)
  app.post("/api/parent/store/checkout/confirm", authMiddleware, requireLinkedChildForParentMonetization, async (req: any, res) => {
    return res.status(410).json(errorResponse(
      ErrorCode.BAD_REQUEST,
      "This endpoint is retired. Use /api/store/checkout and provider callbacks for payment confirmation."
    ));
  });

  // Parent purchases history
  app.get("/api/parent/purchases", authMiddleware, async (req: any, res) => {
    try {
      const purchases = await db.select().from(parentPurchases).where(eq(parentPurchases.parentId, req.user.userId));
      const enriched = await Promise.all(purchases.map(async (p: any) => {
        const items = await db.select().from(parentPurchaseItems).where(eq(parentPurchaseItems.purchaseId, p.id));

        const relatedLibraryOrders = await db
          .select({
            id: libraryOrders.id,
            status: libraryOrders.status,
            updatedAt: libraryOrders.updatedAt,
            deliveredAt: libraryOrders.deliveredAt,
            holdDays: libraryOrders.holdDays,
          })
          .from(libraryOrders)
          .where(eq(libraryOrders.parentPurchaseId, p.id));

        const relatedOrderIds = relatedLibraryOrders.map((row: any) => row.id).filter(Boolean);
        const relatedReturnRequests = relatedOrderIds.length
          ? await db
            .select()
            .from(libraryReturnRequests)
            .where(inArray(libraryReturnRequests.libraryOrderId, relatedOrderIds))
            .orderBy(desc(libraryReturnRequests.createdAt))
          : [];

        const latestReturnRequest = relatedReturnRequests[0] || null;
        const hasOpenReturnRequest = relatedReturnRequests.some((request: any) =>
          request.status === "under_review" || request.status === "merchant_responded"
        );

        const shippingStatuses = relatedLibraryOrders.map((row: any) => String(row.status || "").toLowerCase());
        let shippingStatus: string | null = null;

        if (shippingStatuses.some((status: string) => status === "cancelled")) {
          shippingStatus = "cancelled";
        } else if (shippingStatuses.some((status: string) => status === "returned")) {
          shippingStatus = "returned";
        } else if (shippingStatuses.some((status: string) => status === "return_requested")) {
          shippingStatus = "return_requested";
        } else if (shippingStatuses.some((status: string) => status === "delivered" || status === "completed")) {
          shippingStatus = "delivered";
        } else if (shippingStatuses.some((status: string) => status === "shipped")) {
          shippingStatus = "shipped";
        } else if (shippingStatuses.some((status: string) => status === "pending_admin" || status === "confirmed" || status === "processing")) {
          shippingStatus = "processing";
        }

        const paymentStatus = String(p.paymentStatus || "").toLowerCase();
        let status = "pending";
        if (paymentStatus === "rejected" || shippingStatus === "cancelled") {
          status = "cancelled";
        } else if (shippingStatus === "returned") {
          status = "returned";
        } else if (shippingStatus === "return_requested") {
          status = "return_requested";
        } else if (shippingStatus === "delivered") {
          status = "completed";
        } else if (shippingStatus === "shipped") {
          status = "shipped";
        } else if (shippingStatus === "processing") {
          status = "processing";
        } else if (paymentStatus === "paid") {
          status = "completed";
        }

        const nowMs = Date.now();
        const eligibleOrders = relatedLibraryOrders.filter((order: any) => {
          if (!order.deliveredAt) return false;
          const holdDays = Number(order.holdDays || 15);
          const eligibleUntilMs = new Date(order.deliveredAt).getTime() + (holdDays * 24 * 60 * 60 * 1000);
          return nowMs <= eligibleUntilMs;
        });

        const latestEligibleUntil = eligibleOrders.length
          ? new Date(Math.max(...eligibleOrders.map((order: any) => {
            const holdDays = Number(order.holdDays || 15);
            return new Date(order.deliveredAt).getTime() + (holdDays * 24 * 60 * 60 * 1000);
          })))
          : null;

        return {
          ...p,
          items,
          status,
          shippingStatus,
          hasShippingOrders: relatedLibraryOrders.length > 0,
          canRequestReturn: eligibleOrders.length > 0 && !hasOpenReturnRequest,
          returnEligibleUntil: latestEligibleUntil,
          returnRequest: latestReturnRequest,
        };
      }));
      res.json({ success: true, data: enriched });
    } catch (error: any) {
      console.error("Fetch parent purchases error:", error);
      res.status(500).json({ message: "Failed to fetch purchases" });
    }
  });

  app.post("/api/parent/purchases/:id/return-request", authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const body = z.object({
        reason: z.string().trim().min(3).max(80),
        details: z.string().trim().max(1000).optional(),
      }).safeParse(req.body || {});

      if (!body.success) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid return request payload"));
      }

      const purchaseRows = await db
        .select()
        .from(parentPurchases)
        .where(and(eq(parentPurchases.id, id), eq(parentPurchases.parentId, req.user.userId)))
        .limit(1);
      const purchase = purchaseRows[0];
      if (!purchase) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Purchase not found"));
      }

      const candidateOrders = await db
        .select()
        .from(libraryOrders)
        .where(
          and(
            eq(libraryOrders.parentPurchaseId, id),
            eq(libraryOrders.buyerParentId, req.user.userId),
            inArray(libraryOrders.status, ["delivered", "completed", "return_requested"]),
          )
        );

      if (!candidateOrders.length) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "This purchase has no return-eligible delivery records"));
      }

      const now = new Date();
      const eligibleOrders = candidateOrders.filter((order: any) => {
        if (!order.deliveredAt) return false;
        const holdDays = Number(order.holdDays || 15);
        const eligibleUntil = new Date(new Date(order.deliveredAt).getTime() + (holdDays * 24 * 60 * 60 * 1000));
        return now <= eligibleUntil;
      });

      if (!eligibleOrders.length) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Return window expired (15-day protection window)"));
      }

      const eligibleOrderIds = eligibleOrders.map((order: any) => order.id);
      const activeRequests = await db
        .select()
        .from(libraryReturnRequests)
        .where(
          and(
            inArray(libraryReturnRequests.libraryOrderId, eligibleOrderIds),
            inArray(libraryReturnRequests.status, ["under_review", "merchant_responded"]),
          )
        )
        .limit(1);

      if (activeRequests[0]) {
        return res.status(409).json(errorResponse(ErrorCode.BAD_REQUEST, "A return request is already under review for this purchase"));
      }

      const createdRequests = await db.transaction(async (tx: any) => {
        const created: any[] = [];

        for (const order of eligibleOrders) {
          const freezeAmount = parseFloat(String(order.libraryEarningAmount || "0")) || 0;
          if (freezeAmount <= 0) {
            continue;
          }

          let balanceRows = await tx
            .select()
            .from(libraryBalances)
            .where(eq(libraryBalances.libraryId, order.libraryId))
            .limit(1);
          if (!balanceRows[0]) {
            const insertedBalance = await tx.insert(libraryBalances).values({ libraryId: order.libraryId }).returning();
            balanceRows = insertedBalance;
          }

          const balance = balanceRows[0];
          const pending = parseFloat(String(balance.pendingBalance || "0")) || 0;
          const available = parseFloat(String(balance.availableBalance || "0")) || 0;

          let freezeSource: "pending" | "available" = "pending";
          if (pending >= freezeAmount) {
            freezeSource = "pending";
          } else if (available >= freezeAmount) {
            freezeSource = "available";
          } else {
            throw new Error("INSUFFICIENT_LIBRARY_BALANCE_FOR_FREEZE");
          }

          const freezeAmountFixed = freezeAmount.toFixed(2);
          await tx
            .update(libraryBalances)
            .set({
              pendingBalance:
                freezeSource === "pending"
                  ? sql`GREATEST(0, ${libraryBalances.pendingBalance} - ${freezeAmountFixed})`
                  : libraryBalances.pendingBalance,
              availableBalance:
                freezeSource === "available"
                  ? sql`GREATEST(0, ${libraryBalances.availableBalance} - ${freezeAmountFixed})`
                  : libraryBalances.availableBalance,
              frozenBalance: sql`${libraryBalances.frozenBalance} + ${freezeAmountFixed}`,
              updatedAt: now,
            })
            .where(eq(libraryBalances.libraryId, order.libraryId));

          await tx
            .update(libraryOrders)
            .set({
              status: "return_requested",
              updatedAt: now,
            })
            .where(eq(libraryOrders.id, order.id));

          const holdDays = Number(order.holdDays || 15);
          const eligibleUntil = new Date(new Date(order.deliveredAt).getTime() + (holdDays * 24 * 60 * 60 * 1000));

          const insertedReturn = await tx
            .insert(libraryReturnRequests)
            .values({
              libraryOrderId: order.id,
              parentPurchaseId: id,
              buyerParentId: req.user.userId,
              libraryId: order.libraryId,
              reason: body.data.reason,
              details: body.data.details || null,
              status: "under_review",
              eligibleUntil,
              freezeAmount: freezeAmountFixed,
              freezeSource,
            })
            .returning();

          created.push(insertedReturn[0]);
        }

        return created;
      });

      if (!createdRequests.length) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Unable to open return request for this purchase"));
      }

      await notifyAllAdmins({
        type: NOTIFICATION_TYPES.ORDER_PLACED,
        title: "طلب مرتجع جديد",
        message: `تم فتح طلب مرتجع للشراء رقم ${id.slice(0, 8)}`,
        relatedId: id,
        style: NOTIFICATION_STYLES.TOAST,
        priority: NOTIFICATION_PRIORITIES.URGENT,
        soundAlert: true,
        metadata: {
          purchaseId: id,
          parentId: req.user.userId,
          requestsCount: createdRequests.length,
        },
      });

      return res.json(successResponse(createdRequests, "Return request submitted and merchant balance frozen"));
    } catch (error: any) {
      if (error?.message === "INSUFFICIENT_LIBRARY_BALANCE_FOR_FREEZE") {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Unable to freeze merchant balance for return request"));
      }
      console.error("Create parent return request error:", error);
      return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to submit return request"));
    }
  });

  // Parent owned products
  app.get("/api/parent/owned-products", authMiddleware, async (req: any, res) => {
    try {
      const owned = await db.select().from(parentOwnedProducts).where(eq(parentOwnedProducts.parentId, req.user.userId));
      const enriched = await Promise.all(owned.map(async (o: any) => {
        const prod = await db.select().from(products).where(eq(products.id, o.productId));
        return { ...o, product: prod[0] || null };
      }));
      res.json({ success: true, data: enriched });
    } catch (error: any) {
      console.error("Fetch owned products error:", error);
      res.status(500).json({ message: "Failed to fetch owned products" });
    }
  });

  // Assign owned product to child
  app.post("/api/parent/owned-products/:id/assign-to-child", authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params; // parentOwnedProducts id
      const { childId, requiredPoints } = req.body;
      const requiredPointsNum = parseInt(requiredPoints);
      const owned = await db.select().from(parentOwnedProducts).where(eq(parentOwnedProducts.id, id));
      if (!owned[0] || owned[0].parentId !== req.user.userId) return res.status(403).json({ message: "Unauthorized" });
      if (owned[0].status !== 'active') return res.status(400).json({ message: "Product not available for assignment — must be approved and active" });

      // SEC: Verify parent owns this child
      const ownership = await db.select().from(parentChild).where(
        and(eq(parentChild.parentId, req.user.userId), eq(parentChild.childId, childId))
      );
      if (!ownership[0]) return res.status(403).json(errorResponse(ErrorCode.FORBIDDEN, "Not authorized for this child"));

      const childRow = await db.select({ totalPoints: children.totalPoints }).from(children).where(eq(children.id, childId));
      if (!childRow[0]) return res.status(404).json({ message: "Child not found" });

      const initialProgress = Math.max(0, Math.min(requiredPointsNum, Number(childRow[0].totalPoints || 0)));

      // create child assigned product
      const assigned = await db.insert(childAssignedProducts).values({ childId, parentOwnedProductId: id, requiredPoints: requiredPointsNum, progressPoints: initialProgress }).returning();

      // update parent owned product
      await db.update(parentOwnedProducts).set({ status: 'assigned_to_child', updatedAt: new Date() }).where(eq(parentOwnedProducts.id, id));

      // create notification for child (with product name)
      const assignedProduct = await db.select({ name: products.name, nameAr: products.nameAr }).from(products).where(eq(products.id, owned[0].productId));
      const assignedProductName = assignedProduct[0]?.nameAr || assignedProduct[0]?.name || "منتج";
      await createNotification({ childId, type: NOTIFICATION_TYPES.PRODUCT_ASSIGNED, title: "🎁 هدية جديدة في انتظارك!", message: `أضاف والداك "${assignedProductName}" كهدية! اجمع ${requiredPoints} نقطة للحصول عليها`, relatedId: assigned[0].id, metadata: { productName: assignedProductName, requiredPoints } });

      res.json({ success: true, data: assigned[0] });
    } catch (error: any) {
      console.error("Assign to child error:", error);
      res.status(500).json({ message: "Failed to assign product" });
    }
  });

  // Get parent-assigned products across children
  app.get("/api/parent/child-assigned-products", authMiddleware, async (req: any, res) => {
    try {
      // find parent's owned products
      const owned = await db.select().from(parentOwnedProducts).where(eq(parentOwnedProducts.parentId, req.user.userId));
      const ownedIds = owned.map((o: any) => o.id);
      if (ownedIds.length === 0) return res.json({ success: true, data: [] });
      const assigned = await db.select().from(childAssignedProducts).where(sql`parent_owned_product_id = ANY(${ownedIds})`);
      res.json({ success: true, data: assigned });
    } catch (error: any) {
      console.error("Fetch child assigned products error:", error);
      res.status(500).json({ message: "Failed to fetch assigned products" });
    }
  });

  // Request shipping for an assigned product
  app.post("/api/parent/child-assigned-products/:id/request-shipping", authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params; // childAssignedProducts id
      const { shippingAddress } = req.body;
      const assigned = await db.select().from(childAssignedProducts).where(eq(childAssignedProducts.id, id));
      if (!assigned[0]) return res.status(404).json({ message: "Assigned product not found" });

      // validate ownership
      const owned = await db.select().from(parentOwnedProducts).where(eq(parentOwnedProducts.id, assigned[0].parentOwnedProductId));
      if (!owned[0] || owned[0].parentId !== req.user.userId) return res.status(403).json({ message: "Unauthorized" });

      // check child's points
      const child = await db.select().from(children).where(eq(children.id, assigned[0].childId));
      if (!child[0]) return res.status(404).json({ message: "Child not found" });
      if ((child[0].totalPoints || 0) < assigned[0].requiredPoints) return res.status(400).json({ message: "Child has insufficient points" });

      // create shipping request
      const sr = await db.insert(shippingRequests).values({ assignedProductId: id, parentId: req.user.userId, childId: assigned[0].childId, shippingAddress, status: 'requested' }).returning();

      // update assigned product status
      await db.update(childAssignedProducts).set({ status: 'shipment_requested', shipmentRequestedAt: new Date() }).where(eq(childAssignedProducts.id, id));

      // notify admin (all admins receive real-time notifications)
      const shippedChild = await db.select({ name: children.name }).from(children).where(eq(children.id, assigned[0].childId));
      const shippedChildName = shippedChild[0]?.name || "طفل";
      await notifyAllAdmins({ type: NOTIFICATION_TYPES.SHIPMENT_REQUESTED, title: "📦 طلب شحن جديد", message: `طلب شحن جديد لـ ${shippedChildName} — المنتج: ${id}`, relatedId: sr[0].id, metadata: { childName: shippedChildName, assignedProductId: id }, style: NOTIFICATION_STYLES.TOAST, priority: NOTIFICATION_PRIORITIES.URGENT, soundAlert: true });

      res.json({ success: true, data: sr[0] });
    } catch (error: any) {
      console.error("Request shipping error:", error);
      res.status(500).json({ message: "Failed to request shipping" });
    }
  });

  // ===== Phase 1.3: Gifts - Send Gift =====
  app.post("/api/parent/gifts/send", authMiddleware, walletLimiter, async (req: any, res) => {
    try {
      const v = validateBody(sendGiftSchema, req.body);
      if (!v.success) return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, v.error));
      const { entitlementId, childId, pointsThreshold, message } = v.data;

      // Verify entitlement belongs to parent, is parent-owned, and ACTIVE
      const ent = await db.select().from(entitlements).where(eq(entitlements.id, entitlementId));
      if (!ent[0]) {
        return res.status(404).json({ message: "Entitlement not found" });
      }
      if (ent[0].parentId !== req.user.userId) {
        return res.status(403).json({ message: "Entitlement does not belong to you" });
      }
      if (ent[0].childId !== null) {
        return res.status(400).json({ message: "Entitlement already assigned" });
      }
      if (ent[0].status !== "ACTIVE") {
        return res.status(400).json({ message: "Entitlement is not active" });
      }

      // Verify child belongs to parent
      const link = await db
        .select()
        .from(parentChild)
        .where(and(eq(parentChild.parentId, req.user.userId), eq(parentChild.childId, childId)));
      if (!link[0]) {
        return res.status(403).json({ message: "Child does not belong to you" });
      }

      // Check for existing gift (idempotency: same entitlement + child)
      const existingGift = await db
        .select()
        .from(gifts)
        .where(
          and(
            eq(gifts.productId, ent[0].productId),
            eq(gifts.parentId, req.user.userId),
            eq(gifts.childId, childId),
            sql`${gifts.status} != 'REVOKED'`
          )
        );
      if (existingGift[0]) {
        return res.json({ success: true, data: existingGift[0], message: "Gift already exists" });
      }

      // Create gift (SENT)
      const gift = await db
        .insert(gifts)
        .values({
          parentId: req.user.userId,
          childId,
          productId: ent[0].productId,
          pointsThreshold,
          status: "SENT",
          message: message || null,
        })
        .returning();

      // Update entitlement: assign to child, mark as ASSIGNED_AS_GIFT
      await db
        .update(entitlements)
        .set({
          childId,
          status: "ASSIGNED_AS_GIFT",
          metadata: { ...ent[0].metadata, giftId: gift[0].id },
          updatedAt: new Date(),
        })
        .where(eq(entitlements.id, entitlementId));

      // Emit stub event
      emitGiftEvent({
        type: "gift.sent",
        giftId: gift[0].id,
        parentId: req.user.userId,
        childId,
        productId: ent[0].productId,
        timestamp: new Date(),
      });

      logParentAction(req.user.userId, "GIFT_SENT", "gift", gift[0].id, { childId, pointsThreshold }, req);
      res.status(201).json({ success: true, data: gift[0] });
    } catch (error: any) {
      console.error("Send gift error:", error);
      res.status(500).json({ message: "Failed to send gift" });
    }
  });

  // ===== Phase 1.3: Gifts - List Gifts =====
  app.get("/api/parent/gifts", authMiddleware, async (req: any, res) => {
    try {
      const { status } = req.query;
      let query = db.select().from(gifts).where(eq(gifts.parentId, req.user.userId));
      if (status) {
        query = query.where(and(eq(gifts.parentId, req.user.userId), eq(gifts.status, status)));
      }
      const list = await query;
      res.json({ success: true, data: list });
    } catch (error: any) {
      console.error("List gifts error:", error);
      res.status(500).json({ message: "Failed to list gifts" });
    }
  });

  // ===== Phase 1.3: Gifts - Revoke Gift =====
  app.post("/api/parent/gifts/:id/revoke", authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const v = validateBody(revokeGiftSchema, req.body);
      if (!v.success) return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, v.error));
      const { reason } = v.data;

      // Lock gift row
      const gift = await db.select().from(gifts).where(eq(gifts.id, id));
      if (!gift[0]) {
        return res.status(404).json({ message: "Gift not found" });
      }
      if (gift[0].parentId !== req.user.userId) {
        return res.status(403).json({ message: "Gift does not belong to you" });
      }
      if (gift[0].status === "ACTIVATED") {
        return res.status(400).json({ message: "Cannot revoke activated gift" });
      }
      if (gift[0].status === "REVOKED") {
        return res.json({ success: true, message: "Gift already revoked" });
      }

      // Update gift to REVOKED
      await db
        .update(gifts)
        .set({ status: "REVOKED", revokedAt: new Date() })
        .where(and(eq(gifts.id, id), sql`${gifts.status} IN ('SENT', 'UNLOCKED')`));

      // Revert entitlement: childId=NULL, status=ACTIVE
      const ent = await db
        .select()
        .from(entitlements)
        .where(
          and(
            eq(entitlements.productId, gift[0].productId),
            eq(entitlements.parentId, req.user.userId),
            eq(entitlements.childId, gift[0].childId)
          )
        );
      if (ent[0]) {
        await db
          .update(entitlements)
          .set({ childId: null, status: "ACTIVE", updatedAt: new Date() })
          .where(eq(entitlements.id, ent[0].id));
      }

      // Activity log
      await db.insert(activityLog).values({
        adminId: null,
        action: "GIFT_REVOKED",
        entity: "gift",
        entityId: id,
        meta: { parentId: req.user.userId, reason: reason || "parent_action" },
      });

      // Emit stub event
      emitGiftEvent({
        type: "gift.revoked",
        giftId: id,
        parentId: req.user.userId,
        childId: gift[0].childId,
        productId: gift[0].productId,
        timestamp: new Date(),
      });

      res.json({ success: true, message: "Gift revoked" });
    } catch (error: any) {
      console.error("Revoke gift error:", error);
      res.status(500).json({ message: "Failed to revoke gift" });
    }
  });

  // ===== TEACHER ASSIGNMENT REQUESTS (طلبات تعيين المعلمين) =====

  // Send assignment request to teacher
  app.post("/api/parent/teacher-assignment-request", authMiddleware, teacherAssignmentLimiter, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const v = validateBody(teacherAssignmentSchema, req.body);
      if (!v.success) return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, v.error));
      const { teacherId, childIds, monthlyPoints, perHelpPoints } = v.data;

      // Verify teacher exists and is active
      const teacher = await db.select().from(schoolTeachers)
        .where(and(eq(schoolTeachers.id, teacherId), eq(schoolTeachers.isActive, true)));
      if (!teacher[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "المعلم غير موجود"));
      }

      // Verify all children belong to this parent
      for (const childId of childIds) {
        const link = await db.select().from(parentChild)
          .where(and(eq(parentChild.parentId, parentId), eq(parentChild.childId, childId)));
        if (!link[0]) {
          return res.status(403).json(errorResponse(ErrorCode.PARENT_CHILD_MISMATCH, `الطفل ${childId} ليس مرتبطاً بحسابك`));
        }
      }

      // Check for existing pending request
      const existingPending = await db.select().from(teacherAssignmentRequests)
        .where(and(
          eq(teacherAssignmentRequests.parentId, parentId),
          eq(teacherAssignmentRequests.teacherId, teacherId),
          eq(teacherAssignmentRequests.status, "pending")
        ));

      if (existingPending[0]) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "لديك طلب معلق بالفعل لهذا المعلم"));
      }

      // Create the request
      const request = await db.insert(teacherAssignmentRequests).values({
        parentId,
        teacherId,
        monthlyPoints,
        perHelpPoints,
      }).returning();

      // Add children to the request
      for (const childId of childIds) {
        await db.insert(teacherAssignmentRequestChildren).values({
          requestId: request[0].id,
          childId,
        });
      }

      // Notify the teacher
      const parent = await db.select({ name: parents.name }).from(parents).where(eq(parents.id, parentId));
      await db.insert(notifications).values({
        teacherId,
        type: NOTIFICATION_TYPES.TEACHER_ASSIGNMENT_REQUEST,
        title: "طلب تعيين جديد",
        message: `${parent[0]?.name || "ولي أمر"} يطلب تعيينك لتدريس ${childIds.length} ${childIds.length === 1 ? "طفل" : "أطفال"} مقابل ${monthlyPoints} نقطة شهرياً + ${perHelpPoints} نقطة لكل جلسة مساعدة`,
        relatedId: request[0].id,
        metadata: { requestId: request[0].id, parentId, childIds, monthlyPoints, perHelpPoints },
      });

      res.json(successResponse({ requestId: request[0].id }));
    } catch (error: any) {
      console.error("Create teacher assignment request error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "فشل إرسال الطلب"));
    }
  });

  // List parent's assignment requests
  app.get("/api/parent/teacher-assignment-requests", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;

      const requests = await db.select({
        request: teacherAssignmentRequests,
        teacher: {
          id: schoolTeachers.id,
          name: schoolTeachers.name,
          avatarUrl: schoolTeachers.avatarUrl,
          subject: schoolTeachers.subject,
        },
      })
        .from(teacherAssignmentRequests)
        .leftJoin(schoolTeachers, eq(teacherAssignmentRequests.teacherId, schoolTeachers.id))
        .where(eq(teacherAssignmentRequests.parentId, parentId))
        .orderBy(desc(teacherAssignmentRequests.createdAt));

      const result = await Promise.all(requests.map(async (r: any) => {
        const childrenRows = await db.select({
          id: children.id,
          name: children.name,
          avatarUrl: children.avatarUrl,
        })
          .from(teacherAssignmentRequestChildren)
          .innerJoin(children, eq(teacherAssignmentRequestChildren.childId, children.id))
          .where(eq(teacherAssignmentRequestChildren.requestId, r.request.id));

        return {
          ...r.request,
          teacher: r.teacher,
          children: childrenRows,
        };
      }));

      res.json(successResponse(result));
    } catch (error: any) {
      console.error("Get parent assignment requests error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "فشل جلب الطلبات"));
    }
  });

  // Get parent's help chat requests
  app.get("/api/parent/help-requests", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;

      const staleAssigned = await db.select({
        id: taskHelpRequests.id,
        childId: taskHelpRequests.childId,
        helperType: taskHelpRequests.helperType,
        helperId: taskHelpRequests.helperId,
        taskTeacherId: tasks.teacherId,
      })
        .from(taskHelpRequests)
        .innerJoin(tasks, eq(taskHelpRequests.taskId, tasks.id))
        .innerJoin(parentChild, and(
          eq(parentChild.childId, taskHelpRequests.childId),
          eq(parentChild.parentId, parentId)
        ))
        .where(and(
          eq(taskHelpRequests.status, "active"),
          eq(taskHelpRequests.slaEscalated, false),
          or(
            eq(taskHelpRequests.helperType, "parent"),
            eq(taskHelpRequests.helperType, "teacher")
          ),
          sql`${taskHelpRequests.createdAt} <= now() - (${HELP_FIRST_RESPONSE_SLA_SECONDS} * interval '1 second')`
        ))
        .limit(20);

      for (const reqRow of staleAssigned) {
        const [helperReplies] = await db.select({ value: count(taskHelpMessages.id) })
          .from(taskHelpMessages)
          .where(and(
            eq(taskHelpMessages.helpRequestId, reqRow.id),
            eq(taskHelpMessages.senderType, reqRow.helperType as any),
            eq(taskHelpMessages.senderId, reqRow.helperId)
          ));

        if (Number(helperReplies?.value || 0) > 0) {
          continue;
        }

        let nextHelperType: "parent" | "teacher" | null = null;
        let nextHelperId = "";

        if (reqRow.helperType === "teacher") {
          nextHelperType = "parent";
          nextHelperId = parentId;
        } else if (reqRow.helperType === "parent" && reqRow.taskTeacherId) {
          const activePermission = await db.select({ id: teacherChildPermissions.id })
            .from(teacherChildPermissions)
            .where(and(
              eq(teacherChildPermissions.teacherId, reqRow.taskTeacherId),
              eq(teacherChildPermissions.childId, reqRow.childId),
              eq(teacherChildPermissions.isActive, true)
            ))
            .limit(1);

          if (activePermission[0]) {
            nextHelperType = "teacher";
            nextHelperId = reqRow.taskTeacherId;
          }
        }

        if (!nextHelperType || !nextHelperId || (nextHelperType === reqRow.helperType && nextHelperId === reqRow.helperId)) {
          continue;
        }

        const moved = await db.update(taskHelpRequests)
          .set({ helperType: nextHelperType, helperId: nextHelperId, slaEscalated: true })
          .where(and(
            eq(taskHelpRequests.id, reqRow.id),
            eq(taskHelpRequests.status, "active"),
            eq(taskHelpRequests.slaEscalated, false),
            eq(taskHelpRequests.helperType, reqRow.helperType),
            eq(taskHelpRequests.helperId, reqRow.helperId)
          ))
          .returning({ id: taskHelpRequests.id, childId: taskHelpRequests.childId });

        if (!moved[0]) {
          continue;
        }

        await db.insert(notifications).values({
          childId: moved[0].childId,
          type: NOTIFICATION_TYPES.TASK_HELP_MESSAGE,
          title: "تحويل تلقائي لطلب المساعدة",
          message: "تم تحويل طلب المساعدة تلقائياً بسبب تأخر الرد الأول.",
          relatedId: reqRow.id,
          metadata: {
            helpRequestId: reqRow.id,
            reason: "first_response_sla_timeout",
            switchedTo: nextHelperType,
          },
        });

        if (nextHelperType === "teacher") {
          await db.insert(notifications).values({
            teacherId: nextHelperId,
            type: NOTIFICATION_TYPES.TASK_HELP_REQUESTED,
            title: "طلب مساعدة محول تلقائياً",
            message: "تم تحويل طلب مساعدة إليك تلقائياً بسبب تأخر الرد الأول.",
            relatedId: reqRow.id,
            metadata: { helpRequestId: reqRow.id, reason: "first_response_sla_timeout", canClaim: false },
          });
        } else {
          await db.insert(notifications).values({
            parentId: nextHelperId,
            type: NOTIFICATION_TYPES.TASK_HELP_REQUESTED,
            title: "طلب مساعدة محول تلقائياً",
            message: "تم تحويل طلب مساعدة إليك تلقائياً بسبب تأخر الرد الأول.",
            relatedId: reqRow.id,
            metadata: { helpRequestId: reqRow.id, reason: "first_response_sla_timeout", canClaim: false },
          });
        }
      }

      const expiredUnassigned = await db.select({
        id: taskHelpRequests.id,
        childId: taskHelpRequests.childId,
        taskTeacherId: tasks.teacherId,
      })
        .from(taskHelpRequests)
        .innerJoin(tasks, eq(taskHelpRequests.taskId, tasks.id))
        .innerJoin(parentChild, and(
          eq(parentChild.childId, taskHelpRequests.childId),
          eq(parentChild.parentId, parentId)
        ))
        .where(and(
          eq(taskHelpRequests.status, "active"),
          eq(taskHelpRequests.helperType, "unassigned"),
          eq(taskHelpRequests.helperId, ""),
          sql`${taskHelpRequests.createdAt} <= now() - (${HELP_AUTO_ASSIGN_TIMEOUT_SECONDS} * interval '1 second')`
        ))
        .limit(20);

      for (const reqRow of expiredUnassigned) {
        let nextHelperType: "parent" | "teacher" = "parent";
        let nextHelperId = parentId;

        if (reqRow.taskTeacherId) {
          const activePermission = await db.select({ id: teacherChildPermissions.id })
            .from(teacherChildPermissions)
            .where(and(
              eq(teacherChildPermissions.teacherId, reqRow.taskTeacherId),
              eq(teacherChildPermissions.childId, reqRow.childId),
              eq(teacherChildPermissions.isActive, true)
            ))
            .limit(1);
          if (activePermission[0]) {
            nextHelperType = "teacher";
            nextHelperId = reqRow.taskTeacherId;
          }
        }

        await db.update(taskHelpRequests)
          .set({ helperType: nextHelperType, helperId: nextHelperId })
          .where(and(
            eq(taskHelpRequests.id, reqRow.id),
            eq(taskHelpRequests.status, "active"),
            eq(taskHelpRequests.helperType, "unassigned"),
            eq(taskHelpRequests.helperId, "")
          ));
      }

      const assignedHelpReqs = await db.select({
        helpRequest: taskHelpRequests,
        child: {
          id: children.id,
          name: children.name,
          avatarUrl: children.avatarUrl,
        },
        task: {
          id: tasks.id,
          question: tasks.question,
        },
      })
        .from(taskHelpRequests)
        .innerJoin(children, eq(taskHelpRequests.childId, children.id))
        .innerJoin(tasks, eq(taskHelpRequests.taskId, tasks.id))
        .where(and(
          eq(taskHelpRequests.helperType, "parent"),
          eq(taskHelpRequests.helperId, parentId)
        ))
        .orderBy(desc(taskHelpRequests.createdAt));

      const unclaimedHelpReqs = await db.select({
        helpRequest: taskHelpRequests,
        child: {
          id: children.id,
          name: children.name,
          avatarUrl: children.avatarUrl,
        },
        task: {
          id: tasks.id,
          question: tasks.question,
        },
      })
        .from(taskHelpRequests)
        .innerJoin(children, eq(taskHelpRequests.childId, children.id))
        .innerJoin(tasks, eq(taskHelpRequests.taskId, tasks.id))
        .innerJoin(parentChild, and(
          eq(parentChild.childId, taskHelpRequests.childId),
          eq(parentChild.parentId, parentId)
        ))
        .where(and(
          eq(taskHelpRequests.helperType, "unassigned"),
          eq(taskHelpRequests.status, "active")
        ))
        .orderBy(desc(taskHelpRequests.createdAt));

      const allRows = [...assignedHelpReqs, ...unclaimedHelpReqs].filter(
        (row, idx, arr) => arr.findIndex((x: any) => x.helpRequest.id === row.helpRequest.id) === idx
      );

      const result = allRows.map((h: any) => ({
        id: h.helpRequest.id,
        taskId: h.task.id,
        taskQuestion: h.task.question,
        childId: h.child.id,
        childName: h.child.name,
        childAvatar: h.child.avatarUrl,
        helperType: h.helpRequest.helperType,
        canClaim: h.helpRequest.helperType === "unassigned" && h.helpRequest.status === "active",
        status: h.helpRequest.status,
        createdAt: h.helpRequest.createdAt,
        resolvedAt: h.helpRequest.resolvedAt,
      }));

      res.json(successResponse(result));
    } catch (error: any) {
      console.error("Get parent help requests error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "فشل جلب طلبات المساعدة"));
    }
  });

  app.put("/api/parent/help-requests/:helpRequestId/claim", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { helpRequestId } = req.params;

      const rows = await db.select({
        helpRequest: taskHelpRequests,
        task: {
          id: tasks.id,
        },
      })
        .from(taskHelpRequests)
        .innerJoin(tasks, eq(taskHelpRequests.taskId, tasks.id))
        .where(eq(taskHelpRequests.id, helpRequestId))
        .limit(1);

      const row = rows[0];
      if (!row) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "طلب المساعدة غير موجود"));
      }

      const childLink = await db.select({ id: parentChild.id })
        .from(parentChild)
        .where(and(
          eq(parentChild.parentId, parentId),
          eq(parentChild.childId, row.helpRequest.childId)
        ))
        .limit(1);

      if (!childLink[0]) {
        return res.status(403).json(errorResponse(ErrorCode.UNAUTHORIZED, "غير مصرح لك باستلام هذا الطلب"));
      }

      if (row.helpRequest.status !== "active") {
        return res.status(409).json(errorResponse(ErrorCode.BAD_REQUEST, "هذا الطلب غير نشط"));
      }

      if (row.helpRequest.helperType === "parent" && row.helpRequest.helperId === parentId) {
        return res.json(successResponse({ claimed: true, helpRequestId }));
      }

      if (row.helpRequest.helperType !== "unassigned" || row.helpRequest.helperId !== "") {
        return res.status(409).json(errorResponse(ErrorCode.BAD_REQUEST, "تم استلام الطلب بواسطة طرف آخر"));
      }

      const updated = await db.update(taskHelpRequests)
        .set({ helperType: "parent", helperId: parentId })
        .where(and(
          eq(taskHelpRequests.id, helpRequestId),
          eq(taskHelpRequests.status, "active"),
          eq(taskHelpRequests.helperType, "unassigned"),
          eq(taskHelpRequests.helperId, "")
        ))
        .returning();

      if (!updated[0]) {
        return res.status(409).json(errorResponse(ErrorCode.BAD_REQUEST, "تم استلام الطلب بواسطة طرف آخر"));
      }

      await db.insert(notifications).values({
        childId: updated[0].childId,
        type: NOTIFICATION_TYPES.TASK_HELP_MESSAGE,
        title: "تم استلام طلب المساعدة",
        message: "تم استلام طلبك من أحد الأطراف المعنية، يمكنك متابعة الدردشة الآن",
        relatedId: helpRequestId,
        metadata: { helpRequestId, claimedBy: "parent" },
      });

      const taskRow = await db.select({ teacherId: tasks.teacherId })
        .from(tasks)
        .where(eq(tasks.id, row.helpRequest.taskId))
        .limit(1);

      if (taskRow[0]?.teacherId) {
        await db.insert(notifications).values({
          teacherId: taskRow[0].teacherId,
          type: NOTIFICATION_TYPES.TASK_HELP_MESSAGE,
          title: "تم استلام الطلب بواسطة ولي الأمر",
          message: "تم استلام طلب المساعدة من ولي الأمر، لم يعد متاحاً للاستلام",
          relatedId: helpRequestId,
          metadata: { helpRequestId, claimedBy: "parent", claimedById: parentId },
        });
      }

      res.json(successResponse({ claimed: true, helpRequestId }));
    } catch (error: any) {
      console.error("Claim parent help request error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "فشل استلام طلب المساعدة"));
    }
  });

  // Get messages for a help request (parent)
  app.get("/api/parent/help-chat/:helpRequestId/messages", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { helpRequestId } = req.params;

      const helpReq = await db.select().from(taskHelpRequests)
        .where(and(
          eq(taskHelpRequests.id, helpRequestId),
          eq(taskHelpRequests.helperType, "parent"),
          eq(taskHelpRequests.helperId, parentId)
        ));

      if (!helpReq[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "طلب المساعدة غير موجود"));
      }

      const messages = await db.select().from(taskHelpMessages)
        .where(eq(taskHelpMessages.helpRequestId, helpRequestId))
        .orderBy(taskHelpMessages.createdAt);

      res.json(successResponse(messages));
    } catch (error: any) {
      console.error("Get parent help chat messages error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "فشل جلب الرسائل"));
    }
  });

  // Send message in help chat (parent)
  app.post("/api/parent/help-chat/:helpRequestId/messages", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { helpRequestId } = req.params;
      const v = validateBody(helpChatMessageSchema, req.body);
      if (!v.success) return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, v.error));
      const { messageType, content, mediaUrl } = v.data;

      const helpReq = await db.select().from(taskHelpRequests)
        .where(and(
          eq(taskHelpRequests.id, helpRequestId),
          eq(taskHelpRequests.helperType, "parent"),
          eq(taskHelpRequests.helperId, parentId)
        ));

      if (!helpReq[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "طلب المساعدة غير موجود"));
      }

      if (helpReq[0].status !== "active") {
        return res.status(409).json(errorResponse(ErrorCode.BAD_REQUEST, "تم إغلاق جلسة المساعدة"));
      }

      const message = await db.insert(taskHelpMessages).values({
        helpRequestId,
        senderType: "parent",
        senderId: parentId,
        messageType,
        content: content || null,
        mediaUrl: mediaUrl || null,
      }).returning();

      // Notify the child
      await db.insert(notifications).values({
        childId: helpReq[0].childId,
        type: NOTIFICATION_TYPES.TASK_HELP_MESSAGE,
        title: "رسالة مساعدة جديدة",
        message: messageType === "text" ? (content?.substring(0, 50) || "لديك رسالة جديدة") : "لديك رسالة مساعدة جديدة",
        relatedId: helpRequestId,
        metadata: { helpRequestId, messageId: message[0].id },
      });

      res.json(successResponse(message[0]));
    } catch (error: any) {
      console.error("Send parent help chat message error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "فشل إرسال الرسالة"));
    }
  });

  app.get("/api/parent/help-session-payments", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const month = typeof req.query.month === "string" ? req.query.month : "";

      let whereClause: any = eq(teacherHelpSessionPayments.parentId, parentId);
      if (month && /^\d{4}-\d{2}$/.test(month)) {
        whereClause = and(
          eq(teacherHelpSessionPayments.parentId, parentId),
          sql`to_char(${teacherHelpSessionPayments.resolvedAt}, 'YYYY-MM') = ${month}`
        );
      }

      const rows = await db.select({
        payment: teacherHelpSessionPayments,
        teacher: {
          id: schoolTeachers.id,
          name: schoolTeachers.name,
          avatarUrl: schoolTeachers.avatarUrl,
        },
        child: {
          id: children.id,
          name: children.name,
        },
        task: {
          id: tasks.id,
          question: tasks.question,
        },
      })
        .from(teacherHelpSessionPayments)
        .leftJoin(schoolTeachers, eq(teacherHelpSessionPayments.teacherId, schoolTeachers.id))
        .leftJoin(children, eq(teacherHelpSessionPayments.childId, children.id))
        .leftJoin(tasks, eq(teacherHelpSessionPayments.taskId, tasks.id))
        .where(whereClause)
        .orderBy(desc(teacherHelpSessionPayments.resolvedAt));

      const totalHelpPoints = rows.reduce((sum: number, r: any) => sum + Number(r.payment.perHelpPoints || 0), 0);

      res.json(successResponse({
        month: month || null,
        summary: {
          sessionsCount: rows.length,
          totalHelpPoints,
        },
        items: rows.map((r: any) => ({
          id: r.payment.id,
          helpRequestId: r.payment.helpRequestId,
          teacher: r.teacher,
          child: r.child,
          teacherName: r.teacher?.name || "",
          childName: r.child?.name || "",
          taskQuestion: r.task?.question || "",
          pointsAmount: Number(r.payment.perHelpPoints || 0),
          perHelpPoints: Number(r.payment.perHelpPoints || 0),
          resolvedAt: r.payment.resolvedAt,
        })),
      }));
    } catch (error: any) {
      console.error("Get parent help session payments error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "فشل جلب السجل المالي للمساعدة"));
    }
  });

  // Resolve (close) a help request (parent)
  app.put("/api/parent/help-requests/:helpRequestId/resolve", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { helpRequestId } = req.params;

      const helpReq = await db.select().from(taskHelpRequests)
        .where(and(
          eq(taskHelpRequests.id, helpRequestId),
          eq(taskHelpRequests.helperType, "parent"),
          eq(taskHelpRequests.helperId, parentId)
        ));

      if (!helpReq[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "طلب المساعدة غير موجود"));
      }

      if (helpReq[0].status === "resolved") {
        return res.json(successResponse({ message: "تم الحل مسبقاً" }));
      }

      const [helperReplies] = await db.select({ value: count(taskHelpMessages.id) })
        .from(taskHelpMessages)
        .where(and(
          eq(taskHelpMessages.helpRequestId, helpRequestId),
          eq(taskHelpMessages.senderType, "parent"),
          eq(taskHelpMessages.senderId, parentId)
        ));

      if (Number(helperReplies?.value || 0) === 0) {
        return res.status(409).json(errorResponse(ErrorCode.BAD_REQUEST, "لا يمكن إغلاق طلب المساعدة قبل إرسال رد للمحادثة"));
      }

      await db.update(taskHelpRequests)
        .set({ status: "resolved", resolvedAt: new Date() })
        .where(eq(taskHelpRequests.id, helpRequestId));

      await db.insert(notifications).values({
        childId: helpReq[0].childId,
        type: NOTIFICATION_TYPES.TASK_HELP_MESSAGE,
        title: "تم إنهاء جلسة المساعدة",
        message: "تم إنهاء جلسة المساعدة. يمكنك متابعة المهمة الآن.",
        relatedId: helpRequestId,
        metadata: { helpRequestId, resolvedBy: "parent", resolvedById: parentId },
      });

      const linkedParents = await db.select({ parentId: parentChild.parentId })
        .from(parentChild)
        .where(eq(parentChild.childId, helpReq[0].childId));

      const parentsToNotify = linkedParents
        .map((p: { parentId: string }) => p.parentId)
        .filter((id: string) => id !== parentId);

      if (parentsToNotify.length > 0) {
        await db.insert(notifications).values(
          parentsToNotify.map((pid: string) => ({
            parentId: pid,
            type: NOTIFICATION_TYPES.TASK_HELP_MESSAGE,
            title: "تم إغلاق جلسة المساعدة",
            message: "انتهت جلسة المساعدة للطفل. راجعوا إن كان لديه أي استفسارات إضافية.",
            relatedId: helpRequestId,
            metadata: { helpRequestId, resolvedBy: "parent", resolvedById: parentId },
          }))
        );
      }

      res.json(successResponse({ message: "تم إغلاق طلب المساعدة" }));
    } catch (error: any) {
      console.error("Resolve parent help request error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "فشل إغلاق طلب المساعدة"));
    }
  });

  // Upload media for help chat (parent)
  app.post("/api/parent/help-chat/upload-media", authMiddleware, async (req: any, res) => {
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
      console.error("Upload parent help chat media error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "فشل رفع الملف"));
    }
  });

  // Cancel pending assignment request (parent)
  app.delete("/api/parent/teacher-assignment-request/:id", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { id } = req.params;

      const request = await db.select().from(teacherAssignmentRequests)
        .where(and(
          eq(teacherAssignmentRequests.id, id),
          eq(teacherAssignmentRequests.parentId, parentId),
          eq(teacherAssignmentRequests.status, "pending")
        ));

      if (!request[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "الطلب غير موجود أو تم الرد عليه"));
      }

      await db.delete(teacherAssignmentRequestChildren)
        .where(eq(teacherAssignmentRequestChildren.requestId, id));
      await db.delete(teacherAssignmentRequests)
        .where(eq(teacherAssignmentRequests.id, id));

      res.json(successResponse({ message: "تم إلغاء الطلب" }));
    } catch (error: any) {
      console.error("Cancel assignment request error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "فشل إلغاء الطلب"));
    }
  });

  // ===== SUBJECTS & TEMPLATE TASKS (Public for Parents) =====

  // Get all active subjects
  app.get("/api/subjects", authMiddleware, async (req: any, res) => {
    try {
      const result = await db.select().from(subjects).where(eq(subjects.isActive, true)).orderBy(subjects.name);
      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error("Fetch subjects error:", error);
      res.status(500).json({ message: "Failed to fetch subjects" });
    }
  });

  // Get template tasks for a subject
  app.get("/api/subjects/:subjectId", authMiddleware, async (req: any, res) => {
    try {
      const { subjectId } = req.params;
      const result = await db.select().from(subjects).where(eq(subjects.id, subjectId));
      if (!result[0]) {
        return res.status(404).json({ message: "Subject not found" });
      }
      res.json({ success: true, data: result[0] });
    } catch (error: any) {
      console.error("Fetch subject error:", error);
      res.status(500).json({ message: "Failed to fetch subject" });
    }
  });

  app.get("/api/subjects/:subjectId/templates", authMiddleware, async (req: any, res) => {
    try {
      const { subjectId } = req.params;
      const result = await db.select().from(templateTasks)
        .where(and(eq(templateTasks.subjectId, subjectId), eq(templateTasks.isActive, true)));
      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error("Fetch template tasks error:", error);
      res.status(500).json({ message: "Failed to fetch template tasks" });
    }
  });

  // Alias endpoint for template-tasks
  app.get("/api/subjects/:subjectId/template-tasks", authMiddleware, async (req: any, res) => {
    try {
      const { subjectId } = req.params;
      // Get only admin-created template tasks (not parent-created)
      const result = await db.select().from(templateTasks)
        .where(and(
          eq(templateTasks.subjectId, subjectId),
          eq(templateTasks.isActive, true),
          eq(templateTasks.createdByParent, false)
        ));
      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error("Fetch template tasks error:", error);
      res.status(500).json({ message: "Failed to fetch template tasks" });
    }
  });

  // Get parent's tasks with subject info
  app.get("/api/parent/tasks", authMiddleware, async (req: any, res) => {
    try {
      const result = await db
        .select({
          task: tasks,
          subject: subjects,
        })
        .from(tasks)
        .leftJoin(subjects, eq(tasks.subjectId, subjects.id))
        .where(eq(tasks.parentId, req.user.userId))
        .orderBy(sql`${tasks.createdAt} DESC`);

      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error("Fetch parent tasks error:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  // Get tasks by subject for parent's children
  app.get("/api/parent/tasks/by-subject", authMiddleware, async (req: any, res) => {
    try {
      const parentTasks = await db
        .select({
          task: tasks,
          subject: subjects,
          child: children,
        })
        .from(tasks)
        .leftJoin(subjects, eq(tasks.subjectId, subjects.id))
        .leftJoin(children, eq(tasks.childId, children.id))
        .where(eq(tasks.parentId, req.user.userId))
        .orderBy(sql`${tasks.createdAt} DESC`);

      // Group by subject
      const bySubject: Record<string, any> = {};
      for (const row of parentTasks) {
        const subjectName = row.subject?.name || "بدون مادة";
        const subjectId = row.subject?.id || "none";
        if (!bySubject[subjectId]) {
          bySubject[subjectId] = {
            subject: row.subject || { id: "none", name: "بدون مادة", emoji: "📋", color: "#999" },
            tasks: [],
          };
        }
        bySubject[subjectId].tasks.push({ ...row.task, child: row.child });
      }

      res.json({ success: true, data: Object.values(bySubject) });
    } catch (error: any) {
      console.error("Fetch tasks by subject error:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  // Create task from template
  app.post("/api/parent/create-task-from-template", authMiddleware, async (req: any, res) => {
    try {
      const startedAt = Date.now();
      const v = validateBody(createTaskFromTemplateSchema, req.body);
      if (!v.success) return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, v.error));
      const { childId, templateId, pointsReward } = v.data;
      const idempotencyKey = extractIdempotencyKey(req);

      // Verify parent owns this child
      const link = await db
        .select()
        .from(parentChild)
        .where(and(eq(parentChild.parentId, req.user.userId), eq(parentChild.childId, childId)));

      if (!link[0]) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Get template
      const template = await db.select().from(templateTasks).where(eq(templateTasks.id, templateId));
      if (!template[0]) {
        return res.status(404).json({ message: "Template not found" });
      }

      const finalReward = pointsReward || template[0].pointsReward;

      if (idempotencyKey) {
        const replayTask = await findRecentEquivalentTask({
          parentId: req.user.userId,
          childId,
          subjectId: template[0].subjectId || null,
          question: template[0].question,
          answers: Array.isArray(template[0].answers) ? template[0].answers : [],
          pointsReward: finalReward,
          imageUrl: null,
          gifUrl: null,
        });

        if (replayTask) {
          await trackTaskCreationMetric(req.user.userId, "TASK_CREATE_REPLAY_TEMPLATE", {
            endpoint: "/api/parent/create-task-from-template",
            childId,
            templateId,
            replayWindowMs: TASK_CREATE_IDEMPOTENCY_WINDOW_MS,
            durationMs: Date.now() - startedAt,
          }, req);

          return res.json(successResponse({
            taskId: replayTask.id,
            idempotentReplay: true,
            replayWindowMs: TASK_CREATE_IDEMPOTENCY_WINDOW_MS,
          }, "Task replayed safely"));
        }
      }

      // Check parent wallet balance
      const wallet = await db.select().from(parentWallet).where(eq(parentWallet.parentId, req.user.userId));
      const currentBalance = Number(wallet[0]?.balance || 0);
      if (currentBalance < finalReward) {
        return res.status(400).json({
          success: false,
          error: "INSUFFICIENT_BALANCE",
          message: `رصيدك غير كافي لإرسال هذه المهمة. الرصيد الحالي: ${currentBalance}, المطلوب: ${finalReward}`,
          currentBalance,
          pointsNeeded: finalReward,
        });
      }

      // Deduct from wallet and create task atomically
      const result = await db.transaction(async (tx: any) => {
        await tx.update(parentWallet)
          .set({
            balance: sql`${parentWallet.balance} - ${finalReward}`,
            totalSpent: sql`${parentWallet.totalSpent} + ${finalReward}`,
            updatedAt: new Date(),
          })
          .where(eq(parentWallet.parentId, req.user.userId));

        const inserted = await tx
          .insert(tasks)
          .values({
            parentId: req.user.userId,
            childId,
            subjectId: template[0].subjectId,
            question: template[0].question,
            answers: template[0].answers,
            pointsReward: finalReward,
          })
          .returning();

        return inserted;
      });

      // Send notification to child
      await createNotification({
        childId,
        type: NOTIFICATION_TYPES.TASK_ASSIGNED_ALT,
        title: "مهمة جديدة!",
        message: `لديك مهمة جديدة: ${template[0].question.substring(0, 50)}...`,
        relatedId: result[0].id,
        metadata: { taskId: result[0].id, subjectId: template[0].subjectId }
      });

      await trackTaskCreationMetric(req.user.userId, "TASK_CREATE_TEMPLATE", {
        endpoint: "/api/parent/create-task-from-template",
        childId,
        templateId,
        pointsReward: finalReward,
        durationMs: Date.now() - startedAt,
      }, req);

      res.json({ success: true, taskId: result[0].id, message: "Task created from template" });
    } catch (error: any) {
      console.error("Create task from template error:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  // Get child reports (daily/weekly/monthly)
  app.get("/api/parent/children/:childId/reports", authMiddleware, async (req: any, res) => {
    try {
      const { childId } = req.params;
      const { period = "weekly" } = req.query;

      // Verify parent owns this child
      const link = await db
        .select()
        .from(parentChild)
        .where(and(eq(parentChild.parentId, req.user.userId), eq(parentChild.childId, childId)));

      if (!link[0]) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Get child info
      const child = await db.select().from(children).where(eq(children.id, childId));
      if (!child[0]) {
        return res.status(404).json({ message: "Child not found" });
      }

      // Calculate date ranges
      const now = new Date();
      let startDate: Date;
      if (period === "daily") {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (period === "monthly") {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else {
        // weekly default
        const dayOfWeek = now.getDay();
        startDate = new Date(now);
        startDate.setDate(now.getDate() - dayOfWeek);
        startDate.setHours(0, 0, 0, 0);
      }

      // Get tasks in period
      const childTasks = await db
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.childId, childId),
            sql`${tasks.createdAt} >= ${startDate.toISOString()}`
          )
        );

      const totalTasks = childTasks.length;
      const completedTasks = childTasks.filter((t: any) => t.status === "completed").length;
      const pendingTasks = childTasks.filter((t: any) => t.status === "pending").length;
      const pointsEarned = childTasks
        .filter((t: any) => t.status === "completed")
        .reduce((sum: number, t: any) => sum + (t.pointsReward || 0), 0);

      // Calculate completion rate
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Get task breakdown by subject
      const tasksBySubject: Record<string, { total: number; completed: number; name: string }> = {};
      for (const task of childTasks) {
        const subjId = task.subjectId || "none";
        if (!tasksBySubject[subjId]) {
          const subj = await db.select().from(subjects).where(eq(subjects.id, subjId));
          tasksBySubject[subjId] = {
            total: 0,
            completed: 0,
            name: subj[0]?.name || "بدون مادة"
          };
        }
        tasksBySubject[subjId].total++;
        if (task.status === "completed") {
          tasksBySubject[subjId].completed++;
        }
      }

      res.json({
        success: true,
        data: {
          child: {
            id: child[0].id,
            name: child[0].name,
            totalPoints: child[0].totalPoints || 0,
          },
          period,
          startDate: startDate.toISOString(),
          endDate: now.toISOString(),
          summary: {
            totalTasks,
            completedTasks,
            pendingTasks,
            pointsEarned,
            completionRate,
          },
          bySubject: Object.entries(tasksBySubject).map(([id, data]) => ({
            subjectId: id,
            name: data.name,
            total: data.total,
            completed: data.completed,
            rate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
          })),
        },
      });
    } catch (error: any) {
      console.error("Fetch child reports error:", error);
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  // Get task history with child performance ratings
  app.get("/api/parent/task-history", authMiddleware, async (req: any, res) => {
    try {
      // Get all children for this parent
      const linkedChildren = await db
        .select()
        .from(parentChild)
        .where(eq(parentChild.parentId, req.user.userId));

      const childIds = linkedChildren.map((lc: any) => lc.childId);

      if (childIds.length === 0) {
        return res.json({ success: true, data: { children: [], tasks: [] } });
      }

      // Get children details
      const childrenData = await db
        .select()
        .from(children)
        .where(inArray(children.id, childIds));

      // Get all tasks for these children
      const allTasks = await db
        .select({
          task: tasks,
          subject: subjects,
        })
        .from(tasks)
        .leftJoin(subjects, eq(tasks.subjectId, subjects.id))
        .where(inArray(tasks.childId, childIds))
        .orderBy(sql`${tasks.createdAt} DESC`);

      const taskIds = allTasks.map((t: any) => t.task.id);
      const attemptsMap = new Map<string, { totalAttempts: number; failedAttempts: number; lastAttemptAt: Date | null }>();

      if (taskIds.length > 0) {
        const attempts = await db
          .select({
            taskId: taskResults.taskId,
            childId: taskResults.childId,
            totalAttempts: sql<number>`COUNT(*)`,
            failedAttempts: sql<number>`SUM(CASE WHEN ${taskResults.isCorrect} = false THEN 1 ELSE 0 END)`,
            lastAttemptAt: sql<Date>`MAX(${taskResults.completedAt})`,
          })
          .from(taskResults)
          .where(inArray(taskResults.taskId, taskIds))
          .groupBy(taskResults.taskId, taskResults.childId);

        for (const row of attempts) {
          attemptsMap.set(`${row.taskId}:${row.childId}`, {
            totalAttempts: row.totalAttempts || 0,
            failedAttempts: row.failedAttempts || 0,
            lastAttemptAt: row.lastAttemptAt || null,
          });
        }
      }

      // Calculate ratings for each child
      const childRatings = childrenData.map((child: any) => {
        const childTasks = allTasks.filter((t: any) => t.task.childId === child.id);
        const completed = childTasks.filter((t: any) => t.task.status === "completed").length;
        const total = childTasks.length;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

        // Simple rating based on completion rate
        let rating = 1;
        if (rate >= 90) rating = 5;
        else if (rate >= 70) rating = 4;
        else if (rate >= 50) rating = 3;
        else if (rate >= 30) rating = 2;

        return {
          id: child.id,
          displayName: child.displayName,
          points: child.points || 0,
          totalTasks: total,
          completedTasks: completed,
          completionRate: rate,
          rating,
        };
      });

      res.json({
        success: true,
        data: {
          children: childRatings,
          tasks: allTasks.slice(0, 50).map((t: any) => {
            const attemptStats = attemptsMap.get(`${t.task.id}:${t.task.childId}`);
            return {
              id: t.task.id,
              question: t.task.question,
              status: t.task.status,
              pointsReward: t.task.pointsReward,
              childId: t.task.childId,
              createdAt: t.task.createdAt,
              subject: t.subject ? { id: t.subject.id, name: t.subject.name, emoji: t.subject.emoji } : null,
              totalAttempts: attemptStats?.totalAttempts || 0,
              failedAttempts: attemptStats?.failedAttempts || 0,
              lastAttemptAt: attemptStats?.lastAttemptAt || null,
            };
          }),
        },
      });
    } catch (error: any) {
      console.error("Fetch task history error:", error);
      res.status(500).json({ message: "Failed to fetch task history" });
    }
  });

  // Get parent's custom tasks (my tasks)
  app.get("/api/parent/my-tasks", authMiddleware, async (req: any, res) => {
    try {
      const { subjectId } = req.query;

      let query = db.select().from(templateTasks)
        .where(and(
          eq(templateTasks.createdByParent, true),
          eq(templateTasks.parentId, req.user.userId)
        ));

      if (subjectId) {
        query = db.select().from(templateTasks)
          .where(and(
            eq(templateTasks.createdByParent, true),
            eq(templateTasks.parentId, req.user.userId),
            eq(templateTasks.subjectId, subjectId as string)
          ));
      }

      const myTasks = await query;
      res.json({ success: true, data: myTasks });
    } catch (error: any) {
      console.error("Fetch my tasks error:", error);
      res.status(500).json({ message: "Failed to fetch my tasks" });
    }
  });

  // Get public tasks from other parents
  app.get("/api/parent/public-tasks", authMiddleware, async (req: any, res) => {
    try {
      const { subjectId } = req.query;
      const parentId = req.user.userId;

      let whereConditions = and(
        eq(templateTasks.createdByParent, true),
        eq(templateTasks.isPublic, true),
        eq(templateTasks.isActive, true),
        sql`${templateTasks.parentId} != ${parentId}`
      );

      if (subjectId) {
        whereConditions = and(
          whereConditions,
          eq(templateTasks.subjectId, subjectId as string)
        );
      }

      const publicTasks = await db.select({
        id: templateTasks.id,
        title: templateTasks.title,
        question: templateTasks.question,
        answers: templateTasks.answers,
        pointsReward: templateTasks.pointsReward,
        pointsCost: templateTasks.pointsCost,
        difficulty: templateTasks.difficulty,
        subjectId: templateTasks.subjectId,
        usageCount: templateTasks.usageCount,
        createdAt: templateTasks.createdAt,
        creatorName: parents.name,
      })
        .from(templateTasks)
        .leftJoin(parents, eq(templateTasks.parentId, parents.id))
        .where(whereConditions);

      res.json({ success: true, data: publicTasks });
    } catch (error: any) {
      console.error("Fetch public tasks error:", error);
      res.status(500).json({ message: "Failed to fetch public tasks" });
    }
  });

  // Create custom task
  app.post("/api/parent/create-custom-task", authMiddleware, async (req: any, res) => {
    try {
      const { title, question, answers, pointsReward, subjectId, isPublic, pointsCost } = req.body;

      const normalizedQuestion = String(question || "").trim();

      if (!title || !normalizedQuestion || !answers || !subjectId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const normalizedAnswers = normalizeAnswersForStorage(answers, 0);
      if (normalizedAnswers.length < 2) {
        return res.status(400).json({
          message: "At least two non-empty answers are required",
        });
      }

      const correctCount = normalizedAnswers.filter((a) => a.isCorrect).length;
      if (correctCount !== 1) {
        return res.status(400).json({
          message: "Exactly one correct answer is required",
        });
      }

      const newTask = await db.insert(templateTasks).values({
        title,
        question: normalizedQuestion,
        answers: normalizedAnswers,
        pointsReward: pointsReward || 10,
        subjectId,
        difficulty: "medium",
        createdByParent: true,
        parentId: req.user.userId,
        isActive: true,
        isPublic: isPublic || false,
        pointsCost: pointsCost || 5,
      }).returning();

      await trackStickerUsagesForAnswers({
        answers: normalizedAnswers,
        usedByParentId: req.user.userId,
        templateTaskId: newTask[0].id,
      });

      res.json({ success: true, data: newTask[0] });
    } catch (error: any) {
      console.error("Create custom task error:", error);
      res.status(500).json({ message: "Failed to create custom task" });
    }
  });

  // Create and send task directly to child (with optional template save)
  app.post("/api/parent/create-and-send-task", authMiddleware, async (req: any, res) => {
    try {
      const startedAt = Date.now();
      const idempotencyKey = extractIdempotencyKey(req);
      const {
        title,
        question,
        answers,
        pointsReward,
        subjectId,
        difficulty,
        childId,
        saveAsTemplate,
        taskMedia
      } = req.body;
      const parentId = req.user.userId;

      const normalizedQuestion = String(question || "").trim();
      const hasQuestionText = normalizedQuestion.length > 0;
      const hasTaskMedia = !!String(taskMedia?.url || "").trim();

      // Validation
      if (!childId || !answers) {
        return res.status(400).json({
          success: false,
          error: "BAD_REQUEST",
          message: "الحقول المطلوبة: childId, answers"
        });
      }

      if (!hasQuestionText && !hasTaskMedia) {
        return res.status(400).json({
          success: false,
          error: "BAD_REQUEST",
          message: "أضف نص السؤال أو وسائط السؤال",
        });
      }

      if (saveAsTemplate && !hasQuestionText) {
        return res.status(400).json({
          success: false,
          error: "BAD_REQUEST",
          message: "يلزم نص السؤال لحفظ المهمة كقالب",
        });
      }

      // Security: Verify child belongs to parent via parentChild table
      const link = await db.select().from(parentChild)
        .where(and(
          eq(parentChild.parentId, parentId),
          eq(parentChild.childId, childId)
        ));

      if (!link[0]) {
        return res.status(403).json({
          success: false,
          error: "PARENT_CHILD_MISMATCH",
          message: "هذا الطفل غير مرتبط بحسابك"
        });
      }

      // ===== Daily limit & custom tasks check =====
      const settingsRows = await db.select().from(tasksSettings);
      const settings = settingsRows[0];
      const maxPerDay = settings?.maxTasksPerDay ?? 10;
      const allowCustom = settings?.allowCustomTasks ?? true;

      if (!allowCustom) {
        return res.status(403).json({
          success: false,
          error: "CUSTOM_TASKS_DISABLED",
          message: "المهام المخصصة معطلة حالياً من قبل الإدارة",
        });
      }

      // Count today's tasks for this child
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const [todayCount] = await db
        .select({ total: count() })
        .from(tasks)
        .where(
          and(
            eq(tasks.childId, childId),
            gte(tasks.createdAt, todayStart)
          )
        );
      if ((todayCount?.total ?? 0) >= maxPerDay) {
        return res.status(429).json({
          success: false,
          error: "DAILY_LIMIT_REACHED",
          message: `تم الوصول للحد الأقصى للمهام اليومية (${maxPerDay} مهام)`,
          limit: maxPerDay,
          current: todayCount?.total ?? 0,
        });
      }

      let templateTaskId = null;

      // Normalize answers to ensure each has an id and isCorrect flag
      const normalizedAnswers = normalizeAnswersForStorage(answers, 0);
      if (normalizedAnswers.length < 2) {
        return res.status(400).json({
          success: false,
          error: "BAD_REQUEST",
          message: "At least two non-empty answers are required",
        });
      }

      const correctCount = normalizedAnswers.filter((a) => a.isCorrect).length;
      if (correctCount !== 1) {
        return res.status(400).json({
          success: false,
          error: "BAD_REQUEST",
          message: "Exactly one correct answer is required",
        });
      }

      const parsedReward = Number(pointsReward);
      const finalReward = Number.isFinite(parsedReward) ? Math.max(0, Math.trunc(parsedReward)) : 10;
      const questionForStorage = hasQuestionText ? normalizedQuestion : "سؤال وسائط";

      if (idempotencyKey) {
        const replayTask = await findRecentEquivalentTask({
          parentId,
          childId,
          subjectId: subjectId || null,
          question: questionForStorage,
          answers: normalizedAnswers,
          pointsReward: finalReward,
          imageUrl: taskMedia?.url || null,
          gifUrl: null,
        });

        if (replayTask) {
          await trackTaskCreationMetric(parentId, "TASK_CREATE_REPLAY_SEND", {
            endpoint: "/api/parent/create-and-send-task",
            childId,
            subjectId: subjectId || null,
            replayWindowMs: TASK_CREATE_IDEMPOTENCY_WINDOW_MS,
            durationMs: Date.now() - startedAt,
          }, req);

          return res.json(successResponse({
            task: replayTask,
            templateTaskId,
            idempotentReplay: true,
            replayWindowMs: TASK_CREATE_IDEMPOTENCY_WINDOW_MS,
          }, "Task replayed safely"));
        }
      }

      // Check parent wallet balance
      const wallet = await db.select().from(parentWallet).where(eq(parentWallet.parentId, parentId));
      const currentBalance = Number(wallet[0]?.balance || 0);
      if (currentBalance < finalReward) {
        return res.status(400).json({
          success: false,
          error: "INSUFFICIENT_BALANCE",
          message: `رصيدك غير كافي لإرسال هذه المهمة. الرصيد الحالي: ${currentBalance}, المطلوب: ${finalReward}`,
          currentBalance,
          pointsNeeded: finalReward,
        });
      }

      // Optionally save as template for reuse
      if (saveAsTemplate && title && subjectId) {
        const templateResult = await db.insert(templateTasks).values({
          title,
          question: questionForStorage,
          answers: normalizedAnswers,
          pointsReward: finalReward,
          subjectId,
          difficulty: difficulty || "medium",
          createdByParent: true,
          parentId,
          isActive: true,
          isPublic: false,
          pointsCost: 5,
        }).returning();
        templateTaskId = templateResult[0]?.id;

        await trackStickerUsagesForAnswers({
          answers: normalizedAnswers,
          usedByParentId: parentId,
          templateTaskId,
        });
      }

      // Deduct from wallet and create task atomically
      const newTask = await db.transaction(async (tx: any) => {
        await tx.update(parentWallet)
          .set({
            balance: sql`${parentWallet.balance} - ${finalReward}`,
            totalSpent: sql`${parentWallet.totalSpent} + ${finalReward}`,
            updatedAt: new Date(),
          })
          .where(eq(parentWallet.parentId, parentId));

        const inserted = await tx.insert(tasks).values({
          parentId,
          childId,
          subjectId: subjectId || null,
          question: questionForStorage,
          answers: normalizedAnswers,
          pointsReward: finalReward,
          status: "pending",
          imageUrl: taskMedia?.url || null,
        }).returning();

        return inserted;
      });

      await trackStickerUsagesForAnswers({
        answers: normalizedAnswers,
        usedByParentId: parentId,
        taskId: newTask[0].id,
      });

      // Send notification to child
      await createNotification({
        childId,
        type: NOTIFICATION_TYPES.TASK_ASSIGNED,
        title: "مهمة جديدة!",
        message: `لديك مهمة جديدة${title ? `: ${title}` : ""}`,
        relatedId: newTask[0].id,
        metadata: { taskId: newTask[0].id },
      });

      await db.insert(outboxEvents).values({
        type: "TASK_ASSIGNED_NOTIFY",
        payloadJson: {
          taskId: newTask[0].id,
          childId,
          parentId,
          title: title || null,
          source: "create-and-send-task",
        },
      });

      await trackTaskCreationMetric(parentId, "TASK_CREATE_SEND", {
        endpoint: "/api/parent/create-and-send-task",
        childId,
        subjectId: subjectId || null,
        saveAsTemplate: !!saveAsTemplate,
        pointsReward: finalReward,
        durationMs: Date.now() - startedAt,
      }, req);

      res.json({
        success: true,
        data: {
          task: newTask[0],
          templateTaskId
        }
      });
    } catch (error: any) {
      console.error("Create and send task error:", error);
      res.status(500).json({
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message: "فشل في إنشاء وإرسال المهمة"
      });
    }
  });

  // Send template task to child (with payment for public tasks)
  app.post("/api/parent/send-template-task", authMiddleware, async (req: any, res) => {
    try {
      const startedAt = Date.now();
      const idempotencyKey = extractIdempotencyKey(req);
      const { templateTaskId, childId, points } = req.body;
      const buyerParentId = req.user.userId;

      if (!templateTaskId || !childId) {
        return res.status(400).json({ message: "Template task ID and child ID are required" });
      }

      // Verify child belongs to parent
      const link = await db.select().from(parentChild)
        .where(and(eq(parentChild.parentId, buyerParentId), eq(parentChild.childId, childId)));

      if (!link[0]) {
        return res.status(403).json({ message: "Child not linked to this parent" });
      }

      // ===== Daily limit check =====
      const settingsRows2 = await db.select().from(tasksSettings);
      const maxPerDay2 = settingsRows2[0]?.maxTasksPerDay ?? 10;
      const todayStart2 = new Date();
      todayStart2.setHours(0, 0, 0, 0);
      const [todayCount2] = await db
        .select({ total: count() })
        .from(tasks)
        .where(and(eq(tasks.childId, childId), gte(tasks.createdAt, todayStart2)));
      if ((todayCount2?.total ?? 0) >= maxPerDay2) {
        return res.status(429).json({
          success: false,
          error: "DAILY_LIMIT_REACHED",
          message: `تم الوصول للحد الأقصى للمهام اليومية (${maxPerDay2} مهام)`,
        });
      }

      // Get template task
      const template = await db.select().from(templateTasks).where(eq(templateTasks.id, templateTaskId));
      if (!template[0]) {
        return res.status(404).json({ message: "Template task not found" });
      }

      const finalReward = points || template[0].pointsReward;

      if (idempotencyKey) {
        const replayTask = await findRecentEquivalentTask({
          parentId: buyerParentId,
          childId,
          subjectId: template[0].subjectId || null,
          question: template[0].question,
          answers: Array.isArray(template[0].answers) ? template[0].answers : [],
          pointsReward: finalReward,
          imageUrl: null,
          gifUrl: null,
        });

        if (replayTask) {
          await trackTaskCreationMetric(buyerParentId, "TASK_CREATE_REPLAY_SEND_TEMPLATE", {
            endpoint: "/api/parent/send-template-task",
            childId,
            templateTaskId,
            replayWindowMs: TASK_CREATE_IDEMPOTENCY_WINDOW_MS,
            durationMs: Date.now() - startedAt,
          }, req);

          return res.json(successResponse({
            task: replayTask,
            idempotentReplay: true,
            replayWindowMs: TASK_CREATE_IDEMPOTENCY_WINDOW_MS,
          }, "Task replayed safely"));
        }
      }

      // If it's a public task from another parent, handle payment
      if (template[0].isPublic && template[0].parentId && template[0].parentId !== buyerParentId) {
        const pointsCost = template[0].pointsCost || 5;
        const commission = Math.ceil(pointsCost * 0.10);
        const sellerReceives = pointsCost - commission;
        let pointsAvailable = 0;

        try {
          await db.transaction(async (tx: any) => {
            const childData = await tx.select().from(children).where(eq(children.id, childId));
            pointsAvailable = childData[0]?.totalPoints || 0;

            if (!childData[0] || pointsAvailable < pointsCost) {
              throw new Error("INSUFFICIENT_POINTS");
            }

            await applyPointsDelta(tx, {
              childId,
              delta: -pointsCost,
              reason: "TEMPLATE_TASK_PURCHASE",
              requestId: templateTaskId,
              minBalance: 0,
              clampToMinBalance: false,
            });

            const sellerChildren = await tx.select()
              .from(parentChild)
              .where(eq(parentChild.parentId, template[0].parentId))
              .orderBy(parentChild.linkedAt);

            if (sellerChildren.length > 0 && sellerChildren[0].childId) {
              await applyPointsDelta(tx, {
                childId: sellerChildren[0].childId,
                delta: sellerReceives,
                reason: "TEMPLATE_TASK_SALE",
                requestId: templateTaskId,
              });
            }

            await tx.update(templateTasks)
              .set({ usageCount: sql`${templateTasks.usageCount} + 1` })
              .where(eq(templateTasks.id, templateTaskId));

            await tx.insert(profitTransactions).values({
              sellerId: template[0].parentId,
              buyerId: buyerParentId,
              templateTaskId: templateTaskId,
              totalPoints: pointsCost,
              sellerEarnings: sellerReceives,
              appCommission: commission,
              commissionRate: 10,
            });
          });
        } catch (error: any) {
          if (error?.message === "INSUFFICIENT_POINTS") {
            return res.status(400).json({
              message: "نقاط الطفل غير كافية",
              pointsNeeded: pointsCost,
              pointsAvailable,
            });
          }
          throw error;
        }

        const sellerChildren = await db.select()
          .from(parentChild)
          .where(eq(parentChild.parentId, template[0].parentId))
          .orderBy(parentChild.linkedAt);

        if (sellerChildren.length > 0 && sellerChildren[0].childId) {
          await createNotification({
            childId: sellerChildren[0].childId,
            type: NOTIFICATION_TYPES.REWARD,
            title: "مكافأة!",
            message: `حصلت على ${sellerReceives} نقطة من مشاركة مهمة!`,
            metadata: { points: sellerReceives, taskId: template[0].id },
          });
        }
      }

      // Check parent wallet balance before creating task
      const buyerWallet = await db.select().from(parentWallet).where(eq(parentWallet.parentId, buyerParentId));
      const buyerBalance = Number(buyerWallet[0]?.balance || 0);
      if (buyerBalance < finalReward) {
        return res.status(400).json({
          success: false,
          error: "INSUFFICIENT_BALANCE",
          message: `رصيدك غير كافي لإرسال هذه المهمة. الرصيد الحالي: ${buyerBalance}, المطلوب: ${finalReward}`,
          currentBalance: buyerBalance,
          pointsNeeded: finalReward,
        });
      }

      // Deduct from wallet and create task atomically
      const newTask = await db.transaction(async (tx: any) => {
        await tx.update(parentWallet)
          .set({
            balance: sql`${parentWallet.balance} - ${finalReward}`,
            totalSpent: sql`${parentWallet.totalSpent} + ${finalReward}`,
            updatedAt: new Date(),
          })
          .where(eq(parentWallet.parentId, buyerParentId));

        const inserted = await tx.insert(tasks).values({
          parentId: buyerParentId,
          childId,
          subjectId: template[0].subjectId,
          question: template[0].question,
          answers: template[0].answers,
          pointsReward: finalReward,
          status: "pending",
        }).returning();

        return inserted;
      });

      await trackStickerUsagesForAnswers({
        answers: Array.isArray(template[0].answers) ? template[0].answers : [],
        usedByParentId: buyerParentId,
        taskId: newTask[0].id,
        templateTaskId,
      });

      // Send notification to child
      await createNotification({
        childId,
        type: NOTIFICATION_TYPES.TASK_ASSIGNED,
        title: "مهمة جديدة!",
        message: `لديك مهمة جديدة: ${template[0].title}`,
        relatedId: newTask[0].id,
        metadata: { taskId: newTask[0].id },
      });

      await db.insert(outboxEvents).values({
        type: "TASK_ASSIGNED_NOTIFY",
        payloadJson: {
          taskId: newTask[0].id,
          childId,
          parentId: buyerParentId,
          title: template[0].title || null,
          source: "send-template-task",
        },
      });

      await trackTaskCreationMetric(buyerParentId, "TASK_CREATE_SEND_TEMPLATE", {
        endpoint: "/api/parent/send-template-task",
        childId,
        templateTaskId,
        pointsReward: finalReward,
        durationMs: Date.now() - startedAt,
      }, req);

      res.json({ success: true, data: newTask[0] });
    } catch (error: any) {
      console.error("Send template task error:", error);
      res.status(500).json({ message: "Failed to send task" });
    }
  });

  // Update custom task (full edit capability)
  const updateTaskSchema = z.object({
    title: z.string().min(1).optional(),
    question: z.string().min(1).optional(),
    answers: z.array(z.object({
      id: z.string(),
      text: z.union([
        z.string(),
        z.object({ text: z.string() }),
      ]).transform((value) => (typeof value === "string" ? value : value.text)),
      isCorrect: z.boolean(),
      imageUrl: z.string().url().optional().or(z.literal("")).optional(),
      media: z.object({
        objectPath: z.string().optional(),
        url: z.string().max(4096),
        mimeType: z.string().optional(),
        size: z.number().int().nonnegative().optional(),
        width: z.number().int().positive().optional(),
        height: z.number().int().positive().optional(),
        purpose: z.string().optional(),
      }).optional(),
      stickerId: z.string().optional(),
      stickerVariant: z.enum(["full", "circle", "rounded", "diamond"]).optional(),
    })).optional(),
    pointsReward: z.number().int().positive().optional(),
    subjectId: z.preprocess(
      (value) => {
        if (typeof value !== "string") return value;
        const trimmed = value.trim();
        return trimmed ? trimmed : undefined;
      },
      z.string().uuid().optional()
    ),
    isPublic: z.boolean().optional(),
    pointsCost: z.number().int().min(0).optional(),
  });

  app.patch("/api/parent/my-tasks/:taskId", authMiddleware, async (req: any, res) => {
    try {
      const { taskId } = req.params;

      const validation = updateTaskSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid request data", errors: validation.error.errors });
      }

      const { title, question, answers, pointsReward, subjectId, isPublic, pointsCost } = validation.data;

      // Verify task belongs to parent
      const task = await db.select().from(templateTasks)
        .where(and(eq(templateTasks.id, taskId), eq(templateTasks.parentId, req.user.userId)));

      if (!task[0]) {
        return res.status(404).json({ message: "Task not found" });
      }

      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (question !== undefined) updateData.question = question;
      if (answers !== undefined) {
        const normalizedAnswers = normalizeAnswersForStorage(answers, 0);
        if (normalizedAnswers.length < 2) {
          return res.status(400).json({ message: "At least two non-empty answers are required" });
        }

        const correctCount = normalizedAnswers.filter((a) => a.isCorrect).length;
        if (correctCount !== 1) {
          return res.status(400).json({ message: "Exactly one correct answer is required" });
        }

        updateData.answers = normalizedAnswers;
      }
      if (pointsReward !== undefined) updateData.pointsReward = pointsReward;
      if (subjectId !== undefined) updateData.subjectId = subjectId;
      if (isPublic !== undefined) updateData.isPublic = isPublic;
      if (pointsCost !== undefined) updateData.pointsCost = pointsCost;

      const updated = await db.update(templateTasks)
        .set(updateData)
        .where(eq(templateTasks.id, taskId))
        .returning();

      if (answers !== undefined) {
        await trackStickerUsagesForAnswers({
          answers: updateData.answers,
          usedByParentId: req.user.userId,
          templateTaskId: taskId,
        });
      }

      res.json({ success: true, data: updated[0] });
    } catch (error: any) {
      console.error("Update task error:", error);
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  // Save a sticker generated from uploaded image to "My Stickers"
  app.post("/api/parent/stickers", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const body = z.object({
        name: z.string().min(1).max(120),
        sourceImageUrl: z.string().max(4096).optional(),
        variant: z.enum(["full", "circle", "rounded", "diamond"]).default("full"),
        stickerMedia: z.object({
          objectPath: z.string().optional(),
          url: z.string().max(4096),
          mimeType: z.string().optional(),
          size: z.number().int().nonnegative().optional(),
          width: z.number().int().positive().optional(),
          height: z.number().int().positive().optional(),
          purpose: z.string().optional(),
        }),
      }).parse(req.body || {});

      const [created] = await db.insert(parentStickers).values({
        parentId,
        name: body.name,
        sourceImageUrl: body.sourceImageUrl || null,
        variant: body.variant,
        stickerMedia: body.stickerMedia,
      }).returning();

      res.json(successResponse(created, "Sticker saved"));
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, error.message));
      }
      console.error("Create sticker error:", error);
      return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to save sticker"));
    }
  });

  // Get current parent's saved stickers + usage analytics
  app.get("/api/parent/stickers/my", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const stickers = await db.select().from(parentStickers)
        .where(and(eq(parentStickers.parentId, parentId), eq(parentStickers.isActive, true)))
        .orderBy(desc(parentStickers.createdAt));

      const data = await Promise.all(stickers.map(async (sticker: any) => {
        const [usage] = await db
          .select({
            uniqueParentsUsed: sql<number>`count(distinct ${parentStickerUsages.usedByParentId})`,
            totalUsageRows: sql<number>`count(*)`,
          })
          .from(parentStickerUsages)
          .where(eq(parentStickerUsages.stickerId, sticker.id));

        return {
          ...sticker,
          uniqueParentsUsed: Number(usage?.uniqueParentsUsed || 0),
          totalUsageRows: Number(usage?.totalUsageRows || 0),
        };
      }));

      return res.json(successResponse(data, "My stickers"));
    } catch (error: any) {
      console.error("Get my stickers error:", error);
      return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch stickers"));
    }
  });

  // ===== Scheduled Tasks =====

  // Get scheduled tasks for parent
  app.get("/api/parent/scheduled-tasks", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const scheduled = await db.select().from(scheduledTasks)
        .where(eq(scheduledTasks.parentId, parentId));

      // Get child names
      const scheduledWithChildren = await Promise.all(scheduled.map(async (task: any) => {
        const child = await db.select().from(children).where(eq(children.id, task.childId));
        return {
          ...task,
          childName: child[0]?.name || "Unknown",
        };
      }));

      res.json({ success: true, data: scheduledWithChildren });
    } catch (error: any) {
      console.error("Get scheduled tasks error:", error);
      res.status(500).json({ message: "Failed to fetch scheduled tasks" });
    }
  });

  // Create scheduled task
  app.post("/api/parent/scheduled-tasks", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { childId, templateTaskId, question, answers, pointsReward, scheduledAt } = req.body;

      if (!childId || !question || !answers || !scheduledAt) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Verify child belongs to parent
      const childLink = await db.select().from(parentChild)
        .where(and(eq(parentChild.parentId, parentId), eq(parentChild.childId, childId)));

      if (!childLink[0]) {
        return res.status(403).json({ message: "Child not linked to parent" });
      }

      const scheduled = await db.insert(scheduledTasks).values({
        parentId,
        childId,
        templateTaskId: templateTaskId || null,
        question,
        answers,
        pointsReward: pointsReward || 10,
        scheduledAt: new Date(scheduledAt),
      }).returning();

      res.json({ success: true, data: scheduled[0] });
    } catch (error: any) {
      console.error("Create scheduled task error:", error);
      res.status(500).json({ message: "Failed to create scheduled task" });
    }
  });

  // Cancel scheduled task
  app.patch("/api/parent/scheduled-tasks/:id/cancel", authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const parentId = req.user.userId;

      const scheduled = await db.select().from(scheduledTasks)
        .where(and(eq(scheduledTasks.id, id), eq(scheduledTasks.parentId, parentId)));

      if (!scheduled[0]) {
        return res.status(404).json({ message: "Scheduled task not found" });
      }

      if (scheduled[0].status !== "pending") {
        return res.status(400).json({ message: "Cannot cancel non-pending task" });
      }

      const updated = await db.update(scheduledTasks)
        .set({ status: "cancelled" })
        .where(eq(scheduledTasks.id, id))
        .returning();

      res.json({ success: true, data: updated[0] });
    } catch (error: any) {
      console.error("Cancel scheduled task error:", error);
      res.status(500).json({ message: "Failed to cancel scheduled task" });
    }
  });

  // Delete scheduled task
  app.delete("/api/parent/scheduled-tasks/:id", authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const parentId = req.user.userId;

      const scheduled = await db.select().from(scheduledTasks)
        .where(and(eq(scheduledTasks.id, id), eq(scheduledTasks.parentId, parentId)));

      if (!scheduled[0]) {
        return res.status(404).json({ message: "Scheduled task not found" });
      }

      await db.delete(scheduledTasks).where(eq(scheduledTasks.id, id));

      res.json({ success: true, message: "Scheduled task deleted" });
    } catch (error: any) {
      console.error("Delete scheduled task error:", error);
      res.status(500).json({ message: "Failed to delete scheduled task" });
    }
  });

  // ===== Scheduled Sessions (جلسات المهام المجدولة) =====

  // Get all scheduled sessions for parent
  app.get("/api/parent/scheduled-sessions", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const sessions = await db.select().from(scheduledSessions)
        .where(eq(scheduledSessions.parentId, parentId))
        .orderBy(desc(scheduledSessions.createdAt));

      // Enrich with child names and task list
      const enriched = await Promise.all(sessions.map(async (session: any) => {
        const child = await db.select().from(children).where(eq(children.id, session.childId));
        const sessionTasks = await db.select().from(scheduledSessionTasks)
          .where(eq(scheduledSessionTasks.sessionId, session.id))
          .orderBy(scheduledSessionTasks.orderIndex);

        return {
          ...session,
          childName: child[0]?.name || "Unknown",
          childAvatar: child[0]?.avatarUrl || null,
          tasks: sessionTasks,
        };
      }));

      res.json({ success: true, data: enriched });
    } catch (error: any) {
      console.error("Get scheduled sessions error:", error);
      res.status(500).json({ success: false, error: "INTERNAL_SERVER_ERROR", message: "فشل في جلب الجلسات المجدولة" });
    }
  });

  // Get single scheduled session with tasks
  app.get("/api/parent/scheduled-sessions/:id", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { id } = req.params;

      const session = await db.select().from(scheduledSessions)
        .where(and(eq(scheduledSessions.id, id), eq(scheduledSessions.parentId, parentId)));

      if (!session[0]) {
        return res.status(404).json({ success: false, error: "NOT_FOUND", message: "الجلسة غير موجودة" });
      }

      const child = await db.select().from(children).where(eq(children.id, session[0].childId));
      const sessionTasks = await db.select().from(scheduledSessionTasks)
        .where(eq(scheduledSessionTasks.sessionId, id))
        .orderBy(scheduledSessionTasks.orderIndex);

      res.json({
        success: true,
        data: {
          ...session[0],
          childName: child[0]?.name || "Unknown",
          childAvatar: child[0]?.avatarUrl || null,
          tasks: sessionTasks,
        },
      });
    } catch (error: any) {
      console.error("Get scheduled session error:", error);
      res.status(500).json({ success: false, error: "INTERNAL_SERVER_ERROR", message: "فشل في جلب الجلسة" });
    }
  });

  // Create scheduled session with tasks
  app.post("/api/parent/scheduled-sessions", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const {
        childId,
        title,
        description,
        intervalMinutes,
        activationType,
        scheduledStartAt,
        tasks: sessionTasksList,
      } = req.body;

      // Validate required fields
      if (!childId || !title || !sessionTasksList || !Array.isArray(sessionTasksList) || sessionTasksList.length === 0) {
        return res.status(400).json({
          success: false,
          error: "BAD_REQUEST",
          message: "يجب تحديد الطفل والعنوان وإضافة مهمة واحدة على الأقل",
        });
      }

      // Verify child belongs to parent
      const childLink = await db.select().from(parentChild)
        .where(and(eq(parentChild.parentId, parentId), eq(parentChild.childId, childId)));

      if (!childLink[0]) {
        return res.status(403).json({
          success: false,
          error: "PARENT_CHILD_MISMATCH",
          message: "هذا الطفل غير مرتبط بحسابك",
        });
      }

      // Validate activation type
      const validActivationTypes = ["on_login", "immediate", "scheduled"];
      const finalActivationType = validActivationTypes.includes(activationType) ? activationType : "on_login";

      if (finalActivationType === "scheduled" && !scheduledStartAt) {
        return res.status(400).json({
          success: false,
          error: "BAD_REQUEST",
          message: "يجب تحديد وقت البدء للجلسة المجدولة",
        });
      }

      // Validate each task in the session
      for (let i = 0; i < sessionTasksList.length; i++) {
        const t = sessionTasksList[i];
        if (!t.question || !t.answers || !Array.isArray(t.answers) || t.answers.length < 2) {
          return res.status(400).json({
            success: false,
            error: "BAD_REQUEST",
            message: `المهمة رقم ${i + 1} غير مكتملة. يجب أن تحتوي على سؤال وإجابتين على الأقل`,
          });
        }
        const normalizedAnswers = normalizeAnswersForStorage(t.answers, 0);
        const correctCount = normalizedAnswers.filter((a: any) => a.isCorrect).length;
        if (correctCount !== 1) {
          return res.status(400).json({
            success: false,
            error: "BAD_REQUEST",
            message: `المهمة رقم ${i + 1} يجب أن تحتوي على إجابة صحيحة واحدة فقط`,
          });
        }
      }

      // Calculate total points for session
      const totalPointsReward = sessionTasksList.reduce((sum: number, t: any) => sum + (t.pointsReward || 10), 0);

      // Check parent wallet balance for total session cost
      const wallet = await db.select().from(parentWallet).where(eq(parentWallet.parentId, parentId));
      const currentBalance = Number(wallet[0]?.balance || 0);
      if (currentBalance < totalPointsReward) {
        return res.status(400).json({
          success: false,
          error: "INSUFFICIENT_BALANCE",
          message: `رصيدك غير كافي. الرصيد الحالي: ${currentBalance}, المطلوب: ${totalPointsReward}`,
          currentBalance,
          pointsNeeded: totalPointsReward,
        });
      }

      // Create session and tasks atomically with wallet deduction
      const result = await db.transaction(async (tx: any) => {
        // Deduct from wallet with balance guard (prevents race condition)
        const updatedWallet = await tx.update(parentWallet)
          .set({
            balance: sql`${parentWallet.balance} - ${totalPointsReward}`,
            totalSpent: sql`${parentWallet.totalSpent} + ${totalPointsReward}`,
            updatedAt: new Date(),
          })
          .where(and(
            eq(parentWallet.parentId, parentId),
            sql`${parentWallet.balance} >= ${totalPointsReward}`
          ))
          .returning();

        if (!updatedWallet[0]) {
          throw new Error("INSUFFICIENT_BALANCE");
        }

        // Create session
        const [newSession] = await tx.insert(scheduledSessions).values({
          parentId,
          childId,
          title,
          description: description || null,
          intervalMinutes: intervalMinutes || 15,
          activationType: finalActivationType,
          scheduledStartAt: scheduledStartAt ? new Date(scheduledStartAt) : null,
          totalTasks: sessionTasksList.length,
          totalPointsReward,
          status: finalActivationType === "immediate" ? "active" : "draft",
        }).returning();

        // Create session tasks
        const createdTasks = [];
        for (let i = 0; i < sessionTasksList.length; i++) {
          const t = sessionTasksList[i];
          const normalizedAnswers = normalizeAnswersForStorage(t.answers, 0);

          const [sessionTask] = await tx.insert(scheduledSessionTasks).values({
            sessionId: newSession.id,
            orderIndex: i + 1,
            templateTaskId: t.templateTaskId || null,
            question: t.question,
            answers: normalizedAnswers,
            pointsReward: t.pointsReward || 10,
            imageUrl: t.imageUrl || null,
            status: "locked",
          }).returning();

          createdTasks.push(sessionTask);
        }

        // If immediate activation, unlock first task and create actual task
        if (finalActivationType === "immediate") {
          const firstTask = createdTasks[0];
          if (firstTask) {
            // Create real task
            const [realTask] = await tx.insert(tasks).values({
              parentId,
              childId,
              question: firstTask.question,
              answers: firstTask.answers,
              pointsReward: firstTask.pointsReward,
              status: "pending",
              imageUrl: firstTask.imageUrl,
            }).returning();

            // Update session task status
            await tx.update(scheduledSessionTasks)
              .set({ status: "unlocked", unlockedAt: new Date(), taskId: realTask.id })
              .where(eq(scheduledSessionTasks.id, firstTask.id));

            // Update session
            await tx.update(scheduledSessions)
              .set({ actualStartAt: new Date() })
              .where(eq(scheduledSessions.id, newSession.id));
          }
        }

        return { session: newSession, tasks: createdTasks };
      });

      // Notify child about session
      await createNotification({
        childId,
        type: NOTIFICATION_TYPES.SCHEDULED_SESSION_CREATED,
        title: "جلسة مهام جديدة!",
        message: `لديك جلسة مهام جديدة: ${title} (${sessionTasksList.length} مهام)`,
        relatedId: result.session.id,
        metadata: {
          sessionId: result.session.id,
          totalTasks: sessionTasksList.length,
          activationType: finalActivationType,
        },
      });

      // If immediate, also notify about first unlocked task
      if (finalActivationType === "immediate") {
        await createNotification({
          childId,
          type: NOTIFICATION_TYPES.SCHEDULED_TASK_UNLOCKED,
          title: "مهمة متاحة!",
          message: `المهمة الأولى في جلسة "${title}" متاحة الآن`,
          relatedId: result.session.id,
          metadata: { sessionId: result.session.id, taskOrder: 1 },
        });
      }

      // Notify parent about session
      await createNotification({
        parentId,
        type: NOTIFICATION_TYPES.SCHEDULED_SESSION_CREATED,
        title: "تم إنشاء جلسة مجدولة",
        message: `تم إنشاء جلسة "${title}" بنجاح (${sessionTasksList.length} مهام)`,
        relatedId: result.session.id,
        metadata: { sessionId: result.session.id },
      });

      res.json({
        success: true,
        data: result,
        message: "تم إنشاء الجلسة المجدولة بنجاح",
      });
    } catch (error: any) {
      console.error("Create scheduled session error:", error);
      res.status(500).json({
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message: "فشل في إنشاء الجلسة المجدولة",
      });
    }
  });

  // Activate scheduled session manually
  app.patch("/api/parent/scheduled-sessions/:id/activate", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { id } = req.params;

      const session = await db.select().from(scheduledSessions)
        .where(and(eq(scheduledSessions.id, id), eq(scheduledSessions.parentId, parentId)));

      if (!session[0]) {
        return res.status(404).json({ success: false, error: "NOT_FOUND", message: "الجلسة غير موجودة" });
      }

      if (session[0].status !== "draft" && session[0].status !== "paused") {
        return res.status(400).json({
          success: false,
          error: "BAD_REQUEST",
          message: "لا يمكن تفعيل هذه الجلسة. الحالة الحالية: " + session[0].status,
        });
      }

      // Find the next locked task to unlock
      const nextTask = await db.select().from(scheduledSessionTasks)
        .where(and(
          eq(scheduledSessionTasks.sessionId, id),
          eq(scheduledSessionTasks.status, "locked")
        ))
        .orderBy(scheduledSessionTasks.orderIndex)
        .limit(1);

      await db.transaction(async (tx: any) => {
        // Update session status
        await tx.update(scheduledSessions)
          .set({
            status: "active",
            actualStartAt: session[0].actualStartAt || new Date(),
            pausedAt: null,
            updatedAt: new Date(),
          })
          .where(eq(scheduledSessions.id, id));

        // Unlock first/next task if available
        if (nextTask[0]) {
          // Create real task
          const [realTask] = await tx.insert(tasks).values({
            parentId,
            childId: session[0].childId,
            question: nextTask[0].question,
            answers: nextTask[0].answers,
            pointsReward: nextTask[0].pointsReward,
            status: "pending",
            imageUrl: nextTask[0].imageUrl,
          }).returning();

          await tx.update(scheduledSessionTasks)
            .set({ status: "unlocked", unlockedAt: new Date(), taskId: realTask.id })
            .where(eq(scheduledSessionTasks.id, nextTask[0].id));
        }
      });

      // Notify child
      await createNotification({
        childId: session[0].childId,
        type: NOTIFICATION_TYPES.SCHEDULED_SESSION_ACTIVATED,
        title: "جلسة المهام بدأت!",
        message: `جلسة "${session[0].title}" أصبحت نشطة. ابدأ بحل المهام!`,
        relatedId: id,
        metadata: { sessionId: id },
      });

      if (nextTask[0]) {
        await createNotification({
          childId: session[0].childId,
          type: NOTIFICATION_TYPES.SCHEDULED_TASK_UNLOCKED,
          title: "مهمة متاحة!",
          message: `المهمة رقم ${nextTask[0].orderIndex} في جلسة "${session[0].title}" متاحة الآن`,
          relatedId: id,
          metadata: { sessionId: id, taskOrder: nextTask[0].orderIndex },
        });
      }

      res.json({ success: true, message: "تم تفعيل الجلسة بنجاح" });
    } catch (error: any) {
      console.error("Activate scheduled session error:", error);
      res.status(500).json({ success: false, error: "INTERNAL_SERVER_ERROR", message: "فشل في تفعيل الجلسة" });
    }
  });

  // Pause scheduled session
  app.patch("/api/parent/scheduled-sessions/:id/pause", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { id } = req.params;

      const session = await db.select().from(scheduledSessions)
        .where(and(eq(scheduledSessions.id, id), eq(scheduledSessions.parentId, parentId)));

      if (!session[0]) {
        return res.status(404).json({ success: false, error: "NOT_FOUND", message: "الجلسة غير موجودة" });
      }

      if (session[0].status !== "active") {
        return res.status(400).json({
          success: false,
          error: "BAD_REQUEST",
          message: "لا يمكن إيقاف جلسة غير نشطة",
        });
      }

      await db.update(scheduledSessions)
        .set({ status: "paused", pausedAt: new Date(), updatedAt: new Date() })
        .where(eq(scheduledSessions.id, id));

      res.json({ success: true, message: "تم إيقاف الجلسة مؤقتاً" });
    } catch (error: any) {
      console.error("Pause scheduled session error:", error);
      res.status(500).json({ success: false, error: "INTERNAL_SERVER_ERROR", message: "فشل في إيقاف الجلسة" });
    }
  });

  // Cancel scheduled session (refund remaining tasks)
  app.patch("/api/parent/scheduled-sessions/:id/cancel", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { id } = req.params;

      const session = await db.select().from(scheduledSessions)
        .where(and(eq(scheduledSessions.id, id), eq(scheduledSessions.parentId, parentId)));

      if (!session[0]) {
        return res.status(404).json({ success: false, error: "NOT_FOUND", message: "الجلسة غير موجودة" });
      }

      if (session[0].status === "completed" || session[0].status === "cancelled") {
        return res.status(400).json({
          success: false,
          error: "BAD_REQUEST",
          message: "لا يمكن إلغاء جلسة مكتملة أو ملغية",
        });
      }

      // Calculate refund for remaining locked tasks
      const remainingTasks = await db.select().from(scheduledSessionTasks)
        .where(and(
          eq(scheduledSessionTasks.sessionId, id),
          eq(scheduledSessionTasks.status, "locked")
        ));

      const refundAmount = remainingTasks.reduce((sum: number, t: any) => sum + (t.pointsReward || 0), 0);

      await db.transaction(async (tx: any) => {
        // Cancel session
        await tx.update(scheduledSessions)
          .set({ status: "cancelled", updatedAt: new Date() })
          .where(eq(scheduledSessions.id, id));

        // Mark remaining tasks as skipped
        if (remainingTasks.length > 0) {
          const remainingIds = remainingTasks.map((t: any) => t.id);
          await tx.update(scheduledSessionTasks)
            .set({ status: "skipped" })
            .where(inArray(scheduledSessionTasks.id, remainingIds));
        }

        // Refund to parent wallet
        if (refundAmount > 0) {
          await tx.update(parentWallet)
            .set({
              balance: sql`${parentWallet.balance} + ${refundAmount}`,
              totalSpent: sql`${parentWallet.totalSpent} - ${refundAmount}`,
              updatedAt: new Date(),
            })
            .where(eq(parentWallet.parentId, parentId));
        }
      });

      res.json({
        success: true,
        message: `تم إلغاء الجلسة. تم استرداد ${refundAmount} نقطة`,
        data: { refunded: refundAmount },
      });
    } catch (error: any) {
      console.error("Cancel scheduled session error:", error);
      res.status(500).json({ success: false, error: "INTERNAL_SERVER_ERROR", message: "فشل في إلغاء الجلسة" });
    }
  });

  // Delete scheduled session
  app.delete("/api/parent/scheduled-sessions/:id", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { id } = req.params;

      const session = await db.select().from(scheduledSessions)
        .where(and(eq(scheduledSessions.id, id), eq(scheduledSessions.parentId, parentId)));

      if (!session[0]) {
        return res.status(404).json({ success: false, error: "NOT_FOUND", message: "الجلسة غير موجودة" });
      }

      // Only allow delete if draft or cancelled
      if (session[0].status !== "draft" && session[0].status !== "cancelled") {
        return res.status(400).json({
          success: false,
          error: "BAD_REQUEST",
          message: "لا يمكن حذف جلسة نشطة أو مؤقتة. قم بإلغائها أولاً",
        });
      }

      // If draft and not yet activated, refund all points
      if (session[0].status === "draft") {
        const refundAmount = session[0].totalPointsReward || 0;
        await db.transaction(async (tx: any) => {
          if (refundAmount > 0) {
            await tx.update(parentWallet)
              .set({
                balance: sql`${parentWallet.balance} + ${refundAmount}`,
                totalSpent: sql`${parentWallet.totalSpent} - ${refundAmount}`,
                updatedAt: new Date(),
              })
              .where(eq(parentWallet.parentId, parentId));
          }
          await tx.delete(scheduledSessionTasks).where(eq(scheduledSessionTasks.sessionId, id));
          await tx.delete(scheduledSessions).where(eq(scheduledSessions.id, id));
        });
      } else {
        // Cancelled — just delete (no refund, already refunded on cancel)
        await db.delete(scheduledSessionTasks).where(eq(scheduledSessionTasks.sessionId, id));
        await db.delete(scheduledSessions).where(eq(scheduledSessions.id, id));
      }

      res.json({ success: true, message: "تم حذف الجلسة بنجاح" });
    } catch (error: any) {
      console.error("Delete scheduled session error:", error);
      res.status(500).json({ success: false, error: "INTERNAL_SERVER_ERROR", message: "فشل في حذف الجلسة" });
    }
  });

  // Get scheduled session report
  app.get("/api/parent/scheduled-sessions/:id/report", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { id } = req.params;

      const session = await db.select().from(scheduledSessions)
        .where(and(eq(scheduledSessions.id, id), eq(scheduledSessions.parentId, parentId)));

      if (!session[0]) {
        return res.status(404).json({ success: false, error: "NOT_FOUND", message: "الجلسة غير موجودة" });
      }

      const child = await db.select().from(children).where(eq(children.id, session[0].childId));
      const sessionTasks = await db.select().from(scheduledSessionTasks)
        .where(eq(scheduledSessionTasks.sessionId, id))
        .orderBy(scheduledSessionTasks.orderIndex);

      const completedCount = sessionTasks.filter((t: any) => t.status === "completed").length;
      const correctCount = sessionTasks.filter((t: any) => t.isCorrect === true).length;
      const totalPointsEarned = sessionTasks.reduce((sum: number, t: any) => sum + (t.pointsEarned || 0), 0);
      const totalPointsPossible = sessionTasks.reduce((sum: number, t: any) => sum + (t.pointsReward || 0), 0);

      res.json({
        success: true,
        data: {
          session: {
            ...session[0],
            childName: child[0]?.name || "Unknown",
            childAvatar: child[0]?.avatarUrl || null,
          },
          tasks: sessionTasks,
          summary: {
            totalTasks: sessionTasks.length,
            completedTasks: completedCount,
            correctAnswers: correctCount,
            wrongAnswers: completedCount - correctCount,
            totalPointsEarned,
            totalPointsPossible,
            successRate: completedCount > 0 ? Math.round((correctCount / completedCount) * 100) : 0,
            completionRate: sessionTasks.length > 0 ? Math.round((completedCount / sessionTasks.length) * 100) : 0,
          },
        },
      });
    } catch (error: any) {
      console.error("Get session report error:", error);
      res.status(500).json({ success: false, error: "INTERNAL_SERVER_ERROR", message: "فشل في جلب التقرير" });
    }
  });

  // Get parent notifications (from admin)
  app.get("/api/parent/admin-notifications", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const notificationsList = await db.select().from(parentNotifications)
        .where(eq(parentNotifications.parentId, parentId));

      res.json({ success: true, data: notificationsList });
    } catch (error: any) {
      console.error("Get admin notifications error:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Mark notification as read
  app.patch("/api/parent/admin-notifications/:id/read", authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const parentId = req.user.userId;

      const notification = await db.select().from(parentNotifications)
        .where(and(eq(parentNotifications.id, id), eq(parentNotifications.parentId, parentId)));

      if (!notification[0]) {
        return res.status(404).json({ message: "Notification not found" });
      }

      const updated = await db.update(parentNotifications)
        .set({ isRead: true })
        .where(eq(parentNotifications.id, id))
        .returning();

      res.json({ success: true, data: updated[0] });
    } catch (error: any) {
      console.error("Mark notification read error:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // ================= PARENT GAME CONTROL =================

  // Get all games + child's assignments
  app.get("/api/parent/children/:childId/games", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { childId } = req.params;

      // Verify parent owns child
      const link = await db.select().from(parentChild)
        .where(and(eq(parentChild.parentId, parentId), eq(parentChild.childId, childId)));
      if (!link[0]) {
        return res.status(403).json(errorResponse(ErrorCode.UNAUTHORIZED, "Not authorized"));
      }

      // Get all active games
      const allGames = await db.select().from(flashGames).where(eq(flashGames.isActive, true));

      // Get child's assignments
      const assignments = await db.select().from(childGameAssignments)
        .where(eq(childGameAssignments.childId, childId));
      type AssignmentRow = typeof assignments[number];
      const assignmentMap = new Map<string, AssignmentRow>(assignments.map((a: AssignmentRow) => [a.gameId, a]));

      // Get today's play counts per game
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayPlays = await db.select({
        gameId: gamePlayHistory.gameId,
        count: sql<number>`count(*)`,
        totalPoints: sql<number>`coalesce(sum(${gamePlayHistory.pointsEarned}), 0)`,
      })
        .from(gamePlayHistory)
        .where(and(
          eq(gamePlayHistory.childId, childId),
          sql`${gamePlayHistory.playedAt} >= ${todayStart}`
        ))
        .groupBy(gamePlayHistory.gameId);
      const todayPlayMap = new Map<string, { count: number; points: number }>(
        todayPlays.map((p: typeof todayPlays[number]) => [p.gameId, { count: Number(p.count), points: Number(p.totalPoints) }])
      );

      // Get total play counts per game
      const totalPlays = await db.select({
        gameId: gamePlayHistory.gameId,
        count: sql<number>`count(*)`,
        totalPoints: sql<number>`coalesce(sum(${gamePlayHistory.pointsEarned}), 0)`,
      })
        .from(gamePlayHistory)
        .where(eq(gamePlayHistory.childId, childId))
        .groupBy(gamePlayHistory.gameId);
      const totalPlayMap = new Map<string, { count: number; points: number }>(
        totalPlays.map((p: typeof totalPlays[number]) => [p.gameId, { count: Number(p.count), points: Number(p.totalPoints) }])
      );

      const gamesWithStatus = allGames.map((game: typeof allGames[number]) => {
        const assignment = assignmentMap.get(game.id);
        const today = todayPlayMap.get(game.id) || { count: 0, points: 0 };
        const total = totalPlayMap.get(game.id) || { count: 0, points: 0 };
        return {
          ...game,
          isAssigned: !!assignment,
          assignmentActive: assignment?.isActive ?? true,
          maxPlaysPerDay: assignment?.maxPlaysPerDay || game.maxPlaysPerDay || 0,
          todayPlays: today.count,
          todayPoints: today.points,
          totalPlays: total.count,
          totalPoints: total.points,
        };
      });

      res.json(successResponse(gamesWithStatus));
    } catch (error: any) {
      console.error("Parent get child games error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch games"));
    }
  });

  // Parent: assign/unassign games for child (bulk replace)
  app.put("/api/parent/children/:childId/games", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { childId } = req.params;
      const { gameIds, maxPlaysPerDay } = req.body;

      // Verify parent owns child
      const link = await db.select().from(parentChild)
        .where(and(eq(parentChild.parentId, parentId), eq(parentChild.childId, childId)));
      if (!link[0]) {
        return res.status(403).json(errorResponse(ErrorCode.UNAUTHORIZED, "Not authorized"));
      }

      if (!Array.isArray(gameIds)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "gameIds array is required"));
      }

      // Delete all existing and re-insert
      await db.delete(childGameAssignments).where(eq(childGameAssignments.childId, childId));

      if (gameIds.length > 0) {
        await db.insert(childGameAssignments).values(
          gameIds.map((gameId: string) => ({
            childId,
            gameId,
            maxPlaysPerDay: maxPlaysPerDay || 0,
            assignedBy: parentId,
          }))
        );
      }

      res.json(successResponse({ total: gameIds.length }, `${gameIds.length} games assigned`));
    } catch (error: any) {
      console.error("Parent assign games error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to assign games"));
    }
  });

  // Parent: update daily limit for a specific game
  app.patch("/api/parent/children/:childId/games/:gameId", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { childId, gameId } = req.params;
      const { maxPlaysPerDay, isActive } = req.body;

      // Verify parent owns child
      const link = await db.select().from(parentChild)
        .where(and(eq(parentChild.parentId, parentId), eq(parentChild.childId, childId)));
      if (!link[0]) {
        return res.status(403).json(errorResponse(ErrorCode.UNAUTHORIZED, "Not authorized"));
      }

      // Check if assignment exists
      const existing = await db.select().from(childGameAssignments)
        .where(and(eq(childGameAssignments.childId, childId), eq(childGameAssignments.gameId, gameId)));

      if (!existing[0]) {
        // Create new assignment
        const [created] = await db.insert(childGameAssignments).values({
          childId,
          gameId,
          maxPlaysPerDay: maxPlaysPerDay || 0,
          isActive: isActive !== undefined ? isActive : true,
          assignedBy: parentId,
        }).returning();
        return res.json(successResponse(created, "Assignment created"));
      }

      // Update existing
      const updateData: Record<string, any> = {};
      if (maxPlaysPerDay !== undefined) updateData.maxPlaysPerDay = maxPlaysPerDay;
      if (isActive !== undefined) updateData.isActive = isActive;

      const [updated] = await db.update(childGameAssignments)
        .set(updateData)
        .where(and(eq(childGameAssignments.childId, childId), eq(childGameAssignments.gameId, gameId)))
        .returning();

      res.json(successResponse(updated, "Assignment updated"));
    } catch (error: any) {
      console.error("Parent update game assignment error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to update game"));
    }
  });

  // Parent: get child game statistics
  app.get("/api/parent/children/:childId/game-stats", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { childId } = req.params;

      // Verify parent owns child
      const link = await db.select().from(parentChild)
        .where(and(eq(parentChild.parentId, parentId), eq(parentChild.childId, childId)));
      if (!link[0]) {
        return res.status(403).json(errorResponse(ErrorCode.UNAUTHORIZED, "Not authorized"));
      }

      // Today's stats
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayStats = await db.select({
        count: sql<number>`count(*)`,
        totalPoints: sql<number>`coalesce(sum(${gamePlayHistory.pointsEarned}), 0)`,
      })
        .from(gamePlayHistory)
        .where(and(
          eq(gamePlayHistory.childId, childId),
          sql`${gamePlayHistory.playedAt} >= ${todayStart}`
        ));

      // All-time stats
      const allTimeStats = await db.select({
        count: sql<number>`count(*)`,
        totalPoints: sql<number>`coalesce(sum(${gamePlayHistory.pointsEarned}), 0)`,
      })
        .from(gamePlayHistory)
        .where(eq(gamePlayHistory.childId, childId));

      // Recent plays (last 10)
      const recentPlays = await db.select({
        id: gamePlayHistory.id,
        gameId: gamePlayHistory.gameId,
        pointsEarned: gamePlayHistory.pointsEarned,
        playedAt: gamePlayHistory.playedAt,
        gameTitle: flashGames.title,
        gameThumbnail: flashGames.thumbnailUrl,
      })
        .from(gamePlayHistory)
        .innerJoin(flashGames, eq(gamePlayHistory.gameId, flashGames.id))
        .where(eq(gamePlayHistory.childId, childId))
        .orderBy(desc(gamePlayHistory.playedAt))
        .limit(10);

      // Growth tree data
      const tree = await db.select().from(childGrowthTrees)
        .where(eq(childGrowthTrees.childId, childId));

      // Assigned games count
      const assignedCount = await db.select({ count: sql<number>`count(*)` })
        .from(childGameAssignments)
        .where(and(eq(childGameAssignments.childId, childId), eq(childGameAssignments.isActive, true)));

      res.json(successResponse({
        today: {
          gamesPlayed: Number(todayStats[0]?.count || 0),
          pointsEarned: Number(todayStats[0]?.totalPoints || 0),
        },
        allTime: {
          gamesPlayed: Number(allTimeStats[0]?.count || 0),
          pointsEarned: Number(allTimeStats[0]?.totalPoints || 0),
        },
        assignedGames: Number(assignedCount[0]?.count || 0),
        gamesPlayedInTree: tree[0]?.gamesPlayed || 0,
        recentPlays,
      }));
    } catch (error: any) {
      console.error("Parent get child game stats error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch game stats"));
    }
  });

  // ======= PARENT POSTS SYSTEM =======

  // Create post
  app.post("/api/parent/posts", authMiddleware, async (req, res) => {
    try {
      const parentId = (req as any).user.userId;
      const v = validateBody(createPostSchema, req.body);
      if (!v.success) return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, v.error));
      const { content, mediaUrls, mediaTypes } = v.data;
      const [post] = await db.insert(parentPosts).values({
        parentId,
        content: content?.trim() || "",
        mediaUrls: mediaUrls || [],
        mediaTypes: mediaTypes || [],
      }).returning();
      res.json(successResponse(post));
    } catch (error: any) {
      console.error("Create parent post error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to create post"));
    }
  });

  // Upload post media
  app.post("/api/parent/posts/media", authMiddleware, async (req, res) => {
    try {
      const multer = (await import("multer")).default;
      const path = await import("path");
      const fs = await import("fs");
      const uploadDir = path.resolve(process.cwd(), "uploads", "parent-posts");
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      const store = multer.diskStorage({
        destination: (_r, _f, cb) => cb(null, uploadDir),
        filename: (_r, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`),
      });
      const upload = multer({
        storage: store, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: (_r, f, cb) => {
          if (f.mimetype.startsWith("image/") || f.mimetype.startsWith("video/")) cb(null, true);
          else cb(new Error("Only images and videos are allowed"));
        }
      }).array("media", 5);
      upload(req, res, (err) => {
        if (err) return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, err.message));
        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "No files uploaded"));
        const urls = files.map(f => `/uploads/parent-posts/${f.filename}`);
        const types = files.map(f => f.mimetype.startsWith("video/") ? "video" : "image");
        res.json(successResponse({ urls, types }));
      });
    } catch (error: any) {
      console.error("Upload parent post media error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to upload media"));
    }
  });

  // Get own posts
  app.get("/api/parent/posts", authMiddleware, async (req, res) => {
    try {
      const parentId = (req as any).user.userId;
      const posts = await db.select().from(parentPosts)
        .where(and(eq(parentPosts.parentId, parentId), eq(parentPosts.isActive, true)))
        .orderBy(desc(parentPosts.createdAt));
      // Attach author info
      const [parent] = await db.select({ name: parents.name, avatarUrl: parents.avatarUrl }).from(parents).where(eq(parents.id, parentId));
      const enriched = posts.map((p: any) => ({ ...p, authorName: parent?.name || "", authorAvatar: parent?.avatarUrl || null }));
      res.json(successResponse(enriched));
    } catch (error: any) {
      console.error("Get parent posts error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch posts"));
    }
  });

  // Get posts by parentId (public)
  app.get("/api/parent/posts/:parentId", async (req, res) => {
    try {
      const { parentId } = req.params;
      const posts = await db.select().from(parentPosts)
        .where(and(eq(parentPosts.parentId, parentId), eq(parentPosts.isActive, true)))
        .orderBy(desc(parentPosts.createdAt));
      const [parent] = await db.select({ name: parents.name, avatarUrl: parents.avatarUrl }).from(parents).where(eq(parents.id, parentId));
      const enriched = posts.map((p: any) => ({ ...p, authorName: parent?.name || "", authorAvatar: parent?.avatarUrl || null }));
      res.json(successResponse(enriched));
    } catch (error: any) {
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch posts"));
    }
  });

  // Delete post
  app.delete("/api/parent/posts/:postId", authMiddleware, async (req, res) => {
    try {
      const parentId = (req as any).user.userId;
      const { postId } = req.params;
      const [post] = await db.select().from(parentPosts).where(and(eq(parentPosts.id, postId), eq(parentPosts.parentId, parentId)));
      if (!post) return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Post not found"));
      await db.update(parentPosts).set({ isActive: false }).where(eq(parentPosts.id, postId));
      res.json(successResponse({ deleted: true }));
    } catch (error: any) {
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to delete post"));
    }
  });

  // Check liked posts
  app.post("/api/parent/posts/check-likes", authMiddleware, async (req, res) => {
    try {
      const userId = (req as any).user.userId;
      const { postIds } = req.body;
      if (!postIds || !Array.isArray(postIds)) return res.json(successResponse({}));
      const likes = await db.select().from(parentPostLikes)
        .where(and(inArray(parentPostLikes.postId, postIds), eq(parentPostLikes.userId, userId)));
      const map: Record<string, boolean> = {};
      likes.forEach((l: any) => { map[l.postId] = true; });
      res.json(successResponse(map));
    } catch (error: any) {
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to check likes"));
    }
  });

  // Like / unlike post
  app.post("/api/parent/posts/:postId/like", authMiddleware, async (req, res) => {
    try {
      const userId = (req as any).user.userId;
      const { postId } = req.params;
      const existing = await db.select().from(parentPostLikes)
        .where(and(eq(parentPostLikes.postId, postId), eq(parentPostLikes.userId, userId)));
      if (existing.length > 0) {
        await db.delete(parentPostLikes).where(eq(parentPostLikes.id, existing[0].id));
        await db.update(parentPosts).set({ likesCount: sql`GREATEST(${parentPosts.likesCount} - 1, 0)` }).where(eq(parentPosts.id, postId));
        const [updated] = await db.select({ likesCount: parentPosts.likesCount }).from(parentPosts).where(eq(parentPosts.id, postId));
        res.json({ success: true, liked: false, likesCount: updated?.likesCount || 0 });
      } else {
        await db.insert(parentPostLikes).values({ postId, userId, userType: "parent" });
        await db.update(parentPosts).set({ likesCount: sql`${parentPosts.likesCount} + 1` }).where(eq(parentPosts.id, postId));
        const [updated] = await db.select({ likesCount: parentPosts.likesCount }).from(parentPosts).where(eq(parentPosts.id, postId));
        res.json({ success: true, liked: true, likesCount: updated?.likesCount || 0 });
      }
    } catch (error: any) {
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to toggle like"));
    }
  });

  // Get comments for a post
  app.get("/api/parent/posts/:postId/comments", async (req, res) => {
    try {
      const { postId } = req.params;
      const comments = await db.select().from(parentPostComments)
        .where(and(eq(parentPostComments.postId, postId), eq(parentPostComments.isActive, true)))
        .orderBy(parentPostComments.createdAt);
      res.json(successResponse(comments));
    } catch (error: any) {
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch comments"));
    }
  });

  // Add comment to a post
  app.post("/api/parent/posts/:postId/comment", authMiddleware, async (req, res) => {
    try {
      const userId = (req as any).user.userId;
      const { postId } = req.params;
      const { content } = req.body;
      if (!content?.trim() || content.length > 1000) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Comment must be 1-1000 characters"));
      }
      const [parent] = await db.select({ name: parents.name, avatarUrl: parents.avatarUrl }).from(parents).where(eq(parents.id, userId));
      const [comment] = await db.insert(parentPostComments).values({
        postId,
        authorId: userId,
        authorName: parent?.name || "Parent",
        authorAvatar: parent?.avatarUrl || null,
        authorType: "parent",
        content: content.trim(),
      }).returning();
      await db.update(parentPosts).set({ commentsCount: sql`${parentPosts.commentsCount} + 1` }).where(eq(parentPosts.id, postId));
      res.json(successResponse(comment));
    } catch (error: any) {
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to add comment"));
    }
  });

  // Update social links
  app.post("/api/parent/profile/social-links", authMiddleware, async (req, res) => {
    try {
      const parentId = (req as any).user.userId;
      const { socialLinks } = req.body;
      await db.update(parents).set({ socialLinks }).where(eq(parents.id, parentId));
      res.json(successResponse({ updated: true }));
    } catch (error: any) {
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to update social links"));
    }
  });

  // ====== PARENT UPLOADS (presign / proxy / finalize) ======
  app.post("/api/parent/uploads/presign", authMiddleware, async (req, res) => {
    try {
      const parentId = (req as any).user.userId;
      const body = z.object({
        contentType: z.string().min(1),
        size: z.number().int().positive(),
        purpose: z.string().min(1),
        originalName: z.string().min(1),
      }).parse(req.body);
      const result = await createPresignedUpload({
        actor: { type: "parent", id: parentId },
        purpose: body.purpose,
        contentType: body.contentType,
        size: body.size,
      });
      res.json({ success: true, data: result });
    } catch (error: any) {
      if (error instanceof z.ZodError) return res.status(400).json({ success: false, message: error.message });
      if (error?.message === "POLICY_REJECTED_MIME" || error?.message === "POLICY_REJECTED_SIZE")
        return res.status(400).json({ success: false, message: error.message });
      console.error("Parent upload presign error:", error);
      res.status(500).json({ success: false, message: "Upload presign failed" });
    }
  });

  app.post("/api/parent/uploads/finalize", authMiddleware, async (req, res) => {
    try {
      const parentId = (req as any).user.userId;
      const body = finalizeUploadSchema.parse(req.body);
      const media = await finalizeUpload({
        actor: { type: "parent", id: parentId },
        input: body,
      });
      res.json({ success: true, data: media });
    } catch (error: any) {
      if (error instanceof z.ZodError) return res.status(400).json({ success: false, message: error.message });
      if (error?.message === "OBJECT_NOT_FOUND") return res.status(400).json({ success: false, message: "File not found" });
      console.error("Parent upload finalize error:", error);
      res.status(500).json({ success: false, message: "Upload finalize failed" });
    }
  });

  app.put("/api/parent/uploads/proxy", authMiddleware, uploadProxyLimiter, async (req, res) => {
    try {
      const parentId = (req as any).user.userId;
      const target = resolveUploadProxyTargetByObjectPath({
        actor: { type: "parent", id: parentId },
        objectPath: req.headers["x-upload-object-path"],
      });
      if (!target.ok) return res.status(400).json({ success: false, message: "Invalid upload session" });

      const upstreamRes = await fetch(target.targetUrl, {
        method: "PUT",
        headers: {
          "Content-Type": String(req.headers["content-type"] || "application/octet-stream"),
          ...(req.headers["content-length"] ? { "Content-Length": String(req.headers["content-length"]) } : {}),
        },
        body: req as any,
        duplex: "half",
      } as any);
      if (!upstreamRes.ok) {
        const details = await upstreamRes.text().catch(() => "");
        return res.status(502).json({ success: false, message: "Upload to storage failed", details: details.slice(0, 500) });
      }
      return res.json({ success: true });
    } catch (error: any) {
      console.error("Parent upload proxy error:", error);
      return res.status(500).json({ success: false, message: "Upload proxy failed" });
    }
  });

  // ===== SCHOOL ENROLLMENT (PARENT SIDE) =====

  // Submit enrollment request
  app.post("/api/parent/enroll-child", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const schema = z.object({
        childId: z.string(),
        schoolId: z.string(),
        parentNote: z.string().max(500).optional(),
        attachments: z.array(z.object({
          url: z.string(),
          name: z.string(),
          type: z.string(),
          size: z.number(),
        })).max(5).optional(),
      });
      const { childId, schoolId, parentNote, attachments } = schema.parse(req.body);

      // Verify parent owns this child
      const [pc] = await db.select().from(parentChild).where(and(eq(parentChild.parentId, parentId), eq(parentChild.childId, childId)));
      if (!pc) return res.status(403).json({ success: false, error: "PARENT_CHILD_MISMATCH" });

      // Check school exists and enrollment is open
      const [school] = await db.select().from(schools).where(and(eq(schools.id, schoolId), eq(schools.isActive, true)));
      if (!school) return res.status(404).json({ success: false, error: "NOT_FOUND", message: "المدرسة غير موجودة" });
      if (!school.enrollmentOpen) return res.status(400).json({ success: false, error: "BAD_REQUEST", message: "التسجيل مغلق حالياً في هذه المدرسة" });

      // Check if child is already assigned to this school
      const [existingAssignment] = await db.select().from(childSchoolAssignment).where(eq(childSchoolAssignment.childId, childId));
      if (existingAssignment && existingAssignment.schoolId === schoolId) {
        return res.status(400).json({ success: false, error: "BAD_REQUEST", message: "الطفل مسجل بالفعل في هذه المدرسة" });
      }

      // Check if already has a pending enrollment for this school
      const [existingEnrollment] = await db.select().from(schoolEnrollments)
        .where(and(eq(schoolEnrollments.childId, childId), eq(schoolEnrollments.schoolId, schoolId), eq(schoolEnrollments.status, "pending")));
      if (existingEnrollment) {
        return res.status(400).json({ success: false, error: "BAD_REQUEST", message: "يوجد طلب التحاق معلق بالفعل" });
      }

      // Get child data for snapshot and conditions check
      const [child] = await db.select().from(children).where(eq(children.id, childId));
      if (!child) return res.status(404).json({ success: false, error: "NOT_FOUND" });

      const childAge = child.birthday ? Math.floor((Date.now() - new Date(child.birthday).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;

      // Check enrollment conditions
      const conditions = school.enrollmentConditions as any;
      if (conditions) {
        const rejections: string[] = [];
        if (conditions.minAge && childAge !== null && childAge < conditions.minAge) {
          rejections.push(`الحد الأدنى للعمر هو ${conditions.minAge} سنوات`);
        }
        if (conditions.maxAge && childAge !== null && childAge > conditions.maxAge) {
          rejections.push(`الحد الأقصى للعمر هو ${conditions.maxAge} سنوات`);
        }
        if (conditions.requiredGovernorates?.length && child.governorate && !conditions.requiredGovernorates.includes(child.governorate)) {
          rejections.push(`المحافظة غير مقبولة. المحافظات المقبولة: ${conditions.requiredGovernorates.join("، ")}`);
        }
        if (conditions.minActivityScore && (child.totalPoints || 0) < conditions.minActivityScore) {
          rejections.push(`الحد الأدنى لنقاط النشاط هو ${conditions.minActivityScore}`);
        }
        if (conditions.requireAvatar && !child.avatarUrl) {
          rejections.push("يجب أن يكون للطفل صورة شخصية");
        }
        if (conditions.requireCompleteProfile) {
          const hasRequiredFields = child.name && child.birthday && child.governorate;
          if (!hasRequiredFields) {
            rejections.push("يجب إكمال ملف الطفل (الاسم، تاريخ الميلاد، المحافظة)");
          }
        }

        if (rejections.length > 0) {
          // Auto-reject with conditions reason
          const rejectionReason = rejections.join(" | ");
          const enrollmentId = uuidv4();
          await db.insert(schoolEnrollments).values({
            id: enrollmentId,
            schoolId,
            parentId,
            childId,
            status: "rejected",
            parentNote: parentNote || null,
            rejectionReason,
            attachments: attachments || null,
            childProfileSnapshot: {
              name: child.name,
              age: childAge,
              birthday: child.birthday,
              governorate: child.governorate,
              schoolName: child.schoolName,
              academicGrade: child.academicGrade,
              hobbies: child.hobbies,
              avatarUrl: child.avatarUrl,
              totalPoints: child.totalPoints,
              interests: child.interests,
              bio: child.bio,
            },
            reviewedAt: new Date(),
            reviewedBy: "auto",
          });

          return res.status(400).json({
            success: false,
            error: "BAD_REQUEST",
            message: "لا يستوفي الطفل شروط التسجيل",
            data: { reasons: rejections, enrollmentId },
          });
        }
      }

      // Create enrollment
      const enrollmentId = uuidv4();
      await db.insert(schoolEnrollments).values({
        id: enrollmentId,
        schoolId,
        parentId,
        childId,
        status: "pending",
        parentNote: parentNote || null,
        attachments: attachments || null,
        childProfileSnapshot: {
          name: child.name,
          age: childAge,
          birthday: child.birthday,
          governorate: child.governorate,
          schoolName: child.schoolName,
          academicGrade: child.academicGrade,
          hobbies: child.hobbies,
          avatarUrl: child.avatarUrl,
          totalPoints: child.totalPoints,
          interests: child.interests,
          bio: child.bio,
        },
      });

      // Notify school (via notifications table with schoolId)
      await db.insert(notifications).values({
        id: uuidv4(),
        schoolId,
        type: NOTIFICATION_TYPES.ENROLLMENT_SUBMITTED,
        title: "طلب التحاق جديد",
        message: `تم تقديم طلب التحاق جديد من ولي أمر ${child.name}`,
        style: "banner",
        priority: "high",
        relatedId: enrollmentId,
        metadata: { parentId, childId, enrollmentId },
        isRead: false,
      });

      res.json({ success: true, data: { enrollmentId }, message: "تم تقديم طلب الالتحاق بنجاح" });
    } catch (error: any) {
      if (error instanceof z.ZodError) return res.status(400).json({ success: false, error: "BAD_REQUEST", message: error.errors[0]?.message });
      console.error("Enroll child error:", error);
      res.status(500).json({ success: false, error: "INTERNAL_SERVER_ERROR" });
    }
  });

  // List parent's enrollment requests
  app.get("/api/parent/enrollments", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const rows = await db
        .select({
          enrollment: schoolEnrollments,
          schoolName: schools.name,
          schoolNameAr: schools.nameAr,
          schoolImageUrl: schools.imageUrl,
          schoolGovernorate: schools.governorate,
          childName: children.name,
          childAvatarUrl: children.avatarUrl,
        })
        .from(schoolEnrollments)
        .innerJoin(schools, eq(schoolEnrollments.schoolId, schools.id))
        .innerJoin(children, eq(schoolEnrollments.childId, children.id))
        .where(eq(schoolEnrollments.parentId, parentId))
        .orderBy(desc(schoolEnrollments.createdAt));

      const data = rows.map((row: any) => ({
        ...row.enrollment,
        school: { name: row.schoolName, nameAr: row.schoolNameAr, imageUrl: row.schoolImageUrl, governorate: row.schoolGovernorate },
        child: { name: row.childName, avatarUrl: row.childAvatarUrl },
      }));

      res.json({ success: true, data });
    } catch (error: any) {
      console.error("List enrollments error:", error);
      res.status(500).json({ success: false, error: "INTERNAL_SERVER_ERROR" });
    }
  });

  // Cancel pending enrollment
  app.delete("/api/parent/enrollments/:id", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { id } = req.params;
      const [enrollment] = await db.select().from(schoolEnrollments)
        .where(and(eq(schoolEnrollments.id, id), eq(schoolEnrollments.parentId, parentId)));
      if (!enrollment) return res.status(404).json({ success: false, error: "NOT_FOUND" });
      if (enrollment.status !== "pending") return res.status(400).json({ success: false, error: "BAD_REQUEST", message: "لا يمكن إلغاء طلب تمت معالجته" });
      await db.delete(schoolEnrollments).where(eq(schoolEnrollments.id, id));
      res.json({ success: true, message: "تم إلغاء طلب الالتحاق" });
    } catch (error: any) {
      res.status(500).json({ success: false, error: "INTERNAL_SERVER_ERROR" });
    }
  });

  // ===== Parent Push Notifications =====

  app.get("/api/parent/push-public-key", authMiddleware, async (_req: any, res) => {
    try {
      const publicKey = getVapidPublicKey();
      if (!publicKey) {
        return res.status(503).json({ success: false, error: "WEB_PUSH_NOT_CONFIGURED", message: "Web push is not configured" });
      }
      res.json({ success: true, data: { publicKey } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: "INTERNAL_SERVER_ERROR" });
    }
  });

  app.post("/api/parent/push-subscriptions", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const v = validateBody(pushSubscriptionSchema, req.body || {});
      if (!v.success) return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, v.error));
      const { platform, endpoint, token, p256dh, auth, deviceId } = v.data;

      if (!endpoint && !token) {
        return res.status(400).json({ success: false, error: "BAD_REQUEST", message: "endpoint or token is required" });
      }

      const existing = await db.select().from(parentPushSubscriptions)
        .where(eq(parentPushSubscriptions.parentId, parentId));

      const match = existing.find((row: any) => {
        if (deviceId && row.deviceId === deviceId && row.platform === platform) return true;
        if (endpoint && row.endpoint === endpoint) return true;
        if (token && row.token === token) return true;
        return false;
      });

      if (match) {
        const [updated] = await db.update(parentPushSubscriptions).set({
          platform, endpoint: endpoint || null, token: token || null,
          p256dh: p256dh || null, auth: auth || null, deviceId: deviceId || null,
          isActive: true, lastSeenAt: new Date(), updatedAt: new Date(),
        }).where(eq(parentPushSubscriptions.id, match.id)).returning();
        return res.json({ success: true, data: updated });
      }

      const [created] = await db.insert(parentPushSubscriptions).values({
        parentId, platform, endpoint: endpoint || null, token: token || null,
        p256dh: p256dh || null, auth: auth || null, deviceId: deviceId || null, isActive: true,
      }).returning();
      res.json({ success: true, data: created });
    } catch (error: any) {
      console.error("Parent push subscription error:", error);
      res.status(500).json({ success: false, error: "INTERNAL_SERVER_ERROR" });
    }
  });

  app.delete("/api/parent/push-subscriptions/:id", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { id } = req.params;
      await db.delete(parentPushSubscriptions)
        .where(and(eq(parentPushSubscriptions.id, id), eq(parentPushSubscriptions.parentId, parentId)));
      res.json({ success: true, message: "تم حذف الاشتراك" });
    } catch (error: any) {
      res.status(500).json({ success: false, error: "INTERNAL_SERVER_ERROR" });
    }
  });

  app.get("/api/parent/notification-preferences", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const rows = await db
        .select()
        .from(parentNotificationPreferences)
        .where(eq(parentNotificationPreferences.parentId, parentId))
        .limit(1);

      const row = rows[0] || null;
      return res.json(successResponse({
        webPushEnabled: row?.webPushEnabled ?? true,
        mutedTypes: row?.mutedTypes || [],
        quietHoursStart: row?.quietHoursStart ?? null,
        quietHoursEnd: row?.quietHoursEnd ?? null,
      }, "Notification preferences retrieved"));
    } catch (error: any) {
      console.error("Parent notification preferences fetch error:", error);
      return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch notification preferences"));
    }
  });

  app.put("/api/parent/notification-preferences", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const v = validateBody(notificationPreferencesSchema, req.body || {});
      if (!v.success) return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, v.error));

      const input = v.data;
      const [existing] = await db
        .select()
        .from(parentNotificationPreferences)
        .where(eq(parentNotificationPreferences.parentId, parentId))
        .limit(1);

      const payload: any = {
        updatedAt: new Date(),
      };

      if (input.webPushEnabled !== undefined) payload.webPushEnabled = input.webPushEnabled;
      if (input.mutedTypes !== undefined) payload.mutedTypes = input.mutedTypes;
      if (input.quietHoursStart !== undefined) payload.quietHoursStart = input.quietHoursStart;
      if (input.quietHoursEnd !== undefined) payload.quietHoursEnd = input.quietHoursEnd;

      let saved;
      if (existing) {
        [saved] = await db
          .update(parentNotificationPreferences)
          .set(payload)
          .where(eq(parentNotificationPreferences.parentId, parentId))
          .returning();
      } else {
        [saved] = await db
          .insert(parentNotificationPreferences)
          .values({
            parentId,
            webPushEnabled: input.webPushEnabled ?? true,
            mutedTypes: input.mutedTypes ?? [],
            quietHoursStart: input.quietHoursStart ?? null,
            quietHoursEnd: input.quietHoursEnd ?? null,
          })
          .returning();
      }

      return res.json(successResponse({
        webPushEnabled: saved.webPushEnabled,
        mutedTypes: saved.mutedTypes || [],
        quietHoursStart: saved.quietHoursStart,
        quietHoursEnd: saved.quietHoursEnd,
      }, "Notification preferences updated"));
    } catch (error: any) {
      console.error("Parent notification preferences update error:", error);
      return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to update notification preferences"));
    }
  });

  // ===== Screen Time Settings =====

  app.get("/api/parent/screen-time/:childId", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { childId } = req.params;

      // Verify parent owns child
      const pc = await db.select().from(parentChild)
        .where(and(eq(parentChild.parentId, parentId), eq(parentChild.childId, childId)));
      if (!pc.length) {
        return res.status(403).json({ success: false, error: "PARENT_CHILD_MISMATCH" });
      }

      const [settings] = await db.select().from(screenTimeSettings)
        .where(eq(screenTimeSettings.childId, childId));

      // Get today's usage
      const today = new Date().toISOString().split("T")[0];
      const [usage] = await db.select().from(childDailyUsage)
        .where(and(eq(childDailyUsage.childId, childId), eq(childDailyUsage.date, today)));

      res.json({
        success: true,
        data: {
          settings: settings || { dailyLimitMinutes: 120, isEnabled: false, allowedStartTime: "08:00", allowedEndTime: "20:00" },
          todayUsage: usage || { totalMinutes: 0, sessionsCount: 0 },
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: "INTERNAL_SERVER_ERROR" });
    }
  });

  app.put("/api/parent/screen-time/:childId", authMiddleware, screenTimeLimiter, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { childId } = req.params;
      const v = validateBody(screenTimeSchema, req.body || {});
      if (!v.success) return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, v.error));
      const { dailyLimitMinutes, isEnabled, allowedStartTime, allowedEndTime } = v.data;

      // Verify parent owns child
      const pc = await db.select().from(parentChild)
        .where(and(eq(parentChild.parentId, parentId), eq(parentChild.childId, childId)));
      if (!pc.length) {
        return res.status(403).json({ success: false, error: "PARENT_CHILD_MISMATCH" });
      }

      const existing = await db.select().from(screenTimeSettings)
        .where(eq(screenTimeSettings.childId, childId));

      const values: any = { updatedAt: new Date() };
      if (dailyLimitMinutes !== undefined) values.dailyLimitMinutes = Math.max(15, Math.min(480, Number(dailyLimitMinutes)));
      if (isEnabled !== undefined) values.isEnabled = Boolean(isEnabled);
      if (allowedStartTime) values.allowedStartTime = String(allowedStartTime).slice(0, 5);
      if (allowedEndTime) values.allowedEndTime = String(allowedEndTime).slice(0, 5);

      let result;
      if (existing.length) {
        [result] = await db.update(screenTimeSettings).set(values)
          .where(eq(screenTimeSettings.childId, childId)).returning();
      } else {
        [result] = await db.insert(screenTimeSettings).values({
          childId, parentId, ...values,
          dailyLimitMinutes: values.dailyLimitMinutes || 120,
          isEnabled: values.isEnabled ?? false,
        }).returning();
      }

      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: "INTERNAL_SERVER_ERROR" });
    }
  });

  app.get("/api/parent/screen-time/:childId/history", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { childId } = req.params;
      const days = Math.min(30, Number(req.query.days) || 7);

      // Verify parent owns child
      const pc = await db.select().from(parentChild)
        .where(and(eq(parentChild.parentId, parentId), eq(parentChild.childId, childId)));
      if (!pc.length) {
        return res.status(403).json({ success: false, error: "PARENT_CHILD_MISMATCH" });
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split("T")[0];

      const history = await db.select().from(childDailyUsage)
        .where(and(
          eq(childDailyUsage.childId, childId),
          sql`${childDailyUsage.date} >= ${startDateStr}`
        ))
        .orderBy(desc(childDailyUsage.date));

      res.json({ success: true, data: history });
    } catch (error: any) {
      res.status(500).json({ success: false, error: "INTERNAL_SERVER_ERROR" });
    }
  });

  // ======= PARENT AUDIT LOG =======

  // Get parent audit log
  app.get("/api/parent/audit-log", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const offset = (page - 1) * limit;
      const action = req.query.action as string;
      const entity = req.query.entity as string;

      const conditions = [eq(parentAuditLogs.parentId, parentId)];
      if (action) conditions.push(eq(parentAuditLogs.action, action));
      if (entity) conditions.push(eq(parentAuditLogs.entity, entity));

      const [logs, totalResult] = await Promise.all([
        db.select().from(parentAuditLogs)
          .where(and(...conditions))
          .orderBy(desc(parentAuditLogs.createdAt))
          .limit(limit)
          .offset(offset),
        db.select({ count: count() }).from(parentAuditLogs)
          .where(and(...conditions)),
      ]);

      res.json(successResponse({
        logs,
        pagination: { page, limit, total: totalResult[0]?.count || 0 },
      }));
    } catch (error: any) {
      console.error("Audit log error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch audit log"));
    }
  });

  // ======= PARENT-TEACHER DIRECT MESSAGING =======

  // Get conversations list
  app.get("/api/parent/messages/conversations", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const conversations = await db.select({
        conversation: parentTeacherConversations,
        teacherName: schoolTeachers.name,
        teacherAvatar: schoolTeachers.avatarUrl,
      })
        .from(parentTeacherConversations)
        .innerJoin(schoolTeachers, eq(parentTeacherConversations.teacherId, schoolTeachers.id))
        .where(eq(parentTeacherConversations.parentId, parentId))
        .orderBy(desc(parentTeacherConversations.lastMessageAt));

      res.json(successResponse(conversations));
    } catch (error: any) {
      console.error("Get conversations error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch conversations"));
    }
  });

  // Start or get conversation with teacher
  app.post("/api/parent/messages/conversations", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { teacherId } = req.body;
      if (!teacherId) return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "teacherId is required"));

      // Get existing or create new
      const existing = await db.select().from(parentTeacherConversations)
        .where(and(
          eq(parentTeacherConversations.parentId, parentId),
          eq(parentTeacherConversations.teacherId, teacherId),
        ));

      if (existing[0]) return res.json(successResponse(existing[0]));

      // Verify teacher exists
      const teacher = await db.select({ id: schoolTeachers.id }).from(schoolTeachers).where(eq(schoolTeachers.id, teacherId));
      if (!teacher[0]) return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Teacher not found"));

      const [conv] = await db.insert(parentTeacherConversations).values({
        parentId,
        teacherId,
      }).returning();

      logParentAction(parentId, "CONVERSATION_STARTED", "message", conv.id, { teacherId }, req);
      res.status(201).json(successResponse(conv));
    } catch (error: any) {
      console.error("Create conversation error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to create conversation"));
    }
  });

  // Get messages in a conversation
  app.get("/api/parent/messages/:conversationId", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { conversationId } = req.params;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
      const offset = (page - 1) * limit;

      // Verify ownership
      const conv = await db.select().from(parentTeacherConversations)
        .where(and(
          eq(parentTeacherConversations.id, conversationId),
          eq(parentTeacherConversations.parentId, parentId),
        ));
      if (!conv[0]) return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Conversation not found"));

      const messages = await db.select().from(parentTeacherMessages)
        .where(eq(parentTeacherMessages.conversationId, conversationId))
        .orderBy(desc(parentTeacherMessages.createdAt))
        .limit(limit)
        .offset(offset);

      // Mark parent's unread as read
      await db.update(parentTeacherConversations).set({ parentUnreadCount: 0 })
        .where(eq(parentTeacherConversations.id, conversationId));

      // Mark incoming messages as read
      await db.update(parentTeacherMessages).set({ isRead: true })
        .where(and(
          eq(parentTeacherMessages.conversationId, conversationId),
          eq(parentTeacherMessages.senderType, "teacher"),
          eq(parentTeacherMessages.isRead, false),
        ));

      res.json(successResponse({ messages: messages.reverse(), conversation: conv[0] }));
    } catch (error: any) {
      console.error("Get messages error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch messages"));
    }
  });

  // Send message in conversation
  app.post("/api/parent/messages/:conversationId", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { conversationId } = req.params;
      const v = validateBody(helpChatMessageSchema, req.body);
      if (!v.success) return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, v.error));
      const { messageType, content, mediaUrl } = v.data;

      // Verify ownership
      const conv = await db.select().from(parentTeacherConversations)
        .where(and(
          eq(parentTeacherConversations.id, conversationId),
          eq(parentTeacherConversations.parentId, parentId),
        ));
      if (!conv[0]) return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Conversation not found"));

      const [msg] = await db.insert(parentTeacherMessages).values({
        conversationId,
        senderId: parentId,
        senderType: "parent",
        content: content || null,
        mediaUrl: mediaUrl || null,
        messageType: messageType || "text",
      }).returning();

      // Update conversation
      await db.update(parentTeacherConversations).set({
        lastMessageAt: new Date(),
        teacherUnreadCount: sql`${parentTeacherConversations.teacherUnreadCount} + 1`,
      }).where(eq(parentTeacherConversations.id, conversationId));

      res.status(201).json(successResponse(msg));
    } catch (error: any) {
      console.error("Send message error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to send message"));
    }
  });
}
