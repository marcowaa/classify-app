import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

export interface SMSOTPOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

/**
 * Hook for managing SMS OTP authentication flow
 * Handles sending SMS OTPs and verifying codes
 */
export const useSMSOTP = (options?: SMSOTPOptions) => {
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+966"); // Saudi Arabia default
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [otp, setOtp] = useState("");

  // Get available OTP methods for email
  const otpMethodsQuery = useQuery({
    queryKey: ["otp-methods"],
    queryFn: async (params) => {
      const email = params.queryKey[1];
      if (!email) return [];
      const res = await fetch(`/api/auth/otp-methods/${email}`);
      if (!res.ok) throw new Error("Failed to fetch OTP methods");
      const data = await res.json();
      const methods = data?.data?.methods ?? data?.methods;
      return Array.isArray(methods) ? methods : [];
    },
    enabled: false, // Manually triggered
  });

  // Send SMS OTP
  const sendSMSMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      const res = await fetch("/api/auth/send-otp-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to send SMS");
      }
      return res.json();
    },
    onSuccess: (data, phoneNumber) => {
      setStep("otp");
      localStorage.setItem("smsPendingPhone", phoneNumber);
      const payload = (data && typeof data === "object" && "data" in data) ? (data as any).data : data;
      if (payload?.otpId) {
        localStorage.setItem("otpId", payload.otpId);
      }
      options?.onSuccess?.(data);
    },
    onError: (error: any) => {
      options?.onError?.(error);
    },
  });

  // Verify SMS OTP for login
  const verifyLoginSMSMutation = useMutation({
    mutationFn: async ({ phoneNumber, code }: { phoneNumber: string; code: string }) => {
      const otpId = localStorage.getItem("otpId") || undefined;
      const res = await fetch("/api/auth/verify-otp-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, code, otpId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Invalid OTP");
      }
      return res.json();
    },
    onSuccess: (data) => {
      localStorage.removeItem("smsPendingPhone");
      localStorage.removeItem("otpId");
      options?.onSuccess?.(data);
    },
    onError: (error: any) => {
      options?.onError?.(error);
    },
  });

  // Verify SMS OTP for password reset
  const verifyResetSMSMutation = useMutation({
    mutationFn: async ({ phoneNumber, code }: { phoneNumber: string; code: string }) => {
      const otpId = localStorage.getItem("otpId") || undefined;
      const res = await fetch("/api/auth/verify-reset-otp-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, code, otpId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Invalid OTP");
      }
      return res.json();
    },
    onSuccess: (data) => {
      localStorage.removeItem("smsPendingPhone");
      localStorage.removeItem("otpId");
      options?.onSuccess?.(data);
    },
    onError: (error: any) => {
      options?.onError?.(error);
    },
  });

  // Get OTP methods for an email
  const getOtpMethods = async (email: string) => {
    try {
      const res = await fetch(`/api/auth/otp-methods/${email}`);
      if (!res.ok) return [];
      const data = await res.json();
      const methods = data?.data?.methods ?? data?.methods;
      return Array.isArray(methods) ? methods : [];
    } catch {
      return [];
    }
  };

  // Send password reset SMS
  const sendPasswordResetSMS = useMutation({
    mutationFn: async (phoneNumber: string) => {
      const res = await fetch("/api/auth/forgot-password-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to send SMS");
      }
      return res.json();
    },
    onSuccess: (data, phoneNumber) => {
      setStep("otp");
      localStorage.setItem("smsPendingPhone", phoneNumber);
      const payload = (data && typeof data === "object" && "data" in data) ? (data as any).data : data;
      if (payload?.otpId) {
        localStorage.setItem("otpId", payload.otpId);
      }
      options?.onSuccess?.(data);
    },
    onError: (error: any) => {
      options?.onError?.(error);
    },
  });

  const reset = () => {
    setPhone("");
    setOtp("");
    setStep("phone");
    setCountryCode("+966");
  };

  return {
    // State
    phone,
    setPhone,
    countryCode,
    setCountryCode,
    step,
    setStep,
    otp,
    setOtp,

    // Mutations
    sendSMSMutation,
    verifyLoginSMSMutation,
    verifyResetSMSMutation,
    sendPasswordResetSMS,

    // Queries
    otpMethodsQuery,
    getOtpMethods,

    // Helpers
    reset,
    fullPhone: `${countryCode}${phone.replace(/^\+/, "")}`,
  };
};
