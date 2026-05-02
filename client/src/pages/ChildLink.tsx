import React, { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import { LanguageSelector } from "@/components/LanguageSelector";
import {
  Gamepad2, Star, Sparkles, ArrowLeft, Loader2, CheckCircle,
  KeyRound, UserPlus, User, QrCode, Camera, Image, X, Heart, Clock, XCircle, ShoppingBag, Download, Share2
} from "lucide-react";
// @ts-ignore
import jsQR from "jsqr";

// Hidden parent access via 5 rapid taps on logo
function useHiddenParentAccess(navigate: (path: string) => void) {
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogoTap = useCallback(() => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      navigate("/parent-auth");
      return;
    }
    tapTimerRef.current = setTimeout(() => {
      tapCountRef.current = 0;
    }, 1500);
  }, [navigate]);

  return handleLogoTap;
}

interface SavedChildInfo {
  childId: string;
  displayName: string;
  token: string;
  savedAt: string;
  avatarColor?: string;
}

type LoginStep = "welcome" | "name_entry" | "waiting_approval" | "new_link";

const AVATAR_COLORS = [
  "from-purple-500 to-pink-500",
  "from-blue-500 to-cyan-500",
  "from-green-500 to-emerald-500",
  "from-orange-500 to-amber-500",
  "from-rose-500 to-red-500",
  "from-indigo-500 to-violet-500",
];

function getOrCreateChildDeviceId(): string {
  const storageKey = "childDeviceId";
  let value = localStorage.getItem(storageKey);
  if (!value) {
    value = `child_device_${crypto.randomUUID()}`;
    localStorage.setItem(storageKey, value);
  }
  return value;
}

