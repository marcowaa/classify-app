import type { Express } from "express";
import { storage } from "../storage";
import { successResponse, errorResponse, ErrorCode } from "../utils/apiResponse";
import { taskNotificationGlobalPolicy, taskNotificationChildPolicy, children } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { adminMiddleware } from "./middleware";

const db = storage.db;

type Channels = {
  inApp: boolean;
  webPush: boolean;
  mobilePush: boolean;
  parentEscalation: boolean;
};

type PolicyInput = {
  level?: number;
  repeatIntervalMinutes?: number;
  maxRetries?: number;
  escalationEnabled?: boolean;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  channelsJson?: Partial<Channels>;
};

const DEFAULT_CHANNELS: Channels = {
  inApp: true,
  webPush: true,
  mobilePush: true,
  parentEscalation: false,
};

const DEFAULT_GLOBAL_POLICY = {
  levelDefault: 3,
  repeatIntervalMinutes: 5,
  maxRetries: 3,
  escalationEnabled: false,
  quietHoursStart: null,
  quietHoursEnd: null,
  channelsJson: DEFAULT_CHANNELS,
};

function normalizeChannels(input?: Partial<Channels>, fallback: Channels = DEFAULT_CHANNELS): Channels {
  return {
    inApp: input?.inApp ?? fallback.inApp,
    webPush: input?.webPush ?? fallback.webPush,
    mobilePush: input?.mobilePush ?? fallback.mobilePush,
    parentEscalation: input?.parentEscalation ?? fallback.parentEscalation,
  };
}

function isValidLevel(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 4;
}

