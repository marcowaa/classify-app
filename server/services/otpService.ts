import bcrypt from "bcrypt";
import crypto from "crypto";
import { otpCodes } from "../../shared/schema";
import { and, desc, eq, isNull, or, sql } from "drizzle-orm";

function clampEnvInt(raw: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof raw === "number" ? raw : Number.parseInt(String(raw || ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  const normalized = Math.trunc(parsed);
  return Math.min(max, Math.max(min, normalized));
}

export const OTP_LENGTH = clampEnvInt(process.env.OTP_CODE_LENGTH, 6, 4, 8);
export const OTP_EXPIRY_MINUTES = clampEnvInt(process.env.OTP_EXPIRY_MINUTES, 5, 1, 60);
export const MAX_ATTEMPTS = clampEnvInt(process.env.OTP_MAX_ATTEMPTS, 3, 1, 10);
const OTP_COOLDOWN_MINUTES = clampEnvInt(process.env.OTP_COOLDOWN_MINUTES, 1, 0, 60);
export const OTP_COOLDOWN_SECONDS = clampEnvInt(
  process.env.OTP_COOLDOWN_SECONDS,
  OTP_COOLDOWN_MINUTES * 60,
  0,
  3600,
);
const SALT_ROUNDS = 10;

export function generateOTP(): string {
  const min = 10 ** (OTP_LENGTH - 1);
  const max = 10 ** OTP_LENGTH - 1;
  return crypto.randomInt(min, max + 1).toString();
}

export async function hashOTP(code: string): Promise<string> {
  return bcrypt.hash(code, SALT_ROUNDS);
}

export async function compareOTP(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code, hash);
}

export function validateExpiry(expiresAt: Date): boolean {
  return new Date() <= expiresAt;
}

export async function createOTPRecord(db: any, params: {
  parentId?: string | null;
  purpose: string;
  destination: string;
  provider: string;
  codeHash: string;
  expiresAt: Date;
  deviceHash?: string | null;
  ipAddress?: string | null;
}) {
  const { parentId, purpose, destination, provider, codeHash, expiresAt, deviceHash, ipAddress } = params;

  if (parentId && OTP_COOLDOWN_SECONDS > 0) {
    const [latest] = await db
      .select({ createdAt: otpCodes.createdAt })
      .from(otpCodes)
      .where(and(
        eq(otpCodes.parentId, parentId),
        eq(otpCodes.purpose, purpose)
      ))
      .orderBy(desc(otpCodes.createdAt))
      .limit(1);
    if (latest?.createdAt) {
      const elapsedMs = Date.now() - new Date(latest.createdAt).getTime();
      const cooldownMs = OTP_COOLDOWN_SECONDS * 1000;
      if (elapsedMs < cooldownMs) {
        const retryAfter = Math.ceil((cooldownMs - elapsedMs) / 1000);
        const err: any = new Error("OTP_COOLDOWN");
        err.retryAfter = retryAfter;
        throw err;
      }
    }
  }

  if (parentId) {
    await db
      .update(otpCodes)
      .set({ status: "superseded", isUsed: true })
      .where(and(
        eq(otpCodes.parentId, parentId),
        eq(otpCodes.purpose, purpose),
        eq(otpCodes.status, "pending")
      ));
  }
  const inserted = await db.insert(otpCodes).values({
    parentId: parentId || null,
    purpose,
    destination,
    method: provider,
    code: codeHash,
    expiresAt,
    status: "pending",
    attempts: 0,
    deviceHash: deviceHash || null,
    ipAddress: ipAddress || null,
    isUsed: false,
    createdAt: new Date(),
  }).returning();

  return inserted[0];
}

export async function incrementAttempts(db: any, id: string, attempts: number) {
  return db.update(otpCodes).set({ attempts }).where(eq(otpCodes.id, id));
}

export async function incrementAttemptsAtomic(db: any, id: string) {
  const pendingCondition = or(eq(otpCodes.status, "pending"), isNull(otpCodes.status));
  const [updated] = await db
    .update(otpCodes)
    .set({ attempts: sql`${otpCodes.attempts} + 1` })
    .where(and(eq(otpCodes.id, id), pendingCondition))
    .returning({ attempts: otpCodes.attempts });

  return updated?.attempts ?? null;
}

export async function markVerified(db: any, id: string) {
  return db.update(otpCodes).set({
    status: "verified",
    verifiedAt: new Date(),
    isUsed: true,
  }).where(eq(otpCodes.id, id));
}

export async function markVerifiedAtomic(db: any, id: string) {
  const pendingCondition = or(eq(otpCodes.status, "pending"), isNull(otpCodes.status));
  const [updated] = await db.update(otpCodes).set({
    status: "verified",
    verifiedAt: new Date(),
    isUsed: true,
  }).where(and(
    eq(otpCodes.id, id),
    pendingCondition,
    eq(otpCodes.isUsed, false)
  )).returning({ id: otpCodes.id });

  return updated?.id ?? null;
}

export async function blockOTP(db: any, id: string) {
  return db.update(otpCodes).set({ status: "blocked" }).where(eq(otpCodes.id, id));
}

export async function verifyOtpRecord(db: any, params: {
  parentId: string;
  destination: string;
  code: string;
  purpose: string;
  method?: string;
  otpId?: string;
}) {
  const { parentId, destination, code, purpose, method, otpId } = params;
  const pendingCondition = or(eq(otpCodes.status, "pending"), isNull(otpCodes.status));
  const conditions = [
    eq(otpCodes.parentId, parentId),
    eq(otpCodes.purpose, purpose),
    eq(otpCodes.destination, destination),
    pendingCondition,
  ];
  if (otpId) {
    conditions.push(eq(otpCodes.id, otpId));
  }
  if (method) {
    conditions.push(eq(otpCodes.method, method));
  }

  const recordQuery = otpId
    ? db
      .select()
      .from(otpCodes)
      .where(and(...conditions))
      .limit(1)
    : db
      .select()
      .from(otpCodes)
      .where(and(...conditions))
      .orderBy(desc(otpCodes.createdAt))
      .limit(1);

  const rows = await recordQuery;
  const record = rows[0];

  if (!record) {
    return { ok: false, error: "INVALID_OTP", message: "Invalid OTP" } as const;
  }

  if (!validateExpiry(record.expiresAt)) {
    await db.update(otpCodes).set({ status: "expired" }).where(eq(otpCodes.id, record.id));
    return { ok: false, error: "OTP_EXPIRED", message: "OTP expired" } as const;
  }

  const isValid = await compareOTP(code, record.code);
  if (!isValid) {
    const attempts = await incrementAttemptsAtomic(db, record.id);
    if (attempts !== null && attempts >= MAX_ATTEMPTS) {
      await blockOTP(db, record.id);
      return { ok: false, error: "OTP_BLOCKED", message: "OTP blocked" } as const;
    }
    if (attempts === null) {
      return { ok: false, error: "OTP_USED", message: "OTP already used" } as const;
    }
    return { ok: false, error: "INVALID_OTP", message: "Invalid OTP" } as const;
  }

  const verifiedId = await markVerifiedAtomic(db, record.id);
  if (!verifiedId) {
    return { ok: false, error: "OTP_USED", message: "OTP already used" } as const;
  }

  return { ok: true, record } as const;
}