export const ChildLink = (): JSX.Element => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const [, navigate] = useLocation();
  const handleLogoTap = useHiddenParentAccess(navigate);
  const [step, setStep] = useState<LoginStep>("welcome");
  const [childName, setChildName] = useState("");
  const [loginParentCode, setLoginParentCode] = useState("");
  const [code, setCode] = useState("");
  const [rememberDevice, setRememberDevice] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [shareStatusMessage, setShareStatusMessage] = useState("");
  const [savedChildren, setSavedChildren] = useState<SavedChildInfo[]>([]);
  const [selectedChild, setSelectedChild] = useState<SavedChildInfo | null>(null);
  const [method, setMethod] = useState<"code" | "qr">("code");
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessingQR, setIsProcessingQR] = useState(false);
  const [showFloatingActions, setShowFloatingActions] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const isScanningRef = useRef(false); // Fix for closure bug in camera scanning

  // Login request state
  const [loginRequestId, setLoginRequestId] = useState<string | null>(null);
  const [loginRequestKey, setLoginRequestKey] = useState<string | null>(null);
  const [loginStatus, setLoginStatus] = useState<"pending" | "approved" | "rejected" | "expired">("pending");
  const loginStatusRef = useRef<"pending" | "approved" | "rejected" | "expired">("pending");
  const [pollingInterval, setPollingIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [childDeviceId] = useState<string>(() => getOrCreateChildDeviceId());
  const draftBirthDate = localStorage.getItem("selectedChildBirthDate") || "";
  const draftAgeRaw = localStorage.getItem("selectedChildAge") || "";
  const parsedDraftAge = Number.parseInt(draftAgeRaw, 10);
  const draftAge = Number.isFinite(parsedDraftAge) && parsedDraftAge > 0 ? parsedDraftAge : null;

  useEffect(() => {
    const action = new URLSearchParams(window.location.search).get("action");
    if (action === "new") {
      setStep("new_link");
      return;
    }
    if (action === "existing") {
      const hasFamilyCode = !!localStorage.getItem("familyCode");
      if (hasFamilyCode) {
        navigate("/");
        return;
      }
      setStep("name_entry");
      return;
    }
    if (action === "trial") {
      navigate("/trial-games");
    }
  }, [navigate]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const floatingActionsTriggerRef = useRef<HTMLButtonElement>(null);
  const floatingActionsCloseRef = useRef<HTMLButtonElement>(null);

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

  // Check for saved sessions on mount - supports multiple children
  useEffect(() => {
    // First check new format (array of children)
    const savedMultiple = localStorage.getItem("savedChildren");
    if (savedMultiple) {
      try {
        const parsed = JSON.parse(savedMultiple);
        if (Array.isArray(parsed)) {
          setSavedChildren(parsed);
        }
      } catch (e) {
        localStorage.removeItem("savedChildren");
      }
    } else {
      // Migrate old single child format to new multi-child format
      const savedSingle = localStorage.getItem("rememberedChild");
      if (savedSingle) {
        try {
          const parsed = JSON.parse(savedSingle);
          const newFormat: SavedChildInfo = {
            ...parsed,
            avatarColor: AVATAR_COLORS[0]
          };
          setSavedChildren([newFormat]);
          localStorage.setItem("savedChildren", JSON.stringify([newFormat]));
          localStorage.removeItem("rememberedChild");
        } catch (e) {
          localStorage.removeItem("rememberedChild");
        }
      }
    }
  }, []);

  // Prevent immediate app exit on Android back when /child-link is opened directly.
  useEffect(() => {
    if (window.history.length <= 1) {
      window.history.pushState({ childLinkGuard: true }, "", window.location.href);
    }

    const onPopState = () => {
      if (window.location.pathname === "/child-link") {
        navigate("/age-gate", { replace: true });
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [navigate]);

  // Cleanup polling AND camera stream on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      // Stop camera stream if still active
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [pollingInterval]);

  // Quick login with cached token for selected child
  const quickLoginMutation = useMutation({
    mutationFn: async (child: SavedChildInfo) => {
      if (!child?.token) throw new Error("NO_SESSION");
      const res = await fetch("/api/child/verify-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${child.token}`
        },
      });
      if (!res.ok) {
        // Remove this child from saved list
        const updatedChildren = savedChildren.filter(c => c.childId !== child.childId);
        setSavedChildren(updatedChildren);
        localStorage.setItem("savedChildren", JSON.stringify(updatedChildren));
        throw new Error("SESSION_EXPIRED");
      }
      const json = await res.json();
      const payload = json?.data || json;
      if (!payload?.valid) {
        const updatedChildren = savedChildren.filter(c => c.childId !== child.childId);
        setSavedChildren(updatedChildren);
        localStorage.setItem("savedChildren", JSON.stringify(updatedChildren));
        throw new Error("SESSION_EXPIRED");
      }
      return child;
    },
    onSuccess: (child) => {
      localStorage.setItem("childToken", child.token);
      localStorage.setItem("childId", child.childId);
      navigate("/child-profile");
    },
    onError: () => {
      setSelectedChild(null);
      setStep("name_entry");
    },
  });

  // Request login from parent - sends notification and waits for approval
  const requestLoginMutation = useMutation({
    mutationFn: async () => {
      if (!childName.trim()) throw new Error("ENTER_NAME_FIRST");
      if (!loginParentCode.trim()) throw new Error("ENTER_PARENT_CODE_FIRST");
      const res = await fetch("/api/child/login-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childName: childName.trim(),
          parentCode: loginParentCode.trim().toUpperCase(),
          deviceId: childDeviceId,
          childBirthDate: draftBirthDate || undefined,
          childAge: draftAge ?? undefined,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "SEND_FAILED");
      }
      return res.json();
    },
    onSuccess: (response) => {
      const requestId = response.data?.requestId;
      const requestKey = response.data?.requestKey;
      if (requestId && requestKey) {
        setLoginRequestId(requestId);
        setLoginRequestKey(requestKey);
        setLoginStatus("pending");
        loginStatusRef.current = "pending";
        setStep("waiting_approval");
        startPolling(requestId, requestKey);
      }
    },
    onError: (error: any) => {
      setErrorMessage(error.message);
    },
  });

  // Start polling for login request status
  const startPolling = (requestId: string, requestKey: string) => {
    // Clear any existing interval
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/child/login-request/${requestId}/status?key=${encodeURIComponent(requestKey)}&deviceId=${encodeURIComponent(childDeviceId)}`);
        if (!res.ok) {
          clearInterval(interval);
          setLoginStatus("expired");
          return;
        }

        const data = await res.json();
        const status = data.data?.status;

        if (status === "approved" && data.data?.token) {
          clearInterval(interval);
          setLoginStatus("approved");
          loginStatusRef.current = "approved";

          // Auto-login
          localStorage.setItem("childToken", data.data.token);

          // Get child info from the token
          try {
            const tokenParts = data.data.token.split(".");
            const payload = JSON.parse(atob(tokenParts[1]));
            localStorage.setItem("childId", payload.childId);

            // Save to remembered children if remember device is on
            if (rememberDevice) {
              const newChild: SavedChildInfo = {
                childId: payload.childId,
                displayName: childName,
                token: data.data.token,
                savedAt: new Date().toISOString(),
                avatarColor: AVATAR_COLORS[savedChildren.length % AVATAR_COLORS.length]
              };
              const existingIndex = savedChildren.findIndex(c => c.childId === payload.childId);
              let updatedChildren: SavedChildInfo[];
              if (existingIndex >= 0) {
                updatedChildren = [...savedChildren];
                updatedChildren[existingIndex] = { ...savedChildren[existingIndex], ...newChild };
              } else {
                updatedChildren = [...savedChildren, newChild];
              }
              setSavedChildren(updatedChildren);
              localStorage.setItem("savedChildren", JSON.stringify(updatedChildren));
            }
          } catch (e) {
            console.error("Error parsing token:", e);
          }

          // Navigate after a short delay to show success
          setTimeout(() => {
            navigate("/child-profile");
          }, 1500);
        } else if (status === "rejected") {
          clearInterval(interval);
          setLoginStatus("rejected");
          loginStatusRef.current = "rejected";
        } else if (status === "expired") {
          clearInterval(interval);
          setLoginStatus("expired");
          loginStatusRef.current = "expired";
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 2000); // Poll every 2 seconds

    setPollingIntervalId(interval);

    // Auto-stop polling after 15 minutes
    setTimeout(() => {
      clearInterval(interval);
      if (loginStatusRef.current === "pending") {
        setLoginStatus("expired");
        loginStatusRef.current = "expired";
      }
    }, 15 * 60 * 1000);
  };

  // Cancel login request
  const cancelRequest = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
    setLoginRequestId(null);
    setLoginRequestKey(null);
    setLoginStatus("pending");
    loginStatusRef.current = "pending";
    setStep("name_entry");
  };

  // New child link - first time setup
  const newLinkMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/child/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childName: childName.trim(),
          code: code.toUpperCase(),
          childBirthDate: draftBirthDate || undefined,
          childAge: draftAge ?? undefined,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "INVALID_CODE");
      }
      return res.json();
    },
    onSuccess: (data) => {
      localStorage.setItem("childToken", data.data.token);
      localStorage.setItem("childId", data.data.childId);
      // Add new child to saved children array
      const newChild: SavedChildInfo = {
        childId: data.data.childId,
        displayName: childName,
        token: data.data.token,
        savedAt: new Date().toISOString(),
        avatarColor: AVATAR_COLORS[savedChildren.length % AVATAR_COLORS.length]
      };
      const updatedChildren = [...savedChildren, newChild];
      setSavedChildren(updatedChildren);
      localStorage.setItem("savedChildren", JSON.stringify(updatedChildren));
      navigate("/child-profile");
    },
    onError: (error: any) => {
      const errorKey = error.message;
      const translatedErrors: Record<string, string> = {
        "INVALID_CODE": t("childLink.invalidCode"),
      };
      setErrorMessage(translatedErrors[errorKey] || error.message);
    },
  });

  // QR code handling - with proper error handling and loading state
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingQR(true);
    setErrorMessage("");

    const reader = new FileReader();

    reader.onerror = () => {
      setIsProcessingQR(false);
      setErrorMessage(t("childLink.imageLoadFailed"));
    };

    reader.onload = (event) => {
      const img = new window.Image();

      img.onerror = () => {
        setIsProcessingQR(false);
        setErrorMessage(t("childLink.imageLoadFailed"));
      };

      img.onload = () => {
        try {
          const canvas = canvasRef.current;
          if (!canvas) {
            setIsProcessingQR(false);
            return;
          }
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            setIsProcessingQR(false);
            return;
          }
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qrCode = jsQR(imageData.data, imageData.width, imageData.height);

          if (qrCode) {
            setCode(qrCode.data.toUpperCase());
            setErrorMessage("");
          } else {
            setErrorMessage(t("childLink.noQRFound"));
          }
        } catch (error) {
          console.error("QR decode error:", error);
          setErrorMessage(t("childLink.qrProcessError"));
        } finally {
          setIsProcessingQR(false);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, [t]);

  const startCameraScanning = async () => {
    isScanningRef.current = true;
    setIsScanning(true);
    setErrorMessage("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        scanQRFromCamera();
      }
    } catch (err) {
      setErrorMessage(t("childLink.cameraAccessDenied"));
      isScanningRef.current = false;
      setIsScanning(false);
    }
  };

  const stopCameraScanning = useCallback(() => {
    isScanningRef.current = false;
    setIsScanning(false);
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (!showFloatingActions && !isScanning) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      if (isScanning) {
        stopCameraScanning();
        return;
      }

      if (showFloatingActions) {
        setShowFloatingActions(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isScanning, showFloatingActions, stopCameraScanning]);

  useEffect(() => {
    if (!showFloatingActions) return;
    const frame = window.requestAnimationFrame(() => floatingActionsCloseRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [showFloatingActions]);

  const scanQRFromCamera = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scan = () => {
      // Use ref instead of state to get current value (fixes closure bug)
      if (!isScanningRef.current) return;

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        try {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qrCode = jsQR(imageData.data, imageData.width, imageData.height);

          if (qrCode) {
            setCode(qrCode.data.toUpperCase());
            stopCameraScanning();
            return;
          }
        } catch (error) {
          console.error("Camera scan error:", error);
        }
      }
      requestAnimationFrame(scan);
    };

    requestAnimationFrame(scan);
  }, [stopCameraScanning]);

  const removeChild = (childId: string) => {
    const updatedChildren = savedChildren.filter(c => c.childId !== childId);
    setSavedChildren(updatedChildren);
    localStorage.setItem("savedChildren", JSON.stringify(updatedChildren));
  };

  const downloadUrl = "/apps/classify-app-latest.apk";
  const shareUrl = `${window.location.origin}/download`;

  const handleShareDownload = async () => {
    const shareTitle = t("childLink.shareAppTitle");
    const shareText = t("childLink.shareAppText");

    try {
      const response = await fetch("/logo.jpg");
      const logoBlob = await response.blob();
      const logoFile = new File([logoBlob], "classify-logo.jpg", {
        type: logoBlob.type || "image/jpeg",
      });

      if (navigator.share && navigator.canShare?.({ files: [logoFile] })) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
          files: [logoFile],
        });
        setShareStatusMessage("");
        return;
      }

      if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        setShareStatusMessage("");
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      setShareStatusMessage(t("childLink.shareCopied"));
    } catch {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setShareStatusMessage(t("childLink.shareCopied"));
      } catch {
        setShareStatusMessage(t("childLink.shareFailed"));
      }
    }
  };

  const handleFloatingAction = (action: "existing" | "new" | "trial") => {
    setShowFloatingActions(false);
    setErrorMessage("");

    if (action === "existing") {
      setStep("name_entry");
      return;
    }

    if (action === "new") {
      setStep("new_link");
      return;
    }

    navigate("/trial-games");
  };

  const childLinkShellClass = "relative min-h-screen overflow-auto bg-[#07192b] text-white [&_button]:transition-all [&_button]:duration-200 [&_button]:active:scale-[0.98] [&_a]:transition-all [&_a]:duration-200 [&_a]:active:scale-[0.98] [&_button_svg]:drop-shadow-[0_8px_14px_rgba(2,132,199,0.35)] [&_a_svg]:drop-shadow-[0_8px_14px_rgba(2,132,199,0.35)]";
  const childLinkCardClass = "rounded-[28px] border border-cyan-100/20 bg-slate-900/45 p-6 sm:p-8 shadow-[0_24px_70px_rgba(3,8,20,0.48)] backdrop-blur-xl";
  const childLinkTextInputClass = "w-full rounded-2xl border border-cyan-100/20 bg-[#0d2740]/85 px-5 py-4 text-center text-xl text-white placeholder:text-white/50 shadow-inner shadow-black/20 focus:border-cyan-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80";

  return (
    <div className={childLinkShellClass} dir={isRTL ? "rtl" : "ltr"}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(6,182,212,0.16),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_2%,rgba(20,184,166,0.14),transparent_42%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(139,92,246,0.10),transparent_48%)]" />
      <div className="relative flex min-h-screen flex-col items-center justify-start md:justify-center p-4 pt-[calc(4.75rem+env(safe-area-inset-top))] md:pt-6">
        {/* Hidden elements for QR scanning */}
        <canvas ref={canvasRef} className="hidden" />
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />

        {/* Video for camera scanning */}
        {isScanning && (
          <div
            className="fixed inset-0 z-50 flex flex-col bg-[#030c16]"
            role="dialog"
            aria-modal="true"
            aria-label={t("childLink.scanWithCamera")}
          >
            <button
              onClick={stopCameraScanning}
              className="absolute right-4 top-4 z-10 rounded-full border border-white/20 bg-white/10 p-2 text-white backdrop-blur-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030c16]"
              aria-label={t("common.close")}
              data-testid="button-stop-camera"
            >
              <X className="w-6 h-6" />
            </button>
            <video ref={videoRef} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Header with language selector */}
        <div
          className={`absolute top-[max(1rem,env(safe-area-inset-top))] z-40 flex max-w-[calc(100vw-1rem)] flex-wrap gap-2 ${isRTL ? "left-4 justify-end" : "right-4 justify-end"}`}
        >
          <button
            onClick={() => navigate("/child-store")}
            className="inline-flex items-center gap-1.5 rounded-full border border-cyan-100/35 bg-gradient-to-b from-cyan-400 to-cyan-600 px-3.5 py-2 font-semibold text-white shadow-[0_12px_28px_rgba(6,182,212,0.40),inset_0_1px_0_rgba(255,255,255,0.35)] hover:brightness-110 motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07192b]"
            data-testid="button-open-store-from-child-link"
          >
            <ShoppingBag className="w-4 h-4" />
            {t("store.title", "المتجر")}
          </button>
          <LanguageSelector />
          <PWAInstallButton variant="compact" />
        </div>

        <div className={`absolute top-[max(1rem,env(safe-area-inset-top))] z-40 ${isRTL ? "right-4" : "left-4"}`}>
          <button
            onClick={() => navigate("/age-gate")}
            className="inline-flex items-center gap-2 rounded-full border border-cyan-100/30 bg-white/10 px-3.5 py-2 font-semibold text-cyan-100 backdrop-blur-xl shadow-[0_10px_24px_rgba(8,47,73,0.35)] transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07192b]"
            data-testid="button-back-to-age-gate"
          >
            <ArrowLeft className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
            <span className="text-sm">{t("childLink.backToAgeGate", "الرجوع لاختيار العمر")}</span>
          </button>
        </div>

        {/* Decorative elements */}
        <div className={`pointer-events-none absolute top-8 left-8 hidden sm:block ${prefersReducedMotion ? "" : "animate-bounce"}`}>
          <Star className="w-8 h-8 text-cyan-300 drop-shadow-lg" fill="currentColor" />
        </div>
        <div className={`pointer-events-none absolute top-20 right-20 hidden lg:block ${prefersReducedMotion ? "" : "animate-pulse"}`}>
          <Sparkles className="w-6 h-6 text-teal-300" />
        </div>
        <div className={`pointer-events-none absolute bottom-20 left-12 hidden md:block ${prefersReducedMotion ? "" : "animate-bounce delay-300"}`}>
          <Gamepad2 className="w-10 h-10 text-violet-300 drop-shadow-lg" />
        </div>

        {/* Main content */}
        <div className="w-full max-w-lg">
          {/* Back button for steps other than welcome */}
          {step !== "welcome" && step !== "waiting_approval" && (
            <button
              onClick={() => {
                setErrorMessage("");
                setStep("welcome");
              }}
              className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-200/35 bg-white/10 px-3 py-2 font-bold text-cyan-100 shadow-[0_10px_24px_rgba(8,47,73,0.35)] transition-colors hover:bg-white/15"
              data-testid="button-back"
            >
              <ArrowLeft className={`w-5 h-5 ${isRTL ? "rotate-180" : ""}`} />
              {t("common.back")}
            </button>
          )}

          {/* ===== WELCOME STEP ===== */}
          {step === "welcome" && (
            <div className={childLinkCardClass}>
              <div className="text-center mb-6">
                {/* Logo: 5 rapid taps opens hidden parent access */}
                <button
                  onClick={handleLogoTap}
                  className="inline-flex items-center justify-center mb-4 focus:outline-none"
                  type="button"
                  aria-label="Classify"
                >
                  <img
                    src="/logo.jpg"
                    alt="Classify"
                    width={80}
                    height={80}
                    className="h-20 w-20 rounded-full border-4 border-cyan-300/80 object-cover shadow-[0_20px_50px_rgba(6,182,212,0.35)]"
                  />
                </button>
                <h1 className="bg-gradient-to-r from-cyan-200 via-teal-100 to-violet-200 bg-clip-text text-3xl font-black text-transparent">
                  {t("childLink.welcome")}
                </h1>
                <p className="mt-2 text-white/70">{t("childLink.letsPlay")}</p>
                <button
                  type="button"
                  onClick={() => navigate("/parent-auth")}
                  className="mt-2 inline-flex items-center rounded-full border border-cyan-200/25 bg-cyan-500/10 px-3 py-1 text-[11px] font-bold text-cyan-100 shadow-[0_8px_20px_rgba(8,47,73,0.35)] hover:bg-cyan-500/15"
                  data-testid="button-five-taps-parent-auth"
                >
                  {t("fiveClickHint", "5 clicks")}
                </button>
              </div>

              {/* Quick login cards for saved children */}
              {savedChildren.length > 0 && (
                <div className="mb-6 space-y-3">
                  <p className="mb-2 text-center text-sm font-medium text-cyan-100/85">
                    {t("childLink.quickLogin")}
                  </p>
                  {savedChildren.map((child, index) => (
                    <div key={child.childId} className="relative group">
                      <button
                        onClick={() => {
                          setSelectedChild(child);
                          quickLoginMutation.mutate(child);
                        }}
                        disabled={quickLoginMutation.isPending && selectedChild?.childId === child.childId}
                        className={`w-full p-4 bg-gradient-to-r ${child.avatarColor || AVATAR_COLORS[index % AVATAR_COLORS.length]} rounded-2xl text-white font-bold text-lg flex items-center gap-4 transition-all hover:scale-[1.02] motion-reduce:transform-none disabled:opacity-70 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/90 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07192b]`}
                        data-testid={`button-quick-login-${index}`}
                      >
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl">
                          {child.displayName.charAt(0)}
                        </div>
                        <span className={`flex-1 ${isRTL ? "text-right" : "text-left"}`}>{child.displayName}</span>
                        {quickLoginMutation.isPending && selectedChild?.childId === child.childId ? (
                          <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                          <CheckCircle className="w-6 h-6" />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeChild(child.childId);
                        }}
                        className={`absolute ${isRTL ? "-left-2" : "-right-2"} -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white opacity-100 shadow transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07192b]`}
                        aria-label={t("childLink.removeChild", "إزالة")}
                        data-testid={`button-remove-child-${index}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-3">
                <button
                  ref={floatingActionsTriggerRef}
                  onClick={() => setShowFloatingActions(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-200/35 bg-cyan-500/20 py-3 text-sm font-extrabold text-cyan-100 shadow-[0_12px_30px_rgba(6,182,212,0.25)] transition-all hover:bg-cyan-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07192b]"
                  aria-haspopup="dialog"
                  aria-expanded={showFloatingActions}
                  aria-controls="child-link-quick-actions-dialog"
                  data-testid="button-open-floating-actions"
                >
                  <Sparkles className="w-4 h-4" />
                  {t("childLink.quickActionsOpen", "اختيارات الدخول السريع")}
                </button>

                <button
                  onClick={() => setStep("name_entry")}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-500 py-4 text-lg font-bold text-white shadow-[0_16px_40px_rgba(6,182,212,0.35)] transition-all duration-200 hover:scale-[1.01] motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07192b]"
                  data-testid="button-existing-child"
                >
                  <User className="w-6 h-6" />
                  {t("childLink.existingChild")}
                </button>

                <button
                  onClick={() => setStep("new_link")}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 py-4 text-lg font-bold text-white shadow-[0_16px_40px_rgba(20,184,166,0.32)] transition-all duration-200 hover:scale-[1.01] motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07192b]"
                  data-testid="button-new-child"
                >
                  <UserPlus className="w-6 h-6" />
                  {t("childLink.newChild")}
                </button>

                <div className="relative flex items-center my-2">
                  <div className="flex-grow border-t border-white/15"></div>
                  <span className="mx-3 text-sm text-violet-200">{t("childLink.or")}</span>
                  <div className="flex-grow border-t border-white/15"></div>
                </div>

                <button
                  onClick={() => navigate("/trial-games")}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-4 text-lg font-bold text-white shadow-[0_16px_40px_rgba(124,58,237,0.35)] transition-all duration-200 hover:scale-[1.01] motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07192b]"
                  data-testid="button-trial-games"
                >
                  <Gamepad2 className="w-6 h-6" />
                  {t("childLink.seeYourGames")}
                  <Sparkles className="w-5 h-5" />
                </button>

                <div className="rounded-2xl border border-amber-200/30 bg-amber-400/10 px-4 py-3 text-center">
                  <p className="text-sm font-extrabold text-amber-100">{t("childLink.parentAccountRequiredTitle", "لازم يكون عند بابا أو ماما حساب")}</p>
                  <p className="mt-1 text-xs leading-relaxed text-amber-50/90">{t("childLink.parentAccountRequiredBody", "عشان تقدر تلعب وتكسب جوائز كثيرة، اطلب من بابا أو ماما يعملوا حساب أو يسجلوا دخول أولاً.")}</p>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <a
                    href={downloadUrl}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200/35 bg-emerald-500/15 py-3 text-sm font-bold text-emerald-100 transition-colors hover:bg-emerald-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07192b]"
                    data-testid="button-download-app-child-link"
                  >
                    <Download className="w-4 h-4" />
                    {t("childLink.downloadAppButton", "تحميل التطبيق")}
                  </a>

                  <button
                    type="button"
                    onClick={handleShareDownload}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-fuchsia-200/30 bg-fuchsia-500/15 py-3 text-sm font-bold text-fuchsia-100 transition-colors hover:bg-fuchsia-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07192b]"
                    data-testid="button-share-download-app-child-link"
                  >
                    <Share2 className="w-4 h-4" />
                    {t("childLink.shareDownloadButton", "مشاركة رابط التحميل")}
                  </button>
                </div>

                {shareStatusMessage ? (
                  <p className="rounded-lg border border-cyan-200/20 bg-cyan-400/10 px-3 py-2 text-center text-xs text-cyan-100/90">
                    {shareStatusMessage}
                  </p>
                ) : null}
              </div>
            </div>
          )}

          {step === "welcome" && showFloatingActions && (
            <div
              className="fixed inset-0 z-[95] bg-black/50 backdrop-blur-[2px] p-4"
              onClick={() => {
                setShowFloatingActions(false);
                floatingActionsTriggerRef.current?.focus();
              }}
            >
              <div className="flex min-h-full items-center justify-center">
                <div
                  id="child-link-quick-actions-dialog"
                  className="w-full max-w-md rounded-3xl border border-cyan-100/25 bg-slate-900/90 p-4 shadow-[0_22px_60px_rgba(3,8,20,0.62)] backdrop-blur-xl"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="child-link-quick-actions-title"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h3 id="child-link-quick-actions-title" className="text-base font-extrabold text-cyan-100">
                      {t("childLink.quickActionsTitle", "اختيار سريع")}
                    </h3>
                    <button
                      ref={floatingActionsCloseRef}
                      type="button"
                      onClick={() => {
                        setShowFloatingActions(false);
                        floatingActionsTriggerRef.current?.focus();
                      }}
                      className="rounded-full border border-white/20 bg-white/10 p-1.5 text-white/85 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08233a]"
                      aria-label={t("childLink.quickActionsClose", "إغلاق")}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="mb-3 text-xs text-cyan-100/80">
                    {t("childLink.quickActionsHint", "اضغط على أي كرت للانتقال، أو اضغط خارج النافذة للإغلاق")}
                  </p>

                  <div className="space-y-3">
                    <button
                      onClick={() => handleFloatingAction("existing")}
                      className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-500 py-4 text-lg font-bold text-white shadow-[0_16px_40px_rgba(6,182,212,0.35)] transition-all duration-200 hover:scale-[1.01] motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08233a]"
                      data-testid="button-floating-existing-child"
                    >
                      <User className="w-6 h-6" />
                      {t("childLink.existingChild")}
                    </button>

                    <button
                      onClick={() => handleFloatingAction("new")}
                      className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 py-4 text-lg font-bold text-white shadow-[0_16px_40px_rgba(20,184,166,0.32)] transition-all duration-200 hover:scale-[1.01] motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08233a]"
                      data-testid="button-floating-new-child"
                    >
                      <UserPlus className="w-6 h-6" />
                      {t("childLink.newChild")}
                    </button>

                    <button
                      onClick={() => handleFloatingAction("trial")}
                      className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-4 text-lg font-bold text-white shadow-[0_16px_40px_rgba(124,58,237,0.35)] transition-all duration-200 hover:scale-[1.01] motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08233a]"
                      data-testid="button-floating-trial-games"
                    >
                      <Gamepad2 className="w-6 h-6" />
                      {t("childLink.seeYourGames")}
                      <Sparkles className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== NAME ENTRY STEP ===== */}
          {step === "name_entry" && (
            <div className={childLinkCardClass}>
              <div className="text-center mb-6">
                <div className="mb-3 inline-flex h-16 w-16 items-center justify-center rounded-full bg-cyan-300/15 border border-cyan-200/25">
                  <User className="w-8 h-8 text-cyan-200" />
                </div>
                <h2 className="text-2xl font-bold text-white">{t("childLink.whatIsYourName")}</h2>
                <p className="mt-1 text-white/70">{t("childLink.enterFullName")}</p>
              </div>

              <div className="space-y-4">
                <label htmlFor="child-link-name-input" className="sr-only">
                  {t("childLink.whatIsYourName")}
                </label>
                <input
                  id="child-link-name-input"
                  type="text"
                  value={childName}
                  onChange={(e) => {
                    setChildName(e.target.value);
                    setErrorMessage("");
                  }}
                  placeholder={t("childLink.exampleName")}
                  className={childLinkTextInputClass}
                  aria-label={t("childLink.whatIsYourName")}
                  aria-invalid={!!errorMessage}
                  aria-describedby={errorMessage ? "child-link-name-entry-error" : undefined}
                  data-testid="input-child-name"
                />

                <label htmlFor="child-link-parent-code-input" className="sr-only">
                  {t("childLink.parentCode")}
                </label>
                <input
                  id="child-link-parent-code-input"
                  type="text"
                  value={loginParentCode}
                  onChange={(e) => {
                    setLoginParentCode(e.target.value.toUpperCase());
                    setErrorMessage("");
                  }}
                  placeholder={t("childLink.parentCode")}
                  className={`${childLinkTextInputClass} font-mono tracking-wider`}
                  maxLength={10}
                  aria-label={t("childLink.parentCode")}
                  aria-invalid={!!errorMessage}
                  aria-describedby={errorMessage ? "child-link-name-entry-error" : undefined}
                  data-testid="input-login-parent-code"
                />

                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                  <input
                    type="checkbox"
                    checked={rememberDevice}
                    onChange={(e) => setRememberDevice(e.target.checked)}
                    className="h-5 w-5 rounded border-white/25 text-cyan-500 focus:ring-cyan-400"
                    data-testid="checkbox-remember"
                  />
                  <span className="font-medium text-white/85">{t("childLink.rememberMe")}</span>
                </label>

                {errorMessage && (
                  <div
                    id="child-link-name-entry-error"
                    role="alert"
                    aria-live="assertive"
                    className="rounded-xl border border-red-300/45 bg-red-500/10 px-4 py-3 text-center text-red-100"
                  >
                    {errorMessage}
                  </div>
                )}

                <button
                  onClick={() => requestLoginMutation.mutate()}
                  disabled={requestLoginMutation.isPending || !childName.trim() || !loginParentCode.trim()}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-500 py-5 text-xl font-bold text-white shadow-[0_18px_45px_rgba(6,182,212,0.35)] transition-all duration-200 hover:scale-[1.01] motion-reduce:transform-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07192b]"
                  data-testid="button-request-login"
                >
                  {requestLoginMutation.isPending ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      {t("childLink.sending")}
                    </>
                  ) : (
                    <>
                      <Heart className="w-6 h-6" />
                      {t("childLink.askParentPermission")}
                    </>
                  )}
                </button>

                <p className="text-center text-sm text-white/65">
                  {t("childLink.parentWillReceiveNotification")}
                </p>
              </div>
            </div>
          )}

          {/* ===== WAITING FOR APPROVAL STEP ===== */}
          {step === "waiting_approval" && (
            <div className={childLinkCardClass}>
              <div className="text-center">
                {loginStatus === "pending" && (
                  <>
                    <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full border border-cyan-200/25 bg-cyan-300/10">
                      <Clock className={`w-10 h-10 text-cyan-200 ${prefersReducedMotion ? "" : "animate-pulse"}`} />
                    </div>
                    <h2 className="mb-2 text-2xl font-bold text-white">
                      {t("childLink.waitingForApproval")}
                    </h2>
                    <p className="mb-6 text-white/70">
                      {t("childLink.askParentToApprove")}
                    </p>

                    {/* Animated dots */}
                    <div className="flex justify-center gap-2 mb-6">
                      <div className={`w-3 h-3 bg-cyan-300 rounded-full ${prefersReducedMotion ? "" : "animate-bounce"}`} style={{ animationDelay: prefersReducedMotion ? "0s" : "0s" }} />
                      <div className={`w-3 h-3 bg-cyan-300 rounded-full ${prefersReducedMotion ? "" : "animate-bounce"}`} style={{ animationDelay: prefersReducedMotion ? "0s" : "0.2s" }} />
                      <div className={`w-3 h-3 bg-cyan-300 rounded-full ${prefersReducedMotion ? "" : "animate-bounce"}`} style={{ animationDelay: prefersReducedMotion ? "0s" : "0.4s" }} />
                    </div>

                    <button
                      onClick={cancelRequest}
                      className="w-full rounded-2xl border border-white/20 bg-white/10 py-3 font-bold text-white transition-all duration-200 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07192b]"
                      data-testid="button-cancel-request"
                    >
                      {t("common.cancel")}
                    </button>
                  </>
                )}

                {loginStatus === "approved" && (
                  <>
                    <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-500/12">
                      <CheckCircle className="w-10 h-10 text-emerald-200" />
                    </div>
                    <h2 className="mb-2 text-2xl font-bold text-emerald-200">
                      {t("childLink.loginApproved")}
                    </h2>
                    <p className="text-white/70">
                      {t("childLink.redirectingNow")}
                    </p>
                    <Loader2 className="mx-auto mt-4 w-8 h-8 animate-spin text-emerald-200" />
                  </>
                )}

                {loginStatus === "rejected" && (
                  <>
                    <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full border border-red-300/35 bg-red-500/12">
                      <XCircle className="w-10 h-10 text-red-200" />
                    </div>
                    <h2 className="mb-2 text-2xl font-bold text-red-200">
                      {t("childLink.loginRejected")}
                    </h2>
                    <p className="mb-6 text-white/70">
                      {t("childLink.parentRejectedLogin")}
                    </p>
                    <button
                      onClick={() => {
                        setLoginStatus("pending");
                        loginStatusRef.current = "pending";
                        setStep("name_entry");
                      }}
                      className="w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-500 py-3 font-bold text-white transition-all duration-200 hover:scale-[1.01] motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07192b]"
                      data-testid="button-try-again"
                    >
                      {t("childLink.tryAgain")}
                    </button>
                  </>
                )}

                {loginStatus === "expired" && (
                  <>
                    <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full border border-white/20 bg-white/10">
                      <Clock className="w-10 h-10 text-cyan-100" />
                    </div>
                    <h2 className="mb-2 text-2xl font-bold text-white">
                      {t("childLink.requestExpired")}
                    </h2>
                    <p className="mb-6 text-white/70">
                      {t("childLink.pleaseRequestAgain")}
                    </p>
                    <button
                      onClick={() => {
                        setLoginStatus("pending");
                        loginStatusRef.current = "pending";
                        setStep("name_entry");
                      }}
                      className="w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-500 py-3 font-bold text-white transition-all duration-200 hover:scale-[1.01] motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07192b]"
                      data-testid="button-request-again"
                    >
                      {t("childLink.sendNewRequest")}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ===== NEW LINK STEP (first time) ===== */}
          {step === "new_link" && (
            <div className={childLinkCardClass}>
              <div className="text-center mb-6">
                <div className="mb-3 inline-flex h-16 w-16 items-center justify-center rounded-full border border-teal-200/25 bg-teal-300/12">
                  <UserPlus className="w-8 h-8 text-teal-100" />
                </div>
                <h2 className="text-2xl font-bold text-white">{t("childLink.newAccount")}</h2>
                <p className="mt-1 text-white/70">{t("childLink.linkWithParents")}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="child-link-new-name-input" className={`mb-2 block text-sm font-bold text-cyan-100/90 ${isRTL ? "text-right" : "text-left"}`}>
                    {t("childLink.yourName")}
                  </label>
                  <input
                    id="child-link-new-name-input"
                    type="text"
                    value={childName}
                    onChange={(e) => {
                      setChildName(e.target.value);
                      setErrorMessage("");
                    }}
                    placeholder={t("childLink.exampleName2")}
                    className={childLinkTextInputClass}
                    aria-invalid={!!errorMessage}
                    aria-describedby={errorMessage ? "child-link-new-link-error" : undefined}
                    data-testid="input-new-child-name"
                  />
                </div>

                {/* Method Tabs */}
                <div className="flex gap-2 rounded-xl border border-white/10 bg-white/5 p-1">
                  <button
                    type="button"
                    onClick={() => setMethod("code")}
                    className={`flex-1 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${method === "code"
                      ? "bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow"
                      : "text-white/75 hover:bg-white/10"
                      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200`}
                  >
                    <KeyRound className="w-4 h-4" />
                    {t("childLink.typeCode")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod("qr")}
                    className={`flex-1 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${method === "qr"
                      ? "bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow"
                      : "text-white/75 hover:bg-white/10"
                      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200`}
                  >
                    <QrCode className="w-4 h-4" />
                    {t("childLink.scanQR")}
                  </button>
                </div>

                {method === "code" && (
                  <div>
                    <label htmlFor="child-link-code-input" className={`mb-2 block text-sm font-bold text-cyan-100/90 ${isRTL ? "text-right" : "text-left"}`}>
                      {t("childLink.parentCode")}
                    </label>
                    <input
                      id="child-link-code-input"
                      type="text"
                      value={code}
                      onChange={(e) => {
                        setCode(e.target.value.toUpperCase());
                        setErrorMessage("");
                      }}
                      placeholder={t("childLink.exampleCode")}
                      className={`${childLinkTextInputClass} font-mono text-2xl tracking-widest`}
                      maxLength={10}
                      aria-invalid={!!errorMessage}
                      aria-describedby={errorMessage ? "child-link-new-link-error" : undefined}
                      data-testid="input-link-code"
                    />
                  </div>
                )}

                {method === "qr" && (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={startCameraScanning}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-200/30 bg-violet-400/20 py-4 font-bold text-violet-100 transition-all duration-200 hover:bg-violet-400/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07192b]"
                      data-testid="button-scan-camera"
                    >
                      <Camera className="w-5 h-5" />
                      {t("childLink.scanWithCamera")}
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-200/25 bg-cyan-400/18 py-4 font-bold text-cyan-100 transition-all duration-200 hover:bg-cyan-400/24 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07192b]"
                      data-testid="button-upload-image"
                    >
                      <Image className="w-5 h-5" />
                      {t("childLink.uploadImage")}
                    </button>

                    {code && (
                      <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-300/35 bg-emerald-500/12 px-4 py-3 text-center text-emerald-100">
                        <CheckCircle className="w-5 h-5" />
                        {t("childLink.codeScanned")} {code}
                      </div>
                    )}
                  </div>
                )}

                {errorMessage && (
                  <div
                    id="child-link-new-link-error"
                    role="alert"
                    aria-live="assertive"
                    className="rounded-xl border border-red-300/45 bg-red-500/10 px-4 py-3 text-center text-red-100"
                  >
                    {errorMessage}
                  </div>
                )}

                <button
                  onClick={() => newLinkMutation.mutate()}
                  disabled={newLinkMutation.isPending || !childName.trim() || !code}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-500 py-4 text-xl font-bold text-white shadow-[0_16px_40px_rgba(6,182,212,0.35)] transition-all duration-200 hover:scale-[1.01] motion-reduce:transform-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07192b]"
                  data-testid="button-link-account"
                >
                  {newLinkMutation.isPending ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      {t("childLink.linking")}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-6 h-6" />
                      {t("childLink.linkAccount")}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChildLink;
