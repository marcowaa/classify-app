import { Router } from "express";
import { storage } from "../storage";
import { successResponse, errorResponse, ErrorCode } from "../utils/apiResponse";
import { authMiddleware } from "./middleware";
import { 
  trustedDevicesParent, 
  trustedDevicesChild,
  parents,
  children 
} from "../../shared/schema";
import { eq, and } from "drizzle-orm";

const router = Router();
const db = storage.db;

// ===== Parent Trusted Devices APIs =====

// GET: الحصول على قائمة الأجهزة الموثوقة للأب
router.get("/parent/trusted-devices", authMiddleware, async (req: any, res: any) => {
  try {
    const parentId = req.user?.parentId;
    
    // ✅ التحقق من parentId
    if (!parentId) {
      return res.status(400).json({
        success: false,
        error: "INVALID_USER",
        message: "Parent ID not found in token"
      });
    }
    
    const devices = await db
      .select()
      .from(trustedDevicesParent)
      .where(eq(trustedDevicesParent.parentId, parentId))
      .orderBy(trustedDevicesParent.lastUsedAt);
    
    res.json({ 
      success: true, 
      data: devices,
      count: devices.length 
    });
  } catch (err: any) {
    console.error("Error fetching parent trusted devices:", err);
    res.status(500).json({ 
      success: false, 
      error: "DATABASE_ERROR",
      message: err.message || "Failed to fetch trusted devices" 
    });
  }
});

// POST: إضافة جهاز موثوق جديد للأب (بعد التحقق من OTP)
router.post("/parent/trusted-devices", authMiddleware, async (req: any, res: any) => {
  try {
    const { deviceId, deviceName, deviceType } = req.body;
    const parentId = req.user?.parentId;
    
    // ✅ التحقق من parentId
    if (!parentId) {
      return res.status(400).json({
        success: false,
        error: "INVALID_USER",
        message: "Parent ID not found in token"
      });
    }
    
    // التحقق من المدخلات
    if (!deviceId || !deviceName || !deviceType) {
      return res.status(400).json({
        success: false,
        error: "INVALID_INPUT",
        message: "deviceId, deviceName, and deviceType are required"
      });
    }
    
    // التحقق من أن الجهاز غير موجود بالفعل
    const existingDevice = await db
      .select()
      .from(trustedDevicesParent)
      .where(
        and(
          eq(trustedDevicesParent.parentId, parentId),
          eq(trustedDevicesParent.deviceId, deviceId)
        )
      )
      .limit(1);
    
    if (existingDevice.length > 0) {
      // تحديث آخر استخدام للجهاز الموجود
      const updated = await db
        .update(trustedDevicesParent)
        .set({ lastUsedAt: new Date() })
        .where(eq(trustedDevicesParent.id, existingDevice[0].id))
        .returning();
      
      return res.json({
        success: true,
        data: updated[0],
        message: "Device already trusted, updated last used time",
        isNew: false
      });
    }
    
    // إضافة جهاز جديد
    const newDevice = await db
      .insert(trustedDevicesParent)
      .values({
        parentId,
        deviceId,
        deviceName,
        deviceType,
        userAgent: req.get("user-agent") || "Unknown",
        ipAddress: req.ip || "Unknown",
        isTrusted: true
      })
      .returning();
    
    res.status(201).json({
      success: true,
      data: newDevice[0],
      message: "Device trusted successfully",
      isNew: true
    });
  } catch (err: any) {
    console.error("Error adding trusted device:", err);
    res.status(500).json({
      success: false,
      error: "DATABASE_ERROR",
      message: err.message || "Failed to trust device"
    });
  }
});

// PUT: إزالة الثقة من جهاز معين
router.put("/parent/trusted-devices/:deviceId/revoke", authMiddleware, async (req: any, res: any) => {
  try {
    const { deviceId } = req.params;
    const parentId = req.user?.parentId;
    
    // ✅ التحقق من parentId
    if (!parentId) {
      return res.status(400).json({
        success: false,
        error: "INVALID_USER",
        message: "Parent ID not found in token"
      });
    }
    
    const updated = await db
      .update(trustedDevicesParent)
      .set({ isTrusted: false })
      .where(
        and(
          eq(trustedDevicesParent.parentId, parentId),
          eq(trustedDevicesParent.deviceId, deviceId)
        )
      )
      .returning();
    
    if (updated.length === 0) {
      return res.status(404).json({
        success: false,
        error: "NOT_FOUND",
        message: "Device not found"
      });
    }
    
    res.json({
      success: true,
      data: updated[0],
      message: "Device revoked successfully"
    });
  } catch (err: any) {
    console.error("Error revoking device:", err);
    res.status(500).json({
      success: false,
      error: "DATABASE_ERROR",
      message: err.message || "Failed to revoke device"
    });
  }
});

