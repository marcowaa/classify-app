import React, { useEffect } from "react";

interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  isArabic?: boolean;
  isLoading?: boolean;
  error?: string;
  onSubmit: () => void;
  length?: number;
  maskedPhone?: string;
  timeoutSeconds?: number;
  onTimeout?: () => void;
  submitText?: string;
  resendText?: string;
  onResend?: () => void;
}

/**
 * OTP code input component with countdown timer
 * Displays 6-digit input with auto-focus and resend option
 */
export const OTPInput: React.FC<OTPInputProps> = ({
  value,
  onChange,
  isArabic = false,
  isLoading = false,
  error,
  onSubmit,
  length = 6,
  maskedPhone,
  timeoutSeconds = 300,
  onTimeout,
  submitText = "✅ التحقق",
  resendText = "إعادة إرسال",
  onResend,
}) => {
  useEffect(() => {
    if (timeoutSeconds <= 0) {
      onTimeout?.();
    }
  }, [timeoutSeconds, onTimeout]);

  const handleResend = () => {
    onResend?.();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const timeLeft = Math.max(0, timeoutSeconds);
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className={`space-y-4 sm:space-y-5 ${isArabic ? "font-[Cairo]" : ""}`}>
      <div className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-3.5 sm:py-4 dark:border-slate-700 dark:bg-slate-800/60">
        <p className="text-sm leading-relaxed text-center text-slate-700 dark:text-slate-300">
          {maskedPhone || "..."}
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold leading-relaxed text-slate-700 dark:text-slate-300 mb-2 text-center">
          Enter Code / أدخل الرمز
        </label>
        <input
          type="text"
          dir="ltr"
          inputMode="numeric"
          value={value}
          onChange={(e) => {
            const cleaned = e.target.value.replace(/\D/g, "").slice(0, length);
            onChange(cleaned);
          }}
          maxLength={length}
          disabled={isLoading}
          className={`w-full px-3 sm:px-4 py-3.5 sm:py-4 text-center text-[26px] sm:text-4xl tracking-[0.2em] max-[380px]:tracking-[0.14em] sm:tracking-[0.45em] leading-none font-bold border-2 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/40 dark:bg-slate-800 dark:border-slate-600 dark:text-white ${
            error
              ? "border-red-500 focus:border-red-500"
              : "border-slate-300 focus:border-blue-500"
          } disabled:opacity-50`}
          placeholder="000000"
        />
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2.5 bg-slate-50 dark:bg-slate-800/40">
        <p className={`text-sm font-bold text-center leading-relaxed ${timeLeft < 30 ? "text-red-500" : "text-slate-600 dark:text-slate-400"}`}>
          Time remaining: {minutes}:{seconds.toString().padStart(2, "0")}
        </p>
        <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${timeLeft < 30 ? "bg-red-500" : "bg-blue-600"}`}
            style={{ width: `${Math.max((timeLeft / Math.max(timeoutSeconds || 1, 1)) * 100, 0)}%` }}
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-500 font-medium text-center">{error}</p>
      )}

      <button
        onClick={onSubmit}
        disabled={isLoading || value.length !== length}
        className="w-full min-h-12 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
      >
        {isLoading ? "جاري التحقق..." : submitText}
      </button>

      <button
        onClick={handleResend}
        disabled={isLoading || timeLeft > 0}
        className={`w-full min-h-11 px-4 py-2 border-2 rounded-xl text-sm sm:text-base font-bold transition-all ${
          isLoading || timeLeft > 0
            ? "border-slate-300 text-slate-500 dark:border-slate-600 dark:text-slate-400 cursor-not-allowed"
            : "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
        }`}
      >
        {isLoading ? "جاري الإرسال..." : `${resendText} (${formatTime(timeLeft)})`}
      </button>
    </div>
  );
};
