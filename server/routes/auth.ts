import type { Express } from "express";
import { storage } from "../storage";
import { parents, children, parentChild, otpCodes, otpRequestLogs, sessions, loginHistory, trustedDevices, libraries, libraryReferrals, parentReferralCodes, referrals, referralSettings, parentParentSync, appSettings, parentSocialIdentities } from "../../shared/schema";
import { eq, and, gt, isNull, desc, or, sql } from "drizzle-orm";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { OAuth2Client } from "google-auth-library";
// Type declarations for `qrcode` are not present in the repo; silence TypeScript here
import { createRedisClient, getRedisClient } from "../src/config/redis";
// Type declarations for `qrcode` are not present in the repo; silence TypeScript here
// @ts-ignore
import QRCode from "qrcode";
import { JWT_SECRET, authMiddleware } from "./middleware";
import { smsOTPService } from "../sms-otp";
import { whatsappOTPService } from "../whatsapp-otp";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { successResponse, errorResponse, ErrorCode } from "../utils/apiResponse";
import { trackOtpEvent } from "../utils/otpMonitoring";
import { loginLimiter, otpRequestLimiter, otpVerifyLimiter, registerLimiter } from "../utils/rateLimiters";
import {
  generateOTP,
  hashOTP,
  compareOTP,
  createOTPRecord,
  validateExpiry,
  incrementAttempts,
  incrementAttemptsAtomic,
  markVerified,
  markVerifiedAtomic,
  blockOTP,
  MAX_ATTEMPTS,
  OTP_EXPIRY_MINUTES,
  OTP_COOLDOWN_SECONDS,
} from "../services/otpService";
import { getProviderOrFallback } from "../providers/otp/providerFactory";
import { NOTIFICATION_TYPES, NOTIFICATION_STYLES, NOTIFICATION_PRIORITIES } from "../../shared/notificationTypes";
import { activateOnLoginSessions, resumePausedSessions } from "../services/scheduledSessionService";
import { createNotification, notifyAllAdmins } from "../notifications";
import {
  acquireOAuthStartLock,
  checkOAuthStartRateLimit,
  peekOAuthLifecycleState,
  consumeOAuthLifecycleState,
  getOAuthCallbackResult,
  releaseOAuthStartLock,
  saveOAuthCallbackResult,
  saveOAuthLifecycleState,
} from "../utils/oauthFlowStore";
import { trackOAuthMetric } from "../utils/oauthMonitoring";

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const OTP_RATE_LIMIT_RETRY_AFTER_SEC = 10 * 60;

const MAX_TRUSTED_DEVICES = 5;
const DEVICE_TOKEN_EXPIRY_DAYS = 45;
const OAUTH_START_LOCK_TTL_SECONDS = Math.min(
  60,
  Math.max(5, Number.parseInt(String(process.env["OAUTH_START_LOCK_TTL_SECONDS"] || "10"), 10) || 10),
);
const OAUTH_STATE_EXPIRY_SECONDS = Math.min(
  15 * 60,
  Math.max(2 * 60, Number.parseInt(String(process.env["OAUTH_STATE_EXPIRY_SECONDS"] || "300"), 10) || 300),
);
const OAUTH_STATE_EXPIRY_MS = OAUTH_STATE_EXPIRY_SECONDS * 1000;
const OAUTH_CALLBACK_RESULT_TTL_SECONDS = Math.min(
  60,
  Math.max(30, Number.parseInt(String(process.env["OAUTH_CALLBACK_RESULT_TTL_SECONDS"] || "45"), 10) || 45),
);
const OAUTH_PKCE_COOKIE_NAME = "oauth_pkce_verifier";
const OAUTH_CLIENT_SEED_COOKIE_NAME = "oauth_client_seed";
const OAUTH_FINGERPRINT_INCLUDE_IP_SEGMENT = String(process.env["OAUTH_FINGERPRINT_INCLUDE_IP_SEGMENT"] || "true").trim().toLowerCase() !== "false";
const OAUTH_START_RATE_LIMIT_MAX = Math.min(
  20,
  Math.max(1, Number.parseInt(String(process.env["OAUTH_START_RATE_LIMIT_MAX"] || "5"), 10) || 5),
);
const OAUTH_START_RATE_LIMIT_WINDOW_SECONDS = Math.min(
  60,
  Math.max(1, Number.parseInt(String(process.env["OAUTH_START_RATE_LIMIT_WINDOW_SECONDS"] || "10"), 10) || 10),
);
const googleIdTokenClient = new OAuth2Client();

const AUTH_REDEEM_COOKIE_WRITE_ENABLED =
  String(process.env.AUTH_REDEEM_COOKIE_WRITE_ENABLED || "")
    .trim()
    .toLowerCase() === "true";

/**
 * Backward-compat:
 * - If flag is unset: keep existing behavior (return token).
 * - If flag is set to "false": omit token from JSON, cookie-only.
 */
const AUTH_REDEEM_RETURNS_TOKEN =
  String(process.env.AUTH_REDEEM_RETURNS_TOKEN || "")
    .trim()
    .toLowerCase() !== "false";

const AUTH_TOKEN_COOKIE_NAME = "auth_token";

const db = storage.db;

function signParentAccessToken(parentId: string): string {
  return jwt.sign(
    {
      userId: parentId,
      parentId,
      type: "parent",
      jti: crypto.randomUUID(),
    },
    JWT_SECRET,
    { expiresIn: "30d" }
  );
}

// Helper functions
function maskPhoneNumber(phone: string): string {
  return phone.slice(0, 4) + "****" + phone.slice(-4);
}

function computeDeviceHash(deviceId: string | undefined, req: any): string | null {
  if (!deviceId) return null;
  const ua = req.get("user-agent") || "";
  const ip = req.ip || "";
  const seed = `${deviceId}|${ua}|${ip}`;
  return crypto.createHash("sha256").update(seed).digest("hex");
}

function normalizeEmail(email: string | undefined): string | null {
  if (!email) return null;
  return email.trim().toLowerCase();
}

function isValidEmailFormat(email: string): boolean {
  const value = String(email || "").trim();
  if (!value || value.length > 254) return false;

  let atIndex = -1;
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i];
    if (!ch) return false;
    if (ch <= " ") return false;
    if (ch === "@") {
      if (atIndex !== -1) return false;
      atIndex = i;
    }
  }

  if (atIndex <= 0 || atIndex >= value.length - 1) return false;

  const local = value.slice(0, atIndex);
  const domain = value.slice(atIndex + 1);
  if (!local || !domain) return false;
  if (local.endsWith(".")) return false;
  if (domain.startsWith(".") || domain.endsWith(".")) return false;
  if (!domain.includes(".")) return false;
  if (domain.includes("..")) return false;

  return true;
}

function isGeneratedPhoneEmail(email: unknown): boolean {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return false;
  if (normalized.endsWith("@phone.local")) return true;
  return normalized.startsWith("phone_");
}

function isTemporaryTrialEmail(email: unknown): boolean {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return false;
  if (normalized.endsWith("@trial.classi-fy.local")) return true;
  if (normalized.startsWith("parent_trial_")) return true;
  return normalized.startsWith("child_trial_");
}

function shouldReplaceParentName(currentName: unknown, currentEmail: unknown): boolean {
  const normalizedName = String(currentName || "").trim();
  if (!normalizedName) return true;

  const loweredName = normalizedName.toLowerCase();
  if (
    loweredName === "parent"
    || loweredName === "parent account"
    || loweredName === "account"
    || loweredName === "user"
    || loweredName === "ولي الأمر"
    || loweredName.startsWith("phone_")
  ) {
    return true;
  }

  const normalizedEmail = String(currentEmail || "").trim().toLowerCase();
  if (normalizedEmail.includes("@")) {
    const emailPrefix = normalizedEmail.split("@")[0];
    if (emailPrefix && loweredName === emailPrefix) {
      return true;
    }
  }

  return false;
}

function resolveOAuthTokenExpiry(tokenData: any): Date | null {
  const expiresInRaw = tokenData?.expires_in;
  const expiresIn = typeof expiresInRaw === "number"
    ? expiresInRaw
    : Number.parseInt(String(expiresInRaw || ""), 10);

  if (!Number.isFinite(expiresIn) || expiresIn <= 0) {
    return null;
  }

  return new Date(Date.now() + expiresIn * 1000);
}

function resolveParentIdFromLinkToken(
  rawToken: unknown,
  options: { allowParentToken?: boolean } = {},
): string | null {
  const token = String(rawToken || "").trim();
  if (!token) return null;

  const allowParentToken = options.allowParentToken === true;

  const fallbackSecret = String(process.env["JWT_SECRET_PREVIOUS"] || "").trim();
  const secrets = fallbackSecret ? [JWT_SECRET, fallbackSecret] : [JWT_SECRET];

  for (const secret of secrets) {
    try {
      const decoded = jwt.verify(token, secret, { clockTolerance: 120 }) as any;
      const tokenType = String(decoded?.type || "").trim().toLowerCase();
      const userId = String(decoded?.userId || decoded?.parentId || "").trim();
      if ((tokenType === "oauth_link" || (allowParentToken && tokenType === "parent")) && userId) {
        return userId;
      }
    } catch {
      // Try next accepted secret.
    }
  }

  return null;
}

function normalizePhoneNumber(phoneNumber: unknown): string {
  if (typeof phoneNumber !== "string") return "";
  return phoneNumber.trim();
}

function normalizeParentGender(gender: unknown): "male" | "female" | null {
  if (typeof gender !== "string") return null;
  const normalized = gender.trim().toLowerCase();
  if (["male", "m", "man", "ذكر"].includes(normalized)) return "male";
  if (["female", "f", "woman", "أنثى", "انثى"].includes(normalized)) return "female";
  return null;
}

function generateReadableCode(length = 6): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length }, () => alphabet[crypto.randomInt(0, alphabet.length)] || "A").join("");
}

async function generateUniqueParentCode(_maxAttempts = 20): Promise<string> {
  // Fast path: avoid DB-dependent uniqueness-check during auth bootstrap.
  // Collision risk is negligible (6-char alphabet w/ 32 choices => ~1B combinations),
  // and the database UNIQUE constraint on parents.unique_code remains the final guard.
  return generateReadableCode(6);
}

function normalizeInternalReturnToPath(rawValue: unknown, fallback: string = "/parent-dashboard"): string {
  const value = String(rawValue || "").trim();

  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  if (value.includes("\\") || /[\u0000-\u001F\u007F]/.test(value)) {
    return fallback;
  }

  try {
    const parsed = new URL(value, "https://classi-fy.com");
    if (parsed.origin !== "https://classi-fy.com") {
      return fallback;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

function normalizeTrustedExternalRedirect(rawValue: unknown, trustedProviderAuthUrl: string): string | null {
  const value = String(rawValue || "").trim();
  if (!value) return null;

  try {
    const parsedTarget = new URL(value);
    const parsedTrusted = new URL(trustedProviderAuthUrl);

    if (parsedTarget.protocol !== "https:") {
      return null;
    }

    if (parsedTarget.origin.toLowerCase() !== parsedTrusted.origin.toLowerCase()) {
      return null;
    }

    return parsedTarget.toString();
  } catch {
    return null;
  }
}

async function generateUniqueChildShareCode(): Promise<string> {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = Array.from({ length: 8 }, () => alphabet[crypto.randomInt(0, alphabet.length)]).join("");
    const existing = await db
      .select({ id: children.id })
      .from(children)
      .where(eq(children.shareCode, candidate))
      .limit(1);
    if (!existing[0]) return candidate;
  }
  return `${Date.now().toString(36).toUpperCase().slice(-8)}`;
}

function resolveAgeFromInputs(ageInput: unknown, birthDateInput: unknown): number | null {
  if (typeof ageInput === "number" && Number.isFinite(ageInput) && ageInput >= 1 && ageInput <= 120) {
    return Math.trunc(ageInput);
  }

  if (typeof ageInput === "string") {
    const parsed = Number.parseInt(ageInput.trim(), 10);
    if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 120) {
      return parsed;
    }
  }

  if (typeof birthDateInput !== "string" || !birthDateInput.trim()) return null;
  const birthDate = new Date(birthDateInput);
  if (Number.isNaN(birthDate.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDelta = now.getMonth() - birthDate.getMonth();
  const dayDelta = now.getDate() - birthDate.getDate();
  if (monthDelta < 0 || (monthDelta === 0 && dayDelta < 0)) {
    age -= 1;
  }
  if (!Number.isFinite(age) || age < 1 || age > 120) return null;
  return age;
}

async function getParentThresholdAge(): Promise<number> {
  try {
    const agePolicySetting = await db.select().from(appSettings).where(eq(appSettings.key, "agePolicy")).limit(1);
    if (agePolicySetting[0]?.value) {
      try {
        const parsedPolicy = JSON.parse(agePolicySetting[0].value);
        const rawPolicyThreshold = parsedPolicy?.parentThresholdAge;
        const policyThreshold = typeof rawPolicyThreshold === "number"
          ? rawPolicyThreshold
          : Number.parseInt(String(rawPolicyThreshold ?? ""), 10);

        if (Number.isFinite(policyThreshold)) {
          return Math.min(120, Math.max(1, Math.trunc(policyThreshold)));
        }
      } catch {
      }
    }

    const mobileSetting = await db.select().from(appSettings).where(eq(appSettings.key, "mobileApp")).limit(1);
    if (!mobileSetting[0]?.value) return 13;

    const parsed = JSON.parse(mobileSetting[0].value);
    const rawThreshold = parsed?.parentThresholdAge;
    const numericThreshold = typeof rawThreshold === "number"
      ? rawThreshold
      : Number.parseInt(String(rawThreshold ?? ""), 10);

    if (!Number.isFinite(numericThreshold)) return 13;
    return Math.min(120, Math.max(1, Math.trunc(numericThreshold)));
  } catch {
    return 13;
  }
}

function resolveChildBirthday(resolvedAge: number, birthDateInput: unknown): Date {
  if (typeof birthDateInput === "string" && birthDateInput.trim()) {
    const parsedBirth = new Date(birthDateInput);
    if (!Number.isNaN(parsedBirth.getTime())) {
      return parsedBirth;
    }
  }

  const approx = new Date();
  approx.setFullYear(approx.getFullYear() - resolvedAge);
  return approx;
}

async function createChildTrialPayload(name: string, resolvedAge: number, birthDateInput: unknown) {
  const childBirthday = resolveChildBirthday(resolvedAge, birthDateInput);
  const shareCode = await generateUniqueChildShareCode();
  const childInsert = await db
    .insert(children)
    .values({
      name,
      birthday: childBirthday,
      shareCode,
    })
    .returning();

  const childId = childInsert[0].id;
  const childToken = jwt.sign({ childId, type: "child" }, JWT_SECRET, { expiresIn: "30d" });
  const trialChildToken = jwt.sign(
    { purpose: "trial_child_link", childId, shareCode, type: "trial_child_link" },
    JWT_SECRET,
    { expiresIn: "7d" },
  );
  const baseUrl = process.env["APP_URL"] || "";
  const trialChildLinkUrl = `${baseUrl || ""}/parent-auth?mode=register&trialChildToken=${encodeURIComponent(trialChildToken)}`;
  const trialChildQrCodeUrl = await QRCode.toDataURL(trialChildLinkUrl);

  return {
    childId,
    childName: childInsert[0].name,
    shareCode,
    childToken,
    trialChildToken,
    trialChildLinkUrl,
    trialChildQrCodeUrl,
  };
}

function respondRateLimited(res: any, message: string) {
  res.set("Retry-After", String(OTP_RATE_LIMIT_RETRY_AFTER_SEC));
  return res.status(429).json(errorResponse(ErrorCode.RATE_LIMITED, message));
}

function respondOtpCooldown(res: any, retryAfter: number) {
  res.set("Retry-After", String(retryAfter));
  return res.status(429).json(errorResponse(ErrorCode.RATE_LIMITED, "Please wait before requesting a new OTP."));
}

async function isOtpRequestAllowed(destination: string, ipAddress: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - 10 * 60 * 1000);
  const recent = await db
    .select()
    .from(otpRequestLogs)
    .where(and(
      eq(otpRequestLogs.destination, destination),
      eq(otpRequestLogs.ipAddress, ipAddress),
      gt(otpRequestLogs.createdAt, windowStart)
    ));

  return recent.length < 3;
}

async function logOtpRequest(destination: string, ipAddress: string) {
  await db.insert(otpRequestLogs).values({
    destination,
    ipAddress,
    createdAt: new Date(),
  });
}

async function notifyAdminsAccountLocked(parent: typeof parents.$inferSelect, method: "email" | "phone", attemptCount: number, req: any) {
  const identifier = method === "email" ? (parent.email || "unknown") : (parent.phoneNumber || "unknown");
  await notifyAllAdmins({
    type: NOTIFICATION_TYPES.SECURITY_ALERT,
    title: "🚫 Account Locked",
    message: `Parent account locked after ${attemptCount} failed ${method} login attempts: ${identifier}`,
    style: NOTIFICATION_STYLES.BANNER,
    priority: NOTIFICATION_PRIORITIES.URGENT,
    channels: ["in_app", "web_push", "mobile_push"],
    soundAlert: true,
    metadata: {
      source: "auth_login_lockout",
      method,
      parentId: parent.id,
      parentName: parent.name,
      parentEmail: parent.email,
      parentPhone: parent.phoneNumber,
      failedLoginAttempts: attemptCount,
      lockoutMinutes: LOCKOUT_MINUTES,
      ipAddress: req.ip || null,
      userAgent: req.get("user-agent") || null,
      lockedUntil: new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString(),
    },
  });
}

async function canUseSMS(parentId: string): Promise<boolean> {
  const serviceAvailable = await isSmsOtpServiceAvailable();
  if (!serviceAvailable) return false;

  const parent = await db.select().from(parents).where(eq(parents.id, parentId));
  return !!(parent[0]?.phoneNumber && parent[0]?.smsEnabled);
}

async function isSmsProviderActive(): Promise<boolean> {
  return String(process.env["OTP_SMS_ENABLED"] || "false").trim().toLowerCase() === "true";
}

async function isSmsOtpServiceAvailable(): Promise<boolean> {
  if (!smsOTPService.isEnabled()) return false;
  return isSmsProviderActive();
}

async function isWhatsappProviderActive(): Promise<boolean> {
  return String(process.env["OTP_WHATSAPP_ENABLED"] || "false").trim().toLowerCase() === "true";
}

async function isWhatsappOtpServiceAvailable(): Promise<boolean> {
  if (!(await whatsappOTPService.isEnabled())) return false;
  return isWhatsappProviderActive();
}

async function checkSMSRateLimit(parentId: string): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const recentAttempts = await db
    .select()
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.parentId, parentId),
        eq(otpCodes.method, "sms"),
        gt(otpCodes.createdAt, oneHourAgo)
      )
    );

  return recentAttempts.length < 5;
}

async function checkWhatsAppRateLimit(parentId: string): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const recentAttempts = await db
    .select()
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.parentId, parentId),
        eq(otpCodes.method, "whatsapp"),
        gt(otpCodes.createdAt, oneHourAgo)
      )
    );

  return recentAttempts.length < 5;
}

async function hasAnyFamilyPin(parentId: string, parentPin?: string | null): Promise<boolean> {
  if (parentPin) return true;

  const childWithPin = await db
    .select({ id: children.id })
    .from(parentChild)
    .innerJoin(children, eq(parentChild.childId, children.id))
    .where(and(
      eq(parentChild.parentId, parentId),
      sql`${children.pin} is not null`
    ))
    .limit(1);

  return Boolean(childWithPin[0]);
}

function getOAuthCookieDomain(): string | undefined {
  const appUrl = process.env["APP_URL"];
  if (!appUrl) return undefined;

  try {
    const host = new URL(appUrl).hostname.toLowerCase();
    // Keep localhost/IP host-only to avoid invalid domain cookies in dev.
    if (host === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      return undefined;
    }
    // Use parent domain so both apex and www share oauth_state.
    return host.startsWith("www.") ? host.slice(4) : host;
  } catch {
    return undefined;
  }
}

async function getAuthFeatureToggles() {
  return {
    socialLoginEnabled: String(process.env["AUTH_SOCIAL_LOGIN_ENABLED"] || "true").trim().toLowerCase() !== "false",
    otpEnabled: String(process.env["AUTH_OTP_ENABLED"] || "true").trim().toLowerCase() !== "false",
  };
}

type EnvSocialProviderConfig = {
  provider: string;
  displayName: string;
  displayNameAr: string;
  iconName: string;
  sortOrder: number;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string;
};

type EnvSocialProviderRuntimeConfig = EnvSocialProviderConfig & {
  webEnabled: boolean;
  nativeEnabled: boolean;
};

const SOCIAL_PROVIDER_ENV_DEFAULTS: Record<string, { displayName: string; displayNameAr: string; iconName: string; sortOrder: number; scopes: string }> = {
  google: { displayName: "Google", displayNameAr: "Google", iconName: "Chrome", sortOrder: 1, scopes: "email profile" },
  facebook: { displayName: "Facebook", displayNameAr: "Facebook", iconName: "Facebook", sortOrder: 2, scopes: "email public_profile" },
  apple: { displayName: "Apple", displayNameAr: "Apple", iconName: "Apple", sortOrder: 3, scopes: "name email" },
  twitter: { displayName: "X", displayNameAr: "X", iconName: "Twitter", sortOrder: 4, scopes: "tweet.read users.read" },
  github: { displayName: "GitHub", displayNameAr: "GitHub", iconName: "Github", sortOrder: 5, scopes: "user:email" },
  microsoft: { displayName: "Microsoft", displayNameAr: "Microsoft", iconName: "Monitor", sortOrder: 6, scopes: "openid email profile" },
  linkedin: { displayName: "LinkedIn", displayNameAr: "LinkedIn", iconName: "Linkedin", sortOrder: 7, scopes: "r_emailaddress r_liteprofile" },
  discord: { displayName: "Discord", displayNameAr: "Discord", iconName: "MessageCircle", sortOrder: 8, scopes: "identify email" },
};

const OTP_PUBLIC_PROVIDERS = [
  {
    id: "env-email",
    provider: "email",
    displayName: "Email",
    displayNameAr: "البريد الإلكتروني",
    description: "Send OTP via email",
    descriptionAr: "إرسال رمز التحقق عبر البريد الإلكتروني",
    iconName: "Mail",
    sortOrder: 1,
  },
  {
    id: "env-sms",
    provider: "sms",
    displayName: "SMS",
    displayNameAr: "رسالة نصية",
    description: "Send OTP via SMS",
    descriptionAr: "إرسال رمز التحقق عبر الرسائل النصية",
    iconName: "Smartphone",
    sortOrder: 2,
  },
  {
    id: "env-whatsapp",
    provider: "whatsapp",
    displayName: "WhatsApp",
    displayNameAr: "واتساب",
    description: "Send OTP via WhatsApp",
    descriptionAr: "إرسال رمز التحقق عبر واتساب",
    iconName: "MessageCircle",
    sortOrder: 3,
  },
];

function normalizeEnvBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return fallback;
}

function normalizeEnvInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

function readProviderEnvValue(prefix: string, keys: string[]): string {
  for (const key of keys) {
    const value = String(process.env[`${prefix}_${key}`] || "").trim();
    if (value) return value;
  }
  return "";
}

function readGoogleWebClientId(): string {
  const envClientId = readProviderEnvValue("GOOGLE", ["WEB_CLIENT_ID", "CLIENT_ID", "OAUTH_CLIENT_ID"]);
  return String(envClientId || GOOGLE_WEB_CLIENT_ID_FALLBACK).trim();
}

function readGoogleAnyClientId(): string {
  // Prefer Android OAuth client id for native Google sign-in.
  // Falling back to the web client id can cause idToken audience mismatches.
  const androidClientId = readProviderEnvValue("GOOGLE", ["ANDROID_CLIENT_ID", "CLIENT_ID_ANDROID"]);
  if (androidClientId) return androidClientId;

  const webClientId = readGoogleWebClientId();
  if (webClientId) return webClientId;

  return "";
}

function readGoogleAllowedAudiences(): string[] {
  return Array.from(new Set([
    readGoogleWebClientId(),
    readProviderEnvValue("GOOGLE", ["ANDROID_CLIENT_ID", "CLIENT_ID_ANDROID"]),
    readGoogleAnyClientId(),
  ].filter(Boolean)));
}

function isSocialProviderEnabled(prefix: string): boolean {
  const direct = process.env[`${prefix}_ENABLED`];
  const authScoped = process.env[`AUTH_${prefix}_ENABLED`];
  const raw = typeof direct !== "undefined" ? direct : authScoped;
  return normalizeEnvBool(raw, true);
}

function getEnvSocialProviderRuntimeConfig(provider: string, req?: any): EnvSocialProviderRuntimeConfig | null {
  const normalizedProvider = String(provider || "").trim().toLowerCase();
  const defaults = SOCIAL_PROVIDER_ENV_DEFAULTS[normalizedProvider];
  if (!defaults) return null;

  const prefix = normalizedProvider.toUpperCase();
  const enabled = isSocialProviderEnabled(prefix);
  if (!enabled) return null;

  const genericClientId = readProviderEnvValue(prefix, ["CLIENT_ID", "OAUTH_CLIENT_ID", "WEB_CLIENT_ID"]);
  const clientSecret = readProviderEnvValue(prefix, ["CLIENT_SECRET", "OAUTH_CLIENT_SECRET", "WEB_CLIENT_SECRET", "SECRET"]);

  const googleWebClientId = normalizedProvider === "google" ? readGoogleWebClientId() : "";
  const googleAnyClientId = normalizedProvider === "google" ? readGoogleAnyClientId() : "";

  const clientId = normalizedProvider === "google"
    ? (googleWebClientId || googleAnyClientId)
    : genericClientId;

  const webEnabled = normalizedProvider === "google"
    ? Boolean(googleWebClientId && clientSecret)
    : Boolean(clientId && clientSecret);

  const nativeEnabled = normalizedProvider === "google" && Boolean(googleAnyClientId);

  if (!webEnabled && !nativeEnabled) return null;

  const fallbackRedirectUri = req ? `${req.protocol}://${req.get("host")}/api/auth/oauth/${normalizedProvider}/callback` : "";
  const redirectUri = String(
    readProviderEnvValue(prefix, ["REDIRECT_URI", "OAUTH_REDIRECT_URI", "WEB_REDIRECT_URI"]) ||
    fallbackRedirectUri
  ).trim();
  const scopes = String(readProviderEnvValue(prefix, ["SCOPES"]) || defaults.scopes).trim();

  return {
    provider: normalizedProvider,
    displayName: String(readProviderEnvValue(prefix, ["DISPLAY_NAME"]) || defaults.displayName).trim() || defaults.displayName,
    displayNameAr: String(readProviderEnvValue(prefix, ["DISPLAY_NAME_AR"]) || defaults.displayNameAr).trim() || defaults.displayNameAr,
    iconName: String(readProviderEnvValue(prefix, ["ICON_NAME"]) || defaults.iconName).trim() || defaults.iconName,
    sortOrder: normalizeEnvInt(process.env[`${prefix}_SORT_ORDER`], defaults.sortOrder, 0, 1000),
    clientId,
    clientSecret,
    redirectUri,
    scopes,
    webEnabled,
    nativeEnabled,
  };
}

