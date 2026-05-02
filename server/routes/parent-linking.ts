import { Router } from "express";
import { storage } from "../storage";
import { successResponse, errorResponse, ErrorCode } from "../utils/apiResponse";
import { authMiddleware, adminMiddleware } from "./middleware";
import { parentLinkingLimiter } from "../utils/rateLimiters";
import {
  parentChildLinkingCodes,
  parentParentSync,
  parentChild,
  parentLinkRequests,
  parents,
  children,
  notifications
} from "../../shared/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
// Type declarations for `qrcode` are not present in the repo; silence TypeScript here
// @ts-ignore
import QRCode from "qrcode";
import crypto from "crypto";
import { createNotification } from "../notifications";
import { NOTIFICATION_TYPES, NOTIFICATION_STYLES } from "../../shared/notificationTypes";

const router = Router();
const db = storage.db;

function getAuthenticatedParentId(req: any): string | null {
  return req.user?.parentId || req.user?.userId || null;
}

async function resolvePrimaryParentId(childId: string): Promise<string | null> {
  const ownerLink = await db
    .select({ parentId: parentChild.parentId })
    .from(parentChild)
    .where(and(eq(parentChild.childId, childId), eq(parentChild.relationshipRole, "owner")))
    .limit(1);

  if (ownerLink[0]?.parentId) {
    return ownerLink[0].parentId;
  }

  const fallback = await db
    .select({ parentId: parentChild.parentId })
    .from(parentChild)
    .where(eq(parentChild.childId, childId))
    .orderBy(parentChild.linkedAt)
    .limit(1);

  return fallback[0]?.parentId || null;
}

// ===== Parent-Child Linking APIs =====

// POST: إنشاء رمز ربط للأب (لربط الطفل أو الأب الآخر)
router.post("/parent/generate-linking-code", authMiddleware, parentLinkingLimiter, async (req, res) => {
  try {
    const parentId = getAuthenticatedParentId(req);
    if (!parentId) {
      return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, "Unauthorized"));
    }

    // إنشاء رمز عشوائي فريد
    let code = crypto.randomBytes(5).toString("hex").toUpperCase().slice(0, 10);

    // التحقق من أن الرمز فريد
    let isUnique = false;
    while (!isUnique) {
      const existing = await db
        .select()
        .from(parentChildLinkingCodes)
        .where(eq(parentChildLinkingCodes.code, code));

      if (existing.length === 0) {
        isUnique = true;
      } else {
        code = crypto.randomBytes(5).toString("hex").toUpperCase().slice(0, 10);
      }
    }

    // إنشاء QR code
    const deepLink = `${process.env.APP_URL || "https://classify.app"}/link?code=${code}`;
    const qrCodeUrl = await QRCode.toDataURL(deepLink);

    // حفظ الرمز في قاعدة البيانات (ينتهي بعد 24 ساعة)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const linkingCode = await db
      .insert(parentChildLinkingCodes)
      .values({
        parentId,
        code,
        qrCodeUrl,
        expiresAt
      })
      .returning();

    res.status(201).json({
      success: true,
      data: {
        code: linkingCode[0].code,
        qrCodeUrl: linkingCode[0].qrCodeUrl,
        expiresAt: linkingCode[0].expiresAt
      },
      message: "Linking code generated successfully"
    });
  } catch (err) {
    console.error("Error generating linking code:", err);
    res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to generate linking code"));
  }
});

// GET: الحصول على رموز الربط السارية للأب
router.get("/parent/linking-codes", authMiddleware, async (req, res) => {
  try {
    const parentId = getAuthenticatedParentId(req);
    if (!parentId) {
      return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, "Unauthorized"));
    }

    const codes = await db
      .select()
      .from(parentChildLinkingCodes)
      .where(
        and(
          eq(parentChildLinkingCodes.parentId, parentId),
          eq(parentChildLinkingCodes.isUsed, false)
        )
      );

    // فلترة الرموز غير المنتهية
    const activeCodes = codes.filter((c: any) => c.expiresAt && new Date() < c.expiresAt);

    res.json({
      success: true,
      data: activeCodes,
      count: activeCodes.length
    });
  } catch (err) {
    console.error("Error fetching linking codes:", err);
    res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch linking codes"));
  }
});

