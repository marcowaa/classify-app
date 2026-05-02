import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { AuthenticationError, AuthorizationError } from "./errorHandler";

export interface TokenPayload {
  userId?: string;
  childId?: string;
  type: "parent" | "child" | "admin";
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AuthenticationError("No token provided");
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      throw new AuthenticationError("Invalid token format");
    }

    const decoded = jwt.verify(token, config.jwt.secret) as TokenPayload;
    req.user = decoded;
    req.userId = decoded.userId || decoded.childId;
    
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError("Token expired");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthenticationError("Invalid token");
    }
    next(error);
  }
}

export function optionalAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return next();
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret) as TokenPayload;
      req.user = decoded;
      req.userId = decoded.userId || decoded.childId;
    } catch {
    }
    
    next();
  } catch (error) {
    next(error);
  }
}

export function parentOnlyMiddleware(req: Request, _res: Response, next: NextFunction) {
  if (!req.user || req.user.type !== "parent") {
    throw new AuthorizationError("Parent access required");
  }
  next();
}

export function childOnlyMiddleware(req: Request, _res: Response, next: NextFunction) {
  if (!req.user || req.user.type !== "child") {
    throw new AuthorizationError("Child access required");
  }
  next();
}

export function adminOnlyMiddleware(req: Request, _res: Response, next: NextFunction) {
  if (!req.user || req.user.type !== "admin") {
    throw new AuthorizationError("Admin access required");
  }
  next();
}

export function generateToken(payload: Omit<TokenPayload, "iat" | "exp">, expiresIn?: string): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: expiresIn || config.jwt.expiresIn,
  } as jwt.SignOptions);
}

export function generateRefreshToken(payload: Omit<TokenPayload, "iat" | "exp">): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.refreshExpiresIn,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwt.secret) as TokenPayload;
}
