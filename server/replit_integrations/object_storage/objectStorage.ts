import { Storage, File } from "@google-cloud/storage";
import { Response } from "express";
import { randomUUID } from "crypto";
import * as Minio from "minio";
import * as fs from "fs";
import * as path from "path";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
const STORAGE_PROVIDER = (process.env["OBJECT_STORAGE_PROVIDER"] || "replit").toLowerCase();
const isS3Provider = STORAGE_PROVIDER === "s3" || !!process.env["MINIO_ENDPOINT"];
const isLocalFallback = STORAGE_PROVIDER === "local";
const LOCAL_UPLOAD_DIR = process.env["LOCAL_UPLOAD_DIR"] || path.resolve(process.cwd(), "uploads");

const MINIO_BUCKET = process.env["MINIO_BUCKET"] || process.env["S3_BUCKET"] || "classify-media";
const MINIO_ENDPOINT = process.env["MINIO_ENDPOINT"] || "127.0.0.1";
const MINIO_PORT = Number(process.env["MINIO_PORT"] || "9000");
const MINIO_USE_SSL = String(process.env["MINIO_USE_SSL"] || "false").toLowerCase() === "true";
const MINIO_ACCESS_KEY = process.env["MINIO_ACCESS_KEY"] || process.env["S3_ACCESS_KEY"] || "minioadmin";
const MINIO_SECRET_KEY = process.env["MINIO_SECRET_KEY"] || process.env["S3_SECRET_KEY"] || "minioadmin";
const MINIO_PREFIX = process.env["MINIO_PREFIX"] || "private";
const MINIO_PUBLIC_BASE = process.env["MINIO_PUBLIC_URL"] || "";

// The object storage client is used to interact with the object storage service.
export const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  } as any,
  projectId: "",
});

const minioClient = isS3Provider
  ? new Minio.Client({
    endPoint: MINIO_ENDPOINT,
    port: MINIO_PORT,
    useSSL: MINIO_USE_SSL,
    accessKey: MINIO_ACCESS_KEY,
    secretKey: MINIO_SECRET_KEY,
  })
  : null;

// Auto-create MinIO bucket on startup if using S3 provider
if (isS3Provider && minioClient) {
  (async () => {
    try {
      const exists = await minioClient.bucketExists(MINIO_BUCKET);
      if (!exists) {
        await minioClient.makeBucket(MINIO_BUCKET, "");
        console.log(`✅ MinIO bucket "${MINIO_BUCKET}" created`);
      } else {
        console.log(`✅ MinIO bucket "${MINIO_BUCKET}" exists`);
      }
    } catch (err) {
      console.error(`⚠️ MinIO bucket check/create failed:`, err);
    }
  })();
}

// Ensure local upload directory exists
if (!isS3Provider) {
  try {
    fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
  } catch (_) { }
}

