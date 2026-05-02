import type { Express } from "express";
import { and, desc, eq, gte } from "drizzle-orm";
import { outboxEvents } from "../../shared/schema";
import { storage } from "../storage";
import { adminMiddleware } from "./middleware";
import { errorResponse, ErrorCode, successResponse } from "../utils/apiResponse";

const db = storage.db;
const TRIAL_EVENT_TYPE = "TRIAL_FUNNEL_EVENT";

const ALLOWED_EVENTS = new Set([
  "TRIAL_EXPLORE_PROMPT_SHOWN",
  "TRIAL_PURCHASE_INTENT_CAPTURED",
  "TRIAL_LINK_SUCCESS",
  "TRIAL_LINK_FAILED",
  "TRIAL_PURCHASE_COMPLETED",
]);

export async function registerTrialAnalyticsRoutes(app: Express) {
  app.post("/api/analytics/trial-event", async (req: any, res) => {
    try {
      const eventName = String(req.body?.eventName || "").trim();
      if (!ALLOWED_EVENTS.has(eventName)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid trial event"));
      }

      const actorType = String(req.body?.actorType || "guest").trim().toLowerCase();
      const path = String(req.body?.path || "").trim().slice(0, 250);
      const payload = {
        eventName,
        actorType,
        path,
        sourceAdId: String(req.body?.sourceAdId || "").trim() || null,
        promoProductId: String(req.body?.promoProductId || "").trim() || null,
        itemCount: Number(req.body?.itemCount || 0) || 0,
        reason: String(req.body?.reason || "").trim() || null,
        exploreProgressPercent: Number(req.body?.exploreProgressPercent || 0) || 0,
        at: new Date().toISOString(),
      };

      await db.insert(outboxEvents).values({
        type: TRIAL_EVENT_TYPE,
        payloadJson: payload,
        status: "pending",
        availableAt: new Date(),
      });

      return res.json(successResponse({ recorded: true }));
    } catch (error: any) {
      console.error("Track trial event error:", error);
      return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to record trial event"));
    }
  });

  app.get("/api/admin/analytics/trial-funnel", adminMiddleware, async (req: any, res) => {
    try {
      const daysRaw = Number.parseInt(String(req.query?.days || "30"), 10);
      const days = Number.isFinite(daysRaw) ? Math.min(Math.max(daysRaw, 1), 120) : 30;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const rows = await db
        .select({
          id: outboxEvents.id,
          createdAt: outboxEvents.createdAt,
          payloadJson: outboxEvents.payloadJson,
        })
        .from(outboxEvents)
        .where(and(eq(outboxEvents.type, TRIAL_EVENT_TYPE), gte(outboxEvents.createdAt, since)))
        .orderBy(desc(outboxEvents.createdAt))
        .limit(5000);

      const counters = {
        TRIAL_EXPLORE_PROMPT_SHOWN: 0,
        TRIAL_PURCHASE_INTENT_CAPTURED: 0,
        TRIAL_LINK_SUCCESS: 0,
        TRIAL_LINK_FAILED: 0,
        TRIAL_PURCHASE_COMPLETED: 0,
      } as Record<string, number>;

      const sourceBreakdown = new Map<string, number>();

      for (const row of rows) {
        const payload = (row.payloadJson || {}) as Record<string, any>;
        const eventName = String(payload.eventName || "").trim();
        if (!ALLOWED_EVENTS.has(eventName)) continue;
        counters[eventName] = (counters[eventName] || 0) + 1;

        if (eventName === "TRIAL_PURCHASE_COMPLETED") {
          const sourceAdId = String(payload.sourceAdId || "").trim() || "organic";
          sourceBreakdown.set(sourceAdId, (sourceBreakdown.get(sourceAdId) || 0) + 1);
        }
      }

      const promptToIntentRate = counters.TRIAL_EXPLORE_PROMPT_SHOWN > 0
        ? Number(((counters.TRIAL_PURCHASE_INTENT_CAPTURED / counters.TRIAL_EXPLORE_PROMPT_SHOWN) * 100).toFixed(2))
        : 0;
      const intentToLinkRate = counters.TRIAL_PURCHASE_INTENT_CAPTURED > 0
        ? Number(((counters.TRIAL_LINK_SUCCESS / counters.TRIAL_PURCHASE_INTENT_CAPTURED) * 100).toFixed(2))
        : 0;
      const linkToPurchaseRate = counters.TRIAL_LINK_SUCCESS > 0
        ? Number(((counters.TRIAL_PURCHASE_COMPLETED / counters.TRIAL_LINK_SUCCESS) * 100).toFixed(2))
        : 0;

      return res.json(successResponse({
        windowDays: days,
        counters,
        conversion: {
          promptToIntentRate,
          intentToLinkRate,
          linkToPurchaseRate,
        },
        sourceBreakdown: Array.from(sourceBreakdown.entries()).map(([sourceAdId, count]) => ({ sourceAdId, count })),
      }));
    } catch (error: any) {
      console.error("Get trial funnel analytics error:", error);
      return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch trial funnel analytics"));
    }
  });
}
