import { OTPProvider } from "./OTPProvider";
import { smsOTPService } from "../../sms-otp";

export class SmsOTPProvider implements OTPProvider {
  async send(destination: string, code: string): Promise<void> {
    const result = await smsOTPService.sendOTP(destination, code, "Verification", 5);
    if (!result.success) {
      throw new Error(result.error || "SMS send failed");
    }
  }
}
