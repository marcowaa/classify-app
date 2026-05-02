import type { Express } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { adminMiddleware, authMiddleware } from "./middleware";
import { successResponse, errorResponse, ErrorCode } from "../utils/apiResponse";
import {
  createPresignedUpload,
  finalizeUpload,
  attachMedia,
  detachMedia,
  softDeleteMedia,
  resolveUploadProxyTargetByObjectPath,
} from "../services/uploadService";
import { finalizeUploadSchema } from "../../shared/media";
import { uploadProxyLimiter } from "../utils/rateLimiters";

const presignLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  message: errorResponse(ErrorCode.RATE_LIMITED, "Too many upload requests"),
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

const finalizeLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  message: errorResponse(ErrorCode.RATE_LIMITED, "Too many finalize requests"),
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

const attachLimiter = rateLimit({
  windowMs: 60_000,
  max: 120,
  message: errorResponse(ErrorCode.RATE_LIMITED, "Too many attach requests"),
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

const softDeleteLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  message: errorResponse(ErrorCode.RATE_LIMITED, "Too many delete requests"),
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

const presignBody = z.object({
  contentType: z.string().min(1),
  size: z.number().int().positive(),
  purpose: z.string().min(1),
  originalName: z.string().min(1),
});

const attachBody = z.object({
  mediaId: z.string().uuid(),
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  field: z.string().min(1),
});

const detachBody = z.object({
  mediaId: z.string().uuid(),
  referenceId: z.string().uuid(),
});

const softDeleteBody = z.object({
  mediaId: z.string().uuid(),
});

function mapError(err: any) {
  if (err?.message === "POLICY_REJECTED_MIME" || err?.message === "POLICY_REJECTED_SIZE") {
    return errorResponse(ErrorCode.BAD_REQUEST, err.message);
  }
  if (err?.message === "MEDIA_OWNER_MISMATCH") {
    return errorResponse(ErrorCode.UNAUTHORIZED, "Not allowed");
  }
  if (err?.message === "MEDIA_NOT_FOUND") {
    return errorResponse(ErrorCode.NOT_FOUND, "Media not found");
  }
  return errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Upload error");
}

export function registerMediaUploadRoutes(app: Express) {
  // Admin presign
  app.post("/api/admin/uploads/presign", adminMiddleware, presignLimiter, async (req: any, res) => {
    try {
      const body = presignBody.parse(req.body);
      const result = await createPresignedUpload({
        actor: { type: "admin", id: req.admin.adminId },
        purpose: body.purpose,
        contentType: body.contentType,
        size: body.size,
      });
      res.json(successResponse(result));
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, err.message));
      }
      const mapped = mapError(err);
      res.status(mapped.error === ErrorCode.BAD_REQUEST ? 400 : 500).json(mapped);
    }
  });

  // Parent presign
  app.post("/api/parent/uploads/presign", authMiddleware, presignLimiter, async (req: any, res) => {
    try {
      if (req.user?.type !== "parent") {
        return res.status(403).json(errorResponse(ErrorCode.UNAUTHORIZED, "Only parents can upload"));
      }
      const body = presignBody.parse(req.body);
      const result = await createPresignedUpload({
        actor: { type: "parent", id: req.user.userId },
        purpose: body.purpose,
        contentType: body.contentType,
        size: body.size,
      });
      res.json(successResponse(result));
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, err.message));
      }
      const mapped = mapError(err);
      res.status(mapped.error === ErrorCode.BAD_REQUEST ? 400 : 500).json(mapped);
    }
  });

  // Admin finalize
  app.post("/api/admin/uploads/finalize", adminMiddleware, finalizeLimiter, async (req: any, res) => {
    try {
      const body = finalizeUploadSchema.parse(req.body);
      const media = await finalizeUpload({ actor: { type: "admin", id: req.admin.adminId }, input: body });
      res.json(successResponse(media));
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, err.message));
      }
      const mapped = mapError(err);
      res.status(mapped.error === ErrorCode.BAD_REQUEST ? 400 : 500).json(mapped);
    }
  });

  // Parent finalize
  app.post("/api/parent/uploads/finalize", authMiddleware, finalizeLimiter, async (req: any, res) => {
    try {
      if (req.user?.type !== "parent") {
        return res.status(403).json(errorResponse(ErrorCode.UNAUTHORIZED, "Only parents can upload"));
      }
      const body = finalizeUploadSchema.parse(req.body);
      const media = await finalizeUpload({ actor: { type: "parent", id: req.user.userId }, input: body });
      res.json(successResponse(media));
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, err.message));
      }
      const mapped = mapError(err);
      res.status(mapped.error === ErrorCode.BAD_REQUEST ? 400 : 500).json(mapped);
    }
  });

  // Parent upload proxy (for remote storage like MinIO)
  app.put("/api/parent/uploads/proxy", authMiddleware, uploadProxyLimiter, async (req: any, res) => {
    try {
      if (req.user?.type !== "parent") {
        return res.status(403).json(errorResponse(ErrorCode.UNAUTHORIZED, "Only parents can upload"));
      }
      const target = resolveUploadProxyTargetByObjectPath({
        actor: { type: "parent", id: req.user.userId },
        objectPath: req.headers["x-upload-object-path"],
      });
      if (!target.ok) {
        return res.status(400).json({ success: false, message: "جلسة رفع غير صالحة" });
      }

      const upstreamRes = await fetch(target.targetUrl, {
        method: "PUT",
        headers: {
          "Content-Type": String(req.headers["content-type"] || "application/octet-stream"),
          ...(req.headers["content-length"] ? { "Content-Length": String(req.headers["content-length"]) } : {}),
        },
        body: req as any,
        duplex: "half",
      } as any);

      if (!upstreamRes.ok) {
        return res.status(502).json({ success: false, message: "فشل رفع الملف إلى التخزين" });
      }

      res.json({ success: true, message: "File uploaded" });
    } catch (err) {
      console.error("Parent upload proxy error:", err);
      res.status(500).json({ success: false, message: "خطأ في الخادم" });
    }
  });

  // Attach media (admin)
  app.post("/api/admin/media/attach", adminMiddleware, attachLimiter, async (req: any, res) => {
    try {
      const body = attachBody.parse(req.body);
      const ref = await attachMedia({
        actor: { type: "admin", id: req.admin.adminId },
        mediaId: body.mediaId,
        entityType: body.entityType,
        entityId: body.entityId,
        field: body.field,
      });
      res.json(successResponse(ref));
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, err.message));
      }
      const mapped = mapError(err);
      const status = mapped.error === ErrorCode.BAD_REQUEST ? 400 : mapped.error === ErrorCode.UNAUTHORIZED ? 403 : mapped.error === ErrorCode.NOT_FOUND ? 404 : 500;
      res.status(status).json(mapped);
    }
  });

  // Attach media (parent)
  app.post("/api/parent/media/attach", authMiddleware, attachLimiter, async (req: any, res) => {
    try {
      const body = attachBody.parse(req.body);
      const ref = await attachMedia({
        actor: { type: "parent", id: req.user.userId },
        mediaId: body.mediaId,
        entityType: body.entityType,
        entityId: body.entityId,
        field: body.field,
      });
      res.json(successResponse(ref));
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, err.message));
      }
      const mapped = mapError(err);
      const status = mapped.error === ErrorCode.BAD_REQUEST ? 400 : mapped.error === ErrorCode.UNAUTHORIZED ? 403 : mapped.error === ErrorCode.NOT_FOUND ? 404 : 500;
      res.status(status).json(mapped);
    }
  });

  // Detach (admin)
  app.post("/api/admin/media/detach", adminMiddleware, attachLimiter, async (req: any, res) => {
    try {
      const body = detachBody.parse(req.body);
      await detachMedia({ actor: { type: "admin", id: req.admin.adminId }, mediaId: body.mediaId, referenceId: body.referenceId });
      res.json(successResponse({ detached: true }));
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, err.message));
      }
      const mapped = mapError(err);
      const status = mapped.error === ErrorCode.BAD_REQUEST ? 400 : mapped.error === ErrorCode.UNAUTHORIZED ? 403 : mapped.error === ErrorCode.NOT_FOUND ? 404 : 500;
      res.status(status).json(mapped);
    }
  });

  // Detach (parent)
  app.post("/api/parent/media/detach", authMiddleware, attachLimiter, async (req: any, res) => {
    try {
      const body = detachBody.parse(req.body);
      await detachMedia({ actor: { type: "parent", id: req.user.userId }, mediaId: body.mediaId, referenceId: body.referenceId });
      res.json(successResponse({ detached: true }));
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, err.message));
      }
      const mapped = mapError(err);
      const status = mapped.error === ErrorCode.BAD_REQUEST ? 400 : mapped.error === ErrorCode.UNAUTHORIZED ? 403 : mapped.error === ErrorCode.NOT_FOUND ? 404 : 500;
      res.status(status).json(mapped);
    }
  });

  // Soft delete (admin)
  app.post("/api/admin/media/soft-delete", adminMiddleware, softDeleteLimiter, async (req: any, res) => {
    try {
      const body = softDeleteBody.parse(req.body);
      await softDeleteMedia({ actor: { type: "admin", id: req.admin.adminId }, mediaId: body.mediaId });
      res.json(successResponse({ deleted: true }));
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, err.message));
      }
      const mapped = mapError(err);
      const status = mapped.error === ErrorCode.BAD_REQUEST ? 400 : mapped.error === ErrorCode.UNAUTHORIZED ? 403 : mapped.error === ErrorCode.NOT_FOUND ? 404 : 500;
      res.status(status).json(mapped);
    }
  });

  // Soft delete (parent)
  app.post("/api/parent/media/soft-delete", authMiddleware, softDeleteLimiter, async (req: any, res) => {
    try {
      const body = softDeleteBody.parse(req.body);
      await softDeleteMedia({ actor: { type: "parent", id: req.user.userId }, mediaId: body.mediaId });
      res.json(successResponse({ deleted: true }));
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, err.message));
      }
      const mapped = mapError(err);
      const status = mapped.error === ErrorCode.BAD_REQUEST ? 400 : mapped.error === ErrorCode.UNAUTHORIZED ? 403 : mapped.error === ErrorCode.NOT_FOUND ? 404 : 500;
      res.status(status).json(mapped);
    }
  });
}
