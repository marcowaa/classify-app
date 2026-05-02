import { createHmac, timingSafeEqual } from "node:crypto";
import jwt from "jsonwebtoken";

export function toStr(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

export function toLower(value: unknown): string {
  return toStr(value).toLowerCase();
}

export function isSuccessStatus(value: unknown): boolean {
  const status = toLower(value);
  return ["success", "paid", "approved", "00", "0", "true", "successful"].includes(status);
}

export function signState(payload: Record<string, any>, jwtSecret: string, expiresIn = "2h"): string {
  return jwt.sign(payload, jwtSecret, { expiresIn } as jwt.SignOptions);
}

export function verifyState(token: string, jwtSecret: string): Record<string, any> {
  const decoded = jwt.verify(token, jwtSecret);
  if (!decoded || typeof decoded !== "object") {
    throw new Error("Invalid payment state");
  }
  return decoded as Record<string, any>;
}

export function hmacSha256(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function safeEquals(a: string, b: string): boolean {
  const left = Buffer.from(String(a || ""), "utf8");
  const right = Buffer.from(String(b || ""), "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function buildCanonicalPayloadString(payload: Record<string, any>, excludeKeys: string[] = []): string {
  const exclude = new Set(excludeKeys.map((k) => k.toLowerCase()));
  return Object.keys(payload)
    .filter((key) => !exclude.has(key.toLowerCase()))
    .sort((a, b) => a.localeCompare(b))
    .map((key) => `${key}=${toStr(payload[key])}`)
    .join("&");
}

export function buildQuery(url: string, params: Record<string, string>): string {
  const query = new URLSearchParams(params);
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${query.toString()}`;
}

export function resolveConfig(config: Record<string, any>, aliases: string[], envKey?: string): string {
  for (const key of aliases) {
    const value = toStr(config[key]);
    if (value) return value;
  }
  if (envKey) {
    const envValue = toStr(process.env[envKey]);
    if (envValue) return envValue;
  }
  return "";
}
