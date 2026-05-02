import { OTPProvider } from "./OTPProvider";
import { EmailOTPProvider } from "./EmailProvider";
import { SmsOTPProvider } from "./SmsProvider";
import { WhatsAppOTPProvider } from "./WhatsAppProvider";
import { smsOTPService } from "../../sms-otp";
import { whatsappOTPService } from "../../whatsapp-otp";

function isEnvEnabled(key: string, fallback: boolean): boolean {
  const raw = String(process.env[key] || "").trim().toLowerCase();
  if (raw === "true") return true;
  if (raw === "false") return false;
  return fallback;
}

export async function getActiveProviders(): Promise<Array<{ provider: string; instance: OTPProvider }>> {
  const emailEnabled = isEnvEnabled("OTP_EMAIL_ENABLED", true);
  const smsEnabled = isEnvEnabled("OTP_SMS_ENABLED", false) && smsOTPService.isEnabled();
  const whatsappEnabled = isEnvEnabled("OTP_WHATSAPP_ENABLED", false) && (await whatsappOTPService.isEnabled());

  const providers = [
    emailEnabled ? "email" : null,
    smsEnabled ? "sms" : null,
    whatsappEnabled ? "whatsapp" : null,
  ].filter((provider): provider is string => Boolean(provider));

  return providers
    .map((provider) => ({ provider, instance: createProviderInstance(provider) }))
    .filter((p): p is { provider: string; instance: OTPProvider } => p.instance !== null);
}

export function createProviderInstance(provider: string): OTPProvider | null {
  switch (provider) {
    case "email":
      return new EmailOTPProvider();
    case "sms":
      return new SmsOTPProvider();
    case "whatsapp":
      return new WhatsAppOTPProvider();
    default:
      return null;
  }
}

export async function getProviderOrFallback(requested?: string) {
  const providers = await getActiveProviders();
  if (requested) {
    const match = providers.find((p) => p.provider === requested);
    if (match) return match;
  }
  return providers[0] || null;
}
