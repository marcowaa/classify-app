import crypto from "crypto";
import Redis from "ioredis";

type MemoryEntry = {
  value: string;
  expiresAt: number;
};

type RateWindowEntry = {
  timestamps: number[];
  expiresAt: number;
};

const OAUTH_START_LOCK_PREFIX = "oauth:v1:lock";
const OAUTH_STATE_PREFIX = "oauth:v1:state";
const OAUTH_CALLBACK_RESULT_PREFIX = "oauth:v1:callback";
const OAUTH_START_RATE_PREFIX = "oauth:v1:rate:start";
const MAX_MEMORY_ENTRIES = 10000;

const memoryStore = new Map<string, MemoryEntry>();
const rateWindowStore = new Map<string, RateWindowEntry>();

let redisClient: Redis | null = null;
let redisInitAttempted = false;

function hashKey(input: string, size = 48): string {
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, size);
}

function buildStartLockKey(rawKey: string): string {
  return `${OAUTH_START_LOCK_PREFIX}:${hashKey(rawKey, 40)}`;
}

function buildStateKey(provider: string, nonce: string): string {
  const normalizedProvider = String(provider || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  return `${OAUTH_STATE_PREFIX}:${normalizedProvider}:${hashKey(nonce, 56)}`;
}

function buildStartRateKey(rawKey: string): string {
  return `${OAUTH_START_RATE_PREFIX}:${hashKey(rawKey, 40)}`;
}

function buildCallbackResultKey(provider: string, nonce: string): string {
  const normalizedProvider = String(provider || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  return `${OAUTH_CALLBACK_RESULT_PREFIX}:${normalizedProvider}:${hashKey(nonce, 56)}`;
}

function pruneMemoryStore(): void {
  const now = Date.now();
  for (const [key, entry] of memoryStore.entries()) {
    if (entry.expiresAt <= now) {
      memoryStore.delete(key);
    }
  }

  if (memoryStore.size <= MAX_MEMORY_ENTRIES) return;

  const overflow = memoryStore.size - MAX_MEMORY_ENTRIES;
  let removed = 0;
  for (const key of memoryStore.keys()) {
    memoryStore.delete(key);
    removed += 1;
    if (removed >= overflow) break;
  }
}

function pruneRateWindowStore(now = Date.now()): void {
  for (const [key, entry] of rateWindowStore.entries()) {
    if (entry.expiresAt <= now) {
      rateWindowStore.delete(key);
    }
  }

  if (rateWindowStore.size <= MAX_MEMORY_ENTRIES) return;

  const overflow = rateWindowStore.size - MAX_MEMORY_ENTRIES;
  let removed = 0;
  for (const key of rateWindowStore.keys()) {
    rateWindowStore.delete(key);
    removed += 1;
    if (removed >= overflow) break;
  }
}

function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;
  if (redisInitAttempted) return null;

  const redisUrl = String(process.env["REDIS_URL"] || "").trim();
  if (!redisUrl) {
    redisInitAttempted = true;
    return null;
  }

  redisInitAttempted = true;
  redisClient = new Redis(redisUrl, {
    // Avoid a race where OAuth start writes fall back to in-memory
    // before the Redis connection is ready (especially with cluster workers).
    lazyConnect: false,
    connectTimeout: 3000,
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    // If commands are issued before the connection becomes ready,
    // queue them instead of failing immediately and falling back to memory.
    enableOfflineQueue: true,
    retryStrategy(times) {
      return Math.min(times * 200, 2000);
    },
  });

  redisClient.connect().catch(() => {
    // Keep memory fallback active if Redis is genuinely unavailable.
  });

  return redisClient;
}

async function redisSetNx(key: string, value: string, ttlSeconds: number): Promise<{ attempted: boolean; acquired: boolean }> {
  const client = getRedisClient();
  if (!client) return { attempted: false, acquired: false };

  try {
    const response = await client.set(key, value, "EX", ttlSeconds, "NX");
    return { attempted: true, acquired: response === "OK" };
  } catch {
    return { attempted: false, acquired: false };
  }
}

async function redisSetWithTtl(key: string, value: string, ttlSeconds: number): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    await client.set(key, value, "EX", ttlSeconds);
    return true;
  } catch {
    return false;
  }
}

async function redisGet(key: string): Promise<{ attempted: boolean; value: string | null }> {
  const client = getRedisClient();
  if (!client) return { attempted: false, value: null };

  try {
    const value = await client.get(key);
    return { attempted: true, value };
  } catch {
    return { attempted: false, value: null };
  }
}

async function redisDel(key: string): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    await client.del(key);
    return true;
  } catch {
    return false;
  }
}

async function redisGetDel(key: string): Promise<{ attempted: boolean; value: string | null }> {
  const client = getRedisClient();
  if (!client) return { attempted: false, value: null };

  try {
    const result = await client.eval(
      "local value = redis.call('GET', KEYS[1]); if value then redis.call('DEL', KEYS[1]); end; return value;",
      1,
      key,
    ) as string | null;

    return { attempted: true, value: result };
  } catch {
    return { attempted: false, value: null };
  }
}