// DELETE: حذف جهاز من قائمة الأجهزة الموثوقة
router.delete("/parent/trusted-devices/:deviceId", authMiddleware, async (req: any, res: any) => {
  try {
    const { deviceId } = req.params;
    const parentId = req.user?.parentId;
    
    // ✅ التحقق من parentId
    if (!parentId) {
      return res.status(400).json({
        success: false,
        error: "INVALID_USER",
        message: "Parent ID not found in token"
      });
    }
    
    const deleted = await db
      .delete(trustedDevicesParent)
      .where(
        and(
          eq(trustedDevicesParent.parentId, parentId),
          eq(trustedDevicesParent.deviceId, deviceId)
        )
      )
      .returning();
    
    if (deleted.length === 0) {
      return res.status(404).json({
        success: false,
        error: "NOT_FOUND",
        message: "Device not found"
      });
    }
    
    res.json({
      success: true,
      message: "Device deleted successfully"
    });
  } catch (err: any) {
    console.error("Error deleting device:", err);
    res.status(500).json({
      success: false,
      error: "DATABASE_ERROR",
      message: err.message || "Failed to delete device"
    });
  }
});

// ===== Child Trusted Devices APIs =====

// GET: الحصول على قائمة الأجهزة الموثوقة للطفل
router.get("/child/trusted-devices", authMiddleware, async (req: any, res: any) => {
  try {
    const childId = req.user?.childId;
    
    // ✅ التحقق من childId
    if (!childId) {
      return res.status(400).json({
        success: false,
        error: "INVALID_USER",
        message: "Child ID not found in token"
      });
    }
    
    const devices = await db
      .select()
      .from(trustedDevicesChild)
      .where(eq(trustedDevicesChild.childId, childId))
      .orderBy(trustedDevicesChild.lastUsedAt);
    
    res.json({
      success: true,
      data: devices,
      count: devices.length
    });
  } catch (err: any) {
    console.error("Error fetching child trusted devices:", err);
    res.status(500).json({
      success: false,
      error: "DATABASE_ERROR",
      message: err.message || "Failed to fetch trusted devices"
    });
  }
});

// POST: إضافة جهاز موثوق جديد للطفل
router.post("/child/trusted-devices", authMiddleware, async (req: any, res: any) => {
  try {
    const { deviceId, deviceName, deviceType } = req.body;
    const childId = req.user?.childId;
    
    // ✅ التحقق من childId
    if (!childId) {
      return res.status(400).json({
        success: false,
        error: "INVALID_USER",
        message: "Child ID not found in token"
      });
    }
    
    if (!deviceId || !deviceName || !deviceType) {
      return res.status(400).json({
        success: false,
        error: "INVALID_INPUT",
        message: "deviceId, deviceName, and deviceType are required"
      });
    }
    
    // التحقق من أن الجهاز غير موجود بالفعل
    const existingDevice = await db
      .select()
      .from(trustedDevicesChild)
      .where(
        and(
          eq(trustedDevicesChild.childId, childId),
          eq(trustedDevicesChild.deviceId, deviceId)
        )
      )
      .limit(1);
    
    if (existingDevice.length > 0) {
      const updated = await db
        .update(trustedDevicesChild)
        .set({ lastUsedAt: new Date() })
        .where(eq(trustedDevicesChild.id, existingDevice[0].id))
        .returning();
      
      return res.json({
        success: true,
        data: updated[0],
        message: "Device already trusted, updated last used time",
        isNew: false
      });
    }
    
    // إضافة جهاز جديد
    const newDevice = await db
      .insert(trustedDevicesChild)
      .values({
        childId,
        deviceId,
        deviceName,
        deviceType,
        userAgent: req.get("user-agent") || "Unknown",
        ipAddress: req.ip || "Unknown",
        isTrusted: true
      })
      .returning();
    
    res.status(201).json({
      success: true,
      data: newDevice[0],
      message: "Device trusted successfully",
      isNew: true
    });
  } catch (err: any) {
    console.error("Error adding trusted device for child:", err);
    res.status(500).json({
      success: false,
      error: "DATABASE_ERROR",
      message: err.message || "Failed to trust device"
    });
  }
});

// PUT: إزالة الثقة من جهاز الطفل
router.put("/child/trusted-devices/:deviceId/revoke", authMiddleware, async (req: any, res: any) => {
  try {
    const { deviceId } = req.params;
    const childId = req.user?.childId;
    
    // ✅ التحقق من childId
    if (!childId) {
      return res.status(400).json({
        success: false,
        error: "INVALID_USER",
        message: "Child ID not found in token"
      });
    }
    
    const updated = await db
      .update(trustedDevicesChild)
      .set({ isTrusted: false })
      .where(
        and(
          eq(trustedDevicesChild.childId, childId),
          eq(trustedDevicesChild.deviceId, deviceId)
        )
      )
      .returning();
    
    if (updated.length === 0) {
      return res.status(404).json({
        success: false,
        error: "NOT_FOUND",
        message: "Device not found"
      });
    }
    
    res.json({
      success: true,
      data: updated[0],
      message: "Device revoked successfully"
    });
  } catch (err: any) {
    console.error("Error revoking child device:", err);
    res.status(500).json({
      success: false,
      error: "DATABASE_ERROR",
      message: err.message || "Failed to revoke device"
    });
  }
});

export default router;
