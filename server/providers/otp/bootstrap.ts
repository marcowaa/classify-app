import { eq } from "drizzle-orm";
import { otpProviders } from "../../../shared/schema";
import { storage } from "../../storage";

const defaultProviders = [
  {
    provider: "email",
    displayName: "Email",
    displayNameAr: "البريد الإلكتروني",
    description: "Send OTP via email using configured provider",
    descriptionAr: "إرسال رمز التحقق عبر البريد الإلكتروني",
    iconName: "Mail",
    sortOrder: 1,
    codeLength: 6,
    expiryMinutes: 5,
    maxAttempts: 3,
    cooldownMinutes: 1,
    isActive: true,
  },
  {
    provider: "sms",
    displayName: "SMS",
    displayNameAr: "رسالة نصية",
    description: "Send OTP via SMS",
    descriptionAr: "إرسال رمز التحقق عبر الرسائل النصية",
    iconName: "Smartphone",
    sortOrder: 2,
    codeLength: 6,
    expiryMinutes: 5,
    maxAttempts: 3,
    cooldownMinutes: 1,
    isActive: false,
  },
  {
    provider: "whatsapp",
    displayName: "WhatsApp",
    displayNameAr: "واتساب",
    description: "Send OTP via WhatsApp",
    descriptionAr: "إرسال رمز التحقق عبر واتساب",
    iconName: "MessageCircle",
    sortOrder: 3,
    codeLength: 6,
    expiryMinutes: 5,
    maxAttempts: 3,
    cooldownMinutes: 1,
    isActive: false,
  },
];

function canAutoActivateEmail(): boolean {
  const hasResend = Boolean(process.env["RESEND_API_KEY"]);
  const hasSmtp = Boolean(process.env["SMTP_HOST"] && process.env["SMTP_USER"] && process.env["SMTP_PASSWORD"]);
  const devMode = process.env["OTP_DEV_MODE"] === "true" || process.env["NODE_ENV"] !== "production";
  return hasResend || hasSmtp || devMode;
}

export async function ensureOtpProviders(): Promise<void> {
  const db = storage.db;
  await db
    .insert(otpProviders)
    .values(defaultProviders)
    .onConflictDoNothing({ target: otpProviders.provider });

  const existing = await db.select().from(otpProviders);

  const hasActive = existing.some((p: typeof existing[number]) => p.isActive);
  if (hasActive) return;

  if (!canAutoActivateEmail()) return;

  const email = existing.find((p: typeof existing[number]) => p.provider === "email");
  if (email) {
    await db
      .update(otpProviders)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(otpProviders.id, email.id));
    return;
  }

  await db
    .insert(otpProviders)
    .values(defaultProviders[0])
    .onConflictDoNothing({ target: otpProviders.provider });
}
