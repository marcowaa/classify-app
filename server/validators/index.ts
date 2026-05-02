import { z } from "zod";
import { Request, Response, NextFunction } from "express";
import { errorResponse, ErrorCode } from "../utils/apiResponse";

/**
 * Validates req.body against a Zod schema inline.
 * Returns parsed data on success, or sends 400 and returns null.
 */
export function validateBody<T extends z.ZodSchema>(
  schema: T,
  body: unknown
): { success: true; data: z.infer<T> } | { success: false; error: string } {
  const result = schema.safeParse(body);
  if (!result.success) {
    const firstError = result.error.errors[0];
    const path = firstError.path.length > 0 ? `${firstError.path.join(".")}: ` : "";
    return { success: false, error: `${path}${firstError.message}` };
  }
  return { success: true, data: result.data };
}
