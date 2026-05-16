import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Download, FileCheck2, ShieldCheck, User, Users } from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";
import { saveTrialChildLinkData } from "@/lib/trialChildLinkStorage";
import { cacheAdultAccountSession } from "@/lib/adultAccountSessions";

const MIN_AGE = 2;
const MAX_AGE = 60;

type AgeGateIntroCard = {
  id: string;
  title: string;
  body: string;
  imageUrl: string;
  enabled: boolean;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getPreciseAgeFromBirthDate(dateString: string): number | null {
  if (!dateString) return null;
  const birthDate = new Date(dateString);
  if (Number.isNaN(birthDate.getTime())) return null;

  const now = new Date();
  const diffMs = now.getTime() - birthDate.getTime();
  if (diffMs <= 0) return null;

  return diffMs / (1000 * 60 * 60 * 24 * 365.2425);
}

function toInputDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getBirthDateFromAge(age: number): string {
  const now = new Date();
  const days = Math.round(age * 365.2425);
  const adjusted = new Date(now);
  adjusted.setDate(adjusted.getDate() - days);
  return toInputDate(adjusted);
}

export const AgeGate = (): JSX.Element => {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const isRTL = i18n.language === "ar";

  const [selectedAge, setSelectedAge] = useState<number>(MIN_AGE);
  const [birthDate, setBirthDate] = useState<string>(() => getBirthDateFromAge(MIN_AGE));
  const [isDragging, setIsDragging] = useState(false);
  const [useAgeOnly, setUseAgeOnly] = useState(false);
  const [ageFromDateLabel, setAgeFromDateLabel] = useState<string>("");
  const [isParentChoiceOpen, setIsParentChoiceOpen] = useState(false);
  const [isChildChoiceOpen, setIsChildChoiceOpen] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [introCompleted, setIntroCompleted] = useState(false);
  const [isPageReady, setIsPageReady] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const { data: mobileAppSettings } = useQuery({
    queryKey: ["public-mobile-app-settings"],
    queryFn: async () => {
      const res = await fetch("/api/public/mobile-app-settings");
      if (!res.ok) return null;
      const json = await res.json();
      return json?.data || null;
    },
    staleTime: 60000,
  });

  const parentThresholdAge = useMemo(() => {
    const raw = mobileAppSettings?.mobileApp?.parentThresholdAge;
    const parsed = typeof raw === "number" ? raw : Number.parseInt(String(raw ?? ""), 10);
    if (!Number.isFinite(parsed)) return 13;
    return clamp(parsed, 1, 120);
  }, [mobileAppSettings]);

  const ageRangeLabel = useMemo(() => {
    if (selectedAge < parentThresholdAge) {
      return isRTL ? "مسار الطفل" : "Child Path";
    }
    return isRTL ? "مسار ولي الأمر" : "Parent Path";
  }, [selectedAge, isRTL, parentThresholdAge]);

  const ageGateCards = useMemo<AgeGateIntroCard[]>(() => {
    const mobile = mobileAppSettings?.mobileApp || {};

    const normalizeCard = (card: any, index: number): AgeGateIntroCard => ({
      id: String(card?.id || `intro-${index + 1}`),
      title: isRTL
        ? String(card?.titleAr || "").trim()
        : String(card?.titleEn || "").trim(),
      body: isRTL
        ? String(card?.bodyAr || "").trim()
        : String(card?.bodyEn || "").trim(),
      imageUrl: String(card?.imageUrl || "").trim(),
      enabled: card?.enabled !== false,
    });

    if (Array.isArray(mobile?.ageGateIntroCards) && mobile.ageGateIntroCards.length > 0) {
      const normalized = mobile.ageGateIntroCards
        .map((card: any, index: number) => normalizeCard(card, index))
        .filter((card: AgeGateIntroCard) => card.enabled && (card.title || card.body || card.imageUrl));
      if (normalized.length > 0) {
        return normalized;
      }
    }

    const fromConfig = (arKey: string, enKey: string): string => {
      const value = isRTL ? mobile?.[arKey] : mobile?.[enKey];
      return typeof value === "string" ? value.trim() : "";
    };

    const childTitle = fromConfig("ageGateCardChildTitleAr", "ageGateCardChildTitleEn")
      || t("home.ageGateCardChildTitle", "A joyful start for your child");
    const childBody = fromConfig("ageGateCardChildBodyAr", "ageGateCardChildBodyEn")
      || t("home.ageGateCardChildBody", "Short activities and smart games that grow focus, thinking, and confidence every day.");
    const parentTitle = fromConfig("ageGateCardParentTitleAr", "ageGateCardParentTitleEn")
      || t("home.ageGateCardParentTitle", "One simple step for parents");
    const parentBody = fromConfig("ageGateCardParentBodyAr", "ageGateCardParentBodyEn")
      || t("home.ageGateCardParentBody", "Link your child's account and start a clear skill-building plan with encouraging progress moments.");

    return [
      {
        id: "child",
        title: childTitle,
        body: childBody,
        imageUrl: "",
        enabled: true,
      },
      {
        id: "parent",
        title: parentTitle,
        body: parentBody,
        imageUrl: "",
        enabled: true,
      },
    ];
  }, [isRTL, mobileAppSettings, t]);

  const isIntroOverlayEnabled = (mobileAppSettings?.mobileApp?.ageGateIntroOverlayEnabled ?? true) !== false;
  const isIntroOverlayOpen = isIntroOverlayEnabled && ageGateCards.length > 0 && !introCompleted;

  useEffect(() => {
    setActiveCardIndex(0);
    setIntroCompleted(false);
  }, [ageGateCards.length]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsPageReady(true));
    return () => window.cancelAnimationFrame(frame);
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

  const activeCard = ageGateCards[Math.min(activeCardIndex, Math.max(0, ageGateCards.length - 1))];

  const isParentPath = selectedAge >= parentThresholdAge;
  const agePathIntent = isParentPath
    ? t("home.ageGateIntentParent", "You will continue to the parent path")
    : t("home.ageGateIntentChild", "You will continue to the child path");

  const today = new Date().toISOString().slice(0, 10);
  const progress = ((selectedAge - MIN_AGE) / (MAX_AGE - MIN_AGE)) * 100;
  const visualProgress = progress;
  const progressColor = isParentPath ? "#0284c7" : "#0d9488";
  const progressColorSecondary = isParentPath ? "#2563eb" : "#14b8a6";
  const thresholdProgress = ((clamp(parentThresholdAge, MIN_AGE, MAX_AGE) - MIN_AGE) / (MAX_AGE - MIN_AGE)) * 100;
  const visualThresholdProgress = thresholdProgress;
  const ageTicks = [2, 6, 13, 18, 30, 60];
  const renderedAgeTicks = ageTicks;
  const primaryButtonGradient = isParentPath
    ? "linear-gradient(135deg, #0f4aa8 0%, #2563eb 100%)"
    : "linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)";

  const nextPath = useMemo(() => {
    const raw = new URLSearchParams(window.location.search).get("next") || "/";
    return raw.startsWith("/") ? raw : "/";
  }, []);

  const onAgeSliderChange = (value: number) => {
    const clamped = clamp(value, MIN_AGE, MAX_AGE);
    setSelectedAge(clamped);
    setBirthDate(getBirthDateFromAge(clamped));
  };

  const onBirthDateChange = (value: string) => {
    setBirthDate(value);
    const computedAge = getPreciseAgeFromBirthDate(value);
    if (computedAge === null) {
      setAgeFromDateLabel("");
      return;
    }

    const clampedAge = clamp(computedAge, MIN_AGE, MAX_AGE);
    setSelectedAge(clampedAge);
    setAgeFromDateLabel(t("home.ageGateCalculatedAge", "Calculated age: {{age}} years", { age: Math.round(clampedAge) }));
  };

  const startParentTrial = async (effectiveBirthDate: string) => {
    try {
      const res = await fetch("/api/auth/start-parent-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age: selectedAge,
          birthDate: effectiveBirthDate,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const payload = json?.data || json;
        if (payload?.token) localStorage.setItem("token", String(payload.token));
        if (payload?.userId) localStorage.setItem("userId", String(payload.userId));
        if (payload?.uniqueCode) localStorage.setItem("familyCode", String(payload.uniqueCode));
        if (payload?.classification) {
          localStorage.setItem("parentAccountClassification", String(payload.classification));
        }
        if (payload?.token) {
          cacheAdultAccountSession({
            role: "parent",
            token: String(payload.token),
            accountId: payload?.userId,
          });
        }

        const redirectTo = typeof payload?.redirectTo === "string" && payload.redirectTo.startsWith("/")
          ? payload.redirectTo
          : "/parent-dashboard";
        navigate(redirectTo);
        return true;
      }
    } catch {
    }

    return false;
  };

  const startChildTrial = async (effectiveBirthDate: string) => {
    try {
      const res = await fetch("/api/auth/start-child-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age: selectedAge,
          birthDate: effectiveBirthDate,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const payload = json?.data || json;
        const childTrial = payload?.childTrial;

        // Child trial must run as a pure child session, not a mixed parent/child session.
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        localStorage.removeItem("familyCode");
        localStorage.removeItem("parentAccountClassification");

        if (childTrial?.childToken) localStorage.setItem("childToken", String(childTrial.childToken));
        if (childTrial?.childId) localStorage.setItem("childId", String(childTrial.childId));
        if (childTrial?.childName) localStorage.setItem("childName", String(childTrial.childName));
        localStorage.setItem("childAccountClassification", "CHILD_TRIAL");
        if (childTrial?.trialChildToken) localStorage.setItem("trialChildToken", String(childTrial.trialChildToken));
        if (childTrial?.trialChildToken || childTrial?.trialChildLinkUrl || childTrial?.shareCode || childTrial?.trialChildQrCodeUrl) {
          saveTrialChildLinkData({
            trialChildToken: childTrial?.trialChildToken,
            trialChildLinkUrl: childTrial?.trialChildLinkUrl,
            shareCode: childTrial?.shareCode,
            trialChildQrCodeUrl: childTrial?.trialChildQrCodeUrl,
          });
        }

        const redirectTo = typeof payload?.redirectTo === "string" && payload.redirectTo.startsWith("/")
          ? payload.redirectTo
          : "/child-games";
        navigate(redirectTo);
        return true;
      }
    } catch {
    }

    return false;
  };

  const onEnter = async () => {
    if (isIntroOverlayOpen) return;

    const effectiveBirthDate = useAgeOnly ? getBirthDateFromAge(selectedAge) : birthDate;
    if (!effectiveBirthDate) return;

    window.localStorage.setItem("ageGatePassed", "1");
    window.sessionStorage.setItem("ageGatePassed", "1");
    window.sessionStorage.setItem("suppressHomeAgeCard", "1");
    window.sessionStorage.setItem("suppressHomeAgeCardOnce", "1");

    window.localStorage.setItem("selectedChildAge", String(Math.round(selectedAge)));
    window.localStorage.setItem("selectedChildBirthDate", effectiveBirthDate);
    window.localStorage.setItem("selectedChildAgeRangeLabel", ageRangeLabel);

    const childFallbackPath = "/parent-auth?mode=register&classification=child-trial";

    // Keep next-path only when it already points to auth flow and selected flow is parent.
    if (selectedAge >= parentThresholdAge && nextPath && nextPath.startsWith("/parent-auth")) {
      navigate(nextPath);
      return;
    }

    if (selectedAge >= parentThresholdAge) {
      setIsParentChoiceOpen(true);
      return;
    }

    if (selectedAge < parentThresholdAge) {
      setIsChildChoiceOpen(true);
      return;
    }

    navigate(childFallbackPath);
  };

  const onParentChoiceDirect = async () => {
    const effectiveBirthDate = useAgeOnly ? getBirthDateFromAge(selectedAge) : birthDate;
    if (!effectiveBirthDate) return;
    setIsParentChoiceOpen(false);

    const started = await startParentTrial(effectiveBirthDate);
    if (!started) {
      navigate("/parent-auth?classification=parent-trial");
    }
  };

  const onParentChoiceLogin = () => {
    setIsParentChoiceOpen(false);
    navigate("/parent-auth?mode=login&classification=parent");
  };

  const onParentChoiceRegister = () => {
    setIsParentChoiceOpen(false);
    navigate("/parent-auth?mode=register&classification=parent");
  };

  const onChildChoiceDirect = async () => {
    const effectiveBirthDate = useAgeOnly ? getBirthDateFromAge(selectedAge) : birthDate;
    if (!effectiveBirthDate) return;
    setIsChildChoiceOpen(false);

    const started = await startChildTrial(effectiveBirthDate);
    if (!started) {
      navigate("/parent-auth?mode=register&classification=child-trial");
    }
  };

  const onChildChoiceLogin = () => {
    setIsChildChoiceOpen(false);
    navigate("/child-link?action=existing");
  };

  const onNextCard = () => {
    if (ageGateCards.length === 0) {
      setIntroCompleted(true);
      return;
    }

    if (activeCardIndex >= ageGateCards.length - 1) {
      setIntroCompleted(true);
      return;
    }

    const next = activeCardIndex + 1;
    setActiveCardIndex(next);
  };

  const canSubmit = Boolean(useAgeOnly || birthDate);
  const revealStyle = (delayMs = 0): React.CSSProperties => ({
    opacity: isPageReady ? 1 : 0,
    transform: prefersReducedMotion
      ? "none"
      : (isPageReady ? "translateY(0px)" : "translateY(14px)"),
    transitionProperty: "opacity, transform",
    transitionDuration: prefersReducedMotion ? "120ms, 120ms" : "360ms, 520ms",
    transitionTimingFunction: "ease, cubic-bezier(0.22, 1, 0.36, 1)",
    transitionDelay: prefersReducedMotion ? "0ms" : `${delayMs}ms`,
  });
  const glassPanelClass = "rounded-2xl border border-white/25 bg-slate-950/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_18px_38px_rgba(2,23,44,0.32)]";
  const chipPillClass = "inline-flex items-center justify-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_6px_14px_rgba(15,23,42,0.22)]";
  const raisedSoftButtonClass = "w-full rounded-2xl border border-cyan-100/30 bg-white/10 py-2.5 px-3 text-sm font-bold text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_10px_20px_rgba(2,23,44,0.28)] transition-all duration-200 hover:bg-white/15 active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/80";
  const raisedPrimaryButtonClass = "w-full rounded-2xl py-3 px-3 text-sm font-extrabold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_14px_26px_rgba(4,19,36,0.45)] transition-all duration-200 hover:brightness-105 active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/80";
  const modalPanelClass = "w-full max-w-md rounded-[30px] border border-cyan-100/25 bg-slate-950/92 p-5 text-slate-50 shadow-[0_28px_60px_rgba(3,20,38,0.55)] backdrop-blur-xl";

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        fontFamily: '"Tajawal","Baloo 2","Cairo","Segoe UI",sans-serif',
        background:
          "radial-gradient(1050px 520px at 6% -10%, rgba(20,184,166,0.34), transparent), radial-gradient(900px 560px at 95% 108%, rgba(251,191,36,0.28), transparent), linear-gradient(180deg, #07263f 0%, #0b3454 48%, #102a43 100%)",
      }}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 24%, rgba(56,189,248,.24) 0, rgba(56,189,248,0) 35%), radial-gradient(circle at 84% 16%, rgba(251,191,36,.28) 0, rgba(251,191,36,0) 34%), radial-gradient(circle at 52% 84%, rgba(45,212,191,.18) 0, rgba(45,212,191,0) 34%)",
        }}
      />

      <main className="relative z-10 min-h-screen flex items-start sm:items-center justify-center px-4 py-7 sm:py-10 lg:py-12" style={revealStyle(70)}>
        <div className={`absolute top-4 z-20 ${isRTL ? "left-4" : "right-4"}`} style={revealStyle(0)}>
          <LanguageSelector />
        </div>
        <section className="w-full max-w-4xl rounded-[34px] border border-white/25 bg-white/10 backdrop-blur-2xl shadow-[0_28px_70px_rgba(6,35,59,0.35)] p-5 pb-20 sm:pb-7 sm:p-7 md:p-8 text-slate-50">
          <div
            className="absolute inset-x-0 top-0 h-32 rounded-t-[30px] pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at top, rgba(255,255,255,0.22), transparent 75%)",
            }}
          />

          <div className={`relative flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
            <div className="shrink-0 rounded-2xl border border-white/30 bg-white/15 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_10px_18px_rgba(2,23,44,0.3)]">
              <img
                src="/logo.webp"
                alt="Classify"
                className="w-12 h-12 rounded-xl object-cover border border-white/30"
              />
            </div>

            <div className={`min-w-0 flex-1 ${isRTL ? "text-right" : "text-left"} sm:text-center`}>
              <p className="text-[11px] uppercase tracking-[0.22em] text-sky-100/85 font-bold">
                {isRTL ? "بداية آمنة" : "Safe Start"}
              </p>
              <p className="mt-1 text-base sm:text-lg font-black text-slate-100 tracking-wide">
                Classify
              </p>
              <h1 className="text-xl sm:text-[1.65rem] font-black text-white leading-[1.2]">
                {t("home.ageGateTitle", "Choose your age")}
              </h1>
              <p className="text-xs sm:text-sm text-slate-100/80 font-semibold mt-1 leading-relaxed">
                {t("home.ageGateSubtitle", "A safe start for parents and kids")}
              </p>
              <p className="text-[11px] sm:text-xs text-teal-200 font-bold mt-1">
                {t("home.ageGateUseRealAge", "Use your real age")}
              </p>
            </div>

            <a
              href="/apps/classi-fy-app-latest.apk"
              className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-2xl border border-teal-300/45 bg-gradient-to-b from-teal-400 to-teal-600 px-2.5 py-2 text-[11px] sm:text-xs font-extrabold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_12px_20px_rgba(13,148,136,0.4)] transition-all duration-200 hover:brightness-105 active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-200/80"
              aria-label={t("downloadApp", "Download App")}
              title={t("downloadApp", "Download App")}
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t("downloadApp", "Download App")}</span>
              <span className="sm:hidden">APK</span>
            </a>
          </div>

          <div className={`mt-5 px-4 py-4 ${glassPanelClass}`}>
            <h2 className="text-sm font-black text-slate-100">
              {t("home.ageGateHowItWorksTitle", "How it works")}
            </h2>
            <ol className="mt-2 grid gap-2 text-xs sm:text-sm text-slate-100/85 sm:grid-cols-3">
              <li className="rounded-xl border border-white/20 bg-white/10 px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_8px_16px_rgba(2,23,44,0.18)]">
                <span className="mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/35 bg-white/15 text-[10px] font-black">1</span>
                <p>{t("home.ageGateStep1", "Choose your real age")}</p>
              </li>
              <li className="rounded-xl border border-white/20 bg-white/10 px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_8px_16px_rgba(2,23,44,0.18)]">
                <span className="mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/35 bg-white/15 text-[10px] font-black">2</span>
                <p>{t("home.ageGateStep2", "We automatically select the right path")}</p>
              </li>
              <li className="rounded-xl border border-white/20 bg-white/10 px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_8px_16px_rgba(2,23,44,0.18)]">
                <span className="mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/35 bg-white/15 text-[10px] font-black">3</span>
                <p>{t("home.ageGateStep3", "Continue to child or parent experience")}</p>
              </li>
            </ol>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className={`relative px-4 py-4.5 ${glassPanelClass}`}>
              <div className="text-center">
                <span
                  className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/35 bg-white/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_10px_20px_rgba(2,23,44,0.28)]"
                  aria-hidden
                >
                  {isParentPath ? <Users className="h-5 w-5" /> : <User className="h-5 w-5" />}
                </span>
                <div className="mt-1 flex items-end justify-center gap-2">
                  <span className="text-5xl font-black leading-none text-white tabular-nums">{selectedAge.toFixed(1)}</span>
                  <span className="text-sm font-bold text-slate-200 mb-1">{t("home.ageGateYears", "years")}</span>
                </div>
                <p className="text-[12px] sm:text-sm text-teal-100 font-semibold mt-2 rounded-xl border border-white/30 bg-white/15 px-2.5 py-1.5 inline-block shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_8px_14px_rgba(2,23,44,0.24)]">
                  {agePathIntent}
                </p>
              </div>

              <div className="mt-4.5 relative" dir="ltr">
                <div className="relative h-6">
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2.5 rounded-full bg-white/60 overflow-hidden shadow-[inset_0_2px_6px_rgba(8,47,73,0.28)]">
                    <div
                      className="h-full rounded-full transition-all duration-200"
                      style={{
                        width: `${visualProgress}%`,
                        background: `linear-gradient(90deg, ${progressColor}, ${progressColorSecondary})`,
                        boxShadow: `0 0 16px ${isParentPath ? "rgba(6,182,212,0.45)" : "rgba(13,148,136,0.42)"}`,
                      }}
                    />
                  </div>

                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-6 w-6 rounded-full border-2 border-white bg-white shadow-[0_0_0_5px_rgba(127,61,240,0.22)] pointer-events-none transition-all duration-200"
                    style={{
                      left: `calc(${visualProgress}% - 12px)`,
                      boxShadow: isParentPath
                        ? "0 8px 18px rgba(37,99,235,0.45), 0 0 0 6px rgba(14,165,233,0.24)"
                        : "0 8px 18px rgba(13,148,136,0.45), 0 0 0 6px rgba(20,184,166,0.24)",
                    }}
                    aria-hidden
                  />

                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-4 w-[2px]"
                    style={{
                      background: isParentPath ? "rgba(37,99,235,0.75)" : "rgba(13,148,136,0.75)",
                      left: `calc(${visualThresholdProgress}% - 1px)`,
                    }}
                    aria-hidden
                  />

                  <input
                    type="range"
                    min={MIN_AGE}
                    max={MAX_AGE}
                    step={0.05}
                    value={selectedAge}
                    onChange={(e) => {
                      const raw = Number(e.target.value);
                      onAgeSliderChange(raw);
                    }}
                    onPointerDown={() => setIsDragging(true)}
                    onPointerUp={() => setIsDragging(false)}
                    onPointerLeave={() => setIsDragging(false)}
                    dir="ltr"
                    className={`absolute inset-0 w-full opacity-0 ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
                    aria-label={t("home.ageGateSliderLabel", "Age")}
                  />
                </div>

                <div className="mt-3.5 relative">
                  <div className="flex items-center justify-between text-[11px] text-slate-200 font-semibold px-0.5">
                    {renderedAgeTicks.map((tick) => (
                      <span key={tick}>{tick}</span>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-200 mt-1.5 leading-relaxed">
                    {t("home.ageGateSliderDragHint", "Drag the circle slowly for accurate age selection")}
                  </p>
                  <p className="text-[10px] text-cyan-100 mt-1 leading-relaxed">
                    {t("home.ageGateThresholdHint", "Parent path starts from age {{age}}", { age: parentThresholdAge })}
                  </p>
                </div>
              </div>

              <div
                className="mt-3 rounded-xl border border-white/35 bg-white/15 py-2 px-3 text-center text-sm font-extrabold shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_18px_rgba(2,23,44,0.24)]"
                style={{
                  color: isParentPath ? "#bfdbfe" : "#ccfbf1",
                  transform: isDragging ? "scale(1.015)" : "scale(1)",
                  transition: "transform .2s ease",
                }}
              >
                {ageRangeLabel}
              </div>
            </div>

            <div className={`px-4 py-4 ${glassPanelClass}`}>
              <label htmlFor="birth-date" className="block text-sm font-bold text-slate-100 mb-2">
                {t("home.ageGateBirthDateLabel", "Date of birth")}
              </label>

              <label className="flex items-center gap-2 mb-3 text-xs sm:text-sm text-slate-200 font-semibold cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={useAgeOnly}
                  onChange={(e) => setUseAgeOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-white/50 bg-white/60 accent-cyan-500 shadow-[0_3px_8px_rgba(15,23,42,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
                />
                {t("home.ageGateUseAgeOnly", "Use age only (without birth date)")}
              </label>

              <input
                id="birth-date"
                type="date"
                value={birthDate}
                max={today}
                onChange={(e) => onBirthDateChange(e.target.value)}
                disabled={useAgeOnly}
                className="w-full rounded-2xl border border-white/60 bg-white/90 px-3 py-2.5 text-slate-800 font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_16px_rgba(15,23,42,0.18)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/80"
                style={{
                  boxShadow: "0 0 0 0 rgba(127,61,240,0.35)",
                }}
              />

              {ageFromDateLabel ? (
                <p className="text-xs text-cyan-100 mt-2 font-semibold">{ageFromDateLabel}</p>
              ) : null}

              <p className="text-xs text-slate-200/85 mt-2">
                {useAgeOnly
                  ? t("home.ageGateDateOptionalHint", "You can continue using only the selected age.")
                  : (isRTL
                    ? "يتغير تاريخ الميلاد تلقائيًا عند تغيير العمر من الشريط"
                    : "Birth date updates automatically when age changes from the slider")}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <span className={`${chipPillClass} border-emerald-300/60 bg-emerald-100/90 text-emerald-700`}>
              <ShieldCheck className="w-3.5 h-3.5" />
              {t("home.ageGateTrustSafety", "Fun learning")}
            </span>
            <span className={`${chipPillClass} border-cyan-300/60 bg-cyan-100/90 text-cyan-700`}>
              <Users className="w-3.5 h-3.5" />
              {t("home.ageGateTrustParental", "Family support")}
            </span>
            <span className={`${chipPillClass} border-violet-300/60 bg-violet-100/90 text-violet-700`}>
              <FileCheck2 className="w-3.5 h-3.5" />
              {t("home.ageGateTrustPolicies", "Skill goals")}
            </span>
          </div>

          <div className={`mt-4 px-4 py-3 text-center ${glassPanelClass} border-cyan-200/35 bg-cyan-500/10`}>
            <a
              href="/about"
              className="inline-flex items-center justify-center rounded-2xl border border-cyan-200/50 bg-gradient-to-b from-cyan-400 to-cyan-600 px-4 py-2 text-sm sm:text-base font-extrabold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_12px_22px_rgba(6,95,130,0.4)] transition-all duration-200 hover:brightness-105 active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/80"
              aria-label={isRTL ? "صفحة شرح المنصة بالكامل" : "Full platform guide page"}
            >
              {isRTL ? "صفحة شرح المنصة بالكامل" : "Full Platform Guide"}
            </a>
            <p className="mt-2 text-[11px] sm:text-xs text-cyan-100/95 font-semibold leading-relaxed">
              {isRTL
                ? "في Classify دور الأهل هو دعم الأبناء وتوجيههم لبناء مهارات قوية، وليس مراقبتهم بشكل ضاغط."
                : "In Classify, parents are here to support and guide children, not to pressure them with surveillance."}
            </p>
          </div>

          <button
            type="button"
            onClick={onEnter}
            disabled={!canSubmit}
            className="mt-4 hidden sm:block w-full rounded-2xl py-3.5 px-4 text-white font-black text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_14px_26px_rgba(3,15,30,0.4)] disabled:opacity-45 disabled:cursor-not-allowed transition-all duration-200 hover:brightness-105 active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/80"
            style={{ background: primaryButtonGradient }}
          >
            {isParentPath
              ? t("login", "Login")
              : t("home.ageGateEnterChild", "Enter as Child")}
          </button>

          <p className="mt-2 text-center text-[11px] sm:text-xs text-slate-100/80 font-semibold">
            {t("home.ageGatePrimaryHint", "You can change age at any time before continuing")}
          </p>
        </section>
      </main>

      {isIntroOverlayOpen && activeCard ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/60 backdrop-blur-[3px] px-4" role="dialog" aria-modal="true">
          <section className={modalPanelClass}>
            <div className="mb-2 flex items-center justify-center gap-2">
              <img src="/logo.webp" alt="Classify" className="h-7 w-7 rounded-full object-cover border border-white/30" />
              <p className="text-sm font-black tracking-wide text-slate-100">Classify</p>
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-black text-cyan-100">
                {t("home.ageGateCardsTitle", "Quick start cards")}
              </p>
              <p className="text-[11px] font-bold text-cyan-100/90 tabular-nums">
                {Math.min(activeCardIndex + 1, ageGateCards.length)}/{ageGateCards.length}
              </p>
            </div>

            <p className="mt-1 text-[11px] text-slate-200/85 font-semibold">
              {t("home.ageGateCardsSubtitle", "Read each card with next and previous buttons")}
            </p>

            {activeCard.imageUrl ? (
              <img
                src={activeCard.imageUrl}
                alt={activeCard.title || "Age intro"}
                className="mt-3 h-36 w-full rounded-xl object-cover border border-white/15"
              />
            ) : null}

            <div className="mt-3 rounded-2xl border border-cyan-100/25 bg-white/10 px-3.5 py-3 min-h-[128px] shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_10px_18px_rgba(2,23,44,0.24)]">
              <h3 className="text-[15px] font-black text-slate-100 leading-snug">
                {activeCard.title}
              </h3>
              <p className="mt-1.5 text-xs sm:text-sm font-semibold text-slate-200/90 leading-relaxed">
                {activeCard.body}
              </p>
            </div>

            <button
              type="button"
              onClick={onNextCard}
              className={`${raisedPrimaryButtonClass} mt-3 border border-cyan-200/35`}
              style={{ background: "linear-gradient(140deg, #0891b2 0%, #0d9488 100%)" }}
            >
              {activeCardIndex >= ageGateCards.length - 1
                ? (isRTL ? "ابدأ الآن" : "Start now")
                : t("home.ageGateCardsNext", "Next")}
            </button>

            <p className="mt-2 text-[11px] text-slate-200/80 font-semibold text-center">
              {t("home.ageGateCardsPendingHint", "Please read the next card to continue.")}
            </p>
          </section>
        </div>
      ) : null}

      <div className="sm:hidden fixed inset-x-4 z-20" style={{ ...revealStyle(140), bottom: "max(0.85rem, env(safe-area-inset-bottom))" }}>
        <button
          type="button"
          onClick={onEnter}
          disabled={!canSubmit}
          className="w-full rounded-2xl py-3.5 px-4 text-white font-black text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_16px_26px_rgba(3,15,30,0.45)] disabled:opacity-45 disabled:cursor-not-allowed transition-all duration-200 active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/80"
          style={{ background: primaryButtonGradient }}
        >
          {isParentPath
            ? t("login", "Login")
            : t("home.ageGateEnterChild", "Enter as Child")}
        </button>
      </div>

      {isParentChoiceOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 backdrop-blur-[3px] px-4" role="dialog" aria-modal="true">
          <section className={modalPanelClass}>
            <h2 className="text-lg font-black leading-snug text-slate-100">
              {t("home.ageGateParentChoiceTitle", "Parent access options")}
            </h2>
            <p className="mt-2 text-sm text-slate-200/90 leading-relaxed">
              {t(
                "home.ageGateParentChoiceDescription",
                "You are classified as a parent. Choose direct trial entry without account, or go to parent login/register pages.",
              )}
            </p>

            <div className="mt-4 grid gap-2.5">
              <button
                type="button"
                onClick={onParentChoiceDirect}
                className={raisedPrimaryButtonClass}
                style={{ background: "linear-gradient(140deg, #0f4aa8 0%, #2563eb 100%)" }}
              >
                {t("home.ageGateParentChoiceDirect", "Direct entry (I do not have an account)")}
              </button>

              <button
                type="button"
                onClick={onParentChoiceLogin}
                className={raisedSoftButtonClass}
              >
                {t("home.ageGateParentChoiceLogin", "Go to parent login")}
              </button>

              <button
                type="button"
                onClick={onParentChoiceRegister}
                className={raisedSoftButtonClass}
              >
                {t("home.ageGateParentChoiceRegister", "Go to create a new parent account")}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsParentChoiceOpen(false)}
              className="mt-3 w-full rounded-xl py-2 px-3 text-xs font-bold text-slate-300 hover:text-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/80"
            >
              {t("home.ageGateParentChoiceCancel", "Cancel")}
            </button>
          </section>
        </div>
      ) : null}

      {isChildChoiceOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 backdrop-blur-[3px] px-4" role="dialog" aria-modal="true">
          <section className={modalPanelClass}>
            <h2 className="text-lg font-black leading-snug text-slate-100">
              {t("home.ageGateChildChoiceTitle", "Child access options")}
            </h2>
            <p className="mt-2 text-sm text-slate-200/90 leading-relaxed">
              {t(
                "home.ageGateChildChoiceDescription",
                "You are classified as a child. Choose direct entry, or if you already have an account go to child login.",
              )}
            </p>

            <div className="mt-4 grid gap-2.5">
              <button
                type="button"
                onClick={onChildChoiceDirect}
                className={raisedPrimaryButtonClass}
                style={{ background: "linear-gradient(140deg, #0f766e 0%, #14b8a6 100%)" }}
              >
                {t("home.ageGateChildChoiceDirect", "Direct entry")}
              </button>

              <button
                type="button"
                onClick={onChildChoiceLogin}
                className={raisedSoftButtonClass}
              >
                {t("home.ageGateChildChoiceLogin", "I already have an account")}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsChildChoiceOpen(false)}
              className="mt-3 w-full rounded-xl py-2 px-3 text-xs font-bold text-slate-300 hover:text-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/80"
            >
              {t("home.ageGateChildChoiceCancel", "Cancel")}
            </button>
          </section>
        </div>
      ) : null}
    </div>
  );
};
