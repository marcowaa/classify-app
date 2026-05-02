import { and, asc, eq, inArray, lte, sql } from "drizzle-orm";
import { storage } from "../storage";
import {
  outboxEvents,
  taskNotificationGlobalPolicy,
  taskNotificationChildPolicy,
  taskNotificationDeliveryAttempts,
  childPushSubscriptions,
  parentChild,
  parentPushSubscriptions,
  parentNotificationPreferences,
  teacherPushSubscriptions,
} from "../../shared/schema";
import { createNotification } from "../notifications";
import { isWebPushReady, sendWebPushNotification } from "./webPushService";
import { isMobilePushReady, sendMobilePushNotification } from "./mobilePushService";
import { isOneSignalReady, sendOneSignalExternalUserNotification } from "./oneSignalService";
import { dispatchChatNotifications } from "./chatNotificationProviders";
import { NOTIFICATION_PRIORITIES, NOTIFICATION_STYLES, NOTIFICATION_TYPES } from "../../shared/notificationTypes";

const db = storage.db;

const ENABLED = process.env["TASK_NOTIFICATION_WORKER_ENABLED"] !== "false";

type WorkerProfile = "low" | "medium" | "high";

const PROFILE_DEFAULTS: Record<WorkerProfile, { intervalMs: number; batchSize: number; concurrency: number }> = {
  low: { intervalMs: 12000, batchSize: 12, concurrency: 2 },
  medium: { intervalMs: 7000, batchSize: 32, concurrency: 6 },
  high: { intervalMs: 3000, batchSize: 96, concurrency: 18 },
};

function resolveWorkerProfile(): WorkerProfile {
  const raw = String(process.env["TASK_NOTIFICATION_WORKER_PROFILE"] || "").trim().toLowerCase();
  if (raw === "low" || raw === "medium" || raw === "high") return raw;
  return process.env["NODE_ENV"] === "production" ? "medium" : "low";
}