function resolveSafeLocalUploadPath(relativeEntityPath: string): string | null {
  const normalized = String(relativeEntityPath || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .trim();

  if (!normalized || normalized.includes("\0")) {
    return null;
  }

  const baseDir = path.resolve(LOCAL_UPLOAD_DIR);
  const resolved = path.resolve(baseDir, normalized);
  if (resolved === baseDir || resolved.startsWith(`${baseDir}${path.sep}`)) {
    return resolved;
  }

  return null;
}

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

type S3ObjectRef = { bucketName: string; objectName: string };

// The object storage service is used to interact with the object storage service.
export class ObjectStorageService {
  constructor() { }

  private getS3PrivatePrefix(): string {
    if (!isS3Provider) return "";
    try {
      const marker = "__marker__";
      const { objectName } = parseObjectPath(`${this.getPrivateObjectDir()}/${marker}`);
      return objectName.endsWith(`/${marker}`)
        ? objectName.slice(0, -(`/${marker}`.length))
        : objectName;
    } catch {
      return MINIO_PREFIX || "";
    }
  }

  private stripS3PrivatePrefix(objectName: string): string {
    const normalized = objectName.replace(/^\/+/, "");
    const prefix = this.getS3PrivatePrefix().replace(/^\/+|\/+$/g, "");
    if (!prefix) return normalized;
    if (normalized === prefix) return "";
    if (normalized.startsWith(`${prefix}/`)) {
      return normalized.slice(prefix.length + 1);
    }
    return normalized;
  }

  private withS3PrivatePrefix(entityId: string): string {
    const normalized = entityId.replace(/^\/+/, "");
    const prefix = this.getS3PrivatePrefix().replace(/^\/+|\/+$/g, "");
    if (!prefix) return normalized;
    if (normalized === prefix || normalized.startsWith(`${prefix}/`)) {
      return normalized;
    }
    return `${prefix}/${normalized}`;
  }

  // Gets the public object search paths.
  getPublicObjectSearchPaths(): Array<string> {
    if (isS3Provider) {
      return ["/" + MINIO_BUCKET];
    }
    const pathsStr = process.env["PUBLIC_OBJECT_SEARCH_PATHS"] || "";
    const paths = Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((path) => path.trim())
          .filter((path) => path.length > 0)
      )
    );
    if (paths.length === 0) {
      throw new Error(
        "PUBLIC_OBJECT_SEARCH_PATHS not set. Create a bucket in 'Object Storage' " +
        "tool and set PUBLIC_OBJECT_SEARCH_PATHS env var (comma-separated paths)."
      );
    }
    return paths;
  }

  // Gets the private object directory.
  getPrivateObjectDir(): string {
    if (isS3Provider) {
      return `/${MINIO_BUCKET}/${MINIO_PREFIX}`;
    }
    const dir = process.env["PRIVATE_OBJECT_DIR"] || "";
    if (!dir) {
      // Fallback to local uploads dir instead of throwing
      return LOCAL_UPLOAD_DIR;
    }
    return dir;
  }

  // Search for a public object from the search paths.
  async searchPublicObject(filePath: string): Promise<File | null> {
    if (isS3Provider && minioClient) {
      const objectName = `${filePath}`.replace(/^\/+/, "");
      try {
        await minioClient.statObject(MINIO_BUCKET, objectName);
        // Not returning actual File instance; caller checks null only.
        return { bucket: () => ({ name: MINIO_BUCKET } as any), name: objectName } as any;
      } catch (_err) {
        return null;
      }
    }
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;

      // Full path format: /<bucket_name>/<object_name>
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);

      // Check if file exists
      const [exists] = await file.exists();
      if (exists) {
        return file;
      }
    }

    return null;
  }

  // Downloads an object to the response.
  async downloadObject(file: File, res: Response, cacheTtlSec: number = 3600) {
    // Local disk fallback
    const localPath = (file as any).__localPath;
    if (localPath && typeof localPath === "string") {
      try {
        const stat = fs.statSync(localPath);
        const ext = path.extname(localPath).toLowerCase();
        const mimeMap: Record<string, string> = {
          ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
          ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml",
          ".mp4": "video/mp4", ".webm": "video/webm",
        };
        res.set({
          "Content-Type": mimeMap[ext] || "application/octet-stream",
          "Content-Length": String(stat.size),
          "Cache-Control": `private, max-age=${cacheTtlSec}`,
        });
        const stream = fs.createReadStream(localPath);
        stream.on("error", (err) => {
          console.error("Local stream error:", err);
          if (!res.headersSent) {
            res.status(500).json({ error: "Error streaming file" });
          }
        });
        stream.pipe(res);
        return;
      } catch (err) {
        console.error("Error reading local file:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error reading file" });
        }
        return;
      }
    }

    if (isS3Provider && minioClient) {
      const bucketName = (file as any).bucket?.().name || MINIO_BUCKET;
      const objectName = (file as any).name;
      try {
        const metadata: any = await minioClient.statObject(bucketName, objectName);
        const isPublic = false;
        res.set({
          "Content-Type": metadata.metaData?.["content-type"] || metadata.metaData?.["Content-Type"] || metadata.contentType || "application/octet-stream",
          "Content-Length": metadata.size,
          "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
        });
        const stream = await minioClient.getObject(bucketName, objectName);
        stream.on("error", (err) => {
          console.error("Stream error:", err);
          if (!res.headersSent) {
            res.status(500).json({ error: "Error streaming file" });
          }
        });
        stream.pipe(res);
        return;
      } catch (error) {
        console.error("Error downloading file:", error);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error downloading file" });
        }
        return;
      }
    }
    try {
      // Get file metadata
      const [metadata] = await file.getMetadata();
      // Get the ACL policy for the object.
      const aclPolicy = await getObjectAclPolicy(file);
      const isPublic = aclPolicy?.visibility === "public";
      // Set appropriate headers
      res.set({
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Content-Length": metadata.size,
        "Cache-Control": `${isPublic ? "public" : "private"
          }, max-age=${cacheTtlSec}`,
      });

      // Stream the file to the response
      const stream = file.createReadStream();

      stream.on("error", (err) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });

      stream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  // Gets the upload URL for an object entity.
  async getObjectEntityUploadURL(): Promise<string> {
    const objectId = randomUUID();

    // Local disk fallback — returns a special URL the app intercepts
    if (!isS3Provider || !minioClient) {
      const uploadDir = path.join(LOCAL_UPLOAD_DIR, "uploads");
      fs.mkdirSync(uploadDir, { recursive: true });
      // Return a sentinel URL the client-side code won't actually PUT to;
      // instead the presign endpoint will signal the client to use multipart.
      // For presigned flow compat we return a local placeholder.
      return `__local__://${objectId}`;
    }

    const privateObjectDir = this.getPrivateObjectDir();

    if (isS3Provider && minioClient) {
      const { bucketName, objectName } = parseObjectPath(`${privateObjectDir}/uploads/${objectId}`);
      const uploadURL = await minioClient.presignedPutObject(bucketName, objectName, 900);
      return uploadURL;
    }

    const { bucketName, objectName } = parseObjectPath(`${privateObjectDir}/uploads/${objectId}`);
    return signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900,
    });
  }

  // Gets the object entity file from the object path.
  async getObjectEntityFile(objectPath: string): Promise<File> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }

    const entityId = parts.slice(1).join("/");

    // Local disk fallback: check if file exists on disk
    if (!isS3Provider || !minioClient) {
      const localPath = resolveSafeLocalUploadPath(entityId);
      if (!localPath) {
        throw new ObjectNotFoundError();
      }
      if (fs.existsSync(localPath)) {
        // Return a mock File-like object with __localPath for downloadObject
        return { name: entityId, __localPath: localPath } as any;
      }
      throw new ObjectNotFoundError();
    }

    if (isS3Provider && minioClient) {
      const { bucketName } = parseObjectPath(`${this.getPrivateObjectDir()}/__lookup__`);
      const candidateObjectNames = Array.from(new Set([
        this.withS3PrivatePrefix(entityId),
        entityId.replace(/^\/+/, ""),
      ])).filter(Boolean);

      try {
        for (const objectName of candidateObjectNames) {
          try {
            await minioClient.statObject(bucketName, objectName);
            return { bucket: () => ({ name: bucketName } as any), name: objectName } as any;
          } catch {
          }
        }
        throw new ObjectNotFoundError();
      } catch (_err) {
        throw new ObjectNotFoundError();
      }
    }

    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) {
      entityDir = `${entityDir}/`;
    }
    const objectEntityPath = `${entityDir}${entityId}`;
    const { bucketName, objectName } = parseObjectPath(objectEntityPath);

    const bucket = objectStorageClient.bucket(bucketName);
    const objectFile = bucket.file(objectName);
    const [exists] = await objectFile.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }
    return objectFile;
  }

  normalizeObjectEntityPath(
    rawPath: string,
  ): string {
    // Already normalized — return as-is (idempotent guard against double-normalization)
    if (rawPath.startsWith("/objects/")) {
      return rawPath;
    }

    // Local fallback sentinel: __local__://uuid → /objects/uploads/uuid
    if (rawPath.startsWith("__local__://")) {
      const objectId = rawPath.slice("__local__://".length);
      return `/objects/uploads/${objectId}`;
    }

    // Local direct upload URL: /api/uploads/direct/uuid → /objects/uploads/uuid
    if (rawPath.startsWith("/api/uploads/direct/")) {
      const objectId = rawPath.slice("/api/uploads/direct/".length);
      return `/objects/uploads/${objectId}`;
    }

    if (isS3Provider) {
      try {
        const url = new URL(rawPath);
        // presigned URL: http://host:9000/bucket/object
        const pathParts = url.pathname.replace(/^\//, "").split("/");
        const bucketName = pathParts.shift();
        const objectName = pathParts.join("/");
        if (bucketName && objectName) {
          return `/objects/${this.stripS3PrivatePrefix(objectName)}`;
        }
      } catch (_err) {
        // fall through
      }
      const trimmed = rawPath.replace(/^https?:\/\//, "");
      const objectName = trimmed.split("/").slice(1).join("/");
      return `/objects/${this.stripS3PrivatePrefix(objectName)}`;
    }
    if (!rawPath.startsWith("https://storage.googleapis.com/")) {
      return rawPath;
    }

    // Extract the path from the URL by removing query parameters and domain
    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;

    let objectEntityDir = this.getPrivateObjectDir();
    if (!objectEntityDir.endsWith("/")) {
      objectEntityDir = `${objectEntityDir}/`;
    }

    if (!rawObjectPath.startsWith(objectEntityDir)) {
      return rawObjectPath;
    }

    // Extract the entity ID from the path
    const entityId = rawObjectPath.slice(objectEntityDir.length);
    return `/objects/${entityId}`;
  }

  // Tries to set the ACL policy for the object entity and return the normalized path.
  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) {
      return normalizedPath;
    }

    // Local disk files: no ACL to set, just return normalized path
    if (rawPath.startsWith("__local__://") || rawPath.startsWith("/api/uploads/direct/")) {
      return normalizedPath;
    }

    if (isS3Provider) {
      // MinIO/S3: store object as-is; custom ACL metadata skipped
      return normalizedPath;
    }

    const objectFile = await this.getObjectEntityFile(normalizedPath);
    await setObjectAclPolicy(objectFile, aclPolicy);
    return normalizedPath;
  }

  // Checks if the user can access the object entity.
  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: File;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    // Local disk file: allow when caller is authenticated
    if ((objectFile as any).__localPath) {
      return !!userId;
    }
    if (isS3Provider) {
      // MinIO branch: objects are private by convention; allow when caller is authenticated
      return !!userId;
    }
    return canAccessObject({
      ...(userId ? { userId } : {}),
      objectFile,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }
}

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");

  if (!bucketName) {
    throw new Error("Invalid path: missing bucket name");
  }

  return {
    bucketName,
    objectName,
  };
}

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
  };
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    }
  );
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL, errorcode: ${response.status}, ` +
      `make sure you're running on Replit`
    );
  }

  const { signed_url: signedURL } = await response.json();
  return signedURL;
}