// POST: ربط طفل باستخدام الرمز (من قبل الأب) — يحتاج موافقة إذا كان الطفل مربوط بوالد آخر
router.post("/parent/link-child", authMiddleware, parentLinkingLimiter, async (req, res) => {
  try {
    const { childId, code } = req.body;
    const parentId = getAuthenticatedParentId(req);
    if (!parentId) {
      return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, "Unauthorized"));
    }

    if (!childId || !code) {
      return res.status(400).json({
        success: false,
        error: "INVALID_INPUT",
        message: "childId and code are required"
      });
    }

    // SEC: Validate the linking code against the database
    const linkingCode = await db
      .select()
      .from(parentChildLinkingCodes)
      .where(
        and(
          eq(parentChildLinkingCodes.code, code.toString().trim().toUpperCase()),
          eq(parentChildLinkingCodes.isUsed, false)
        )
      );

    if (linkingCode.length === 0) {
      return res.status(400).json({
        success: false,
        error: "INVALID_CODE",
        message: "Invalid or expired linking code"
      });
    }

    // SEC: Check if the code is expired
    if (linkingCode[0].expiresAt && new Date() > new Date(linkingCode[0].expiresAt)) {
      return res.status(400).json({
        success: false,
        error: "CODE_EXPIRED",
        message: "This linking code has expired"
      });
    }

    // التحقق من أن الطفل موجود
    const child = await db
      .select()
      .from(children)
      .where(eq(children.id, childId));

    if (child.length === 0) {
      return res.status(404).json({
        success: false,
        error: "NOT_FOUND",
        message: "Child not found"
      });
    }

    // التحقق من الربط الموجود
    const existingLink = await db
      .select()
      .from(parentChild)
      .where(
        and(
          eq(parentChild.parentId, parentId),
          eq(parentChild.childId, childId)
        )
      );

    if (existingLink.length > 0) {
      return res.status(400).json({
        success: false,
        error: "ALREADY_LINKED",
        message: "Child is already linked to this parent"
      });
    }

    // التحقق: هل الطفل مربوط بوالد آخر؟ إذا نعم → طلب موافقة
    const existingParentLinks = await db
      .select()
      .from(parentChild)
      .where(eq(parentChild.childId, childId));

    if (existingParentLinks.length > 0) {
      // الطفل مربوط بوالد آخر → يحتاج موافقة الوالد الأول
      const primaryParentId = await resolvePrimaryParentId(childId);
      if (!primaryParentId) {
        return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Unable to resolve primary parent"));
      }

      // الحصول على بيانات الوالد الطالب
      const requestingParent = await db
        .select({ id: parents.id, name: parents.name, email: parents.email })
        .from(parents)
        .where(eq(parents.id, parentId));

      // التحقق من عدم وجود طلب معلق بالفعل
      const existingRequest = await db
        .select()
        .from(parentLinkRequests)
        .where(
          and(
            eq(parentLinkRequests.requestingParentId, parentId),
            eq(parentLinkRequests.childId, childId),
            eq(parentLinkRequests.status, "pending")
          )
        );

      if (existingRequest.length > 0) {
        return res.status(400).json({
          success: false,
          error: "PENDING_REQUEST",
          message: "طلب ربط معلق بالفعل لهذا الطفل. في انتظار موافقة الوالد الأول."
        });
      }

      // إنشاء طلب ربط معلق
      const linkRequest = await db
        .insert(parentLinkRequests)
        .values({
          requestingParentId: parentId,
          primaryParentId,
          childId,
          status: "pending",
        })
        .returning();

      // إرسال إشعار للوالد الأول
      await createNotification({
        parentId: primaryParentId,
        type: NOTIFICATION_TYPES.PARENT_LINK_REQUEST,
        title: "👨‍👩‍👧 طلب ربط حساب جديد",
        message: `${requestingParent[0]?.name || "والد جديد"} يريد الارتباط بحساب طفلك (${child[0].name}). هل توافق؟`,
        style: NOTIFICATION_STYLES.MODAL,
        priority: "urgent",
        soundAlert: true,
        vibration: true,
        relatedId: linkRequest[0].id,
        metadata: {
          requestingParentId: parentId,
          requestingParentName: requestingParent[0]?.name || "",
          requestingParentEmail: requestingParent[0]?.email || "",
          linkRequestIds: [linkRequest[0].id],
          childrenIds: [childId],
          childrenNames: child[0].name,
          linkingCodeId: linkingCode[0].id,
        },
      });

      // تحديث رمز الربط
      await db
        .update(parentChildLinkingCodes)
        .set({ isUsed: true, usedByParentId: parentId, usedAt: new Date() })
        .where(eq(parentChildLinkingCodes.id, linkingCode[0].id));

      return res.status(202).json({
        success: true,
        data: { status: "pending_approval", linkRequestId: linkRequest[0].id },
        message: "تم إرسال طلب الربط. في انتظار موافقة الوالد الأول."
      });
    }

    // الطفل ليس مربوط بأي والد → ربط مباشر
    const newLink = await db
      .insert(parentChild)
      .values({
        parentId,
        childId,
        relationshipRole: "owner",
        linkSource: "manual",
        linkedByParentId: parentId,
      })
      .returning();

    // SEC: Mark the linking code as used
    await db
      .update(parentChildLinkingCodes)
      .set({
        isUsed: true,
        usedByParentId: parentId,
        usedAt: new Date()
      })
      .where(eq(parentChildLinkingCodes.id, linkingCode[0].id));

    res.status(201).json({
      success: true,
      data: newLink[0],
      message: "Child linked successfully"
    });
  } catch (err) {
    console.error("Error linking child:", err);
    res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to link child"));
  }
});

