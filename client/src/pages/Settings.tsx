import { getNativeGoogleOAuthCallbackPath, isNativeGoogleSignInAvailable } from "@/lib/nativeGoogleAuth";
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";
import { resolveBrowserSessionChannel } from "@/lib/sessionPriority";
import { ParentNotificationBell } from "@/components/NotificationBell";
import { LanguageSelector } from "@/components/LanguageSelector";
import { User, Shield, Palette, PhoneCall, ArrowLeft, Settings2, MoreVertical, Moon, Sun, Building2, MapPin, FileText, CheckCircle2, Link2 } from "lucide-react";
import { SocialLoginButtons } from "@/components/SocialLoginButtons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { GovernorateSelect } from "@/components/ui/GovernorateSelect";

interface TrustedDevice {
  id: string;
  deviceId: string;
  deviceName: string;
  deviceType: string;
  lastUsedAt: string;
  isTrusted: boolean;
  userAgent?: string;
}

type ParentAuthMethod = "email" | "phone" | "social" | "manual" | "unknown";

interface ParentAuthProfile {
  primaryMethod?: ParentAuthMethod;
  linkedMethods?: ParentAuthMethod[];
  socialProviders?: string[];
  generatedPhoneEmail?: boolean;
  suggestedProfile?: {
    name?: string | null;
    email?: string | null;
    phoneNumber?: string | null;
  };
}

interface ParentInfoPayload {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string | null;
  governorate?: string | null;
  bio?: string | null;
  city?: string | null;
  authProfile?: ParentAuthProfile;
}

function isGeneratedPhoneEmail(email: unknown): boolean {
  const normalized = String(email || "").trim().toLowerCase();
  return Boolean(normalized) && (normalized.endsWith("@phone.local") || normalized.startsWith("phone_"));
}

function shouldAutofillName(name: unknown, email: unknown): boolean {
  const normalizedName = String(name || "").trim();
  if (!normalizedName) return true;

  const loweredName = normalizedName.toLowerCase();
  if (
    loweredName === "parent"
    || loweredName === "parent account"
    || loweredName === "account"
    || loweredName === "user"
    || loweredName === "ولي الأمر"
    || loweredName.startsWith("phone_")
  ) {
    return true;
  }

  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (normalizedEmail.includes("@")) {
    const prefix = normalizedEmail.split("@")[0];
    if (prefix && loweredName === prefix) {
      return true;
    }
  }

  return false;
}

