/**
 * WhatsApp OTP Service
 * Providers: Twilio WhatsApp API, Custom API
 */


interface WhatsAppProviderConfig {
  provider: "twilio" | "custom";
  apiKey: string;
  accountSid?: string;
  fromNumber?: string;
  endpoint?: string;
  timeoutMs?: number;
}

interface SendOTPResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

class WhatsAppOTPService {
  private static readonly placeholderValue = "********";

  private readString(value: unknown): string {
    if (typeof value !== "string") return "";
    const trimmed = value.trim();
    if (trimmed === WhatsAppOTPService.placeholderValue) return "";
    return trimmed;
  }

  private readProvider(value: unknown): "twilio" | "custom" | null {
    if (value !== "twilio" && value !== "custom") return null;
    return value;
  }

  private readNumber(value: unknown, fallback: number): number {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
  }

  private parseConfig(raw: Record<string, unknown>): WhatsAppProviderConfig | null {
    const provider = this.readProvider(raw["provider"]);
    const apiKey = this.readString(raw["apiKey"]);
    if (!provider || !apiKey) return null;

    if (provider === "twilio") {
      const accountSid = this.readString(raw["accountSid"]);
      const fromNumber = this.readString(raw["fromNumber"]);
      if (!accountSid || !fromNumber) return null;
      return {
        provider,
        apiKey,
        accountSid,
        fromNumber,
        timeoutMs: this.readNumber(raw["timeoutMs"], Number(process.env["WHATSAPP_API_TIMEOUT"] || 10000)),
      };
    }

    const endpoint = this.readString(raw["endpoint"]);
    if (!endpoint) return null;
    return {
      provider,
      apiKey,
      endpoint,
      timeoutMs: this.readNumber(raw["timeoutMs"], Number(process.env["WHATSAPP_API_TIMEOUT"] || 10000)),
    };
  }

  private getEnvConfig(): WhatsAppProviderConfig | null {
    const provider = this.readProvider((process.env["WHATSAPP_PROVIDER"] || "").toLowerCase());
    const apiKey = this.readString(process.env["WHATSAPP_API_KEY"]);
    if (!provider || !apiKey) return null;

    if (provider === "twilio") {
      const accountSid = this.readString(process.env["TWILIO_ACCOUNT_SID"]);
      const fromNumber = this.readString(process.env["TWILIO_WHATSAPP_FROM"]);
      if (!accountSid || !fromNumber) return null;
      return {
        provider,
        apiKey,
        accountSid,
        fromNumber,
        timeoutMs: this.readNumber(process.env["WHATSAPP_API_TIMEOUT"], 10000),
      };
    }

    const endpoint = this.readString(process.env["WHATSAPP_ENDPOINT"]);
    if (!endpoint) return null;
    return {
      provider,
      apiKey,
      endpoint,
      timeoutMs: this.readNumber(process.env["WHATSAPP_API_TIMEOUT"], 10000),
    };
  }

  private async resolveConfig(): Promise<WhatsAppProviderConfig | null> {
    return this.getEnvConfig();
  }

  async isEnabled(): Promise<boolean> {
    const config = await this.resolveConfig();
    return Boolean(config);
  }

  async sendOTP(phoneNumber: string, code: string, purpose = "login", expiryMinutes = 5): Promise<SendOTPResult> {
    const config = await this.resolveConfig();
    if (!config) {
      return { success: false, error: "WhatsApp service not configured" };
    }

    const normalized = this.normalizePhone(phoneNumber);
    if (!normalized) {
      return { success: false, error: "Invalid phone number format" };
    }

    const message = this.buildOtpMessage(code, purpose, expiryMinutes);

    try {
      if (config.provider === "twilio") {
        return await this.sendViaTwilio(config, normalized, message);
      }
      return await this.sendViaCustom(config, normalized, message);
    } catch (error: any) {
      console.error("❌ WhatsApp OTP send failed:", error?.message || error);
      return { success: false, error: error?.message || "Unknown error" };
    }
  }

  private normalizePhone(phone: string): string {
    if (!phone || typeof phone !== "string") return "";
    const trimmed = phone.trim();
    if (!/^\+?[0-9]{8,20}$/.test(trimmed)) return "";
    return trimmed.startsWith("+") ? trimmed : `+${trimmed}`;
  }

  private buildOtpMessage(code: string, purpose: string, expiryMinutes: number): string {
    const normalizedPurpose = purpose === "change-password" ? "change_password" : purpose;
    const purposeText = normalizedPurpose === "reset" || normalizedPurpose === "password-reset"
      ? "Reset your password"
      : normalizedPurpose === "register"
        ? "Complete account registration"
        : normalizedPurpose === "change_password"
          ? "Confirm password change"
          : "Complete login";

    return `Classify OTP: ${code}\n${purposeText}\nValid for ${expiryMinutes} minutes. Do not share this code.`;
  }

  private async sendViaTwilio(config: WhatsAppProviderConfig, phone: string, message: string): Promise<SendOTPResult> {
    const auth = Buffer.from(`${config.accountSid}:${config.apiKey}`).toString("base64");
    const formData = new URLSearchParams({
      From: `whatsapp:${config.fromNumber}`,
      To: `whatsapp:${phone}`,
      Body: message,
    });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      }
    );

    const data = await response.json() as any;
    if (response.ok && data?.sid) {
      return { success: true, messageId: data.sid };
    }

    return {
      success: false,
      error: data?.message || `Twilio WhatsApp error: ${response.statusText}`,
    };
  }

  private async sendViaCustom(config: WhatsAppProviderConfig, phone: string, message: string): Promise<SendOTPResult> {
    const timeout = config.timeoutMs && config.timeoutMs > 0 ? config.timeoutMs : 10000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(config.endpoint || "", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: phone,
          message,
          apiKey: config.apiKey,
          channel: "whatsapp",
        }),
        signal: controller.signal,
      });

      const data = await response.json().catch(() => ({} as any));
      if (!response.ok) {
        return { success: false, error: data?.message || `Custom WhatsApp API error (${response.status})` };
      }

      return { success: true, messageId: data?.id || data?.messageId || `custom-${Date.now()}` };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const whatsappOTPService = new WhatsAppOTPService();
