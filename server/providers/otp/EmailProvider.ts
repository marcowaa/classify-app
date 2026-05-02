import { OTPProvider } from "./OTPProvider";
import { sendOtpEmail } from "../../mailer";

export class EmailOTPProvider implements OTPProvider {
  async send(destination: string, code: string): Promise<void> {
    await sendOtpEmail(destination, code, "Verification", 5);
  }
}
