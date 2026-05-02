import { z } from "zod";

// Generic media object shared between backend and frontend
// Keeps URL shape stable via the /objects/<key> proxy
export const mediaSchema = z.object({
  id: z.string().uuid(),
  url: z.string().min(1),
  objectKey: z.string().min(1),
  storageProvider: z.enum(["object_storage", "local"]).default("object_storage"),
  mimeType: z.string().min(1),
  size: z.number().int().nonnegative(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  durationMs: z.number().int().nonnegative().optional(),
  checksum: z.string().optional(),
  dedupeKey: z.string().optional(),
  createdAt: z.string().optional(),
  deletedAt: z.string().optional(),
  scanStatus: z.enum(["pending", "passed", "failed", "skipped"]).optional(),
});

export type Media = z.infer<typeof mediaSchema>;

// Minimal finalize payload contract (used by presign/finalize endpoints)
export const finalizeUploadSchema = z.object({
  objectPath: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().int().positive(),
  originalName: z.string().min(1),
  purpose: z.string().min(1),
  dedupeKey: z.string().min(1).optional(),
});

export type FinalizeUploadInput = z.infer<typeof finalizeUploadSchema>;
