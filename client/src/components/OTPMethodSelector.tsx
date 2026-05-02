import React from "react";
import { useTranslation } from "react-i18next";
import { FaWhatsapp } from "react-icons/fa";
import { MdSms } from "react-icons/md";

interface MethodSelectorProps {
  selectedMethod: "email" | "sms" | "whatsapp";
  onMethodChange: (method: "email" | "sms" | "whatsapp") => void;
  availableMethods: ("email" | "sms" | "whatsapp")[];
  disabled?: boolean;
  isDark?: boolean;
}

/**
 * OTP method selector component
 * Allows users to choose between Email and SMS for OTP verification
 */
export const OTPMethodSelector: React.FC<MethodSelectorProps> = ({
  selectedMethod,
  onMethodChange,
  availableMethods,
  disabled = false,
  isDark = false,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex gap-2 mb-6 bg-gray-100 dark:bg-gray-700 p-2 rounded-lg">
      {availableMethods.includes("email") && (
        <button
          type="button"
          onClick={() => onMethodChange("email")}
          disabled={disabled}
          className={`flex-1 py-2 px-4 rounded-md font-bold transition-all ${
            selectedMethod === "email"
              ? "bg-blue-500 text-white shadow-md"
              : isDark
              ? "text-gray-300 hover:bg-gray-600"
              : "text-gray-700 hover:bg-gray-200"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <span className="inline-flex items-center gap-2">
            <span aria-hidden="true">📧</span>
            <span>{t("otpMethodSelector.emailMethod")}</span>
          </span>
        </button>
      )}

      {availableMethods.includes("sms") && (
        <button
          type="button"
          onClick={() => onMethodChange("sms")}
          disabled={disabled}
          className={`flex-1 py-2 px-4 rounded-md font-bold transition-all ${
            selectedMethod === "sms"
              ? "bg-green-500 text-white shadow-md"
              : isDark
              ? "text-gray-300 hover:bg-gray-600"
              : "text-gray-700 hover:bg-gray-200"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <span className="inline-flex items-center gap-2">
            <MdSms className="w-4 h-4" aria-hidden="true" />
            <span>{t("otpMethodSelector.smsMethod")}</span>
          </span>
        </button>
      )}

      {availableMethods.includes("whatsapp") && (
        <button
          type="button"
          onClick={() => onMethodChange("whatsapp")}
          disabled={disabled}
          className={`flex-1 py-2 px-4 rounded-md font-bold transition-all ${
            selectedMethod === "whatsapp"
              ? "bg-emerald-600 text-white shadow-md"
              : isDark
              ? "text-gray-300 hover:bg-gray-600"
              : "text-gray-700 hover:bg-gray-200"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <span className="inline-flex items-center gap-2">
            <FaWhatsapp className="w-4 h-4" aria-hidden="true" />
            <span>{t("otpMethodSelector.whatsappMethod")}</span>
          </span>
        </button>
      )}
    </div>
  );
};