// ===== Parent-Parent Sync APIs (لربط الأب والأم) =====

// POST: الأب الثاني يطلب مشاركة البيانات باستخدام الرمز (يحتاج موافقة الأب الأول)
router.post("/parent/sync-with-code", authMiddleware, parentLinkingLimiter, async (req, res) => {
  try {
    const { code } = req.body;
    const secondaryParentId = getAuthenticatedParentId(req);
    if (!secondaryParentId) {
      return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, "Unauthorized"));
    }

    if (!code) {
      return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "code is required"));
    }

    const normalizedCode = String(code).trim().toUpperCase();

    // البحث عن الرمز
    const linkingCode = await db
      .select()
      .from(parentChildLinkingCodes)
      .where(eq(parentChildLinkingCodes.code, normalizedCode));

    if (linkingCode.length === 0 || linkingCode[0].isUsed) {
      return res.status(404).json({
        success: false,
        error: "INVALID_CODE",
        message: "Code not found or already used"
      });
    }

    // التحقق من انتهاء الرمز
    if (linkingCode[0].expiresAt && new Date() > linkingCode[0].expiresAt) {
      return res.status(400).json({
        success: false,
        error: "CODE_EXPIRED",
        message: "Code has expired"
      });
    }

    const primaryParentId = linkingCode[0].parentId;

    // التحقق من أن الأبوين ليسا نفس الشخص
    if (primaryParentId === secondaryParentId) {
      return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Cannot sync with yourself"));
    }

    // الحصول على بيانات الوالد الطالب
    const requestingParent = await db
      .select({ id: parents.id, name: parents.name, email: parents.email })
      .from(parents)
      .where(eq(parents.id, secondaryParentId));

    if (requestingParent.length === 0) {
      return res.status(404).json({
        success: false,
        error: "NOT_FOUND",
        message: "Requesting parent not found"
      });
    }

    // الحصول على جميع أطفال الأب الأول
    const sharedChildren = await db
      .select()
      .from(parentChild)
      .where(eq(parentChild.parentId, primaryParentId));

    const childrenIds = sharedChildren.map((pc: any) => pc.childId);

    if (childrenIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "NO_CHILDREN",
        message: "Primary parent has no children to share"
      });
    }

    // الحصول على أسماء الأطفال
    const childrenData = await db
      .select({ id: children.id, name: children.name })
      .from(children)
      .where(
        sql`${children.id} IN (${sql.join(childrenIds.map((id: string) => sql`${id}`), sql`,`)})`
      );

    const childrenNames = childrenData.map((c: any) => c.name).join("، ");

    // إنشاء طلبات ربط معلقة لكل طفل
    const linkRequestIds: string[] = [];
    for (const childId of childrenIds) {
      // التحقق من عدم وجود طلب معلق بالفعل
      const existingRequest = await db
        .select()
        .from(parentLinkRequests)
        .where(
          and(
            eq(parentLinkRequests.requestingParentId, secondaryParentId),
            eq(parentLinkRequests.childId, childId),
            eq(parentLinkRequests.status, "pending")
          )
        );

      if (existingRequest.length > 0) {
        continue; // تخطي الأطفال الذين لديهم طلب معلق بالفعل
      }

      // التحقق من عدم وجود ربط بالفعل
      const existingLink = await db
        .select()
        .from(parentChild)
        .where(
          and(
            eq(parentChild.parentId, secondaryParentId),
            eq(parentChild.childId, childId)
          )
        );

      if (existingLink.length > 0) {
        continue; // الطفل مربوط بالفعل
      }

      const linkRequest = await db
        .insert(parentLinkRequests)
        .values({
          requestingParentId: secondaryParentId,
          primaryParentId,
          childId,
          status: "pending",
        })
        .returning();

      linkRequestIds.push(linkRequest[0].id);
    }

    if (linkRequestIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "ALREADY_LINKED_OR_PENDING",
        message: "All children are already linked or have pending requests"
      });
    }

    // إرسال إشعار للوالد الأول للموافقة
    await createNotification({
      parentId: primaryParentId,
      type: NOTIFICATION_TYPES.PARENT_LINK_REQUEST,
      title: "👨‍👩‍👧 طلب ربط حساب جديد",
      message: `${requestingParent[0].name} يريد الارتباط بحساب أطفالك (${childrenNames}). هل توافق؟`,
      style: NOTIFICATION_STYLES.MODAL,
      priority: "urgent",
      soundAlert: true,
      vibration: true,
      relatedId: linkRequestIds[0],
      metadata: {
        requestingParentId: secondaryParentId,
        requestingParentName: requestingParent[0].name,
        requestingParentEmail: requestingParent[0].email,
        linkRequestIds,
        childrenIds,
        childrenNames,
        linkingCodeId: linkingCode[0].id,
      },
    });

    // تحديث رمز الربط ليشير إلى أنه تم استخدامه
    await db
      .update(parentChildLinkingCodes)
      .set({
        isUsed: true,
        usedByParentId: secondaryParentId,
        usedAt: new Date()
      })
      .where(eq(parentChildLinkingCodes.id, linkingCode[0].id));

    res.status(201).json({
      success: true,
      data: {
        status: "pending_approval",
        linkRequestIds,
        childrenCount: linkRequestIds.length,
      },
      message: "تم إرسال طلب الربط. في انتظار موافقة الوالد الأول."
    });
  } catch (err) {
    console.error("Error syncing parents:", err);
    res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to sync parents"));
  }
});

