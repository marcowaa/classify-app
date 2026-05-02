import { storage } from "../storage";
import { parentAuditLogs } from "../../shared/schema";

const db = storage.db;

/**
 * Logs a parent action to the audit log.
 * Non-blocking — errors are caught and logged, never thrown.
 */
export async function logParentAction(
  parentId: string,
  action: string,
  entity: string,
  entityId?: string | null,
  details?: Record<string, any> | null,
  req?: any
): Promise<void> {
  try {
    await db.insert(parentAuditLogs).values({
      parentId,
      action,
      entity,
      entityId: entityId || null,
      details: details || null,
      ipAddress: req ? (req.headers?.["x-forwarded-for"]?.toString()?.split(",")[0]?.trim() || req.ip || null) : null,
      userAgent: req ? (req.headers?.["user-agent"]?.substring(0, 500) || null) : null,
    });
  } catch (error) {
    console.error("Audit log write error:", error);
  }
}
