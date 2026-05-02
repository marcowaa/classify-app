import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";
import { Download, ArrowRight, Shield, Smartphone, Zap, ChevronRight, CheckCircle, Lock, Eye, ShieldCheck, Star, Users, BadgeCheck, Package, Globe } from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";

interface LatestReleaseMetadata {
  releaseTag?: string;
  version?: string;
  buildNumber?: string | number;
  aso?: {
    copyKeys?: {
      downloadTitle?: string;
      downloadDescription?: string;
      screenshotsTitle?: string;
      apkCta?: string;
      aabAriaLabel?: string;
      pwaAriaLabel?: string;
    };
    screenshots?: string[];
  };
  files?: {
    apk?: {
      latestUrl?: string;
      size?: string;
      name?: string;
    };
    aab?: {
      latestUrl?: string;
      size?: string;
      name?: string;
    };
  };
}

export default function DownloadApp() {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark } = useTheme();
  const isRTL = i18n.language === "ar";
  const [isPageReady, setIsPageReady] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

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

  const revealStyle = (delayMs = 0) => ({
    opacity: isPageReady ? 1 : 0,
    transform: prefersReducedMotion
      ? "none"
      : (isPageReady ? "translateY(0px)" : "translateY(12px)"),
    transitionProperty: "opacity, transform",
    transitionDuration: prefersReducedMotion ? "120ms, 120ms" : "320ms, 480ms",
    transitionTimingFunction: "ease, cubic-bezier(0.22, 1, 0.36, 1)",
    transitionDelay: prefersReducedMotion ? "0ms" : `${delayMs}ms`,
  });

  const defaultScreenshots = [
    "/screenshots/classify/classify-1.jpeg",
    "/screenshots/classify/classify-2.jpeg",
    "/screenshots/classify/classify-3.jpeg",
    "/screenshots/classify/classify-4.jpeg",
    "/screenshots/classify/classify-5.jpeg",
  ];

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

  const { data: latestRelease } = useQuery<LatestReleaseMetadata | null>({
    queryKey: ["public-latest-release"],
    queryFn: async () => {
      try {
        const res = await fetch("/apps/latest-release.json", { cache: "no-store" });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    },
    staleTime: 30000,
  });

  const features = [
    {
      icon: Shield,
      title: t("downloadAppPage.smartParentalControl"),
      desc: t("downloadAppPage.smartParentalControlDesc"),
      tone: "from-emerald-500/25 to-teal-500/20 text-emerald-200 border-emerald-200/25",
    },
    {
      icon: Smartphone,
      title: t("downloadAppPage.easyToUse"),
      desc: t("downloadAppPage.easyToUseDesc"),
      tone: "from-cyan-500/25 to-sky-500/20 text-cyan-200 border-cyan-200/25",
    },
    {
      icon: Zap,
      title: t("downloadAppPage.educationalTasks"),
      desc: t("downloadAppPage.educationalTasksDesc"),
      tone: "from-violet-500/25 to-fuchsia-500/20 text-violet-200 border-violet-200/25",
    },
  ];

  const trustBadges = [
    {
      icon: ShieldCheck,
      text: t("downloadAppPage.virusFree"),
      tone: "text-emerald-200 border-emerald-200/30 bg-emerald-500/15",
    },
    {
      icon: Lock,
      text: t("downloadAppPage.encryptedData"),
      tone: "text-blue-200 border-blue-200/30 bg-blue-500/15",
    },
    {
      icon: Eye,
      text: t("downloadAppPage.noAds"),
      tone: "text-violet-200 border-violet-200/30 bg-violet-500/15",
    },
    {
      icon: BadgeCheck,
      text: t("downloadAppPage.verifiedTrusted"),
      tone: "text-amber-200 border-amber-200/30 bg-amber-500/15",
    },
  ];

  const securityItems = [
    { icon: Lock, text: t("downloadAppPage.sec1"), tone: "text-cyan-200 bg-cyan-500/15 border-cyan-200/30" },
    { icon: ShieldCheck, text: t("downloadAppPage.sec2"), tone: "text-emerald-200 bg-emerald-500/15 border-emerald-200/30" },
    { icon: Users, text: t("downloadAppPage.sec3"), tone: "text-indigo-200 bg-indigo-500/15 border-indigo-200/30" },
    { icon: Shield, text: t("downloadAppPage.sec4"), tone: "text-blue-200 bg-blue-500/15 border-blue-200/30" },
    { icon: Eye, text: t("downloadAppPage.sec5"), tone: "text-violet-200 bg-violet-500/15 border-violet-200/30" },
    { icon: CheckCircle, text: t("downloadAppPage.sec6"), tone: "text-amber-200 bg-amber-500/15 border-amber-200/30" },
  ];

  const glassPanelClass = "rounded-3xl border border-white/20 bg-slate-950/35 backdrop-blur-xl shadow-[0_18px_40px_rgba(2,8,23,0.35)]";
  const iconChipClass = "inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 shadow-[0_8px_20px_rgba(2,8,23,0.32),inset_0_1px_0_rgba(255,255,255,0.35)]";

  const appSettings = mobileAppSettings?.mobileApp || {};
  const activeApkBuild = mobileAppSettings?.activeApkBuild || null;
  const releaseCopyKeys = latestRelease?.aso?.copyKeys || {};
  const downloadTitleKey = typeof releaseCopyKeys.downloadTitle === "string" && releaseCopyKeys.downloadTitle.trim()
    ? releaseCopyKeys.downloadTitle
    : "downloadApp";
  const downloadDescriptionKey = typeof releaseCopyKeys.downloadDescription === "string" && releaseCopyKeys.downloadDescription.trim()
    ? releaseCopyKeys.downloadDescription
    : "downloadAppDesc";
  const screenshotsTitleKey = typeof releaseCopyKeys.screenshotsTitle === "string" && releaseCopyKeys.screenshotsTitle.trim()
    ? releaseCopyKeys.screenshotsTitle
    : "downloadAppPage.screenshotsTitle";
  const apkCtaKey = typeof releaseCopyKeys.apkCta === "string" && releaseCopyKeys.apkCta.trim()
    ? releaseCopyKeys.apkCta
    : "downloadAppPage.downloadApkCta";
  const aabAriaLabelKey = typeof releaseCopyKeys.aabAriaLabel === "string" && releaseCopyKeys.aabAriaLabel.trim()
    ? releaseCopyKeys.aabAriaLabel
    : "downloadAppPage.aabAriaLabel";
  const pwaAriaLabelKey = typeof releaseCopyKeys.pwaAriaLabel === "string" && releaseCopyKeys.pwaAriaLabel.trim()
    ? releaseCopyKeys.pwaAriaLabel
    : "downloadAppPage.pwaZipAriaLabel";

  const rawMetadataScreenshots = latestRelease?.aso?.screenshots;
  const metadataScreenshots: string[] = Array.isArray(rawMetadataScreenshots)
    ? rawMetadataScreenshots.filter((v: unknown) => typeof v === "string" && v.trim().length > 0)
    : [];
  const configuredScreenshots: string[] = Array.isArray(appSettings.appScreenshots)
    ? appSettings.appScreenshots.filter((v: unknown) => typeof v === "string" && v.trim().length > 0)
    : [];
  const appScreenshots: string[] = metadataScreenshots.length > 0
    ? metadataScreenshots
    : (configuredScreenshots.length > 0 ? configuredScreenshots : defaultScreenshots);
  const apkEnabled = appSettings.apkEnabled !== false;
  const showHomeApkButton = appSettings.showHomeApkButton !== false;
  const showHomeAabButton = appSettings.showHomeAabButton !== false;
  const showHomePwaButton = appSettings.showHomePwaButton !== false;
  const hasAnyDownloadButton = showHomeApkButton || showHomeAabButton || showHomePwaButton;
  const latestApkUrl = typeof latestRelease?.files?.apk?.latestUrl === "string" && latestRelease.files.apk.latestUrl.trim()
    ? latestRelease.files.apk.latestUrl
    : "";
  const latestAabUrl = typeof latestRelease?.files?.aab?.latestUrl === "string" && latestRelease.files.aab.latestUrl.trim()
    ? latestRelease.files.aab.latestUrl
    : "";
  const apkUrl = typeof activeApkBuild?.fileUrl === "string" && activeApkBuild.fileUrl.trim()
    ? activeApkBuild.fileUrl
    : latestApkUrl
      ? latestApkUrl
      : typeof appSettings.apkUrl === "string" && appSettings.apkUrl.trim()
        ? appSettings.apkUrl
        : "/apps/classify-app-latest.apk";
  const apkVersionLabel = typeof activeApkBuild?.version === "string" && activeApkBuild.version.trim()
    ? activeApkBuild.version
    : (typeof appSettings.appVersion === "string" && appSettings.appVersion.trim() ? appSettings.appVersion : "1.3");
  const apkSizeLabel = typeof activeApkBuild?.fileSizeLabel === "string" && activeApkBuild.fileSizeLabel.trim()
    ? activeApkBuild.fileSizeLabel
    : (typeof latestRelease?.files?.apk?.size === "string" && latestRelease.files.apk.size.trim()
      ? latestRelease.files.apk.size
      : (typeof appSettings.apkSize === "string" && appSettings.apkSize.trim() ? appSettings.apkSize : "16 MB"));
  const aabUrl = latestAabUrl || "/apps/classify-googleplay-latest.aab";
  const latestReleaseTag = typeof latestRelease?.releaseTag === "string" ? latestRelease.releaseTag.trim() : "";
  const latestReleaseVersion = typeof latestRelease?.version === "string" ? latestRelease.version.trim() : "";
  const latestReleaseBuildNumber = typeof latestRelease?.buildNumber === "number"
    ? String(latestRelease.buildNumber)
    : typeof latestRelease?.buildNumber === "string"
      ? latestRelease.buildNumber.trim()
      : "";
  const releaseVersionLabel = latestReleaseVersion || apkVersionLabel;
  const releaseBuildLabel = latestReleaseBuildNumber ? `b${latestReleaseBuildNumber}` : "";
  const releaseVersionWithBuild = releaseBuildLabel
    ? `v${releaseVersionLabel} (${releaseBuildLabel})`
    : `v${releaseVersionLabel}`;
  const apkDownloadName = latestReleaseTag
    ? `classify-app-${latestReleaseTag}.apk`
    : `classify-app-v${releaseVersionLabel}.apk`;
  const aabDownloadName = latestReleaseTag
    ? `classify-googleplay-${latestReleaseTag}.aab`
    : `classify-googleplay-v${releaseVersionLabel}.aab`;
  const minAndroidLabel = typeof appSettings.minAndroidVersion === "string" && appSettings.minAndroidVersion.trim()
    ? appSettings.minAndroidVersion
    : "6+";
  const iosEnabled = appSettings.iosEnabled === true;
  const iosUrl = typeof appSettings.iosUrl === "string" ? appSettings.iosUrl : "";

  return (
    <div
      className="min-h-screen relative overflow-hidden text-white [&_a]:active:scale-[0.98] [&_button]:active:scale-[0.98] [&_a_svg]:drop-shadow-[0_8px_14px_rgba(8,47,73,0.35)] [&_button_svg]:drop-shadow-[0_8px_14px_rgba(8,47,73,0.35)]"
      dir={isRTL ? "rtl" : "ltr"}
      style={{
        background: isDark
          ? "radial-gradient(1200px 520px at 82% -12%, rgba(6,182,212,0.24), transparent), radial-gradient(900px 560px at 10% 108%, rgba(20,184,166,0.22), transparent), linear-gradient(180deg, #07192b 0%, #0b2238 46%, #07192b 100%)"
          : "radial-gradient(1100px 520px at 84% -10%, rgba(56,189,248,0.28), transparent), radial-gradient(980px 520px at 12% 102%, rgba(45,212,191,0.28), transparent), linear-gradient(180deg, #0f3a5c 0%, #155f8e 46%, #0f3a5c 100%)",
      }}
    >
      {/* Header */}
      <header className="sticky top-0 z-30 px-4 py-3 md:px-6 md:py-4 bg-slate-950/45 backdrop-blur-2xl border-b border-cyan-100/15 shadow-[0_10px_30px_rgba(2,8,23,0.35)]" style={revealStyle(0)}>
        <div className="max-w-5xl mx-auto flex justify-between items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 rounded-full border border-cyan-100/30 bg-white/10 px-3 py-1.5 text-white hover:bg-white/15 transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/80"
          >
            <ChevronRight className={`w-5 h-5 ${isRTL ? "" : "rotate-180"}`} />
            <span className="font-semibold">{t("downloadAppPage.home")}</span>
          </button>
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSelector />
            <img src="/logo.jpg" alt="Classify" className="h-10 w-10 rounded-full border-2 border-cyan-200/70 object-cover shadow-[0_10px_24px_rgba(8,47,73,0.35)]" />
            <h1 className="hidden sm:block text-lg font-black tracking-wide text-white">Classify</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 md:py-10 space-y-8">
        {/* Hero */}
        <div className={`${glassPanelClass} text-center px-5 py-7 md:px-8 md:py-9`} style={revealStyle(60)}>
          <div className="inline-flex items-center justify-center mb-5 h-24 w-24 rounded-[1.75rem] border border-white/30 bg-gradient-to-br from-green-400 to-emerald-600 shadow-[0_20px_50px_rgba(16,185,129,0.36),inset_0_1px_0_rgba(255,255,255,0.4)]">
            <Download className="w-11 h-11 text-white" />
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-white mb-3 text-balance">
            {t(downloadTitleKey)}
          </h2>
          <p className="text-base md:text-lg text-cyan-100/90 max-w-2xl mx-auto leading-relaxed text-balance">
            {t(downloadDescriptionKey)}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <span className="inline-flex items-center rounded-full border border-cyan-200/35 bg-cyan-500/20 px-3 py-1 text-xs font-extrabold text-cyan-100">
              {releaseVersionWithBuild}
            </span>
            <span className="inline-flex items-center rounded-full border border-emerald-200/35 bg-emerald-500/20 px-3 py-1 text-xs font-extrabold text-emerald-100">
              Android {minAndroidLabel}
            </span>
          </div>
        </div>

        <div className={`${glassPanelClass} px-4 py-5 md:px-6 md:py-6`} style={revealStyle(100)}>
          <h3 className="text-xl md:text-2xl font-black text-white text-center mb-4">
            {t(screenshotsTitleKey)}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {appScreenshots.map((src: string, index: number) => (
              <a
                key={`${src}-${index}`}
                href={src}
                target="_blank"
                rel="noreferrer"
                className="group relative block overflow-hidden rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm shadow-[0_14px_32px_rgba(2,8,23,0.35)] hover:-translate-y-0.5"
                style={revealStyle(130 + index * 25)}
              >
                <img
                  src={src}
                  alt={t("downloadAppPage.screenshotAlt", { index: index + 1 })}
                  loading="lazy"
                  decoding="async"
                  className="h-52 sm:h-56 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2">
                  <p className={`text-xs text-white/90 font-semibold ${isRTL ? "text-right" : "text-left"}`}>
                    {t("downloadAppPage.screenshotLabel", { index: index + 1 })}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Trust Badges Row */}
        <div className={`${glassPanelClass} px-4 py-4`} style={revealStyle(190)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {trustBadges.map((badge, i) => (
              <div key={i} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border shadow-[0_10px_24px_rgba(2,8,23,0.24)] ${badge.tone}`}>
                <span className={`${iconChipClass} h-8 w-8 ${badge.tone}`}>
                  <badge.icon className="w-4 h-4" />
                </span>
                <span className="text-xs sm:text-sm font-semibold text-white leading-tight">{badge.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Download Buttons */}
        <div className={`${glassPanelClass} px-4 py-5 md:px-6 md:py-6`} style={revealStyle(220)}>
          <div className="w-full flex flex-col items-center gap-3">
            {hasAnyDownloadButton && (
              <div className="w-full max-w-xl sm:max-w-none flex flex-col sm:flex-row items-center justify-center gap-3">
                {apkEnabled && showHomeApkButton && (
                  <a
                    href={apkUrl}
                    download={apkDownloadName}
                    aria-label={`${t("downloadApp")} APK`}
                    title={t("downloadAppPage.androidApkVersionTitle", { version: releaseVersionLabel })}
                    className="group relative overflow-hidden w-full sm:w-auto min-h-16 px-4 py-3 rounded-2xl bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 text-white shadow-[0_16px_38px_rgba(16,185,129,0.38),inset_0_1px_0_rgba(255,255,255,0.32)] hover:brightness-110 hover:scale-[1.01] transition-all inline-flex items-center justify-between border border-white/25 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-200/80"
                  >
                    <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.28),transparent_45%)]" />
                    <span className="relative inline-flex items-center gap-3">
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm border border-white/25 shadow-[0_10px_18px_rgba(2,8,23,0.24)]">
                        <Smartphone className="w-6 h-6" />
                      </span>
                      <span className={`leading-tight ${isRTL ? "text-right" : "text-left"}`}>
                        <span className="block text-xs sm:text-sm font-semibold text-white/90">{t("downloadAppPage.androidMobileApp")}</span>
                        <span className="block text-base sm:text-lg font-extrabold tracking-wide">{t(apkCtaKey)}</span>
                        <span className="block text-[11px] sm:text-xs font-semibold text-white/85">
                          {t("downloadAppPage.version")}: {releaseVersionWithBuild}
                        </span>
                      </span>
                    </span>
                    <span className="relative inline-flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-black/20 px-2.5 py-1 text-[11px] font-bold tracking-wide border border-white/20">APK</span>
                      <Download className="w-5 h-5" />
                    </span>
                  </a>
                )}

                {showHomeAabButton && (
                  <a
                    href={aabUrl}
                    download={aabDownloadName}
                    aria-label={t(aabAriaLabelKey)}
                    title={t("downloadAppPage.aabVersionTitle", { version: releaseVersionLabel })}
                    className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-[0_12px_28px_rgba(59,130,246,0.38),inset_0_1px_0_rgba(255,255,255,0.32)] hover:brightness-110 hover:scale-[1.04] transition-all inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200/80"
                  >
                    <Package className="w-7 h-7" />
                  </a>
                )}

                {showHomePwaButton && (
                  <a
                    href="/apps/classify-pwa-latest.zip"
                    download="classify-pwa-latest.zip"
                    aria-label={t(pwaAriaLabelKey)}
                    title={t("downloadAppPage.pwaZipTitle")}
                    className="h-16 w-16 rounded-full bg-gradient-to-br from-cyan-500 to-sky-600 text-white shadow-[0_12px_28px_rgba(14,165,233,0.38),inset_0_1px_0_rgba(255,255,255,0.32)] hover:brightness-110 hover:scale-[1.04] transition-all inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/80"
                  >
                    <Globe className="w-7 h-7" />
                  </a>
                )}
              </div>
            )}

            {hasAnyDownloadButton && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                {apkEnabled && showHomeApkButton && (
                  <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold bg-green-900/30 text-green-200 border border-green-700/80">
                    APK • {t("downloadAppPage.version")} {releaseVersionWithBuild}
                  </span>
                )}
                {showHomeAabButton && (
                  <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold bg-blue-900/30 text-blue-200 border border-blue-700/80">
                    AAB • {t("downloadAppPage.version")} {releaseVersionWithBuild}
                  </span>
                )}
              </div>
            )}

            {iosEnabled && iosUrl && (
              <a
                href={iosUrl}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-3 bg-gradient-to-r from-slate-600 to-gray-700 hover:from-slate-500 hover:to-gray-600 text-white px-8 py-4 rounded-2xl shadow-[0_12px_30px_rgba(71,85,105,0.35),inset_0_1px_0_rgba(255,255,255,0.28)] transition-all hover:-translate-y-0.5 font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200/80"
              >
                <Download className="w-5 h-5" />
                <span>{t("downloadAppPage.appStoreCta")}</span>
              </a>
            )}

            <a
              href="/"
              className="group flex items-center gap-3 bg-white/15 hover:bg-white/25 text-white px-8 py-3 rounded-2xl border border-white/30 backdrop-blur-sm shadow-[0_10px_24px_rgba(2,8,23,0.24)] transition-all font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/80"
            >
              <Smartphone className="w-5 h-5" />
              <span>{t("downloadAppPage.installPwaCta")}</span>
            </a>
          </div>
        </div>

        {/* Verified Developer Badge */}
        <div className="flex justify-center" style={revealStyle(260)}>
          <div className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-green-500/15 border border-green-200/35 shadow-[0_12px_30px_rgba(16,185,129,0.2)]">
            <div className="flex items-center gap-1">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <ShieldCheck className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-green-300">
                {t("downloadAppPage.verifiedDeveloper")}
              </p>
              <p className="text-xs text-green-400/70">
                Classify by Proomnes — {t("downloadAppPage.safeAndTrusted")}
              </p>
            </div>
          </div>
        </div>

        {/* App Info */}
        <div className={`${glassPanelClass} p-5 md:p-6`} style={revealStyle(300)}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-2xl font-bold text-yellow-300">{apkSizeLabel}</p>
              <p className="text-sm text-cyan-100/85">{t("downloadAppPage.appSize")}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-300">v{releaseVersionLabel}</p>
              <p className="text-sm text-cyan-100/85">{t("downloadAppPage.version")}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-300">Android {minAndroidLabel}</p>
              <p className="text-sm text-cyan-100/85">{t("downloadAppPage.requirements")}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-400">✓</p>
              <p className="text-sm text-cyan-100/85">{t("downloadAppPage.free")}</p>
            </div>
          </div>
        </div>

        {/* Security & Privacy Section */}
        <div className={`${glassPanelClass} p-5 md:p-6 border-green-200/20`} style={revealStyle(330)}>
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-400" />
            {t("downloadAppPage.securityPrivacy")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {securityItems.map((item, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5">
                <span className={`${iconChipClass} h-8 w-8 ${item.tone}`}>
                  <item.icon className="w-4 h-4" />
                </span>
                <p className="text-sm text-slate-100">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* User Stats */}
        <div className={`${glassPanelClass} p-4 md:p-5`} style={revealStyle(360)}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl border border-blue-200/20 bg-blue-500/10 p-4">
              <div className="flex items-center justify-center mb-1">
                <Users className="w-5 h-5 text-blue-300" />
              </div>
              <p className="text-2xl font-bold text-white">{t("downloadAppPage.safe")}</p>
              <p className="text-xs text-cyan-100/85">{t("downloadAppPage.forFamilies")}</p>
            </div>
            <div className="rounded-2xl border border-amber-200/20 bg-amber-500/10 p-4">
              <div className="flex items-center justify-center mb-1">
                <Star className="w-5 h-5 text-amber-300" />
              </div>
              <p className="text-2xl font-bold text-white">4.8</p>
              <p className="text-xs text-cyan-100/85">{t("downloadAppPage.userRating")}</p>
            </div>
            <div className="rounded-2xl border border-green-200/20 bg-green-500/10 p-4">
              <div className="flex items-center justify-center mb-1">
                <ShieldCheck className="w-5 h-5 text-green-300" />
              </div>
              <p className="text-2xl font-bold text-white">100%</p>
              <p className="text-xs text-cyan-100/85">{t("downloadAppPage.safeClean")}</p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={revealStyle(390)}>
          {features.map((f, i) => (
            <div key={i} className={`${glassPanelClass} p-5 text-center`}>
              <div className={`mx-auto mb-4 h-16 w-16 ${iconChipClass} bg-gradient-to-br ${f.tone}`}>
                <f.icon className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-cyan-100/85 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Install Instructions */}
        <div className={`${glassPanelClass} p-5 md:p-6`} style={revealStyle(420)}>
          <h3 className="text-xl font-bold text-white mb-4 text-center">
            {t("downloadAppPage.howToInstall")}
          </h3>
          <div className="space-y-3">
            {[
              t("downloadAppPage.step1"),
              t("downloadAppPage.step2"),
              t("downloadAppPage.step3"),
              t("downloadAppPage.step4"),
              t("downloadAppPage.step5"),
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-b from-violet-400 to-violet-600 text-white flex items-center justify-center font-extrabold text-sm shadow-[0_8px_16px_rgba(124,58,237,0.35)]">
                  {i + 1}
                </span>
                <p className="text-cyan-100/90 text-sm leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center" style={revealStyle(450)}>
          <button
            onClick={() => navigate("/parent-auth")}
            className="inline-flex items-center gap-2 rounded-2xl border border-cyan-200/35 bg-gradient-to-r from-cyan-500 to-teal-500 px-6 py-3 text-white font-bold shadow-[0_14px_32px_rgba(6,182,212,0.35),inset_0_1px_0_rgba(255,255,255,0.3)] hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/80"
          >
            {t("downloadAppPage.browserSignup")}
            <ArrowRight className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-cyan-100/75 text-xs">
        {t("downloadAppPage.footerCopyright", { year: new Date().getFullYear() })}
      </footer>
    </div>
  );
}
