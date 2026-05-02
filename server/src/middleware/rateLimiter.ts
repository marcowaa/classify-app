import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { config } from "../config";
import { getRedisClient, isRedisConnected } from "../config/redis";
import { logger } from "../utils/logger";

function createMemoryStore() {
  const store = new Map<string, { count: number; resetTime: number }>();

  setInterval(() => {
    const now = Date.now();
    const keysToDelete: string[] = [];
    store.forEach((value, key) => {
      if (value.resetTime <= now) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => store.delete(key));
  }, 60000);

  return {
    increment: async (key: string) => {
      const now = Date.now();
      const windowMs = config.rateLimit.windowMs;
      const resetTime = now + windowMs;

      const existing = store.get(key);
      if (existing && existing.resetTime > now) {
        existing.count++;
        return {
          totalHits: existing.count,
          resetTime: new Date(existing.resetTime),
        };
      }

      store.set(key, { count: 1, resetTime });
      return {
        totalHits: 1,
        resetTime: new Date(resetTime),
      };
    },
    decrement: async (key: string) => {
      const existing = store.get(key);
      if (existing && existing.count > 0) {
        existing.count--;
      }
    },
    resetKey: async (key: string) => {
      store.delete(key);
    },
  };
}

function createStore(prefix: string) {
  const redisClient = getRedisClient();

  if (isRedisConnected() && redisClient) {
    try {
      logger.info({ prefix }, "Using Redis store for rate limiting");
      return new RedisStore({
        sendCommand: (...args: string[]) => {
          // redisClient.call has variable args; cast to any to avoid tuple/spread typing errors
          return (redisClient as any).call(...args) as Promise<any>;
        },
        prefix: `rl:${prefix}:`,
      });
    } catch (err) {
      logger.warn({ err, prefix }, "Failed to create Redis store, falling back to memory");
    }
  }

  logger.info({ prefix }, "Using in-memory store for rate limiting");
  return createMemoryStore() as any;
}

function getClientIp(req: any): string {
  return ipKeyGenerator(req.ip || req.connection?.remoteAddress || "");
}

export const generalRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    error: "Too many requests, please try again later",
    retryAfter: Math.ceil(config.rateLimit.windowMs / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `general:${getClientIp(req)}`;
  },
  handler: (req, res, _next, options) => {
    logger.warn({
      type: "rate_limit",
      ip: getClientIp(req),
      path: req.path,
      requestId: req.requestId,
    });
    res.status(429).json(options.message);
  },
  store: createStore("general"),
});

export const authRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.loginMax,
  message: {
    error: "Too many login attempts, please try again later",
    retryAfter: Math.ceil(config.rateLimit.windowMs / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const identifier = req.body?.email || req.body?.phoneNumber || "";
    return `auth:${getClientIp(req)}:${identifier}`;
  },
  handler: (req, res, _next, options) => {
    logger.warn({
      type: "auth_rate_limit",
      ip: getClientIp(req),
      email: req.body?.email,
      requestId: req.requestId,
    });
    res.status(429).json(options.message);
  },
  store: createStore("auth"),
});

export const sensitiveRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs * 5,
  max: 10,
  message: {
    error: "Too many requests to sensitive endpoint",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `sensitive:${getClientIp(req)}`;
  },
  store: createStore("sensitive"),
});
