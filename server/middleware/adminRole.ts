import { JWT_SECRET } from "../routes/middleware";
import jwt from "jsonwebtoken";

/**
 * Middleware to check admin role
 * Usage: adminRole("finance"), adminRole("moderator"), etc.
 */
export const adminRole = (requiredRole: string | string[]) => {
  return (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (typeof decoded !== "object" || decoded === null) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const payload = decoded as any;
      if (payload.type !== "admin") {
        return res.status(403).json({ message: "Forbidden: Not an admin" });
      }

      const roleList = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      if (!roleList.includes(payload.role)) {
        return res.status(403).json({
          message: `Forbidden: Required role(s): ${roleList.join(", ")}`,
        });
      }

      req.admin = payload;
      next();
    } catch (error) {
      res.status(401).json({ message: "Invalid token" });
    }
  };
};
