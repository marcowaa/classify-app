import type { Express } from "express";
import { storage } from "../storage";
import { successResponse, errorResponse, ErrorCode } from "../utils/apiResponse";
import {
  parents,
  children,
  orders,
  deposits,
  parentWallet,
  products,
  riskAlerts,
} from "../../shared/schema";
import { eq, sum, sql, and, gte } from "drizzle-orm";
import { adminMiddleware } from "./middleware";
import { notifyAllAdmins } from "../notifications";
import { NOTIFICATION_PRIORITIES, NOTIFICATION_STYLES, NOTIFICATION_TYPES } from "../../shared/notificationTypes";

const db = storage.db;

export async function registerAnalyticsRoutes(app: Express) {
  app.get("/api/admin/analytics/risk-alerts", adminMiddleware, async (req: any, res) => {
    try {
      const status = typeof req.query?.status === "string" ? req.query.status : "open";
      const limitRaw = Number.parseInt(String(req.query?.limit || "100"), 10);
      const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 300) : 100;

      const [summaryRow] = await db
        .select({
          open: sql<number>`SUM(CASE WHEN ${riskAlerts.status} = 'open' THEN 1 ELSE 0 END)`,
          reviewed: sql<number>`SUM(CASE WHEN ${riskAlerts.status} = 'reviewed' THEN 1 ELSE 0 END)`,
          resolved: sql<number>`SUM(CASE WHEN ${riskAlerts.status} = 'resolved' THEN 1 ELSE 0 END)`,
          highSeverity: sql<number>`SUM(CASE WHEN ${riskAlerts.severity} = 'high' THEN 1 ELSE 0 END)`,
          mediumSeverity: sql<number>`SUM(CASE WHEN ${riskAlerts.severity} = 'medium' THEN 1 ELSE 0 END)`,
        })
        .from(riskAlerts);

      let query = db
        .select({
          id: riskAlerts.id,
          parentId: riskAlerts.parentId,
          childId: riskAlerts.childId,
          targetType: riskAlerts.targetType,
          targetId: riskAlerts.targetId,
          riskType: riskAlerts.riskType,
          severity: riskAlerts.severity,
          riskScore: riskAlerts.riskScore,
          title: riskAlerts.title,
          summary: riskAlerts.summary,
          details: riskAlerts.details,
          evidence: riskAlerts.evidence,
          status: riskAlerts.status,
          detectionCount: riskAlerts.detectionCount,
          firstDetectedAt: riskAlerts.firstDetectedAt,
          lastDetectedAt: riskAlerts.lastDetectedAt,
          resolvedAt: riskAlerts.resolvedAt,
          resolutionNotes: riskAlerts.resolutionNotes,
          updatedAt: riskAlerts.updatedAt,
          parentName: parents.name,
          parentEmail: parents.email,
          childName: children.name,
        })
        .from(riskAlerts)
        .leftJoin(parents, eq(riskAlerts.parentId, parents.id))
        .leftJoin(children, eq(riskAlerts.childId, children.id));

      if (status !== "all") {
        query = query.where(eq(riskAlerts.status, status as any)) as any;
      }

      const rows = await query.orderBy(sql`${riskAlerts.lastDetectedAt} DESC`).limit(limit);

      const summary = {
        total:
          Number(summaryRow?.open || 0) +
          Number(summaryRow?.reviewed || 0) +
          Number(summaryRow?.resolved || 0),
        open: Number(summaryRow?.open || 0),
        reviewed: Number(summaryRow?.reviewed || 0),
        resolved: Number(summaryRow?.resolved || 0),
        highSeverity: Number(summaryRow?.highSeverity || 0),
        mediumSeverity: Number(summaryRow?.mediumSeverity || 0),
      };

      res.json(successResponse({ items: rows, summary }));
    } catch (error: any) {
      console.error("Get risk alerts error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch risk alerts"));
    }
  });

  app.put("/api/admin/analytics/risk-alerts/:id", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const status = String(req.body?.status || "").trim();
      const resolutionNotes = typeof req.body?.resolutionNotes === "string" ? req.body.resolutionNotes.trim() : null;

      if (!["open", "reviewed", "resolved"].includes(status)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid status"));
      }

      const [existing] = await db.select().from(riskAlerts).where(eq(riskAlerts.id, id)).limit(1);
      if (!existing) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Risk alert not found"));
      }

      const updated = await db
        .update(riskAlerts)
        .set({
          status,
          resolutionNotes,
          resolvedAt: status === "resolved" ? new Date() : null,
          resolvedByAdminId: status === "resolved" ? req.admin.adminId : null,
          updatedAt: new Date(),
        })
        .where(eq(riskAlerts.id, id))
        .returning();

      if (status === "resolved") {
        await notifyAllAdmins({
          type: NOTIFICATION_TYPES.INFO,
          title: "تم إغلاق تنبيه مخاطرة",
          message: `تم إغلاق التنبيه ${id} بواسطة الإدارة بعد المراجعة`,
          style: NOTIFICATION_STYLES.TOAST,
          priority: NOTIFICATION_PRIORITIES.NORMAL,
          relatedId: id,
          metadata: { riskAlertId: id, previousSeverity: existing.severity },
        });
      }

      res.json(successResponse(updated[0], "Risk alert updated"));
    } catch (error: any) {
      console.error("Update risk alert error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to update risk alert"));
    }
  });

  // Analytics overview
  app.get("/api/admin/analytics/overview", adminMiddleware, async (req: any, res) => {
    try {
      // Total parents
      const parentCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(parents);

      // Total children
      const childCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(children);

      // Total products
      const productCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(products);

      // Total orders
      const orderCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(orders);

      // Total deposits
      const depositCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(deposits);

      // Total wallet balance
      const totalBalance = await db
        .select({ total: sum(parentWallet.balance) })
        .from(parentWallet);

      // Total deposits amount
      const totalDepositsAmount = await db
        .select({ total: sum(deposits.amount) })
        .from(deposits)
        .where(eq(deposits.status, "completed"));

      // Completed orders count
      const completedOrdersCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(orders)
        .where(eq(orders.status, "completed"));

      res.json({
        success: true,
        data: {
          totalParents: parentCount[0]?.count || 0,
          totalChildren: childCount[0]?.count || 0,
          totalProducts: productCount[0]?.count || 0,
          totalOrders: orderCount[0]?.count || 0,
          totalDeposits: depositCount[0]?.count || 0,
          totalWalletBalance: parseFloat(totalBalance[0]?.total || "0"),
          totalDepositsAmount: parseFloat(totalDepositsAmount[0]?.total || "0"),
          completedOrders: completedOrdersCount[0]?.count || 0,
        },
      });
    } catch (error: any) {
      console.error("Analytics overview error:", error);
      res.status(500).json({ success: false, message: "Failed to fetch analytics" });
    }
  });

  // Weekly registrations
  app.get("/api/admin/analytics/weekly-registrations", adminMiddleware, async (req: any, res) => {
    try {
      const days = 7;
      const data = [];

      // Get data for last 7 days
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
        const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

        const parentRegistrations = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(parents)
          .where(
            and(
              gte(parents.createdAt, startOfDay),
              sql`${parents.createdAt} <= ${endOfDay}`
            )
          );

        const childRegistrations = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(children)
          .where(
            and(
              gte(children.createdAt, startOfDay),
              sql`${children.createdAt} <= ${endOfDay}`
            )
          );

        data.push({
          date: date.toISOString().split("T")[0],
          parents: parentRegistrations[0]?.count || 0,
          children: childRegistrations[0]?.count || 0,
        });
      }

      res.json({
        success: true,
        data,
        period: "Last 7 days",
      });
    } catch (error: any) {
      console.error("Weekly registrations error:", error);
      res.status(500).json({ success: false, message: "Failed to fetch registrations" });
    }
  });

  // Weekly orders
  app.get("/api/admin/analytics/weekly-orders", adminMiddleware, async (req: any, res) => {
    try {
      const days = 7;
      const data = [];

      // Get data for last 7 days
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
        const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

        const orderCount = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(orders)
          .where(
            and(
              gte(orders.createdAt, startOfDay),
              sql`${orders.createdAt} <= ${endOfDay}`
            )
          );

        const completedCount = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(orders)
          .where(
            and(
              gte(orders.createdAt, startOfDay),
              sql`${orders.createdAt} <= ${endOfDay}`,
              eq(orders.status, "completed")
            )
          );

        data.push({
          date: date.toISOString().split("T")[0],
          total: orderCount[0]?.count || 0,
          completed: completedCount[0]?.count || 0,
        });
      }

      res.json({
        success: true,
        data,
        period: "Last 7 days",
      });
    } catch (error: any) {
      console.error("Weekly orders error:", error);
      res.status(500).json({ success: false, message: "Failed to fetch orders" });
    }
  });

  // Weekly wallet movement
  app.get("/api/admin/analytics/weekly-wallet-movement", adminMiddleware, async (req: any, res) => {
    try {
      const days = 7;
      const data = [];

      // Get data for last 7 days
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
        const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

        // Deposits (inflow)
        const depositAmount = await db
          .select({ total: sum(deposits.amount) })
          .from(deposits)
          .where(
            and(
              gte(deposits.createdAt, startOfDay),
              sql`${deposits.createdAt} <= ${endOfDay}`,
              eq(deposits.status, "completed")
            )
          );

        // Orders (outflow)
        const orderAmount = await db
          .select({ total: sql<string>`COUNT(*)` })
          .from(orders)
          .where(
            and(
              gte(orders.createdAt, startOfDay),
              sql`${orders.createdAt} <= ${endOfDay}`,
              eq(orders.status, "completed")
            )
          );

        data.push({
          date: date.toISOString().split("T")[0],
          deposits: parseFloat(depositAmount[0]?.total || "0"),
          orders: parseInt(orderAmount[0]?.total as any || "0"),
        });
      }

      res.json({
        success: true,
        data,
        period: "Last 7 days",
      });
    } catch (error: any) {
      console.error("Weekly wallet movement error:", error);
      res.status(500).json({ success: false, message: "Failed to fetch wallet movement" });
    }
  });

  // Wallet analytics - detailed
  app.get("/api/admin/analytics/wallet", adminMiddleware, async (req: any, res) => {
    try {
      // Total deposits amount
      const totalDepositsAmount = await db
        .select({ total: sum(deposits.amount) })
        .from(deposits)
        .where(eq(deposits.status, "completed"));

      // Total wallet balance
      const totalBalance = await db
        .select({ total: sum(parentWallet.balance) })
        .from(parentWallet);

      // Top 5 parents by balance
      const topParents = await db
        .select({
          parentId: parentWallet.parentId,
          parentEmail: parents.email,
          parentName: parents.name,
          balance: parentWallet.balance,
          totalDeposited: parentWallet.totalDeposited,
          totalSpent: parentWallet.totalSpent,
        })
        .from(parentWallet)
        .leftJoin(parents, eq(parentWallet.parentId, parents.id))
        .orderBy(sql`${parentWallet.balance} DESC`)
        .limit(5);

      // Average balance per parent
      const avgBalance = await db
        .select({ avg: sql<string>`AVG(${parentWallet.balance})` })
        .from(parentWallet);

      res.json({
        success: true,
        data: {
          totalDeposits: parseFloat(totalDepositsAmount[0]?.total || "0"),
          totalBalance: parseFloat(totalBalance[0]?.total || "0"),
          averageBalance: parseFloat(avgBalance[0]?.avg || "0"),
          topParentsByBalance: topParents,
        },
      });
    } catch (error: any) {
      console.error("Wallet analytics error:", error);
      res.status(500).json({ success: false, message: "Failed to fetch wallet analytics" });
    }
  });
}