function readNumberOverride(envKey: string): number | null {
  const raw = process.env[envKey];
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

const WORKER_PROFILE = resolveWorkerProfile();
const PROFILE = PROFILE_DEFAULTS[WORKER_PROFILE];

const INTERVAL_MS = Math.max(
  1000,
  readNumberOverride("TASK_NOTIFICATION_WORKER_INTERVAL_MS") ?? PROFILE.intervalMs
);
const BATCH_SIZE = Math.min(
  200,
  Math.max(1, readNumberOverride("TASK_NOTIFICATION_WORKER_BATCH_SIZE") ?? PROFILE.batchSize)
);
const CONCURRENCY = Math.min(
  25,
  Math.max(1, readNumberOverride("TASK_NOTIFICATION_WORKER_CONCURRENCY") ?? PROFILE.concurrency)
);
const AUTOSCALE_ENABLED = process.env["TASK_NOTIFICATION_WORKER_AUTOSCALE"] !== "false";
const AUTOSCALE_MAX_BATCH_SIZE = Math.min(
  500,
  Math.max(BATCH_SIZE, readNumberOverride("TASK_NOTIFICATION_WORKER_MAX_BATCH_SIZE") ?? BATCH_SIZE * 4)
);
const AUTOSCALE_MAX_CONCURRENCY = Math.min(
  50,
  Math.max(CONCURRENCY, readNumberOverride("TASK_NOTIFICATION_WORKER_MAX_CONCURRENCY") ?? CONCURRENCY * 3)
);
const AUTOSCALE_BACKLOG_HIGH = Math.max(
  BATCH_SIZE,
  readNumberOverride("TASK_NOTIFICATION_WORKER_BACKLOG_HIGH") ?? BATCH_SIZE * 3
);
const AUTOSCALE_BACKLOG_CRITICAL = Math.max(
  AUTOSCALE_BACKLOG_HIGH + 1,
  readNumberOverride("TASK_NOTIFICATION_WORKER_BACKLOG_CRITICAL") ?? BATCH_SIZE * 8
);
const MAX_RETRY_ATTEMPTS = Math.max(1, Math.min(20, Number(process.env["TASK_NOTIFICATION_WORKER_MAX_RETRIES"] || "8")));
const RETRY_BASE_MS = Math.max(1000, Number(process.env["TASK_NOTIFICATION_WORKER_RETRY_BASE_MS"] || "15000"));
const RETRY_MAX_MS = Math.max(RETRY_BASE_MS, Number(process.env["TASK_NOTIFICATION_WORKER_RETRY_MAX_MS"] || "1800000"));
const ADVISORY_LOCK_KEY = BigInt(928372);

type OutboxPayload = {
  taskId?: string;
  childId?: string;
  parentId?: string;
  recipientType?: "child" | "parent" | "admin" | "teacher" | "school";
  recipientId?: string;
  title?: string | null;
  source?: string;
  parentIds?: string[];
  subscriptionIds?: string[];
  message?: string;
  type?: string;
  url?: string;
  priority?: "normal" | "warning" | "urgent" | "blocking";
  soundAlert?: boolean;
  vibration?: boolean;
  channels?: string[];
  relatedId?: string | null;
  metadata?: Record<string, any>;
};

type TelemetryChannel = "web_push" | "mobile_push";
type TelemetryStatus = "success" | "failed" | "invalidated";

function createDeliveryTelemetry(recipientType: string, eventId: string) {
  return {
    eventId,
    recipientType,
    counts: {
      web_push: { success: 0, failed: 0, invalidated: 0 },
      mobile_push: { success: 0, failed: 0, invalidated: 0 },
    },
  };
}

function bumpTelemetry(
  telemetry: ReturnType<typeof createDeliveryTelemetry>,
  channel: TelemetryChannel,
  status: TelemetryStatus
) {
  telemetry.counts[channel][status] += 1;
}

function emitDeliveryTelemetry(
  telemetry: ReturnType<typeof createDeliveryTelemetry>,
  extra: Record<string, any> = {}
) {
  console.info("[generic-push-telemetry]", JSON.stringify({ ...telemetry, ...extra }));
}

function toPushLevel(priority?: string): "normal" | "high" | "max" {
  if (priority === "blocking") return "max";
  if (priority === "urgent" || priority === "warning") return "high";
  return "normal";
}

function resolveMobilePushSound(pushLevel: "normal" | "high" | "max", soundAlert?: boolean): string | undefined {
  if (soundAlert) return "default";
  // Fallback: force audible tone for urgent/blocking channels even if producer omitted soundAlert.
  if (pushLevel === "high" || pushLevel === "max") return "default";
  return undefined;
}

function toMinute(hhmm: string | null): number | null {
  if (!hhmm || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(hhmm)) return null;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function isNowInQuietHours(start: string | null, end: string | null): boolean {
  const startM = toMinute(start);
  const endM = toMinute(end);
  if (startM === null || endM === null) return false;

  const now = new Date();
  const nowM = now.getHours() * 60 + now.getMinutes();

  if (startM === endM) return false;
  if (startM < endM) return nowM >= startM && nowM < endM;
  return nowM >= startM || nowM < endM;
}

async function tryAcquireLock(): Promise<boolean> {
  const result = await db.execute(sql`SELECT pg_try_advisory_lock(${ADVISORY_LOCK_KEY}) as locked;`);
  const row: any = Array.isArray(result) ? result[0] : (result as any).rows?.[0];
  return !!(row?.locked || row?.pg_try_advisory_lock);
}

async function releaseLock() {
  await db.execute(sql`SELECT pg_advisory_unlock(${ADVISORY_LOCK_KEY});`);
}

function mapLevelToStylePriority(level: number) {
  if (level >= 4) return { style: NOTIFICATION_STYLES.FULLSCREEN, priority: NOTIFICATION_PRIORITIES.BLOCKING };
  if (level === 3) return { style: NOTIFICATION_STYLES.MODAL, priority: NOTIFICATION_PRIORITIES.URGENT };
  if (level === 2) return { style: NOTIFICATION_STYLES.BANNER, priority: NOTIFICATION_PRIORITIES.WARNING };
  return { style: NOTIFICATION_STYLES.TOAST, priority: NOTIFICATION_PRIORITIES.NORMAL };
}

async function resolveEffectivePolicy(childId: string) {
  const [globalPolicy] = await db.select().from(taskNotificationGlobalPolicy);
  const [childPolicy] = await db
    .select()
    .from(taskNotificationChildPolicy)
    .where(eq(taskNotificationChildPolicy.childId, childId));

  const defaults = {
    level: Math.min(4, Math.max(1, globalPolicy?.levelDefault ?? 1)),
    repeatIntervalMinutes: Math.max(1, globalPolicy?.repeatIntervalMinutes ?? 5),
    maxRetries: Math.max(1, globalPolicy?.maxRetries ?? 3),
    escalationEnabled: globalPolicy?.escalationEnabled ?? false,
    quietHoursStart: globalPolicy?.quietHoursStart ?? null,
    quietHoursEnd: globalPolicy?.quietHoursEnd ?? null,
    channelsJson: (globalPolicy?.channelsJson as any) || {
      inApp: true,
      webPush: false,
      mobilePush: false,
      parentEscalation: false,
    },
  };

  if (!childPolicy) return defaults;

  const childChannels = (childPolicy.channelsJson as any) || {};

  return {
    level: Math.min(4, Math.max(1, childPolicy.level)),
    repeatIntervalMinutes: Math.max(1, childPolicy.repeatIntervalMinutes),
    maxRetries: Math.max(1, childPolicy.maxRetries),
    escalationEnabled: childPolicy.escalationEnabled,
    quietHoursStart: childPolicy.quietHoursStart ?? defaults.quietHoursStart,
    quietHoursEnd: childPolicy.quietHoursEnd ?? defaults.quietHoursEnd,
    channelsJson: {
      ...childChannels,
      inApp: childChannels.inApp !== false,
      webPush: !!childChannels.webPush,
      mobilePush: !!childChannels.mobilePush,
      parentEscalation: !!childChannels.parentEscalation,
    },
  };
}

async function processInBatches<T>(items: T[], limit: number, handler: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += limit) {
    const chunk = items.slice(i, i + limit);
    await Promise.allSettled(chunk.map((item) => handler(item)));
  }
}

function getAdaptiveCycleConfig(pendingCount: number) {
  const base = {
    cycleBatchSize: BATCH_SIZE,
    cycleConcurrency: CONCURRENCY,
    scaleLevel: "base" as "base" | "high" | "critical",
  };

  if (!AUTOSCALE_ENABLED) return base;

  if (pendingCount >= AUTOSCALE_BACKLOG_CRITICAL) {
    return {
      cycleBatchSize: Math.min(AUTOSCALE_MAX_BATCH_SIZE, BATCH_SIZE * 4),
      cycleConcurrency: Math.min(AUTOSCALE_MAX_CONCURRENCY, Math.max(CONCURRENCY, Math.ceil(CONCURRENCY * 2.5))),
      scaleLevel: "critical" as const,
    };
  }

  if (pendingCount >= AUTOSCALE_BACKLOG_HIGH) {
    return {
      cycleBatchSize: Math.min(AUTOSCALE_MAX_BATCH_SIZE, BATCH_SIZE * 2),
      cycleConcurrency: Math.min(AUTOSCALE_MAX_CONCURRENCY, Math.max(CONCURRENCY, Math.ceil(CONCURRENCY * 1.5))),
      scaleLevel: "high" as const,
    };
  }

  return base;
}

function isPermanentFailure(errorMessage: string): boolean {
  const normalized = String(errorMessage || "").toUpperCase();
  return (
    normalized.includes("MISSING") ||
    normalized.includes("INVALID") ||
    normalized.includes("NOT_REGISTERED") ||
    normalized.includes("UNREGISTERED") ||
    normalized.includes("INVALID_REGISTRATION") ||
    normalized.includes("VAPID_NOT_CONFIGURED") ||
    normalized.includes("FCM_NOT_CONFIGURED") ||
    normalized.includes("ONESIGNAL_NOT_CONFIGURED") ||
    normalized.includes("RECIPIENT_MISSING")
  );
}

function computeRetryDecision(currentRetryCount: number, errorMessage: string) {
  const retryCount = currentRetryCount + 1;
  const permanent = isPermanentFailure(errorMessage);

  if (permanent || retryCount >= MAX_RETRY_ATTEMPTS) {
    return {
      retryCount,
      status: "failed" as const,
      nextRetryAt: null as Date | null,
      reason: permanent ? "permanent_failure" : "max_retries_reached",
    };
  }

  const expDelay = Math.min(RETRY_MAX_MS, RETRY_BASE_MS * Math.pow(2, Math.max(0, retryCount - 1)));
  const jitter = Math.floor(Math.random() * Math.max(1, Math.floor(expDelay * 0.25)));

  return {
    retryCount,
    status: "pending" as const,
    nextRetryAt: new Date(Date.now() + expDelay + jitter),
    reason: "transient_failure",
  };
}

async function recordAttempt(input: {
  taskId: string | null;
  childId: string;
  channel: string;
  attemptNo: number;
  status: "pending" | "sent" | "failed" | "acknowledged";
  error?: string | null;
  nextRetryAt?: Date | null;
}) {
  await db.insert(taskNotificationDeliveryAttempts).values({
    taskId: input.taskId,
    childId: input.childId,
    channel: input.channel,
    attemptNo: input.attemptNo,
    status: input.status,
    error: input.error || null,
    sentAt: input.status === "sent" ? new Date() : null,
    nextRetryAt: input.nextRetryAt || null,
  });
}

async function sendParentEscalation(childId: string, taskId: string | null, title?: string | null) {
  const links = await db
    .select({ parentId: parentChild.parentId })
    .from(parentChild)
    .where(eq(parentChild.childId, childId));

  for (const link of links) {
    await createNotification({
      parentId: link.parentId,
      type: NOTIFICATION_TYPES.TASK_NOTIFICATION_ESCALATION,
      title: "تصعيد إشعار مهمة",
      message: `تم تصعيد إشعار مهمة للطفل${title ? `: ${title}` : ""}`,
      relatedId: taskId,
      metadata: { childId, taskId, title: title || null },
    });
  }
}

async function handleTaskAssignedNotify(eventRow: typeof outboxEvents.$inferSelect) {
  const payload = (eventRow.payloadJson || {}) as OutboxPayload;
  const childId = payload.childId;
  const taskId = payload.taskId || null;

  if (!childId) {
    throw new Error("MISSING_CHILD_ID");
  }

  const policy = await resolveEffectivePolicy(childId);
  const { style, priority } = mapLevelToStylePriority(policy.level);
  const channels = policy.channelsJson || { inApp: true, webPush: false, mobilePush: false, parentEscalation: false };
  const isBlocking = policy.level >= 4;
  const inQuietHours = isNowInQuietHours(policy.quietHoursStart ?? null, policy.quietHoursEnd ?? null);
  const allowInApp = channels.inApp && (!inQuietHours || isBlocking);
  const allowPush = !inQuietHours || isBlocking;

  let attemptNo = eventRow.retryCount + 1;

  if (allowInApp) {
    await createNotification({
      childId,
      type: NOTIFICATION_TYPES.TASK_ASSIGNED,
      title: "مهمة جديدة!",
      message: `لديك مهمة جديدة${payload.title ? `: ${payload.title}` : ""}`,
      style,
      priority,
      soundAlert: policy.level >= 3,
      vibration: policy.level >= 3,
      relatedId: taskId,
      metadata: {
        taskId,
        source: payload.source || null,
        notifyLevel: policy.level,
        quietHoursMuted: inQuietHours && !isBlocking,
      },
    });

    await recordAttempt({
      taskId,
      childId,
      channel: "in_app",
      attemptNo,
      status: "sent",
    });

    attemptNo += 1;
  }

  if (allowPush && policy.level >= 3 && (channels.webPush || channels.mobilePush)) {
    let hasAnyPushSuccess = false;

    if (channels.webPush) {
      const webSubs = await db
        .select({
          id: childPushSubscriptions.id,
          endpoint: childPushSubscriptions.endpoint,
          p256dh: childPushSubscriptions.p256dh,
          auth: childPushSubscriptions.auth,
        })
        .from(childPushSubscriptions)
        .where(
          and(
            eq(childPushSubscriptions.childId, childId),
            eq(childPushSubscriptions.isActive, true),
            eq(childPushSubscriptions.platform, "web")
          )
        );

      if (!isWebPushReady()) {
        await recordAttempt({
          taskId,
          childId,
          channel: "web_push",
          attemptNo,
          status: "failed",
          error: "WEB_PUSH_VAPID_NOT_CONFIGURED",
        });
      } else if (webSubs.length === 0) {
        await recordAttempt({
          taskId,
          childId,
          channel: "web_push",
          attemptNo,
          status: "failed",
          error: "NO_ACTIVE_WEB_PUSH_SUBSCRIPTIONS",
        });
      } else {
        for (const sub of webSubs) {
          if (!sub.endpoint || !sub.p256dh || !sub.auth) {
            await recordAttempt({
              taskId,
              childId,
              channel: "web_push",
              attemptNo,
              status: "failed",
              error: "INVALID_WEB_PUSH_SUBSCRIPTION",
            });
            continue;
          }

          try {
            await sendWebPushNotification(
              {
                endpoint: sub.endpoint,
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
              {
                title: "مهمة جديدة!",
                body: `لديك مهمة جديدة${payload.title ? `: ${payload.title}` : ""}`,
                taskId,
                childId,
                level: policy.level,
                url: "/child-tasks",
              }
            );

            hasAnyPushSuccess = true;
            await recordAttempt({
              taskId,
              childId,
              channel: "web_push",
              attemptNo,
              status: "sent",
            });
          } catch (error: any) {
            const statusCode = error?.statusCode;
            if (statusCode === 404 || statusCode === 410) {
              await db
                .update(childPushSubscriptions)
                .set({ isActive: false, updatedAt: new Date() })
                .where(eq(childPushSubscriptions.id, sub.id));
            }

            await recordAttempt({
              taskId,
              childId,
              channel: "web_push",
              attemptNo,
              status: "failed",
              error: error?.message || "WEB_PUSH_SEND_FAILED",
            });
          }
        }
      }
      attemptNo += 1;
    }

    if (channels.mobilePush) {
      const mobileSubs = await db
        .select({
          id: childPushSubscriptions.id,
          token: childPushSubscriptions.token,
          platform: childPushSubscriptions.platform,
        })
        .from(childPushSubscriptions)
        .where(
          and(
            eq(childPushSubscriptions.childId, childId),
            eq(childPushSubscriptions.isActive, true)
          )
        );

      const mobileTokens = mobileSubs.filter(
        (row: { id: string; token: string | null; platform: string }) =>
          (row.platform === "android" || row.platform === "ios") && !!row.token
      );

      if (!isMobilePushReady()) {
        await recordAttempt({
          taskId,
          childId,
          channel: "mobile_push",
          attemptNo,
          status: "failed",
          error: "MOBILE_PUSH_FCM_NOT_CONFIGURED",
        });
      } else if (mobileTokens.length === 0) {
        await recordAttempt({
          taskId,
          childId,
          channel: "mobile_push",
          attemptNo,
          status: "failed",
          error: "NO_ACTIVE_MOBILE_PUSH_TOKENS",
        });
      } else {
        for (const sub of mobileTokens) {
          try {
            await sendMobilePushNotification(sub.token as string, {
              title: "مهمة جديدة!",
              body: `لديك مهمة جديدة${payload.title ? `: ${payload.title}` : ""}`,
              data: {
                taskId: taskId || "",
                childId,
                level: String(policy.level),
                url: "/child-tasks",
              },
            });

            hasAnyPushSuccess = true;
            await recordAttempt({
              taskId,
              childId,
              channel: "mobile_push",
              attemptNo,
              status: "sent",
            });
          } catch (error: any) {
            const errorMessage = error?.message || "MOBILE_PUSH_SEND_FAILED";

            if (
              errorMessage.includes("NotRegistered") ||
              errorMessage.includes("InvalidRegistration")
            ) {
              await db
                .update(childPushSubscriptions)
                .set({ isActive: false, updatedAt: new Date() })
                .where(eq(childPushSubscriptions.id, sub.id));
            }

            await recordAttempt({
              taskId,
              childId,
              channel: "mobile_push",
              attemptNo,
              status: "failed",
              error: errorMessage,
            });
          }
        }
      }

      attemptNo += 1;
    }

    if (!hasAnyPushSuccess && (policy.escalationEnabled || channels.parentEscalation)) {
      await sendParentEscalation(childId, taskId, payload.title);
    }
  }
}

async function handleAdminParentWebPushNotify(eventRow: typeof outboxEvents.$inferSelect) {
  const payload = (eventRow.payloadJson || {}) as OutboxPayload;
  const messageType = payload.type || "broadcast";

  if (!isWebPushReady()) {
    await db
      .update(outboxEvents)
      .set({ status: "failed", lastError: "WEB_PUSH_VAPID_NOT_CONFIGURED" })
      .where(eq(outboxEvents.id, eventRow.id));
    return;
  }

  let subscriptions: Array<{
    id: string;
    parentId: string;
    endpoint: string | null;
    p256dh: string | null;
    auth: string | null;
  }> = [];

  if (Array.isArray(payload.subscriptionIds) && payload.subscriptionIds.length > 0) {
    subscriptions = await db
      .select({
        id: parentPushSubscriptions.id,
        parentId: parentPushSubscriptions.parentId,
        endpoint: parentPushSubscriptions.endpoint,
        p256dh: parentPushSubscriptions.p256dh,
        auth: parentPushSubscriptions.auth,
      })
      .from(parentPushSubscriptions)
      .where(
        and(
          inArray(parentPushSubscriptions.id, payload.subscriptionIds),
          eq(parentPushSubscriptions.platform, "web"),
          eq(parentPushSubscriptions.isActive, true)
        )
      );
  } else {
    const parentIds = Array.isArray(payload.parentIds) ? payload.parentIds : [];
    if (parentIds.length === 0) {
      await db
        .update(outboxEvents)
        .set({ status: "sent", sentAt: new Date(), lastError: null })
        .where(eq(outboxEvents.id, eventRow.id));
      return;
    }

    const prefsRows = await db
      .select({
        parentId: parentNotificationPreferences.parentId,
        webPushEnabled: parentNotificationPreferences.webPushEnabled,
        mutedTypes: parentNotificationPreferences.mutedTypes,
        quietHoursStart: parentNotificationPreferences.quietHoursStart,
        quietHoursEnd: parentNotificationPreferences.quietHoursEnd,
      })
      .from(parentNotificationPreferences)
      .where(inArray(parentNotificationPreferences.parentId, parentIds));

    const prefsMap = new Map<string, {
      webPushEnabled: boolean;
      mutedTypes: string[];
      quietHoursStart: string | null;
      quietHoursEnd: string | null;
    }>();

    for (const row of prefsRows) {
      prefsMap.set(row.parentId, {
        webPushEnabled: row.webPushEnabled,
        mutedTypes: Array.isArray(row.mutedTypes) ? (row.mutedTypes as string[]) : [],
        quietHoursStart: row.quietHoursStart ?? null,
        quietHoursEnd: row.quietHoursEnd ?? null,
      });
    }

    const eligibleParentIds = parentIds.filter((parentId) => {
      const pref = prefsMap.get(parentId);
      if (!pref) return true;
      if (!pref.webPushEnabled) return false;
      if (pref.mutedTypes.includes(messageType)) return false;
      if (isNowInQuietHours(pref.quietHoursStart, pref.quietHoursEnd)) return false;
      return true;
    });

    if (eligibleParentIds.length === 0) {
      await db
        .update(outboxEvents)
        .set({ status: "sent", sentAt: new Date(), lastError: null })
        .where(eq(outboxEvents.id, eventRow.id));
      return;
    }

    subscriptions = await db
      .select({
        id: parentPushSubscriptions.id,
        parentId: parentPushSubscriptions.parentId,
        endpoint: parentPushSubscriptions.endpoint,
        p256dh: parentPushSubscriptions.p256dh,
        auth: parentPushSubscriptions.auth,
      })
      .from(parentPushSubscriptions)
      .where(
        and(
          inArray(parentPushSubscriptions.parentId, eligibleParentIds),
          eq(parentPushSubscriptions.platform, "web"),
          eq(parentPushSubscriptions.isActive, true)
        )
      );
  }

  if (subscriptions.length === 0) {
    await db
      .update(outboxEvents)
      .set({ status: "sent", sentAt: new Date(), lastError: null })
      .where(eq(outboxEvents.id, eventRow.id));
    return;
  }

  const retrySubscriptionIds: string[] = [];

  for (const sub of subscriptions) {
    if (!sub.endpoint || !sub.p256dh || !sub.auth) {
      continue;
    }

    try {
      await sendWebPushNotification(
        {
          endpoint: sub.endpoint,
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
        {
          title: payload.title || "إشعار جديد",
          body: payload.message || "لديك تحديث جديد",
          type: messageType,
          url: payload.url || "/notifications",
        }
      );
    } catch (error: any) {
      const statusCode = error?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await db
          .update(parentPushSubscriptions)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(parentPushSubscriptions.id, sub.id));
      } else {
        retrySubscriptionIds.push(sub.id);
      }
    }
  }

  if (retrySubscriptionIds.length === 0) {
    await db
      .update(outboxEvents)
      .set({ status: "sent", sentAt: new Date(), lastError: null })
      .where(eq(outboxEvents.id, eventRow.id));
    return;
  }

  const retryCount = (eventRow.retryCount || 0) + 1;
  const nextRetryAt = new Date(Date.now() + Math.min(retryCount, 10) * 60 * 1000);

  await db
    .update(outboxEvents)
    .set({
      status: retryCount >= 8 ? "failed" : "pending",
      retryCount,
      lastError: "ADMIN_WEB_PUSH_PARTIAL_FAILURE",
      availableAt: nextRetryAt,
      payloadJson: {
        ...payload,
        subscriptionIds: retrySubscriptionIds,
      },
    })
    .where(eq(outboxEvents.id, eventRow.id));
}

async function handleGenericPushNotify(eventRow: typeof outboxEvents.$inferSelect) {
  const payload = (eventRow.payloadJson || {}) as OutboxPayload;
  const recipientType = payload.recipientType;
  const recipientId = payload.recipientId;

  if (!recipientType || !recipientId) {
    throw new Error("GENERIC_PUSH_RECIPIENT_MISSING");
  }

  const messageType = payload.type || "broadcast";
  const channels = Array.isArray(payload.channels) ? payload.channels : ["web_push", "mobile_push"];
  const wantsWebPush = channels.includes("web_push");
  const wantsMobilePush = channels.includes("mobile_push");
  const pushLevel = toPushLevel(payload.priority);
  const pushSound = resolveMobilePushSound(pushLevel, !!payload.soundAlert);
  const title = payload.title || "إشعار جديد";
  const body = payload.message || "لديك تحديث جديد";
  const url = payload.url || "/notifications";

  const transientFailures: string[] = [];
  const telemetry = createDeliveryTelemetry(recipientType, eventRow.id);

  try {
    const chatDispatch = await dispatchChatNotifications({
      recipientType: recipientType as any,
      recipientId,
      title,
      body,
      url,
      metadata: payload.metadata || {},
    });

    for (const result of chatDispatch.results) {
      if (result.attempted && !result.success) {
        transientFailures.push(result.error || `${result.provider.toUpperCase()}_FAILED`);
      }
    }
  } catch (error: any) {
    transientFailures.push(error?.message || "CHAT_DISPATCH_FAILED");
  }

  // Optional paid-service mirror: OneSignal (enabled/disabled from unified paid services config).
  // It runs in parallel with native web/mobile channels and does not replace existing delivery paths.
  if (wantsWebPush || wantsMobilePush) {
    try {
      if (await isOneSignalReady()) {
        await sendOneSignalExternalUserNotification({
          externalUserIds: [recipientId, `${recipientType}:${recipientId}`],
          title,
          body,
          url,
          data: {
            recipientType,
            recipientId,
            type: messageType,
            priority: payload.priority || "normal",
            relatedId: payload.relatedId || null,
            metadata: payload.metadata || {},
          },
        });
      }
    } catch (error: any) {
      transientFailures.push(error?.message || "ONESIGNAL_SEND_FAILED");
    }
  }

  if (recipientType === "parent") {
    const prefRows = await db
      .select({
        webPushEnabled: parentNotificationPreferences.webPushEnabled,
        mutedTypes: parentNotificationPreferences.mutedTypes,
        quietHoursStart: parentNotificationPreferences.quietHoursStart,
        quietHoursEnd: parentNotificationPreferences.quietHoursEnd,
      })
      .from(parentNotificationPreferences)
      .where(eq(parentNotificationPreferences.parentId, recipientId))
      .limit(1);

    const pref = prefRows[0];
    const mutedTypes = Array.isArray(pref?.mutedTypes) ? (pref?.mutedTypes as string[]) : [];
    const blockedByPref =
      pref?.webPushEnabled === false ||
      mutedTypes.includes(messageType) ||
      isNowInQuietHours(pref?.quietHoursStart ?? null, pref?.quietHoursEnd ?? null);

    if (!blockedByPref && wantsWebPush && isWebPushReady()) {
      const webSubs = await db
        .select({
          id: parentPushSubscriptions.id,
          endpoint: parentPushSubscriptions.endpoint,
          p256dh: parentPushSubscriptions.p256dh,
          auth: parentPushSubscriptions.auth,
        })
        .from(parentPushSubscriptions)
        .where(
          and(
            eq(parentPushSubscriptions.parentId, recipientId),
            eq(parentPushSubscriptions.platform, "web"),
            eq(parentPushSubscriptions.isActive, true)
          )
        );

      for (const sub of webSubs) {
        if (!sub.endpoint || !sub.p256dh || !sub.auth) continue;
        try {
          await sendWebPushNotification(
            { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
            {
              title,
              body,
              type: messageType,
              url,
              priority: payload.priority || "normal",
              soundAlert: !!payload.soundAlert,
            }
          );
          bumpTelemetry(telemetry, "web_push", "success");
        } catch (error: any) {
          const statusCode = error?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await db
              .update(parentPushSubscriptions)
              .set({ isActive: false, updatedAt: new Date() })
              .where(eq(parentPushSubscriptions.id, sub.id));
            bumpTelemetry(telemetry, "web_push", "invalidated");
          } else {
            transientFailures.push("PARENT_WEB_PUSH_TRANSIENT_FAILURE");
            bumpTelemetry(telemetry, "web_push", "failed");
          }
        }
      }
    }

    if (wantsMobilePush && isMobilePushReady()) {
      const mobileSubs = await db
        .select({
          id: parentPushSubscriptions.id,
          token: parentPushSubscriptions.token,
          platform: parentPushSubscriptions.platform,
        })
        .from(parentPushSubscriptions)
        .where(
          and(
            eq(parentPushSubscriptions.parentId, recipientId),
            eq(parentPushSubscriptions.isActive, true)
          )
        );

      for (const sub of mobileSubs) {
        if ((sub.platform !== "android" && sub.platform !== "ios") || !sub.token) continue;
        try {
          await sendMobilePushNotification(sub.token, {
            title,
            body,
            priority: pushLevel,
            sound: pushSound,
            channelId: pushLevel === "max" ? "critical_alerts" : pushLevel === "high" ? "high_priority" : "general",
            data: {
              recipientType,
              recipientId,
              type: messageType,
              url,
            },
          });
          bumpTelemetry(telemetry, "mobile_push", "success");
        } catch (error: any) {
          const errorMessage = error?.message || "PARENT_MOBILE_PUSH_SEND_FAILED";
          if (errorMessage.includes("NotRegistered") || errorMessage.includes("InvalidRegistration")) {
            await db
              .update(parentPushSubscriptions)
              .set({ isActive: false, updatedAt: new Date() })
              .where(eq(parentPushSubscriptions.id, sub.id));
            bumpTelemetry(telemetry, "mobile_push", "invalidated");
          } else {
            transientFailures.push(errorMessage);
            bumpTelemetry(telemetry, "mobile_push", "failed");
          }
        }
      }
    }
  }

  if (recipientType === "child") {
    if (wantsWebPush && isWebPushReady()) {
      const webSubs = await db
        .select({
          id: childPushSubscriptions.id,
          endpoint: childPushSubscriptions.endpoint,
          p256dh: childPushSubscriptions.p256dh,
          auth: childPushSubscriptions.auth,
        })
        .from(childPushSubscriptions)
        .where(
          and(
            eq(childPushSubscriptions.childId, recipientId),
            eq(childPushSubscriptions.platform, "web"),
            eq(childPushSubscriptions.isActive, true)
          )
        );

      for (const sub of webSubs) {
        if (!sub.endpoint || !sub.p256dh || !sub.auth) continue;
        try {
          await sendWebPushNotification(
            { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
            {
              title,
              body,
              type: messageType,
              url,
              priority: payload.priority || "normal",
              soundAlert: !!payload.soundAlert,
            }
          );
          bumpTelemetry(telemetry, "web_push", "success");
        } catch (error: any) {
          const statusCode = error?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await db
              .update(childPushSubscriptions)
              .set({ isActive: false, updatedAt: new Date() })
              .where(eq(childPushSubscriptions.id, sub.id));
            bumpTelemetry(telemetry, "web_push", "invalidated");
          } else {
            transientFailures.push("CHILD_WEB_PUSH_TRANSIENT_FAILURE");
            bumpTelemetry(telemetry, "web_push", "failed");
          }
        }
      }
    }

    if (wantsMobilePush && isMobilePushReady()) {
      const mobileSubs = await db
        .select({
          id: childPushSubscriptions.id,
          token: childPushSubscriptions.token,
          platform: childPushSubscriptions.platform,
        })
        .from(childPushSubscriptions)
        .where(
          and(
            eq(childPushSubscriptions.childId, recipientId),
            eq(childPushSubscriptions.isActive, true)
          )
        );

      for (const sub of mobileSubs) {
        if ((sub.platform !== "android" && sub.platform !== "ios") || !sub.token) continue;
        try {
          await sendMobilePushNotification(sub.token, {
            title,
            body,
            priority: pushLevel,
            sound: pushSound,
            channelId: pushLevel === "max" ? "critical_alerts" : pushLevel === "high" ? "high_priority" : "general",
            data: {
              recipientType,
              recipientId,
              type: messageType,
              url,
            },
          });
          bumpTelemetry(telemetry, "mobile_push", "success");
        } catch (error: any) {
          const errorMessage = error?.message || "CHILD_MOBILE_PUSH_SEND_FAILED";
          if (errorMessage.includes("NotRegistered") || errorMessage.includes("InvalidRegistration")) {
            await db
              .update(childPushSubscriptions)
              .set({ isActive: false, updatedAt: new Date() })
              .where(eq(childPushSubscriptions.id, sub.id));
            bumpTelemetry(telemetry, "mobile_push", "invalidated");
          } else {
            transientFailures.push(errorMessage);
            bumpTelemetry(telemetry, "mobile_push", "failed");
          }
        }
      }
    }
  }

  if (recipientType === "teacher") {
    if (wantsWebPush && isWebPushReady()) {
      const webSubs = await db
        .select({
          id: teacherPushSubscriptions.id,
          endpoint: teacherPushSubscriptions.endpoint,
          p256dh: teacherPushSubscriptions.p256dh,
          auth: teacherPushSubscriptions.auth,
        })
        .from(teacherPushSubscriptions)
        .where(
          and(
            eq(teacherPushSubscriptions.teacherId, recipientId),
            eq(teacherPushSubscriptions.platform, "web"),
            eq(teacherPushSubscriptions.isActive, true)
          )
        );

      for (const sub of webSubs) {
        if (!sub.endpoint || !sub.p256dh || !sub.auth) continue;
        try {
          await sendWebPushNotification(
            { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
            {
              title,
              body,
              type: messageType,
              url,
              priority: payload.priority || "normal",
              soundAlert: !!payload.soundAlert,
            }
          );
          bumpTelemetry(telemetry, "web_push", "success");
        } catch (error: any) {
          const statusCode = error?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await db
              .update(teacherPushSubscriptions)
              .set({ isActive: false, updatedAt: new Date() })
              .where(eq(teacherPushSubscriptions.id, sub.id));
            bumpTelemetry(telemetry, "web_push", "invalidated");
          } else {
            transientFailures.push("TEACHER_WEB_PUSH_TRANSIENT_FAILURE");
            bumpTelemetry(telemetry, "web_push", "failed");
          }
        }
      }
    }

    if (wantsMobilePush && isMobilePushReady()) {
      const mobileSubs = await db
        .select({
          id: teacherPushSubscriptions.id,
          token: teacherPushSubscriptions.token,
          platform: teacherPushSubscriptions.platform,
        })
        .from(teacherPushSubscriptions)
        .where(
          and(
            eq(teacherPushSubscriptions.teacherId, recipientId),
            eq(teacherPushSubscriptions.isActive, true)
          )
        );

      for (const sub of mobileSubs) {
        if ((sub.platform !== "android" && sub.platform !== "ios") || !sub.token) continue;
        try {
          await sendMobilePushNotification(sub.token, {
            title,
            body,
            priority: pushLevel,
            sound: pushSound,
            channelId: pushLevel === "max" ? "critical_alerts" : pushLevel === "high" ? "high_priority" : "general",
            data: {
              recipientType,
              recipientId,
              type: messageType,
              url,
            },
          });
          bumpTelemetry(telemetry, "mobile_push", "success");
        } catch (error: any) {
          const errorMessage = error?.message || "TEACHER_MOBILE_PUSH_SEND_FAILED";
          if (errorMessage.includes("NotRegistered") || errorMessage.includes("InvalidRegistration")) {
            await db
              .update(teacherPushSubscriptions)
              .set({ isActive: false, updatedAt: new Date() })
              .where(eq(teacherPushSubscriptions.id, sub.id));
            bumpTelemetry(telemetry, "mobile_push", "invalidated");
          } else {
            transientFailures.push(errorMessage);
            bumpTelemetry(telemetry, "mobile_push", "failed");
          }
        }
      }
    }
  }

  if (transientFailures.length === 0) {
    emitDeliveryTelemetry(telemetry, { status: "sent" });
    await db
      .update(outboxEvents)
      .set({ status: "sent", sentAt: new Date(), lastError: null })
      .where(eq(outboxEvents.id, eventRow.id));
    return;
  }

  const firstError = transientFailures[0] || "GENERIC_PUSH_TRANSIENT_FAILURE";
  const retryDecision = computeRetryDecision(eventRow.retryCount || 0, firstError);

  emitDeliveryTelemetry(telemetry, {
    status: retryDecision.status,
    retryCount: retryDecision.retryCount,
    firstError,
    retryReason: retryDecision.reason,
  });

  await db
    .update(outboxEvents)
    .set({
      status: retryDecision.status,
      retryCount: retryDecision.retryCount,
      lastError: firstError,
      availableAt: retryDecision.nextRetryAt || eventRow.availableAt,
    })
    .where(eq(outboxEvents.id, eventRow.id));
}

async function processEvent(eventRow: typeof outboxEvents.$inferSelect) {
  if (eventRow.type === "TASK_ASSIGNED_NOTIFY") {
    await handleTaskAssignedNotify(eventRow);
    await db
      .update(outboxEvents)
      .set({ status: "sent", sentAt: new Date(), lastError: null })
      .where(eq(outboxEvents.id, eventRow.id));
    return;
  }

  if (eventRow.type === "ADMIN_PARENT_WEB_PUSH_NOTIFY") {
    await handleAdminParentWebPushNotify(eventRow);
    return;
  }

  if (eventRow.type === "GENERIC_PUSH_NOTIFY") {
    await handleGenericPushNotify(eventRow);
    return;
  }

  await db
    .update(outboxEvents)
    .set({ status: "sent", sentAt: new Date(), lastError: null })
    .where(eq(outboxEvents.id, eventRow.id));
}

async function processEventSafe(eventRow: typeof outboxEvents.$inferSelect) {
  try {
    await processEvent(eventRow);
  } catch (error: any) {
    const errorMessage = error?.message || "TASK_NOTIFY_PROCESSING_FAILED";
    const retryDecision = computeRetryDecision(eventRow.retryCount || 0, errorMessage);

    await db
      .update(outboxEvents)
      .set({
        status: retryDecision.status,
        retryCount: retryDecision.retryCount,
        lastError: errorMessage,
        availableAt: retryDecision.nextRetryAt || eventRow.availableAt,
      })
      .where(eq(outboxEvents.id, eventRow.id));
  }
}

export async function getTaskNotificationWorkerMetrics() {
  const statusRows = await db
    .select({
      status: outboxEvents.status,
      count: sql<number>`count(*)`,
    })
    .from(outboxEvents)
    .groupBy(outboxEvents.status);

  const [pendingReadyRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(outboxEvents)
    .where(and(eq(outboxEvents.status, "pending"), lte(outboxEvents.availableAt, new Date())));

  const [oldestPendingRow] = await db
    .select({ availableAt: outboxEvents.availableAt })
    .from(outboxEvents)
    .where(eq(outboxEvents.status, "pending"))
    .orderBy(asc(outboxEvents.availableAt))
    .limit(1);

  const statusMap = Object.fromEntries(
    statusRows.map((row: { status: string; count: number }) => [row.status, Number(row.count || 0)])
  );

  return {
    enabled: ENABLED,
    profile: WORKER_PROFILE,
    config: {
      intervalMs: INTERVAL_MS,
      batchSize: BATCH_SIZE,
      concurrency: CONCURRENCY,
      autoscaleEnabled: AUTOSCALE_ENABLED,
      autoscaleMaxBatchSize: AUTOSCALE_MAX_BATCH_SIZE,
      autoscaleMaxConcurrency: AUTOSCALE_MAX_CONCURRENCY,
      autoscaleBacklogHigh: AUTOSCALE_BACKLOG_HIGH,
      autoscaleBacklogCritical: AUTOSCALE_BACKLOG_CRITICAL,
      maxRetryAttempts: MAX_RETRY_ATTEMPTS,
      retryBaseMs: RETRY_BASE_MS,
      retryMaxMs: RETRY_MAX_MS,
    },
    outbox: {
      total: Object.values(statusMap).reduce((sum, value) => sum + Number(value || 0), 0),
      pending: statusMap["pending"] || 0,
      pendingReady: Number(pendingReadyRow?.count || 0),
      sent: statusMap["sent"] || 0,
      failed: statusMap["failed"] || 0,
      processing: statusMap["processing"] || 0,
      oldestPendingAvailableAt: oldestPendingRow?.availableAt || null,
    },
    generatedAt: new Date().toISOString(),
  };
}

async function runCycle() {
  const locked = await tryAcquireLock();
  if (!locked) return;

  try {
    const startedAt = Date.now();
    const [pendingStats] = await db
      .select({
        pendingCount: sql<number>`count(*)`,
      })
      .from(outboxEvents)
      .where(and(eq(outboxEvents.status, "pending"), lte(outboxEvents.availableAt, new Date())));

    const pendingCount = Number(pendingStats?.pendingCount || 0);
    const { cycleBatchSize, cycleConcurrency, scaleLevel } = getAdaptiveCycleConfig(pendingCount);

    const pendingEvents = await db
      .select()
      .from(outboxEvents)
      .where(and(eq(outboxEvents.status, "pending"), lte(outboxEvents.availableAt, new Date())))
      .orderBy(asc(outboxEvents.createdAt))
      .limit(cycleBatchSize);

    if (pendingEvents.length > 0) {
      await processInBatches(pendingEvents, cycleConcurrency, processEventSafe);
      console.info("[task-notification-worker] cycle", {
        pendingCount,
        processed: pendingEvents.length,
        durationMs: Date.now() - startedAt,
        batchSize: cycleBatchSize,
        concurrency: cycleConcurrency,
        scaleLevel,
      });
    }
  } finally {
    await releaseLock();
  }
}

async function runCycleSafe() {
  try {
    await runCycle();
  } catch (error) {
    console.error("task notification worker cycle error", error);
  }
}

export function startTaskNotificationWorker() {
  if (!ENABLED) return;
  console.info("[task-notification-worker] started", {
    profile: WORKER_PROFILE,
    intervalMs: INTERVAL_MS,
    batchSize: BATCH_SIZE,
    concurrency: CONCURRENCY,
    autoscale: {
      enabled: AUTOSCALE_ENABLED,
      backlogHigh: AUTOSCALE_BACKLOG_HIGH,
      backlogCritical: AUTOSCALE_BACKLOG_CRITICAL,
      maxBatchSize: AUTOSCALE_MAX_BATCH_SIZE,
      maxConcurrency: AUTOSCALE_MAX_CONCURRENCY,
    },
  });
  runCycleSafe();
  setInterval(runCycleSafe, INTERVAL_MS).unref();
}