function getEnvSocialProviderConfig(provider: string, req?: any): EnvSocialProviderConfig | null {
  const runtime = getEnvSocialProviderRuntimeConfig(provider, req);
  if (!runtime || !runtime.webEnabled) return null;

  return {
    provider: runtime.provider,
    displayName: runtime.displayName,
    displayNameAr: runtime.displayNameAr,
    iconName: runtime.iconName,
    sortOrder: runtime.sortOrder,
    clientId: runtime.clientId,
    clientSecret: runtime.clientSecret,
    redirectUri: runtime.redirectUri,
    scopes: runtime.scopes,
  };
}

async function getPublicOtpProvidersFromEnv() {
  const emailEnabled = normalizeEnvBool(process.env["OTP_EMAIL_ENABLED"], true);
  const smsEnabled = normalizeEnvBool(process.env["OTP_SMS_ENABLED"], false) && smsOTPService.isEnabled();
  const whatsappEnabled = normalizeEnvBool(process.env["OTP_WHATSAPP_ENABLED"], false) && (await whatsappOTPService.isEnabled());

  const codeLength = normalizeEnvInt(process.env["OTP_CODE_LENGTH"], 6, 4, 8);
  const expiryMinutes = normalizeEnvInt(process.env["OTP_EXPIRY_MINUTES"], OTP_EXPIRY_MINUTES, 1, 60);
  const maxAttempts = normalizeEnvInt(process.env["OTP_MAX_ATTEMPTS"], MAX_ATTEMPTS, 1, 10);
  const cooldownMinutes = normalizeEnvInt(process.env["OTP_COOLDOWN_MINUTES"], Math.max(1, Math.ceil(OTP_COOLDOWN_SECONDS / 60)), 1, 30);

  return OTP_PUBLIC_PROVIDERS
    .filter((provider) => {
      if (provider.provider === "email") return emailEnabled;
      if (provider.provider === "sms") return smsEnabled;
      if (provider.provider === "whatsapp") return whatsappEnabled;
      return false;
    })
    .map((provider) => ({
      ...provider,
      codeLength,
      expiryMinutes,
      maxAttempts,
      cooldownMinutes,
    }));
}

async function requireOtpFeatureEnabled(res: any): Promise<boolean> {
  const toggles = await getAuthFeatureToggles();
  if (toggles.otpEnabled) return true;

  res.status(503).json(errorResponse(ErrorCode.BAD_REQUEST, "OTP authentication is currently disabled by admin"));
  return false;
}

function resolveOAuthClientSeed(req: any): string {
  const fromCookie = String(req.cookies?.[OAUTH_CLIENT_SEED_COOKIE_NAME] || "").trim().toLowerCase();
  if (/^[a-f0-9]{24,64}$/.test(fromCookie)) {
    return fromCookie;
  }
  return "";
}

function resolveRequestIp(req: any): string {
  return String(req.headers?.["x-forwarded-for"] || "")
    .split(",")[0]
    .trim() || String(req.ip || "").trim();
}

function resolveIpSegment(ipAddress: string): string {
  const ip = String(ipAddress || "").trim().toLowerCase();
  if (!ip) return "";

  const ipv4Match = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    return `${ipv4Match[1]}.${ipv4Match[2]}.${ipv4Match[3]}.0/24`;
  }

  if (ip.includes(":")) {
    const normalized = ip.split("%")[0];
    const segments = normalized.split(":").filter(Boolean).slice(0, 4);
    if (segments.length > 0) {
      return `${segments.join(":")}::/64`;
    }
  }

  return "";
}

function hashUserAgent(req: any): string {
  const userAgent = String(req.get?.("user-agent") || req.headers?.["user-agent"] || "").trim();
  return crypto.createHash("sha256").update(userAgent).digest("hex").slice(0, 32);
}

function buildOAuthClientFingerprint(req: any, clientSeed?: string): string {
  const seed = String(clientSeed || resolveOAuthClientSeed(req) || "").trim();
  const uaHash = hashUserAgent(req);
  const ipSegment = OAUTH_FINGERPRINT_INCLUDE_IP_SEGMENT ? resolveIpSegment(resolveRequestIp(req)) : "";
  const source = [seed || "seed-missing", uaHash, ipSegment || "ip-segment-missing"].join("|");
  return crypto.createHash("sha256").update(source).digest("hex");
}

function buildOAuthStartLockKey(provider: string, fingerprint: string): string {
  return `${String(provider || "").trim().toLowerCase()}|${String(fingerprint || "").trim()}`;
}

type OAuthMode = "login" | "link";

type OAuthStatePayload = {
  type: "oauth_state";
  provider: string;
  mode: OAuthMode;
  returnTo: string;
  nonce: string;
};

type OAuthLifecycleState = {
  provider: string;
  mode: OAuthMode;
  returnTo: string;
  nonce: string;
  linkParentId?: string | null;
  clientSeed: string;
  fingerprint: string;
  redirectUri: string;
  startLockKey: string;
  pkceVerifier: string;
  createdAt: number;
};

type OAuthCallbackResult = {
  redirectUrl: string;
  fingerprint: string;
  clientSeed: string;
  completedAt: number;
  startLockKey?: string;
};

type OAuthProfile = {
  email: string;
  name: string;
  picture?: string | null;
  provider: string;
  providerId: string;
  accessToken?: string | null;
  refreshToken?: string | null;
  tokenExpiresAt?: Date | null;
};

function createOAuthStateToken(input: {
  provider: string;
  mode: OAuthMode;
  returnTo: string;
}): { token: string; nonce: string } {
  const nonce = crypto.randomBytes(16).toString("hex");
  const payload: OAuthStatePayload = {
    type: "oauth_state",
    provider: String(input.provider || "").trim().toLowerCase(),
    mode: input.mode,
    returnTo: input.returnTo,
    nonce,
  };

  return {
    token: jwt.sign(payload, JWT_SECRET, { expiresIn: OAUTH_STATE_EXPIRY_SECONDS }),
    nonce,
  };
}

function resolveOAuthState(stateToken: string, expectedProvider: string): {
  nonce: string;
  mode: OAuthMode;
  returnTo: string;
} | null {
  const fallbackSecret = String(process.env["JWT_SECRET_PREVIOUS"] || "").trim();
  const secrets = fallbackSecret ? [JWT_SECRET, fallbackSecret] : [JWT_SECRET];

  for (const secret of secrets) {
    try {
      const decoded = jwt.verify(stateToken, secret, { clockTolerance: 120 }) as Partial<OAuthStatePayload>;
      if (decoded?.type !== "oauth_state") continue;

      const provider = String(decoded.provider || "").trim().toLowerCase();
      if (provider !== String(expectedProvider || "").trim().toLowerCase()) continue;

      const mode: OAuthMode = String(decoded.mode || "").trim().toLowerCase() === "link" ? "link" : "login";
      const returnTo = normalizeInternalReturnToPath(decoded.returnTo, "/parent-dashboard");
      const nonce = String(decoded.nonce || "").trim();
      if (!nonce || !/^[a-f0-9]{32,}$/i.test(nonce)) continue;

      return { nonce, mode, returnTo };
    } catch {
      // Try next accepted secret to support controlled key rotation.
    }
  }

  return null;
}

function toBase64Url(input: Buffer): string {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function createPkcePair(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = toBase64Url(crypto.randomBytes(48));
  const codeChallenge = toBase64Url(crypto.createHash("sha256").update(codeVerifier).digest());
  return { codeVerifier, codeChallenge };
}

function clearOAuthCookies(res: any, oauthCookieDomain?: string): void {
  res.clearCookie("oauth_state", {
    path: "/",
    ...(oauthCookieDomain ? { domain: oauthCookieDomain } : {}),
  });
  res.clearCookie("oauth_mode", {
    path: "/",
    ...(oauthCookieDomain ? { domain: oauthCookieDomain } : {}),
  });
  res.clearCookie("oauth_return_to", {
    path: "/",
    ...(oauthCookieDomain ? { domain: oauthCookieDomain } : {}),
  });
  res.clearCookie(OAUTH_PKCE_COOKIE_NAME, {
    path: "/",
    ...(oauthCookieDomain ? { domain: oauthCookieDomain } : {}),
  });
  res.clearCookie(OAUTH_CLIENT_SEED_COOKIE_NAME, {
    path: "/",
    ...(oauthCookieDomain ? { domain: oauthCookieDomain } : {}),
  });
}

function resolveStrictOAuthRedirectUri(config: EnvSocialProviderConfig, provider: string, req: any): string {
  const normalizedProvider = String(provider || "").trim().toLowerCase();
  const fallbackRedirectUri = `${req.protocol}://${req.get("host")}/api/auth/oauth/${normalizedProvider}/callback`;
  const redirectUri = String(config.redirectUri || fallbackRedirectUri).trim();
  const expectedPath = `/api/auth/oauth/${normalizedProvider}/callback`;

  let parsed: URL;
  try {
    parsed = new URL(redirectUri);
  } catch {
    throw new Error("OAUTH_REDIRECT_URI_INVALID");
  }

  if (parsed.pathname !== expectedPath) {
    throw new Error("OAUTH_REDIRECT_URI_INVALID_PATH");
  }

  const allowedHosts = new Set<string>();
  const requestHost = String(req.get?.("host") || "")
    .split(":")[0]
    .trim()
    .toLowerCase();
  if (requestHost) {
    allowedHosts.add(requestHost);
  }

  const appUrl = String(process.env["APP_URL"] || "").trim();
  if (appUrl) {
    try {
      allowedHosts.add(new URL(appUrl).hostname.toLowerCase());
    } catch {
      // Ignore invalid APP_URL to avoid failing runtime startup.
    }
  }

  const extraHostsRaw = String(process.env[`${normalizedProvider.toUpperCase()}_ALLOWED_REDIRECT_HOSTS`] || "");
  for (const host of extraHostsRaw.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean)) {
    allowedHosts.add(host);
  }

  if (allowedHosts.size > 0 && !allowedHosts.has(parsed.hostname.toLowerCase())) {
    throw new Error("OAUTH_REDIRECT_URI_UNTRUSTED_HOST");
  }

  if (process.env["NODE_ENV"] === "production" && parsed.protocol !== "https:") {
    throw new Error("OAUTH_REDIRECT_URI_INSECURE");
  }

  return parsed.toString();
}

type OAuthUserInfo = {
  id: string | null;
  email: string | null;
  name: string | null;
  picture: string | null;
  verifiedEmail?: boolean;
};

type OAuthProviderExchangeInput = {
  code: string;
  config: EnvSocialProviderConfig;
  redirectUri: string;
  scopes: string;
  pkceVerifier: string;
};

type OAuthProviderExchangeOutput = {
  tokenData: any;
  userInfo: OAuthUserInfo;
};

interface OAuthProvider {
  name: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  requiresPkce: boolean;
  buildAuthorizationUrl(input: {
    config: EnvSocialProviderConfig;
    redirectUri: string;
    scopes: string;
    state: string;
    codeChallenge: string;
  }): string;
  exchangeCode(input: OAuthProviderExchangeInput): Promise<OAuthProviderExchangeOutput>;
}

const OAUTH_PROVIDERS: Record<string, OAuthProvider> = {
  google: {
    name: "google",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: ["openid", "email", "profile"],
    requiresPkce: true,
    buildAuthorizationUrl({ config, redirectUri, scopes, state, codeChallenge }) {
      return `${this.authUrl}?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${state}&access_type=offline&prompt=consent&code_challenge=${encodeURIComponent(codeChallenge)}&code_challenge_method=S256`;
    },
    async exchangeCode({ code, config, redirectUri, pkceVerifier }) {
      const tokenBody = new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      });
      tokenBody.set("code_verifier", pkceVerifier);

      const tokenRes = await fetch(this.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: tokenBody,
      });
      const tokenText = await tokenRes.text();
      let tokenData: any = null;
      try {
        tokenData = JSON.parse(tokenText);
      } catch {
        const preview = tokenText.slice(0, 200);
        throw new Error(`Google token exchange failed: non-JSON response (first200=${preview})`);
      }

      if (!tokenRes.ok) {
        const detail = String(tokenData?.error_description || tokenData?.error || "unknown");
        const preview = tokenText.slice(0, 200);
        throw new Error(`Google token exchange failed: ${detail} (first200=${preview})`);
      }

      const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const rawUser = await userRes.json();

      return {
        tokenData,
        userInfo: {
          id: rawUser?.id ? String(rawUser.id) : null,
          email: rawUser?.email || null,
          name: rawUser?.name || null,
          picture: rawUser?.picture || null,
          verifiedEmail: rawUser?.verified_email,
        },
      };
    },
  },
  facebook: {
    name: "facebook",
    authUrl: "https://www.facebook.com/v18.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v18.0/oauth/access_token",
    scopes: ["email", "public_profile"],
    requiresPkce: false,
    buildAuthorizationUrl({ config, redirectUri, scopes, state }) {
      return `${this.authUrl}?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${state}`;
    },
    async exchangeCode({ code, config, redirectUri }) {
      const tokenRes = await fetch(`${this.tokenUrl}?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${config.clientSecret}&code=${code}`);
      const tokenData = await tokenRes.json();
      const userRes = await fetch(`https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${tokenData.access_token}`);
      const rawUser = await userRes.json();

      return {
        tokenData,
        userInfo: {
          id: rawUser?.id ? String(rawUser.id) : null,
          email: rawUser?.email || null,
          name: rawUser?.name || null,
          picture: rawUser?.picture?.data?.url || null,
        },
      };
    },
  },
  apple: {
    name: "apple",
    authUrl: "https://appleid.apple.com/auth/authorize",
    tokenUrl: "https://appleid.apple.com/auth/token",
    scopes: ["name", "email"],
    requiresPkce: false,
    buildAuthorizationUrl({ config, redirectUri, scopes, state }) {
      return `${this.authUrl}?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${state}&response_mode=query`;
    },
    async exchangeCode({ code, config, redirectUri }) {
      const tokenRes = await fetch(this.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          client_id: config.clientId,
          client_secret: config.clientSecret,
        }),
      });

      const tokenData = await tokenRes.json();
      const decoded = tokenData?.id_token ? jwt.decode(tokenData.id_token) as any : null;

      return {
        tokenData,
        userInfo: {
          id: decoded?.sub ? String(decoded.sub) : null,
          email: decoded?.email || null,
          name: decoded?.name || decoded?.email || null,
          picture: null,
          verifiedEmail: decoded?.email_verified,
        },
      };
    },
  },
  twitter: {
    name: "twitter",
    authUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    scopes: ["tweet.read", "users.read"],
    requiresPkce: true,
    buildAuthorizationUrl({ config, redirectUri, scopes, state, codeChallenge }) {
      return `${this.authUrl}?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes || "tweet.read users.read")}&state=${state}&code_challenge=${encodeURIComponent(codeChallenge)}&code_challenge_method=S256`;
    },
    async exchangeCode({ code, config, redirectUri, pkceVerifier }) {
      const twitterTokenBody = new URLSearchParams({
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code_verifier: pkceVerifier,
      });

      const tokenRes = await fetch(this.tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
        },
        body: twitterTokenBody,
      });
      const tokenData = await tokenRes.json();
      const userRes = await fetch("https://api.twitter.com/2/users/me?user.fields=profile_image_url", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const rawUser = await userRes.json();

      return {
        tokenData,
        userInfo: {
          id: rawUser?.data?.id ? String(rawUser.data.id) : null,
          email: null,
          name: rawUser?.data?.name || null,
          picture: rawUser?.data?.profile_image_url || null,
        },
      };
    },
  },
  github: {
    name: "github",
    authUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    scopes: ["user:email"],
    requiresPkce: false,
    buildAuthorizationUrl({ config, redirectUri, scopes, state }) {
      return `${this.authUrl}?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes || "user:email")}&state=${state}`;
    },
    async exchangeCode({ code, config, redirectUri }) {
      const tokenRes = await fetch(this.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code,
          redirect_uri: redirectUri,
        }),
      });

      const tokenData = await tokenRes.json();
      const userRes = await fetch("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${tokenData.access_token}`, "User-Agent": "Classify-App" },
      });
      const rawUser = await userRes.json();

      if (!rawUser.email) {
        const emailRes = await fetch("https://api.github.com/user/emails", {
          headers: { Authorization: `Bearer ${tokenData.access_token}`, "User-Agent": "Classify-App" },
        });
        const emails = await emailRes.json();
        const primary = Array.isArray(emails) ? emails.find((entry: any) => entry.primary) || emails[0] : null;
        rawUser.email = primary?.email || null;
      }

      return {
        tokenData,
        userInfo: {
          id: rawUser?.id ? String(rawUser.id) : null,
          email: rawUser?.email || null,
          name: rawUser?.name || rawUser?.login || null,
          picture: rawUser?.avatar_url || null,
        },
      };
    },
  },
  microsoft: {
    name: "microsoft",
    authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scopes: ["openid", "email", "profile"],
    requiresPkce: false,
    buildAuthorizationUrl({ config, redirectUri, scopes, state }) {
      return `${this.authUrl}?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes || "openid email profile")}&state=${state}`;
    },
    async exchangeCode({ code, config, redirectUri, scopes }) {
      const tokenRes = await fetch(this.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
          scope: scopes || "openid email profile",
        }),
      });

      const tokenData = await tokenRes.json();
      const userRes = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const rawUser = await userRes.json();

      return {
        tokenData,
        userInfo: {
          id: rawUser?.id ? String(rawUser.id) : null,
          email: rawUser?.mail || rawUser?.userPrincipalName || null,
          name: rawUser?.displayName || null,
          picture: null,
        },
      };
    },
  },
  linkedin: {
    name: "linkedin",
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    scopes: ["r_emailaddress", "r_liteprofile"],
    requiresPkce: false,
    buildAuthorizationUrl({ config, redirectUri, scopes, state }) {
      return `${this.authUrl}?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes || "r_emailaddress r_liteprofile")}&state=${state}`;
    },
    async exchangeCode({ code, config, redirectUri }) {
      const tokenRes = await fetch(this.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          client_id: config.clientId,
          client_secret: config.clientSecret,
        }),
      });

      const tokenData = await tokenRes.json();
      const userRes = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const rawUser = await userRes.json();

      return {
        tokenData,
        userInfo: {
          id: rawUser?.sub || rawUser?.id ? String(rawUser?.sub || rawUser?.id) : null,
          email: rawUser?.email || null,
          name: rawUser?.name || null,
          picture: rawUser?.picture || null,
        },
      };
    },
  },
  discord: {
    name: "discord",
    authUrl: "https://discord.com/api/oauth2/authorize",
    tokenUrl: "https://discord.com/api/oauth2/token",
    scopes: ["identify", "email"],
    requiresPkce: false,
    buildAuthorizationUrl({ config, redirectUri, scopes, state }) {
      return `${this.authUrl}?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes || "identify email")}&state=${state}`;
    },
    async exchangeCode({ code, config, redirectUri }) {
      const tokenRes = await fetch(this.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }),
      });

      const tokenData = await tokenRes.json();
      const userRes = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const rawUser = await userRes.json();
      const avatarUrl = rawUser?.avatar ? `https://cdn.discordapp.com/avatars/${rawUser.id}/${rawUser.avatar}.png` : null;

      return {
        tokenData,
        userInfo: {
          id: rawUser?.id ? String(rawUser.id) : null,
          email: rawUser?.email || null,
          name: rawUser?.global_name || rawUser?.username || null,
          picture: avatarUrl,
        },
      };
    },
  },
};

function getOAuthProvider(provider: string): OAuthProvider | null {
  const normalizedProvider = String(provider || "").trim().toLowerCase();
  return OAUTH_PROVIDERS[normalizedProvider] || null;
}

async function upsertParentSocialIdentity(parentId: string, profile: OAuthProfile): Promise<void> {
  const provider = String(profile.provider || "").trim().toLowerCase();
  const providerId = String(profile.providerId || "").trim();
  if (!provider || !providerId) return;

  const identityData = {
    providerId,
    email: normalizeEmail(profile.email) || null,
    name: String(profile.name || "").trim() || null,
    avatarUrl: profile.picture || null,
    accessToken: profile.accessToken || null,
    refreshToken: profile.refreshToken || null,
    tokenExpiresAt: profile.tokenExpiresAt || null,
    updatedAt: new Date(),
  };

  const existingIdentity = await db
    .select({ id: parentSocialIdentities.id })
    .from(parentSocialIdentities)
    .where(and(
      eq(parentSocialIdentities.parentId, parentId),
      eq(parentSocialIdentities.provider, provider),
    ))
    .limit(1);

  if (existingIdentity[0]) {
    await db
      .update(parentSocialIdentities)
      .set(identityData)
      .where(eq(parentSocialIdentities.id, existingIdentity[0].id));
    return;
  }

  await db
    .insert(parentSocialIdentities)
    .values({
      parentId,
      provider,
      ...identityData,
    });
}

async function linkOAuthProfileToParent(parentId: string, profile: OAuthProfile): Promise<{
  parentId: string;
  isNew: boolean;
  parentName: string;
}> {
  const existingParent = await db
    .select({
      id: parents.id,
      email: parents.email,
      name: parents.name,
      avatarUrl: parents.avatarUrl,
      lockedUntil: parents.lockedUntil,
    })
    .from(parents)
    .where(eq(parents.id, parentId))
    .limit(1);

  const parent = existingParent[0];
  if (!parent) {
    throw new Error("PARENT_NOT_FOUND");
  }

  if (parent.lockedUntil && new Date(parent.lockedUntil).getTime() > Date.now()) {
    throw new Error("ACCOUNT_TEMPORARILY_LOCKED");
  }

  const updates: Partial<typeof parents.$inferInsert> = {};
  if (profile.picture && !parent.avatarUrl) {
    updates.avatarUrl = profile.picture;
  }

  const normalizedProfileName = String(profile.name || "").trim();
  if (normalizedProfileName && shouldReplaceParentName(parent.name, parent.email)) {
    updates.name = normalizedProfileName;
  }

  const normalizedOAuthEmail = normalizeEmail(profile.email);
  if (
    normalizedOAuthEmail
    && (isGeneratedPhoneEmail(parent.email) || isTemporaryTrialEmail(parent.email))
    && normalizedOAuthEmail !== String(parent.email || "").trim().toLowerCase()
  ) {
    const emailOwner = await db
      .select({ id: parents.id })
      .from(parents)
      .where(eq(parents.email, normalizedOAuthEmail))
      .limit(1);

    if (!emailOwner[0] || emailOwner[0].id === parent.id) {
      updates.email = normalizedOAuthEmail;
    }
  }

  if (Object.keys(updates).length > 0) {
    await db
      .update(parents)
      .set(updates)
      .where(eq(parents.id, parent.id));
  }

  await upsertParentSocialIdentity(parent.id, profile);

  return {
    parentId: parent.id,
    isNew: false,
    parentName: String(updates.name || parent.name || "Parent"),
  };
}

async function upsertParentFromOAuthProfile(profile: OAuthProfile): Promise<{
  parentId: string;
  isNew: boolean;
  parentName: string;
}> {
  const normalizedEmail = String(profile.email || "").trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error("OAUTH_PROFILE_EMAIL_REQUIRED");
  }

  const existingParent = await db
    .select()
    .from(parents)
    .where(eq(parents.email, normalizedEmail));

  if (existingParent[0]) {
    const parent = existingParent[0];
    if (parent.lockedUntil && new Date(parent.lockedUntil).getTime() > Date.now()) {
      throw new Error("ACCOUNT_TEMPORARILY_LOCKED");
    }

    const updates: Partial<typeof parents.$inferInsert> = {};
    if (profile.picture && !parent.avatarUrl) {
      updates.avatarUrl = profile.picture;
    }

    const normalizedProfileName = String(profile.name || "").trim();
    if (normalizedProfileName && shouldReplaceParentName(parent.name, parent.email)) {
      updates.name = normalizedProfileName;
    }

    if (Object.keys(updates).length > 0) {
      await db
        .update(parents)
        .set(updates)
        .where(eq(parents.id, parent.id));
    }

    await upsertParentSocialIdentity(parent.id, profile);

    return {
      parentId: parent.id,
      isNew: false,
      parentName: String(updates.name || parent.name || "Parent"),
    };
  }

  const uniqueCode = crypto.randomBytes(3).toString("hex").toUpperCase().slice(0, 6);
  const randomPassword = crypto.randomBytes(32).toString("hex");
  const hashedPassword = await bcrypt.hash(randomPassword, 10);

  const result = await db
    .insert(parents)
    .values({
      email: normalizedEmail,
      password: hashedPassword,
      name: String(profile.name || normalizedEmail.split("@")[0] || "Parent"),
      uniqueCode,
      avatarUrl: profile.picture || null,
    })
    .returning({
      id: parents.id,
      name: parents.name,
    });

  await upsertParentSocialIdentity(result[0].id, profile);

  return {
    parentId: result[0].id,
    isNew: true,
    parentName: result[0].name,
  };
}

async function verifyGoogleNativeIdToken(idToken: string, audiences: string[]): Promise<OAuthProfile | null> {
  const normalizedToken = String(idToken || "").trim();
  if (!normalizedToken) return null;

  const decoded = jwt.decode(normalizedToken) as any;
  const tokenAudience = Array.isArray(decoded?.aud) ? decoded?.aud[0] : decoded?.aud;
  const audienceForVerify = tokenAudience ? String(tokenAudience).trim() : "";


  let ticket;
  try {
    ticket = await googleIdTokenClient.verifyIdToken({
      idToken: normalizedToken,
      audience: audienceForVerify || undefined,
    });
  } catch (error: any) {
    console.error("Native Google verifyIdToken debug:", {
      tokenAudClaim: decoded?.aud,
      audienceForVerify,
      allowedAudiences: audiences,
    });
    console.error("Native Google verifyIdToken error:", error);
    throw error;
  }


  const payload = ticket.getPayload();

  return {
    email: payload.email,
    name: String(payload.name || payload.email.split("@")[0] || "Parent"),
    picture: payload.picture || null,
    provider: "google",
    providerId: String(payload.sub || payload.email),
  };
}