// GET: الحصول على حالة المزامنة للأب
router.get("/parent/sync-status", authMiddleware, async (req, res) => {
  try {
    const parentId = getAuthenticatedParentId(req);
    if (!parentId) {
      return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, "Unauthorized"));
    }

    const syncRecords = await db
      .select()
      .from(parentParentSync)
      .where(
        eq(parentParentSync.primaryParentId, parentId)
      );

    // الحصول على البيانات الإضافية
    const syncData = await Promise.all(
      syncRecords.map(async (record: any) => {
        const secondaryParent = await db
          .select()
          .from(parents)
          .where(eq(parents.id, record.secondaryParentId));

        return {
          ...record,
          secondaryParentName: secondaryParent[0]?.name || "Unknown"
        };
      })
    );

    res.json({
      success: true,
      data: syncData,
      count: syncData.length
    });
  } catch (err) {
    console.error("Error fetching sync status:", err);
    res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch sync status"));
  }
});

// PUT: إلغاء المزامنة بين أبوين
router.put("/parent/sync/:syncId/revoke", authMiddleware, async (req, res) => {
  try {
    const { syncId } = req.params;
    const parentId = getAuthenticatedParentId(req);
    if (!parentId) {
      return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, "Unauthorized"));
    }

    // التحقق من أن الأب هو صاحب السجل
    const sync = await db
      .select()
      .from(parentParentSync)
      .where(eq(parentParentSync.id, syncId));

    if (sync.length === 0) {
      return res.status(404).json({
        success: false,
        error: "NOT_FOUND",
        message: "Sync record not found"
      });
    }

    if (sync[0].primaryParentId !== parentId) {
      return res.status(403).json({
        success: false,
        error: "FORBIDDEN",
        message: "Only the primary parent can revoke sync"
      });
    }

    // تحديث حالة المزامنة
    const updated = await db
      .update(parentParentSync)
      .set({ syncStatus: "revoked" })
      .where(eq(parentParentSync.id, syncId))
      .returning();

    const sharedChildren = Array.isArray(sync[0].sharedChildren) ? sync[0].sharedChildren : [];
    if (sharedChildren.length > 0) {
      await db
        .delete(parentChild)
        .where(and(
          eq(parentChild.parentId, sync[0].secondaryParentId),
          eq(parentChild.relationshipRole, "co_guardian"),
          eq(parentChild.linkSource, "approved_request"),
          eq(parentChild.linkedByParentId, parentId),
          inArray(parentChild.childId, sharedChildren)
        ));
    }

    res.json({
      success: true,
      data: updated[0],
      message: "Sync revoked successfully"
    });
  } catch (err) {
    console.error("Error revoking sync:", err);
    res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to revoke sync"));
  }
});

