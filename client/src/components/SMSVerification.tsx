import React from "react";
import { useTranslation } from "react-i18next";
import { PhoneInput } from "./PhoneInput";
import { OTPInput } from "./OTPInput";

interface SMSVerificationProps {
  onPhoneSubmit: (phone: string) => void;
  onOTPSubmit: (otp: string) => void;
  phone: string;
  setPhone: (phone: string) => void;
  countryCode: string;
  setCountryCode: (code: string) => void;
  otp: string;
  setOtp: (otp: string) => void;
  step: "phone" | "otp";
  setStep: (step: "phone" | "otp") => void;
  isLoading?: boolean;
  phoneError?: string;
  otpError?: string;
  isDark?: boolean;
  onCancel?: () => void;
  onResend?: () => void;
}

/**
 * Complete SMS verification component
 * Handles both phone input and OTP verification in a single component
 */
export const SMSVerification: React.FC<SMSVerificationProps> = ({
  onPhoneSubmit,
  onOTPSubmit,
  phone,
  setPhone,
  countryCode,
  setCountryCode,
  otp,
  setOtp,
  step,
  setStep,
  isLoading = false,
  phoneError,
  otpError,
  isDark = false,
  onCancel,
  onResend,
}) => {
  const fullPhone = `${countryCode}${phone}`;

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone && phone.length >= 7) {
      onPhoneSubmit(fullPhone);
    }
  };

  const handleOTPSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length === 6) {
      onOTPSubmit(otp);
    }
  };

  if (step === "otp") {
    return (
      <form onSubmit={handleOTPSubmit} className="space-y-4">
        <OTPInput
          value={otp}
          onChange={setOtp}
          isLoading={isLoading}
          error={otpError}
          onSubmit={() => handleOTPSubmit({ preventDefault: () => {} } as any)}
          maskedPhone={`${countryCode.slice(0, 3)}****${phone.slice(-4)}`}
          onResend={onResend}
        />

        <button
          type="button"
          onClick={() => {
            setStep("phone");
            setOtp("");
          }}
          disabled={isLoading}
          className={`w-full px-4 py-2 border-2 rounded-lg font-bold transition-all ${
            isDark
              ? "border-gray-600 text-gray-300 hover:bg-gray-700"
              : "border-gray-300 text-gray-700 hover:bg-gray-100"
          } disabled:opacity-50`}
        >
          ← رجوع
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handlePhoneSubmit} className="space-y-4">
      <PhoneInput
        value={phone}
        onChange={setPhone}
        countryCode={countryCode}
        onCountryCodeChange={setCountryCode}
        disabled={isLoading}
        error={phoneError}
        placeholder="1234567890"
      />

      <button
        type="submit"
        disabled={isLoading || phone.length < 7}
        className="w-full px-4 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "🔄 جاري الإرسال..." : "📱 إرسال الرمز عبر SMS"}
      </button>

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className={`w-full px-4 py-2 border-2 rounded-lg font-bold transition-all ${
            isDark
              ? "border-gray-600 text-gray-300 hover:bg-gray-700"
              : "border-gray-300 text-gray-700 hover:bg-gray-100"
          } disabled:opacity-50`}
        >
          ❌ إلغاء
        </button>
      )}
    </form>
  );
};
