import type { Express } from "express";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import * as fs from "fs";
import * as path from "path";
import { directUploadLimiter, objectReadLimiter, publicApiLimiter } from "../../utils/rateLimiters";

const LOCAL_UPLOAD_DIR = process.env["LOCAL_UPLOAD_DIR"] || path.resolve(process.cwd(), "uploads");

/**
 * Register object storage routes for file uploads.
 *
 * This provides example routes for the presigned URL upload flow:
 * 1. POST /api/uploads/request-url - Get a presigned URL for uploading
 * 2. The client then uploads directly to the presigned URL
 *
 * IMPORTANT: These are example routes. Customize based on your use case:
 * - Add authentication middleware for protected uploads
 * - Add file metadata storage (save to database after upload)
 * - Add ACL policies for access control
 */
export function registerObjectStorageRoutes(app: Express): void {
  const objectStorageService = new ObjectStorageService();

  /**
   * Request a presigned URL for file upload.
   *
   * Request body (JSON):
   * {
   *   "name": "filename.jpg",
   *   "size": 12345,
   *   "contentType": "image/jpeg"
   * }
   *
   * Response:
   * {
   *   "uploadURL": "https://storage.googleapis.com/...",
   *   "objectPath": "/objects/uploads/uuid"
   * }
   *
   * IMPORTANT: The client should NOT send the file to this endpoint.
   * Send JSON metadata only, then upload the file directly to uploadURL.
   */
  app.post("/api/uploads/request-url", publicApiLimiter, async (req, res) => {
    try {
      const { name, size, contentType } = req.body;

      if (!name) {
        return res.status(400).json({
          error: "Missing required field: name",
        });
      }

      const rawUploadURL = await objectStorageService.getObjectEntityUploadURL();

      // Local fallback: swap sentinel URL to a real server endpoint
      let uploadURL = rawUploadURL;
      if (rawUploadURL.startsWith("__local__://")) {
        const objectId = rawUploadURL.slice("__local__://".length);
        uploadURL = `/api/uploads/direct/${objectId}`;
      }

      // Extract object path from the presigned URL for later reference
      const objectPath = objectStorageService.normalizeObjectEntityPath(rawUploadURL);

      res.json({
        uploadURL,
        objectPath,
        // Echo back the metadata for client convenience
        metadata: { name, size, contentType },
      });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  /**
   * Direct file upload endpoint for local disk storage fallback.
   * The client PUTs the raw file body here when MinIO/S3 is unavailable.
   * URL format: PUT /api/uploads/direct/:id
   */
  app.put("/api/uploads/direct/:id", directUploadLimiter, async (req, res) => {
    try {
      const objectId = req.params.id;
      if (!objectId || objectId.includes("..") || objectId.includes("/")) {
        return res.status(400).json({ success: false, message: "معرف غير صالح" });
      }

      const uploadsDir = path.join(LOCAL_UPLOAD_DIR, "uploads");
      fs.mkdirSync(uploadsDir, { recursive: true });

      const filePath = path.join(uploadsDir, objectId);
      const writeStream = fs.createWriteStream(filePath);

      req.pipe(writeStream);

      writeStream.on("finish", () => {
        res.json({ success: true });
      });

      writeStream.on("error", (err) => {
        console.error("Direct upload write error:", err);
        if (!res.headersSent) {
          res.status(500).json({ success: false, message: "فشل حفظ الملف" });
        }
      });
    } catch (error) {
      console.error("Direct upload error:", error);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: "فشل رفع الملف" });
      }
    }
  });

  /**
   * Serve uploaded objects.
   *
   * GET /objects/:objectPath(*)
   *
   * This serves files from object storage. For public files, no auth needed.
   * For protected files, add authentication middleware and ACL checks.
   */
  app.get("/objects/:objectPath(*)", objectReadLimiter, async (req, res) => {
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", {
        path: req.path,
        method: req.method,
        error,
      });
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Object not found" });
      }
      return res.status(500).json({ error: "Failed to serve object" });
    }
  });
}

