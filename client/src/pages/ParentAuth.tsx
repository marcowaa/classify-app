import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import { useSMSOTP } from "@/hooks/useSMSOTP";
import { SMSVerification } from "@/components/SMSVerification";
import { OTPMethodSelector } from "@/components/OTPMethodSelector";
import { useAutoLogin } from "@/hooks/useAutoLogin";
import { Loader2, CheckCircle, XCircle, ShoppingBag, Shield, BookOpen, Sparkles, Star, EllipsisVertical, GraduationCap, School, Store, Eye, EyeOff, ChevronDown } from "lucide-react";
import { SocialLoginButtons } from "@/components/SocialLoginButtons";
import { PhoneInput } from "@/components/PhoneInput";
import { GovernorateSelect } from "@/components/ui/GovernorateSelect";
import { LanguageSelector } from "@/components/LanguageSelector";
import {
  getTrialPurchaseFlowState,
  setTrialPurchaseFlowState,
  shouldRedirectToTrialInvoice,
} from "@/lib/trialPurchaseFlow";
import { clearTrialChildLinkData, readTrialChildLinkData, saveTrialChildLinkData } from "@/lib/trialChildLinkStorage";
import { cacheAdultAccountSession } from "@/lib/adultAccountSessions";
import { useToast } from "@/hooks/use-toast";
import { trackTrialFunnelEvent } from "@/lib/trialAnalytics";
import { getNativeGoogleOAuthCallbackPath, isNativeGoogleSignInAvailable } from "@/lib/nativeGoogleAuth";
import { buildWhatsAppSupportUrl, fetchSupportSettingsPublic } from "@/lib/supportContact";

const OAUTH_REDIRECT_LOCK_KEY = "classify-oauth-redirect-lock-at";
const OAUTH_REDIRECT_LOCK_MS = 20_000;

