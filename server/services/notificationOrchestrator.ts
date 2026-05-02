import { notifications, notificationSettings, outboxEvents, parents } from "../../shared/schema";
import { storage } from "../storage";
import type { NotificationPriority, NotificationStyle, NotificationType } from "../../shared/notificationTypes";
import { notificationBus } from "./notificationBus";
import { sendNotificationEmail } from "../mailer";
import { sseManager } from "../utils/sseManager";
import { and, desc, eq, gte } from "drizzle-orm";
import { buildNotificationDedupeKey, resolveNotificationProfile } from "./notificationIntelligence";
import { resolveCampaignFrequencyPolicy, type CampaignDeliveryStrength } from "./decisionChannels";

const db = storage.db;

type RecipientType = "child" | "parent" | "admin" | "teacher" | "school";

type NotificationChannel = "in_app" | "email" | "web_push" | "mobile_push";

const GLOBAL_CAMPAIGN_POLICY = {
  cooldownMinutes: 45,
  maxPerDay: 5,
  sessionWindowMinutes: 120,
  maxPerSessionWindow: 2,
};

type OrchestratorInput = {
  recipientType: RecipientType;
  recipientId: string;
  type: NotificationType;
  title?: string | null;
  message: string;
  style?: NotificationStyle;
  priority?: NotificationPriority;
  soundAlert?: boolean;
  vibration?: boolean;
  relatedId?: string | null;
  ctaAction?: string | null;
  ctaTarget?: string | null;
  metadata?: Record<string, any> | null;
  groupKey?: string | null;
  ttlMinutes?: number;
  channels?: NotificationChannel[];
};

