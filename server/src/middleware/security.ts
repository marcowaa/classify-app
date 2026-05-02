import helmet from "helmet";
import cors from "cors";
import { Request, Response, NextFunction } from "express";
import { config } from "../config";

const UNSAFE_OBJECT_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const CONTROL_CHARACTERS_PATTERN = /[\u0000-\u001F\u007F]/g;

export const helmetMiddleware = helmet({
  contentSecurityPolicy: config.isProduction ? undefined : false,
  frameguard: { action: "sameorigin" },
  crossOriginEmbedderPolicy: config.isProduction ? { policy: "require-corp" } : false,
});

const configuredCorsOrigin = config.cors.origin;

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow same-origin and non-browser clients.
    if (!origin) {
      return callback(null, true);
    }

    if (configuredCorsOrigin === "*") {
      if (config.isProduction) {
        return callback(null, false);
      }
      return callback(null, true);
    }

    if (Array.isArray(configuredCorsOrigin)) {
      return callback(null, configuredCorsOrigin.includes(origin));
    }

    return callback(null, configuredCorsOrigin === origin);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
  exposedHeaders: ["X-Request-ID", "X-RateLimit-Limit", "X-RateLimit-Remaining"],
});

export function sanitizeInput(obj: any): any {
  if (typeof obj === "string") {
    return obj.replace(CONTROL_CHARACTERS_PATTERN, "").trim();
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeInput);
  }

  if (obj && typeof obj === "object") {
    const sanitized: any = {};
    for (const key of Object.keys(obj)) {
      if (UNSAFE_OBJECT_KEYS.has(key)) {
        continue;
      }
      sanitized[key] = sanitizeInput(obj[key]);
    }
    return sanitized;
  }

  return obj;
}

export function sanitizeMiddleware(req: Request, _res: Response, next: NextFunction) {
  if (req.body) {
    req.body = sanitizeInput(req.body);
  }
  if (req.query) {
    req.query = sanitizeInput(req.query);
  }
  if (req.params) {
    req.params = sanitizeInput(req.params);
  }
  next();
}

export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(self), camera=(self)");

  if (config.isProduction) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  next();
}