export const ParentAuth = (): JSX.Element => {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isRTL = i18n.language === "ar";
  const { isChecking, isLoggedIn } = useAutoLogin();
  const isHandlingPostAuthRef = useRef(false);
  const [isLogin, setIsLogin] = useState(true);
  const [authMode, setAuthMode] = useState<"parent" | "teacher" | "school" | "library">("parent");
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const roleMenuRef = useRef<HTMLDivElement | null>(null);
  const [usePhone, setUsePhone] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+966");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [error, setError] = useState("");
  const [showCreateAccountPrompt, setShowCreateAccountPrompt] = useState(false);
  const [createAccountPrefillMode, setCreateAccountPrefillMode] = useState<"email" | "phone">("email");
  const [pinCode, setPinCode] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [showSMSVerification, setShowSMSVerification] = useState(false);
  const [showTopActionsMenu, setShowTopActionsMenu] = useState(false);
  const [savedCartCount, setSavedCartCount] = useState(0);
  const [otpMethod, setOtpMethod] = useState<"email" | "sms" | "whatsapp">("email");
  const [phoneOtpMethod, setPhoneOtpMethod] = useState<"sms" | "whatsapp">("sms");
  const [availableMethods, setAvailableMethods] = useState<("email" | "sms" | "whatsapp")[]>(["email"]);
  const [passwordStrength, setPasswordStrength] = useState<{ score: number; label: string; color: string }>({ score: 0, label: "", color: "" });
  const [roleUsername, setRoleUsername] = useState("");
  const [rolePassword, setRolePassword] = useState("");
  const [showRolePassword, setShowRolePassword] = useState(false);
  const [roleLoading, setRoleLoading] = useState(false);
  const [roleError, setRoleError] = useState("");
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [isSocialRedirecting, setIsSocialRedirecting] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const authParams = new URLSearchParams(window.location.search);
  const libraryReferralCode = authParams.get("libraryRef")?.trim() || undefined;
  const referralCode = authParams.get("ref")?.trim() || undefined;
  const mode = authParams.get("mode")?.trim();
  const trialNotice = authParams.get("notice")?.trim() || "";
  const trialFromPath = authParams.get("from")?.trim() || "";
  const redirectTarget = authParams.get("redirect")?.trim() || "";
  const oauthError = authParams.get("error")?.trim().toLowerCase() || "";
  const oauthProvider = authParams.get("provider")?.trim().toLowerCase() || "";
  const prefillEmail = authParams.get("prefill_email")?.trim() || "";
  const prefillPhone = authParams.get("prefill_phone")?.trim() || "";
  const prefillCountryCode = authParams.get("prefill_country_code")?.trim() || "";
  const guestCartSaved = authParams.get("guestCartSaved") === "1";
  const trialChildTokenFromQuery = authParams.get("trialChildToken")?.trim() || "";
  const trialFlowState = getTrialPurchaseFlowState();
  const trialChildTokenFromStorage = readTrialChildLinkData()?.trialChildToken?.trim() || "";
  const trialChildToken = trialChildTokenFromQuery
    || ((trialFlowState === "captured" || trialFlowState === "linking" || trialFlowState === "linked") ? trialChildTokenFromStorage : "");

  const readLastOAuthResult = () => {
    const raw = localStorage.getItem("classify-oauth-last-result") || sessionStorage.getItem("classify-oauth-last-result") || "";
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as {
        status?: string;
        stage?: string;
        provider?: string;
        mode?: string;
        returnTo?: string;
        reason?: string;
        tokenStored?: boolean;
        childCacheCleared?: boolean;
        at?: number;
      };
      return parsed;
    } catch {
      return null;
    }
  };

  const trialNoticeText = (() => {
    if (trialNotice === "complete-account") {
      return t(
        "parentAuth.completeAccountNotice",
        "To continue this page, create or complete your parent account first."
      );
    }
    if (trialNotice === "link-parent") {
      return t(
        "parentAuth.linkParentNotice",
        "This feature needs a linked parent account. Please create one to continue."
      );
    }
    return "";
  })();

  const linkTrialChildToParent = async (params: { parentToken: string; trialToken: string }) => {
    try {
      const linkResponse = await fetch("/api/auth/link-trial-child", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${params.parentToken}`,
        },
        body: JSON.stringify({ trialChildToken: params.trialToken }),
      });

      let json: any = null;
      try {
        json = await linkResponse.json();
      } catch {
        json = null;
      }

      const message = String(json?.message || json?.error || "").trim();
      return { ok: linkResponse.ok, message };
    } catch {
      return { ok: false, message: "" };
    }
  };

  const smsOTP = useSMSOTP({
    onSuccess: () => {
      navigate("/otp");
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const { data: supportSettings } = useQuery({
    queryKey: ["public-support-settings"],
    queryFn: fetchSupportSettingsPublic,
    staleTime: 60_000,
  });

  const supportFallbackHref = supportSettings?.supportPhone
    ? `tel:${supportSettings.supportPhone}`
    : "/contact";
  const schoolSupportHref = buildWhatsAppSupportUrl(
    supportSettings?.whatsappNumber,
    t("schoolLogin.contactSupport"),
  ) || supportFallbackHref;
  const librarySupportHref = buildWhatsAppSupportUrl(
    supportSettings?.whatsappNumber,
    t("libraryLogin.contactSupport"),
  ) || supportFallbackHref;
  const schoolSupportIsExternal = schoolSupportHref.startsWith("https://wa.me/");
  const librarySupportIsExternal = librarySupportHref.startsWith("https://wa.me/");

  const authMutation = useMutation({
    mutationFn: async () => {
      const selectedAgeRaw = localStorage.getItem("selectedChildAge") || "";
      const selectedBirthDate = localStorage.getItem("selectedChildBirthDate") || "";
      const parsedSelectedAge = Number.parseInt(selectedAgeRaw, 10);
      const selectedAge = Number.isFinite(parsedSelectedAge) ? parsedSelectedAge : undefined;

      if (usePhone) {
        const endpoint = isLogin ? "/api/auth/login-phone" : "/api/auth/register";
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isLogin
              ? { phoneNumber: `${countryCode}${phone}`, password, otpMethod: phoneOtpMethod }
              : {
                email,
                password,
                name,
                gender,
                phoneNumber: `${countryCode}${phone}`,
                otpMethod: phoneOtpMethod,
                libraryReferralCode,
                referralCode,
                pin: pinCode || undefined,
                governorate: governorate || undefined,
                termsAccepted: acceptedPolicies,
                age: selectedAge,
                birthDate: selectedBirthDate || undefined,
              }
          ),
        });
        if (!res.ok) {
          const err = await res.json();
          const error = new Error(err.message || "Authentication failed") as Error & { status?: number; errorCode?: string };
          error.status = res.status;
          error.errorCode = err?.error;
          throw error;
        }
        return res.json();
      } else {
        const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isLogin
              ? { email, password }
              : {
                email,
                password,
                name,
                gender,
                libraryReferralCode,
                referralCode,
                pin: pinCode || undefined,
                governorate: governorate || undefined,
                termsAccepted: acceptedPolicies,
                age: selectedAge,
                birthDate: selectedBirthDate || undefined,
              }
          ),
        });
        if (!res.ok) {
          const err = await res.json();
          const error = new Error(err.message || "Authentication failed") as Error & { status?: number; errorCode?: string };
          error.status = res.status;
          error.errorCode = err?.error;
          throw error;
        }
        return res.json();
      }
    },
    onSuccess: async (data) => {
      isHandlingPostAuthRef.current = true;
      // Backend wraps responses as { success, data, message }
      const payload = (data && typeof data === "object" && "data" in data) ? (data as any).data : data;

      if (payload?.requiresOtp) {
        const resolvedMethod = (payload?.method === "email" || payload?.method === "sms" || payload?.method === "whatsapp")
          ? payload.method
          : (usePhone ? phoneOtpMethod : "email");
        const purpose = payload?.otpPurpose || (isLogin ? "login" : "register");
        localStorage.setItem("otpPurpose", purpose);
        if (redirectTarget) {
          localStorage.setItem("postAuthRedirect", redirectTarget);
        }
        // Clear stale routing data before storing new OTP session context.
        localStorage.removeItem("smsPendingPhone");
        localStorage.removeItem("otpEmail");
        if (payload?.phone || phone) {
          localStorage.setItem("smsPendingPhone", payload.phone || phone);
        }
        if (payload?.email || email) {
          localStorage.setItem("otpEmail", payload.email || email);
        }
        if (payload?.otpId) {
          localStorage.setItem("otpId", payload.otpId);
        }

        // Check available OTP methods for email before navigation
        if (isLogin && email && !usePhone) {
          try {
            const methods = await smsOTP.getOtpMethods(email);
            const updatedMethods = (methods.length > 0 ? methods : ["email"]) as Array<"email" | "sms" | "whatsapp">;
            setAvailableMethods(updatedMethods);
            localStorage.setItem("otpAvailableMethods", JSON.stringify(updatedMethods));

            // Keep dedicated SMS component only for pure SMS fallback.
            if (updatedMethods.includes("sms") && !updatedMethods.includes("whatsapp")) {
              setShowSMSVerification(true);
            } else {
              const preferredMethod = updatedMethods.includes("whatsapp") ? "whatsapp" : "email";
              localStorage.setItem("otpMethod", preferredMethod);
              navigate("/otp");
            }
          } catch {
            // Fallback to email OTP if methods check fails
            localStorage.setItem("otpAvailableMethods", JSON.stringify(["email"]));
            localStorage.setItem("otpMethod", "email");
            navigate("/otp");
          }
        } else {
          localStorage.setItem("otpAvailableMethods", JSON.stringify([resolvedMethod]));
          localStorage.setItem("otpMethod", resolvedMethod);
          navigate("/otp");
        }
      } else if (payload?.requiresChildFlow) {
        const childTrial = payload?.childTrial;

        // Switch to a pure child session for child-trial flows.
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        localStorage.removeItem("familyCode");
        localStorage.removeItem("parentAccountClassification");

        if (childTrial?.childToken) {
          localStorage.setItem("childToken", childTrial.childToken);
        }
        if (childTrial?.childId) {
          localStorage.setItem("childId", childTrial.childId);
        }
        if (childTrial?.childName) {
          localStorage.setItem("childName", childTrial.childName);
        }
        localStorage.setItem("childAccountClassification", "CHILD_TRIAL");
        if (childTrial?.shareCode || childTrial?.trialChildToken || childTrial?.trialChildLinkUrl || childTrial?.trialChildQrCodeUrl) {
          saveTrialChildLinkData({
            shareCode: childTrial.shareCode,
            trialChildToken: childTrial?.trialChildToken,
            trialChildLinkUrl: childTrial?.trialChildLinkUrl,
            trialChildQrCodeUrl: childTrial?.trialChildQrCodeUrl,
          });
        }

        const target = typeof payload?.redirectTo === "string" && payload.redirectTo.startsWith("/")
          ? payload.redirectTo
          : "/child-games";
        navigate(target);
      } else {
        let trialLinkSucceeded = !trialChildToken;
        const isTrialCheckoutFlow = trialFlowState === "captured"
          || trialFlowState === "linking"
          || trialFlowState === "linked"
          || trialFlowState === "hydrated";

        localStorage.removeItem("childToken");
        localStorage.removeItem("childId");
        localStorage.removeItem("childAccountClassification");

        if (payload?.token) {
          localStorage.setItem("token", payload.token);
          cacheAdultAccountSession({
            role: "parent",
            token: payload.token,
            accountId: payload?.userId,
            displayName: payload?.name || payload?.email || email,
          });
        }
        const normalizedClassification = String(payload?.classification || "FULL").trim().toUpperCase();
        localStorage.setItem("parentAccountClassification", normalizedClassification || "FULL");
        if (payload?.userId) {
          localStorage.setItem("userId", payload.userId);
        }
        // Keep trial checkout registration on direct auth flow and avoid PIN fallback lock.
        if (isTrialCheckoutFlow) {
          localStorage.removeItem("familyCode");
        } else if (payload?.uniqueCode && payload?.hasPin) {
          localStorage.setItem("familyCode", payload.uniqueCode);
        }
        if (payload?.token && trialChildToken) {
          const flowStateBeforeLink = getTrialPurchaseFlowState();
          if (flowStateBeforeLink === "captured" || flowStateBeforeLink === "linking") {
            setTrialPurchaseFlowState("linking");
          }
          const linkAttempt = await linkTrialChildToParent({
            parentToken: payload.token,
            trialToken: trialChildToken,
          });
          trialLinkSucceeded = linkAttempt.ok;
          if (trialLinkSucceeded) {
            setTrialPurchaseFlowState("linked");
            clearTrialChildLinkData();
            trackTrialFunnelEvent("TRIAL_LINK_SUCCESS");
          } else {
            if (getTrialPurchaseFlowState() === "linking") {
              setTrialPurchaseFlowState("captured");
            }
            trackTrialFunnelEvent("TRIAL_LINK_FAILED", {
              reason: linkAttempt.message || "AUTO_LINK_FAILED",
            });
            toast({
              variant: "destructive",
              description: linkAttempt.message || "Failed to link trial child automatically. You can continue and link manually.",
            });
          }
        }

        const trialInvoiceTarget = shouldRedirectToTrialInvoice({ trialLinkSucceeded })
          ? "/parent-store?trialIntent=1"
          : "";

        const target = trialInvoiceTarget || redirectTarget || localStorage.getItem("postAuthRedirect") || "/parent-dashboard";
        if (localStorage.getItem("postAuthRedirect")) {
          localStorage.removeItem("postAuthRedirect");
        }
        navigate(target);
      }
    },
    onError: async (err: any) => {
      if (isLogin) {
        const isInvalidCreds = err?.errorCode === "INVALID_CREDENTIALS" || err?.status === 401;
        if (isInvalidCreds) {
          try {
            const accountCheckPayload = usePhone
              ? { phoneNumber: `${countryCode}${phone}` }
              : { email };

            const checkRes = await fetch("/api/auth/check-parent-account", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(accountCheckPayload),
            });
            const checkJson = await checkRes.json();
            const exists = checkJson?.data?.exists ?? checkJson?.exists;
            if (exists === false) {
              setCreateAccountPrefillMode(usePhone ? "phone" : "email");
              setShowCreateAccountPrompt(true);
              setError("");
              return;
            }
          } catch {
            // Fall back to default error handling
          }
        }
      }
      setShowCreateAccountPrompt(false);
      setError(err.message);
    },
  });

  useEffect(() => {
    if (isHandlingPostAuthRef.current) {
      return;
    }
    if (!isChecking && isLoggedIn) {
      const token = localStorage.getItem("token") || "";
      if (token && trialChildToken) {
        isHandlingPostAuthRef.current = true;

        const flowStateBeforeLink = getTrialPurchaseFlowState();
        if (flowStateBeforeLink === "captured" || flowStateBeforeLink === "linking") {
          setTrialPurchaseFlowState("linking");
        }

        (async () => {
          const linkAttempt = await linkTrialChildToParent({ parentToken: token, trialToken: trialChildToken });
          const trialLinkSucceeded = linkAttempt.ok;

          if (trialLinkSucceeded) {
            setTrialPurchaseFlowState("linked");
            clearTrialChildLinkData();
            trackTrialFunnelEvent("TRIAL_LINK_SUCCESS");
          } else if (getTrialPurchaseFlowState() === "linking") {
            setTrialPurchaseFlowState("captured");
            trackTrialFunnelEvent("TRIAL_LINK_FAILED", {
              reason: linkAttempt.message || "AUTO_LINK_FAILED",
            });
            toast({
              variant: "destructive",
              description: linkAttempt.message || "Failed to link trial child automatically. You can continue and link manually.",
            });
          }

          const trialInvoiceTarget = shouldRedirectToTrialInvoice({ trialLinkSucceeded })
            ? "/parent-store?trialIntent=1"
            : "";
          const target = trialInvoiceTarget || redirectTarget || "/parent-dashboard";
          navigate(target);
        })();

        return;
      }

      const target = redirectTarget || "/parent-dashboard";
      navigate(target);
    }
  }, [isChecking, isLoggedIn, navigate, redirectTarget, toast, trialChildToken]);

  useEffect(() => {
    if (mode === "register") {
      setIsLogin(false);
    }
  }, [mode]);

  useEffect(() => {
    if (!oauthError) return;

    sessionStorage.removeItem(OAUTH_REDIRECT_LOCK_KEY);
    setIsSocialRedirecting(false);

    const providerLabel = oauthProvider || "google";
    const oauthErrorMessages: Record<string, string> = {
      oauth_provider_not_found: `OAuth provider not configured or disabled (${providerLabel}).`,
      oauth_in_progress: `OAuth sign-in is already in progress (${providerLabel}). Please wait a moment.`,
      oauth_invalid_state: `OAuth state validation failed (${providerLabel}). Try again from login page.`,
      oauth_token_failed: `OAuth token exchange failed (${providerLabel}). Check redirect URI and client secret.`,
      oauth_no_email: `No email returned from ${providerLabel}. Use another ${providerLabel} account with email access.`,
      oauth_unsupported: `Unsupported OAuth provider (${providerLabel}).`,
      oauth_failed: `OAuth login failed (${providerLabel}). Please try again.`,
      oauth_missing_provider: "OAuth callback is missing provider information.",
      oauth_no_token: "OAuth completed but no session token was returned.",
      oauth_token_cache_failed: "OAuth succeeded but token was not saved to app cache.",
    };

    const lastOAuth = readLastOAuthResult();
    const diagnostics = lastOAuth
      ? ` stage=${lastOAuth.stage || "unknown"}, provider=${lastOAuth.provider || providerLabel}, tokenStored=${String(lastOAuth.tokenStored)}, childCacheCleared=${String(lastOAuth.childCacheCleared)}`
      : "";

    setIsLogin(true);
    setError(`${oauthErrorMessages[oauthError] || `OAuth error: ${oauthError} (${providerLabel}).`}${diagnostics}`);
  }, [oauthError, oauthProvider]);

  useEffect(() => {
    if (!prefillEmail) return;
    setIsLogin(false);
    setUsePhone(false);
    setEmail(prefillEmail);
  }, [prefillEmail]);

  useEffect(() => {
    if (!prefillPhone) return;
    setIsLogin(false);
    setUsePhone(true);
    if (prefillCountryCode && prefillCountryCode.startsWith("+")) {
      setCountryCode(prefillCountryCode);
    }
    setPhone(prefillPhone);
  }, [prefillPhone, prefillCountryCode]);

  useEffect(() => {
    if (!showTopActionsMenu) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowTopActionsMenu(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [showTopActionsMenu]);

  useEffect(() => {
    if (!showTopActionsMenu) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showTopActionsMenu]);

  useEffect(() => {
    if (!showRoleMenu) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowRoleMenu(false);
      }
    };
    const onClickAway = (e: MouseEvent) => {
      if (!roleMenuRef.current) return;
      if (!roleMenuRef.current.contains(e.target as Node)) {
        setShowRoleMenu(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onClickAway);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onClickAway);
    };
  }, [showRoleMenu]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) {
        setShowTopActionsMenu(false);
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updatePreference);
      return () => mediaQuery.removeEventListener("change", updatePreference);
    }

    mediaQuery.addListener(updatePreference);
    return () => mediaQuery.removeListener(updatePreference);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const viewport = window.visualViewport;
    if (!viewport) return;

    const KEYBOARD_THRESHOLD = 120;

    const updateKeyboardState = () => {
      const inset = Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop));
      const opened = inset > KEYBOARD_THRESHOLD;
      setIsKeyboardOpen(opened);
      setKeyboardInset(opened ? inset : 0);
    };

    updateKeyboardState();
    viewport.addEventListener("resize", updateKeyboardState);
    viewport.addEventListener("scroll", updateKeyboardState);

    return () => {
      viewport.removeEventListener("resize", updateKeyboardState);
      viewport.removeEventListener("scroll", updateKeyboardState);
    };
  }, []);

  useEffect(() => {
    if (!isKeyboardOpen) return;
    setShowRoleMenu(false);
    setShowTopActionsMenu(false);
  }, [isKeyboardOpen]);

  useEffect(() => {
    const raw = sessionStorage.getItem(OAUTH_REDIRECT_LOCK_KEY);
    const lockAt = Number(raw || 0);
    if (!Number.isFinite(lockAt)) {
      sessionStorage.removeItem(OAUTH_REDIRECT_LOCK_KEY);
      return;
    }
    if (Date.now() - lockAt > OAUTH_REDIRECT_LOCK_MS) {
      sessionStorage.removeItem(OAUTH_REDIRECT_LOCK_KEY);
      return;
    }
    setIsSocialRedirecting(true);
  }, []);

  useEffect(() => {
    if (!isKeyboardOpen) return;

    const scrollActiveFieldIntoView = (target?: EventTarget | null) => {
      const active = (target as HTMLElement | null)
        || (document.activeElement as HTMLElement | null);

      if (!active) return;

      const tagName = active.tagName.toLowerCase();
      const isEditable =
        tagName === "input"
        || tagName === "textarea"
        || tagName === "select"
        || active.getAttribute("contenteditable") === "true";

      if (!isEditable) return;

      window.setTimeout(() => {
        active.scrollIntoView({
          block: "center",
          inline: "nearest",
          behavior: prefersReducedMotion ? "auto" : "smooth",
        });
      }, 90);
    };

    const onFocusIn = (event: FocusEvent) => {
      scrollActiveFieldIntoView(event.target);
    };

    scrollActiveFieldIntoView();
    document.addEventListener("focusin", onFocusIn);

    return () => {
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [isKeyboardOpen, prefersReducedMotion]);

  useEffect(() => {
    const syncSavedCartCount = () => {
      try {
        const raw = localStorage.getItem("parent-store-cart");
        const parsed = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(parsed)) {
          setSavedCartCount(0);
          return;
        }
        const count = parsed.reduce((sum, item) => sum + Math.max(1, Number(item?.quantity || 1)), 0);
        setSavedCartCount(Number.isFinite(count) ? count : 0);
      } catch {
        setSavedCartCount(0);
      }
    };

    syncSavedCartCount();
    window.addEventListener("storage", syncSavedCartCount);
    window.addEventListener("parent-store-cart-updated", syncSavedCartCount as EventListener);
    return () => {
      window.removeEventListener("storage", syncSavedCartCount);
      window.removeEventListener("parent-store-cart-updated", syncSavedCartCount as EventListener);
    };
  }, []);

  const evaluatePasswordStrength = (pw: string) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    const levels = [
      { label: t("parentAuth.passwordWeak", "ضعيفة"), color: "bg-red-500" },
      { label: t("parentAuth.passwordWeak", "ضعيفة"), color: "bg-red-500" },
      { label: t("parentAuth.passwordFair", "مقبولة"), color: "bg-yellow-500" },
      { label: t("parentAuth.passwordGood", "جيدة"), color: "bg-blue-500" },
      { label: t("parentAuth.passwordStrong", "قوية"), color: "bg-green-500" },
      { label: t("parentAuth.passwordVeryStrong", "قوية جداً"), color: "bg-green-600" },
    ];
    return { score, ...levels[score] };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setShowCreateAccountPrompt(false);
    // Client-side password validation for registration
    if (!isLogin) {
      if (!gender) {
        setError(t("parentAuth.genderRequired"));
        return;
      }
      if (!acceptedPolicies) {
        setError(t("parentAuth.acceptPoliciesRequired"));
        return;
      }
      if (password.length < 8) {
        setError(t("parentAuth.passwordTooShort", "كلمة المرور يجب أن تكون 8 أحرف على الأقل"));
        return;
      }
      if (passwordStrength.score < 2) {
        setError(t("parentAuth.passwordTooWeak", "كلمة المرور ضعيفة جداً، أضف أرقام أو رموز"));
        return;
      }
    }
    authMutation.mutate();
  };

  const handleParentSocialProviderClick = async (provider: string) => {
    const raw = sessionStorage.getItem(OAUTH_REDIRECT_LOCK_KEY);
    const lockAt = Number(raw || 0);
    if (Number.isFinite(lockAt) && Date.now() - lockAt <= OAUTH_REDIRECT_LOCK_MS) {
      return;
    }
    sessionStorage.setItem(OAUTH_REDIRECT_LOCK_KEY, String(Date.now()));
    setIsSocialRedirecting(true);

    const safeProvider = encodeURIComponent(String(provider || "").trim().toLowerCase());
    const params = new URLSearchParams({ mode: "login" });
    const preferredReturnTo = redirectTarget && redirectTarget.startsWith("/")
      ? redirectTarget
      : "/parent-dashboard";
    params.set("returnTo", preferredReturnTo);

    if (safeProvider === "google" && isNativeGoogleSignInAvailable()) {
      try {
        const callbackPath = await getNativeGoogleOAuthCallbackPath({
          mode: "login",
          returnTo: preferredReturnTo,
        });
        window.location.href = callbackPath;
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error || "Native Google sign-in failed");
        console.error("Native Google sign-in failed. NOT falling back to web OAuth.", error);

        // Important: ParentAuth owns the native click path (SocialLoginButtons onProviderClick returns early),
        // so we must show a user-visible error here too.
        sessionStorage.removeItem(OAUTH_REDIRECT_LOCK_KEY);
        setError(message);
        setIsSocialRedirecting(false);
        return;
      }
    }

    window.location.href = `/api/auth/oauth/${safeProvider}?${params.toString()}`;
  };

  const modeOptions = [
    { id: "parent" as const, label: t("parentLogin"), icon: Shield, color: "text-cyan-600" },
    { id: "teacher" as const, label: t("teacherLogin.title"), icon: GraduationCap, color: "text-emerald-600" },
    { id: "school" as const, label: t("schoolLogin.title"), icon: School, color: "text-blue-600" },
    { id: "library" as const, label: t("libraryLogin.title"), icon: Store, color: "text-amber-600" },
  ];

  const selectedModeOption = modeOptions.find((option) => option.id === authMode) || modeOptions[0];

  const selectAuthMode = (nextMode: "parent" | "teacher" | "school" | "library") => {
    setAuthMode(nextMode);
    setShowRoleMenu(false);
    setError("");
    setRoleError("");
    setShowCreateAccountPrompt(false);
    setShowSMSVerification(false);
    setRoleUsername("");
    setRolePassword("");
    setShowRolePassword(false);
    if (nextMode !== "parent") {
      setIsLogin(true);
      setUsePhone(false);
    }
  };

  const handleRoleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoleError("");
    if (!roleUsername.trim() || !rolePassword) {
      setRoleError(t("teacherLogin.enterCredentialsRequired"));
      return;
    }

    const endpointByMode: Record<"teacher" | "school" | "library", string> = {
      teacher: "/api/teacher/login",
      school: "/api/school/login",
      library: "/api/library/login",
    };

    setRoleLoading(true);
    try {
      const res = await fetch(endpointByMode[authMode as "teacher" | "school" | "library"], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: roleUsername.trim(), password: rolePassword }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.message || t("teacherLogin.loginFailed"));
      }

      if (authMode === "teacher") {
        const tokenValue = payload?.token || payload?.data?.token;
        const teacherData = payload?.teacher || payload?.data?.teacher;
        if (tokenValue) localStorage.setItem("teacherToken", tokenValue);
        if (teacherData) localStorage.setItem("teacherData", JSON.stringify(teacherData));
        if (tokenValue) {
          cacheAdultAccountSession({
            role: "teacher",
            token: tokenValue,
            accountId: teacherData?.id || teacherData?.username,
            displayName: teacherData?.name || teacherData?.username,
            dataValue: JSON.stringify(teacherData || {}),
          });
        }
        navigate("/teacher/dashboard");
        return;
      }

      if (authMode === "school") {
        const tokenValue = payload?.data?.token || payload?.token;
        const schoolData = payload?.data?.school || payload?.school;
        if (tokenValue) localStorage.setItem("schoolToken", tokenValue);
        if (schoolData) localStorage.setItem("schoolData", JSON.stringify(schoolData));
        if (tokenValue) {
          cacheAdultAccountSession({
            role: "school",
            token: tokenValue,
            accountId: schoolData?.id || schoolData?.username,
            displayName: schoolData?.name || schoolData?.username,
            dataValue: JSON.stringify(schoolData || {}),
          });
        }
        navigate("/school/dashboard");
        return;
      }

      const tokenValue = payload?.token || payload?.data?.token;
      const libraryData = payload?.library || payload?.data?.library;
      if (tokenValue) localStorage.setItem("libraryToken", tokenValue);
      if (libraryData) localStorage.setItem("libraryData", JSON.stringify(libraryData));
      if (tokenValue) {
        cacheAdultAccountSession({
          role: "library",
          token: tokenValue,
          accountId: libraryData?.id || libraryData?.username,
          displayName: libraryData?.name || libraryData?.username,
          dataValue: JSON.stringify(libraryData || {}),
        });
      }
      navigate("/library/dashboard");
    } catch (err: any) {
      setRoleError(String(err?.message || t("teacherLogin.loginFailed")));
    } finally {
      setRoleLoading(false);
    }
  };

  const quickLinkClassName = "rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-xs text-center text-slate-700 hover:bg-white hover:-translate-y-0.5 transition-all duration-200 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/80";

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
        <div className="text-center rounded-2xl border border-slate-200 bg-white px-6 py-7 shadow-lg dark:border-slate-800 dark:bg-slate-900">
          <Loader2 className="w-10 h-10 animate-spin text-cyan-600 dark:text-cyan-300 mx-auto mb-3" />
          <p className="font-semibold">{t("parentAuth.checkingSession")}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen relative overflow-x-hidden overflow-y-auto text-slate-900 dark:text-slate-100 bg-gradient-to-b from-slate-50 via-cyan-50/35 to-slate-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900"
      style={{ fontFamily: '"Cairo","Noto Kufi Arabic","Segoe UI",sans-serif' }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className={`absolute -top-20 -right-20 w-72 h-72 sm:w-80 sm:h-80 rounded-full bg-cyan-400/12 blur-3xl ${prefersReducedMotion ? "" : "animate-pulse"}`} />
        <div className="hidden sm:block absolute top-1/3 -left-24 w-72 h-72 rounded-full bg-emerald-300/10 blur-3xl" />
        <div className="hidden sm:block absolute -bottom-24 right-1/3 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <div
        className={`relative z-10 px-3 sm:px-4 py-3 md:py-4 ${!isLogin ? "pb-28 md:pb-4" : ""}`}
        style={isKeyboardOpen ? { paddingBottom: `${Math.max(12, keyboardInset + 12)}px` } : undefined}
      >
        <div className="max-w-6xl mx-auto min-w-0 flex items-center justify-between mb-4 gap-2 relative">
          <button
            onClick={() => navigate("/")}
            className="text-slate-700 dark:text-slate-200 flex items-center gap-2 hover:text-slate-900 dark:hover:text-white transition-colors shrink-0 rounded-lg px-2 py-1.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/80"
          >
            ← {t("back")}
          </button>
          <div className="hidden md:flex items-center gap-2 flex-wrap justify-end">
            <button
              onClick={() => navigate("/parent-store")}
              className="relative bg-amber-500 hover:bg-amber-600 text-white rounded-full px-3 py-2 font-semibold shadow-sm inline-flex items-center gap-1.5 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-200/80"
              data-testid="button-open-store-from-parent-auth"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{t("store.title", "المتجر")}</span>
              {savedCartCount > 0 && (
                <span className="absolute -top-1 -end-1 w-5 h-5 rounded-full bg-white text-amber-700 text-[10px] font-black flex items-center justify-center shadow">
                  {savedCartCount > 99 ? "99+" : savedCartCount}
                </span>
              )}
            </button>
            <LanguageSelector />
            <PWAInstallButton
              variant="default"
              size="default"
              showText={true}
              className="inline-flex bg-cyan-500 hover:bg-cyan-600 text-white rounded-full px-4 py-2 font-semibold shadow-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/80"
            />
          </div>

          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => navigate("/parent-store")}
              aria-label={t("store.title", "المتجر")}
              className="relative bg-amber-500 hover:bg-amber-600 text-white rounded-full w-10 h-10 inline-flex items-center justify-center shadow-sm transition-all duration-200 hover:scale-[1.05] active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-200/80"
              data-testid="button-open-store-from-parent-auth"
            >
              <ShoppingBag className="w-4 h-4" />
              {savedCartCount > 0 && (
                <span className="absolute -top-1 -end-1 w-4.5 h-4.5 rounded-full bg-white text-amber-700 text-[9px] font-black flex items-center justify-center shadow">
                  {savedCartCount > 9 ? "9+" : savedCartCount}
                </span>
              )}
            </button>

            <button
              type="button"
              aria-label={t("common.more", "المزيد")}
              aria-haspopup="menu"
              aria-expanded={showTopActionsMenu}
              aria-controls="parent-auth-mobile-actions-menu"
              onClick={() => setShowTopActionsMenu((prev) => !prev)}
              className="w-10 h-10 rounded-full bg-white/85 border border-slate-200 text-slate-700 inline-flex items-center justify-center backdrop-blur-sm shadow-sm transition-all duration-200 hover:bg-white hover:scale-[1.05] active:scale-95 dark:bg-slate-900/80 dark:border-slate-700 dark:text-slate-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/80"
            >
              <EllipsisVertical className="w-5 h-5" />
            </button>
          </div>

          <button
            aria-label={t("common.close", "إغلاق")}
            aria-hidden={!showTopActionsMenu}
            className={`md:hidden fixed inset-0 z-30 bg-black/20 transition-opacity duration-200 ${showTopActionsMenu ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
            onClick={() => setShowTopActionsMenu(false)}
          />

          <div
            id="parent-auth-mobile-actions-menu"
            role="menu"
            aria-hidden={!showTopActionsMenu}
            className={`md:hidden absolute top-full mt-2 ${isRTL ? "left-0" : "right-0"} z-40 w-[min(12.5rem,calc(100vw-0.75rem))] rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-xl shadow-xl p-2 dark:border-slate-700 dark:bg-slate-900/95 ${isRTL ? "origin-top-left" : "origin-top-right"} transition-all duration-200 ${showTopActionsMenu ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-1 pointer-events-none"}`}
          >
            <div
              style={{ transitionDelay: showTopActionsMenu ? "35ms" : "0ms" }}
              className={`px-2 pb-2 transition-all duration-200 ${showTopActionsMenu ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}`}
            >
              <LanguageSelector />
            </div>

            <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />

            <div
              style={{ transitionDelay: showTopActionsMenu ? "70ms" : "0ms" }}
              className={`px-2 py-1 transition-all duration-200 ${showTopActionsMenu ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}`}
            >
              <PWAInstallButton
                variant="default"
                size="default"
                showText={true}
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl px-3 py-2 font-semibold shadow-sm justify-center focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/80"
              />
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto min-w-0 grid lg:grid-cols-[1.12fr_0.88fr] gap-5 items-center">
          <div className="order-2 lg:order-1 min-w-0">
            <div className="rounded-3xl border border-slate-200 bg-white/90 backdrop-blur-sm p-5 lg:p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900/80">
              <div className="inline-flex items-center gap-2 rounded-full bg-cyan-100 border border-cyan-200 px-4 py-1 text-cyan-700 dark:bg-cyan-500/15 dark:border-cyan-400/30 dark:text-cyan-200 text-xs mb-4">
                <Sparkles className="w-4 h-4" />
                {t("parentAuth.brandBadge")}
              </div>
              <h2 className="text-2xl lg:text-4xl leading-tight font-black text-slate-900 dark:text-white mb-3">
                {t("parentAuth.slogan")}
              </h2>
              <p className="text-slate-600 dark:text-slate-300 text-sm lg:text-base leading-relaxed mb-5">
                {t("parentAuth.heroDescription")}
              </p>

              <div className="space-y-2.5">
                <div className="flex items-center gap-3 rounded-2xl border border-cyan-100 bg-cyan-50/70 px-4 py-2.5 dark:border-cyan-500/20 dark:bg-cyan-500/10">
                  <Shield className="w-5 h-5 text-cyan-600 dark:text-cyan-300" />
                  <span className="text-sm lg:text-base text-slate-700 dark:text-slate-100">{t("parentAuth.featureSafety")}</span>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-2.5 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                  <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-300" />
                  <span className="text-sm lg:text-base text-slate-700 dark:text-slate-100">{t("parentAuth.featureLearning")}</span>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-2.5 dark:border-amber-500/20 dark:bg-amber-500/10">
                  <Star className="w-5 h-5 text-amber-600 dark:text-amber-300" />
                  <span className="text-sm lg:text-base text-slate-700 dark:text-slate-100">{t("parentAuth.featureReports")}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2 min-w-0">
            <div className="auth-card-surface min-w-0 ring-1 ring-white/70 dark:ring-slate-700/80 shadow-lg">
              <div className="mb-2 min-h-[74px] min-[390px]:min-h-[82px] sm:min-h-[84px]">
                <h1 className="text-[1.55rem] min-[390px]:text-[1.7rem] lg:text-3xl font-black text-slate-800 dark:text-white mb-1 text-center leading-tight text-balance">
                  {authMode === "parent"
                    ? (isLogin ? t("parentLogin") : t("registerNewParent"))
                    : authMode === "teacher"
                      ? t("teacherLogin.title")
                      : authMode === "school"
                        ? t("schoolLogin.title")
                        : t("libraryLogin.title")}
                </h1>
                <p className="text-center text-slate-500 dark:text-slate-300 text-[11px] min-[390px]:text-xs lg:text-sm leading-relaxed text-balance">
                  {authMode === "parent"
                    ? t("parentAuth.authSubtitle")
                    : authMode === "teacher"
                      ? t("teacherLogin.description")
                      : authMode === "school"
                        ? t("schoolLogin.description")
                        : t("libraryLogin.description")}
                </p>
              </div>

              <div className="mb-4 relative" ref={roleMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowRoleMenu((prev) => !prev)}
                  aria-haspopup="menu"
                  aria-expanded={showRoleMenu}
                  aria-controls="parent-auth-role-menu"
                  className="auth-role-trigger focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/80"
                >
                  <span className="inline-flex items-center gap-2 min-w-0">
                    <selectedModeOption.icon className={`w-4 h-4 shrink-0 ${selectedModeOption.color}`} />
                    <span className="truncate">{selectedModeOption.label}</span>
                  </span>
                  <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${showRoleMenu ? "rotate-180" : ""}`} />
                </button>

                {showRoleMenu && (
                  <div id="parent-auth-role-menu" role="menu" className="auth-role-menu">
                    {modeOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        role="menuitemradio"
                        aria-checked={authMode === option.id}
                        onClick={() => selectAuthMode(option.id)}
                        className={`auth-role-item ${authMode === option.id ? "auth-role-item-active" : "auth-role-item-idle"} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/80`}
                      >
                        <option.icon className={`w-4 h-4 shrink-0 ${option.color}`} />
                        <span className="truncate text-start">{option.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {authMode === "parent" && guestCartSaved && (
                <div className="mb-4 auth-alert auth-alert-success px-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <ShoppingBag className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
                        {t("parentAuth.guestCartSavedTitle")}
                      </p>
                      <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                        {t("parentAuth.guestCartSavedDescription")}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {authMode === "parent" && trialNoticeText && (
                <div className="mb-4 rounded-2xl border border-amber-200/70 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
                  <p className="text-sm font-bold">{trialNoticeText}</p>
                  {trialFromPath ? (
                    <p className="mt-1 text-xs opacity-80">{t("parentAuth.sourcePath", "Source")}: {trialFromPath}</p>
                  ) : null}
                </div>
              )}

              {authMode === "parent" && (
                <>

                  {/* Show SMS Verification if available */}
                  {showSMSVerification && availableMethods.includes("sms") && (
                    <>
                      <OTPMethodSelector
                        selectedMethod={otpMethod}
                        onMethodChange={(method) => {
                          setOtpMethod(method);
                          if (method === "email" || method === "whatsapp") {
                            localStorage.setItem("otpMethod", method);
                            localStorage.setItem("otpAvailableMethods", JSON.stringify(availableMethods));
                            navigate("/otp");
                          }
                        }}
                        availableMethods={availableMethods}
                        isDark={false}
                      />
                      {otpMethod === "sms" ? (
                        <SMSVerification
                          phone={smsOTP.phone}
                          setPhone={smsOTP.setPhone}
                          countryCode={smsOTP.countryCode}
                          setCountryCode={smsOTP.setCountryCode}
                          otp={smsOTP.otp}
                          setOtp={smsOTP.setOtp}
                          step={smsOTP.step}
                          setStep={smsOTP.setStep}
                          isLoading={smsOTP.sendSMSMutation.isPending || smsOTP.verifyLoginSMSMutation.isPending}
                          phoneError={error}
                          otpError={error}
                          isDark={false}
                          onCancel={() => {
                            setShowSMSVerification(false);
                            navigate("/otp");
                          }}
                          onPhoneSubmit={(phoneNumber) => {
                            smsOTP.sendSMSMutation.mutate(phoneNumber);
                          }}
                          onOTPSubmit={(otp) => {
                            smsOTP.verifyLoginSMSMutation.mutate({
                              phoneNumber: smsOTP.fullPhone,
                              code: otp,
                            });
                          }}
                          onResend={() => {
                            smsOTP.sendSMSMutation.mutate(smsOTP.fullPhone);
                          }}
                        />
                      ) : null}
                    </>
                  )}

                  {!showSMSVerification && (
                    <>
                      {/* Email/Phone Toggle */}
                      <div className="auth-segment-wrap">
                        <button
                          type="button"
                          aria-pressed={!usePhone}
                          onClick={() => {
                            setUsePhone(false);
                            setError("");
                          }}
                          className={`auth-segment-btn ${!usePhone ? "auth-segment-btn-active" : "auth-segment-btn-idle"
                            }`}
                        >
                          <span className="truncate">{t("parentAuth.emailTab")}</span>
                        </button>
                        <button
                          type="button"
                          aria-pressed={usePhone}
                          onClick={() => {
                            setUsePhone(true);
                            setError("");
                          }}
                          className={`auth-segment-btn ${usePhone ? "auth-segment-btn-active" : "auth-segment-btn-idle"
                            }`}
                        >
                          <span className="truncate">{t("parentAuth.phoneTab")}</span>
                        </button>
                      </div>

                      <form id="parent-auth-form" onSubmit={handleSubmit} className="space-y-3.5 min-w-0">
                        {!isLogin && (
                          <div>
                            <label className="auth-field-label">
                              {t("parentAuth.name")}
                            </label>
                            <input
                              type="text"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              placeholder={t("parentAuth.enterName")}
                              autoComplete="name"
                              className="auth-mobile-input w-full min-h-11 px-3.5 min-[390px]:px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200/80 dark:focus:ring-cyan-500/40 text-base text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                              required
                            />
                          </div>
                        )}

                        {!isLogin && (
                          <div>
                            <label className="auth-field-label">
                              {t("parentAuth.gender")}
                            </label>
                            <select
                              value={gender}
                              onChange={(e) => setGender(e.target.value as "male" | "female" | "")}
                              className="auth-mobile-input w-full min-h-11 px-3.5 min-[390px]:px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200/80 dark:focus:ring-cyan-500/40 text-base text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                              required
                            >
                              <option value="">{t("parentAuth.selectGender")}</option>
                              <option value="male">{t("parentAuth.genderMale")}</option>
                              <option value="female">{t("parentAuth.genderFemale")}</option>
                            </select>
                          </div>
                        )}

                        {usePhone ? (
                          <>
                            {!isLogin && (
                              <div>
                                <label className="auth-field-label">
                                  {t("parentAuth.email")}
                                </label>
                                <input
                                  type="email"
                                  value={email}
                                  onChange={(e) => setEmail(e.target.value)}
                                  placeholder="example@mail.com"
                                  autoComplete="email"
                                  className="auth-mobile-input w-full min-h-11 px-3.5 min-[390px]:px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200/80 dark:focus:ring-cyan-500/40 focus:placeholder-transparent text-base text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                                />
                              </div>
                            )}
                            <div className="rounded-xl border border-cyan-100 dark:border-cyan-900/40 bg-cyan-50/40 dark:bg-cyan-950/20 p-2.5 min-[390px]:p-3 space-y-1.5">
                              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                                {t("parentAuth.phoneNumber")}
                              </label>
                              <PhoneInput
                                value={phone}
                                onChange={setPhone}
                                countryCode={countryCode}
                                onCountryCodeChange={setCountryCode}
                                placeholder="512345678"
                                showLabel={false}
                              />
                              <p className="text-[10px] min-[390px]:text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                {t("parentAuth.phoneNumber")} · {countryCode}XXXXXXXXX
                              </p>
                            </div>
                            <OTPMethodSelector
                              selectedMethod={phoneOtpMethod}
                              onMethodChange={(method) => {
                                if (method === "sms" || method === "whatsapp") {
                                  setPhoneOtpMethod(method);
                                }
                              }}
                              availableMethods={["sms", "whatsapp"]}
                              isDark={false}
                            />
                          </>
                        ) : (
                          <div>
                            <label className="auth-field-label">
                              {t("parentAuth.email")}
                            </label>
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="example@mail.com"
                              autoComplete="email"
                              className="auth-mobile-input w-full min-h-11 px-3.5 min-[390px]:px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200/80 dark:focus:ring-cyan-500/40 focus:placeholder-transparent text-base text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                              required
                            />
                          </div>
                        )}

                        <div>
                          <label className="auth-field-label">
                            {t("parentAuth.password")}
                          </label>
                          <input
                            type="password"
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value);
                              if (!isLogin) setPasswordStrength(evaluatePasswordStrength(e.target.value));
                            }}
                            placeholder="Aa123456"
                            autoComplete={isLogin ? "current-password" : "new-password"}
                            minLength={isLogin ? undefined : 8}
                            aria-describedby={!isLogin ? "password-strength" : undefined}
                            className="auth-mobile-input w-full min-h-11 px-3.5 min-[390px]:px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200/80 dark:focus:ring-cyan-500/40 focus:placeholder-transparent text-base text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                            required
                          />
                          {!isLogin && password.length > 0 && (
                            <div id="password-strength" className="mt-2">
                              <div className="flex gap-1 mb-1">
                                {[1, 2, 3, 4, 5].map((i) => (
                                  <div
                                    key={i}
                                    className={`h-1.5 flex-1 rounded-full transition-all ${i <= passwordStrength.score ? passwordStrength.color : "bg-gray-200 dark:bg-gray-600"
                                      }`}
                                  />
                                ))}
                              </div>
                              <div className="flex items-center gap-1 text-xs">
                                {passwordStrength.score >= 3 ? (
                                  <CheckCircle className="w-3 h-3 text-green-500" />
                                ) : (
                                  <XCircle className="w-3 h-3 text-red-400" />
                                )}
                                <span className={passwordStrength.score >= 3 ? "text-green-600" : "text-red-500"}>
                                  {passwordStrength.label}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* PIN Code - Registration only */}
                        {!isLogin && (
                          <div>
                            <label className="auth-field-label">
                              {t("parentAuth.pinLabel")}
                            </label>
                            <input
                              type="tel"
                              inputMode="numeric"
                              value={pinCode}
                              onChange={(e) => setPinCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                              placeholder={t("parentAuth.pinPlaceholder")}
                              maxLength={4}
                              className="auth-mobile-input w-full min-h-11 px-3.5 min-[390px]:px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200/80 dark:focus:ring-cyan-500/40 text-base text-gray-900 dark:text-white bg-white dark:bg-gray-700 text-center tracking-widest font-mono"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              {t("parentAuth.pinHelper")}
                            </p>
                          </div>
                        )}

                        {/* Governorate - Registration only */}
                        {!isLogin && (
                          <div>
                            <label className="auth-field-label">
                              {t("parentAuth.governorate")}
                            </label>
                            <GovernorateSelect
                              value={governorate}
                              onChange={setGovernorate}
                              className="auth-mobile-input w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200/80 dark:focus:ring-cyan-500/40 text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              {t("parentAuth.governorateHelper")}
                            </p>
                          </div>
                        )}

                        {!isLogin && (
                          <div className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5">
                            <label className="flex items-start gap-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={acceptedPolicies}
                                onChange={(e) => setAcceptedPolicies(e.target.checked)}
                                className="mt-1 h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                              />
                              <span className="text-xs min-[390px]:text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                                {t("parentAuth.acceptPoliciesLabel")}
                              </span>
                            </label>
                            <div className="mt-2">
                              <a
                                href="/legal"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full inline-flex items-center justify-center rounded-lg border border-cyan-200 dark:border-cyan-700 bg-cyan-50 dark:bg-cyan-900/25 text-cyan-700 dark:text-cyan-200 text-[11px] min-[390px]:text-xs font-bold px-3 py-2 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/80"
                              >
                                {t("parentAuth.quickLinkLegalCenter")}
                              </a>
                            </div>
                          </div>
                        )}

                        {error && (
                          <p
                            className="auth-alert-error"
                            role="alert"
                            aria-live="assertive"
                          >
                            {error}
                          </p>
                        )}

                        {showCreateAccountPrompt && (
                          <div className="auth-alert auth-alert-warning space-y-2">
                            <p className="text-sm text-amber-900 dark:text-amber-200 font-semibold">
                              {t("parentAuth.createAccountPrompt")}
                            </p>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200/80"
                                onClick={() => {
                                  const params = new URLSearchParams(window.location.search);
                                  params.set("mode", "register");
                                  if (createAccountPrefillMode === "phone") {
                                    params.set("prefill_phone", phone.trim());
                                    params.set("prefill_country_code", countryCode);
                                    params.delete("prefill_email");
                                  } else {
                                    params.set("prefill_email", email.trim());
                                    params.delete("prefill_phone");
                                    params.delete("prefill_country_code");
                                  }
                                  navigate(`/parent-auth?${params.toString()}`);
                                  setShowCreateAccountPrompt(false);
                                }}
                              >
                                {t("parentAuth.createAccountConfirm")}
                              </button>
                              <button
                                type="button"
                                className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-bold hover:bg-gray-100 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/80"
                                onClick={() => setShowCreateAccountPrompt(false)}
                              >
                                {t("parentAuth.createAccountCancel")}
                              </button>
                            </div>
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={authMutation.isPending || (!isLogin && !acceptedPolicies)}
                          className={`auth-submit-btn bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/80 ${!isLogin ? "hidden md:block" : ""}`}
                        >
                          {authMutation.isPending ? t("parentAuth.processing") : isLogin ? t("parentAuth.loginCta") : t("parentAuth.register")}
                        </button>
                      </form>

                      <SocialLoginButtons
                        className="mt-6"
                        onProviderClick={handleParentSocialProviderClick}
                        oauthMode="login"
                        returnTo={redirectTarget && redirectTarget.startsWith("/") ? redirectTarget : "/parent-dashboard"}
                        disabled={isSocialRedirecting}
                      />

                      <button
                        onClick={() => {
                          setIsLogin(!isLogin);
                          setAcceptedPolicies(false);
                          setError("");
                        }}
                        className="w-full mt-4 text-cyan-700 hover:text-cyan-800 dark:text-cyan-300 dark:hover:text-cyan-200 font-bold rounded-lg px-2 py-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/80"
                      >
                        {isLogin ? t("parentAuth.noAccount") : t("parentAuth.hasAccount")}
                      </button>

                      {isLogin && (
                        <Link
                          href="/forgot-password"
                          className="w-full mt-2 text-gray-500 hover:text-gray-600 text-sm block text-center cursor-pointer rounded-lg px-2 py-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/80"
                          data-testid="button-forgot-password"
                        >
                          {t("parentAuth.forgotPassword")}
                        </Link>
                      )}
                    </>
                  )}
                </>
              )}

              {authMode !== "parent" && (
                <>
                  <form onSubmit={handleRoleLogin} className="space-y-3.5">
                    <div>
                      <label className="auth-field-label">
                        {authMode === "teacher" ? t("teacherLogin.username") : authMode === "school" ? t("schoolLogin.username") : t("libraryLogin.username")}
                      </label>
                      <input
                        type="text"
                        value={roleUsername}
                        onChange={(e) => setRoleUsername(e.target.value)}
                        placeholder={authMode === "teacher" ? "teacher_001" : authMode === "school" ? "school_admin01" : "library_user01"}
                        className="auth-mobile-input w-full min-h-11 px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200/80 dark:focus:ring-cyan-500/40 text-base text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                        required
                      />
                    </div>

                    <div>
                      <label className="auth-field-label">
                        {authMode === "teacher" ? t("teacherLogin.password") : authMode === "school" ? t("schoolLogin.password") : t("libraryLogin.password")}
                      </label>
                      <div className="relative">
                        <input
                          type={showRolePassword ? "text" : "password"}
                          value={rolePassword}
                          onChange={(e) => setRolePassword(e.target.value)}
                          placeholder="Aa123456"
                          className={`auth-mobile-input w-full min-h-11 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200/80 dark:focus:ring-cyan-500/40 text-base text-gray-900 dark:text-white bg-white dark:bg-gray-700 ${isRTL ? "pl-11 pr-4" : "pr-11 pl-4"}`}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowRolePassword((prev) => !prev)}
                          className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? "left-2" : "right-2"} text-gray-500 hover:text-gray-700 rounded-md p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/80`}
                        >
                          {showRolePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {roleError && (
                      <p className="auth-alert-error" role="alert" aria-live="assertive">
                        {roleError}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={roleLoading}
                      className={`auth-submit-btn focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/80 ${authMode === "teacher" ? "bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700" : authMode === "school" ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" : "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"}`}
                    >
                      {roleLoading
                        ? t("parentAuth.processing")
                        : authMode === "teacher"
                          ? t("teacherLogin.login")
                          : authMode === "school"
                            ? t("schoolLogin.login")
                            : t("libraryLogin.login")}
                    </button>
                  </form>

                  <div className="mt-5 text-center text-sm text-muted-foreground space-y-1">
                    {authMode === "teacher" && (
                      <>
                        <p>{t("teacherLogin.accountCreatedBySchool")}</p>
                        <p className="text-xs">{t("teacherLogin.contactSchoolAdmin")}</p>
                      </>
                    )}
                    {authMode === "school" && (
                      <>
                        <p>{t("schoolLogin.noAccount")}</p>
                        <a
                          href={schoolSupportHref}
                          target={schoolSupportIsExternal ? "_blank" : undefined}
                          rel={schoolSupportIsExternal ? "noopener noreferrer" : undefined}
                          className="text-blue-600 hover:underline rounded px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/80"
                        >
                          {t("schoolLogin.contactSupport")}
                        </a>
                      </>
                    )}
                    {authMode === "library" && (
                      <>
                        <p>{t("libraryLogin.noAccount")}</p>
                        <a
                          href={librarySupportHref}
                          target={librarySupportIsExternal ? "_blank" : undefined}
                          rel={librarySupportIsExternal ? "noopener noreferrer" : undefined}
                          className="text-amber-600 hover:underline rounded px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/80"
                        >
                          {t("libraryLogin.contactSupport")}
                        </a>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className={`max-w-6xl mx-auto mt-4 pb-6 ${isKeyboardOpen ? "hidden md:block" : ""}`}>
          <div className="rounded-2xl border border-slate-200 bg-white/85 backdrop-blur-sm p-3 lg:p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/75">
            <div className="text-center text-slate-700 dark:text-slate-200 text-sm mb-3 font-semibold">{t("parentAuth.quickLinksTitle")}</div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              <Link href="/privacy-policy" className={quickLinkClassName}>{t("parentAuth.quickLinkPrivacy")}</Link>
              <Link href="/terms" className={quickLinkClassName}>{t("parentAuth.quickLinkTerms")}</Link>
              <Link href="/child-safety" className={quickLinkClassName}>{t("parentAuth.quickLinkChildSafety")}</Link>
              <Link href="/refund-policy" className={quickLinkClassName}>{t("parentAuth.quickLinkRefund")}</Link>
              <Link href="/about" className={quickLinkClassName}>{t("parentAuth.quickLinkAbout")}</Link>
              <Link href="/contact" className={quickLinkClassName}>{t("parentAuth.quickLinkContact")}</Link>
              <Link href="/trial-games" className={quickLinkClassName}>{t("parentAuth.quickLinkTrialGames")}</Link>
              <Link href="/download" className={quickLinkClassName}>{t("parentAuth.quickLinkDownload")}</Link>
              <Link href="/legal" className={`${quickLinkClassName} md:col-span-3 lg:col-span-1`}>{t("parentAuth.quickLinkLegalCenter")}</Link>
            </div>
          </div>
        </div>
      </div>

      {!isLogin && authMode === "parent" && !isKeyboardOpen && (
        <div
          className="fixed inset-x-4 z-40 md:hidden"
          style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <button
            type="submit"
            form="parent-auth-form"
            disabled={authMutation.isPending || !acceptedPolicies}
            className="w-full min-h-12 rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white font-bold py-3 shadow-xl ring-1 ring-cyan-200/70 dark:ring-cyan-400/30 backdrop-blur-sm transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/80"
          >
            {authMutation.isPending ? t("parentAuth.processing") : t("parentAuth.register")}
          </button>
        </div>
      )}
    </div>
  );
};