class NotificationOrchestrator {
  private async shouldThrottleCampaignGlobal(input: {
    recipientType: RecipientType;
    recipientId: string;
  }) {
    const policy = GLOBAL_CAMPAIGN_POLICY;
    const now = Date.now();
    const sinceDay = new Date(now - 24 * 60 * 60 * 1000);
    const sinceSession = new Date(now - policy.sessionWindowMinutes * 60 * 1000);

    const recipientFilter =
      input.recipientType === "child"
        ? eq(notifications.childId, input.recipientId)
        : input.recipientType === "school"
          ? eq(notifications.schoolId, input.recipientId)
          : input.recipientType === "admin"
            ? eq(notifications.adminId, input.recipientId)
            : input.recipientType === "teacher"
              ? eq(notifications.teacherId, input.recipientId)
              : eq(notifications.parentId, input.recipientId);

    const recentRows = await db
      .select({
        id: notifications.id,
        metadata: notifications.metadata,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(and(recipientFilter, gte(notifications.createdAt, sinceDay)))
      .orderBy(desc(notifications.createdAt))
      .limit(250);

    const campaignRows = recentRows.filter((row: { metadata: Record<string, any> | null }) => {
      const campaignType = String((row.metadata as any)?.campaignType || "").trim();
      return campaignType.length > 0;
    });

    if (campaignRows.length >= policy.maxPerDay) {
      return { throttled: true, reason: "GLOBAL_DAILY_LIMIT", policy };
    }

    const sessionCount = campaignRows.filter((row: { createdAt: Date }) => row.createdAt >= sinceSession).length;
    if (sessionCount >= policy.maxPerSessionWindow) {
      return { throttled: true, reason: "GLOBAL_SESSION_LIMIT", policy };
    }

    const latest = campaignRows[0];
    if (latest) {
      const elapsedMinutes = Math.floor((now - new Date(latest.createdAt).getTime()) / (60 * 1000));
      if (elapsedMinutes < policy.cooldownMinutes) {
        return { throttled: true, reason: "GLOBAL_COOLDOWN", policy };
      }
    }

    return { throttled: false as const, reason: "OK", policy };
  }

  private async shouldThrottleCampaign(input: {
    recipientType: RecipientType;
    recipientId: string;
    strength: CampaignDeliveryStrength;
  }) {
    const policy = resolveCampaignFrequencyPolicy(input.strength);
    const now = Date.now();
    const sinceDay = new Date(now - 24 * 60 * 60 * 1000);
    const sinceSession = new Date(now - policy.sessionWindowMinutes * 60 * 1000);

    const recipientFilter =
      input.recipientType === "child"
        ? eq(notifications.childId, input.recipientId)
        : input.recipientType === "school"
          ? eq(notifications.schoolId, input.recipientId)
          : input.recipientType === "admin"
            ? eq(notifications.adminId, input.recipientId)
            : input.recipientType === "teacher"
              ? eq(notifications.teacherId, input.recipientId)
              : eq(notifications.parentId, input.recipientId);

    const recentRows = await db
      .select({
        id: notifications.id,
        metadata: notifications.metadata,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(and(recipientFilter, gte(notifications.createdAt, sinceDay)))
      .orderBy(desc(notifications.createdAt))
      .limit(250);

    const campaignRows = recentRows.filter((row: { metadata: Record<string, any> | null }) => {
      const campaignType = String((row.metadata as any)?.campaignType || "").trim();
      return campaignType.length > 0;
    });

    const sameStrengthRows = campaignRows.filter((row: { metadata: Record<string, any> | null }) => {
      const rowStrength = String((row.metadata as any)?.deliveryStrength || "").trim();
      return rowStrength === input.strength;
    });

    const dailyCount = sameStrengthRows.length;
    if (dailyCount >= policy.maxPerDay) {
      return { throttled: true, reason: "DAILY_LIMIT", policy };
    }

    const sessionCount = sameStrengthRows.filter((row: { createdAt: Date }) => row.createdAt >= sinceSession).length;
    if (sessionCount >= policy.maxPerSessionWindow) {
      return { throttled: true, reason: "SESSION_LIMIT", policy };
    }

    const latest = sameStrengthRows[0];
    if (latest) {
      const elapsedMinutes = Math.floor((now - new Date(latest.createdAt).getTime()) / (60 * 1000));
      if (elapsedMinutes < policy.cooldownMinutes) {
        return { throttled: true, reason: "COOLDOWN", policy };
      }
    }

    return { throttled: false as const, reason: "OK", policy };
  }

  private async findRecentDuplicate(input: {
    recipientType: RecipientType;
    recipientId: string;
    type: NotificationType;
    dedupeKey: string;
    dedupeWindowSeconds: number;
  }) {
    const since = new Date(Date.now() - input.dedupeWindowSeconds * 1000);

    const recipientFilter =
      input.recipientType === "child"
        ? eq(notifications.childId, input.recipientId)
        : input.recipientType === "school"
          ? eq(notifications.schoolId, input.recipientId)
          : input.recipientType === "admin"
            ? eq(notifications.adminId, input.recipientId)
            : input.recipientType === "teacher"
              ? eq(notifications.teacherId, input.recipientId)
              : eq(notifications.parentId, input.recipientId);

    const recent = await db
      .select({
        id: notifications.id,
        metadata: notifications.metadata,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(
        and(
          recipientFilter,
          eq(notifications.type, input.type),
          gte(notifications.createdAt, since)
        )
      )
      .orderBy(desc(notifications.createdAt))
      .limit(25);

    return recent.find((row: { id: string; metadata: Record<string, any> | null; createdAt: Date }) => {
      const key = String((row.metadata as any)?.dedupeKey || "");
      return key === input.dedupeKey;
    });
  }

  private async queueGenericPushEvent(input: {
    recipientType: RecipientType;
    recipientId: string;
    type: NotificationType;
    title?: string | null;
    message: string;
    priority: NotificationPriority;
    relatedId?: string | null;
    soundAlert: boolean;
    vibration: boolean;
    metadata?: Record<string, any> | null;
    ctaTarget?: string | null;
    channels: NotificationChannel[];
  }) {
    if (!input.channels.includes("web_push") && !input.channels.includes("mobile_push")) {
      return;
    }

    await db.insert(outboxEvents).values({
      type: "GENERIC_PUSH_NOTIFY",
      payloadJson: {
        recipientType: input.recipientType,
        recipientId: input.recipientId,
        type: input.type,
        title: input.title || "إشعار جديد",
        message: input.message,
        priority: input.priority,
        relatedId: input.relatedId || null,
        soundAlert: input.soundAlert,
        vibration: input.vibration,
        url: input.ctaTarget || "/notifications",
        channels: input.channels,
        metadata: input.metadata || {},
      },
      status: "pending",
      availableAt: new Date(),
    });
  }

  private async canSendEmailChannel(): Promise<boolean> {
    const rows = await db.select().from(notificationSettings).limit(1);
    return rows[0]?.enableEmail === true;
  }

  private async deliverEmailIfRequested(input: OrchestratorInput) {
    const channels = input.channels || ["in_app"];
    if (!channels.includes("email")) return;
    if (input.recipientType !== "parent") return;

    const emailEnabled = await this.canSendEmailChannel();
    if (!emailEnabled) return;

    const parentRows = await db
      .select({ email: parents.email })
      .from(parents)
      .where(eq(parents.id, input.recipientId))
      .limit(1);

    const parentEmail = parentRows[0]?.email;
    if (!parentEmail) return;

    await sendNotificationEmail(parentEmail, input.title || "إشعار جديد", input.message);
  }

  async send(input: OrchestratorInput) {
    const profile = resolveNotificationProfile({
      type: input.type,
      recipientType: input.recipientType,
      requestedPriority: input.priority,
      requestedStyle: input.style,
      requestedSound: input.soundAlert,
      requestedVibration: input.vibration,
      requestedChannels: input.channels,
    });

    const dedupeKey = buildNotificationDedupeKey({
      recipientType: input.recipientType,
      recipientId: input.recipientId,
      type: input.type,
      relatedId: input.relatedId,
      title: input.title,
      message: input.message,
      metadata: input.metadata,
    });

    const duplicate = await this.findRecentDuplicate({
      recipientType: input.recipientType,
      recipientId: input.recipientId,
      type: input.type,
      dedupeKey,
      dedupeWindowSeconds: profile.dedupeWindowSeconds,
    });

    if (duplicate) {
      return duplicate;
    }

    const rawStrength = String((input.metadata as any)?.deliveryStrength || "").trim();
    const isCampaignNotification = String((input.metadata as any)?.campaignType || "").trim().length > 0;
    const strength: CampaignDeliveryStrength = rawStrength === "strong" || rawStrength === "popup"
      ? rawStrength
      : "quiet";

    if (isCampaignNotification) {
      const globalThrottling = await this.shouldThrottleCampaignGlobal({
        recipientType: input.recipientType,
        recipientId: input.recipientId,
      });

      if (globalThrottling.throttled) {
        const err: any = new Error("CAMPAIGN_THROTTLED");
        err.code = "CAMPAIGN_THROTTLED";
        err.reason = globalThrottling.reason;
        err.policy = globalThrottling.policy;
        throw err;
      }

      const throttling = await this.shouldThrottleCampaign({
        recipientType: input.recipientType,
        recipientId: input.recipientId,
        strength,
      });

      if (throttling.throttled) {
        const err: any = new Error("CAMPAIGN_THROTTLED");
        err.code = "CAMPAIGN_THROTTLED";
        err.reason = throttling.reason;
        err.policy = throttling.policy;
        throw err;
      }
    }

    const expiresAt =
      typeof input.ttlMinutes === "number" && input.ttlMinutes > 0
        ? new Date(Date.now() + input.ttlMinutes * 60 * 1000)
        : null;

    const channels = profile.channels;

    const metadata = {
      ...(input.metadata || {}),
      dedupeKey,
      dedupeWindowSeconds: profile.dedupeWindowSeconds,
      groupKey: input.groupKey || null,
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
      channels,
      channel: channels[0] || "in_app",
      deliveryStrength: (input.metadata as any)?.deliveryStrength || strength,
    };

    const result = await db
      .insert(notifications)
      .values({
        parentId: input.recipientType === "parent" ? input.recipientId : null,
        childId: input.recipientType === "child" ? input.recipientId : null,
        adminId: input.recipientType === "admin" ? input.recipientId : null,
        teacherId: input.recipientType === "teacher" ? input.recipientId : null,
        schoolId: input.recipientType === "school" ? input.recipientId : null,
        type: input.type,
        title: input.title ?? null,
        message: input.message,
        style: profile.style,
        priority: profile.priority,
        soundAlert: profile.soundAlert,
        vibration: profile.vibration,
        relatedId: input.relatedId ?? null,
        ctaAction: input.ctaAction ?? null,
        ctaTarget: input.ctaTarget ?? null,
        metadata,
      })
      .returning();

    const created = result[0];

    // Real-time push for children
    if (created && input.recipientType === "child" && created.childId) {
      notificationBus.publishToChild(created.childId, created as Record<string, any>);
    }

    // Real-time push for admins
    if (created && input.recipientType === "admin" && created.adminId) {
      notificationBus.publishToAdmin(created.adminId, created as Record<string, any>);
    }

    // Real-time SSE push for parents
    if (created && input.recipientType === "parent" && created.parentId) {
      sseManager.sendToUser(created.parentId, "parent", "notification", {
        id: created.id,
        type: created.type,
        title: created.title,
        message: created.message,
      });
    }

    // Real-time SSE push for teachers
    if (created && input.recipientType === "teacher" && created.teacherId) {
      sseManager.sendToUser(created.teacherId, "teacher", "notification", {
        id: created.id,
        type: created.type,
        title: created.title,
        message: created.message,
      });
    }

    await this.queueGenericPushEvent({
      recipientType: input.recipientType,
      recipientId: input.recipientId,
      type: input.type,
      title: input.title,
      message: input.message,
      priority: profile.priority,
      relatedId: input.relatedId,
      soundAlert: profile.soundAlert,
      vibration: profile.vibration,
      metadata: input.metadata,
      ctaTarget: input.ctaTarget,
      channels,
    });

    try {
      await this.deliverEmailIfRequested(input);
    } catch (error: any) {
      console.error("notification email delivery failed:", error?.message || error);
    }

    return created;
  }
}

export const notificationOrchestrator = new NotificationOrchestrator();