function isValidHHmm(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return true;
  if (typeof value !== "string") return false;
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

export async function registerAdminTaskNotificationRoutes(app: Express) {
  // Get global task notification policy
  app.get("/api/admin/task-notification-policy/global", adminMiddleware, async (req: any, res) => {
    try {
      const rows = await db.select().from(taskNotificationGlobalPolicy);
      if (rows.length === 0) {
        const [created] = await db.insert(taskNotificationGlobalPolicy).values(DEFAULT_GLOBAL_POLICY).returning();
        return res.json(successResponse(created));
      }
      res.json(successResponse(rows[0]));
    } catch (error: any) {
      console.error("Fetch global task notification policy error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch global task notification policy"));
    }
  });

  // Update global task notification policy
  app.put("/api/admin/task-notification-policy/global", adminMiddleware, async (req: any, res) => {
    try {
      const body: PolicyInput = req.body || {};

      if (body.level !== undefined && !isValidLevel(body.level)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "level must be an integer from 1 to 4"));
      }
      if (body.repeatIntervalMinutes !== undefined && (!Number.isInteger(body.repeatIntervalMinutes) || body.repeatIntervalMinutes < 1 || body.repeatIntervalMinutes > 1440)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "repeatIntervalMinutes must be between 1 and 1440"));
      }
      if (body.maxRetries !== undefined && (!Number.isInteger(body.maxRetries) || body.maxRetries < 0 || body.maxRetries > 100)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "maxRetries must be between 0 and 100"));
      }
      if (body.quietHoursStart !== undefined && !isValidHHmm(body.quietHoursStart)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "quietHoursStart must be in HH:mm format"));
      }
      if (body.quietHoursEnd !== undefined && !isValidHHmm(body.quietHoursEnd)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "quietHoursEnd must be in HH:mm format"));
      }

      const rows = await db.select().from(taskNotificationGlobalPolicy);
      if (rows.length === 0) {
        const [created] = await db
          .insert(taskNotificationGlobalPolicy)
          .values({
            levelDefault: body.level ?? DEFAULT_GLOBAL_POLICY.levelDefault,
            repeatIntervalMinutes: body.repeatIntervalMinutes ?? DEFAULT_GLOBAL_POLICY.repeatIntervalMinutes,
            maxRetries: body.maxRetries ?? DEFAULT_GLOBAL_POLICY.maxRetries,
            escalationEnabled: body.escalationEnabled ?? DEFAULT_GLOBAL_POLICY.escalationEnabled,
            quietHoursStart: body.quietHoursStart ?? DEFAULT_GLOBAL_POLICY.quietHoursStart,
            quietHoursEnd: body.quietHoursEnd ?? DEFAULT_GLOBAL_POLICY.quietHoursEnd,
            channelsJson: normalizeChannels(body.channelsJson),
          })
          .returning();
        return res.json(successResponse(created, "Global task notification policy saved"));
      }

      const current = rows[0]!;
      const [updated] = await db
        .update(taskNotificationGlobalPolicy)
        .set({
          levelDefault: body.level ?? current.levelDefault,
          repeatIntervalMinutes: body.repeatIntervalMinutes ?? current.repeatIntervalMinutes,
          maxRetries: body.maxRetries ?? current.maxRetries,
          escalationEnabled: body.escalationEnabled ?? current.escalationEnabled,
          quietHoursStart: body.quietHoursStart === undefined ? current.quietHoursStart : body.quietHoursStart,
          quietHoursEnd: body.quietHoursEnd === undefined ? current.quietHoursEnd : body.quietHoursEnd,
          channelsJson: normalizeChannels(body.channelsJson, current.channelsJson as Channels),
          updatedAt: new Date(),
        })
        .where(eq(taskNotificationGlobalPolicy.id, current.id))
        .returning();

      res.json(successResponse(updated, "Global task notification policy updated"));
    } catch (error: any) {
      console.error("Update global task notification policy error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to update global task notification policy"));
    }
  });

  // Get effective child task notification policy
  app.get("/api/admin/task-notification-policy/:childId", adminMiddleware, async (req: any, res) => {
    try {
      const { childId } = req.params;

      const child = await db.select().from(children).where(eq(children.id, childId));
      if (!child[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Child not found"));
      }

      const globalRows = await db.select().from(taskNotificationGlobalPolicy);
      const globalPolicy = globalRows[0] ?? (await db.insert(taskNotificationGlobalPolicy).values(DEFAULT_GLOBAL_POLICY).returning())[0];

      const childRows = await db.select().from(taskNotificationChildPolicy).where(eq(taskNotificationChildPolicy.childId, childId));
      const childPolicy = childRows[0] || null;

      const effective = {
        childId,
        childName: child[0].name,
        isOverride: !!childPolicy,
        policy: {
          level: childPolicy?.level ?? globalPolicy.levelDefault,
          repeatIntervalMinutes: childPolicy?.repeatIntervalMinutes ?? globalPolicy.repeatIntervalMinutes,
          maxRetries: childPolicy?.maxRetries ?? globalPolicy.maxRetries,
          escalationEnabled: childPolicy?.escalationEnabled ?? globalPolicy.escalationEnabled,
          quietHoursStart: childPolicy?.quietHoursStart ?? globalPolicy.quietHoursStart,
          quietHoursEnd: childPolicy?.quietHoursEnd ?? globalPolicy.quietHoursEnd,
          channelsJson: (childPolicy?.channelsJson ?? globalPolicy.channelsJson) as Channels,
        },
      };

      res.json(successResponse(effective));
    } catch (error: any) {
      console.error("Fetch child task notification policy error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch child task notification policy"));
    }
  });

  // Create/Update child override policy
  app.put("/api/admin/task-notification-policy/:childId", adminMiddleware, async (req: any, res) => {
    try {
      const { childId } = req.params;
      const body: PolicyInput = req.body || {};

      if (!isValidLevel(body.level)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "level is required and must be 1..4"));
      }
      if (body.repeatIntervalMinutes === undefined || !Number.isInteger(body.repeatIntervalMinutes) || body.repeatIntervalMinutes < 1 || body.repeatIntervalMinutes > 1440) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "repeatIntervalMinutes is required and must be between 1 and 1440"));
      }
      if (body.maxRetries === undefined || !Number.isInteger(body.maxRetries) || body.maxRetries < 0 || body.maxRetries > 100) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "maxRetries is required and must be between 0 and 100"));
      }
      if (body.escalationEnabled === undefined || typeof body.escalationEnabled !== "boolean") {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "escalationEnabled is required and must be boolean"));
      }
      if (body.quietHoursStart !== undefined && !isValidHHmm(body.quietHoursStart)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "quietHoursStart must be in HH:mm format"));
      }
      if (body.quietHoursEnd !== undefined && !isValidHHmm(body.quietHoursEnd)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "quietHoursEnd must be in HH:mm format"));
      }

      const child = await db.select().from(children).where(eq(children.id, childId));
      if (!child[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Child not found"));
      }

      const existing = await db.select().from(taskNotificationChildPolicy).where(eq(taskNotificationChildPolicy.childId, childId));

      const payload = {
        level: body.level,
        repeatIntervalMinutes: body.repeatIntervalMinutes,
        maxRetries: body.maxRetries,
        escalationEnabled: body.escalationEnabled,
        quietHoursStart: body.quietHoursStart ?? null,
        quietHoursEnd: body.quietHoursEnd ?? null,
        channelsJson: normalizeChannels(body.channelsJson),
        isOverride: true,
        updatedAt: new Date(),
      };

      if (existing[0]) {
        const [updated] = await db
          .update(taskNotificationChildPolicy)
          .set(payload)
          .where(eq(taskNotificationChildPolicy.childId, childId))
          .returning();
        return res.json(successResponse(updated, "Child task notification policy updated"));
      }

      const [created] = await db
        .insert(taskNotificationChildPolicy)
        .values({
          childId,
          ...payload,
          createdAt: new Date(),
        })
        .returning();

      res.json(successResponse(created, "Child task notification policy created"));
    } catch (error: any) {
      console.error("Update child task notification policy error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to update child task notification policy"));
    }
  });

  // Stats
  app.get("/api/admin/task-notification-policy-stats", adminMiddleware, async (req: any, res) => {
    try {
      const allChildren = await db.select({ id: children.id }).from(children);
      const overrides = await db.select().from(taskNotificationChildPolicy);
      const globalRows = await db.select().from(taskNotificationGlobalPolicy);
      const globalPolicy = globalRows[0] ?? (await db.insert(taskNotificationGlobalPolicy).values(DEFAULT_GLOBAL_POLICY).returning())[0];

      const byChild = new Map<string, typeof taskNotificationChildPolicy.$inferSelect>(
        overrides.map((row: typeof taskNotificationChildPolicy.$inferSelect) => [row.childId, row])
      );
      const byLevel = { level1: 0, level2: 0, level3: 0, level4: 0 };

      for (const child of allChildren) {
        const effectiveLevel = byChild.get(child.id)?.level ?? globalPolicy.levelDefault;
        if (effectiveLevel === 1) byLevel.level1 += 1;
        if (effectiveLevel === 2) byLevel.level2 += 1;
        if (effectiveLevel === 3) byLevel.level3 += 1;
        if (effectiveLevel === 4) byLevel.level4 += 1;
      }

      res.json(successResponse({
        totalChildren: allChildren.length,
        withOverrides: overrides.length,
        usingGlobalDefault: Math.max(0, allChildren.length - overrides.length),
        globalLevel: globalPolicy.levelDefault,
        byLevel,
      }));
    } catch (error: any) {
      console.error("Task notification stats error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch task notification policy stats"));
    }
  });
}
