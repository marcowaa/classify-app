import type { Express } from "express";
import { storage } from "../storage";
import { successResponse, errorResponse, ErrorCode } from "../utils/apiResponse";
import { childGifts, children, parents, products } from "../../shared/schema";
import { eq, and } from "drizzle-orm";
import { adminMiddleware } from "./middleware";

const db = storage.db;

export async function registerGiftManagementRoutes(app: Express) {
  // Get All Gifts (with filtering)
  app.get("/api/admin/gifts", adminMiddleware, async (req: any, res) => {
    try {
      const { parentId, childId, status, page = "1", limit = "20" } = req.query;
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const offset = (pageNum - 1) * limitNum;

      let query = db.select().from(childGifts);
      const conditions: any[] = [];

      if (parentId) conditions.push(eq(childGifts.parentId, parentId));
      if (childId) conditions.push(eq(childGifts.childId, childId));
      if (status) conditions.push(eq(childGifts.status, status));

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const result = await query.limit(limitNum).offset(offset);

      // Get total count
      let countQuery = db.select().from(childGifts);
      if (conditions.length > 0) {
        countQuery = countQuery.where(and(...conditions));
      }
      const countResult = await countQuery;

      // Enrich with parent and child names
      const enriched = await Promise.all(
        result.map(async (gift: any) => {
          const parent = await db.select().from(parents).where(eq(parents.id, gift.parentId));
          const child = await db.select().from(children).where(eq(children.id, gift.childId));
          return {
            ...gift,
            parentName: parent[0]?.name || "Unknown",
            childName: child[0]?.name || "Unknown",
          };
        })
      );

      res.json(successResponse({
        items: enriched,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: countResult.length,
          totalPages: Math.ceil(countResult.length / limitNum),
        },
      }));
    } catch (error: any) {
      console.error("Fetch gifts error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch gifts"));
    }
  });

  // Get Gift Stats
  app.get("/api/admin/gifts/stats", adminMiddleware, async (req: any, res) => {
    try {
      const allGifts = await db.select().from(childGifts);

      const stats = {
        total: allGifts.length,
        pending: allGifts.filter((g: any) => g.status === "pending").length,
        delivered: allGifts.filter((g: any) => g.status === "delivered").length,
        acknowledged: allGifts.filter((g: any) => g.status === "acknowledged").length,
        totalValue: allGifts.reduce((sum: number, g: any) => sum + (g.pointsCost || 0), 0),
      };

      res.json(successResponse(stats));
    } catch (error: any) {
      console.error("Fetch gift stats error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch stats"));
    }
  });

  // Update Gift Status
  app.put("/api/admin/gifts/:giftId", adminMiddleware, async (req: any, res) => {
    try {
      const { giftId } = req.params;
      const { status } = req.body;

      if (!status || !["pending", "delivered", "acknowledged"].includes(status)) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid status"));
      }

      const gift = await db.select().from(childGifts).where(eq(childGifts.id, giftId));
      if (!gift[0]) {
        return res
          .status(404)
          .json(errorResponse(ErrorCode.NOT_FOUND, "Gift not found"));
      }

      const updatedFields: any = { status };
      if (status === "delivered") {
        updatedFields.deliveredAt = new Date();
      }
      if (status === "acknowledged") {
        updatedFields.acknowledgedAt = new Date();
      }

      const updated = await db
        .update(childGifts)
        .set(updatedFields)
        .where(eq(childGifts.id, giftId))
        .returning();

      res.json(successResponse(updated[0]));
    } catch (error: any) {
      console.error("Update gift error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to update gift"));
    }
  });

  // Delete Gift
  app.delete("/api/admin/gifts/:giftId", adminMiddleware, async (req: any, res) => {
    try {
      const { giftId } = req.params;

      const gift = await db.select().from(childGifts).where(eq(childGifts.id, giftId));
      if (!gift[0]) {
        return res
          .status(404)
          .json(errorResponse(ErrorCode.NOT_FOUND, "Gift not found"));
      }

      // Only allow deletion of pending gifts
      if (gift[0].status !== "pending") {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, "Can only delete pending gifts"));
      }

      await db.delete(childGifts).where(eq(childGifts.id, giftId));

      res.json(successResponse(undefined, "Gift deleted"));
    } catch (error: any) {
      console.error("Delete gift error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to delete gift"));
    }
  });
}
