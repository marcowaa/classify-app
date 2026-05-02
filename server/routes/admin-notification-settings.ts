import type { Express } from "express";
import { storage } from "../storage";
import { successResponse, errorResponse, ErrorCode } from "../utils/apiResponse";
import { childNotificationSettings, children, parentChild, parents } from "../../shared/schema";
import { eq, inArray } from "drizzle-orm";
import { adminMiddleware } from "./middleware";

const db = storage.db;

export async function registerNotificationSettingsRoutes(app: Express) {
  // Get All Child Notification Settings
  app.get("/api/admin/notification-settings", adminMiddleware, async (req: any, res) => {
    try {
      const { parentId, page = "1", limit = "20", search = "", mode = "all" } = req.query;
      const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
      const offset = (pageNum - 1) * limitNum;

      let scopedChildIds: string[] | undefined;
      if (parentId) {
        const childrenList = await db
          .select({ childId: parentChild.childId })
          .from(parentChild)
          .where(eq(parentChild.parentId, String(parentId)));

        const uniqueIds: string[] = Array.from(new Set(childrenList.map((row: { childId: string }) => String(row.childId))));
        if (uniqueIds.length === 0) {
          return res.json(
            successResponse({
              items: [],
              pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0 },
            })
          );
        }

        scopedChildIds = uniqueIds;
      }

      const allChildren = scopedChildIds
        ? await db
            .select({ id: children.id, name: children.name, createdAt: children.createdAt })
            .from(children)
            .where(inArray(children.id, scopedChildIds))
        : await db
            .select({ id: children.id, name: children.name, createdAt: children.createdAt })
            .from(children);

      const normalizedSearch = String(search).trim().toLowerCase();
      const searchedChildren = normalizedSearch
        ? allChildren.filter((child: any) => (child.name || "").toLowerCase().includes(normalizedSearch))
        : allChildren;

      if (searchedChildren.length === 0) {
        return res.json(
          successResponse({
            items: [],
            pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0 },
          })
        );
      }

      const searchedChildIds = searchedChildren.map((child: any) => child.id);
      const settingsRows = await db
        .select({
          id: childNotificationSettings.id,
          childId: childNotificationSettings.childId,
          mode: childNotificationSettings.mode,
          repeatDelayMinutes: childNotificationSettings.repeatDelayMinutes,
          requireOverlayPermission: childNotificationSettings.requireOverlayPermission,
          createdAt: childNotificationSettings.createdAt,
          updatedAt: childNotificationSettings.updatedAt,
        })
        .from(childNotificationSettings)
        .where(inArray(childNotificationSettings.childId, searchedChildIds));

      type NotificationSettingRow = typeof settingsRows[number];
      const settingsByChildId = new Map<string, NotificationSettingRow>(
        settingsRows.map((row: NotificationSettingRow) => [row.childId, row])
      );

      const parentLinks = await db
        .select({
          childId: parentChild.childId,
          parentId: parentChild.parentId,
          parentName: parents.name,
        })
        .from(parentChild)
        .innerJoin(parents, eq(parentChild.parentId, parents.id))
        .where(inArray(parentChild.childId, searchedChildIds));

      const parentsByChild = new Map<string, Array<{ id: string; name: string | null }>>();
      for (const row of parentLinks) {
        const existing = parentsByChild.get(row.childId) || [];
        existing.push({ id: row.parentId, name: row.parentName || null });
        parentsByChild.set(row.childId, existing);
      }

      const modeFilter = String(mode);
      const merged = searchedChildren
        .map((child: any) => {
          const setting = settingsByChildId.get(child.id);
          const childParents = parentsByChild.get(child.id) || [];

          return {
            id: setting?.id || `default-${child.id}`,
            childId: child.id,
            childName: child.name || "Unknown",
            mode: setting?.mode || "popup_soft",
            repeatDelayMinutes: setting?.repeatDelayMinutes ?? 5,
            requireOverlayPermission: setting?.requireOverlayPermission ?? false,
            createdAt: setting?.createdAt || child.createdAt,
            updatedAt: setting?.updatedAt || child.createdAt,
            parentId: childParents[0]?.id || null,
            parents: childParents,
            hasCustomSettings: Boolean(setting),
          };
        })
        .sort(
          (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

      const filteredByMode =
        modeFilter !== "all"
          ? merged.filter((item: any) => item.mode === modeFilter)
          : merged;

      const total = filteredByMode.length;
      const pagedItems = filteredByMode.slice(offset, offset + limitNum);

      if (total === 0) {
        return res.json(
          successResponse({
            items: [],
            pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0 },
          })
        );
      }

      res.json(successResponse({
        items: pagedItems,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      }));
    } catch (error: any) {
      console.error("Fetch notification settings error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch settings"));
    }
  });

  // Get Single Child Settings
  app.get("/api/admin/notification-settings/:childId", adminMiddleware, async (req: any, res) => {
    try {
      const { childId } = req.params;

      const setting = await db
        .select()
        .from(childNotificationSettings)
        .where(eq(childNotificationSettings.childId, childId));

      if (!setting[0]) {
        // Return default settings
        return res.json(successResponse({
          childId,
          mode: "popup_soft",
          repeatDelayMinutes: 5,
          requireOverlayPermission: false,
        }));
      }

      const child = await db.select().from(children).where(eq(children.id, childId));

      res.json(successResponse({
        ...setting[0],
        childName: child[0]?.name || "Unknown",
      }));
    } catch (error: any) {
      console.error("Fetch child settings error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch settings"));
    }
  });

  // Update Notification Settings (Admin)
  app.put("/api/admin/notification-settings/:childId", adminMiddleware, async (req: any, res) => {
    try {
      const { childId } = req.params;
      const { mode, repeatDelayMinutes, requireOverlayPermission } = req.body;

      if (mode && !["popup_strict", "popup_soft", "floating_bubble"].includes(mode)) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid notification mode"));
      }

      // Verify child exists
      const child = await db.select().from(children).where(eq(children.id, childId));
      if (!child[0]) {
        return res
          .status(404)
          .json(errorResponse(ErrorCode.NOT_FOUND, "Child not found"));
      }

      const existing = await db
        .select()
        .from(childNotificationSettings)
        .where(eq(childNotificationSettings.childId, childId));

      const updateFields: any = {};
      if (mode) updateFields.mode = mode;
      if (repeatDelayMinutes !== undefined) updateFields.repeatDelayMinutes = repeatDelayMinutes;
      if (requireOverlayPermission !== undefined) updateFields.requireOverlayPermission = requireOverlayPermission;
      updateFields.updatedAt = new Date();

      let result;
      if (existing[0]) {
        result = await db
          .update(childNotificationSettings)
          .set(updateFields)
          .where(eq(childNotificationSettings.childId, childId))
          .returning();
      } else {
        result = await db
          .insert(childNotificationSettings)
          .values({
            childId,
            mode: mode || "popup_soft",
            repeatDelayMinutes: repeatDelayMinutes || 5,
            requireOverlayPermission: requireOverlayPermission || false,
          })
          .returning();
      }

      res.json(successResponse(result[0]));
    } catch (error: any) {
      console.error("Update settings error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to update settings"));
    }
  });

  // Get Notification Settings Statistics
  app.get("/api/admin/notification-settings-stats", adminMiddleware, async (req: any, res) => {
    try {
      const allChildren = await db
        .select({ id: children.id })
        .from(children);
      const allSettings = await db
        .select({
          childId: childNotificationSettings.childId,
          mode: childNotificationSettings.mode,
          repeatDelayMinutes: childNotificationSettings.repeatDelayMinutes,
          requireOverlayPermission: childNotificationSettings.requireOverlayPermission,
        })
        .from(childNotificationSettings);

      type AllSettingsRow = typeof allSettings[number];
      const settingsByChildId = new Map<string, AllSettingsRow>(
        allSettings.map((row: AllSettingsRow) => [row.childId, row])
      );
      const totalChildren = allChildren.length;

      let strictCount = 0;
      let softCount = 0;
      let bubbleCount = 0;
      let withOverlayCount = 0;
      let repeatDelaySum = 0;

      for (const child of allChildren) {
        const setting = settingsByChildId.get(child.id);
        const effectiveMode = setting?.mode || "popup_soft";
        const effectiveRepeatDelay = setting?.repeatDelayMinutes ?? 5;
        const effectiveOverlay = setting?.requireOverlayPermission ?? false;

        if (effectiveMode === "popup_strict") strictCount += 1;
        if (effectiveMode === "popup_soft") softCount += 1;
        if (effectiveMode === "floating_bubble") bubbleCount += 1;
        if (effectiveOverlay) withOverlayCount += 1;

        repeatDelaySum += effectiveRepeatDelay;
      }

      const stats = {
        total: totalChildren,
        byMode: {
          popup_strict: strictCount,
          popup_soft: softCount,
          floating_bubble: bubbleCount,
        },
        withOverlayPermission: withOverlayCount,
        averageRepeatDelay: totalChildren
          ? Math.round(repeatDelaySum / totalChildren)
          : 0,
      };

      res.json(successResponse(stats));
    } catch (error: any) {
      console.error("Fetch stats error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch stats"));
    }
  });
}