export const Settings = (): JSX.Element => {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const queryClient = useQueryClient();
  const token = localStorage.getItem("token");

  const [tab, setTab] = useState<"profile" | "security" | "appearance" | "contact">("profile");
  const [profileData, setProfileData] = useState({ name: "", email: "", phoneNumber: "", governorate: "", bio: "", city: "" });
  const [passwordData, setPasswordData] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [deletePassword, setDeletePassword] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [otpData, setOtpData] = useState({ method: "email", code: "", otpId: "" });
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showProfilePasswordConfirm, setShowProfilePasswordConfirm] = useState(false);
  const [profilePasswordPromptValue, setProfilePasswordPromptValue] = useState("");
  const [profilePasswordPromptError, setProfilePasswordPromptError] = useState("");
  const [showMobileHeaderMenu, setShowMobileHeaderMenu] = useState(false);
  const [socialLinkStatus, setSocialLinkStatus] = useState<{ provider: string; success: boolean } | null>(null);
  const [roleRequestType, setRoleRequestType] = useState<"teacher" | "school" | "library" | null>(null);
  const [roleRequestPhone, setRoleRequestPhone] = useState("");
  const [roleRequestFlash, setRoleRequestFlash] = useState("");
  const [activeDeviceAction, setActiveDeviceAction] = useState<string | null>(null);
  const [sessionMeta, setSessionMeta] = useState({
    channel: "none" as "child" | "parent" | "family-pin" | "none",
    hasParentToken: false,
    deviceTrusted: false,
    deviceId: "",
    lastRefreshAt: "",
  });
  const [notificationPrefs, setNotificationPrefs] = useState({
    inAppEnabled: true,
    pushEnabled: true,
    quietHoursEnabled: false,
    quietStart: "22:00",
    quietEnd: "07:00",
  });

  const handleBackNavigation = () => {
    const sessionChannel = resolveBrowserSessionChannel();
    if (sessionChannel === "parent" || token) {
      navigate("/parent-dashboard", { replace: true });
      return;
    }

    if (sessionChannel === "child" || localStorage.getItem("childToken")) {
      navigate("/child-games", { replace: true });
      return;
    }

    navigate("/", { replace: true });
  };

  const panelClass = `${isDark ? "bg-slate-800/90 border-slate-700" : "bg-white border-indigo-100"} rounded-2xl p-5 md:p-8 shadow-xl border`;
  const inputClass = `w-full px-4 py-3 text-sm md:text-base border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-500 transition-colors ${isDark ? "bg-slate-700 border-slate-600 text-white" : "border-slate-300 bg-slate-50/70"
    }`;
  const labelClass = `block text-sm md:text-base font-bold mb-2 ${isDark ? "text-slate-200" : "text-slate-700"}`;

  const { data: parentInfoResponse, refetch } = useQuery({
    queryKey: ["parent-info"],
    queryFn: async () => {
      const res = await fetch("/api/parent/info", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    enabled: !!token,
  });

  const parentInfo = (parentInfoResponse && typeof parentInfoResponse === "object" && "data" in parentInfoResponse)
    ? (parentInfoResponse as any).data as ParentInfoPayload
    : (parentInfoResponse as ParentInfoPayload | null);

  const authProfile = parentInfo?.authProfile;

  const { data: contactInfo } = useQuery({
    queryKey: ["contact-info"],
    queryFn: async () => {
      const res = await fetch("/api/support-settings");
      if (!res.ok) return null;
      const json = await res.json();
      const d = json?.data || json;
      return {
        phone: d?.supportPhone || null,
        email: d?.supportEmail || null,
        whatsapp: d?.whatsappNumber || null,
        facebook: d?.facebookUrl || null,
        instagram: d?.instagramUrl || null,
        twitter: d?.twitterUrl || null,
        address: d?.companyName || null,
      };
    },
  });

  const selectedRoleLabel = roleRequestType === "teacher"
    ? t("settings.accountRoleTeacher")
    : roleRequestType === "school"
      ? t("settings.accountRoleSchool")
      : roleRequestType === "library"
        ? t("settings.accountRoleLibrary")
        : "";

  const supportWhatsappDigits = String(contactInfo?.whatsapp || "").replace(/[^0-9]/g, "");
  const preferredContactPhone = String(roleRequestPhone || profileData.phoneNumber || parentInfo?.phoneNumber || "").trim();
  const whatsappRoleRequestHref = supportWhatsappDigits && roleRequestType
    ? `https://wa.me/${supportWhatsappDigits}?text=${encodeURIComponent(
      `${t("settings.accountRoleSectionTitle")} - ${selectedRoleLabel} - ${preferredContactPhone || "-"}`,
    )}`
    : "";

  const selectRoleRequestType = (nextRole: "teacher" | "school" | "library") => {
    setRoleRequestType(nextRole);
    if (!roleRequestPhone.trim()) {
      const fallbackPhone = String(profileData.phoneNumber || parentInfo?.phoneNumber || "").trim();
      if (fallbackPhone) {
        setRoleRequestPhone(fallbackPhone);
      }
    }
  };

  const { data: trustedDevices = [] } = useQuery<TrustedDevice[]>({
    queryKey: ["parent-trusted-devices"],
    queryFn: async () => {
      const res = await fetch("/api/parent/trusted-devices", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json?.data) ? json.data : [];
    },
    enabled: !!token,
  });

  useEffect(() => {
    if (parentInfo) {
      const suggested = authProfile?.suggestedProfile || {};
      const generatedPhoneEmail = isGeneratedPhoneEmail(parentInfo.email);
      const suggestedEmail = String(suggested.email || "").trim().toLowerCase();
      const suggestedName = String(suggested.name || "").trim();
      const suggestedPhone = String(suggested.phoneNumber || "").trim();

      const nextName = suggestedName && shouldAutofillName(parentInfo.name, parentInfo.email)
        ? suggestedName
        : String(parentInfo.name || "");

      const baseEmail = generatedPhoneEmail ? "" : String(parentInfo.email || "");
      const nextEmail = !baseEmail && suggestedEmail ? suggestedEmail : baseEmail;

      const basePhone = String(parentInfo.phoneNumber || "");
      const nextPhone = !basePhone && suggestedPhone ? suggestedPhone : basePhone;

      setProfileData({
        name: nextName,
        email: nextEmail,
        phoneNumber: nextPhone,
        governorate: parentInfo.governorate || "",
        bio: parentInfo.bio || "",
        city: parentInfo.city || "",
      });
      return;
    }
  }, [parentInfo, authProfile]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("classify_notification_prefs");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setNotificationPrefs((prev) => ({
        ...prev,
        inAppEnabled: typeof parsed?.inAppEnabled === "boolean" ? parsed.inAppEnabled : prev.inAppEnabled,
        pushEnabled: typeof parsed?.pushEnabled === "boolean" ? parsed.pushEnabled : prev.pushEnabled,
        quietHoursEnabled: typeof parsed?.quietHoursEnabled === "boolean" ? parsed.quietHoursEnabled : prev.quietHoursEnabled,
        quietStart: typeof parsed?.quietStart === "string" && parsed.quietStart ? parsed.quietStart : prev.quietStart,
        quietEnd: typeof parsed?.quietEnd === "string" && parsed.quietEnd ? parsed.quietEnd : prev.quietEnd,
      }));
    } catch {
    }
  }, []);

  const syncSessionMeta = () => {
    const channel = resolveBrowserSessionChannel();
    const hasParentToken = Boolean(localStorage.getItem("token"));
    const deviceTrusted = localStorage.getItem("deviceTrusted") === "true";
    const deviceId = localStorage.getItem("deviceId") || "";
    const lastRefreshAt = localStorage.getItem("classify_session_last_refresh_at") || "";
    setSessionMeta({ channel, hasParentToken, deviceTrusted, deviceId, lastRefreshAt });
  };

  useEffect(() => {
    syncSessionMeta();
    const onStorage = () => syncSessionMeta();
    const onRefreshed = () => syncSessionMeta();
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onStorage);
    window.addEventListener("classify:session-refreshed", onRefreshed as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onStorage);
      window.removeEventListener("classify:session-refreshed", onRefreshed as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!showMobileHeaderMenu) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowMobileHeaderMenu(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [showMobileHeaderMenu]);

  useEffect(() => {
    const raw = sessionStorage.getItem("classify-social-link-status");
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as { provider?: string; success?: boolean; at?: number };
      const ageMs = Date.now() - Number(parsed.at || 0);
      if (Number.isFinite(ageMs) && ageMs >= 0 && ageMs <= 5 * 60 * 1000) {
        setSocialLinkStatus({ provider: String(parsed.provider || ""), success: Boolean(parsed.success) });
        if (parsed.success) {
          localStorage.setItem("parentAccountClassification", "FULL");
          void refetch();
        }
      }
    } catch {
    } finally {
      sessionStorage.removeItem("classify-social-link-status");
    }
  }, [refetch]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) {
        setShowMobileHeaderMenu(false);
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const normalizeProfileFieldValue = (value: unknown): string => String(value ?? "").trim();

  const buildChangedProfilePayload = (currentPassword?: string) => {
    const payload: Record<string, string | null> = {};
    const parent = parentInfo || null;

    const nextName = normalizeProfileFieldValue(profileData.name);
    const prevName = normalizeProfileFieldValue(parent?.name);
    if (nextName !== prevName) {
      payload.name = nextName;
    }

    const nextEmail = normalizeProfileFieldValue(profileData.email).toLowerCase();
    const prevEmail = normalizeProfileFieldValue(parent?.email).toLowerCase();
    if (nextEmail !== prevEmail) {
      payload.email = nextEmail;
    }

    const nextPhone = normalizeProfileFieldValue(profileData.phoneNumber);
    const prevPhone = normalizeProfileFieldValue(parent?.phoneNumber);
    if (nextPhone !== prevPhone) {
      payload.phoneNumber = nextPhone;
    }

    const nextGovernorate = normalizeProfileFieldValue(profileData.governorate);
    const prevGovernorate = normalizeProfileFieldValue(parent?.governorate);
    if (nextGovernorate !== prevGovernorate) {
      payload.governorate = nextGovernorate || null;
    }

    const nextBio = normalizeProfileFieldValue(profileData.bio);
    const prevBio = normalizeProfileFieldValue(parent?.bio);
    if (nextBio !== prevBio) {
      payload.bio = nextBio || null;
    }

    const nextCity = normalizeProfileFieldValue(profileData.city);
    const prevCity = normalizeProfileFieldValue(parent?.city);
    if (nextCity !== prevCity) {
      payload.city = nextCity || null;
    }

    const trimmedPassword = normalizeProfileFieldValue(currentPassword);
    if (trimmedPassword) {
      payload.currentPassword = trimmedPassword;
    }

    return payload;
  };

  const hasSensitiveProfileChanges = ["name", "email", "phoneNumber", "governorate", "bio", "city"].some((field) => {
    const changedPayload = buildChangedProfilePayload();
    return Object.prototype.hasOwnProperty.call(changedPayload, field);
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (variables?: { currentPassword?: string }) => {
      if (!profileData.name || !profileData.email) {
        throw new Error(t("settings.nameEmailRequired"));
      }

      const payload = buildChangedProfilePayload(variables?.currentPassword);
      const changedKeys = Object.keys(payload).filter((key) => key !== "currentPassword");
      if (changedKeys.length === 0) {
        return { skipped: true };
      }

      const res = await fetch("/api/parent/profile/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || t("settings.updateFailed"));
      }
      return res.json();
    },
    onSuccess: (result: any) => {
      if (result?.skipped) {
        setErrorMessage("");
        return;
      }

      setSuccessMessage(`✅ ${t("settings.updateSuccess")}`);
      setErrorMessage("");
      setShowProfilePasswordConfirm(false);
      setProfilePasswordPromptValue("");
      setProfilePasswordPromptError("");
      refetch();
      setTimeout(() => setSuccessMessage(""), 3000);
    },
    onError: (error: any) => {
      const nextError = error.message || t("settings.updateError");
      setErrorMessage(nextError);
      if (showProfilePasswordConfirm) {
        setProfilePasswordPromptError(nextError);
      }
      setSuccessMessage("");
    },
  });

  const handleSaveProfileClick = () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!hasSensitiveProfileChanges) {
      updateProfileMutation.mutate({});
      return;
    }

    setProfilePasswordPromptError("");
    setProfilePasswordPromptValue("");
    setShowProfilePasswordConfirm(true);
  };

  const handleConfirmProfileUpdate = () => {
    const trimmedPassword = normalizeProfileFieldValue(profilePasswordPromptValue);
    if (!trimmedPassword) {
      setProfilePasswordPromptError(t("settings.profilePasswordPromptRequired"));
      return;
    }

    setProfilePasswordPromptError("");
    updateProfileMutation.mutate({ currentPassword: trimmedPassword });
  };

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (!passwordData.oldPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
        throw new Error(t("settings.allFieldsRequired"));
      }
      if (!otpData.code || !otpData.otpId) {
        throw new Error(t("settings.otpRequired"));
      }
      if (passwordData.newPassword.length < 6) {
        throw new Error(t("settings.passwordMinLength"));
      }
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        throw new Error(t("settings.passwordsNotMatch"));
      }
      if (passwordData.oldPassword === passwordData.newPassword) {
        throw new Error(t("settings.passwordsMustDiffer"));
      }
      const res = await fetch("/api/parent/profile/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          oldPassword: passwordData.oldPassword,
          newPassword: passwordData.newPassword,
          otpCode: otpData.code,
          otpId: otpData.otpId,
          otpMethod: otpData.method,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || t("settings.passwordChangeFailed"));
      }
      return res.json();
    },
    onSuccess: () => {
      setSuccessMessage(`✅ ${t("settings.passwordChangeSuccess")}`);
      setErrorMessage("");
      setPasswordData({ oldPassword: "", newPassword: "", confirmPassword: "" });
      setOtpData({ method: otpData.method, code: "", otpId: "" });
      setTimeout(() => setSuccessMessage(""), 3000);
    },
    onError: (error: any) => {
      setErrorMessage(error.message || t("settings.passwordChangeError"));
      setSuccessMessage("");
    },
  });

  const sendOtpMutation = useMutation({
    mutationFn: async () => {
      if (!parentInfo?.email) {
        throw new Error(t("settings.otpSendFailed"));
      }

      if ((otpData.method === "sms" || otpData.method === "whatsapp") && !parentInfo?.phoneNumber) {
        throw new Error(otpData.method === "whatsapp" ? t("settings.otpWhatsappUnavailable") : t("settings.otpSmsUnavailable"));
      }

      const payload = otpData.method === "sms"
        ? { method: "sms", email: parentInfo.email, phoneNumber: parentInfo.phoneNumber, purpose: "change_password" }
        : otpData.method === "whatsapp"
          ? { method: "whatsapp", email: parentInfo.email, phoneNumber: parentInfo.phoneNumber, purpose: "change_password" }
          : { method: "email", email: parentInfo.email, purpose: "change_password" };

      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok || !body?.success) {
        throw new Error(body?.message || t("settings.otpSendFailed"));
      }

      if (!body?.data?.otpId) {
        throw new Error(t("settings.otpSendFailed"));
      }

      setOtpData((prev) => ({ ...prev, otpId: body.data.otpId }));
      return body;
    },
    onSuccess: () => {
      setSuccessMessage(`✅ ${t("settings.otpSent")}`);
      setErrorMessage("");
      setTimeout(() => setSuccessMessage(""), 3000);
    },
    onError: (error: any) => {
      setErrorMessage(error.message || t("settings.otpSendFailed"));
      setSuccessMessage("");
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      if (!deletePassword) {
        throw new Error(t("settings.deletePasswordRequired"));
      }
      const res = await fetch("/api/parent/delete-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ confirmPassword: deletePassword }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.message || t("settings.deleteFailed"));
      }
      return body;
    },
    onSuccess: () => {
      setSuccessMessage(`✅ ${t("settings.deleteSuccess")}`);
      setErrorMessage("");
      localStorage.removeItem("token");
      setTimeout(() => navigate("/"), 1500);
    },
    onError: (error: any) => {
      setErrorMessage(error.message || t("settings.deleteFailed"));
      setSuccessMessage("");
    },
  });

  const roleRequestMutation = useMutation({
    mutationFn: async () => {
      if (!roleRequestType) {
        throw new Error(t("settings.accountRoleRequestError"));
      }
      if (!roleRequestPhone.trim()) {
        throw new Error(t("settings.accountRolePhoneRequired"));
      }

      const res = await fetch("/api/parent/account-role-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          roleType: roleRequestType,
          phoneNumber: roleRequestPhone.trim(),
        }),
      });

      const body = await res.json();
      if (!res.ok || !body?.success) {
        throw new Error(body?.message || t("settings.accountRoleRequestError"));
      }

      return body;
    },
    onSuccess: () => {
      setRoleRequestPhone("");
      setRoleRequestType(null);
      setRoleRequestFlash(t("settings.accountRoleRequestSuccess"));
      setTimeout(() => setRoleRequestFlash(""), 1000);
    },
    onError: (error: any) => {
      setRoleRequestFlash(error?.message || t("settings.accountRoleRequestError"));
      setTimeout(() => setRoleRequestFlash(""), 2000);
    },
  });

  const revokeTrustedDeviceMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      const res = await fetch(`/api/parent/trusted-devices/${encodeURIComponent(deviceId)}/revoke`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || t("settings.updateError"));
      }
      return json;
    },
    onMutate: (deviceId) => {
      setActiveDeviceAction(deviceId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parent-trusted-devices"] });
      setSuccessMessage(`✅ ${t("childSettings.deviceRemoved", "تم إلغاء الثقة بالجهاز")}`);
      setErrorMessage("");
      setTimeout(() => setSuccessMessage(""), 2500);
    },
    onError: (error: any) => {
      setErrorMessage(error?.message || t("settings.updateError"));
      setSuccessMessage("");
    },
    onSettled: () => {
      setActiveDeviceAction(null);
    },
  });

  const deleteTrustedDeviceMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      const res = await fetch(`/api/parent/trusted-devices/${encodeURIComponent(deviceId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || t("settings.deleteFailed"));
      }
      return json;
    },
    onMutate: (deviceId) => {
      setActiveDeviceAction(deviceId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parent-trusted-devices"] });
      setSuccessMessage(`✅ ${t("childSettings.removed", "تم الحذف")}`);
      setErrorMessage("");
      setTimeout(() => setSuccessMessage(""), 2500);
    },
    onError: (error: any) => {
      setErrorMessage(error?.message || t("settings.deleteFailed"));
      setSuccessMessage("");
    },
    onSettled: () => {
      setActiveDeviceAction(null);
    },
  });

  const refreshSessionMutation = useMutation({
    mutationFn: async () => {
      const deviceId = localStorage.getItem("deviceId") || "";
      if (!deviceId) {
        throw new Error(t("settings.sessionNoDevice"));
      }

      const res = await fetch("/api/auth/device/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ deviceId }),
      });

      const body = await res.json().catch(() => null);
      if (!res.ok || body?.success === false) {
        throw new Error(body?.message || t("settings.sessionRefreshFailed"));
      }

      return body?.data || body;
    },
    onSuccess: (data: any) => {
      if (data?.token) {
        localStorage.setItem("token", String(data.token));
      }
      if (data?.parentId) {
        localStorage.setItem("userId", String(data.parentId));
      }
      if (data?.deviceTrusted) {
        localStorage.setItem("deviceTrusted", "true");
      }
      localStorage.setItem("classify_session_last_refresh_at", new Date().toISOString());
      syncSessionMeta();
      setSuccessMessage(`✅ ${t("settings.sessionRefreshSuccess")}`);
      setErrorMessage("");
      setTimeout(() => setSuccessMessage(""), 2500);
    },
    onError: (error: any) => {
      setErrorMessage(error?.message || t("settings.sessionRefreshFailed"));
      setSuccessMessage("");
    },
  });

  const clearSessionOnThisDevice = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("deviceTrusted");
    localStorage.removeItem("deviceId");
    localStorage.removeItem("classify_session_last_refresh_at");
    syncSessionMeta();
    setSuccessMessage(`✅ ${t("settings.sessionCleared")}`);
    setErrorMessage("");
    setTimeout(() => navigate("/parent-auth"), 800);
  };

  const saveNotificationPreferences = () => {
    try {
      localStorage.setItem("classify_notification_prefs", JSON.stringify(notificationPrefs));
      setSuccessMessage(`✅ ${t("settings.notificationsSaved")}`);
      setErrorMessage("");
      setTimeout(() => setSuccessMessage(""), 2500);
    } catch {
      setErrorMessage(t("settings.updateError"));
      setSuccessMessage("");
    }
  };

  const requestOAuthLinkToken = async (): Promise<string> => {
    const parentToken = String(token || "").trim();
    if (!parentToken) {
      throw new Error(t("settings.sessionExpired"));
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 10_000);
    try {
      const res = await fetch("/api/auth/oauth/link-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${parentToken}`,
        },
        signal: controller.signal,
      });

      const json = await res.json().catch(() => null) as any;
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || t("settings.updateError"));
      }

      const linkToken = String(json?.data?.linkToken || "").trim();
      if (!linkToken) {
        throw new Error(t("settings.updateError"));
      }

      return linkToken;
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  const handleSocialLinkProvider = async (provider: string) => {
    const normalizedProvider = String(provider || "").trim().toLowerCase();
    const safeProvider = encodeURIComponent(normalizedProvider);
    setErrorMessage("");

    let linkToken = "";
    try {
      linkToken = await requestOAuthLinkToken();
    } catch (error: any) {
      setErrorMessage(error?.message || t("settings.updateError"));
      return;
    }

    if (normalizedProvider === "google" && isNativeGoogleSignInAvailable()) {
      try {
        const callbackPath = await getNativeGoogleOAuthCallbackPath({
          mode: "link",
          returnTo: "/settings",
          linkToken,
        });
        window.location.href = callbackPath;
        return;
      } catch (error) {
        console.error("Native Google link failed. Falling back to web OAuth.", error);
      }
    }

    const params = new URLSearchParams({
      mode: "link",
      returnTo: "/settings",
    });
    if (linkToken) {
      params.set("linkToken", linkToken);
    }
    window.location.href = `/api/auth/oauth/${safeProvider}?${params.toString()}`;
  };

  return (
    <div className={`min-h-screen ${isDark ? "bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" : "bg-gradient-to-b from-indigo-50 via-white to-sky-50"}`}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-purple-700 to-purple-800 text-white p-3 md:p-5 shadow-lg border-b border-white/15 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center gap-2">
          <h1 className="text-2xl md:text-4xl font-black tracking-tight inline-flex items-center gap-2 leading-none">
            <Settings2 className="w-6 h-6 md:w-8 md:h-8" />
            {t("settings.title")}
          </h1>
          <div className="flex items-center gap-2">
            <div className="hidden md:block">
              <LanguageSelector />
            </div>
            <ParentNotificationBell />
            <button
              onClick={handleBackNavigation}
              className="px-3 md:px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-xl inline-flex items-center gap-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{t("settings.back")}</span>
            </button>

            <button
              type="button"
              aria-label={t("common.more", "المزيد")}
              aria-haspopup="menu"
              aria-expanded={showMobileHeaderMenu}
              aria-controls="settings-mobile-header-menu"
              onClick={() => setShowMobileHeaderMenu((prev) => !prev)}
              className="md:hidden w-9 h-9 rounded-xl bg-white/10 border border-white/20 inline-flex items-center justify-center"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            <button
              aria-label={t("common.close", "إغلاق")}
              aria-hidden={!showMobileHeaderMenu}
              className={`md:hidden fixed inset-0 z-40 bg-black/25 transition-opacity duration-200 ${showMobileHeaderMenu ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
              onClick={() => setShowMobileHeaderMenu(false)}
            />

            <div
              id="settings-mobile-header-menu"
              role="menu"
              aria-hidden={!showMobileHeaderMenu}
              className={`md:hidden absolute top-full mt-2 ${i18n.language === "ar" ? "left-0" : "right-0"} z-50 w-[min(13rem,calc(100vw-0.75rem))] rounded-2xl border p-2 shadow-2xl backdrop-blur-sm ${isDark ? "bg-slate-900/95 border-slate-700" : "bg-white/95 border-indigo-100 text-slate-800"
                } ${showMobileHeaderMenu ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-1 pointer-events-none"} transition-all duration-200`}
            >
              <div className="px-1 pb-2">
                <LanguageSelector />
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  toggleTheme();
                  setShowMobileHeaderMenu(false);
                }}
                className={`w-full rounded-xl px-3 py-2 text-sm inline-flex items-center gap-2 ${isDark ? "hover:bg-slate-800 text-slate-100" : "hover:bg-indigo-50 text-slate-700"}`}
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                <span>{isDark ? t("settings.lightMode", "الوضع الفاتح") : t("settings.darkMode", "الوضع الداكن")}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto p-3 md:p-6 mt-3 md:mt-7">
        {/* Tabs */}
        <div role="tablist" aria-label={t("settings.title")} className="grid grid-cols-2 md:flex gap-2 mb-5 md:mb-8">
          <button
            onClick={() => setTab("profile")}
            role="tab"
            id="settings-tab-profile"
            aria-selected={tab === "profile"}
            aria-controls="settings-panel-profile"
            className={`px-2.5 md:px-6 min-h-[52px] md:min-h-0 py-2.5 md:py-3 text-sm md:text-base leading-tight font-bold rounded-xl transition-all inline-flex items-center justify-center gap-1.5 md:gap-2 ${tab === "profile"
              ? "bg-blue-500 text-white shadow-lg"
              : isDark ? "bg-slate-700 text-slate-200 hover:bg-slate-600" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
              }`}
          >
            <User className="w-4 h-4" />
            <span>{t("settings.profile")}</span>
          </button>
          <button
            onClick={() => setTab("security")}
            role="tab"
            id="settings-tab-security"
            aria-selected={tab === "security"}
            aria-controls="settings-panel-security"
            className={`px-2.5 md:px-6 min-h-[52px] md:min-h-0 py-2.5 md:py-3 text-sm md:text-base leading-tight font-bold rounded-xl transition-all inline-flex items-center justify-center gap-1.5 md:gap-2 ${tab === "security"
              ? "bg-blue-500 text-white shadow-lg"
              : isDark ? "bg-slate-700 text-slate-200 hover:bg-slate-600" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
              }`}
          >
            <Shield className="w-4 h-4" />
            <span>{t("settings.security")}</span>
          </button>
          <button
            onClick={() => setTab("appearance")}
            role="tab"
            id="settings-tab-appearance"
            aria-selected={tab === "appearance"}
            aria-controls="settings-panel-appearance"
            className={`px-2.5 md:px-6 min-h-[52px] md:min-h-0 py-2.5 md:py-3 text-sm md:text-base leading-tight font-bold rounded-xl transition-all inline-flex items-center justify-center gap-1.5 md:gap-2 ${tab === "appearance"
              ? "bg-blue-500 text-white shadow-lg"
              : isDark ? "bg-slate-700 text-slate-200 hover:bg-slate-600" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
              }`}
          >
            <Palette className="w-4 h-4" />
            <span>{t("settings.appearance")}</span>
          </button>
          <button
            onClick={() => setTab("contact")}
            role="tab"
            id="settings-tab-contact"
            aria-selected={tab === "contact"}
            aria-controls="settings-panel-contact"
            className={`px-2.5 md:px-6 min-h-[52px] md:min-h-0 py-2.5 md:py-3 text-sm md:text-base leading-tight font-bold rounded-xl transition-all inline-flex items-center justify-center gap-1.5 md:gap-2 ${tab === "contact"
              ? "bg-blue-500 text-white shadow-lg"
              : isDark ? "bg-slate-700 text-slate-200 hover:bg-slate-600" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
              }`}
          >
            <PhoneCall className="w-4 h-4" />
            <span>{t("settings.contact")}</span>
          </button>
        </div>

        {/* Profile Tab */}
        {tab === "profile" && (
          <div id="settings-panel-profile" role="tabpanel" aria-labelledby="settings-tab-profile" className={`${panelClass} animate-in fade-in-0 slide-in-from-bottom-1 duration-200`}>
            <h2 className={`text-2xl md:text-4xl font-black mb-5 md:mb-6 leading-tight ${isDark ? "text-white" : "text-gray-800"}`}>
              {t("settings.editProfile")}
            </h2>

            <div className={`mb-5 rounded-2xl border p-4 ${isDark ? "border-slate-700 bg-slate-900/50" : "border-indigo-100 bg-indigo-50/70"}`}>
              <div className="flex items-start gap-2 mb-3">
                <Link2 className={`w-4 h-4 mt-0.5 ${isDark ? "text-indigo-300" : "text-indigo-600"}`} />
                <div>
                  <p className={`font-black text-sm md:text-base ${isDark ? "text-white" : "text-slate-800"}`}>
                    {t("settings.socialLinkTitle", "ربط الحساب السريع")}
                  </p>
                  <p className={`text-xs md:text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                    {t("settings.socialLinkKeepDataHint", "اربط حسابك حتى تحافظ على بياناتك.")}
                  </p>
                </div>
              </div>

              <SocialLoginButtons
                variant="compact"
                className="!space-y-0"
                onProviderClick={handleSocialLinkProvider}
                connectedProviders={Array.from(new Set([
                  ...(Array.isArray(authProfile?.socialProviders) ? authProfile.socialProviders : []),
                  ...(socialLinkStatus?.success && socialLinkStatus.provider ? [socialLinkStatus.provider] : []),
                ]))}
              />

              {socialLinkStatus?.success && (
                <div className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${isDark ? "bg-emerald-900/30 text-emerald-300 border border-emerald-700/40" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {t("settings.socialLinkSuccess", "تم الربط بنجاح عبر {{provider}}", { provider: socialLinkStatus.provider || t("settings.socialProviderGeneric", "الحساب الاجتماعي") })}
                </div>
              )}
            </div>

            {errorMessage && (
              <div className="mb-4 p-4 bg-red-100 border-2 border-red-500 text-red-700 rounded-xl flex items-center gap-2">
                <span>❌</span>
                <span>{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div className="mb-4 p-4 bg-green-100 border-2 border-green-500 text-green-700 rounded-xl flex items-center gap-2">
                <span>✅</span>
                <span>{successMessage}</span>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className={labelClass}>
                  {t("settings.name")}
                </label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  {t("settings.email")}
                </label>
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  {t("settings.phone")}
                </label>
                <input
                  type="tel"
                  value={profileData.phoneNumber}
                  onChange={(e) => setProfileData({ ...profileData, phoneNumber: e.target.value })}
                  className={inputClass}
                  placeholder="01xxxxxxxxx"
                />
              </div>
              <div>
                <label className={`${labelClass} inline-flex items-center gap-1.5`}>
                  <Building2 className="w-4 h-4 opacity-80" />
                  <span>{t("settings.governorate")}</span>
                </label>
                <GovernorateSelect
                  value={profileData.governorate}
                  onChange={(val) => setProfileData({ ...profileData, governorate: val })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={`${labelClass} inline-flex items-center gap-1.5`}>
                  <MapPin className="w-4 h-4 opacity-80" />
                  <span>{t("settings.city")}</span>
                </label>
                <input
                  type="text"
                  value={profileData.city}
                  onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                  className={inputClass}
                  placeholder={t("settings.cityPlaceholder")}
                />
              </div>
              <div>
                <label className={`${labelClass} inline-flex items-center gap-1.5`}>
                  <FileText className="w-4 h-4 opacity-80" />
                  <span>{t("settings.aboutYou")}</span>
                </label>
                <textarea
                  value={profileData.bio}
                  onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                  rows={3}
                  maxLength={500}
                  className={inputClass}
                  placeholder={t("settings.aboutYouPlaceholder")}
                />
              </div>
              <button
                onClick={handleSaveProfileClick}
                disabled={updateProfileMutation.isPending}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl disabled:opacity-50 w-full mt-6 shadow-lg"
              >
                {updateProfileMutation.isPending ? t("settings.saving") : `💾 ${t("settings.saveChanges")}`}
              </button>
            </div>

            <AlertDialog
              open={showProfilePasswordConfirm}
              onOpenChange={(open) => {
                setShowProfilePasswordConfirm(open);
                if (!open) {
                  setProfilePasswordPromptValue("");
                  setProfilePasswordPromptError("");
                }
              }}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("settings.profilePasswordPromptTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("settings.profilePasswordPromptDescription")}
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="space-y-2">
                  <input
                    type="password"
                    value={profilePasswordPromptValue}
                    onChange={(e) => {
                      setProfilePasswordPromptValue(e.target.value);
                      if (profilePasswordPromptError) {
                        setProfilePasswordPromptError("");
                      }
                    }}
                    className={inputClass}
                    placeholder={t("settings.profilePasswordPromptPlaceholder")}
                    autoComplete="current-password"
                  />
                  {profilePasswordPromptError && (
                    <p className="text-sm text-red-600 dark:text-red-300">{profilePasswordPromptError}</p>
                  )}
                </div>

                <AlertDialogFooter>
                  <AlertDialogCancel disabled={updateProfileMutation.isPending}>{t("common.cancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={updateProfileMutation.isPending}
                    onClick={(event) => {
                      event.preventDefault();
                      handleConfirmProfileUpdate();
                    }}
                  >
                    {updateProfileMutation.isPending ? t("settings.saving") : t("settings.profilePasswordPromptConfirm")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {/* Security Tab */}
        {tab === "security" && (
          <div id="settings-panel-security" role="tabpanel" aria-labelledby="settings-tab-security" className={`${panelClass} animate-in fade-in-0 slide-in-from-bottom-1 duration-200`}>
            <h2 className={`text-2xl md:text-4xl font-black mb-5 md:mb-6 leading-tight ${isDark ? "text-white" : "text-gray-800"}`}>
              {t("settings.changePassword")}
            </h2>
            {errorMessage && (
              <div className="mb-4 p-4 bg-red-100 border-2 border-red-500 text-red-700 rounded-xl flex items-center gap-2">
                <span>❌</span>
                <span>{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div className="mb-4 p-4 bg-green-100 border-2 border-green-500 text-green-700 rounded-xl flex items-center gap-2">
                <span>✅</span>
                <span>{successMessage}</span>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className={labelClass}>
                  {t("settings.currentPassword")}
                </label>
                <input
                  type="password"
                  value={passwordData.oldPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  {t("settings.newPassword")}
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  {t("settings.confirmPassword")}
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  {t("settings.otpMethod")}
                </label>
                <select
                  value={otpData.method}
                  onChange={(e) => setOtpData({ method: e.target.value, code: "", otpId: "" })}
                  className={inputClass}
                >
                  <option value="email">{t("settings.otpMethodEmail")}</option>
                  <option value="sms">{t("settings.otpMethodSms")}</option>
                  <option value="whatsapp">{t("settings.otpMethodWhatsapp")}</option>
                </select>
              </div>
              <div>
                <button
                  onClick={() => sendOtpMutation.mutate()}
                  disabled={sendOtpMutation.isPending}
                  className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl disabled:opacity-50 w-full shadow-lg"
                >
                  {sendOtpMutation.isPending ? t("settings.sendingOtp") : `📨 ${t("settings.sendOtp")}`}
                </button>
              </div>
              <div>
                <label className={labelClass}>
                  {t("settings.otpCode")}
                </label>
                <input
                  type="text"
                  value={otpData.code}
                  onChange={(e) => setOtpData({ ...otpData, code: e.target.value })}
                  className={inputClass}
                />
              </div>
              <button
                onClick={() => changePasswordMutation.mutate()}
                disabled={changePasswordMutation.isPending}
                className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl disabled:opacity-50 w-full mt-6 shadow-lg"
              >
                {changePasswordMutation.isPending ? t("settings.changingPassword") : `🔐 ${t("settings.changePassword")}`}
              </button>
            </div>

            <div className={`mt-8 rounded-2xl border p-5 ${isDark ? "border-slate-700 bg-slate-900/50" : "border-slate-200 bg-slate-50/70"}`}>
              <h3 className={`text-lg font-black mb-1 ${isDark ? "text-white" : "text-slate-800"}`}>
                {t("settings.sessionTitle")}
              </h3>
              <p className={`text-xs mb-3 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                {t("settings.sessionDescription")}
              </p>

              <div className="space-y-2 text-sm">
                <p className={isDark ? "text-slate-200" : "text-slate-700"}>
                  <span className="font-semibold">{t("settings.sessionChannelLabel")}: </span>
                  {
                    sessionMeta.channel === "parent"
                      ? t("settings.sessionChannelParent")
                      : sessionMeta.channel === "child"
                        ? t("settings.sessionChannelChild")
                        : sessionMeta.channel === "family-pin"
                          ? t("settings.sessionChannelFamily")
                          : t("settings.sessionChannelNone")
                  }
                </p>
                <p className={isDark ? "text-slate-200" : "text-slate-700"}>
                  <span className="font-semibold">{t("settings.sessionTokenStatusLabel")}: </span>
                  {sessionMeta.hasParentToken ? t("common.active", "نشط") : t("common.inactive", "غير نشط")}
                </p>
                <p className={isDark ? "text-slate-200" : "text-slate-700"}>
                  <span className="font-semibold">{t("settings.sessionDeviceTrustedLabel")}: </span>
                  {sessionMeta.deviceTrusted ? t("common.yes", "نعم") : t("common.no", "لا")}
                </p>
                {sessionMeta.lastRefreshAt && (
                  <p className={isDark ? "text-slate-300" : "text-slate-600"}>
                    {t("settings.sessionLastRefresh", {
                      date: new Date(sessionMeta.lastRefreshAt).toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-US"),
                    })}
                  </p>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => refreshSessionMutation.mutate()}
                  disabled={refreshSessionMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold disabled:opacity-50"
                >
                  {refreshSessionMutation.isPending ? t("settings.sessionRefreshing") : t("settings.sessionRefreshNow")}
                </button>
                <button
                  onClick={clearSessionOnThisDevice}
                  className="px-4 py-2 rounded-xl bg-slate-600 hover:bg-slate-700 text-white text-sm font-bold"
                >
                  {t("settings.sessionClearThisDevice")}
                </button>
              </div>
            </div>

            <div className={`mt-8 rounded-2xl border p-5 ${isDark ? "border-slate-700 bg-slate-900/50" : "border-slate-200 bg-slate-50/70"}`}>
              <h3 className={`text-lg font-black mb-3 ${isDark ? "text-white" : "text-slate-800"}`}>
                {t("childSettings.trustedDevices", "الأجهزة الموثوقة")}
              </h3>

              {trustedDevices.length > 0 ? (
                <div className="space-y-3">
                  {trustedDevices.map((device) => {
                    const isBusy = activeDeviceAction === device.deviceId;
                    const isTrusted = device.isTrusted !== false;
                    return (
                      <div
                        key={device.id}
                        className={`rounded-xl p-3 border ${isDark ? "border-slate-700 bg-slate-800/70" : "border-slate-200 bg-white"}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className={`font-bold text-sm ${isDark ? "text-slate-100" : "text-slate-800"}`}>
                              {device.deviceName || t("childSettings.unknownDevice", "جهاز غير معروف")}
                            </p>
                            <p className={`text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                              {device.deviceType || "device"} • {new Date(device.lastUsedAt).toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-US")}
                            </p>
                            <p className={`text-xs mt-1 ${isTrusted ? (isDark ? "text-emerald-300" : "text-emerald-700") : (isDark ? "text-amber-300" : "text-amber-700")}`}>
                              {isTrusted ? t("common.active", "نشط") : t("common.inactive", "غير نشط")}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            {isTrusted && (
                              <button
                                onClick={() => revokeTrustedDeviceMutation.mutate(device.deviceId)}
                                disabled={isBusy}
                                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold disabled:opacity-50"
                              >
                                {t("common.disable", "إلغاء الثقة")}
                              </button>
                            )}
                            <button
                              onClick={() => deleteTrustedDeviceMutation.mutate(device.deviceId)}
                              disabled={isBusy}
                              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold disabled:opacity-50"
                            >
                              {t("common.delete", "حذف")}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className={`text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  {t("childSettings.noTrustedDevices", "لا توجد أجهزة موثوقة")}
                </p>
              )}
            </div>

            <div className={`mt-10 border-2 ${isDark ? "border-red-700 bg-red-500/5" : "border-red-300 bg-red-50/70"} rounded-2xl p-6`}>
              <h3 className={`text-xl font-black mb-3 ${isDark ? "text-red-300" : "text-red-600"}`}>
                {t("settings.deleteAccountTitle")}
              </h3>
              <p className={`mb-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                {t("settings.deleteAccountDescription")}
              </p>
              <label className={labelClass}>
                {t("settings.deleteAccountPassword")}
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className={inputClass}
              />
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleteAccountMutation.isPending || !deletePassword}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl disabled:opacity-50 w-full mt-6"
              >
                {deleteAccountMutation.isPending ? t("settings.deletingAccount") : `🗑️ ${t("settings.deleteAccountButton")}`}
              </button>

              <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("settings.deleteAccountTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("settings.deleteAccountDescription")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-600 hover:bg-red-700 text-white"
                      onClick={() => deleteAccountMutation.mutate()}
                    >
                      {t("settings.deleteAccountButton")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}

        {/* Appearance Tab */}
        {tab === "appearance" && (
          <div id="settings-panel-appearance" role="tabpanel" aria-labelledby="settings-tab-appearance" className={`${panelClass} animate-in fade-in-0 slide-in-from-bottom-1 duration-200`}>
            <h2 className={`text-2xl md:text-4xl font-black mb-5 md:mb-6 leading-tight ${isDark ? "text-white" : "text-gray-800"}`}>
              {t("settings.appearanceSettings")}
            </h2>
            <div className="space-y-4">
              <div className={`flex justify-between items-center p-4 border-2 rounded-2xl ${isDark ? "border-slate-700 bg-slate-700/40" : "border-slate-200 bg-slate-50"}`}>
                <span className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                  {isDark ? `🌙 ${t("settings.darkMode")}` : `☀️ ${t("settings.lightMode")}`}
                </span>
                <button
                  onClick={toggleTheme}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl shadow-md"
                >
                  {t("settings.toggleTheme")}
                </button>
              </div>

              <div className={`p-4 border-2 rounded-2xl space-y-4 ${isDark ? "border-slate-700 bg-slate-700/40" : "border-slate-200 bg-slate-50"}`}>
                <div>
                  <p className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>{t("settings.notifications")}</p>
                  <p className={`text-xs mt-1 ${isDark ? "text-slate-300" : "text-slate-600"}`}>{t("permissions.notificationsDesc")}</p>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center justify-between gap-3">
                    <span className={`inline-flex items-center gap-2 text-sm font-semibold ${isDark ? "text-slate-100" : "text-slate-700"}`}>
                      <span>📱</span>
                      <span>{t("childSettings.notifications")}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={notificationPrefs.inAppEnabled}
                      onChange={(e) => setNotificationPrefs((prev) => ({ ...prev, inAppEnabled: e.target.checked }))}
                      className="h-4 w-4"
                    />
                  </label>

                  <label className="flex items-center justify-between gap-3">
                    <span className={`inline-flex items-center gap-2 text-sm font-semibold ${isDark ? "text-slate-100" : "text-slate-700"}`}>
                      <span>🌐</span>
                      <span>{t("permissions.notifications")}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={notificationPrefs.pushEnabled}
                      onChange={(e) => setNotificationPrefs((prev) => ({ ...prev, pushEnabled: e.target.checked }))}
                      className="h-4 w-4"
                    />
                  </label>

                  <label className="flex items-center justify-between gap-3">
                    <span className={`inline-flex items-center gap-2 text-sm font-semibold ${isDark ? "text-slate-100" : "text-slate-700"}`}>
                      <span>🌙</span>
                      <span>{t("settings.darkMode")}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={notificationPrefs.quietHoursEnabled}
                      onChange={(e) => setNotificationPrefs((prev) => ({ ...prev, quietHoursEnabled: e.target.checked }))}
                      className="h-4 w-4"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="time"
                      value={notificationPrefs.quietStart}
                      onChange={(e) => setNotificationPrefs((prev) => ({ ...prev, quietStart: e.target.value || "22:00" }))}
                      className={inputClass}
                    />
                    <input
                      type="time"
                      value={notificationPrefs.quietEnd}
                      onChange={(e) => setNotificationPrefs((prev) => ({ ...prev, quietEnd: e.target.value || "07:00" }))}
                      className={inputClass}
                    />
                  </div>
                </div>

                <button
                  onClick={saveNotificationPreferences}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl shadow-md"
                >
                  {t("settings.saveChanges")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Contact Tab */}
        {tab === "contact" && (
          <div id="settings-panel-contact" role="tabpanel" aria-labelledby="settings-tab-contact" className={`${panelClass} animate-in fade-in-0 slide-in-from-bottom-1 duration-200`}>
            <h2 className={`text-2xl md:text-4xl font-black mb-5 md:mb-6 leading-tight ${isDark ? "text-white" : "text-gray-800"}`}>
              📞 {t("settings.contactUs")}
            </h2>
            <p className={`mb-6 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              {t("settings.contactDescription")}
            </p>

            <div className={`mb-6 p-4 rounded-2xl border ${isDark ? "bg-slate-900/40 border-slate-700" : "bg-indigo-50/70 border-indigo-100"}`}>
              <h3 className={`text-lg font-black mb-2 ${isDark ? "text-white" : "text-slate-800"}`}>
                {t("settings.accountRoleSectionTitle")}
              </h3>
              <p className={`text-sm mb-3 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                {t("settings.accountRoleSectionDescription")}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                <button
                  onClick={() => selectRoleRequestType("teacher")}
                  className={`px-4 py-3 rounded-xl font-bold transition-colors ${roleRequestType === "teacher" ? "bg-blue-600 text-white" : isDark ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-white hover:bg-slate-100 text-slate-800 border border-slate-200"}`}
                >
                  👨‍🏫 {t("settings.accountRoleTeacher")}
                </button>
                <button
                  onClick={() => selectRoleRequestType("school")}
                  className={`px-4 py-3 rounded-xl font-bold transition-colors ${roleRequestType === "school" ? "bg-blue-600 text-white" : isDark ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-white hover:bg-slate-100 text-slate-800 border border-slate-200"}`}
                >
                  🏫 {t("settings.accountRoleSchool")}
                </button>
                <button
                  onClick={() => selectRoleRequestType("library")}
                  className={`px-4 py-3 rounded-xl font-bold transition-colors ${roleRequestType === "library" ? "bg-blue-600 text-white" : isDark ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-white hover:bg-slate-100 text-slate-800 border border-slate-200"}`}
                >
                  📚 {t("settings.accountRoleLibrary")}
                </button>
              </div>

              {roleRequestType && (
                <div className={`mt-2 p-3 rounded-xl border ${isDark ? "border-slate-600 bg-slate-800/70" : "border-slate-200 bg-white"}`}>
                  {whatsappRoleRequestHref && (
                    <a
                      href={whatsappRoleRequestHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mb-3 block w-full text-center px-4 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold transition-colors"
                    >
                      💬 {t("settings.whatsapp")}
                    </a>
                  )}
                  <label className={labelClass}>
                    {t("settings.accountRolePhoneLabel")}
                  </label>
                  <input
                    type="tel"
                    value={roleRequestPhone}
                    onChange={(e) => setRoleRequestPhone(e.target.value)}
                    className={inputClass}
                    placeholder={t("settings.accountRolePhonePlaceholder")}
                  />
                  <button
                    onClick={() => roleRequestMutation.mutate()}
                    disabled={roleRequestMutation.isPending}
                    className="mt-3 w-full px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-50"
                  >
                    {roleRequestMutation.isPending ? t("settings.accountRoleSending") : t("settings.accountRoleSend")}
                  </button>
                </div>
              )}

              {roleRequestFlash && (
                <div className={`mt-3 text-sm font-bold ${roleRequestFlash === t("settings.accountRoleRequestSuccess") ? "text-green-500" : "text-red-500"}`}>
                  {roleRequestFlash}
                </div>
              )}
            </div>

            <button
              onClick={() => navigate("/privacy-policy")}
              className={`w-full mb-6 p-4 rounded-2xl font-bold ${isDark ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-blue-50 hover:bg-blue-100 text-blue-700"
                } transition-all`}
            >
              {t("settings.privacyPolicy")}
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contactInfo?.phone && (
                <a
                  href={`tel:${contactInfo.phone}`}
                  className={`flex items-center gap-4 p-4 rounded-2xl ${isDark ? "bg-gray-700 hover:bg-gray-600" : "bg-blue-50 hover:bg-blue-100"} transition-all`}
                >
                  <span className="text-3xl">📱</span>
                  <div>
                    <p className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>{t("settings.phoneLabel")}</p>
                    <p className={`${isDark ? "text-gray-400" : "text-gray-600"}`}>{contactInfo.phone}</p>
                  </div>
                </a>
              )}

              {contactInfo?.email && (
                <a
                  href={`mailto:${contactInfo.email}`}
                  className={`flex items-center gap-4 p-4 rounded-2xl ${isDark ? "bg-gray-700 hover:bg-gray-600" : "bg-green-50 hover:bg-green-100"} transition-all`}
                >
                  <span className="text-3xl">📧</span>
                  <div>
                    <p className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>{t("settings.emailLabel")}</p>
                    <p className={`${isDark ? "text-gray-400" : "text-gray-600"}`}>{contactInfo.email}</p>
                  </div>
                </a>
              )}

              {contactInfo?.whatsapp && (
                <a
                  href={`https://wa.me/${contactInfo.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-4 p-4 rounded-2xl ${isDark ? "bg-gray-700 hover:bg-gray-600" : "bg-green-50 hover:bg-green-100"} transition-all`}
                >
                  <span className="text-3xl">💬</span>
                  <div>
                    <p className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>{t("settings.whatsapp")}</p>
                    <p className={`${isDark ? "text-gray-400" : "text-gray-600"}`}>{contactInfo.whatsapp}</p>
                  </div>
                </a>
              )}

              {contactInfo?.facebook && (
                <a
                  href={contactInfo.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-4 p-4 rounded-2xl ${isDark ? "bg-gray-700 hover:bg-gray-600" : "bg-blue-50 hover:bg-blue-100"} transition-all`}
                >
                  <span className="text-3xl">📘</span>
                  <div>
                    <p className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>{t("settings.facebook")}</p>
                    <p className={`${isDark ? "text-gray-400" : "text-gray-600"}`}>{t("settings.visitPage")}</p>
                  </div>
                </a>
              )}

              {contactInfo?.instagram && (
                <a
                  href={contactInfo.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-4 p-4 rounded-2xl ${isDark ? "bg-gray-700 hover:bg-gray-600" : "bg-pink-50 hover:bg-pink-100"} transition-all`}
                >
                  <span className="text-3xl">📸</span>
                  <div>
                    <p className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>{t("settings.instagram")}</p>
                    <p className={`${isDark ? "text-gray-400" : "text-gray-600"}`}>{t("settings.followUs")}</p>
                  </div>
                </a>
              )}

              {contactInfo?.twitter && (
                <a
                  href={contactInfo.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-4 p-4 rounded-2xl ${isDark ? "bg-gray-700 hover:bg-gray-600" : "bg-blue-50 hover:bg-blue-100"} transition-all`}
                >
                  <span className="text-3xl">🐦</span>
                  <div>
                    <p className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>{t("settings.twitter")}</p>
                    <p className={`${isDark ? "text-gray-400" : "text-gray-600"}`}>{t("settings.followUs")}</p>
                  </div>
                </a>
              )}
            </div>

            {contactInfo?.address && (
              <div className={`mt-6 p-4 rounded-2xl ${isDark ? "bg-gray-700" : "bg-yellow-50"}`}>
                <div className="flex items-center gap-4">
                  <span className="text-3xl">📍</span>
                  <div>
                    <p className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>{t("settings.address")}</p>
                    <p className={`${isDark ? "text-gray-400" : "text-gray-600"}`}>{contactInfo.address}</p>
                  </div>
                </div>
              </div>
            )}

            {!contactInfo?.phone && !contactInfo?.email && !contactInfo?.whatsapp && (
              <div className={`text-center p-8 rounded-2xl ${isDark ? "bg-gray-700" : "bg-gray-100"}`}>
                <span className="text-6xl block mb-4">📞</span>
                <p className={`${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  {t("settings.noContactInfo")}
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