// ===== Parent Link Request Approval/Rejection =====

// POST: الوالد الأول يوافق أو يرفض طلب ربط والد آخر بأطفاله
router.post("/parent/notifications/:id/respond-link", authMiddleware, async (req, res) => {
  try {
    const { id: notificationId } = req.params;
    const { action } = req.body;
    const parentId = getAuthenticatedParentId(req);
    if (!parentId) {
      return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, "Unauthorized"));
    }

    if (!action || !["approve", "reject"].includes(action)) {
      return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid action. Must be 'approve' or 'reject'"));
    }

    const txResult = await db.transaction(async (tx: any) => {
      const notification = await tx
        .select()
        .from(notifications)
        .where(eq(notifications.id, notificationId));

      if (!notification[0]) {
        return { error: { status: 404, body: errorResponse(ErrorCode.NOT_FOUND, "Notification not found") } };
      }

      if (notification[0].parentId !== parentId) {
        return { error: { status: 403, body: errorResponse(ErrorCode.FORBIDDEN, "Not authorized") } };
      }

      if (notification[0].type !== "parent_link_request") {
        return { error: { status: 400, body: errorResponse(ErrorCode.BAD_REQUEST, "Invalid notification type") } };
      }

      const metadata = notification[0].metadata as any;
      const linkRequestIds: string[] = metadata?.linkRequestIds || [];
      const requestingParentId = metadata?.requestingParentId;
      const childrenIds: string[] = metadata?.childrenIds || [];
      const childrenNames = metadata?.childrenNames || "";

      if (!requestingParentId || linkRequestIds.length === 0) {
        return { error: { status: 400, body: errorResponse(ErrorCode.BAD_REQUEST, "No link requests found") } };
      }

      const pendingRequests = await tx
        .select()
        .from(parentLinkRequests)
        .where(
          and(
            sql`${parentLinkRequests.id} IN (${sql.join(linkRequestIds.map((id: string) => sql`${id}`), sql`,`)})`,
            eq(parentLinkRequests.status, "pending")
          )
        );

      if (pendingRequests.length === 0) {
        return { error: { status: 400, body: errorResponse(ErrorCode.BAD_REQUEST, "هذه الطلبات تم معالجتها بالفعل") } };
      }

      await tx
        .update(notifications)
        .set({
          isRead: true,
          status: action === "approve" ? "approved" : "rejected",
          resolvedAt: new Date(),
        })
        .where(eq(notifications.id, notificationId));

      if (action === "approve") {
        for (const request of pendingRequests) {
          await tx
            .update(parentLinkRequests)
            .set({ status: "approved", respondedAt: new Date() })
            .where(eq(parentLinkRequests.id, request.id));

          const existingLink = await tx
            .select()
            .from(parentChild)
            .where(
              and(
                eq(parentChild.parentId, request.requestingParentId),
                eq(parentChild.childId, request.childId)
              )
            );

          if (existingLink.length === 0) {
            await tx.insert(parentChild).values({
              parentId: request.requestingParentId,
              childId: request.childId,
              relationshipRole: "co_guardian",
              linkSource: "approved_request",
              linkedByParentId: parentId,
            });
          }
        }

        const existingSync = await tx
          .select({ id: parentParentSync.id, sharedChildren: parentParentSync.sharedChildren })
          .from(parentParentSync)
          .where(
            and(
              eq(parentParentSync.primaryParentId, parentId),
              eq(parentParentSync.secondaryParentId, requestingParentId)
            )
          )
          .limit(1);

        if (existingSync[0]) {
          const currentShared = Array.isArray(existingSync[0].sharedChildren) ? existingSync[0].sharedChildren : [];
          const mergedChildren = Array.from(new Set([...currentShared, ...childrenIds]));

          await tx
            .update(parentParentSync)
            .set({
              syncStatus: "active",
              sharedChildren: mergedChildren,
              lastSyncedAt: new Date(),
            })
            .where(eq(parentParentSync.id, existingSync[0].id));
        } else {
          await tx.insert(parentParentSync).values({
            primaryParentId: parentId,
            secondaryParentId: requestingParentId,
            sharedChildren: childrenIds,
            syncStatus: "active",
          });
        }

        return {
          action: "approve",
          requestingParentId,
          childrenIds,
          childrenNames,
        };
      }

      for (const request of pendingRequests) {
        await tx
          .update(parentLinkRequests)
          .set({ status: "rejected", respondedAt: new Date() })
          .where(eq(parentLinkRequests.id, request.id));
      }

      return {
        action: "reject",
        requestingParentId,
        childrenIds,
        childrenNames,
      };
    });

    if ((txResult as any)?.error) {
      return res.status((txResult as any).error.status).json((txResult as any).error.body);
    }

    if (txResult.action === "approve") {
      await createNotification({
        parentId: txResult.requestingParentId,
        type: NOTIFICATION_TYPES.PARENT_LINK_APPROVED,
        title: "✅ تمت الموافقة على طلب الربط",
        message: `تمت الموافقة على ربط حسابك بأطفال (${txResult.childrenNames}). يمكنك الآن إدارة حساباتهم.`,
        style: NOTIFICATION_STYLES.TOAST,
        priority: "normal",
        soundAlert: true,
      });

      return res.json(
        successResponse(
          { approved: true, linkedChildren: txResult.childrenIds.length },
          "تمت الموافقة على طلب الربط بنجاح"
        )
      );
    }

    await createNotification({
      parentId: txResult.requestingParentId,
      type: NOTIFICATION_TYPES.PARENT_LINK_REJECTED,
      title: "❌ تم رفض طلب الربط",
      message: `تم رفض طلب ربط حسابك بأطفال (${txResult.childrenNames}).`,
      style: NOTIFICATION_STYLES.TOAST,
      priority: "normal",
      soundAlert: false,
    });

    return res.json(successResponse({ rejected: true }, "تم رفض طلب الربط"));
  } catch (err) {
    console.error("Error responding to link request:", err);
    res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to respond to link request"));
  }
});

// GET: الحصول على طلبات الربط المعلقة للوالد
router.get("/parent/link-requests", authMiddleware, async (req, res) => {
  try {
    const parentId = getAuthenticatedParentId(req);
    if (!parentId) {
      return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, "Unauthorized"));
    }

    const requests = await db
      .select()
      .from(parentLinkRequests)
      .where(eq(parentLinkRequests.primaryParentId, parentId));

    res.json({
      success: true,
      data: requests,
      count: requests.length,
    });
  } catch (err) {
    console.error("Error fetching link requests:", err);
    res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch link requests"));
  }
});

export default router;
