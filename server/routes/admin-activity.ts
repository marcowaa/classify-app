import type { Express } from "express";
import { storage } from "../storage";
import { activityLog, admins } from "../../shared/schema";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import { adminMiddleware } from "./middleware";

const db = storage.db;

/**
 * Log an admin activity
 * Internal helper - not exposed as API endpoint
 */
export async function logAdminActivity(
  adminId: string,
  action: string,
  entity: string,
  entityId?: string,
  meta?: Record<string, any>
) {
  try {
    await db.insert(activityLog).values({
      adminId,
      action,
      entity,
      entityId: entityId || null,
      meta: meta || null,
    });
  } catch (error) {
    console.error("Failed to log admin activity:", error);
  }
}

export async function registerActivityLogRoutes(app: Express) {
  // Get activity log with pagination and filters
  app.get("/api/admin/activity", adminMiddleware, async (req: any, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        adminId,
        action,
        entity,
        days = 30,
      } = req.query;

      const pageNum = Math.max(1, parseInt(page as string) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
      const offset = (pageNum - 1) * limitNum;
      const daysNum = parseInt(days as string) || 30;

      // Build where conditions
      const conditions = [];

      // Filter by date
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - daysNum);
      conditions.push(gte(activityLog.createdAt, dateThreshold));

      // Filter by adminId if provided
      if (adminId) {
        conditions.push(eq(activityLog.adminId, adminId as string));
      }

      // Filter by action if provided
      if (action) {
        conditions.push(eq(activityLog.action, action as string));
      }

      // Filter by entity if provided
      if (entity) {
        conditions.push(eq(activityLog.entity, entity as string));
      }

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(activityLog)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const totalItems = countResult[0]?.count || 0;
      const totalPages = Math.ceil(totalItems / limitNum);

      // Get paginated results with admin info
      const results = await db
        .select({
          id: activityLog.id,
          adminId: activityLog.adminId,
          adminEmail: admins.email,
          action: activityLog.action,
          entity: activityLog.entity,
          entityId: activityLog.entityId,
          meta: activityLog.meta,
          createdAt: activityLog.createdAt,
        })
        .from(activityLog)
        .leftJoin(admins, eq(activityLog.adminId, admins.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(activityLog.createdAt))
        .limit(limitNum)
        .offset(offset);

      res.json({
        success: true,
        data: results,
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalPages,
          totalItems,
        },
      });
    } catch (error: any) {
      console.error("Get activity log error:", error);
      res.status(500).json({ success: false, message: "Failed to fetch activity log" });
    }
  });

  // Get activity stats
  app.get("/api/admin/activity/stats", adminMiddleware, async (req: any, res) => {
    try {
      const { days = 30 } = req.query;
      const daysNum = parseInt(days as string) || 30;

      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - daysNum);

      // Get action counts
      const actionStats = await db
        .select({
          action: activityLog.action,
          count: sql<number>`COUNT(*)`,
        })
        .from(activityLog)
        .where(gte(activityLog.createdAt, dateThreshold))
        .groupBy(activityLog.action);

      // Get entity counts
      const entityStats = await db
        .select({
          entity: activityLog.entity,
          count: sql<number>`COUNT(*)`,
        })
        .from(activityLog)
        .where(gte(activityLog.createdAt, dateThreshold))
        .groupBy(activityLog.entity);

      // Get admin activity counts
      const adminStats = await db
        .select({
          adminId: activityLog.adminId,
          adminEmail: admins.email,
          count: sql<number>`COUNT(*)`,
        })
        .from(activityLog)
        .leftJoin(admins, eq(activityLog.adminId, admins.id))
        .where(gte(activityLog.createdAt, dateThreshold))
        .groupBy(activityLog.adminId, admins.email)
        .orderBy(desc(sql<number>`COUNT(*)`))
        .limit(10);

      res.json({
        success: true,
        data: {
          byAction: actionStats,
          byEntity: entityStats,
          topAdmins: adminStats,
          period: `Last ${daysNum} days`,
        },
      });
    } catch (error: any) {
      console.error("Get activity stats error:", error);
      res.status(500).json({ success: false, message: "Failed to fetch activity stats" });
    }
  });
}
