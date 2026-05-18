import jwt, { JwtPayload } from "jsonwebtoken";
import { errorResponse, ErrorCode } from "../utils/apiResponse";
import { storage } from "../storage";
import { parentChild } from "../../shared/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || "";

if (!JWT_SECRET) {
  console.error("FATAL: JWT_SECRET environment variable must be set!");
  process.exit(1);
}

export { JWT_SECRET };

export const authMiddleware = (req: any, res: any, next: any) => {
  const AUTH_TOKEN_COOKIE_NAME = "auth_token";
  const AUTH_REDEEM_COOKIE_WRITE_ENABLED =
    String(process.env.AUTH_REDEEM_COOKIE_WRITE_ENABLED || "")
      .trim()
      .toLowerCase() === "true";

  const headerToken = req.headers.authorization?.split(" ")[1];
  const cookieToken = req.cookies?.[AUTH_TOKEN_COOKIE_NAME];

  const token = headerToken || (AUTH_REDEEM_COOKIE_WRITE_ENABLED ? cookieToken : undefined);
  if (!token) return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, "Unauthorized"));
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    // Normalize payload to support legacy { userId } and new { parentId }
    if (decoded.parentId && !decoded.userId) {
      decoded.userId = decoded.parentId;
    }
    // SEC: Block non-child tokens from child routes
    if (req.path?.startsWith("/api/child") && decoded.type !== "child") {
      return res
        .status(401)
        .json(errorResponse(ErrorCode.UNAUTHORIZED, "Child token required"));
    }
    // SEC: Parent routes must strictly use parent tokens.
    if (req.path?.startsWith("/api/parent") && decoded.type !== "parent") {
      return res
        .status(401)
        .json(errorResponse(ErrorCode.UNAUTHORIZED, "Parent token required"));
    }
    req.user = decoded;
    next();
  } catch {
    res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, "Invalid token"));
  }
};

export const adminMiddleware = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, "Unauthorized"));
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // jwt.verify can return a string or an object (JwtPayload). Ensure it's an object
    if (typeof decoded !== "object" || decoded === null) {
      return res.status(403).json(errorResponse(ErrorCode.FORBIDDEN, "Forbidden"));
    }
    const payload = decoded as JwtPayload & { type?: string };
    if (payload.type !== "admin") return res.status(403).json(errorResponse(ErrorCode.FORBIDDEN, "Forbidden"));
    req.admin = payload;
    next();
  } catch {
    res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, "Invalid token"));
  }
};

export const requireLinkedChildForParentMonetization = async (req: any, res: any, next: any) => {
  try {
    const parentId = String(req.user?.parentId || req.user?.userId || "").trim();
    if (!parentId || req.user?.type !== "parent") {
      return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, "Parent token required"));
    }

    const linkedChild = await storage.db
      .select({ childId: parentChild.childId })
      .from(parentChild)
      .where(eq(parentChild.parentId, parentId))
      .limit(1);

    if (!linkedChild[0]) {
      return res
        .status(403)
        .json(errorResponse(ErrorCode.PARENT_CHILD_MISMATCH, "Link at least one child before completing purchases"));
    }

    return next();
  } catch (error) {
    console.error("Linked-child guard failed:", error);
    return res
      .status(500)
      .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to validate parent-child link"));
  }
};

export const requireParentToken = (req: any, res: any, next: any) => {
  const tokenType = String(req.user?.type || "").trim().toLowerCase();
  const claimParentId = String(req.user?.parentId || "").trim();
  const claimUserId = String(req.user?.userId || "").trim();

  if (tokenType !== "parent") {
    return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, "Parent token required"));
  }

  const parentId = claimParentId || claimUserId;
  if (!parentId) {
    return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, "Parent token required"));
  }

  if (claimParentId && claimUserId && claimParentId !== claimUserId) {
    return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, "Invalid parent token claims"));
  }

  req.user.parentId = parentId;
  req.user.userId = parentId;
  return next();
};
