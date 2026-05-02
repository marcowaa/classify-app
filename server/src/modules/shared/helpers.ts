import crypto from "crypto";
import { AUTH_CONFIG } from "../../../../shared/constants";

export function generateOTPCode(length: number = AUTH_CONFIG.otpLength): string {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(min + Math.random() * (max - min + 1)).toString();
}

export function generateUniqueCode(length: number = 8): string {
  return crypto.randomBytes(length).toString("hex").slice(0, length).toUpperCase();
}

export function generateDeviceToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
}

export function maskPhone(phone: string): string {
  if (phone.length <= 6) return "***" + phone.slice(-2);
  return phone.slice(0, 4) + "****" + phone.slice(-4);
}

export function calculateOTPExpiry(minutes: number = AUTH_CONFIG.otpExpiresMinutes): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

export function isExpired(date: Date): boolean {
  return new Date() > new Date(date);
}

export function calculatePagination(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    offset: (page - 1) * limit,
    hasNext: page * limit < total,
    hasPrev: page > 1,
  };
}

export function sanitizeString(str: string): string {
  return str.trim().replace(/[<>]/g, "");
}

export function formatCurrency(amount: number, currency: string = "EGP"): string {
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency,
  }).format(amount);
}

export function formatDate(date: Date, locale: string = "ar-EG"): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

export function formatRelativeTime(date: Date, locale: string = "ar-EG"): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (days > 0) return rtf.format(-days, "day");
  if (hours > 0) return rtf.format(-hours, "hour");
  if (minutes > 0) return rtf.format(-minutes, "minute");
  return rtf.format(-seconds, "second");
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  return keys.reduce((acc, key) => {
    if (key in obj) acc[key] = obj[key];
    return acc;
  }, {} as Pick<T, K>);
}

export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj };
  keys.forEach(key => delete result[key]);
  return result;
}
