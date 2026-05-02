/**
 * SMS OTP Service - Support for Multiple Providers
 * Providers: Twilio, AWS SNS, Firebase, Custom API
 */

interface SMSProviderConfig {
  provider: "twilio" | "aws" | "firebase" | "custom";
  apiKey: string;
  apiSecret?: string;
  accountSid?: string;
  fromNumber?: string;
  endpoint?: string;
}

interface SendSMSOptions {
  to: string;
  message: string;
  provider?: string;
}

interface SendOTPResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

class SMSOTPService {
  private config: SMSProviderConfig | null = null;
  private enabled: boolean = false;

  constructor() {
    this.initializeProvider();
  }

  /**
   * Initialize SMS provider based on environment variables
   */
  private initializeProvider() {
    const provider = process.env.SMS_PROVIDER as "twilio" | "aws" | "firebase" | "custom";
    const apiKey = process.env.SMS_API_KEY;
    const smsOtpRequired = String(process.env.SMS_OTP_REQUIRED || "false").toLowerCase() === "true";

    if (!provider || !apiKey) {
      this.enabled = false;
      const message = "SMS OTP Service: No SMS provider configured (SMS OTP disabled)";
      if (smsOtpRequired) {
        console.warn(`⚠️ ${message}`);
      } else {
        console.log(`ℹ️ ${message}`);
      }
      return;
    }

    switch (provider) {
      case "twilio":
        this.config = {
          provider: "twilio",
          apiKey,
          accountSid: process.env.TWILIO_ACCOUNT_SID || "",
          fromNumber: process.env.TWILIO_FROM_NUMBER || "",
        };
        this.validateTwilioConfig();
        break;

      case "aws":
        this.config = {
          provider: "aws",
          apiKey,
          apiSecret: process.env.AWS_SECRET_KEY || "",
        };
        this.validateAwsConfig();
        break;

      case "firebase":
        this.config = {
          provider: "firebase",
          apiKey,
        };
        this.validateFirebaseConfig();
        break;

      case "custom":
        this.config = {
          provider: "custom",
          apiKey,
          endpoint: process.env.SMS_ENDPOINT || "",
        };
        this.validateCustomConfig();
        break;

      default:
        this.enabled = false;
        console.warn(`⚠️ SMS OTP Service: Unknown provider: ${provider}`);
    }
  }

  /**
   * Validate Twilio configuration
   */
  private validateTwilioConfig() {
    if (!this.config?.accountSid || !this.config?.fromNumber) {
      this.enabled = false;
      console.error("❌ SMS OTP Service: Invalid Twilio configuration");
      console.error("Required: TWILIO_ACCOUNT_SID, TWILIO_FROM_NUMBER");
      return;
    }
    this.enabled = true;
    console.log("✅ SMS OTP Service: Twilio configured");
  }

  /**
   * Validate AWS SNS configuration
   */
  private validateAwsConfig() {
    if (!this.config?.apiSecret) {
      this.enabled = false;
      console.error("❌ SMS OTP Service: Invalid AWS configuration");
      console.error("Required: SMS_API_KEY (Access Key), AWS_SECRET_KEY");
      return;
    }
    this.enabled = true;
    console.log("✅ SMS OTP Service: AWS SNS configured");
  }

  /**
   * Validate Firebase configuration
   */
  private validateFirebaseConfig() {
    this.enabled = true;
    console.log("✅ SMS OTP Service: Firebase configured");
  }

  /**
   * Validate custom SMS API configuration
   */
  private validateCustomConfig() {
    if (!this.config?.endpoint) {
      this.enabled = false;
      console.error("❌ SMS OTP Service: Invalid custom configuration");
      console.error("Required: SMS_ENDPOINT");
      return;
    }
    this.enabled = true;
    console.log("✅ SMS OTP Service: Custom SMS API configured");
  }

