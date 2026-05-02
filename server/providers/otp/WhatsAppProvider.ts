import { OTPProvider } from "./OTPProvider";
import { whatsappOTPService } from "../../whatsapp-otp";

export class WhatsAppOTPProvider implements OTPProvider {
  async send(destination: string, code: string): Promise<void> {
    const result = await whatsappOTPService.sendOTP(destination, code, "Verification", 5);
    if (!result.success) {
      throw new Error(result.error || "WhatsApp send failed");
    }
  }
}