async function redisIncrWithWindow(key: string, windowSeconds: number): Promise<{
  attempted: boolean;
  count: number;
  ttlSeconds: number;
}> {
  const client = getRedisClient();
  if (!client) {
    return { attempted: false, count: 0, ttlSeconds: 0 };
  }

  try {
    const result = await client.eval(
      "local current = redis.call('INCR', KEYS[1]); if current == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]); end; local ttl = redis.call('TTL', KEYS[1]); return {current, ttl};",
      1,
      key,
      Math.max(1, Math.trunc(windowSeconds)),
    ) as Array<number | string>;

    const count = Number(result?.[0] ?? 0);
    const ttlSeconds = Number(result?.[1] ?? 0);
    return {
      attempted: true,
      count: Number.isFinite(count) ? count : 0,
      ttlSeconds: Number.isFinite(ttlSeconds) ? ttlSeconds : 0,
    };
  } catch {
    return { attempted: false, count: 0, ttlSeconds: 0 };
  }
}

export async function acquireOAuthStartLock(rawKey: string, ttlSeconds: number): Promise<boolean> {
  const ttl = Math.max(1, Math.trunc(ttlSeconds));
  const key = buildStartLockKey(rawKey);

  const redisResult = await redisSetNx(key, "1", ttl);
  if (redisResult.attempted) {
    return redisResult.acquired;
  }

  pruneMemoryStore();
  const existing = memoryStore.get(key);
  if (existing && existing.expiresAt > Date.now()) {
    return false;
  }

  memoryStore.set(key, {
    value: "1",
    expiresAt: Date.now() + ttl * 1000,
  });

  return true;
}

export async function releaseOAuthStartLock(rawKey: string): Promise<void> {
  const key = buildStartLockKey(rawKey);
  const removedFromRedis = await redisDel(key);
  if (!removedFromRedis) {
    memoryStore.delete(key);
  }
}

