import Redis from "ioredis";
import { config } from "./index";
import { logger } from "../utils/logger";

let redisClient: Redis | null = null;
let isRedisAvailable = false;

export function createRedisClient(): Redis | null {
  if (redisClient) {
    return redisClient;
  }

  try {
    redisClient = new Redis(config.redis.url, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
      connectTimeout: 5000,
    });

    redisClient.on("connect", () => {
      isRedisAvailable = true;
      logger.info("Redis connected successfully");
    });

    redisClient.on("error", (err) => {
      isRedisAvailable = false;
      logger.warn({ err }, "Redis connection error - falling back to in-memory");
    });

    redisClient.on("close", () => {
      isRedisAvailable = false;
      logger.warn("Redis connection closed");
    });

    redisClient.connect().catch((err) => {
      isRedisAvailable = false;
      logger.warn({ err }, "Failed to connect to Redis - using in-memory fallback");
    });

    return redisClient;
  } catch (err) {
    logger.warn({ err }, "Redis initialization failed - using in-memory fallback");
    return null;
  }
}

export function getRedisClient(): Redis | null {
  return redisClient;
}

export function isRedisConnected(): boolean {
  return isRedisAvailable && redisClient !== null;
}

const memoryCache = new Map<string, { value: string; expiresAt: number }>();

function wildcardPatternToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  const wildcard = escaped.replace(/\*/g, ".*");
  return new RegExp(`^${wildcard}$`);
}

export async function cacheGet(key: string): Promise<string | null> {
  if (isRedisConnected() && redisClient) {
    try {
      return await redisClient.get(key);
    } catch (err) {
      logger.warn({ err, key }, "Redis GET failed, using memory fallback");
    }
  }

  const cached = memoryCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }
  memoryCache.delete(key);
  return null;
}

export async function cacheSet(key: string, value: string, ttlSeconds?: number): Promise<void> {
  const ttl = ttlSeconds || config.cache.ttlSeconds;

  if (isRedisConnected() && redisClient) {
    try {
      await redisClient.setex(key, ttl, value);
      return;
    } catch (err) {
      logger.warn({ err, key }, "Redis SET failed, using memory fallback");
    }
  }

  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttl * 1000,
  });
}

export async function cacheDel(key: string): Promise<void> {
  if (isRedisConnected() && redisClient) {
    try {
      await redisClient.del(key);
    } catch (err) {
      logger.warn({ err, key }, "Redis DEL failed");
    }
  }
  memoryCache.delete(key);
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  if (isRedisConnected() && redisClient) {
    try {
      let cursor = "0";
      const keysToDelete: string[] = [];

      do {
        const [nextCursor, keys] = await redisClient.scan(
          cursor,
          "MATCH",
          pattern,
          "COUNT",
          100
        );
        cursor = nextCursor;
        keysToDelete.push(...keys);
      } while (cursor !== "0");

      if (keysToDelete.length > 0) {
        const pipeline = redisClient.pipeline();
        for (let i = 0; i < keysToDelete.length; i += 100) {
          const batch = keysToDelete.slice(i, i + 100);
          pipeline.del(...batch);
        }
        await pipeline.exec();
      }
    } catch (err) {
      logger.warn({ err, pattern }, "Redis pattern delete failed");
    }
  }

  const patternRegex = wildcardPatternToRegExp(pattern);
  const keysToDelete: string[] = [];
  memoryCache.forEach((_, key) => {
    if (patternRegex.test(key)) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach(key => memoryCache.delete(key));
}

setInterval(() => {
  const now = Date.now();
  const keysToDelete: string[] = [];
  memoryCache.forEach((value, key) => {
    if (value.expiresAt <= now) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach(key => memoryCache.delete(key));
}, 60000);

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    isRedisAvailable = false;
  }
}