export async function registerAuthRoutes(app: Express) {
  // Auth Oracle (Phase 2): single source of truth for UI convergence
  // Middleware resolution order MUST be:
  // 1) Authorization: Bearer token (if exists)
  // 2) auth_token cookie (if enabled)
  // 3) otherwise 401
  app.get("/api/auth/me", async (req: any, res: any) => {
    const headerAuth = req.headers?.authorization;
    const headerToken =
      typeof headerAuth === "string" && headerAuth.toLowerCase().startsWith("bearer ")
        ? String(headerAuth.slice(7)).trim()
        : "";

    const cookieToken = AUTH_REDEEM_COOKIE_WRITE_ENABLED
      ? String(req.cookies?.[AUTH_TOKEN_COOKIE_NAME] || "").trim()
      : "";

    const token = headerToken || cookieToken;

    if (!token) {
      return res.status(401).json({ authenticated: false, channel: "none" });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const tokenType = String(decoded?.type || "").trim().toLowerCase();

      const issuedAt = typeof decoded?.iat === "number"
        ? new Date(decoded.iat * 1000).toISOString()
        : null;

      let expiresInSeconds = 0;
      if (typeof decoded?.exp === "number") {
        expiresInSeconds = Math.max(0, decoded.exp - Math.floor(Date.now() / 1000));
      }

      if (tokenType === "parent") {
        const parentId = String(decoded?.parentId || decoded?.userId || "").trim();
        if (!parentId) return res.status(401).json({ authenticated: false, channel: "none" });

        return res.json({
          authenticated: true,
          channel: "parent",
          parentId,
          childId: null,
          tokenType: headerToken ? "bearer" : "cookie",
          issuedAt,
          expiresInSeconds,
        });
      }

      if (tokenType === "child") {
        const childId = String(decoded?.childId || "").trim();
        if (!childId) return res.status(401).json({ authenticated: false, channel: "none" });

        return res.json({
          authenticated: true,
          channel: "child",
          parentId: null,
          childId,
          tokenType: headerToken ? "bearer" : "cookie",
          issuedAt,
          expiresInSeconds,
        });
      }

      if (tokenType === "admin") {
        return res.json({
          authenticated: true,
          channel: "admin",
          parentId: null,
          childId: null,
          tokenType: headerToken ? "bearer" : "cookie",
          issuedAt,
          expiresInSeconds,
        });
      }

      return res.status(401).json({ authenticated: false, channel: "none" });
    } catch {
      return res.status(401).json({ authenticated: false, channel: "none" });
    }
  });

  // Hard-stop logout for oracle hard-truth:
  // Clears the httpOnly auth_token cookie so GET /api/auth/me can’t return authenticated=true afterwards.
  app.post("/api/auth/logout", async (req: any, res: any) => {
    try {
      res.clearCookie(AUTH_TOKEN_COOKIE_NAME, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });

      return res.json(successResponse({ loggedOut: true }, "Logout successful"));
    } catch {
      return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Logout failed"));
    }
  });

  app.post("/api/auth/check-email", async (req, res) => {
    try {
      const normalizedEmail = normalizeEmail(req.body?.email);
      if (!normalizedEmail) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Email is required"));
      }

      const existing = await db
        .select({ id: parents.id })
        .from(parents)
        .where(eq(parents.email, normalizedEmail))
        .limit(1);

      return res.json(successResponse({ exists: Boolean(existing[0]) }));
    } catch (error: any) {
      console.error("Check email error:", error);
      return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to check email"));
    }
  });

  app.post("/api/auth/check-parent-account", async (req, res) => {
    try {
      const normalizedEmail = normalizeEmail(req.body?.email);
      const normalizedPhone = normalizePhoneNumber(req.body?.phoneNumber);

      if (!normalizedEmail && !normalizedPhone) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Email or phone number is required"));
      }

      if (normalizedEmail) {
        const existing = await db
          .select({ id: parents.id })
          .from(parents)
          .where(eq(parents.email, normalizedEmail))
          .limit(1);

        return res.json(successResponse({ exists: Boolean(existing[0]), by: "email" }));
      }

      const existing = await db
        .select({ id: parents.id })
        .from(parents)
        .where(eq(parents.phoneNumber, normalizedPhone))
        .limit(1);

      return res.json(successResponse({ exists: Boolean(existing[0]), by: "phone" }));
    } catch (error: any) {
      console.error("Check parent account error:", error);
      return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to check account"));
    }
  });

  // Public: start child trial directly from age-gate without opening parent auth form.
  app.post("/api/auth/start-child-trial", async (req, res) => {
    try {
      const { age, birthDate, name } = req.body || {};
      const resolvedAge = resolveAgeFromInputs(age, birthDate);
      const parentThresholdAge = await getParentThresholdAge();

      if (resolvedAge === null) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Age or birth date is required"));
      }

      if (resolvedAge >= parentThresholdAge) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Age is above parent threshold"));
      }

      const childName = typeof name === "string" && name.trim()
        ? name.trim().slice(0, 80)
        : "طفل تجريبي";

      const childTrial = await createChildTrialPayload(childName, resolvedAge, birthDate);

      return res.json(successResponse({
        requiresChildFlow: true,
        redirectTo: "/child-games",
        classification: "CHILD_TRIAL",
        resolvedAge,
        parentThresholdAge,
        childTrial,
      }, "Child trial account created successfully."));
    } catch (error: any) {
      console.error("Start child trial error:", error);
      return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to start child trial"));
    }
  });

  // Public: start parent trial directly from age-gate without forcing auth form.
  app.post("/api/auth/start-parent-trial", async (req, res) => {
    try {
      const { age, birthDate } = req.body || {};
      const resolvedAge = resolveAgeFromInputs(age, birthDate);
      const parentThresholdAge = await getParentThresholdAge();

      if (resolvedAge === null) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Age or birth date is required"));
      }

      if (resolvedAge < parentThresholdAge) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Age is below parent threshold"));
      }

      const uniqueCode = await generateUniqueParentCode();

      const trialEmail = `parent_trial_${crypto.randomBytes(8).toString("hex")}@trial.classi-fy.local`;
      const trialPasswordHash = await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 10);

      const created = await db
        .insert(parents)
        .values({
          email: trialEmail,
          password: trialPasswordHash,
          name: "ولي أمر تجريبي",
          gender: null,

          // Make DB-default-sensitive NOT NULL columns explicit to avoid migration/default drift.
          phoneNumber: null,
          smsEnabled: false,
          smsVerified: false,

          uniqueCode,

          qrCode: null,
          taskBgColor: "#ffffff",
          twoFAEnabled: false,

          privacyAccepted: false,
          privacyAcceptedAt: null,
          privacyAcceptedIp: null,

          pin: null,
          failedLoginAttempts: 0,
          lockedUntil: null,

          governorate: null,
          city: null,
          avatarUrl: null,
          coverImageUrl: null,
          bio: null,
          socialLinks: null,
        })
        .returning({ id: parents.id, uniqueCode: parents.uniqueCode });

      const token = signParentAccessToken(created[0].id);

      return res.json(successResponse({
        token,
        userId: created[0].id,
        uniqueCode: created[0].uniqueCode,
        hasPin: false,
        classification: "PARENT_TRIAL",
        resolvedAge,
        parentThresholdAge,
        redirectTo: "/parent-dashboard",
      }, "Parent trial account created successfully."));
    } catch (error: any) {
      console.error("Start parent trial error:", error);

      const detail =
        error instanceof Error
          ? `${error.name || "Error"}: ${error.message || ""}`.trim()
          : (() => {
            try {
              return JSON.stringify(error);
            } catch {
              return String(error ?? "");
            }
          })();

      const errCode = (error as any)?.code ? String((error as any).code) : undefined;
      const constraint = (error as any)?.constraint ? String((error as any).constraint) : undefined;
      const constraintName = (error as any)?.constraint_name ? String((error as any).constraint_name) : undefined;

      const extra = [errCode && `code=${errCode}`, constraint && `constraint=${constraint}`, constraintName && `constraint_name=${constraintName}`]
        .filter(Boolean)
        .join(" ");

      return res.status(500).json(
        errorResponse(
          ErrorCode.INTERNAL_SERVER_ERROR,
          `Failed to start parent trial${detail ? `: ${detail}` : ""}${extra ? ` (${extra})` : ""}${error?.cause
            ? ` | causeCode=${String(error.cause.code || "")}` +
            ` | causeConstraint=${String(error.cause.constraint || "")}` +
            ` | causeDetail=${String(error.cause.detail || "")}` +
            ` | causeMessage=${String(error.cause.message || "")}` +
            ` | causeRaw=${String(error.cause)}`
            : ""}`
        )
      );
    }
  });

  // Parent Register (with rate limiting)
  app.post("/api/auth/register", registerLimiter, async (req, res) => {
    try {
      if (!(await requireOtpFeatureEnabled(res))) return;

      const { email, password, name, phoneNumber, gender, libraryReferralCode, referralCode, pin, governorate, termsAccepted, age, birthDate, otpMethod: requestedOtpMethod } = req.body;
      const normalizedEmail = normalizeEmail(email);
      const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
      const normalizedGender = normalizeParentGender(gender);
      const resolvedAge = resolveAgeFromInputs(age, birthDate);
      const parentThresholdAge = await getParentThresholdAge();

      if (!password || !name) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Password and name are required"));
      }
      if (!normalizedEmail && !normalizedPhoneNumber) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Email or phone number is required"));
      }
      if (resolvedAge === null) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Age or birth date is required"));
      }
      if (resolvedAge < parentThresholdAge) {
        const childTrial = await createChildTrialPayload(name, resolvedAge, birthDate);

        return res.json(successResponse({
          requiresChildFlow: true,
          redirectTo: "/child-games",
          classification: "CHILD_TRIAL",
          resolvedAge,
          parentThresholdAge,
          childTrial,
        }, "Child trial account created successfully."));
      }
      if (password.length < 8) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Password must be at least 8 characters"));
      }
      if (normalizedEmail && !isValidEmailFormat(normalizedEmail)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid email format"));
      }
      if (normalizedPhoneNumber && !/^\+?[0-9]{8,20}$/.test(normalizedPhoneNumber)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid phone number format"));
      }
      if (!normalizedGender) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Gender must be male or female"));
      }
      if (termsAccepted !== true) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "You must accept all policies before creating an account"));
      }

      let hashedPin: string | null = null;
      if (pin) {
        const pinStr = String(pin).trim();
        if (!/^\d{4}$/.test(pinStr)) {
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "PIN must be exactly 4 digits"));
        }
        hashedPin = await bcrypt.hash(pinStr, 10);
      }

      if (normalizedEmail) {
        const existingByEmail = await db
          .select({ id: parents.id })
          .from(parents)
          .where(eq(parents.email, normalizedEmail))
          .limit(1);
        if (existingByEmail[0]) {
          return res.status(409).json(errorResponse(ErrorCode.CONFLICT, "Email already registered"));
        }
      }

      if (normalizedPhoneNumber) {
        const existingByPhone = await db
          .select({ id: parents.id })
          .from(parents)
          .where(eq(parents.phoneNumber, normalizedPhoneNumber))
          .limit(1);
        if (existingByPhone[0]) {
          return res.status(409).json(errorResponse(ErrorCode.CONFLICT, "Phone number already registered"));
        }
      }

      const registrationEmail = normalizedEmail
        || `phone_${normalizedPhoneNumber.replace(/\D/g, "") || crypto.randomBytes(4).toString("hex")}_${crypto.randomBytes(3).toString("hex")}@phone.local`;

      const hashedPassword = await bcrypt.hash(password, 10);
      const uniqueCode = await generateUniqueParentCode();

      const result = await db
        .insert(parents)
        .values({
          email: registrationEmail,
          password: hashedPassword,
          name,
          gender: normalizedGender,
          phoneNumber: normalizedPhoneNumber || null,
          smsEnabled: !!normalizedPhoneNumber,
          uniqueCode,
          pin: hashedPin,
          governorate: governorate || null,
        })
        .returning();

      if (libraryReferralCode && typeof libraryReferralCode === "string") {
        try {
          const normalizedReferralCode = libraryReferralCode.trim().toUpperCase();
          if (normalizedReferralCode) {
            const library = await db
              .select({ id: libraries.id })
              .from(libraries)
              .where(and(eq(libraries.referralCode, normalizedReferralCode), eq(libraries.isActive, true)))
              .limit(1);

            if (library[0]) {
              const libraryId = library[0].id;

              const pendingByCode = await db
                .select({ id: libraryReferrals.id })
                .from(libraryReferrals)
                .where(
                  and(
                    eq(libraryReferrals.libraryId, libraryId),
                    eq(libraryReferrals.referralCode, normalizedReferralCode),
                    isNull(libraryReferrals.referredParentId)
                  )
                )
                .orderBy(desc(libraryReferrals.createdAt))
                .limit(1);

              if (pendingByCode[0]) {
                await db
                  .update(libraryReferrals)
                  .set({
                    referredParentId: result[0].id,
                    status: "registered",
                  })
                  .where(eq(libraryReferrals.id, pendingByCode[0].id));
              } else {
                await db.insert(libraryReferrals).values({
                  libraryId,
                  referredParentId: result[0].id,
                  referralCode: normalizedReferralCode,
                  status: "registered",
                });
              }
            }
          }
        } catch (referralErr) {
          console.error("Library referral register mapping failed:", referralErr);
        }
      }

      if (referralCode && typeof referralCode === "string") {
        try {
          const normalizedCode = referralCode.trim().toUpperCase();
          if (normalizedCode) {
            const referralProgramRows = await db.select().from(referralSettings).limit(1);
            const referralProgram = referralProgramRows[0];

            if (referralProgram?.isActive === false) {
              // Referral system is disabled by admin setting; ignore code without blocking registration.
            } else {
              const codeRecord = await db
                .select()
                .from(parentReferralCodes)
                .where(eq(parentReferralCodes.code, normalizedCode))
                .limit(1);

              if (codeRecord[0] && codeRecord[0].parentId !== result[0].id) {
                const existingReferral = await db
                  .select({ id: referrals.id })
                  .from(referrals)
                  .where(
                    and(
                      eq(referrals.referrerId, codeRecord[0].parentId),
                      eq(referrals.referredId, result[0].id)
                    )
                  )
                  .limit(1);

                if (!existingReferral[0]) {
                  await db.insert(referrals).values({
                    referrerId: codeRecord[0].parentId,
                    referredId: result[0].id,
                    referralCode: normalizedCode,
                    status: "pending",
                  });

                  await db
                    .update(parentReferralCodes)
                    .set({
                      totalReferrals: (codeRecord[0].totalReferrals || 0) + 1,
                    })
                    .where(eq(parentReferralCodes.id, codeRecord[0].id));

                  try {
                    const { createNotification } = await import("../notifications");
                    await createNotification({
                      parentId: codeRecord[0].parentId,
                      type: NOTIFICATION_TYPES.NEW_REFERRAL,
                      title: "إحالة جديدة!",
                      message: "لديك إحالة جديدة في انتظار التفعيل حسب إعدادات برنامج الإحالة.",
                      relatedId: result[0].id,
                    });
                  } catch (notifyErr) {
                    console.error("Referral notification failed:", notifyErr);
                  }
                }
              }
            }
          }
        } catch (refErr) {
          console.error("Parent referral code mapping failed:", refErr);
        }
      }

      const token = signParentAccessToken(result[0].id);

      try {
        const { createNotification } = await import("../notifications");
        await createNotification({
          parentId: result[0].id,
          type: NOTIFICATION_TYPES.INFO,
          title: "كود ربط الأطفال الخاص بك",
          message: `كود الربط الخاص بك هو: ${uniqueCode}. شاركه مع أطفالك للربط بحسابك. حافظ على سرية هذا الكود!`,
          style: NOTIFICATION_STYLES.BANNER,
          priority: NOTIFICATION_PRIORITIES.URGENT,
          metadata: { code: uniqueCode },
        });
      } catch (err) {
        console.error("Failed to send linking code notification:", err);
      }

      const normalizeRequestedOtpMethod = (value: unknown): "email" | "sms" | "whatsapp" | null => {
        if (value === "email" || value === "sms" || value === "whatsapp") return value;
        return null;
      };

      const requestedMethod = normalizeRequestedOtpMethod(requestedOtpMethod);
      const otpMethod: "email" | "sms" | "whatsapp" = requestedMethod || (normalizedEmail ? "email" : "sms");
      if (otpMethod === "email" && !normalizedEmail) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Email is required for email OTP"));
      }
      if ((otpMethod === "sms" || otpMethod === "whatsapp") && !normalizedPhoneNumber) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Phone number is required for phone OTP"));
      }

      const otpDestination = otpMethod === "email" ? normalizedEmail! : normalizedPhoneNumber!;
      if (!otpDestination) {
        return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to determine OTP destination"));
      }

      if (otpMethod === "sms" && !(await isSmsOtpServiceAvailable())) {
        return res.status(503).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "SMS service not available"));
      }
      if (otpMethod === "whatsapp" && !(await isWhatsappOtpServiceAvailable())) {
        return res.status(503).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "WhatsApp service not available"));
      }

      const ipAddress = req.ip || "0.0.0.0";
      const withinMethodLimit = otpMethod === "sms"
        ? await checkSMSRateLimit(result[0].id)
        : otpMethod === "whatsapp"
          ? await checkWhatsAppRateLimit(result[0].id)
          : true;
      const canSend = await isOtpRequestAllowed(otpDestination, ipAddress);
      if (!withinMethodLimit || !canSend) {
        trackOtpEvent("rate_limited", {
          reason: "request_limit",
          purpose: "register",
          method: otpMethod,
          destination: otpDestination,
          parentId: result[0].id,
          ip: ipAddress,
        });
        return respondRateLimited(res, "Too many OTP requests. Please try again later.");
      }

      const code = generateOTP();
      const codeHash = await hashOTP(code);
      let providerName = "email";
      if (otpMethod === "sms") {
        const smsResult = await smsOTPService.sendOTP(otpDestination, code, "register");
        if (!smsResult.success) {
          console.error("❌ Failed to send registration SMS OTP:", smsResult.error);
          return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to send OTP. Please try again later"));
        }
        providerName = "sms";
      } else if (otpMethod === "whatsapp") {
        const whatsappResult = await whatsappOTPService.sendOTP(otpDestination, code, "register");
        if (!whatsappResult.success) {
          console.error("❌ Failed to send registration WhatsApp OTP:", whatsappResult.error);
          return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to send OTP. Please try again later"));
        }
        providerName = "whatsapp";
      } else {
        const provider = await getProviderOrFallback("email");
        if (!provider) {
          return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "No OTP provider available"));
        }

        try {
          await provider.instance.send(otpDestination, code);
          providerName = provider.provider;
        } catch (err: any) {
          console.error("❌ Failed to send OTP:", err);
          return res.status(500).json(errorResponse(
            ErrorCode.INTERNAL_SERVER_ERROR,
            "Failed to send OTP. Please try again later"
          ));
        }
      }

      let record;
      try {
        record = await createOTPRecord(db, {
          parentId: result[0].id,
          purpose: "register",
          destination: otpDestination,
          provider: providerName,
          codeHash,
          expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
          ipAddress,
        });
        await logOtpRequest(otpDestination, ipAddress);
        trackOtpEvent("send", {
          purpose: "register",
          method: otpMethod,
          destination: otpDestination,
          parentId: result[0].id,
          ip: ipAddress,
          otpId: record?.id,
        });
      } catch (dbErr: any) {
        if (dbErr?.message === "OTP_COOLDOWN") {
          trackOtpEvent("rate_limited", {
            reason: "cooldown",
            purpose: "register",
            method: otpMethod,
            destination: otpDestination,
            parentId: result[0].id,
            ip: ipAddress,
          });
          return respondOtpCooldown(res, dbErr.retryAfter || OTP_COOLDOWN_SECONDS);
        }
        console.error("❌ Failed to persist registration OTP after send:", dbErr);
        return res.status(500).json(errorResponse(
          ErrorCode.INTERNAL_SERVER_ERROR,
          "Failed to store OTP. Please request a new code."
        ));
      }

      res.json(successResponse({
        token,
        userId: result[0].id,
        uniqueCode,
        hasPin: !!hashedPin,
        classification: "FULL",
        resolvedAge,
        parentThresholdAge,
        requiresOtp: true,
        email: normalizedEmail || undefined,
        phone: normalizedPhoneNumber || undefined,
        method: otpMethod,
        otpId: record?.id,
        otpPurpose: "register",
      }, "Registration successful"));
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Registration failed"));
    }
  });

  // Link a trial child account to the authenticated parent after successful signup/login.
  app.post("/api/auth/link-trial-child", authMiddleware, async (req: any, res) => {
    try {
      const parentId = String(req.user?.userId || req.user?.parentId || "").trim();
      if (!parentId || req.user?.type !== "parent") {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, "Parent token required"));
      }

      const token = String(req.body?.trialChildToken || "").trim();
      if (!token) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "trialChildToken is required"));
      }

      let decoded: any;
      try {
        decoded = jwt.verify(token, JWT_SECRET) as any;
      } catch {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid or expired trial child token"));
      }

      if (decoded?.purpose !== "trial_child_link" || !decoded?.childId) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid trial child token payload"));
      }

      const childId = String(decoded.childId);
      const childRow = await db
        .select({ id: children.id, name: children.name })
        .from(children)
        .where(eq(children.id, childId))
        .limit(1);

      if (!childRow[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Child not found"));
      }

      const existing = await db
        .select({ id: parentChild.id })
        .from(parentChild)
        .where(and(eq(parentChild.parentId, parentId), eq(parentChild.childId, childId)))
        .limit(1);

      if (!existing[0]) {
        await db.insert(parentChild).values({
          parentId,
          childId,
          relationshipRole: "owner",
          linkSource: "approved_request",
          linkedByParentId: parentId,
          linkedAt: new Date(),
        });
      }

      return res.json(successResponse({
        linked: true,
        childId,
        childName: childRow[0].name,
      }, "Trial child linked successfully"));
    } catch (error: any) {
      console.error("Link trial child error:", error);
      return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to link trial child"));
    }
  });

  // Parent Login (with rate limiting)
  app.post("/api/auth/login", loginLimiter, async (req, res) => {
    try {
      if (!(await requireOtpFeatureEnabled(res))) return;

      const { email, password } = req.body;
      const normalizedEmail = normalizeEmail(email);

      if (!normalizedEmail || !password) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Email and password are required"));
      }

      const result = await db.select().from(parents).where(eq(parents.email, normalizedEmail));
      if (!result[0]) {
        return res.status(401).json(errorResponse(ErrorCode.INVALID_CREDENTIALS, "Invalid credentials"));
      }

      if (result[0].lockedUntil && new Date() < new Date(result[0].lockedUntil)) {
        const retryAfter = Math.ceil((new Date(result[0].lockedUntil).getTime() - Date.now()) / 1000);
        res.set("Retry-After", String(retryAfter));
        return res.status(403).json(errorResponse(ErrorCode.FORBIDDEN, "Account locked. Please try again later."));
      }

      const passwordMatch = await bcrypt.compare(password, result[0].password);
      if (!passwordMatch) {
        const nextAttempts = (result[0].failedLoginAttempts || 0) + 1;
        const updates: { failedLoginAttempts: number; lockedUntil?: Date | null } = {
          failedLoginAttempts: nextAttempts,
        };
        let lockedUntil: Date | null = null;
        if (nextAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
          lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
          updates.lockedUntil = lockedUntil;
        }
        await db.update(parents).set(updates).where(eq(parents.id, result[0].id));
        if (lockedUntil) {
          try {
            await notifyAdminsAccountLocked(result[0], "email", nextAttempts, req);
          } catch (notifyErr) {
            console.error("Failed to notify admins about email lockout:", notifyErr);
          }
          res.set("Retry-After", String(LOCKOUT_MINUTES * 60));
          return res.status(403).json(errorResponse(ErrorCode.FORBIDDEN, "Account locked. Please try again later."));
        }
        return res.status(401).json(errorResponse(ErrorCode.INVALID_CREDENTIALS, "Invalid credentials"));
      }

      // SEC-002 FIX: Admin bypass OTP - moved to environment variable
      const ADMIN_BYPASS_EMAILS = process.env["ADMIN_BYPASS_EMAILS"]?.split(",").map(e => e.trim().toLowerCase()) || [];
      const allowAdminBypass = process.env["NODE_ENV"] !== "production" && process.env["ALLOW_ADMIN_BYPASS"] === "true";
      if (allowAdminBypass && ADMIN_BYPASS_EMAILS.length > 0 && ADMIN_BYPASS_EMAILS.includes(normalizedEmail)) {
        console.warn(`⚠️ Admin bypass login: ${normalizedEmail}`);
        await db.update(parents).set({ failedLoginAttempts: 0, lockedUntil: null }).where(eq(parents.id, result[0].id));
        const token = signParentAccessToken(result[0].id);
        const familyHasPin = await hasAnyFamilyPin(result[0].id, result[0].pin);
        return res.json(successResponse({
          token,
          userId: result[0].id,
          uniqueCode: result[0].uniqueCode,
          hasPin: familyHasPin,
          isAdmin: true,
        }, "تسجيل دخول المسؤول بنجاح"));
      }

      // Send OTP instead of direct token
      const ipAddress = req.ip || "0.0.0.0";
      const canSend = await isOtpRequestAllowed(normalizedEmail, ipAddress);
      if (!canSend) {
        trackOtpEvent("rate_limited", {
          reason: "request_limit",
          purpose: "login",
          destination: normalizedEmail,
          parentId: result[0].id,
          ip: ipAddress,
        });
        return respondRateLimited(res, "Too many OTP requests. Please try again later.");
      }

      const code = generateOTP();
      const codeHash = await hashOTP(code);
      const deviceHash = computeDeviceHash(req.body.deviceId, req);

      const provider = await getProviderOrFallback("email");
      if (!provider) {
        return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "No OTP provider available"));
      }

      try {
        await provider.instance.send(normalizedEmail, code);
      } catch (err: any) {
        console.error("❌ Failed to send OTP:", err);
        return res.status(500).json(errorResponse(
          ErrorCode.INTERNAL_SERVER_ERROR,
          "Failed to send OTP. Please try again later"
        ));
      }

      let record;
      try {
        record = await createOTPRecord(db, {
          parentId: result[0].id,
          purpose: "login",
          destination: normalizedEmail,
          provider: provider.provider,
          codeHash,
          expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
          deviceHash,
          ipAddress,
        });
        await logOtpRequest(normalizedEmail, ipAddress);
        trackOtpEvent("send", {
          purpose: "login",
          method: provider.provider,
          destination: normalizedEmail,
          parentId: result[0].id,
          ip: ipAddress,
          otpId: record?.id,
        });
      } catch (dbErr: any) {
        if (dbErr?.message === "OTP_COOLDOWN") {
          trackOtpEvent("rate_limited", {
            reason: "cooldown",
            purpose: "login",
            destination: normalizedEmail,
            parentId: result[0].id,
            ip: ipAddress,
          });
          return respondOtpCooldown(res, dbErr.retryAfter || OTP_COOLDOWN_SECONDS);
        }
        console.error("❌ Failed to persist login OTP after send:", dbErr);
        return res.status(500).json(errorResponse(
          ErrorCode.INTERNAL_SERVER_ERROR,
          "Failed to store OTP. Please request a new code."
        ));
      }

      res.json(successResponse({
        requiresOtp: true,
        email: normalizedEmail,
        otpId: record?.id,
      }, "OTP sent successfully to your email"));
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Login failed"));
    }
  });

  // Forgot Password - Send reset OTP (with rate limiting)
  app.post("/api/auth/forgot-password", otpRequestLimiter, async (req, res) => {
    try {
      if (!(await requireOtpFeatureEnabled(res))) return;

      const { email, phoneNumber, method } = req.body;
      const requestedMethod: "email" | "sms" | "whatsapp" = method === "sms" || method === "whatsapp" ? method : "email";
      const normalizedEmail = normalizeEmail(email);
      const normalizedPhone = typeof phoneNumber === "string" ? phoneNumber.trim() : "";

      if (requestedMethod === "sms" && !normalizedPhone) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Phone number is required"));
      }
      if (requestedMethod === "email" && !normalizedEmail) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Email is required"));
      }

      const parent = requestedMethod === "sms"
        ? await db.select().from(parents).where(eq(parents.phoneNumber, normalizedPhone))
        : await db.select().from(parents).where(eq(parents.email, normalizedEmail!));

      if (!parent[0]) {
        return res.json(successResponse({ sent: true }, "If account exists, OTP will be sent"));
      }

      const destination = requestedMethod === "sms" ? (parent[0].phoneNumber || normalizedPhone) : normalizedEmail;
      if (!destination) {
        return res.json(successResponse({ sent: true }, "If account exists, OTP will be sent"));
      }

      if (requestedMethod === "sms") {
        if (!(await isSmsOtpServiceAvailable()) || !parent[0].smsEnabled || !parent[0].phoneNumber) {
          return res.json(successResponse({ sent: true }, "If account exists, OTP will be sent"));
        }
        const withinLimit = await checkSMSRateLimit(parent[0].id);
        if (!withinLimit) {
          trackOtpEvent("rate_limited", {
            reason: "request_limit",
            purpose: "reset",
            method: "sms",
            destination,
            parentId: parent[0].id,
            ip: req.ip || "0.0.0.0",
          });
          return res.json(successResponse({ sent: true }, "If account exists, OTP will be sent"));
        }
      } else if (requestedMethod === "whatsapp") {
        if (!(await isWhatsappOtpServiceAvailable()) || !parent[0].phoneNumber) {
          return res.json(successResponse({ sent: true }, "If account exists, OTP will be sent"));
        }
        const withinLimit = await checkWhatsAppRateLimit(parent[0].id);
        if (!withinLimit) {
          trackOtpEvent("rate_limited", {
            reason: "request_limit",
            purpose: "reset",
            method: "whatsapp",
            destination,
            parentId: parent[0].id,
            ip: req.ip || "0.0.0.0",
          });
          return res.json(successResponse({ sent: true }, "If account exists, OTP will be sent"));
        }
      }

      const ipAddress = req.ip || "0.0.0.0";
      const canSend = await isOtpRequestAllowed(destination, ipAddress);
      if (!canSend) {
        trackOtpEvent("rate_limited", {
          reason: "request_limit",
          purpose: "reset",
          method: requestedMethod,
          destination,
          parentId: parent[0].id,
          ip: ipAddress,
        });
        return respondRateLimited(res, "Too many OTP requests. Please try again later.");
      }

      const code = generateOTP();
      const codeHash = await hashOTP(code);

      let providerName = "email";
      if (requestedMethod === "sms") {
        const smsResult = await smsOTPService.sendOTP(destination, code, "password-reset");
        if (!smsResult.success) {
          console.error("❌ Failed to send password reset OTP SMS:", smsResult.error);
          return res.json(successResponse({ sent: true }, "If account exists, OTP will be sent"));
        }
        providerName = "sms";
      } else if (requestedMethod === "whatsapp") {
        const whatsappResult = await whatsappOTPService.sendOTP(destination, code, "password-reset");
        if (!whatsappResult.success) {
          console.error("❌ Failed to send password reset OTP WhatsApp:", whatsappResult.error);
          return res.json(successResponse({ sent: true }, "If account exists, OTP will be sent"));
        }
        providerName = "whatsapp";
      } else {
        const provider = await getProviderOrFallback("email");
        if (!provider) {
          return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "No OTP provider available"));
        }

        try {
          await provider.instance.send(destination, code);
        } catch (err: any) {
          console.error("❌ Failed to send password reset OTP email:", err);
          return res.status(500).json(errorResponse(
            ErrorCode.INTERNAL_SERVER_ERROR,
            "Failed to send OTP. Please try again later."
          ));
        }
        providerName = provider.provider;
      }

      let record;
      try {
        record = await createOTPRecord(db, {
          parentId: parent[0].id,
          purpose: "reset",
          destination,
          provider: providerName,
          codeHash,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          ipAddress,
        });
        await logOtpRequest(destination, ipAddress);
        trackOtpEvent("send", {
          purpose: "reset",
          method: providerName,
          destination,
          parentId: parent[0].id,
          ip: ipAddress,
          otpId: record?.id,
        });
      } catch (dbErr: any) {
        if (dbErr?.message === "OTP_COOLDOWN") {
          trackOtpEvent("rate_limited", {
            reason: "cooldown",
            purpose: "reset",
            method: requestedMethod,
            destination,
            parentId: parent[0].id,
            ip: ipAddress,
          });
          return respondOtpCooldown(res, dbErr.retryAfter || OTP_COOLDOWN_SECONDS);
        }
        console.error("❌ Failed to persist password reset OTP:", dbErr);
        return res.status(500).json(errorResponse(
          ErrorCode.INTERNAL_SERVER_ERROR,
          "Failed to store OTP. Please request a new code."
        ));
      }

      res.json(successResponse({ sent: true, otpId: record?.id }, "OTP sent successfully"));
    } catch (error: any) {
      console.error("Forgot password error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to send OTP"));
    }
  });

  // Verify reset OTP
  app.post("/api/auth/verify-reset-otp", otpVerifyLimiter, async (req, res) => {
    try {
      if (!(await requireOtpFeatureEnabled(res))) return;

      const { email, phoneNumber, method, code, otpId } = req.body;
      const requestedMethod: "email" | "sms" | "whatsapp" = method === "sms" || method === "whatsapp" ? method : "email";
      const normalizedEmail = normalizeEmail(email);
      const normalizedPhone = typeof phoneNumber === "string" ? phoneNumber.trim() : "";
      const destination = requestedMethod === "email" ? normalizedEmail : normalizedPhone;

      if (!destination || !code) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Destination and code are required"));
      }

      const parent = requestedMethod === "sms"
        ? await db.select().from(parents).where(eq(parents.phoneNumber, destination))
        : await db.select().from(parents).where(eq(parents.email, destination));
      if (!parent[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "User not found"));
      }

      const pendingCondition = or(eq(otpCodes.status, "pending"), isNull(otpCodes.status));
      let record: typeof otpCodes.$inferSelect | undefined;
      const methodCondition = requestedMethod !== "email" ? eq(otpCodes.method, requestedMethod) : undefined;

      if (otpId) {
        const byId = await db
          .select()
          .from(otpCodes)
          .where(and(
            eq(otpCodes.id, otpId),
            eq(otpCodes.parentId, parent[0].id),
            eq(otpCodes.destination, destination),
            eq(otpCodes.purpose, "reset"),
            ...(methodCondition ? [methodCondition] : []),
            pendingCondition
          ))
          .orderBy(desc(otpCodes.createdAt))
          .limit(1);
        record = byId[0];
      } else {
        const latest = await db
          .select()
          .from(otpCodes)
          .where(and(
            eq(otpCodes.parentId, parent[0].id),
            eq(otpCodes.destination, destination),
            eq(otpCodes.purpose, "reset"),
            ...(methodCondition ? [methodCondition] : []),
            pendingCondition
          ))
          .orderBy(desc(otpCodes.createdAt))
          .limit(1);
        record = latest[0];
      }
      if (!record) {
        trackOtpEvent("verify_failed", {
          purpose: "reset",
          method: requestedMethod,
          destination,
          parentId: parent[0].id,
          reason: "not_found",
          otpId,
        });
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid OTP"));
      }
      if (!validateExpiry(record.expiresAt)) {
        await db.update(otpCodes).set({ status: "expired" }).where(eq(otpCodes.id, record.id));
        trackOtpEvent("verify_failed", {
          purpose: "reset",
          method: requestedMethod,
          destination,
          parentId: record.parentId || undefined,
          reason: "expired",
          otpId: record.id,
        });
        return res.status(400).json(errorResponse(ErrorCode.OTP_EXPIRED, "OTP expired"));
      }

      const ok = await compareOTP(code, record.code);
      if (!ok) {
        const attempts = await incrementAttemptsAtomic(db, record.id);
        if (attempts !== null && attempts >= MAX_ATTEMPTS) {
          await blockOTP(db, record.id);
          trackOtpEvent("blocked", {
            purpose: "reset",
            method: requestedMethod,
            destination,
            parentId: record.parentId || undefined,
            reason: "max_attempts",
            otpId: record.id,
          });
        }
        if (attempts === null) {
          trackOtpEvent("verify_failed", {
            purpose: "reset",
            method: requestedMethod,
            destination,
            parentId: record.parentId || undefined,
            reason: "used",
            otpId: record.id,
          });
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "OTP already used"));
        }
        trackOtpEvent("verify_failed", {
          purpose: "reset",
          method: requestedMethod,
          destination,
          parentId: record.parentId || undefined,
          reason: "invalid",
          otpId: record.id,
        });
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid OTP"));
      }

      trackOtpEvent("verify_success", {
        purpose: "reset",
        method: requestedMethod,
        destination,
        parentId: record.parentId || undefined,
        otpId: record.id,
      });
      res.json(successResponse({ verified: true }, "OTP verified"));
    } catch (error: any) {
      console.error("Verify reset OTP error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "OTP verification failed"));
    }
  });

  // Reset Password
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { email, phoneNumber, method, code, newPassword, otpId } = req.body;
      const requestedMethod: "email" | "sms" | "whatsapp" = method === "sms" || method === "whatsapp" ? method : "email";
      const normalizedEmail = normalizeEmail(email);
      const normalizedPhone = typeof phoneNumber === "string" ? phoneNumber.trim() : "";
      const destination = requestedMethod === "email" ? normalizedEmail : normalizedPhone;

      if (!destination || !code || !newPassword) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Destination, OTP, and new password are required"));
      }

      if (newPassword.length < 8) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Password must be at least 8 characters"));
      }

      const pendingCondition = or(eq(otpCodes.status, "pending"), isNull(otpCodes.status));
      let record: typeof otpCodes.$inferSelect | undefined;
      const methodCondition = requestedMethod !== "email" ? eq(otpCodes.method, requestedMethod) : undefined;

      const parent = requestedMethod === "email"
        ? await db.select().from(parents).where(eq(parents.email, destination))
        : await db.select().from(parents).where(eq(parents.phoneNumber, destination));
      if (!parent[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "User not found"));
      }

      if (otpId) {
        const byId = await db
          .select()
          .from(otpCodes)
          .where(and(
            eq(otpCodes.id, otpId),
            eq(otpCodes.parentId, parent[0].id),
            eq(otpCodes.destination, destination),
            eq(otpCodes.purpose, "reset"),
            ...(methodCondition ? [methodCondition] : []),
            pendingCondition
          ))
          .orderBy(desc(otpCodes.createdAt))
          .limit(1);
        record = byId[0];
      } else {
        const latest = await db
          .select()
          .from(otpCodes)
          .where(and(
            eq(otpCodes.parentId, parent[0].id),
            eq(otpCodes.destination, destination),
            eq(otpCodes.purpose, "reset"),
            ...(methodCondition ? [methodCondition] : []),
            pendingCondition
          ))
          .orderBy(desc(otpCodes.createdAt))
          .limit(1);
        record = latest[0];
      }
      if (!record || !validateExpiry(record.expiresAt)) {
        if (record) {
          await db.update(otpCodes).set({ status: "expired" }).where(eq(otpCodes.id, record.id));
          trackOtpEvent("verify_failed", {
            purpose: "reset",
            method: requestedMethod,
            destination,
            parentId: record.parentId || undefined,
            reason: "expired",
            otpId: record.id,
          });
        }
        if (!record) {
          trackOtpEvent("verify_failed", {
            purpose: "reset",
            method: requestedMethod,
            destination,
            parentId: parent[0].id,
            reason: "not_found",
            otpId,
          });
        }
        return res.status(400).json(errorResponse(ErrorCode.OTP_EXPIRED, "Invalid or expired OTP"));
      }

      const ok = await compareOTP(code, record.code);
      if (!ok) {
        const attempts = await incrementAttemptsAtomic(db, record.id);
        if (attempts !== null && attempts >= MAX_ATTEMPTS) {
          await blockOTP(db, record.id);
          trackOtpEvent("blocked", {
            purpose: "reset",
            method: requestedMethod,
            destination,
            parentId: record.parentId || undefined,
            reason: "max_attempts",
            otpId: record.id,
          });
        }
        if (attempts === null) {
          trackOtpEvent("verify_failed", {
            purpose: "reset",
            method: requestedMethod,
            destination,
            parentId: record.parentId || undefined,
            reason: "used",
            otpId: record.id,
          });
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "OTP already used"));
        }
        trackOtpEvent("verify_failed", {
          purpose: "reset",
          method: requestedMethod,
          destination,
          parentId: record.parentId || undefined,
          reason: "invalid",
          otpId: record.id,
        });
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid OTP"));
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.update(parents).set({ password: hashedPassword }).where(eq(parents.id, parent[0].id));

      const verifiedId = await markVerifiedAtomic(db, record.id);
      if (!verifiedId) {
        trackOtpEvent("verify_failed", {
          purpose: "reset",
          method: requestedMethod,
          destination,
          parentId: record.parentId || undefined,
          reason: "used",
          otpId: record.id,
        });
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "OTP already used"));
      }

      trackOtpEvent("verify_success", {
        purpose: "reset",
        method: requestedMethod,
        destination,
        parentId: record.parentId || undefined,
        otpId: record.id,
        action: "consume",
      });

      res.json(successResponse({ reset: true }, "Password reset successful"));
    } catch (error: any) {
      console.error("Reset password error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Password reset failed"));
    }
  });

  // Reset PIN using forgot-password OTP flow
  app.post("/api/auth/reset-pin", async (req, res) => {
    try {
      const { email, phoneNumber, method, code, newPin, otpId } = req.body;
      const requestedMethod: "email" | "sms" | "whatsapp" = method === "sms" || method === "whatsapp" ? method : "email";
      const normalizedEmail = normalizeEmail(email);
      const normalizedPhone = typeof phoneNumber === "string" ? phoneNumber.trim() : "";
      const destination = requestedMethod === "email" ? normalizedEmail : normalizedPhone;

      if (!destination || !code || !newPin) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Destination, OTP, and new PIN are required"));
      }

      const pinStr = String(newPin).trim();
      if (!/^\d{4}$/.test(pinStr)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "PIN must be exactly 4 digits"));
      }

      const pendingCondition = or(eq(otpCodes.status, "pending"), isNull(otpCodes.status));
      let record: typeof otpCodes.$inferSelect | undefined;
      const methodCondition = requestedMethod !== "email" ? eq(otpCodes.method, requestedMethod) : undefined;

      const parent = requestedMethod === "email"
        ? await db.select().from(parents).where(eq(parents.email, destination))
        : await db.select().from(parents).where(eq(parents.phoneNumber, destination));

      if (!parent[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "User not found"));
      }

      if (otpId) {
        const byId = await db
          .select()
          .from(otpCodes)
          .where(and(
            eq(otpCodes.id, otpId),
            eq(otpCodes.parentId, parent[0].id),
            eq(otpCodes.destination, destination),
            eq(otpCodes.purpose, "reset"),
            ...(methodCondition ? [methodCondition] : []),
            pendingCondition
          ))
          .orderBy(desc(otpCodes.createdAt))
          .limit(1);
        record = byId[0];
      } else {
        const latest = await db
          .select()
          .from(otpCodes)
          .where(and(
            eq(otpCodes.parentId, parent[0].id),
            eq(otpCodes.destination, destination),
            eq(otpCodes.purpose, "reset"),
            ...(methodCondition ? [methodCondition] : []),
            pendingCondition
          ))
          .orderBy(desc(otpCodes.createdAt))
          .limit(1);
        record = latest[0];
      }

      if (!record || !validateExpiry(record.expiresAt)) {
        if (record) {
          await db.update(otpCodes).set({ status: "expired" }).where(eq(otpCodes.id, record.id));
        }
        return res.status(400).json(errorResponse(ErrorCode.OTP_EXPIRED, "Invalid or expired OTP"));
      }

      const ok = await compareOTP(code, record.code);
      if (!ok) {
        const attempts = await incrementAttemptsAtomic(db, record.id);
        if (attempts !== null && attempts >= MAX_ATTEMPTS) {
          await blockOTP(db, record.id);
        }
        if (attempts === null) {
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "OTP already used"));
        }
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid OTP"));
      }

      const hashedPin = await bcrypt.hash(pinStr, 10);
      await db.update(parents).set({ pin: hashedPin }).where(eq(parents.id, parent[0].id));

      const verifiedId = await markVerifiedAtomic(db, record.id);
      if (!verifiedId) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "OTP already used"));
      }

      return res.json(successResponse({
        reset: true,
        familyCode: parent[0].uniqueCode,
        hasPin: true,
      }, "PIN reset successful"));
    } catch (error: any) {
      console.error("Reset PIN error:", error);
      return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "PIN reset failed"));
    }
  });

  // Send OTP (general)
  app.post("/api/auth/send-otp", otpRequestLimiter, async (req, res) => {
    try {
      if (!(await requireOtpFeatureEnabled(res))) return;

      const { email, phoneNumber, method, provider: requestedProvider, purpose: requestedPurpose } = req.body;
      const requestedMethod: "email" | "sms" | "whatsapp" = method === "sms" || method === "whatsapp" ? method : "email";
      const normalizedEmail = normalizeEmail(email);
      const normalizedPhone = typeof phoneNumber === "string" ? phoneNumber.trim() : "";
      const destination = requestedMethod === "email" ? normalizedEmail : normalizedPhone;

      if (!destination) {
        return res.status(400).json(errorResponse(
          ErrorCode.BAD_REQUEST,
          requestedMethod === "email" ? "Email is required" : "Phone number is required"
        ));
      }

      const purpose = requestedPurpose || "login";
      const allowedPurposes = new Set(["login", "register", "change_password"]);
      if (!allowedPurposes.has(purpose)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid OTP purpose"));
      }

      const parent = requestedMethod === "email"
        ? await db.select().from(parents).where(eq(parents.email, destination))
        : await db.select().from(parents).where(eq(parents.phoneNumber, destination));
      if (!parent[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "User not found"));
      }

      if (requestedMethod === "sms") {
        if (!(await isSmsOtpServiceAvailable()) || !parent[0].smsEnabled || !parent[0].phoneNumber) {
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "SMS OTP is not enabled for this account"));
        }
        const withinLimit = await checkSMSRateLimit(parent[0].id);
        if (!withinLimit) {
          trackOtpEvent("rate_limited", {
            reason: "request_limit",
            purpose,
            method: "sms",
            destination,
            parentId: parent[0].id,
            ip: req.ip || "0.0.0.0",
          });
          return respondRateLimited(res, "Too many SMS requests. Please try again later.");
        }
      } else if (requestedMethod === "whatsapp") {
        if (!(await isWhatsappOtpServiceAvailable()) || !parent[0].phoneNumber) {
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "WhatsApp OTP is not enabled for this account"));
        }
        const withinLimit = await checkWhatsAppRateLimit(parent[0].id);
        if (!withinLimit) {
          trackOtpEvent("rate_limited", {
            reason: "request_limit",
            purpose,
            method: "whatsapp",
            destination,
            parentId: parent[0].id,
            ip: req.ip || "0.0.0.0",
          });
          return respondRateLimited(res, "Too many WhatsApp requests. Please try again later.");
        }
      }

      const ipAddress = req.ip || "0.0.0.0";
      const canSend = await isOtpRequestAllowed(destination, ipAddress);
      if (!canSend) {
        trackOtpEvent("rate_limited", {
          reason: "request_limit",
          purpose,
          method: requestedMethod,
          destination,
          parentId: parent[0].id,
          ip: ipAddress,
        });
        return respondRateLimited(res, "Too many OTP requests. Please try again later.");
      }

      const code = generateOTP();
      const codeHash = await hashOTP(code);
      let providerName = "email";
      if (requestedMethod === "sms") {
        const smsResult = await smsOTPService.sendOTP(destination, code, purpose === "change_password" ? "change-password" : "login");
        if (!smsResult.success) {
          console.error("❌ Failed to send SMS OTP:", smsResult.error);
          return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to send SMS OTP. Please try again later."));
        }
        providerName = "sms";
      } else if (requestedMethod === "whatsapp") {
        const whatsappResult = await whatsappOTPService.sendOTP(destination, code, purpose === "change_password" ? "change-password" : "login");
        if (!whatsappResult.success) {
          console.error("❌ Failed to send WhatsApp OTP:", whatsappResult.error);
          return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to send WhatsApp OTP. Please try again later."));
        }
        providerName = "whatsapp";
      } else {
        const provider = await getProviderOrFallback(requestedProvider || "email");
        if (!provider) {
          return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "No OTP provider available"));
        }

        try {
          await provider.instance.send(destination, code);
        } catch (err: any) {
          console.error("❌ Failed to send OTP:", err);
          return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to send OTP. Please try again later."));
        }
        providerName = provider.provider;
      }

      let record;
      try {
        record = await createOTPRecord(db, {
          parentId: parent[0].id,
          purpose,
          destination,
          provider: providerName,
          codeHash,
          expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
          ipAddress,
        });
        await logOtpRequest(destination, ipAddress);
        trackOtpEvent("send", {
          purpose,
          method: providerName,
          destination,
          parentId: parent[0].id,
          ip: ipAddress,
          otpId: record?.id,
        });
      } catch (dbErr: any) {
        if (dbErr?.message === "OTP_COOLDOWN") {
          trackOtpEvent("rate_limited", {
            reason: "cooldown",
            purpose,
            method: requestedMethod,
            destination,
            parentId: parent[0].id,
            ip: ipAddress,
          });
          return respondOtpCooldown(res, dbErr.retryAfter || OTP_COOLDOWN_SECONDS);
        }
        console.error("❌ Failed to persist OTP after send:", dbErr);
        return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to store OTP. Please request a new code."));
      }

      res.json(successResponse({ sent: true, otpId: record?.id, purpose, method: requestedMethod }, "OTP sent successfully"));
    } catch (error: any) {
      console.error("Send OTP error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to send OTP"));
    }
  });

  // Verify OTP
  app.post("/api/auth/verify-otp", otpVerifyLimiter, async (req, res) => {
    try {
      if (!(await requireOtpFeatureEnabled(res))) return;

      const { email, phoneNumber, method, code, otpId, deviceId, deviceName, deviceType, purpose: requestedPurpose } = req.body;
      const requestedMethod: "email" | "sms" | "whatsapp" = method === "sms" || method === "whatsapp" ? method : "email";
      const normalizedEmail = normalizeEmail(email);
      const normalizedPhone = typeof phoneNumber === "string" ? phoneNumber.trim() : "";
      const destination = requestedMethod === "email" ? normalizedEmail : normalizedPhone;
      if (!destination || !code) {
        return res.status(400).json(errorResponse(
          ErrorCode.BAD_REQUEST,
          requestedMethod === "email" ? "Email and OTP are required" : "Phone number and OTP are required"
        ));
      }

      const allowedPurposes = new Set(["login", "register", "change_password"]);
      if (requestedPurpose && !allowedPurposes.has(requestedPurpose)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid OTP purpose"));
      }

      const methodCondition = requestedMethod !== "email" ? eq(otpCodes.method, requestedMethod) : undefined;

      if (requestedPurpose === "change_password") {
        const parent = requestedMethod === "email"
          ? await db.select().from(parents).where(eq(parents.email, destination))
          : await db.select().from(parents).where(eq(parents.phoneNumber, destination));
        if (!parent[0]) {
          return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "User not found"));
        }

        const pendingCondition = or(eq(otpCodes.status, "pending"), isNull(otpCodes.status));
        let record: typeof otpCodes.$inferSelect | undefined;

        if (otpId) {
          const byId = await db
            .select()
            .from(otpCodes)
            .where(and(
              eq(otpCodes.id, otpId),
              eq(otpCodes.parentId, parent[0].id),
              eq(otpCodes.destination, destination),
              eq(otpCodes.purpose, "change_password"),
              ...(methodCondition ? [methodCondition] : []),
              pendingCondition
            ))
            .orderBy(desc(otpCodes.createdAt))
            .limit(1);
          record = byId[0];
        } else {
          const latest = await db
            .select()
            .from(otpCodes)
            .where(and(
              eq(otpCodes.parentId, parent[0].id),
              eq(otpCodes.destination, destination),
              eq(otpCodes.purpose, "change_password"),
              ...(methodCondition ? [methodCondition] : []),
              pendingCondition
            ))
            .orderBy(desc(otpCodes.createdAt))
            .limit(1);
          record = latest[0];
        }

        if (!record) {
          trackOtpEvent("verify_failed", {
            purpose: "change_password",
            method: requestedMethod,
            destination,
            parentId: parent[0].id,
            reason: "not_found",
            otpId,
          });
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid OTP"));
        }

        if (!validateExpiry(record.expiresAt)) {
          await db.update(otpCodes).set({ status: "expired" }).where(eq(otpCodes.id, record.id));
          trackOtpEvent("verify_failed", {
            purpose: "change_password",
            method: requestedMethod,
            destination,
            parentId: parent[0].id,
            reason: "expired",
            otpId: record.id,
          });
          return res.status(400).json(errorResponse(ErrorCode.OTP_EXPIRED, "OTP expired"));
        }

        const ok = await compareOTP(code, record.code);
        if (!ok) {
          const attempts = await incrementAttemptsAtomic(db, record.id);
          if (attempts !== null && attempts >= MAX_ATTEMPTS) {
            await blockOTP(db, record.id);
            trackOtpEvent("blocked", {
              purpose: "change_password",
              method: requestedMethod,
              destination,
              parentId: parent[0].id,
              reason: "max_attempts",
              otpId: record.id,
            });
          }
          if (attempts === null) {
            trackOtpEvent("verify_failed", {
              purpose: "change_password",
              method: requestedMethod,
              destination,
              parentId: parent[0].id,
              reason: "used",
              otpId: record.id,
            });
            return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "OTP already used"));
          }
          trackOtpEvent("verify_failed", {
            purpose: "change_password",
            method: requestedMethod,
            destination,
            parentId: parent[0].id,
            reason: "invalid",
            otpId: record.id,
          });
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid OTP"));
        }

        trackOtpEvent("verify_success", {
          purpose: "change_password",
          method: requestedMethod,
          destination,
          parentId: parent[0].id,
          otpId: record.id,
        });

        return res.json(successResponse({ verified: true }, "OTP verified"));
      }

      const pendingCondition = or(eq(otpCodes.status, "pending"), isNull(otpCodes.status));
      let otpRecord: typeof otpCodes.$inferSelect | undefined;

      const purposeCondition = requestedPurpose
        ? eq(otpCodes.purpose, requestedPurpose)
        : or(
          eq(otpCodes.purpose, "login"),
          eq(otpCodes.purpose, "register")
        );
      const purposeLabel = requestedPurpose || "login_or_register";

      if (otpId) {
        const byId = await db
          .select()
          .from(otpCodes)
          .where(and(
            eq(otpCodes.id, otpId),
            eq(otpCodes.destination, destination),
            purposeCondition,
            ...(methodCondition ? [methodCondition] : []),
            pendingCondition
          ))
          .orderBy(desc(otpCodes.createdAt))
          .limit(1);
        otpRecord = byId[0];
      } else {
        const latest = await db
          .select()
          .from(otpCodes)
          .where(and(
            eq(otpCodes.destination, destination),
            purposeCondition,
            ...(methodCondition ? [methodCondition] : []),
            pendingCondition
          ))
          .orderBy(desc(otpCodes.createdAt))
          .limit(1);
        otpRecord = latest[0];
      }

      if (!otpRecord) {
        // Log failed login attempt
        const parentRes = requestedMethod === "sms"
          ? await db.select().from(parents).where(eq(parents.phoneNumber, destination))
          : await db.select().from(parents).where(eq(parents.email, destination));
        if (parentRes[0]) {
          await db.insert(loginHistory).values({
            parentId: parentRes[0].id,
            deviceId: deviceId || "unknown",
            deviceHash: computeDeviceHash(deviceId, req),
            success: false,
            ipAddress: req.ip,
            userAgent: req.get("user-agent"),
            failureReason: "invalid_otp",
            suspiciousActivity: false,
          });
        }
        trackOtpEvent("verify_failed", {
          purpose: purposeLabel,
          method: requestedMethod,
          destination,
          parentId: parentRes[0]?.id,
          reason: "not_found",
          otpId,
        });
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid OTP"));
      }

      if (!validateExpiry(otpRecord.expiresAt)) {
        await db.update(otpCodes).set({ status: "expired" }).where(eq(otpCodes.id, otpRecord.id));
        // Log expired OTP attempt
        const parentRes = await db.select().from(parents).where(eq(parents.id, otpRecord.parentId!));
        if (parentRes[0]) {
          await db.insert(loginHistory).values({
            parentId: parentRes[0].id,
            deviceId: deviceId || "unknown",
            deviceHash: computeDeviceHash(deviceId, req),
            success: false,
            ipAddress: req.ip,
            userAgent: req.get("user-agent"),
            failureReason: "otp_expired",
            suspiciousActivity: false,
          });
        }
        trackOtpEvent("verify_failed", {
          purpose: otpRecord.purpose,
          method: requestedMethod,
          destination,
          parentId: otpRecord.parentId || undefined,
          reason: "expired",
          otpId: otpRecord.id,
        });
        return res.status(400).json(errorResponse(ErrorCode.OTP_EXPIRED, "OTP expired"));
      }

      const isValid = await compareOTP(code, otpRecord.code);
      if (!isValid) {
        const attempts = await incrementAttemptsAtomic(db, otpRecord.id);
        if (attempts !== null && attempts >= MAX_ATTEMPTS) {
          await blockOTP(db, otpRecord.id);
          trackOtpEvent("blocked", {
            purpose: otpRecord.purpose,
            method: requestedMethod,
            destination,
            parentId: otpRecord.parentId || undefined,
            reason: "max_attempts",
            otpId: otpRecord.id,
          });
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "OTP blocked"));
        }
        if (attempts === null) {
          trackOtpEvent("verify_failed", {
            purpose: otpRecord.purpose,
            method: requestedMethod,
            destination,
            parentId: otpRecord.parentId || undefined,
            reason: "used",
            otpId: otpRecord.id,
          });
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "OTP already used"));
        }
        trackOtpEvent("verify_failed", {
          purpose: otpRecord.purpose,
          method: requestedMethod,
          destination,
          parentId: otpRecord.parentId || undefined,
          reason: "invalid",
          otpId: otpRecord.id,
        });
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid OTP"));
      }

      const parent = await db.select().from(parents).where(eq(parents.id, otpRecord.parentId!));
      if (!parent[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "User not found"));
      }

      // Mark OTP as verified
      const verifiedId = await markVerifiedAtomic(db, otpRecord.id);
      if (!verifiedId) {
        trackOtpEvent("verify_failed", {
          purpose: otpRecord.purpose,
          method: requestedMethod,
          destination,
          parentId: otpRecord.parentId || undefined,
          reason: "used",
          otpId: otpRecord.id,
        });
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "OTP already used"));
      }

      await db.update(parents).set({ failedLoginAttempts: 0, lockedUntil: null }).where(eq(parents.id, parent[0].id));

      // Create session (Phase 1: Session-based auth)
      const sessionToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(sessionToken).digest("hex");
      const sessionExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const finalDeviceId = deviceId || `device_${Date.now()}`;

      // Upsert session (replace if exists for same device)
      await db
        .insert(sessions)
        .values({
          parentId: parent[0].id,
          deviceId: finalDeviceId,
          tokenHash,
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
          isActive: true,
          expiresAt: sessionExpiresAt,
        })
        .onConflictDoUpdate({
          target: [sessions.parentId, sessions.deviceId],
          set: {
            tokenHash,
            ipAddress: req.ip,
            userAgent: req.get("user-agent"),
            isActive: true,
            expiresAt: sessionExpiresAt,
          },
        })
        .catch(() => {
          // Fallback: delete old session and create new one
          return db.insert(sessions).values({
            parentId: parent[0].id,
            deviceId: finalDeviceId,
            tokenHash,
            ipAddress: req.ip,
            userAgent: req.get("user-agent"),
            isActive: true,
            expiresAt: sessionExpiresAt,
          });
        });

      // Log successful login
      await db.insert(loginHistory).values({
        parentId: parent[0].id,
        deviceId: finalDeviceId,
        deviceHash: computeDeviceHash(deviceId, req),
        success: true,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        suspiciousActivity: false,
      });

      // Create JWT token for stateless fallback (30 days)
      const jwtToken = signParentAccessToken(parent[0].id);

      // Handle "Remember this device" functionality
      let deviceRefreshToken: string | undefined;
      const rememberDevice = req.body.rememberDevice;

      if (rememberDevice && deviceId) {
        // Check device limit (max 5 trusted devices per parent)
        const existingDevices = await db
          .select()
          .from(trustedDevices)
          .where(and(
            eq(trustedDevices.parentId, parent[0].id),
            isNull(trustedDevices.revokedAt)
          ));

        // Remove oldest device if limit exceeded
        if (existingDevices.length >= MAX_TRUSTED_DEVICES) {
          const oldest = existingDevices.sort((a: typeof existingDevices[0], b: typeof existingDevices[0]) =>
            new Date(a.lastUsedAt).getTime() - new Date(b.lastUsedAt).getTime()
          )[0];
          await db
            .update(trustedDevices)
            .set({ revokedAt: new Date() })
            .where(eq(trustedDevices.id, oldest.id));
        }

        // Generate refresh token
        deviceRefreshToken = crypto.randomBytes(48).toString("hex");
        const refreshTokenHash = crypto.createHash("sha256").update(deviceRefreshToken).digest("hex");
        const deviceIdHash = crypto.createHash("sha256").update(deviceId).digest("hex");
        const deviceLabel = deviceName || deviceType || "Unknown Device";

        // Check if device already exists and update, or create new
        const existingDevice = existingDevices.find((d: typeof existingDevices[0]) => d.deviceIdHash === deviceIdHash);

        if (existingDevice) {
          // Update existing device
          await db
            .update(trustedDevices)
            .set({
              refreshTokenHash,
              lastUsedAt: new Date(),
              expiresAt: new Date(Date.now() + DEVICE_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
              userAgent: req.get("user-agent"),
            })
            .where(eq(trustedDevices.id, existingDevice.id));
        } else {
          // Create new trusted device
          await db.insert(trustedDevices).values({
            parentId: parent[0].id,
            deviceIdHash,
            deviceLabel,
            refreshTokenHash,
            userAgent: req.get("user-agent"),
            expiresAt: new Date(Date.now() + DEVICE_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
          });
        }
      }

      // Set device refresh token as httpOnly cookie for security (prevents XSS theft)
      if (deviceRefreshToken) {
        res.cookie("device_refresh", deviceRefreshToken, {
          httpOnly: true,
          secure: process.env["NODE_ENV"] === "production",
          sameSite: "strict",
          maxAge: DEVICE_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
          path: "/api/auth/device",
        });
      }

      // Return both session + JWT in standard format
      trackOtpEvent("verify_success", {
        purpose: otpRecord.purpose,
        method: requestedMethod,
        destination,
        parentId: otpRecord.parentId || undefined,
        otpId: otpRecord.id,
      });

      if (otpRecord.purpose === "register") {
        try {
          const registrationIdentifier = parent[0].email || parent[0].phoneNumber || destination;
          await notifyAllAdmins({
            type: NOTIFICATION_TYPES.NEW_REGISTRATION,
            title: "👤 مستخدم جديد",
            message: `تسجيل جديد: ${parent[0].name} (${registrationIdentifier})`,
            style: NOTIFICATION_STYLES.TOAST,
            priority: NOTIFICATION_PRIORITIES.NORMAL,
            soundAlert: true,
            relatedId: parent[0].id,
            metadata: {
              parentId: parent[0].id,
              parentName: parent[0].name,
              email: parent[0].email || null,
              phoneNumber: parent[0].phoneNumber || null,
            },
          });
        } catch (err) {
          console.error("Failed to send admin registration notification:", err);
        }
      }

      const familyHasPin = await hasAnyFamilyPin(parent[0].id, parent[0].pin);
      res.json(successResponse({
        token: jwtToken, // JWT for stateless fallback
        sessionToken, // Session token for httpOnly cookie
        parentId: parent[0].id,
        userId: parent[0].id,
        uniqueCode: parent[0].uniqueCode, // For family PIN login flow
        hasPin: familyHasPin,
        deviceTrusted: !!deviceRefreshToken, // Indicate if device was saved
      }, "Login successful"));
    } catch (error: any) {
      console.error("Verify OTP error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "OTP verification failed"));
    }
  });

  // Phone Registration (requires email)
  app.post("/api/auth/register-phone", registerLimiter, async (req, res) => {
    try {
      if (!(await requireOtpFeatureEnabled(res))) return;

      const { email, password, name, phoneNumber, gender } = req.body;
      const normalizedEmail = normalizeEmail(email);
      const normalizedGender = normalizeParentGender(gender);

      if (!normalizedEmail || !password || !name || !phoneNumber) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Email, password, name, and phone number are required"));
      }
      if (!normalizedGender) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Gender must be male or female"));
      }
      if (password.length < 8) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Password must be at least 8 characters"));
      }
      if (!isValidEmailFormat(normalizedEmail)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid email format"));
      }

      const existing = await db.select().from(parents).where(eq(parents.email, normalizedEmail));
      if (existing[0]) {
        return res.status(409).json(errorResponse(ErrorCode.CONFLICT, "Email already registered"));
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const uniqueCode = await generateUniqueParentCode();

      const result = await db
        .insert(parents)
        .values({
          email: normalizedEmail,
          password: hashedPassword,
          name,
          gender: normalizedGender,
          phoneNumber,
          uniqueCode,
        })
        .returning();

      try {
        const { createNotification } = await import("../notifications");
        await createNotification({
          parentId: result[0].id,
          type: NOTIFICATION_TYPES.INFO,
          title: "كود ربط الأطفال الخاص بك",
          message: `كود الربط الخاص بك هو: ${uniqueCode}. شاركه مع أطفالك للربط بحسابك. حافظ على سرية هذا الكود!`,
          style: NOTIFICATION_STYLES.BANNER,
          priority: NOTIFICATION_PRIORITIES.URGENT,
          metadata: { code: uniqueCode },
        });
      } catch (err) {
        console.error("Failed to send linking code notification:", err);
      }

      // Notify all admins about new phone registration
      try {
        const { notifyAllAdmins } = await import("../notifications");
        await notifyAllAdmins({
          type: NOTIFICATION_TYPES.NEW_REGISTRATION,
          title: "👤 مستخدم جديد (هاتف)",
          message: `تسجيل جديد بالهاتف: ${name} (${normalizedEmail})`,
          style: NOTIFICATION_STYLES.TOAST,
          priority: NOTIFICATION_PRIORITIES.NORMAL,
          soundAlert: true,
          relatedId: result[0].id,
          metadata: { parentId: result[0].id, parentName: name, email: normalizedEmail, phoneNumber },
        });
      } catch (err) {
        console.error("Failed to send admin registration notification:", err);
      }

      const ipAddress = req.ip || "0.0.0.0";
      const canSend = await isOtpRequestAllowed(normalizedEmail, ipAddress);
      if (!canSend) {
        trackOtpEvent("rate_limited", {
          reason: "request_limit",
          purpose: "register",
          destination: normalizedEmail,
          parentId: result[0].id,
          ip: ipAddress,
        });
        return respondRateLimited(res, "Too many OTP requests. Please try again later.");
      }

      const code = generateOTP();
      const codeHash = await hashOTP(code);
      const provider = await getProviderOrFallback("email");
      if (!provider) {
        return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "No OTP provider available"));
      }

      try {
        await provider.instance.send(normalizedEmail, code);
      } catch (err: any) {
        console.error("❌ Failed to send registration OTP:", err);
        return res.status(500).json(errorResponse(
          ErrorCode.INTERNAL_SERVER_ERROR,
          "Failed to send OTP. Please try again later"
        ));
      }

      let record;
      try {
        record = await createOTPRecord(db, {
          parentId: result[0].id,
          purpose: "register",
          destination: normalizedEmail,
          provider: provider.provider,
          codeHash,
          expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
          ipAddress,
        });
        await logOtpRequest(normalizedEmail, ipAddress);
        trackOtpEvent("send", {
          purpose: "register",
          method: provider.provider,
          destination: normalizedEmail,
          parentId: result[0].id,
          ip: ipAddress,
          otpId: record?.id,
        });
      } catch (dbErr: any) {
        if (dbErr?.message === "OTP_COOLDOWN") {
          trackOtpEvent("rate_limited", {
            reason: "cooldown",
            purpose: "register",
            destination: normalizedEmail,
            parentId: result[0].id,
            ip: ipAddress,
          });
          return respondOtpCooldown(res, dbErr.retryAfter || OTP_COOLDOWN_SECONDS);
        }
        console.error("❌ Failed to persist registration OTP after send:", dbErr);
        return res.status(500).json(errorResponse(
          ErrorCode.INTERNAL_SERVER_ERROR,
          "Failed to store OTP. Please request a new code."
        ));
      }

      res.json(successResponse({
        requiresOtp: true,
        email: normalizedEmail || undefined,
        phone: phoneNumber || undefined,
        method: "email",
        otpId: record?.id,
        otpPurpose: "register",
        uniqueCode,
      }, "OTP sent successfully to your email"));
    } catch (error: any) {
      console.error("Phone registration error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Phone registration failed"));
    }
  });

  // Phone Login (SMS OTP)
  app.post("/api/auth/login-phone", loginLimiter, async (req, res) => {
    try {
      if (!(await requireOtpFeatureEnabled(res))) return;

      const { phoneNumber, password, otpMethod } = req.body;
      const selectedMethod: "sms" | "whatsapp" = otpMethod === "whatsapp" ? "whatsapp" : "sms";
      if (!phoneNumber || !password) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Phone number and password are required"));
      }

      const result = await db.select().from(parents).where(eq(parents.phoneNumber, phoneNumber));
      if (!result[0]) {
        return res.status(401).json(errorResponse(ErrorCode.INVALID_CREDENTIALS, "Invalid credentials"));
      }

      if (result[0].lockedUntil && new Date() < new Date(result[0].lockedUntil)) {
        const retryAfter = Math.ceil((new Date(result[0].lockedUntil).getTime() - Date.now()) / 1000);
        res.set("Retry-After", String(retryAfter));
        return res.status(403).json(errorResponse(ErrorCode.FORBIDDEN, "Account locked. Please try again later."));
      }

      const passwordMatch = await bcrypt.compare(password, result[0].password);
      if (!passwordMatch) {
        const nextAttempts = (result[0].failedLoginAttempts || 0) + 1;
        const updates: { failedLoginAttempts: number; lockedUntil?: Date | null } = {
          failedLoginAttempts: nextAttempts,
        };
        let lockedUntil: Date | null = null;
        if (nextAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
          lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
          updates.lockedUntil = lockedUntil;
        }
        await db.update(parents).set(updates).where(eq(parents.id, result[0].id));
        if (lockedUntil) {
          try {
            await notifyAdminsAccountLocked(result[0], "phone", nextAttempts, req);
          } catch (notifyErr) {
            console.error("Failed to notify admins about phone lockout:", notifyErr);
          }
          res.set("Retry-After", String(LOCKOUT_MINUTES * 60));
          return res.status(403).json(errorResponse(ErrorCode.FORBIDDEN, "Account locked. Please try again later."));
        }
        return res.status(401).json(errorResponse(ErrorCode.INVALID_CREDENTIALS, "Invalid credentials"));
      }

      const availableMethods: Array<"sms" | "whatsapp"> = [];
      const smsAvailable = (await isSmsOtpServiceAvailable()) && !!result[0].smsEnabled && !!result[0].phoneNumber;
      const whatsappAvailable = (await isWhatsappOtpServiceAvailable()) && !!result[0].phoneNumber;
      if (smsAvailable) availableMethods.push("sms");
      if (whatsappAvailable) availableMethods.push("whatsapp");

      if (!availableMethods.includes(selectedMethod)) {
        return res.status(400).json(errorResponse(
          ErrorCode.BAD_REQUEST,
          selectedMethod === "whatsapp"
            ? "WhatsApp OTP is not enabled for this account"
            : "SMS OTP is not enabled for this account"
        ));
      }

      const withinLimit = selectedMethod === "whatsapp"
        ? await checkWhatsAppRateLimit(result[0].id)
        : await checkSMSRateLimit(result[0].id);
      const ipAddress = req.ip || "0.0.0.0";
      const canSend = await isOtpRequestAllowed(result[0].phoneNumber, ipAddress);
      if (!withinLimit || !canSend) {
        trackOtpEvent("rate_limited", {
          reason: "request_limit",
          purpose: "login",
          method: selectedMethod,
          destination: result[0].phoneNumber,
          parentId: result[0].id,
          ip: ipAddress,
        });
        return respondRateLimited(
          res,
          selectedMethod === "whatsapp"
            ? "Too many WhatsApp requests. Please try again later."
            : "Too many SMS requests. Please try again later."
        );
      }

      const code = generateOTP();
      const codeHash = await hashOTP(code);
      const sendResult = selectedMethod === "whatsapp"
        ? await whatsappOTPService.sendOTP(result[0].phoneNumber, code, "login")
        : await smsOTPService.sendOTP(result[0].phoneNumber, code, "login");

      if (!sendResult.success) {
        console.error(`${selectedMethod.toUpperCase()} send failed:`, sendResult.error);
        return res.status(500).json(errorResponse(
          ErrorCode.INTERNAL_SERVER_ERROR,
          selectedMethod === "whatsapp" ? "Failed to send WhatsApp message" : "Failed to send SMS"
        ));
      }

      let record;
      try {
        record = await createOTPRecord(db, {
          parentId: result[0].id,
          purpose: "login",
          destination: result[0].phoneNumber,
          provider: selectedMethod,
          codeHash,
          expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
          ipAddress,
        });
        await logOtpRequest(result[0].phoneNumber, ipAddress);
        trackOtpEvent("send", {
          purpose: "login",
          method: selectedMethod,
          destination: result[0].phoneNumber,
          parentId: result[0].id,
          ip: ipAddress,
          otpId: record?.id,
        });
      } catch (dbErr: any) {
        if (dbErr?.message === "OTP_COOLDOWN") {
          trackOtpEvent("rate_limited", {
            reason: "cooldown",
            purpose: "login",
            method: "sms",
            destination: result[0].phoneNumber,
            parentId: result[0].id,
            ip: ipAddress,
          });
          return respondOtpCooldown(res, dbErr.retryAfter || OTP_COOLDOWN_SECONDS);
        }
        console.error("❌ Failed to persist phone login OTP after send:", dbErr);
        return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to store OTP. Please request a new code."));
      }

      res.json(successResponse({
        requiresOtp: true,
        phone: result[0].phoneNumber,
        method: selectedMethod,
        availableMethods,
        otpId: record?.id,
      }, selectedMethod === "whatsapp" ? "WhatsApp OTP sent successfully" : "SMS OTP sent successfully"));
    } catch (error: any) {
      console.error("Phone login error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Phone login failed"));
    }
  });

  // ============================================================================
  // SMS OTP Endpoints
  // ============================================================================

  // Get available OTP methods for a user
  app.get("/api/auth/otp-methods/:email", async (req, res) => {
    try {
      const normalizedEmail = normalizeEmail(req.params.email);
      const methods: string[] = ["email"];

      if (await isSmsOtpServiceAvailable()) {
        if (!normalizedEmail) {
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Email is required"));
        }
        const parent = await db.select().from(parents).where(eq(parents.email, normalizedEmail));
        if (parent[0]?.phoneNumber && parent[0]?.smsEnabled) {
          methods.push("sms");
        }
      }

      if (await isWhatsappOtpServiceAvailable()) {
        if (!normalizedEmail) {
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Email is required"));
        }
        const parent = await db.select().from(parents).where(eq(parents.email, normalizedEmail));
        if (parent[0]?.phoneNumber) {
          methods.push("whatsapp");
        }
      }

      res.json(successResponse({ methods }, "OTP methods retrieved"));
    } catch (error: any) {
      console.error("Get OTP methods error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to get OTP methods"));
    }
  });

  // Send OTP via SMS
  app.post("/api/auth/send-otp-sms", otpRequestLimiter, async (req, res) => {
    try {
      if (!(await requireOtpFeatureEnabled(res))) return;

      const { email, phoneNumber, purpose: requestedPurpose } = req.body;
      const normalizedEmail = normalizeEmail(email);

      if (!normalizedEmail && !phoneNumber) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Email or phone number is required"));
      }

      if (!(await isSmsOtpServiceAvailable())) {
        return res.status(503).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "SMS service not available"));
      }

      const parent = normalizedEmail
        ? await db.select().from(parents).where(eq(parents.email, normalizedEmail))
        : await db.select().from(parents).where(eq(parents.phoneNumber, phoneNumber));
      if (!parent[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "User not found"));
      }

      if (!parent[0].phoneNumber) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Phone number not configured for SMS OTP"));
      }

      if (!parent[0].smsEnabled) {
        return res.status(400).json(errorResponse(ErrorCode.SMS_NOT_ENABLED, "SMS OTP is disabled for this account"));
      }

      const purpose = requestedPurpose || "login";
      const allowedPurposes = new Set(["login", "register", "change_password"]);
      if (!allowedPurposes.has(purpose)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid OTP purpose"));
      }

      // Check rate limit
      const withinLimit = await checkSMSRateLimit(parent[0].id);
      const ipAddress = req.ip || "0.0.0.0";
      const canSend = await isOtpRequestAllowed(parent[0].phoneNumber, ipAddress);
      if (!withinLimit || !canSend) {
        trackOtpEvent("rate_limited", {
          reason: "request_limit",
          purpose,
          method: "sms",
          destination: parent[0].phoneNumber,
          parentId: parent[0].id,
          ip: ipAddress,
        });
        return respondRateLimited(res, "Too many SMS requests. Please try again later.");
      }

      // Generate and send OTP
      const code = generateOTP();
      const codeHash = await hashOTP(code);
      const result = await smsOTPService.sendOTP(parent[0].phoneNumber, code, purpose);

      if (!result.success) {
        console.error("SMS send failed:", result.error);
        return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to send SMS"));
      }

      // Store OTP in database
      let record;
      try {
        record = await createOTPRecord(db, {
          parentId: parent[0].id,
          purpose,
          destination: parent[0].phoneNumber,
          provider: "sms",
          codeHash,
          expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
          ipAddress,
        });
        await logOtpRequest(parent[0].phoneNumber, ipAddress);
        trackOtpEvent("send", {
          purpose,
          method: "sms",
          destination: parent[0].phoneNumber,
          parentId: parent[0].id,
          ip: ipAddress,
          otpId: record?.id,
        });
      } catch (dbErr: any) {
        if (dbErr?.message === "OTP_COOLDOWN") {
          trackOtpEvent("rate_limited", {
            reason: "cooldown",
            purpose,
            method: "sms",
            destination: parent[0].phoneNumber,
            parentId: parent[0].id,
            ip: ipAddress,
          });
          return respondOtpCooldown(res, dbErr.retryAfter || OTP_COOLDOWN_SECONDS);
        }
        console.error("❌ Failed to persist OTP after send:", dbErr);
        return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to store OTP. Please request a new code."));
      }

      console.log(`[SMS_OTP] SMS sent to ${maskPhoneNumber(parent[0].phoneNumber)}`);

      res.json(successResponse({
        method: "sms",
        destination: maskPhoneNumber(parent[0].phoneNumber),
        expiresIn: 300,
        otpId: record?.id,
        purpose,
      }, "SMS OTP sent successfully"));
    } catch (error: any) {
      console.error("Send SMS OTP error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Internal server error"));
    }
  });

  // Verify OTP sent via SMS
  app.post("/api/auth/verify-otp-sms", otpVerifyLimiter, async (req, res) => {
    try {
      if (!(await requireOtpFeatureEnabled(res))) return;

      const { email, phoneNumber, code, otpId, purpose: requestedPurpose } = req.body;
      const normalizedEmail = normalizeEmail(email);

      if ((!normalizedEmail && !phoneNumber) || !code) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Email or phone number and code are required"));
      }

      const allowedPurposes = new Set(["login", "register", "change_password"]);
      if (requestedPurpose && !allowedPurposes.has(requestedPurpose)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid OTP purpose"));
      }

      const parent = normalizedEmail
        ? await db.select().from(parents).where(eq(parents.email, normalizedEmail))
        : await db.select().from(parents).where(eq(parents.phoneNumber, phoneNumber));
      if (!parent[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "User not found"));
      }

      const destination = phoneNumber || parent[0].phoneNumber;
      if (!destination) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Phone number not configured for SMS OTP"));
      }

      const pendingCondition = or(eq(otpCodes.status, "pending"), isNull(otpCodes.status));

      if (requestedPurpose === "change_password") {
        let record: typeof otpCodes.$inferSelect | undefined;

        if (otpId) {
          const byId = await db
            .select()
            .from(otpCodes)
            .where(
              and(
                eq(otpCodes.parentId, parent[0].id),
                eq(otpCodes.purpose, "change_password"),
                eq(otpCodes.method, "sms"),
                eq(otpCodes.destination, destination),
                eq(otpCodes.id, otpId),
                pendingCondition
              )
            )
            .limit(1);
          record = byId[0];
        } else {
          const latest = await db
            .select()
            .from(otpCodes)
            .where(
              and(
                eq(otpCodes.parentId, parent[0].id),
                eq(otpCodes.purpose, "change_password"),
                eq(otpCodes.method, "sms"),
                eq(otpCodes.destination, destination),
                pendingCondition
              )
            )
            .orderBy(desc(otpCodes.createdAt))
            .limit(1);
          record = latest[0];
        }

        if (!record) {
          trackOtpEvent("verify_failed", {
            purpose: "change_password",
            method: "sms",
            destination,
            parentId: parent[0].id,
            reason: "not_found",
            otpId,
          });
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid OTP"));
        }

        if (!validateExpiry(record.expiresAt)) {
          await db.update(otpCodes).set({ status: "expired" }).where(eq(otpCodes.id, record.id));
          trackOtpEvent("verify_failed", {
            purpose: "change_password",
            method: "sms",
            destination,
            parentId: parent[0].id,
            reason: "expired",
            otpId: record.id,
          });
          return res.status(400).json(errorResponse(ErrorCode.OTP_EXPIRED, "OTP expired"));
        }

        const ok = await compareOTP(code, record.code);
        if (!ok) {
          const attempts = await incrementAttemptsAtomic(db, record.id);
          if (attempts !== null && attempts >= MAX_ATTEMPTS) {
            await blockOTP(db, record.id);
            trackOtpEvent("blocked", {
              purpose: "change_password",
              method: "sms",
              destination,
              parentId: parent[0].id,
              reason: "max_attempts",
              otpId: record.id,
            });
          }
          if (attempts === null) {
            trackOtpEvent("verify_failed", {
              purpose: "change_password",
              method: "sms",
              destination,
              parentId: parent[0].id,
              reason: "used",
              otpId: record.id,
            });
            return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "OTP already used"));
          }
          trackOtpEvent("verify_failed", {
            purpose: "change_password",
            method: "sms",
            destination,
            parentId: parent[0].id,
            reason: "invalid",
            otpId: record.id,
          });
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid OTP"));
        }

        trackOtpEvent("verify_success", {
          purpose: "change_password",
          method: "sms",
          destination,
          parentId: parent[0].id,
          otpId: record.id,
        });

        return res.json(successResponse({ verified: true }, "OTP verified"));
      }

      const purposeCondition = requestedPurpose
        ? eq(otpCodes.purpose, requestedPurpose)
        : or(
          eq(otpCodes.purpose, "login"),
          eq(otpCodes.purpose, "register")
        );
      const purposeLabel = requestedPurpose || "login_or_register";

      let otpRecord;
      if (otpId) {
        otpRecord = await db
          .select()
          .from(otpCodes)
          .where(
            and(
              eq(otpCodes.parentId, parent[0].id),
              purposeCondition,
              eq(otpCodes.method, "sms"),
              eq(otpCodes.destination, destination),
              eq(otpCodes.id, otpId),
              pendingCondition
            )
          )
          .limit(1);
      } else {
        otpRecord = await db
          .select()
          .from(otpCodes)
          .where(
            and(
              eq(otpCodes.parentId, parent[0].id),
              purposeCondition,
              eq(otpCodes.method, "sms"),
              eq(otpCodes.destination, destination),
              pendingCondition
            )
          )
          .orderBy(desc(otpCodes.createdAt))
          .limit(1);
      }

      const record = otpRecord[0];
      if (!record || !validateExpiry(record.expiresAt)) {
        if (record) {
          await db.update(otpCodes).set({ status: "expired" }).where(eq(otpCodes.id, record.id));
          trackOtpEvent("verify_failed", {
            purpose: record.purpose,
            method: "sms",
            destination,
            parentId: record.parentId || undefined,
            reason: "expired",
            otpId: record.id,
          });
        }
        if (!record) {
          trackOtpEvent("verify_failed", {
            purpose: purposeLabel,
            method: "sms",
            destination,
            parentId: parent[0].id,
            reason: "not_found",
            otpId,
          });
        }
        return res.status(400).json(errorResponse(ErrorCode.OTP_EXPIRED, "Invalid or expired OTP"));
      }

      const ok = await compareOTP(code, record.code);
      if (!ok) {
        const attempts = await incrementAttemptsAtomic(db, record.id);
        if (attempts !== null && attempts >= MAX_ATTEMPTS) {
          await blockOTP(db, record.id);
          trackOtpEvent("blocked", {
            purpose: record.purpose,
            method: "sms",
            destination,
            parentId: record.parentId || undefined,
            reason: "max_attempts",
            otpId: record.id,
          });
        }
        if (attempts === null) {
          trackOtpEvent("verify_failed", {
            purpose: record.purpose,
            method: "sms",
            destination,
            parentId: record.parentId || undefined,
            reason: "used",
            otpId: record.id,
          });
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "OTP already used"));
        }
        trackOtpEvent("verify_failed", {
          purpose: record.purpose,
          method: "sms",
          destination,
          parentId: record.parentId || undefined,
          reason: "invalid",
          otpId: record.id,
        });
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid OTP"));
      }

      const verifiedId = await markVerifiedAtomic(db, record.id);
      if (!verifiedId) {
        trackOtpEvent("verify_failed", {
          purpose: record.purpose,
          method: "sms",
          destination,
          parentId: record.parentId || undefined,
          reason: "used",
          otpId: record.id,
        });
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "OTP already used"));
      }

      await db.update(parents).set({ failedLoginAttempts: 0, lockedUntil: null }).where(eq(parents.id, parent[0].id));

      // Create session token
      const token = signParentAccessToken(parent[0].id);

      console.log(`[SMS_OTP] OTP verified successfully for user ${parent[0].id}`);

      trackOtpEvent("verify_success", {
        purpose: record.purpose,
        method: "sms",
        destination,
        parentId: record.parentId || undefined,
        otpId: record.id,
      });

      const familyHasPin = await hasAnyFamilyPin(parent[0].id, parent[0].pin);

      res.json(successResponse({
        token,
        parentId: parent[0].id,
        userId: parent[0].id,
        uniqueCode: parent[0].uniqueCode,
        hasPin: familyHasPin,
        user: {
          id: parent[0].id,
          email: parent[0].email,
        },
      }, "SMS OTP verified"));
    } catch (error: any) {
      console.error("Verify SMS OTP error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Internal server error"));
    }
  });

  // Send OTP via SMS for password reset
  app.post("/api/auth/forgot-password-sms", otpRequestLimiter, async (req, res) => {
    try {
      if (!(await requireOtpFeatureEnabled(res))) return;

      const { email, phoneNumber } = req.body;
      const normalizedEmail = normalizeEmail(email);

      if (!normalizedEmail && !phoneNumber) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Email or phone number is required"));
      }

      if (!(await isSmsOtpServiceAvailable())) {
        return res.json(successResponse({ sent: true }, "OTP sent to your email"));
      }

      const parent = normalizedEmail
        ? await db.select().from(parents).where(eq(parents.email, normalizedEmail))
        : await db.select().from(parents).where(eq(parents.phoneNumber, phoneNumber));

      // Always return success to prevent user enumeration
      if (!parent[0] || !parent[0].phoneNumber || !parent[0].smsEnabled) {
        return res.json(successResponse({ sent: true }, "If SMS is enabled, you will receive a code"));
      }

      // Check rate limit
      const withinLimit = await checkSMSRateLimit(parent[0].id);
      const ipAddress = req.ip || "0.0.0.0";
      const canSend = await isOtpRequestAllowed(parent[0].phoneNumber, ipAddress);
      if (!withinLimit || !canSend) {
        trackOtpEvent("rate_limited", {
          reason: "request_limit",
          purpose: "reset",
          method: "sms",
          destination: parent[0].phoneNumber,
          parentId: parent[0].id,
          ip: ipAddress,
        });
        return res.json(successResponse({ sent: true }, "If SMS is enabled, you will receive a code"));
      }

      // Generate and send OTP
      const code = generateOTP();
      const codeHash = await hashOTP(code);
      const result = await smsOTPService.sendOTP(
        parent[0].phoneNumber,
        code,
        "password-reset"
      );

      if (!result.success) {
        console.error("SMS send failed for password reset:", result.error);
        return res.json(successResponse({ sent: true }, "If SMS is enabled, you will receive a code"));
      }

      // Store OTP in database (longer expiry for password reset)
      let record;
      try {
        record = await createOTPRecord(db, {
          parentId: parent[0].id,
          purpose: "reset",
          destination: parent[0].phoneNumber,
          provider: "sms",
          codeHash,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          ipAddress,
        });
        await logOtpRequest(parent[0].phoneNumber, ipAddress);
        trackOtpEvent("send", {
          purpose: "reset",
          method: "sms",
          destination: parent[0].phoneNumber,
          parentId: parent[0].id,
          ip: ipAddress,
          otpId: record?.id,
        });
      } catch (dbErr: any) {
        if (dbErr?.message === "OTP_COOLDOWN") {
          trackOtpEvent("rate_limited", {
            reason: "cooldown",
            purpose: "reset",
            method: "sms",
            destination: parent[0].phoneNumber,
            parentId: parent[0].id,
            ip: ipAddress,
          });
          return respondOtpCooldown(res, dbErr.retryAfter || OTP_COOLDOWN_SECONDS);
        }
        console.error("❌ Failed to persist OTP after send:", dbErr);
        return res.json(successResponse({ sent: true }, "If SMS is enabled, you will receive a code"));
      }

      console.log(
        `[SMS_OTP] Password reset SMS sent to ${maskPhoneNumber(parent[0].phoneNumber)}`
      );

      res.json(successResponse({ sent: true, otpId: record?.id }, "If SMS is enabled, you will receive a code"));
    } catch (error: any) {
      console.error("Forgot password SMS error:", error);
      res.json(successResponse({ sent: true }, "If SMS is enabled, you will receive a code"));
    }
  });

  // Verify SMS OTP for password reset
  app.post("/api/auth/verify-reset-otp-sms", otpVerifyLimiter, async (req, res) => {
    try {
      if (!(await requireOtpFeatureEnabled(res))) return;

      const { email, phoneNumber, code, otpId } = req.body;
      const normalizedEmail = normalizeEmail(email);

      if ((!normalizedEmail && !phoneNumber) || !code) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Email or phone number and code are required"));
      }

      const parent = normalizedEmail
        ? await db.select().from(parents).where(eq(parents.email, normalizedEmail))
        : await db.select().from(parents).where(eq(parents.phoneNumber, phoneNumber));
      if (!parent[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "User not found"));
      }

      const destination = phoneNumber || parent[0].phoneNumber;
      if (!destination) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Phone number not configured for SMS OTP"));
      }

      const pendingCondition = or(eq(otpCodes.status, "pending"), isNull(otpCodes.status));

      let otpRecord;
      if (otpId) {
        otpRecord = await db
          .select()
          .from(otpCodes)
          .where(
            and(
              eq(otpCodes.parentId, parent[0].id),
              eq(otpCodes.purpose, "reset"),
              eq(otpCodes.method, "sms"),
              eq(otpCodes.destination, destination),
              eq(otpCodes.id, otpId),
              pendingCondition
            )
          )
          .limit(1);
      } else {
        otpRecord = await db
          .select()
          .from(otpCodes)
          .where(
            and(
              eq(otpCodes.parentId, parent[0].id),
              eq(otpCodes.purpose, "reset"),
              eq(otpCodes.method, "sms"),
              eq(otpCodes.destination, destination),
              pendingCondition
            )
          )
          .orderBy(desc(otpCodes.createdAt))
          .limit(1);
      }

      const record = otpRecord[0];
      if (!record || !validateExpiry(record.expiresAt)) {
        if (record) {
          await db.update(otpCodes).set({ status: "expired" }).where(eq(otpCodes.id, record.id));
          trackOtpEvent("verify_failed", {
            purpose: "reset",
            method: "sms",
            destination,
            parentId: record.parentId || undefined,
            reason: "expired",
            otpId: record.id,
          });
        }
        if (!record) {
          trackOtpEvent("verify_failed", {
            purpose: "reset",
            method: "sms",
            destination,
            parentId: parent[0].id,
            reason: "not_found",
            otpId,
          });
        }
        return res.status(400).json(errorResponse(ErrorCode.OTP_EXPIRED, "Invalid or expired OTP"));
      }

      const ok = await compareOTP(code, record.code);
      if (!ok) {
        const attempts = await incrementAttemptsAtomic(db, record.id);
        if (attempts !== null && attempts >= MAX_ATTEMPTS) {
          await blockOTP(db, record.id);
          trackOtpEvent("blocked", {
            purpose: "reset",
            method: "sms",
            destination,
            parentId: record.parentId || undefined,
            reason: "max_attempts",
            otpId: record.id,
          });
        }
        if (attempts === null) {
          trackOtpEvent("verify_failed", {
            purpose: "reset",
            method: "sms",
            destination,
            parentId: record.parentId || undefined,
            reason: "used",
            otpId: record.id,
          });
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "OTP already used"));
        }
        trackOtpEvent("verify_failed", {
          purpose: "reset",
          method: "sms",
          destination,
          parentId: record.parentId || undefined,
          reason: "invalid",
          otpId: record.id,
        });
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid OTP"));
      }

      trackOtpEvent("verify_success", {
        purpose: "reset",
        method: "sms",
        destination,
        parentId: record.parentId || undefined,
        otpId: record.id,
      });
      res.json(successResponse({ verified: true }, "OTP verified"));
    } catch (error: any) {
      console.error("Verify reset OTP SMS error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "OTP verification failed"));
    }
  });

  // Reset Password via SMS OTP
  app.post("/api/auth/reset-password-sms", async (req, res) => {
    try {
      const { email, phoneNumber, code, newPassword, otpId } = req.body;
      const normalizedEmail = normalizeEmail(email);

      if ((!normalizedEmail && !phoneNumber) || !code || !newPassword) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Phone number or email, OTP, and new password are required"));
      }

      if (newPassword.length < 8) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Password must be at least 8 characters"));
      }

      const parent = normalizedEmail
        ? await db.select().from(parents).where(eq(parents.email, normalizedEmail))
        : await db.select().from(parents).where(eq(parents.phoneNumber, phoneNumber));
      if (!parent[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "User not found"));
      }

      const destination = phoneNumber || parent[0].phoneNumber;
      if (!destination) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Phone number not configured for SMS OTP"));
      }

      const pendingCondition = or(eq(otpCodes.status, "pending"), isNull(otpCodes.status));
      let otpRecord;

      if (otpId) {
        otpRecord = await db
          .select()
          .from(otpCodes)
          .where(
            and(
              eq(otpCodes.parentId, parent[0].id),
              eq(otpCodes.purpose, "reset"),
              eq(otpCodes.method, "sms"),
              eq(otpCodes.destination, destination),
              eq(otpCodes.id, otpId),
              pendingCondition
            )
          )
          .limit(1);
      } else {
        otpRecord = await db
          .select()
          .from(otpCodes)
          .where(
            and(
              eq(otpCodes.parentId, parent[0].id),
              eq(otpCodes.purpose, "reset"),
              eq(otpCodes.method, "sms"),
              eq(otpCodes.destination, destination),
              pendingCondition
            )
          )
          .orderBy(desc(otpCodes.createdAt))
          .limit(1);
      }

      const record = otpRecord[0];
      if (!record || !validateExpiry(record.expiresAt)) {
        if (record) {
          await db.update(otpCodes).set({ status: "expired" }).where(eq(otpCodes.id, record.id));
          trackOtpEvent("verify_failed", {
            purpose: "reset",
            method: "sms",
            destination,
            parentId: record.parentId || undefined,
            reason: "expired",
            otpId: record.id,
          });
        }
        if (!record) {
          trackOtpEvent("verify_failed", {
            purpose: "reset",
            method: "sms",
            destination,
            parentId: parent[0].id,
            reason: "not_found",
            otpId,
          });
        }
        return res.status(400).json(errorResponse(ErrorCode.OTP_EXPIRED, "Invalid or expired OTP"));
      }

      const ok = await compareOTP(code, record.code);
      if (!ok) {
        const attempts = await incrementAttemptsAtomic(db, record.id);
        if (attempts !== null && attempts >= MAX_ATTEMPTS) {
          await blockOTP(db, record.id);
          trackOtpEvent("blocked", {
            purpose: "reset",
            method: "sms",
            destination,
            parentId: record.parentId || undefined,
            reason: "max_attempts",
            otpId: record.id,
          });
        }
        if (attempts === null) {
          trackOtpEvent("verify_failed", {
            purpose: "reset",
            method: "sms",
            destination,
            parentId: record.parentId || undefined,
            reason: "used",
            otpId: record.id,
          });
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "OTP already used"));
        }
        trackOtpEvent("verify_failed", {
          purpose: "reset",
          method: "sms",
          destination,
          parentId: record.parentId || undefined,
          reason: "invalid",
          otpId: record.id,
        });
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid OTP"));
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.update(parents).set({ password: hashedPassword }).where(eq(parents.id, parent[0].id));

      const verifiedId = await markVerifiedAtomic(db, record.id);
      if (!verifiedId) {
        trackOtpEvent("verify_failed", {
          purpose: "reset",
          method: "sms",
          destination,
          parentId: record.parentId || undefined,
          reason: "used",
          otpId: record.id,
        });
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "OTP already used"));
      }
      trackOtpEvent("verify_success", {
        purpose: "reset",
        method: "sms",
        destination,
        parentId: record.parentId || undefined,
        otpId: record.id,
        action: "consume",
      });
      res.json(successResponse({ reset: true }, "Password reset successful"));
    } catch (error: any) {
      console.error("Reset password SMS error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Password reset failed"));
    }
  });

  // ============================================================================
  // Trusted Device / Remember Me Endpoints
  // ============================================================================

  // Refresh session using trusted device token (bypass OTP)
  app.post("/api/auth/device/refresh", async (req, res) => {
    try {
      const { deviceId } = req.body;
      const refreshToken = req.cookies?.device_refresh;

      if (!deviceId || !refreshToken) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Device credentials missing"));
      }

      const deviceIdHash = crypto.createHash("sha256").update(deviceId).digest("hex");
      const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

      // Find the trusted device
      const device = await db
        .select()
        .from(trustedDevices)
        .where(and(
          eq(trustedDevices.deviceIdHash, deviceIdHash),
          eq(trustedDevices.refreshTokenHash, refreshTokenHash),
          isNull(trustedDevices.revokedAt)
        ));

      if (!device[0]) {
        return res.status(401).json(errorResponse(ErrorCode.INVALID_CREDENTIALS, "Invalid device credentials"));
      }

      // Check expiration
      if (new Date() > device[0].expiresAt) {
        // Mark as revoked
        await db
          .update(trustedDevices)
          .set({ revokedAt: new Date() })
          .where(eq(trustedDevices.id, device[0].id));
        return res.status(401).json(errorResponse(ErrorCode.INVALID_CREDENTIALS, "Device token expired"));
      }

      // Get parent info
      const parent = await db.select().from(parents).where(eq(parents.id, device[0].parentId));
      if (!parent[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "User not found"));
      }

      if (parent[0].lockedUntil && new Date() < new Date(parent[0].lockedUntil)) {
        const retryAfter = Math.ceil((new Date(parent[0].lockedUntil).getTime() - Date.now()) / 1000);
        res.set("Retry-After", String(retryAfter));
        return res.status(403).json(errorResponse(ErrorCode.FORBIDDEN, "Account locked. Please try again later."));
      }

      // Generate new refresh token (token rotation for security)
      const newRefreshToken = crypto.randomBytes(48).toString("hex");
      const newRefreshTokenHash = crypto.createHash("sha256").update(newRefreshToken).digest("hex");

      // Update device with new token and last used time
      await db
        .update(trustedDevices)
        .set({
          refreshTokenHash: newRefreshTokenHash,
          lastUsedAt: new Date(),
          userAgent: req.get("user-agent"),
        })
        .where(eq(trustedDevices.id, device[0].id));

      // Create new session
      const sessionToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(sessionToken).digest("hex");
      const sessionExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await db.insert(sessions).values({
        parentId: parent[0].id,
        deviceId,
        tokenHash,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        isActive: true,
        expiresAt: sessionExpiresAt,
      }).onConflictDoUpdate({
        target: [sessions.parentId, sessions.deviceId],
        set: {
          tokenHash,
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
          isActive: true,
          expiresAt: sessionExpiresAt,
        },
      }).catch(() => {
        return db.insert(sessions).values({
          parentId: parent[0].id,
          deviceId,
          tokenHash,
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
          isActive: true,
          expiresAt: sessionExpiresAt,
        });
      });

      // Log successful auto-login
      await db.insert(loginHistory).values({
        parentId: parent[0].id,
        deviceId,
        deviceHash: computeDeviceHash(deviceId, req),
        success: true,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        suspiciousActivity: false,
      });

      // Create JWT
      const jwtToken = signParentAccessToken(parent[0].id);

      await db.update(parents).set({ failedLoginAttempts: 0, lockedUntil: null }).where(eq(parents.id, parent[0].id));

      // Set new refresh token as httpOnly cookie (token rotation)
      res.cookie("device_refresh", newRefreshToken, {
        httpOnly: true,
        secure: process.env["NODE_ENV"] === "production",
        sameSite: "strict",
        maxAge: DEVICE_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
        path: "/api/auth/device",
      });

      res.json(successResponse({
        token: jwtToken,
        sessionToken,
        parentId: parent[0].id,
        deviceTrusted: true,
      }, "Session refreshed successfully"));
    } catch (error: any) {
      console.error("Device refresh error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Device refresh failed"));
    }
  });

  // Get list of trusted devices
  app.get("/api/auth/trusted-devices", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;

      const devices = await db
        .select({
          id: trustedDevices.id,
          deviceLabel: trustedDevices.deviceLabel,
          lastUsedAt: trustedDevices.lastUsedAt,
          createdAt: trustedDevices.createdAt,
          userAgent: trustedDevices.userAgent,
        })
        .from(trustedDevices)
        .where(and(
          eq(trustedDevices.parentId, parentId),
          isNull(trustedDevices.revokedAt)
        ));

      res.json(successResponse({ devices }, "Trusted devices retrieved"));
    } catch (error: any) {
      console.error("Get trusted devices error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to get trusted devices"));
    }
  });

  // Revoke a trusted device
  app.post("/api/auth/trusted-devices/revoke", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { deviceId } = req.body;

      if (!deviceId) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Device ID is required"));
      }

      // Verify device belongs to parent
      const device = await db
        .select()
        .from(trustedDevices)
        .where(and(
          eq(trustedDevices.id, deviceId),
          eq(trustedDevices.parentId, parentId)
        ));

      if (!device[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Device not found"));
      }

      // Revoke device
      await db
        .update(trustedDevices)
        .set({ revokedAt: new Date() })
        .where(eq(trustedDevices.id, deviceId));

      res.json(successResponse({ revoked: true }, "Device revoked successfully"));
    } catch (error: any) {
      console.error("Revoke device error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to revoke device"));
    }
  });

  // Revoke all trusted devices (e.g., on password change)
  app.post("/api/auth/trusted-devices/revoke-all", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;

      await db
        .update(trustedDevices)
        .set({ revokedAt: new Date() })
        .where(and(
          eq(trustedDevices.parentId, parentId),
          isNull(trustedDevices.revokedAt)
        ));

      res.json(successResponse({ revoked: true }, "All devices revoked successfully"));
    } catch (error: any) {
      console.error("Revoke all devices error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to revoke devices"));
    }
  });

  // Get active social login providers (public API - no auth required)
  app.get("/api/auth/social-providers", async (req, res) => {
    try {
      const toggles = await getAuthFeatureToggles();
      if (!toggles.socialLoginEnabled) {
        return res.json(successResponse([], "Social login is disabled"));
      }

      const providers = Object.keys(SOCIAL_PROVIDER_ENV_DEFAULTS)
        .map((provider) => getEnvSocialProviderRuntimeConfig(provider, req))
        .filter((provider): provider is EnvSocialProviderRuntimeConfig => Boolean(provider))
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((provider) => ({
          id: `env-${provider.provider}`,
          provider: provider.provider,
          displayName: provider.displayName,
          displayNameAr: provider.displayNameAr,
          iconUrl: null,
          iconName: provider.iconName,
          sortOrder: provider.sortOrder,
          webEnabled: provider.webEnabled,
          nativeEnabled: provider.nativeEnabled,
        }));

      res.json(successResponse(providers, "Active social providers retrieved"));
    } catch (error: any) {
      console.error("Get social providers error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to get social providers"));
    }
  });

  app.get("/api/auth/oauth/google/native-config", async (req, res) => {
    try {
      const toggles = await getAuthFeatureToggles();
      if (!toggles.socialLoginEnabled) {
        return res.status(503).json(errorResponse(ErrorCode.BAD_REQUEST, "Social login is disabled"));
      }

      // Native-config prefers env values directly; container may not include google-services.json.
      const GOOGLE_WEB_CLIENT_ID_FALLBACK = "277976106301-9qctlaa15pvcs0h1tgniup4m4bco7qas.apps.googleusercontent.com";
      const googleClientIdResolved = String(process.env.GOOGLE_WEB_CLIENT_ID || "").trim() || GOOGLE_WEB_CLIENT_ID_FALLBACK;

      return res.json(successResponse({ clientId: googleClientIdResolved }, "Google native config retrieved"));

      // Capacitor GoogleAuth Android plugin uses requestIdToken() which typically expects the *web/server* client_id
      // (client_type=3) rather than the Android client_id (client_type=1).
      // Deterministic: pick the Web OAuth client_id (client_type=3) from google-services.json
      const googleServicesPathCandidates = [
        path.resolve(process.cwd(), "google-services.json"),
        path.resolve(process.cwd(), "../google-services.json"),
      ];

      const googleServicesPath = googleServicesPathCandidates.find((p) => {
        try {
          return fs.existsSync(p);
        } catch {
          return false;
        }
      });

      if (!googleServicesPath) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "google-services.json not found"));
      }

      const rawGoogleServices = fs.readFileSync(googleServicesPath, "utf8");
      const googleServices = JSON.parse(rawGoogleServices) as {
        client?: Array<{
          oauth_client?: Array<{
            client_type?: number | string;
            client_id?: string;
          }>;
        }>;
      };

      const webClient = googleServices?.client?.[0]?.oauth_client?.find((c) => Number(c.client_type) === 3);
      const googleClientId = webClient?.client_id ? String(webClient.client_id).trim() : "";

      if (!googleClientId) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Google provider is not configured"));
      }

      return res.json(successResponse({ clientId: googleClientIdResolved }, "Google native config retrieved"));
    } catch (error: any) {
      console.error("Get Google native config error:", error);
      return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to get Google config"));
    }
  });

  app.post("/api/auth/oauth/google/native", async (req, res) => {
    try {
      const toggles = await getAuthFeatureToggles();
      if (!toggles.socialLoginEnabled) {
        return res.status(503).json(errorResponse(ErrorCode.BAD_REQUEST, "Social login is disabled"));
      }

      const idToken = String(req.body?.idToken || "").trim();
      if (!idToken) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Google idToken is required"));
      }

      const mode: OAuthMode = String(req.body?.mode || "login").trim().toLowerCase() === "link" ? "link" : "login";
      const returnTo = normalizeInternalReturnToPath(req.body?.returnTo, "/parent-dashboard");
      const linkParentId = mode === "link"
        ? resolveParentIdFromLinkToken(req.body?.linkToken, { allowParentToken: true })
        : null;

      if (mode === "link" && !linkParentId) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, "Parent authentication is required for account linking"));
      }

      const googleClientId = readGoogleAnyClientId();
      if (!googleClientId) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Google provider is not configured"));
      }

      const allowedAudiences = readGoogleAllowedAudiences();

      const profile = await verifyGoogleNativeIdToken(idToken, allowedAudiences);
      if (!profile) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, "Invalid Google token"));
      }

      const parent = mode === "link" && linkParentId
        ? await linkOAuthProfileToParent(linkParentId, profile)
        : await upsertParentFromOAuthProfile(profile);
      const token = signParentAccessToken(parent.parentId);

      const redeemNonce = crypto.randomBytes(16).toString("hex");
      const oauthRedeemKey = `oauth_redeem:${redeemNonce}`;
      const oauthRedeemPayload = JSON.stringify({
        token,
        returnTo,
        provider: "google",
        mode,
      });

      const redisClient = getRedisClient() || createRedisClient();
      if (!redisClient) {
        return res.status(503).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Redis unavailable"));
      }
      await redisClient.set(oauthRedeemKey, oauthRedeemPayload, "EX", 60);

      return res.json(successResponse({
        nonce: redeemNonce,
        returnTo,
      }, "Native Google sign-in successful"));
    } catch (error: any) {
      console.error("Native Google sign-in error:", error);
      const reason = String(error?.message || "").trim();
      if (reason === "ACCOUNT_TEMPORARILY_LOCKED") {
        return res.status(423).json(errorResponse(ErrorCode.UNAUTHORIZED, "Account is temporarily locked"));
      }
      if (reason === "PARENT_NOT_FOUND") {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Parent account not found for linking"));
      }
      return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to authenticate with Google"));
    }
  });

  app.post("/api/auth/oauth/link-token", authMiddleware, async (req: any, res) => {
    try {
      const parentId = String(req.user?.userId || req.user?.parentId || "").trim();
      if (!parentId || req.user?.type !== "parent") {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, "Parent token required"));
      }

      const linkToken = jwt.sign(
        {
          type: "oauth_link",
          parentId,
          userId: parentId,
        },
        JWT_SECRET,
        { expiresIn: "3m" },
      );

      return res.json(successResponse({ linkToken }, "OAuth link token generated"));
    } catch (error: any) {
      console.error("OAuth link token error:", error);
      return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to generate OAuth link token"));
    }
  });

  // Get active OTP providers (public API - no auth required)
  app.get("/api/auth/otp-providers", async (req, res) => {
    try {
      const toggles = await getAuthFeatureToggles();
      if (!toggles.otpEnabled) {
        return res.json(successResponse([], "OTP is disabled"));
      }

      const providers = await getPublicOtpProvidersFromEnv();

      res.json(successResponse(providers, "Active OTP providers retrieved"));
    } catch (error: any) {
      console.error("Get OTP providers error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to get OTP providers"));
    }
  });

  // OAuth redirect endpoint (initiates OAuth flow)
  app.get("/api/auth/oauth/:provider", async (req, res) => {
    let acquiredStartLockKey: string | null = null;
    try {
      const toggles = await getAuthFeatureToggles();
      if (!toggles.socialLoginEnabled) {
        return res.redirect("/parent-auth?error=social_login_disabled");
      }

      const provider = String(req.params?.provider || "").trim().toLowerCase();
      const oauthProvider = getOAuthProvider(provider);
      if (!oauthProvider) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Unsupported provider"));
      }

      const mode = String(req.query?.mode || "login").trim().toLowerCase() === "link" ? "link" : "login";
      const returnTo = normalizeInternalReturnToPath(req.query?.returnTo, "/parent-dashboard");
      const linkParentId = mode === "link" ? resolveParentIdFromLinkToken(req.query?.linkToken) : null;

      if (mode === "link" && !linkParentId) {
        return res.redirect(`/parent-auth?error=oauth_link_auth_required&provider=${provider}`);
      }

      const clientSeed = resolveOAuthClientSeed(req) || crypto.randomBytes(16).toString("hex");
      const fingerprint = buildOAuthClientFingerprint(req, clientSeed);
      const startRateLimit = await checkOAuthStartRateLimit(
        `${provider}|${fingerprint}`,
        OAUTH_START_RATE_LIMIT_MAX,
        OAUTH_START_RATE_LIMIT_WINDOW_SECONDS,
      );
      if (!startRateLimit.allowed) {
        trackOAuthMetric("oauth_lock_conflict_total", { provider, reason: "oauth_rate_limited" });
        res.set("Retry-After", String(startRateLimit.retryAfterSeconds));
        return res.redirect(`/parent-auth?error=oauth_rate_limited&provider=${provider}`);
      }

      const oauthStartLockKey = buildOAuthStartLockKey(provider, fingerprint);

      const canStartOAuth = await acquireOAuthStartLock(
        oauthStartLockKey,
        OAUTH_START_LOCK_TTL_SECONDS,
      );
      if (!canStartOAuth) {
        trackOAuthMetric("oauth_lock_conflict_total", { provider });
        return res.redirect(`/parent-auth?error=oauth_in_progress&provider=${provider}`);
      }
      acquiredStartLockKey = oauthStartLockKey;

      const config = getEnvSocialProviderConfig(provider, req);
      if (!config) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Provider not found or not active"));
      }

      if (!config.clientId) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Provider not configured"));
      }

      const redirectUri = resolveStrictOAuthRedirectUri(config, provider, req);

      // Signed state survives app<->browser context switching (WebView cookies may not).
      const { token: state, nonce: stateNonce } = createOAuthStateToken({ provider, mode, returnTo });
      const oauthCookieDomain = getOAuthCookieDomain();
      const scopes = (config.scopes || oauthProvider.scopes.join(" ")).replace(/,/g, " ").trim();
      const pkce = createPkcePair();

      await saveOAuthLifecycleState(
        provider,
        stateNonce,
        {
          provider,
          mode,
          returnTo,
          nonce: stateNonce,
          linkParentId,
          clientSeed,
          fingerprint,
          redirectUri,
          startLockKey: oauthStartLockKey,
          pkceVerifier: pkce.codeVerifier,
          createdAt: Date.now(),
        },
        OAUTH_STATE_EXPIRY_SECONDS,
      );

      // Replace stale markers from interrupted OAuth attempts.
      clearOAuthCookies(res, oauthCookieDomain);

      // Store state in session or cookie for validation
      res.cookie("oauth_state", state, {
        httpOnly: true,
        secure: process.env["NODE_ENV"] === "production",
        sameSite: "lax",
        path: "/",
        ...(oauthCookieDomain ? { domain: oauthCookieDomain } : {}),
        maxAge: OAUTH_STATE_EXPIRY_MS,
      });

      res.cookie("oauth_mode", mode, {
        httpOnly: true,
        secure: process.env["NODE_ENV"] === "production",
        sameSite: "lax",
        path: "/",
        ...(oauthCookieDomain ? { domain: oauthCookieDomain } : {}),
        maxAge: OAUTH_STATE_EXPIRY_MS,
      });

      res.cookie("oauth_return_to", returnTo, {
        httpOnly: true,
        secure: process.env["NODE_ENV"] === "production",
        sameSite: "lax",
        path: "/",
        ...(oauthCookieDomain ? { domain: oauthCookieDomain } : {}),
        maxAge: OAUTH_STATE_EXPIRY_MS,
      });

      res.cookie(OAUTH_PKCE_COOKIE_NAME, pkce.codeVerifier, {
        httpOnly: true,
        secure: process.env["NODE_ENV"] === "production",
        sameSite: "lax",
        path: "/",
        ...(oauthCookieDomain ? { domain: oauthCookieDomain } : {}),
        maxAge: OAUTH_STATE_EXPIRY_MS,
      });

      res.cookie(OAUTH_CLIENT_SEED_COOKIE_NAME, clientSeed, {
        httpOnly: true,
        secure: process.env["NODE_ENV"] === "production",
        sameSite: "lax",
        path: "/",
        ...(oauthCookieDomain ? { domain: oauthCookieDomain } : {}),
        maxAge: OAUTH_STATE_EXPIRY_MS,
      });

      const authUrl = oauthProvider.buildAuthorizationUrl({
        config,
        redirectUri,
        scopes,
        state,
        codeChallenge: pkce.codeChallenge,
      });
      const safeAuthUrl = normalizeTrustedExternalRedirect(authUrl, oauthProvider.authUrl);
      if (!safeAuthUrl) {
        throw new Error("OAUTH_PROVIDER_AUTH_URL_INVALID");
      }

      trackOAuthMetric("oauth_start_total", { provider });
      res.redirect(safeAuthUrl);
    } catch (error: any) {
      console.error("OAuth redirect error:", error);
      if (acquiredStartLockKey) {
        await releaseOAuthStartLock(acquiredStartLockKey);
      }
      const reason = String(error?.message || "").trim();
      if (reason.startsWith("OAUTH_REDIRECT_URI_")) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Provider redirect URI is invalid or untrusted"));
      }
      if (reason === "OAUTH_PROVIDER_AUTH_URL_INVALID") {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Provider authorization URL is invalid or untrusted"));
      }
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to initiate OAuth"));
    }
  });

  // OAuth popup start endpoint (returns authUrl+oauthStateToken instead of redirect)
  // Only enabled behind feature flags / explicit env to keep backward compatibility.
  const OAUTH_WEB_POPUP_ENABLED = String(process.env["OAUTH_WEB_POPUP_ENABLED"] || "false").trim().toLowerCase() === "true";

  app.post("/api/auth/oauth/:provider/popup/start_duplicate_disabled", async (req, res) => {
    let acquiredStartLockKey: string | null = null;

    try {
      if (!OAUTH_WEB_POPUP_ENABLED) {
        return res.status(404).json(errorResponse(ErrorCode.BAD_REQUEST, "OAuth popup start is disabled"));
      }

      const toggles = await getAuthFeatureToggles();
      if (!toggles.socialLoginEnabled) {
        return res.status(503).json(errorResponse(ErrorCode.BAD_REQUEST, "Social login is disabled"));
      }

      const provider = String(req.params?.provider || "").trim().toLowerCase();
      const oauthProvider = getOAuthProvider(provider);
      if (!oauthProvider) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Unsupported provider"));
      }

      const mode: OAuthMode = String(req.body?.mode || "login").trim().toLowerCase() === "link" ? "link" : "login";
      const returnTo = normalizeInternalReturnToPath(req.body?.returnTo, "/parent-dashboard");

      const clientSeed = resolveOAuthClientSeed(req) || crypto.randomBytes(16).toString("hex");
      const fingerprint = buildOAuthClientFingerprint(req, clientSeed);

      const startRateLimit = await checkOAuthStartRateLimit(
        `${provider}|${fingerprint}`,
        OAUTH_START_RATE_LIMIT_MAX,
        OAUTH_START_RATE_LIMIT_WINDOW_SECONDS,
      );

      if (!startRateLimit.allowed) {
        trackOAuthMetric("oauth_lock_conflict_total", { provider, reason: "oauth_rate_limited" });
        res.set("Retry-After", String(startRateLimit.retryAfterSeconds));
        return res.status(429).json(errorResponse(ErrorCode.RATE_LIMITED, "Too many OAuth start attempts. Please try again."));
      }

      const oauthStartLockKey = buildOAuthStartLockKey(provider, fingerprint);

      const canStartOAuth = await acquireOAuthStartLock(
        oauthStartLockKey,
        OAUTH_START_LOCK_TTL_SECONDS,
      );

      if (!canStartOAuth) {
        trackOAuthMetric("oauth_lock_conflict_total", { provider });
        return res.status(409).json(errorResponse(ErrorCode.BAD_REQUEST, "OAuth flow is already in progress"));
      }

      acquiredStartLockKey = oauthStartLockKey;

      const config = getEnvSocialProviderConfig(provider, req);
      if (!config) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Provider not found or not active"));
      }

      if (!config.clientId) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Provider not configured"));
      }

      const redirectUri = resolveStrictOAuthRedirectUri(config, provider, req);

      const { token: state, nonce: stateNonce } = createOAuthStateToken({ provider, mode, returnTo });
      const oauthCookieDomain = getOAuthCookieDomain();
      const scopes = (config.scopes || oauthProvider.scopes.join(" ")).replace(/,/g, " ").trim();
      const pkce = createPkcePair();

      await saveOAuthLifecycleState(
        provider,
        stateNonce,
        {
          provider,
          mode,
          returnTo,
          nonce: stateNonce,
          linkParentId: mode === "link" ? resolveParentIdFromLinkToken(req.body?.linkToken, { allowParentToken: true }) : null,
          clientSeed,
          fingerprint,
          redirectUri,
          startLockKey: oauthStartLockKey,
          pkceVerifier: pkce.codeVerifier,
          createdAt: Date.now(),
        },
        OAUTH_STATE_EXPIRY_SECONDS,
      );

      // Replace stale markers from interrupted OAuth attempts.
      clearOAuthCookies(res, oauthCookieDomain);

      // Store state in cookie for callback exchange
      res.cookie("oauth_state", state, {
        httpOnly: true,
        secure: process.env["NODE_ENV"] === "production",
        sameSite: "lax",
        path: "/",
        ...(oauthCookieDomain ? { domain: oauthCookieDomain } : {}),
        maxAge: OAUTH_STATE_EXPIRY_MS,
      });

      res.cookie("oauth_mode", mode, {
        httpOnly: true,
        secure: process.env["NODE_ENV"] === "production",
        sameSite: "lax",
        path: "/",
        ...(oauthCookieDomain ? { domain: oauthCookieDomain } : {}),
        maxAge: OAUTH_STATE_EXPIRY_MS,
      });

      res.cookie("oauth_return_to", returnTo, {
        httpOnly: true,
        secure: process.env["NODE_ENV"] === "production",
        sameSite: "lax",
        path: "/",
        ...(oauthCookieDomain ? { domain: oauthCookieDomain } : {}),
        maxAge: OAUTH_STATE_EXPIRY_MS,
      });

      res.cookie(OAUTH_PKCE_COOKIE_NAME, pkce.codeVerifier, {
        httpOnly: true,
        secure: process.env["NODE_ENV"] === "production",
        sameSite: "lax",
        path: "/",
        ...(oauthCookieDomain ? { domain: oauthCookieDomain } : {}),
        maxAge: OAUTH_STATE_EXPIRY_MS,
      });

      res.cookie(OAUTH_CLIENT_SEED_COOKIE_NAME, clientSeed, {
        httpOnly: true,
        secure: process.env["NODE_ENV"] === "production",
        sameSite: "lax",
        path: "/",
        ...(oauthCookieDomain ? { domain: oauthCookieDomain } : {}),
        maxAge: OAUTH_STATE_EXPIRY_MS,
      });

      const authUrl = oauthProvider.buildAuthorizationUrl({
        config,
        redirectUri,
        scopes,
        state,
        codeChallenge: pkce.codeChallenge,
      });

      const safeAuthUrl = normalizeTrustedExternalRedirect(authUrl, oauthProvider.authUrl);
      if (!safeAuthUrl) {
        throw new Error("OAUTH_PROVIDER_AUTH_URL_INVALID");
      }

      trackOAuthMetric("oauth_start_total", { provider });

      return res.json(
        successResponse(
          {
            authUrl: safeAuthUrl,
            oauthStateToken: state,
            provider,
            mode,
            returnTo,
          },
          "OAuth popup start successful"
        ),
      );
    } catch (error: any) {
      console.error("OAuth popup start error:", error);

      if (acquiredStartLockKey) {
        try {
          await releaseOAuthStartLock(acquiredStartLockKey);
        } catch {
          // ignore
        }
      }

      const reason = String(error?.message || "").trim();
      if (reason.startsWith("OAUTH_REDIRECT_URI_")) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Provider redirect URI is invalid or untrusted"));
      }
      if (reason === "OAUTH_PROVIDER_AUTH_URL_INVALID") {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Provider authorization URL is invalid or untrusted"));
      }

      return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to initiate OAuth popup"));
    }
  });

  // OAuth popup start endpoint (returns authUrl+state token instead of redirecting)
  // Feature-flagged to keep backward compatibility.

  app.post("/api/auth/oauth/:provider/popup/start", async (req, res) => {
    let acquiredStartLockKey: string | null = null;

    try {
      if (!OAUTH_WEB_POPUP_ENABLED) {
        return res.status(404).json(errorResponse(ErrorCode.BAD_REQUEST, "OAuth popup start is disabled"));
      }

      const toggles = await getAuthFeatureToggles();
      if (!toggles.socialLoginEnabled) {
        return res.status(503).json(errorResponse(ErrorCode.BAD_REQUEST, "Social login is disabled"));
      }

      const provider = String(req.params?.provider || "").trim().toLowerCase();
      const oauthProvider = getOAuthProvider(provider);
      if (!oauthProvider) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Unsupported provider"));
      }

      const mode: OAuthMode = String(req.body?.mode || "login").trim().toLowerCase() === "link" ? "link" : "login";
      const returnTo = normalizeInternalReturnToPath(req.body?.returnTo, "/parent-dashboard");

      const clientSeed = resolveOAuthClientSeed(req) || crypto.randomBytes(16).toString("hex");
      const fingerprint = buildOAuthClientFingerprint(req, clientSeed);

      const startRateLimit = await checkOAuthStartRateLimit(
        `${provider}|${fingerprint}`,
        OAUTH_START_RATE_LIMIT_MAX,
        OAUTH_START_RATE_LIMIT_WINDOW_SECONDS,
      );

      if (!startRateLimit.allowed) {
        trackOAuthMetric("oauth_lock_conflict_total", { provider, reason: "oauth_rate_limited" });
        res.set("Retry-After", String(startRateLimit.retryAfterSeconds));
        return res.status(429).json(errorResponse(ErrorCode.RATE_LIMITED, "Too many OAuth start attempts"));
      }

      const oauthStartLockKey = buildOAuthStartLockKey(provider, fingerprint);

      const canStartOAuth = await acquireOAuthStartLock(
        oauthStartLockKey,
        OAUTH_START_LOCK_TTL_SECONDS,
      );

      if (!canStartOAuth) {
        trackOAuthMetric("oauth_lock_conflict_total", { provider });
        return res.status(409).json(errorResponse(ErrorCode.BAD_REQUEST, "OAuth flow is already in progress"));
      }

      acquiredStartLockKey = oauthStartLockKey;

      const config = getEnvSocialProviderConfig(provider, req);
      if (!config) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Provider not found or not active"));
      }

      if (!config.clientId) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Provider not configured"));
      }

      const redirectUri = resolveStrictOAuthRedirectUri(config, provider, req);

      const { token: state, nonce: stateNonce } = createOAuthStateToken({ provider, mode, returnTo });
      const oauthCookieDomain = getOAuthCookieDomain();
      const scopes = (config.scopes || oauthProvider.scopes.join(" ")).replace(/,/g, " ").trim();
      const pkce = createPkcePair();

      await saveOAuthLifecycleState(
        provider,
        stateNonce,
        {
          provider,
          mode,
          returnTo,
          nonce: stateNonce,
          linkParentId: mode === "link" ? resolveParentIdFromLinkToken(req.body?.linkToken, { allowParentToken: true }) : null,
          clientSeed,
          fingerprint,
          redirectUri,
          startLockKey: oauthStartLockKey,
          pkceVerifier: pkce.codeVerifier,
          createdAt: Date.now(),
        },
        OAUTH_STATE_EXPIRY_SECONDS,
      );

      // Replace stale markers from interrupted OAuth attempts.
      clearOAuthCookies(res, oauthCookieDomain);

      // Store state in session/cookies for callback exchange
      res.cookie("oauth_state", state, {
        httpOnly: true,
        secure: process.env["NODE_ENV"] === "production",
        sameSite: "lax",
        path: "/",
        ...(oauthCookieDomain ? { domain: oauthCookieDomain } : {}),
        maxAge: OAUTH_STATE_EXPIRY_MS,
      });

      res.cookie("oauth_mode", mode, {
        httpOnly: true,
        secure: process.env["NODE_ENV"] === "production",
        sameSite: "lax",
        path: "/",
        ...(oauthCookieDomain ? { domain: oauthCookieDomain } : {}),
        maxAge: OAUTH_STATE_EXPIRY_MS,
      });

      res.cookie("oauth_return_to", returnTo, {
        httpOnly: true,
        secure: process.env["NODE_ENV"] === "production",
        sameSite: "lax",
        path: "/",
        ...(oauthCookieDomain ? { domain: oauthCookieDomain } : {}),
        maxAge: OAUTH_STATE_EXPIRY_MS,
      });

      res.cookie(OAUTH_PKCE_COOKIE_NAME, pkce.codeVerifier, {
        httpOnly: true,
        secure: process.env["NODE_ENV"] === "production",
        sameSite: "lax",
        path: "/",
        ...(oauthCookieDomain ? { domain: oauthCookieDomain } : {}),
        maxAge: OAUTH_STATE_EXPIRY_MS,
      });

      res.cookie(OAUTH_CLIENT_SEED_COOKIE_NAME, clientSeed, {
        httpOnly: true,
        secure: process.env["NODE_ENV"] === "production",
        sameSite: "lax",
        path: "/",
        ...(oauthCookieDomain ? { domain: oauthCookieDomain } : {}),
        maxAge: OAUTH_STATE_EXPIRY_MS,
      });

      const authUrl = oauthProvider.buildAuthorizationUrl({
        config,
        redirectUri,
        scopes,
        state,
        codeChallenge: pkce.codeChallenge,
      });

      const safeAuthUrl = normalizeTrustedExternalRedirect(authUrl, oauthProvider.authUrl);
      if (!safeAuthUrl) {
        throw new Error("OAUTH_PROVIDER_AUTH_URL_INVALID");
      }

      trackOAuthMetric("oauth_start_total", { provider });

      return res.json(
        successResponse(
          { authUrl: safeAuthUrl, oauthStateToken: state, provider, mode, returnTo },
          "OAuth popup start successful",
        ),
      );
    } catch (error: any) {
      console.error("OAuth popup start error:", error);

      if (acquiredStartLockKey) {
        try {
          await releaseOAuthStartLock(acquiredStartLockKey);
        } catch {
          // ignore
        }
      }

      const reason = String(error?.message || "").trim();
      if (reason.startsWith("OAUTH_REDIRECT_URI_")) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Provider redirect URI is invalid or untrusted"));
      }
      if (reason === "OAUTH_PROVIDER_AUTH_URL_INVALID") {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Provider authorization URL is invalid or untrusted"));
      }

      return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to initiate OAuth popup"));
    }
  });

  // OAuth callback endpoint (receives code from provider)
  // Supports both GET (most providers) and POST (Apple Sign In)
  const oauthCallbackHandler = async (req: any, res: any) => {
    const provider = String(req.params?.provider || "").trim().toLowerCase();
    const oauthCookieDomain = getOAuthCookieDomain();
    const requestFingerprint = buildOAuthClientFingerprint(req);
    let lockKeyToRelease: string | null = null;

    try {
      const toggles = await getAuthFeatureToggles();
      if (!toggles.socialLoginEnabled) {
        return res.redirect("/parent-auth?error=social_login_disabled");
      }

      const oauthProvider = getOAuthProvider(provider);
      if (!oauthProvider) {
        return res.redirect(`/parent-auth?error=oauth_unsupported&provider=${provider}`);
      }

      const params = { ...req.query, ...req.body };
      const { code, state, error: oauthError } = params;
      const signedState = state ? resolveOAuthState(String(state), provider) : null;

      if (oauthError) {
        console.error(`OAuth ${provider} error:`, oauthError);

        if (signedState) {
          const lifecycleFromError = await peekOAuthLifecycleState<OAuthLifecycleState>(provider, signedState.nonce);
          if (lifecycleFromError?.startLockKey) {
            lockKeyToRelease = lifecycleFromError.startLockKey;
          }
        }

        clearOAuthCookies(res, oauthCookieDomain);
        return res.redirect(`/parent-auth?error=oauth_denied&provider=${provider}`);
      }

      if (!code || !state || !signedState) {
        trackOAuthMetric("oauth_invalid_state_total", { provider, reason: "missing_or_invalid_state" });
        clearOAuthCookies(res, oauthCookieDomain);
        return res.redirect(`/parent-auth?error=oauth_invalid_state&provider=${provider}`);
      }

      const callbackNonce = signedState.nonce;

      // Idempotency for duplicate callback redirects (browser prefetch/preload/navigation)
      // Lock per (provider, nonce). If we didn't acquire the lock, poll for the
      // already-saved callback result and redirect to the same final URL.
      const idempotencyRawKey = `oauth_cb_lock:${provider}|${callbackNonce}`;
      let acquiredCallbackLock = false;

      try {
        acquiredCallbackLock = await acquireOAuthStartLock(idempotencyRawKey, 30);
      } catch {
        acquiredCallbackLock = false;
      }

      if (!acquiredCallbackLock) {
        const waitStart = Date.now();
        let existingResult: OAuthCallbackResult | null = null;

        while (Date.now() - waitStart < 5000) {
          existingResult = await getOAuthCallbackResult<OAuthCallbackResult>(provider, callbackNonce);
          if (existingResult?.redirectUrl) break;
          await new Promise((r) => setTimeout(r, 100));
        }

        if (existingResult?.redirectUrl) {
          const safeReplayRedirect = normalizeInternalReturnToPath(
            existingResult.redirectUrl,
            `/parent-auth?error=oauth_failed&provider=${provider}`,
          );
          return res.redirect(safeReplayRedirect);
        }

        return res.redirect(`/parent-auth?error=duplicate_callback&provider=${provider}`);
      }

      const lifecycleState = await consumeOAuthLifecycleState<OAuthLifecycleState>(provider, callbackNonce);
      if (!lifecycleState) {
        // Replay/race handling:
        // Another callback request may have already consumed lifecycle state but not yet persisted callback result.
        // Wait briefly (<=2s) for callback result to appear, then redirect based on it.
        const nonce = signedState.nonce;
        const waitStart = Date.now();
        let existingResult: OAuthCallbackResult | null = null;

        while (Date.now() - waitStart < 2000) {
          existingResult = await getOAuthCallbackResult<OAuthCallbackResult>(provider, nonce);
          if (existingResult?.redirectUrl) break;
          await new Promise((r) => setTimeout(r, 100));
        }

        if (existingResult?.redirectUrl) {
          if (existingResult.startLockKey) {
            lockKeyToRelease = existingResult.startLockKey;
          }

          const safeReplayRedirect = normalizeInternalReturnToPath(
            existingResult.redirectUrl,
            `/parent-auth?error=oauth_invalid_state&provider=${provider}`,
          );
          if (existingResult.fingerprint) {
            const replayFingerprint = buildOAuthClientFingerprint(req, existingResult.clientSeed);
            if (existingResult.fingerprint !== replayFingerprint) {
              trackOAuthMetric("oauth_invalid_state_total", { provider, reason: "replay_fingerprint_mismatch_but_replay_allowed" });
            }
          }

          return res.redirect(safeReplayRedirect);
        }

        trackOAuthMetric("oauth_invalid_state_total", { provider, reason: "state_not_found_or_replayed" });
        return res.redirect(`/parent-auth?error=oauth_invalid_state&provider=${provider}`);
      }

      const expectedFingerprint = buildOAuthClientFingerprint(req, lifecycleState.clientSeed);

      lockKeyToRelease = lifecycleState.startLockKey || buildOAuthStartLockKey(provider, expectedFingerprint);

      const otherMismatch =
        lifecycleState.provider !== provider
        || lifecycleState.nonce !== signedState.nonce
        || lifecycleState.mode !== signedState.mode
        || lifecycleState.returnTo !== signedState.returnTo;

      const fingerprintMismatch = lifecycleState.fingerprint !== expectedFingerprint;

      if (otherMismatch) {
        trackOAuthMetric("oauth_invalid_state_total", { provider, reason: "state_mismatch" });
        clearOAuthCookies(res, oauthCookieDomain);
        return res.redirect(`/parent-auth?error=oauth_invalid_state&provider=${provider}`);
      }

      if (fingerprintMismatch) {
        // Fingerprint is derived from UA + IP segment; popup→browser redirects can legitimately change it.
        // The signed OAuth state nonce is the real replay/CSRF boundary.
        trackOAuthMetric("oauth_invalid_state_total", { provider, reason: "state_fingerprint_mismatch_but_nonce_valid" });
      }

      if (Date.now() - lifecycleState.createdAt > OAUTH_STATE_EXPIRY_MS) {
        trackOAuthMetric("oauth_invalid_state_total", { provider, reason: "state_expired" });
        clearOAuthCookies(res, oauthCookieDomain);
        return res.redirect(`/parent-auth?error=oauth_invalid_state&provider=${provider}`);
      }

      const oauthMode = lifecycleState.mode;
      const oauthReturnTo = lifecycleState.returnTo;
      const oauthPkceVerifier = String(lifecycleState.pkceVerifier || req.cookies?.[OAUTH_PKCE_COOKIE_NAME] || "").trim();

      // Clear oauth state cookie
      clearOAuthCookies(res, oauthCookieDomain);

      if (oauthProvider.requiresPkce && !oauthPkceVerifier) {
        trackOAuthMetric("oauth_pkce_missing_total", { provider });
        return res.redirect(`/parent-auth?error=oauth_pkce_missing&provider=${provider}`);
      }

      // Get provider config
      const config = getEnvSocialProviderConfig(provider, req);
      if (!config) {
        return res.redirect(`/parent-auth?error=oauth_provider_not_found&provider=${provider}`);
      }

      const redirectUri = resolveStrictOAuthRedirectUri(config, provider, req);
      const scopes = (config.scopes || oauthProvider.scopes.join(" ")).replace(/,/g, " ").trim();

      console.log(`[OAuth ${provider}] Token exchange — redirect_uri: ${redirectUri}`);

      const { tokenData, userInfo } = await oauthProvider.exchangeCode({
        code: String(code),
        config,
        redirectUri,
        scopes,
        pkceVerifier: oauthPkceVerifier,
      });

      if (tokenData?.error) {
        const detail = String(tokenData.error || "").trim();
        console.error(`[OAuth ${provider}] Token error:`, tokenData);
        return res.redirect(`/parent-auth?error=oauth_token_failed&provider=${provider}${detail ? `&detail=${encodeURIComponent(detail)}` : ""}`);
      }

      if (!userInfo.email) {
        return res.redirect(`/parent-auth?error=oauth_no_email&provider=${provider}`);
      }

      if (provider === "google" && userInfo.verifiedEmail === false) {
        return res.redirect(`/parent-auth?error=oauth_unverified_email&provider=${provider}`);
      }

      const oauthProfile: OAuthProfile = {
        email: String(userInfo.email || ""),
        name: String(userInfo.name || userInfo.email || "").trim(),
        picture: userInfo.picture || null,
        provider,
        providerId: String(userInfo.id || userInfo.email || `${provider}:${crypto.randomBytes(6).toString("hex")}`),
        accessToken: String(tokenData?.access_token || "") || null,
        refreshToken: String(tokenData?.refresh_token || "") || null,
        tokenExpiresAt: resolveOAuthTokenExpiry(tokenData),
      };

      let parent: { parentId: string; isNew: boolean; parentName: string };
      try {
        if (oauthMode === "link") {
          const linkParentId = String(lifecycleState.linkParentId || "").trim();
          if (!linkParentId) {
            return res.redirect(`/parent-auth?error=oauth_link_auth_required&provider=${provider}`);
          }
          parent = await linkOAuthProfileToParent(linkParentId, oauthProfile);
        } else {
          parent = await upsertParentFromOAuthProfile(oauthProfile);
        }
      } catch (profileError: any) {
        const reason = String(profileError?.message || "").trim();
        if (reason === "ACCOUNT_TEMPORARILY_LOCKED") {
          return res.redirect(`/parent-auth?error=account_locked&provider=${provider}`);
        }
        if (reason === "OAUTH_PROFILE_EMAIL_REQUIRED") {
          return res.redirect(`/parent-auth?error=oauth_no_email&provider=${provider}`);
        }
        if (reason === "PARENT_NOT_FOUND") {
          return res.redirect(`/parent-auth?error=oauth_link_parent_not_found&provider=${provider}`);
        }
        throw profileError;
      }

      // Generate JWT token
      const token = signParentAccessToken(parent.parentId);

      // Redirect to frontend without token; token is redeemed via one-time nonce
      const redeemNonce = crypto.randomBytes(16).toString("hex");
      const oauthRedeemKey = `oauth_redeem:${redeemNonce}`;
      const oauthRedeemPayload = JSON.stringify({
        token,
        returnTo: oauthReturnTo,
        provider,
        mode: oauthMode,
      });

      const redisClient = getRedisClient() || createRedisClient();
      if (!redisClient) {
        throw new Error("OAUTH_REDIS_UNAVAILABLE");
      }
      await redisClient.set(oauthRedeemKey, oauthRedeemPayload, "EX", 60);

      const successRedirect = `/auth/oauth-callback?nonce=${redeemNonce}&provider=${provider}&mode=${oauthMode}`;
      await saveOAuthCallbackResult(provider, signedState.nonce, {
        redirectUrl: successRedirect,
        fingerprint: lifecycleState.fingerprint,
        clientSeed: lifecycleState.clientSeed,
        startLockKey: lockKeyToRelease || undefined,
        completedAt: Date.now(),
      }, OAUTH_CALLBACK_RESULT_TTL_SECONDS);

      trackOAuthMetric("oauth_callback_success_total", { provider });
      const safeSuccessRedirect = normalizeInternalReturnToPath(
        successRedirect,
        `/parent-auth?error=oauth_failed&provider=${provider}`,
      );
      res.redirect(safeSuccessRedirect);
    } catch (error: any) {
      console.error("OAuth callback error:", error);

      const reason = String(error?.message || "").trim();
      if (reason.startsWith("OAUTH_REDIRECT_URI_")) {
        return res.redirect(`/parent-auth?error=oauth_provider_not_found&provider=${provider}`);
      }

      res.redirect(`/parent-auth?error=oauth_failed&provider=${provider}`);
    } finally {
      const fallbackLockKey = buildOAuthStartLockKey(provider, requestFingerprint);
      // Replay/race safety: only release when we have a known real lock key.
      // If lifecycleState was missing, we MUST NOT unlock using fallback guesses.
      if (lockKeyToRelease) {
        await releaseOAuthStartLock(lockKeyToRelease);
      }
    }
  };

  app.get("/api/auth/oauth/:provider/callback", oauthCallbackHandler);
  app.post("/api/auth/oauth/:provider/callback", oauthCallbackHandler);

  app.post("/api/auth/oauth/redeem-nonce", async (req, res) => {
    try {
      const nonce = String(req.body?.nonce || "").trim();
      if (!nonce) {
        return res.status(400).json({ message: "nonce required" });
      }

      const key = `oauth_redeem:${nonce}`;
      const redisClient = getRedisClient() || createRedisClient();
      if (!redisClient) {
        return res.status(404).json({ message: "nonce expired or invalid" });
      }

      const raw = await redisClient.get(key);
      if (!raw) {
        return res.status(404).json({ message: "nonce expired or invalid" });
      }

      await redisClient.del(key);

      const data = JSON.parse(raw) as { token?: string; returnTo?: string };

      const token = typeof data.token === "string" ? data.token : "";
      const returnTo = typeof data.returnTo === "string" ? data.returnTo : "/parent-dashboard";

      if (AUTH_REDEEM_COOKIE_WRITE_ENABLED && token) {
        res.cookie(AUTH_TOKEN_COOKIE_NAME, token, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
        });
      }

      if (!AUTH_REDEEM_RETURNS_TOKEN) {
        return res.json({ returnTo });
      }

      return res.json({ token, returnTo });
    } catch {
      return res.status(404).json({ message: "nonce expired or invalid" });
    }
  });

  app.post("/api/auth/oauth/:provider/cancel", async (req, res) => {
    try {
      const provider = String(req.params?.provider || "").trim().toLowerCase();
      if (!getOAuthProvider(provider)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Unsupported provider"));
      }

      const oauthCookieDomain = getOAuthCookieDomain();
      const fallbackLockKey = buildOAuthStartLockKey(provider, buildOAuthClientFingerprint(req));

      const stateToken = String(req.body?.state || req.cookies?.oauth_state || "").trim();
      const signedState = stateToken ? resolveOAuthState(stateToken, provider) : null;

      if (signedState) {
        const lifecycleState = await consumeOAuthLifecycleState<OAuthLifecycleState>(provider, signedState.nonce);
        if (lifecycleState?.startLockKey) {
          await releaseOAuthStartLock(lifecycleState.startLockKey);
        } else {
          await releaseOAuthStartLock(fallbackLockKey);
        }
      } else {
        await releaseOAuthStartLock(fallbackLockKey);
      }

      clearOAuthCookies(res, oauthCookieDomain);
      return res.json(successResponse({ released: true }, "OAuth flow canceled"));
    } catch (error: any) {
      console.error("OAuth cancel error:", error);
      return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to cancel OAuth flow"));
    }
  });

  // ===== PIN Login (family shared device) =====
  app.post("/api/auth/pin-login", loginLimiter, async (req, res) => {
    try {
      const { pin, familyCode } = req.body;

      if (!pin || !familyCode) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "PIN and family code are required"));
      }

      const pinStr = String(pin).trim();
      const code = String(familyCode).trim().toUpperCase();

      if (!/^\d{4}$/.test(pinStr)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "PIN must be exactly 4 digits"));
      }

      // Find parent by unique code
      const parentList = await db.select().from(parents).where(eq(parents.uniqueCode, code));
      if (!parentList[0]) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, "Invalid family code or PIN"));
      }

      const parent = parentList[0];

      // Check parent PIN first
      if (parent.pin) {
        const parentMatch = await bcrypt.compare(pinStr, parent.pin);
        if (parentMatch) {
          const token = signParentAccessToken(parent.id);
          return res.json(successResponse({
            type: "parent",
            token,
            id: parent.id,
            name: parent.name,
            familyCode: parent.uniqueCode,
          }, "Parent PIN login successful"));
        }
      }

      // Check children PINs
      const links = await db
        .select({ childId: parentChild.childId })
        .from(parentChild)
        .where(eq(parentChild.parentId, parent.id));

      for (const link of links) {
        const childList = await db.select().from(children).where(eq(children.id, link.childId));
        const child = childList[0];
        if (child?.pin) {
          const childMatch = await bcrypt.compare(pinStr, child.pin);
          if (childMatch) {
            const token = jwt.sign({ childId: child.id, parentId: parent.id, type: "child" }, JWT_SECRET, { expiresIn: "7d" });

            // Activate scheduled sessions on child login
            activateOnLoginSessions(child.id).catch((err: any) => console.error("Session activation on PIN login error:", err));
            resumePausedSessions(child.id).catch((err: any) => console.error("Session resume on PIN login error:", err));

            return res.json(successResponse({
              type: "child",
              token,
              id: child.id,
              name: child.name,
              familyCode: parent.uniqueCode,
            }, "Child PIN login successful"));
          }
        }
      }

      return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, "Invalid family code or PIN"));
    } catch (error: any) {
      console.error("PIN login error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "PIN login failed"));
    }
  });

  // ===== Set Parent PIN =====
  app.put("/api/auth/set-pin", authMiddleware, async (req: any, res) => {
    try {
      const { pin } = req.body;
      const parentId = req.user.userId;

      const pinStr = pin ? String(pin).trim() : "";

      // Empty PIN = remove PIN
      if (!pinStr) {
        await db.update(parents).set({ pin: null }).where(eq(parents.id, parentId));
        const parent = await db.select({ uniqueCode: parents.uniqueCode }).from(parents).where(eq(parents.id, parentId));
        return res.json(successResponse({ familyCode: parent[0]?.uniqueCode, pinRemoved: true }, "PIN removed successfully"));
      }

      if (!/^\d{4}$/.test(pinStr)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "PIN must be exactly 4 digits"));
      }

      // Ensure PIN is unique within this family (no child has the same PIN)
      const links = await db
        .select({ childId: parentChild.childId })
        .from(parentChild)
        .where(eq(parentChild.parentId, parentId));

      for (const link of links) {
        const childList = await db.select().from(children).where(eq(children.id, link.childId));
        if (childList[0]?.pin) {
          const conflict = await bcrypt.compare(pinStr, childList[0].pin);
          if (conflict) {
            return res.status(409).json(errorResponse(ErrorCode.CONFLICT, "This PIN is already used by a child. Choose a different PIN."));
          }
        }
      }

      const hashedPin = await bcrypt.hash(pinStr, 10);
      await db.update(parents).set({ pin: hashedPin }).where(eq(parents.id, parentId));

      // Return familyCode for localStorage
      const parent = await db.select({ uniqueCode: parents.uniqueCode }).from(parents).where(eq(parents.id, parentId));

      res.json(successResponse({ familyCode: parent[0]?.uniqueCode }, "PIN set successfully"));
    } catch (error: any) {
      console.error("Set parent PIN error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to set PIN"));
    }
  });

  // ===== Set Child PIN (by parent) =====
  app.put("/api/auth/set-child-pin", authMiddleware, async (req: any, res) => {
    try {
      const { childId, pin } = req.body;
      const parentId = req.user.userId;

      if (!childId) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Child ID is required"));
      }

      // Verify parent owns this child
      const link = await db.select().from(parentChild).where(
        and(eq(parentChild.parentId, parentId), eq(parentChild.childId, childId))
      );
      if (!link[0]) {
        return res.status(403).json(errorResponse(ErrorCode.UNAUTHORIZED, "Not authorized for this child"));
      }

      const pinStr = pin ? String(pin).trim() : "";

      // Empty PIN = remove PIN
      if (!pinStr) {
        await db.update(children).set({ pin: null, pinUpdatedAt: new Date() }).where(eq(children.id, childId));

        // Notify parent about PIN removal
        try {
          await createNotification({
            parentId,
            type: NOTIFICATION_TYPES.CHILD_PIN_CHANGED,
            title: "تم إزالة رمز PIN",
            message: `تم إزالة رمز PIN للطفل — يمكنه الآن الدخول بدون رمز`,
            style: NOTIFICATION_STYLES.TOAST,
            priority: NOTIFICATION_PRIORITIES.NORMAL,
            metadata: { childId, action: "removed" },
          });
        } catch (notifyErr: any) {
          console.error("Failed to send PIN removal notification:", notifyErr);
        }

        return res.json(successResponse({ pinRemoved: true }, "Child PIN removed successfully"));
      }

      // Validate PIN format
      if (!/^\d{4}$/.test(pinStr)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "PIN must be exactly 4 digits"));
      }

      // Check PIN doesn't conflict with parent's PIN
      const parent = await db.select().from(parents).where(eq(parents.id, parentId));
      if (parent[0]?.pin) {
        const conflictParent = await bcrypt.compare(pinStr, parent[0].pin);
        if (conflictParent) {
          return res.status(409).json(errorResponse(ErrorCode.CONFLICT, "This PIN is already used. Choose a different PIN."));
        }
      }

      // Check PIN doesn't conflict with other children's PINs
      const allLinks = await db
        .select({ childId: parentChild.childId })
        .from(parentChild)
        .where(eq(parentChild.parentId, parentId));

      for (const l of allLinks) {
        if (l.childId === childId) continue; // skip self
        const childList = await db.select().from(children).where(eq(children.id, l.childId));
        if (childList[0]?.pin) {
          const conflict = await bcrypt.compare(pinStr, childList[0].pin);
          if (conflict) {
            return res.status(409).json(errorResponse(ErrorCode.CONFLICT, "This PIN is already used by another child. Choose a different PIN."));
          }
        }
      }

      const hashedPin = await bcrypt.hash(pinStr, 10);
      await db.update(children).set({ pin: hashedPin, pinUpdatedAt: new Date() }).where(eq(children.id, childId));

      // Notify parent about PIN change
      try {
        await createNotification({
          parentId,
          type: NOTIFICATION_TYPES.CHILD_PIN_CHANGED,
          title: "تم تغيير رمز PIN",
          message: `تم تحديث رمز PIN للطفل بنجاح`,
          style: NOTIFICATION_STYLES.TOAST,
          priority: NOTIFICATION_PRIORITIES.NORMAL,
          metadata: { childId, action: "set" },
        });
      } catch (notifyErr: any) {
        console.error("Failed to send PIN change notification:", notifyErr);
      }

      res.json(successResponse(null, "Child PIN set successfully"));
    } catch (error: any) {
      console.error("Set child PIN error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to set child PIN"));
    }
  });

  // ===== Add Child with PIN (from parent dashboard) =====
  app.post("/api/auth/add-child-with-pin", authMiddleware, async (req: any, res) => {
    try {
      const { childName, pin, birthday, governorate, academicGrade, schoolId, schoolName, teacherIds } = req.body;
      const parentId = req.user.userId;

      if (!childName || !pin) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Child name and PIN are required"));
      }

      const trimmedName = String(childName).trim();
      if (trimmedName.length < 2 || trimmedName.length > 100) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Child name must be 2-100 characters"));
      }

      const pinStr = String(pin).trim();
      if (!/^\d{4}$/.test(pinStr)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "PIN must be exactly 4 digits"));
      }

      // Check PIN doesn't conflict with parent's PIN
      const parent = await db.select().from(parents).where(eq(parents.id, parentId));
      if (parent[0]?.pin) {
        const conflictParent = await bcrypt.compare(pinStr, parent[0].pin);
        if (conflictParent) {
          return res.status(409).json(errorResponse(ErrorCode.CONFLICT, "This PIN is already used. Choose a different PIN."));
        }
      }

      // Check PIN doesn't conflict with existing children
      const allLinks = await db
        .select({ childId: parentChild.childId })
        .from(parentChild)
        .where(eq(parentChild.parentId, parentId));

      for (const l of allLinks) {
        const childList = await db.select().from(children).where(eq(children.id, l.childId));
        if (childList[0]?.pin) {
          const conflict = await bcrypt.compare(pinStr, childList[0].pin);
          if (conflict) {
            return res.status(409).json(errorResponse(ErrorCode.CONFLICT, "This PIN is already used by another child. Choose a different PIN."));
          }
        }
      }

      const hashedPin = await bcrypt.hash(pinStr, 10);

      // Build child data with optional enhanced fields
      const childData: any = {
        name: trimmedName,
        pin: hashedPin,
      };

      if (birthday) childData.birthday = new Date(birthday);
      if (governorate) childData.governorate = governorate;
      if (academicGrade) childData.academicGrade = academicGrade;
      if (schoolName) childData.schoolName = schoolName;

      // Create child
      const childResult = await db.insert(children).values(childData).returning();
      const newChildId = childResult[0].id;

      // Link to parent
      await db.insert(parentChild).values({
        parentId,
        childId: newChildId,
        relationshipRole: "owner",
        linkSource: "manual",
        linkedByParentId: parentId,
      });

      // Initialize growth tree
      const { childGrowthTrees, childSchoolAssignment, childTeacherAssignment } = await import("../../shared/schema");
      await db.insert(childGrowthTrees).values({
        childId: newChildId,
        currentStage: 1,
        totalGrowthPoints: 0,
      }).onConflictDoNothing();

      // If this parent has an active co-parent sync, mirror the new child immediately.
      const activeSyncs = await db
        .select()
        .from(parentParentSync)
        .where(
          and(
            eq(parentParentSync.primaryParentId, parentId),
            eq(parentParentSync.syncStatus, "active")
          )
        );

      for (const sync of activeSyncs) {
        await db
          .insert(parentChild)
          .values({
            parentId: sync.secondaryParentId,
            childId: newChildId,
            relationshipRole: "co_guardian",
            linkSource: "approved_request",
            linkedByParentId: parentId,
          })
          .onConflictDoNothing();

        const currentShared = Array.isArray(sync.sharedChildren) ? sync.sharedChildren : [];
        if (!currentShared.includes(newChildId)) {
          await db
            .update(parentParentSync)
            .set({
              sharedChildren: [...currentShared, newChildId],
              lastSyncedAt: new Date(),
            })
            .where(eq(parentParentSync.id, sync.id));
        }

        await createNotification({
          parentId: sync.secondaryParentId,
          type: NOTIFICATION_TYPES.CHILD_LINKED,
          title: "👨‍👩‍👧 تمت مزامنة طفل جديد",
          message: `تمت إضافة ${trimmedName} تلقائيًا إلى حسابك عبر ربط الوالدين.`,
          style: NOTIFICATION_STYLES.TOAST,
          priority: NOTIFICATION_PRIORITIES.NORMAL,
          soundAlert: true,
          metadata: {
            childId: newChildId,
            childName: trimmedName,
            source: "parent_sync_auto_share",
          },
        });
      }

      // Assign school if provided
      if (schoolId) {
        try {
          await db.insert(childSchoolAssignment).values({
            childId: newChildId,
            schoolId: schoolId,
          }).onConflictDoNothing();
        } catch (e) {
          console.warn("Could not assign school:", e);
        }
      }

      // Assign teachers if provided
      if (teacherIds && Array.isArray(teacherIds) && teacherIds.length > 0) {
        try {
          for (const teacherId of teacherIds) {
            await db.insert(childTeacherAssignment).values({
              childId: newChildId,
              teacherId: teacherId,
            }).onConflictDoNothing();
          }
        } catch (e) {
          console.warn("Could not assign teachers:", e);
        }
      }

      // Notify parent
      await createNotification({
        parentId,
        type: NOTIFICATION_TYPES.CHILD_LINKED,
        title: "تم إضافة طفل جديد!",
        message: `تم إضافة ${trimmedName} بنجاح وتعيين رمز PIN خاص به`,
        metadata: { childId: newChildId, childName: trimmedName },
      });

      res.json(successResponse({
        child: { id: newChildId, name: trimmedName },
        familyCode: parent[0]?.uniqueCode,
      }, "Child added successfully"));
    } catch (error: any) {
      console.error("Add child with PIN error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to add child"));
    }
  });

  // ===== Get family PIN status =====
  app.get("/api/auth/family-pin-status", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const parent = await db.select().from(parents).where(eq(parents.id, parentId));
      if (!parent[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Parent not found"));
      }

      const links = await db
        .select({ childId: parentChild.childId })
        .from(parentChild)
        .where(eq(parentChild.parentId, parentId));

      const childrenPinStatus = [];
      for (const link of links) {
        const childList = await db.select().from(children).where(eq(children.id, link.childId));
        if (childList[0]) {
          childrenPinStatus.push({
            id: childList[0].id,
            name: childList[0].name,
            hasPin: !!childList[0].pin,
            pinUpdatedAt: childList[0].pinUpdatedAt || null,
          });
        }
      }

      res.json(successResponse({
        parentHasPin: !!parent[0].pin,
        familyCode: parent[0].uniqueCode,
        children: childrenPinStatus,
      }, "Family PIN status retrieved"));
    } catch (error: any) {
      console.error("Family PIN status error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to get PIN status"));
    }
  });
}