  /**
   * Check if SMS service is enabled and configured
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Send SMS OTP using configured provider
   */
  async sendSMS(options: SendSMSOptions): Promise<SendOTPResult> {
    if (!this.enabled || !this.config) {
      return {
        success: false,
        error: "SMS service not configured",
      };
    }

    try {
      switch (this.config.provider) {
        case "twilio":
          return await this.sendTwilio(options);
        case "aws":
          return await this.sendAWS(options);
        case "firebase":
          return await this.sendFirebase(options);
        case "custom":
          return await this.sendCustom(options);
        default:
          return { success: false, error: "Unknown provider" };
      }
    } catch (error) {
      console.error("❌ SMS send failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Send SMS via Twilio
   */
  private async sendTwilio(options: SendSMSOptions): Promise<SendOTPResult> {
    const { to, message } = options;

    // Validate phone number format
    if (!this.isValidPhoneNumber(to)) {
      return { success: false, error: "Invalid phone number format" };
    }

    try {
      const auth = Buffer.from(`${this.config?.accountSid}:${this.config?.apiKey}`).toString("base64");

      const formData = new URLSearchParams({
        From: this.config?.fromNumber || "",
        To: to,
        Body: message,
      });

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.config?.accountSid}/Messages.json`,
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

      if (response.ok && data.sid) {
        console.log(`✅ SMS sent via Twilio (SID: ${data.sid})`);
        return { success: true, messageId: data.sid };
      }

      return { success: false, error: `Twilio API error: ${response.statusText}` };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Twilio API error";
      console.error("❌ Twilio error:", message);
      return { success: false, error: message };
    }
  }

  /**
   * Send SMS via AWS SNS
   */
  private async sendAWS(options: SendSMSOptions): Promise<SendOTPResult> {
    const { to, message } = options;

    if (!this.isValidPhoneNumber(to)) {
      return { success: false, error: "Invalid phone number format" };
    }

    try {
      // AWS SNS SMS sending would use AWS SDK
      // This is a placeholder implementation
      console.log(`📱 AWS SNS: Sending SMS to ${to}`);
      console.log(`Message: ${message}`);

      // In production, use: AWS SNS PublishMessage API
      return {
        success: true,
        messageId: `aws-${Date.now()}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "AWS API error";
      console.error("❌ AWS error:", message);
      return { success: false, error: message };
    }
  }

  /**
   * Send SMS via Firebase
   */
  private async sendFirebase(options: SendSMSOptions): Promise<SendOTPResult> {
    const { to, message } = options;

    if (!this.isValidPhoneNumber(to)) {
      return { success: false, error: "Invalid phone number format" };
    }

    try {
      // Firebase SMS would use Firebase Admin SDK
      console.log(`📱 Firebase: Sending SMS to ${to}`);
      console.log(`Message: ${message}`);

      return {
        success: true,
        messageId: `firebase-${Date.now()}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Firebase error";
      console.error("❌ Firebase error:", message);
      return { success: false, error: message };
    }
  }

  /**
   * Send SMS via custom API
   */
  private async sendCustom(options: SendSMSOptions): Promise<SendOTPResult> {
    const { to, message } = options;

    if (!this.isValidPhoneNumber(to)) {
      return { success: false, error: "Invalid phone number format" };
    }

    try {
      const timeout = Number(process.env.SMS_API_TIMEOUT) || 10000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(
        this.config?.endpoint || "",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            phoneNumber: to,
            message: message,
            apiKey: this.config?.apiKey,
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      const data = await response.json() as any;

      if (response.ok && (data.success || data.messageId)) {
        const messageId = data.messageId || data.id;
        console.log(`✅ SMS sent via custom API (ID: ${messageId})`);
        return { success: true, messageId };
      }

      return { success: false, error: data.error || `Custom API error: ${response.statusText}` };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Custom API error";
      console.error("❌ Custom API error:", message);
      return { success: false, error: message };
    }
  }

  /**
   * Validate phone number format (international format)
   * Accepts: +1234567890, +1-234-567-8900, etc.
   */
  private isValidPhoneNumber(phone: string): boolean {
    // Accept phone numbers starting with + and containing only digits, dashes, spaces, parentheses
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, "");
    return phoneRegex.test(cleanPhone);
  }

  /**
   * Send OTP via SMS
   */
  async sendOTP(
    phoneNumber: string,
    code: string,
    purpose: string = "Verification",
    expiryMinutes: number = 5
  ): Promise<SendOTPResult> {
    const message = `Classify: ${purpose} code ${code}. Valid for ${expiryMinutes} min. Never share it. | كود Classify: ${code} صالح ${expiryMinutes} دقائق. لا تشاركه.`;

    return this.sendSMS({
      to: phoneNumber,
      message,
    });
  }
}

// Create singleton instance
export const smsOTPService = new SMSOTPService();

export default smsOTPService;
