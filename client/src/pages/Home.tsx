import React, { useEffect, useState, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import { markTrialExplorationStep } from "@/lib/trialExperience";
import {
    Download,
    Gamepad2,
    Sparkles,
    UserPlus,
    User,
    ShieldCheck,
    ShoppingBag,
    Sun,
    Moon,
} from "lucide-react";

const SlidingAdsCarousel = lazy(() =>
    import("@/components/SlidingAdsCarousel").then((m) => ({ default: m.SlidingAdsCarousel })),
);
const PinEntry = lazy(() =>
    import("@/components/PinEntry").then((m) => ({ default: m.PinEntry })),
);

interface PublicLatestReleaseMetadata {
    releaseTag?: string;
    version?: string;
    files?: {
        apk?: {
            latestUrl?: string;
            name?: string;
        };
    };
    aso?: {
        copyKeys?: {
            downloadTitle?: string;
        };
    };
}

export const Home = (): JSX.Element => {
    const { t, i18n } = useTranslation();
    const [, navigate] = useLocation();
    const { isDark, toggleTheme } = useTheme();

    const isRTL = i18n.language === "ar";
    const [familyCode, setFamilyCode] = useState<string | null>(() => localStorage.getItem("familyCode") || null);
    const [showLanding, setShowLanding] = useState(() => {
        if (localStorage.getItem("familyCode")) return false;
        if (localStorage.getItem("token")) return false;
        if (localStorage.getItem("childToken")) return false;
        return true;
    });

    const { data: latestRelease } = useQuery<PublicLatestReleaseMetadata | null>({
        queryKey: ["public-latest-release", "home"],
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

    const latestApkUrl =
        typeof latestRelease?.files?.apk?.latestUrl === "string" && latestRelease.files.apk.latestUrl.trim()
            ? latestRelease.files.apk.latestUrl
            : "/apps/classi-fy-app-latest.apk";

    const latestReleaseTag =
        typeof latestRelease?.releaseTag === "string" && latestRelease.releaseTag.trim()
            ? latestRelease.releaseTag.trim()
            : "";

    const latestReleaseVersion =
        typeof latestRelease?.version === "string" && latestRelease.version.trim()
            ? latestRelease.version.trim()
            : "";

    const apkDownloadName = latestReleaseTag
        ? `classi-fy-app-${latestReleaseTag}.apk`
        : latestReleaseVersion
            ? `classi-fy-app-v${latestReleaseVersion}.apk`
            : "classi-fy-app-latest.apk";

    const metadataDownloadTitleKey = latestRelease?.aso?.copyKeys?.downloadTitle;
    const downloadTitleKey =
        typeof metadataDownloadTitleKey === "string" && metadataDownloadTitleKey.trim()
            ? metadataDownloadTitleKey
            : "downloadApp";

    useEffect(() => {
        document.documentElement.dir = isRTL ? "rtl" : "ltr";
        document.documentElement.lang = i18n.language;
    }, [i18n.language, isRTL]);

    useEffect(() => {
        markTrialExplorationStep("home");

        const parentToken = localStorage.getItem("token");
        if (parentToken) {
            setShowLanding(false);
            navigate("/parent-dashboard");
            return;
        }

        const childToken = localStorage.getItem("childToken");
        if (childToken) {
            setShowLanding(false);
            navigate("/child-profile");
            return;
        }

        if (familyCode) return;
        setShowLanding(true);
    }, [navigate, familyCode]);

    if (familyCode) {
        return (
            <Suspense fallback={<div className="min-h-screen bg-slate-100 dark:bg-slate-950" />}>
                <PinEntry
                    familyCode={familyCode}
                    onSwitchAccount={() => {
                        localStorage.removeItem("token");
                        localStorage.removeItem("userId");
                        localStorage.removeItem("parentAccountClassification");
                        localStorage.removeItem("childToken");
                        localStorage.removeItem("childId");
                        localStorage.removeItem("childAccountClassification");
                        localStorage.removeItem("deviceTrusted");
                        localStorage.removeItem("familyCode");
                        setFamilyCode(null);
                        setShowLanding(true);
                        navigate("/parent-auth");
                    }}
                />
            </Suspense>
        );
    }

    if (!showLanding) {
        return <div className="min-h-screen bg-slate-100 dark:bg-slate-950" />;
    }

    const publicSeoLinks = [
        { path: latestApkUrl, labelAr: "تحميل التطبيق", labelEn: "Download" },
        { path: "/trial-games", labelAr: "الألعاب التجريبية", labelEn: "Trial Games" },
        { path: "/about", labelAr: "من نحن", labelEn: "About" },
        { path: "/contact", labelAr: "تواصل معنا", labelEn: "Contact" },
        { path: "/privacy-policy", labelAr: "سياسة الخصوصية", labelEn: "Privacy Policy" },
        { path: "/terms", labelAr: "شروط الاستخدام", labelEn: "Terms" },
        { path: "/legal", labelAr: "المركز القانوني", labelEn: "Legal" },
    ];

    return (
        <div
            dir={isRTL ? "rtl" : "ltr"}
            className="min-h-screen text-slate-900 dark:text-slate-100"
            style={{
                fontFamily: '"Cairo","Noto Kufi Arabic","Segoe UI",sans-serif',
                background: isDark
                    ? "linear-gradient(180deg, #070b14 0%, #0e1726 100%)"
                    : "linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%)",
            }}
        >
            <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur-lg dark:border-slate-800/90 dark:bg-slate-950/85">
                <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-5">
                    <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-200">
                            <Gamepad2 className="w-4 h-4" />
                        </span>
                        <div className="leading-none">
                            <p className="text-sm font-black tracking-wide">Classify</p>
                            <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">{t("smartParentalControl", "منصة تعليمية ذكية")}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleTheme}
                            type="button"
                            aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        </button>

                        <div className="hidden sm:block">
                            <LanguageSelector />
                        </div>

                        <div className="hidden sm:block">
                            <PWAInstallButton variant="compact" />
                        </div>

                        <button
                            onClick={() => navigate("/child-store")}
                            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-orange-300 bg-orange-500 px-3 text-sm font-bold text-white transition-colors hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
                        >
                            <ShoppingBag className="w-4 h-4" />
                            {t("store.title", "المتجر")}
                        </button>
                    </div>
                </div>
            </header>

            <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 md:px-5 md:pb-10 md:pt-9">
                <section className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
                    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-8">
                        <div className={`flex flex-col gap-5 ${isRTL ? "items-center text-center lg:items-end lg:text-right" : "items-center text-center lg:items-start lg:text-left"}`}>
                            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-200">
                                <Sparkles className="w-7 h-7" />
                            </span>

                            <div>
                                <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Classify</h1>
                                <p className="mt-2 text-lg font-extrabold text-cyan-700 dark:text-cyan-300">
                                    {t("smartParentalControl", "منصة تعليمية ذكية")}
                                </p>
                                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                                    {t("downloadAppDesc", "تحميل التطبيق على جهازك")}
                                </p>
                            </div>

                            <div className="grid w-full gap-2 sm:grid-cols-3">
                                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-xs font-bold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-300">
                                    <span className="inline-flex items-center gap-1.5">
                                        <ShieldCheck className="w-3.5 h-3.5" />
                                        {t("home.ageGateTrustSafety", "Fun learning")}
                                    </span>
                                </div>
                                <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-center text-xs font-bold text-cyan-700 dark:border-cyan-900/50 dark:bg-cyan-900/20 dark:text-cyan-300">
                                    <span className="inline-flex items-center gap-1.5">
                                        <UserPlus className="w-3.5 h-3.5" />
                                        {t("home.ageGateTrustParental", "Family support")}
                                    </span>
                                </div>
                                <div className="rounded-2xl border border-violet-200 bg-violet-50 px-3 py-2 text-center text-xs font-bold text-violet-700 dark:border-violet-900/50 dark:bg-violet-900/20 dark:text-violet-300">
                                    <span className="inline-flex items-center gap-1.5">
                                        <Sparkles className="w-3.5 h-3.5" />
                                        {t("home.ageGateTrustPolicies", "Skill goals")}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                                <a
                                    href={latestApkUrl}
                                    download={apkDownloadName}
                                    className="inline-flex min-h-10 items-center gap-2 rounded-full border border-cyan-300 bg-cyan-600 px-4 text-sm font-bold text-white transition-colors hover:bg-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                                >
                                    <Download className="w-4 h-4" />
                                    {t(downloadTitleKey, "Download App")}
                                </a>
                                <button
                                    onClick={() => navigate("/trial-games")}
                                    className="inline-flex min-h-10 items-center gap-2 rounded-full border border-violet-300 bg-violet-600 px-4 text-sm font-bold text-white transition-colors hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
                                >
                                    <Gamepad2 className="w-4 h-4" />
                                    {t("childLink.seeYourGames")}
                                </button>
                            </div>
                        </div>
                    </article>

                    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-8">
                        <h2 className={`text-sm font-black text-slate-600 dark:text-slate-300 ${isRTL ? "text-right" : "text-left"}`}>
                            {t("orChoose")}
                        </h2>

                        <div className="mt-3 space-y-3">
                            <button
                                onClick={() => navigate("/child-link?action=existing")}
                                className="w-full rounded-2xl bg-cyan-600 py-3.5 text-base font-bold text-white transition-colors hover:bg-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                            >
                                {t("childLink.existingChild")}
                            </button>

                            <button
                                onClick={() => navigate("/child-link?action=new")}
                                className="w-full rounded-2xl bg-emerald-600 py-3.5 text-base font-bold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                            >
                                {t("childLink.newChild")}
                            </button>

                            <div className="relative py-1 text-center text-xs font-bold text-slate-500 dark:text-slate-400">
                                <span className="relative z-10 bg-white px-2 dark:bg-slate-900">{t("childLink.or")}</span>
                                <span className="absolute inset-x-0 top-1/2 -z-0 h-px bg-slate-200 dark:bg-slate-700" />
                            </div>

                            <button
                                onClick={() => navigate("/trial-games")}
                                className="w-full rounded-2xl bg-violet-600 py-3.5 text-base font-bold text-white transition-colors hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
                            >
                                {t("childLink.seeYourGames")}
                            </button>

                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <button
                                    onClick={() => navigate("/parent-auth")}
                                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                                >
                                    {t("login", "Login")}
                                </button>

                                <button
                                    onClick={() => navigate("/child-store")}
                                    className="w-full rounded-xl border border-orange-300 bg-orange-50 py-2.5 text-sm font-bold text-orange-700 transition-colors hover:bg-orange-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 dark:border-orange-900/50 dark:bg-orange-900/20 dark:text-orange-300 dark:hover:bg-orange-900/30"
                                >
                                    {t("store.title", "المتجر")}
                                </button>
                            </div>
                        </div>
                    </article>
                </section>

                <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className={isRTL ? "text-right" : "text-left"}>
                            <p className="text-sm font-black text-slate-700 dark:text-slate-200">{t(downloadTitleKey, "Download App")}</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                {latestReleaseTag || latestReleaseVersion
                                    ? `${latestReleaseTag || ""}${latestReleaseTag && latestReleaseVersion ? " • " : ""}${latestReleaseVersion ? `v${latestReleaseVersion}` : ""}`
                                    : "Classify APK"}
                            </p>
                        </div>
                        <a
                            href={latestApkUrl}
                            download={apkDownloadName}
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-cyan-300 bg-cyan-600 px-4 text-sm font-bold text-white transition-colors hover:bg-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                        >
                            <Download className="w-4 h-4" />
                            {t(downloadTitleKey, "Download App")}
                        </a>
                    </div>
                </section>

                <section className="mt-5">
                    <Suspense fallback={<div className="min-h-[10rem] rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />}>
                        <SlidingAdsCarousel audience="all" variant="home" isDark={isDark} />
                    </Suspense>
                </section>
            </main>

            <footer className="border-t border-slate-200/80 px-4 py-6 text-center dark:border-slate-800/90">
                <nav aria-label="Public pages" className="mb-3">
                    <div className="mx-auto flex max-w-5xl flex-wrap justify-center gap-2">
                        {publicSeoLinks.map((item) => {
                            const isApkDownload = item.path.endsWith(".apk");
                            return (
                                <a
                                    key={item.path}
                                    href={item.path}
                                    download={isApkDownload ? apkDownloadName : undefined}
                                    className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                                >
                                    {isRTL ? item.labelAr : item.labelEn}
                                </a>
                            );
                        })}
                    </div>
                </nav>
                <p className="text-xs text-slate-500 dark:text-slate-400">© {new Date().getFullYear()} Classify. {t("home.allRightsReserved")}</p>
            </footer>

            <div className="fixed inset-x-4 z-20 md:hidden" style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
                <button
                    onClick={() => navigate("/child-link")}
                    className="flex w-full min-h-12 items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-4 py-3.5 text-base font-black text-white shadow-lg transition-colors hover:bg-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                >
                    <Gamepad2 className="w-5 h-5" />
                    {t("startPlaying")}
                </button>
            </div>
        </div>
    );
};
