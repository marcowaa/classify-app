import { cacheGet, cacheSet, cacheDel, cacheDelPattern } from "../config/redis";
import { logger } from "../utils/logger";

export class CacheService {
  private prefix: string;
  private defaultTTL: number;

  constructor(prefix: string, defaultTTL: number = 300) {
    this.prefix = prefix;
    this.defaultTTL = defaultTTL;
  }

  private getKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await cacheGet(this.getKey(key));
      if (cached) {
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      logger.warn({ error, key }, "Cache get error");
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await cacheSet(this.getKey(key), JSON.stringify(value), ttl || this.defaultTTL);
    } catch (error) {
      logger.warn({ error, key }, "Cache set error");
    }
  }

  async del(key: string): Promise<void> {
    try {
      await cacheDel(this.getKey(key));
    } catch (error) {
      logger.warn({ error, key }, "Cache delete error");
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      await cacheDelPattern(`${this.prefix}:${pattern}`);
    } catch (error) {
      logger.warn({ error, pattern }, "Cache pattern delete error");
    }
  }

  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetchFn();
    await this.set(key, value, ttl);
    return value;
  }
}

export const parentsCacheService = new CacheService("parents", 600);
export const childrenCacheService = new CacheService("children", 600);
export const productsCacheService = new CacheService("products", 300);
export const tasksCacheService = new CacheService("tasks", 300);
export const statsCacheService = new CacheService("stats", 60);