export async function checkOAuthStartRateLimit(
  rawKey: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const limit = Math.max(1, Math.trunc(maxRequests));
  const window = Math.max(1, Math.trunc(windowSeconds));
  const key = buildStartRateKey(rawKey);

  const redisResult = await redisIncrWithWindow(key, window);
  if (redisResult.attempted) {
    const allowed = redisResult.count <= limit;
    return {
      allowed,
      retryAfterSeconds: allowed ? 0 : Math.max(1, redisResult.ttlSeconds > 0 ? redisResult.ttlSeconds : window),
    };
  }

  const now = Date.now();
  const windowMs = window * 1000;
  pruneRateWindowStore(now);

  const existing = rateWindowStore.get(key);
  const recent = (existing?.timestamps || []).filter((at) => now - at < windowMs);

  if (recent.length >= limit) {
    const oldest = recent[0] || now;
    const retryAfterMs = Math.max(0, windowMs - (now - oldest));
    rateWindowStore.set(key, {
      timestamps: recent,
      expiresAt: now + windowMs,
    });
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  recent.push(now);
  rateWindowStore.set(key, {
    timestamps: recent,
    expiresAt: now + windowMs,
  });

  return { allowed: true, retryAfterSeconds: 0 };
}

const OAUTH_DEBUG_ENABLED = String(process.env["OAUTH_DEBUG"] || "").trim().toLowerCase() === "true";

export async function saveOAuthLifecycleState(
  provider: string,
  nonce: string,
  payload: unknown,
  ttlSeconds: number,
): Promise<void> {
  const ttl = Math.max(1, Math.trunc(ttlSeconds));
  const key = buildStateKey(provider, nonce);
  const serialized = JSON.stringify(payload);

  if (OAUTH_DEBUG_ENABLED) {
    console.log(`[OAUTH_DEBUG_SAVE] provider=${provider} nonce=${nonce} key=${key} ttlSeconds=${ttlSeconds} ttl=${ttl}`);
  }

  const storedInRedis = await redisSetWithTtl(key, serialized, ttl);
  if (storedInRedis) {
    if (OAUTH_DEBUG_ENABLED) console.log(`[OAUTH_DEBUG_SAVE] storedInRedis=true key=${key}`);
    return;
  }

  if (OAUTH_DEBUG_ENABLED) console.log(`[OAUTH_DEBUG_SAVE] storedInRedis=false key=${key} (falling back to memoryStore)`);

  pruneMemoryStore();
  memoryStore.set(key, {
    value: serialized,
    expiresAt: Date.now() + ttl * 1000,
  });

  if (OAUTH_DEBUG_ENABLED) console.log(`[OAUTH_DEBUG_SAVE] storedInMemory=true key=${key}`);
}

export async function peekOAuthLifecycleState<T>(provider: string, nonce: string): Promise<T | null> {
  const key = buildStateKey(provider, nonce);

  if (OAUTH_DEBUG_ENABLED) {
    console.log(`[OAUTH_DEBUG_PEEK] provider=${provider} nonce=${nonce} key=${key}`);
  }

  const redisResult = await redisGet(key);
  if (redisResult.attempted) {
    if (redisResult.value) {
      try {
        const parsed = JSON.parse(redisResult.value) as T;
        if (OAUTH_DEBUG_ENABLED) console.log(`[OAUTH_DEBUG_PEEK] redisResult.attempted=true valueFound key=${key}`);
        return parsed;
      } catch {
        if (OAUTH_DEBUG_ENABLED) console.log(`[OAUTH_DEBUG_PEEK] redisResult.attempted=true parseFailed key=${key}`);
        return null;
      }
    }

    // Redis "missing" doesn't necessarily mean in-memory is missing:
    // state might have been stored in memory when Redis was unavailable or fell back.
    if (OAUTH_DEBUG_ENABLED) console.log(`[OAUTH_DEBUG_PEEK] redisResult.attempted=true valueMissing key=${key} (falling back to memoryStore)`);
  }

  pruneMemoryStore();
  const entry = memoryStore.get(key);
  if (!entry || entry.expiresAt <= Date.now()) {
    memoryStore.delete(key);
    if (OAUTH_DEBUG_ENABLED) console.log(`[OAUTH_DEBUG_PEEK] memoryMissingOrExpired key=${key}`);
    return null;
  }

  try {
    const parsed = JSON.parse(entry.value) as T;
    if (OAUTH_DEBUG_ENABLED) console.log(`[OAUTH_DEBUG_PEEK] memoryFound key=${key}`);
    return parsed;
  } catch {
    if (OAUTH_DEBUG_ENABLED) console.log(`[OAUTH_DEBUG_PEEK] memoryFound parseFailed key=${key}`);
    return null;
  }
}

export async function consumeOAuthLifecycleState<T>(provider: string, nonce: string): Promise<T | null> {
  const key = buildStateKey(provider, nonce);

  if (OAUTH_DEBUG_ENABLED) {
    console.log(`[OAUTH_DEBUG_CONSUME] provider=${provider} nonce=${nonce} key=${key}`);
  }

  const redisResult = await redisGetDel(key);
  if (redisResult.attempted) {
    if (redisResult.value) {
      try {
        const parsed = JSON.parse(redisResult.value) as T;
        if (OAUTH_DEBUG_ENABLED) console.log(`[OAUTH_DEBUG_CONSUME] redisResult.attempted=true valueFound key=${key}`);
        return parsed;
      } catch {
        if (OAUTH_DEBUG_ENABLED) console.log(`[OAUTH_DEBUG_CONSUME] redisResult.attempted=true parseFailed key=${key}`);
        return null;
      }
    }

    // Redis "missing" doesn't necessarily mean in-memory is missing:
    // consume should still work if the value was stored in memory as a fallback.
    if (OAUTH_DEBUG_ENABLED) console.log(`[OAUTH_DEBUG_CONSUME] redisResult.attempted=true valueMissing key=${key} (falling back to memoryStore)`);
  }

  pruneMemoryStore();
  const entry = memoryStore.get(key);
  if (!entry || entry.expiresAt <= Date.now()) {
    memoryStore.delete(key);
    if (OAUTH_DEBUG_ENABLED) console.log(`[OAUTH_DEBUG_CONSUME] memoryMissingOrExpired key=${key}`);
    return null;
  }

  memoryStore.delete(key);
  try {
    const parsed = JSON.parse(entry.value) as T;
    if (OAUTH_DEBUG_ENABLED) console.log(`[OAUTH_DEBUG_CONSUME] memoryFound key=${key}`);
    return parsed;
  } catch {
    if (OAUTH_DEBUG_ENABLED) console.log(`[OAUTH_DEBUG_CONSUME] memoryFound parseFailed key=${key}`);
    return null;
  }
}

export async function saveOAuthCallbackResult(
  provider: string,
  nonce: string,
  payload: unknown,
  ttlSeconds: number,
): Promise<void> {
  const ttl = Math.max(1, Math.trunc(ttlSeconds));
  const key = buildCallbackResultKey(provider, nonce);
  const serialized = JSON.stringify(payload);

  const storedInRedis = await redisSetWithTtl(key, serialized, ttl);
  if (storedInRedis) return;

  pruneMemoryStore();
  memoryStore.set(key, {
    value: serialized,
    expiresAt: Date.now() + ttl * 1000,
  });
}

export async function getOAuthCallbackResult<T>(provider: string, nonce: string): Promise<T | null> {
  const key = buildCallbackResultKey(provider, nonce);

  const redisResult = await redisGet(key);
  if (redisResult.attempted) {
    if (!redisResult.value) return null;
    try {
      return JSON.parse(redisResult.value) as T;
    } catch {
      return null;
    }
  }

  pruneMemoryStore();
  const entry = memoryStore.get(key);
  if (!entry || entry.expiresAt <= Date.now()) {
    memoryStore.delete(key);
    return null;
  }

  try {
    return JSON.parse(entry.value) as T;
  } catch {
    return null;
  }
}
