import { useEffect, useRef, useState, lazy, Suspense } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SEOProvider } from "@/components/SEOProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OfflineGuard } from "@/components/OfflineGuard";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { WhatsAppSupportButton } from "@/components/WhatsAppSupportButton";
import { useToast } from "@/hooks/use-toast";
import { useNotificationPermissionRecovery } from "@/hooks/useNotificationPermissionRecovery";
import { usePersistentSession } from "@/hooks/usePersistentSession";
import { bootOneSignalIdentitySync } from "@/lib/oneSignalBridge";
import { emitNotificationSync } from "@/lib/notificationRealtime";
import { markTrialRouteExploration } from "@/lib/trialExperience";
import { decideTrialRouteRedirect } from "@/lib/trialRouteGuard";
import { ensureTrialWriteAllowed } from "@/lib/trialWriteGuard";
import { resolveBrowserSessionChannel } from "@/lib/sessionPriority";
import { useMobileControls } from "@/capacitor/hooks/useMobileControls";
import { ParentDashboard } from "@/pages/ParentDashboard";
const Toaster = lazy(() => import("@/components/ui/toaster").then(m => ({ default: m.Toaster })));
const NotFound = lazy(() => import("@/pages/not-found"));

const RandomAdPopup = lazy(() => import("@/components/RandomAdPopup").then(m => ({ default: m.RandomAdPopup })));

const Home = lazy(() => import("@/pages/Home").then(m => ({ default: m.Home })));
const AgeGate = lazy(() => import("@/pages/AgeGate").then(m => ({ default: m.AgeGate })));

const ChildAppWrapper = lazy(() => import("@/components/ChildAppWrapper").then(m => ({ default: m.ChildAppWrapper })));

const ParentAuth = lazy(() => import("@/pages/ParentAuth").then(m => ({ default: m.ParentAuth })));
const ChildLink = lazy(() => import("@/pages/ChildLink").then(m => ({ default: m.ChildLink })));
const ChildGames = lazy(() => import("@/pages/ChildGames").then(m => ({ default: m.ChildGames })));

const ParentStore = lazy(() => import("@/pages/ParentStore").then(m => ({ default: m.ParentStore })));
const ChildStore = lazy(() => import("@/pages/ChildStore").then(m => ({ default: m.ChildStore })));
const ChildGifts = lazy(() => import("@/pages/ChildGifts").then(m => ({ default: m.ChildGifts })));
const ChildNotifications = lazy(() => import("@/pages/ChildNotifications").then(m => ({ default: m.ChildNotifications })));
const Privacy = lazy(() => import("@/pages/Privacy").then(m => ({ default: m.Privacy })));
const Terms = lazy(() => import("@/pages/Terms").then(m => ({ default: m.Terms })));
const Settings = lazy(() => import("@/pages/Settings").then(m => ({ default: m.Settings })));
const Wallet = lazy(() => import("@/pages/Wallet").then(m => ({ default: m.Wallet })));
const Subjects = lazy(() => import("@/pages/Subjects").then(m => ({ default: m.Subjects })));
const Notifications = lazy(() => import("@/pages/Notifications").then(m => ({ default: m.Notifications })));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard").then(m => ({ default: m.AdminDashboard })));
const AdminAuth = lazy(() => import("@/pages/AdminAuth").then(m => ({ default: m.AdminAuth })));
const OTPVerification = lazy(() => import("@/pages/OTPVerification").then(m => ({ default: m.OTPVerification })));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy").then(m => ({ default: m.PrivacyPolicy })));
const AccessibilityPolicy = lazy(() => import("@/pages/AccessibilityPolicy").then(m => ({ default: m.AccessibilityPolicy })));
const AccountDeletion = lazy(() => import("@/pages/AccountDeletion").then(m => ({ default: m.AccountDeletion })));
const AboutUs = lazy(() => import("@/pages/AboutUs").then(m => ({ default: m.AboutUs })));
const ContactUs = lazy(() => import("@/pages/ContactUs").then(m => ({ default: m.ContactUs })));
const CookiePolicy = lazy(() => import("@/pages/CookiePolicy").then(m => ({ default: m.CookiePolicy })));
const ChildSafety = lazy(() => import("@/pages/ChildSafety").then(m => ({ default: m.ChildSafety })));
const RefundPolicy = lazy(() => import("@/pages/RefundPolicy").then(m => ({ default: m.RefundPolicy })));
const AcceptableUse = lazy(() => import("@/pages/AcceptableUse").then(m => ({ default: m.AcceptableUse })));
const LegalCenter = lazy(() => import("@/pages/LegalCenter").then(m => ({ default: m.LegalCenter })));
const AssignTask = lazy(() => import("@/pages/AssignTask").then(m => ({ default: m.AssignTask })));
const SubjectTasks = lazy(() => import("@/pages/SubjectTasks"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword").then(m => ({ default: m.ForgotPassword })));
const AdminPurchasesTab = lazy(() => import("@/pages/AdminPurchasesTab"));
const ParentInventory = lazy(() => import("@/pages/ParentInventory"));
const ChildRewards = lazy(() => import("@/pages/ChildRewards"));

const ChildProgress = lazy(() => import("@/pages/ChildProgress"));
const ChildTasks = lazy(() => import("@/pages/ChildTasks"));
const ParentTasks = lazy(() => import("@/pages/ParentTasks"));
const LibraryLogin = lazy(() => import("@/pages/LibraryLogin"));
const LibraryDashboard = lazy(() => import("@/pages/LibraryDashboard"));
const LibraryStore = lazy(() => import("@/pages/LibraryStore"));
const TrialGames = lazy(() => import("@/pages/TrialGames").then(m => ({ default: m.TrialGames })));
const Match3Page = lazy(() => import("@/games/match3/Match3Page"));
const MemoryMatchPage = lazy(() => import("@/pages/MemoryMatchPage"));
const SchoolLogin = lazy(() => import("@/pages/SchoolLogin"));
const SchoolDashboard = lazy(() => import("@/pages/SchoolDashboard"));
const TeacherLogin = lazy(() => import("@/pages/TeacherLogin"));
const TeacherDashboard = lazy(() => import("@/pages/TeacherDashboard"));
const SchoolProfile = lazy(() => import("@/pages/SchoolProfile"));
const TeacherProfile = lazy(() => import("@/pages/TeacherProfile"));
const LibraryProfile = lazy(() => import("@/pages/LibraryProfile"));
const ChildProfile = lazy(() => import("@/pages/ChildProfile"));
const ChildPublicProfile = lazy(() => import("@/pages/ChildPublicProfile"));
const ChildDiscover = lazy(() => import("@/pages/ChildDiscover"));
const ChildSettings = lazy(() => import("@/pages/ChildSettings"));
const DownloadApp = lazy(() => import("@/pages/DownloadApp"));
const ParentProfile = lazy(() => import("@/pages/ParentProfile"));
const TaskMarketplace = lazy(() => import("@/pages/TaskMarketplace"));
const TaskCart = lazy(() => import("@/pages/TaskCart"));
const OAuthCallback = lazy(() => import("@/pages/OAuthCallback").then(m => ({ default: m.OAuthCallback })));
const OAuthProviderCallbackBridge = lazy(() => import("@/pages/OAuthProviderCallbackBridge").then(m => ({ default: m.OAuthProviderCallbackBridge })));

type PublicMobileAppSettings = {
  appName?: string;
  appIconUrl?: string;
  pwaName?: string;
  pwaShortName?: string;
  pwaThemeColor?: string;
  pwaBackgroundColor?: string;
  pwaDisplayMode?: "standalone" | "fullscreen" | "minimal-ui" | "browser";
  pwaStartUrl?: string;
};

function PageLoader() {
  return <LoadingSpinner fullScreen />;
}

function WrappedChildGames() {
  return (
    <ChildAppWrapper>
      <Suspense fallback={<PageLoader />}>
        <ChildGames />
      </Suspense>
    </ChildAppWrapper>
  );
}

function WrappedChildStore() {
  const token = localStorage.getItem("childToken");

  if (!token) {
    return (
      <Suspense fallback={<PageLoader />}>
        <ChildStore />
      </Suspense>
    );
  }

  return (
    <ChildAppWrapper>
      <Suspense fallback={<PageLoader />}>
        <ChildStore />
      </Suspense>
    </ChildAppWrapper>
  );
}

function WrappedChildGifts() {
  return (
    <ChildAppWrapper>
      <Suspense fallback={<PageLoader />}>
        <ChildGifts />
      </Suspense>
    </ChildAppWrapper>
  );
}

function WrappedChildNotifications() {
  return (
    <ChildAppWrapper>
      <Suspense fallback={<PageLoader />}>
        <div data-testid="route-marker-child-notifications" />
        <ChildNotifications />
      </Suspense>
    </ChildAppWrapper>
  );
}

function WrappedChildRewards() {
  return (
    <ChildAppWrapper>
      <Suspense fallback={<PageLoader />}>
        <ChildRewards />
      </Suspense>
    </ChildAppWrapper>
  );
}

function WrappedChildProgress() {
  return (
    <ChildAppWrapper>
      <Suspense fallback={<PageLoader />}>
        <ChildProgress />
      </Suspense>
    </ChildAppWrapper>
  );
}

function WrappedChildTasks() {
  return (
    <ChildAppWrapper>
      <Suspense fallback={<PageLoader />}>
        <ChildTasks />
      </Suspense>
    </ChildAppWrapper>
  );
}

function WrappedChildProfile() {
  return (
    <ChildAppWrapper>
      <Suspense fallback={<PageLoader />}>
        <ChildProfile />
      </Suspense>
    </ChildAppWrapper>
  );
}

function WrappedChildSettings() {
  return (
    <ChildAppWrapper>
      <Suspense fallback={<PageLoader />}>
        <ChildSettings />
      </Suspense>
    </ChildAppWrapper>
  );
}

function WrappedChildDiscover() {
  return (
    <ChildAppWrapper>
      <Suspense fallback={<PageLoader />}>
        <ChildDiscover />
      </Suspense>
    </ChildAppWrapper>
  );
}

function LegacyLibraryStoreRedirect() {
  return <Redirect to={`/library-store${window.location.search || ""}`} replace />;
}

function RegisterRedirect() {
  return <Redirect to={`/parent-auth${window.location.search || ""}`} replace />;
}

function LegacyParentLoginRedirect() {
  return <Redirect to={`/parent-auth${window.location.search || ""}`} replace />;
}

function LegacyChildLoginRedirect() {
  return <Redirect to={`/child-link${window.location.search || ""}`} replace />;
}

function GuardedHomeRoute() {
  if (typeof window === "undefined") {
    return <ErrorBoundary><Home /></ErrorBoundary>;
  }

  const hasActiveSession = resolveBrowserSessionChannel() !== "none";

  if (hasActiveSession) {
    return <ErrorBoundary><Home /></ErrorBoundary>;
  }

  return <ErrorBoundary><AgeGate /></ErrorBoundary>;
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" >
          <GuardedHomeRoute />
        </Route>
        <Route path="/age-gate">
          <ErrorBoundary><AgeGate /></ErrorBoundary>
        </Route>
        <Route path="/register" component={RegisterRedirect} />
        <Route path="/parent-login" component={LegacyParentLoginRedirect} />
        <Route path="/parent-signin" component={LegacyParentLoginRedirect} />
        <Route path="/login" component={LegacyParentLoginRedirect} />
        <Route path="/signin" component={LegacyParentLoginRedirect} />
        <Route path="/child-login" component={LegacyChildLoginRedirect} />
        <Route path="/child-signin" component={LegacyChildLoginRedirect} />
        <Route path="/download">
          <ErrorBoundary><DownloadApp /></ErrorBoundary>
        </Route>
        <Route path="/parent-auth">
          <ErrorBoundary><ParentAuth /></ErrorBoundary>
        </Route>
        <Route path="/auth">
          <ErrorBoundary><ParentAuth /></ErrorBoundary>
        </Route>
        <Route path="/auth/:provider/callback">
          <ErrorBoundary><OAuthProviderCallbackBridge /></ErrorBoundary>
        </Route>
        <Route path="/auth/oauth-callback">
          <ErrorBoundary><OAuthCallback /></ErrorBoundary>
        </Route>
        <Route path="/child-link">
          <ErrorBoundary><ChildLink /></ErrorBoundary>
        </Route>
        <Route path="/trial-games">
          <ErrorBoundary><TrialGames /></ErrorBoundary>
        </Route>
        <Route path="/parent-dashboard">
          <ErrorBoundary><ParentDashboard /></ErrorBoundary>
        </Route>
        <Route path="/parent-store">
          <ErrorBoundary><ParentStore /></ErrorBoundary>
        </Route>

        <Route path="/parent-inventory">
          <ErrorBoundary><ParentInventory /></ErrorBoundary>
        </Route>
        <Route path="/wallet">
          <ErrorBoundary><Wallet /></ErrorBoundary>
        </Route>
        <Route path="/notifications">
          <ErrorBoundary><Notifications /></ErrorBoundary>
        </Route>
        <Route path="/subjects">
          <ErrorBoundary><Subjects /></ErrorBoundary>
        </Route>
        <Route path="/admin">
          <ErrorBoundary><AdminAuth /></ErrorBoundary>
        </Route>
        <Route path="/admin-dashboard">
          <ErrorBoundary><AdminDashboard /></ErrorBoundary>
        </Route>
        <Route path="/otp">
          <ErrorBoundary><OTPVerification /></ErrorBoundary>
        </Route>
        <Route path="/forgot-password">
          <ErrorBoundary><ForgotPassword /></ErrorBoundary>
        </Route>
        <Route path="/child-games" component={WrappedChildGames} />
        <Route path="/child-store" component={WrappedChildStore} />
        <Route path="/child-gifts" component={WrappedChildGifts} />
        <Route path="/child-notifications" component={WrappedChildNotifications} />
        <Route path="/child-rewards" component={WrappedChildRewards} />
        <Route path="/child-progress" component={WrappedChildProgress} />
        <Route path="/child-tasks" component={WrappedChildTasks} />
        <Route path="/child-profile" component={WrappedChildProfile} />
        <Route path="/child-public-profile/:shareCode">
          <ErrorBoundary><ChildPublicProfile /></ErrorBoundary>
        </Route>
        <Route path="/child-settings" component={WrappedChildSettings} />
        <Route path="/child-discover" component={WrappedChildDiscover} />
        <Route path="/create-task">
          <Redirect to="/parent-tasks" replace />
        </Route>
        <Route path="/assign-task">
          <ErrorBoundary><AssignTask /></ErrorBoundary>
        </Route>
        <Route path="/subject-tasks">
          <ErrorBoundary><SubjectTasks /></ErrorBoundary>
        </Route>
        <Route path="/parent-tasks">
          <ErrorBoundary><ParentTasks /></ErrorBoundary>
        </Route>
        <Route path="/task-marketplace">
          <ErrorBoundary><TaskMarketplace /></ErrorBoundary>
        </Route>
        <Route path="/task-cart">
          <ErrorBoundary><TaskCart /></ErrorBoundary>
        </Route>
        <Route path="/privacy">
          <ErrorBoundary><Privacy /></ErrorBoundary>
        </Route>
        <Route path="/privacy-policy">
          <ErrorBoundary><PrivacyPolicy /></ErrorBoundary>
        </Route>
        <Route path="/accessibility">
          <ErrorBoundary><AccessibilityPolicy /></ErrorBoundary>
        </Route>
        <Route path="/terms">
          <ErrorBoundary><Terms /></ErrorBoundary>
        </Route>
        <Route path="/delete-account">
          <ErrorBoundary><AccountDeletion /></ErrorBoundary>
        </Route>
        <Route path="/about">
          <ErrorBoundary><AboutUs /></ErrorBoundary>
        </Route>
        <Route path="/contact">
          <ErrorBoundary><ContactUs /></ErrorBoundary>
        </Route>
        <Route path="/cookie-policy">
          <ErrorBoundary><CookiePolicy /></ErrorBoundary>
        </Route>
        <Route path="/child-safety">
          <ErrorBoundary><ChildSafety /></ErrorBoundary>
        </Route>
        <Route path="/refund-policy">
          <ErrorBoundary><RefundPolicy /></ErrorBoundary>
        </Route>
        <Route path="/acceptable-use">
          <ErrorBoundary><AcceptableUse /></ErrorBoundary>
        </Route>
        <Route path="/legal">
          <ErrorBoundary><LegalCenter /></ErrorBoundary>
        </Route>
        <Route path="/settings">
          <ErrorBoundary><Settings /></ErrorBoundary>
        </Route>
        <Route path="/admin/purchases">
          <ErrorBoundary><AdminPurchasesTab /></ErrorBoundary>
        </Route>
        <Route path="/library/login">
          <ErrorBoundary><LibraryLogin /></ErrorBoundary>
        </Route>
        <Route path="/library/dashboard">
          <ErrorBoundary><LibraryDashboard /></ErrorBoundary>
        </Route>
        <Route path="/store/libraries" component={LegacyLibraryStoreRedirect} />
        <Route path="/library-store">
          <ErrorBoundary><LibraryStore /></ErrorBoundary>
        </Route>
        <Route path="/match3">
          <ErrorBoundary><Match3Page /></ErrorBoundary>
        </Route>
        <Route path="/memory-match">
          <ErrorBoundary><MemoryMatchPage /></ErrorBoundary>
        </Route>
        <Route path="/school/login">
          <ErrorBoundary><SchoolLogin /></ErrorBoundary>
        </Route>
        <Route path="/school/dashboard">
          <ErrorBoundary><SchoolDashboard /></ErrorBoundary>
        </Route>
        <Route path="/teacher/login">
          <ErrorBoundary><TeacherLogin /></ErrorBoundary>
        </Route>
        <Route path="/teacher/dashboard">
          <ErrorBoundary><TeacherDashboard /></ErrorBoundary>
        </Route>
        <Route path="/school/:id">
          <ErrorBoundary><SchoolProfile /></ErrorBoundary>
        </Route>
        <Route path="/teacher/:id">
          <ErrorBoundary><TeacherProfile /></ErrorBoundary>
        </Route>
        <Route path="/library/:id">
          <ErrorBoundary><LibraryProfile /></ErrorBoundary>
        </Route>
        <Route path="/parent-profile">
          <ErrorBoundary><ParentProfile /></ErrorBoundary>
        </Route>
        <Route>
          <ErrorBoundary><NotFound /></ErrorBoundary>
        </Route>
      </Switch>
    </Suspense>
  );
}

const GAME_ROUTES = ["/child-games", "/trial-games", "/match3", "/memory-match"];

function useSwipeBackGesture() {
  const [location] = useLocation();

  useEffect(() => {
    // Disable swipe-back on game pages so it doesn't interfere with gameplay
    const isGamePage = GAME_ROUTES.some((r) => location.startsWith(r));
    if (isGamePage) return;

    let startX = 0;
    let startY = 0;
    let isTracking = false;

    const isInteractiveElement = (target: EventTarget | null): boolean => {
      if (!(target instanceof Element)) return false;
      return Boolean(
        target.closest(
          "input, textarea, select, button, a, [contenteditable='true'], [data-swipe-ignore='true']"
        )
      );
    };

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      if (isInteractiveElement(event.target)) return;

      const touch = event.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      isTracking = true;
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (!isTracking) return;
      if (event.changedTouches.length !== 1) {
        isTracking = false;
        return;
      }

      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;

      const isHorizontalSwipe = Math.abs(deltaX) > 70 && Math.abs(deltaX) > Math.abs(deltaY);
      if (isHorizontalSwipe) {
        // RTL: swipe right-to-left is back; LTR: swipe left-to-right is back
        const isRTL = document.documentElement.dir === "rtl";
        const isBackSwipe = isRTL ? deltaX < -70 : deltaX > 70;
        if (isBackSwipe) {
          window.history.back();
        }
      }

      isTracking = false;
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [location]);
}

function useMobileAppBranding() {
  useEffect(() => {
    let isMounted = true;
    let manifestObjectUrl: string | null = null;

    const ensureMeta = (name: string, content: string) => {
      if (!content) return;
      let meta = document.querySelector(`meta[name='${name}']`) as HTMLMetaElement | null;
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", name);
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", content);
    };

    const ensureLink = (
      rel: string,
      href: string,
      id: string,
      sizes?: string
    ) => {
      if (!href) return;
      let link = document.getElementById(id) as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.id = id;
        link.rel = rel;
        document.head.appendChild(link);
      }
      link.href = href;
      if (sizes) {
        link.setAttribute("sizes", sizes);
      }
    };

    const applyBranding = (settings: PublicMobileAppSettings) => {
      const appName = settings.pwaName || settings.appName || "Classify";
      const shortName = settings.pwaShortName || appName;
      const iconUrl = settings.appIconUrl || "/icons/icon-192.png";
      const themeColor = settings.pwaThemeColor || "#6B4D9D";
      const backgroundColor = settings.pwaBackgroundColor || "#ffffff";
      const startUrl = settings.pwaStartUrl || "/";
      const displayMode = settings.pwaDisplayMode || "standalone";

      ensureMeta("theme-color", themeColor);
      ensureMeta("apple-mobile-web-app-title", appName);
      ensureMeta("application-name", appName);
      ensureMeta("msapplication-TileColor", themeColor);
      ensureMeta("msapplication-TileImage", iconUrl);

      ensureLink("icon", iconUrl, "dynamic-favicon");
      ensureLink("shortcut icon", iconUrl, "dynamic-shortcut-icon");
      ensureLink("apple-touch-icon", iconUrl, "dynamic-apple-touch-icon", "180x180");

      const origin = window.location.origin;
      const absoluteIconUrl = iconUrl.startsWith("http") ? iconUrl : `${origin}${iconUrl}`;
      const absoluteStartUrl = startUrl.startsWith("http") ? startUrl : `${origin}${startUrl}`;

      const manifestData = {
        name: appName,
        short_name: shortName,
        start_url: absoluteStartUrl,
        scope: origin + "/",
        id: "/",
        display: displayMode,
        theme_color: themeColor,
        background_color: backgroundColor,
        icons: [
          { src: absoluteIconUrl, sizes: "192x192", type: "image/png", purpose: "any" },
          { src: absoluteIconUrl, sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      };

      const manifestBlob = new Blob([JSON.stringify(manifestData)], {
        type: "application/manifest+json",
      });

      manifestObjectUrl = URL.createObjectURL(manifestBlob);
      const manifestLink = document.querySelector("link[rel='manifest']") as HTMLLinkElement | null;
      if (manifestLink) {
        manifestLink.href = manifestObjectUrl;
      }
    };

    const loadBranding = async () => {
      try {
        const response = await fetch("/api/public/mobile-app-settings");
        if (!response.ok) return;
        const json = await response.json();
        const mobileApp = (json?.data?.mobileApp || {}) as PublicMobileAppSettings;
        if (!isMounted) return;
        applyBranding(mobileApp);
      } catch {
      }
    };

    loadBranding();

    return () => {
      isMounted = false;
      if (manifestObjectUrl) {
        URL.revokeObjectURL(manifestObjectUrl);
      }
    };
  }, []);
}

function useServiceWorkerNavigate() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const toastDedupeRef = useRef<Map<string, number>>(new Map());
  const externalNotifDedupeRef = useRef<Map<string, number>>(new Map());

  const getNotificationPrefs = () => {
    try {
      const raw = localStorage.getItem("classify_notification_prefs");
      const parsed = raw ? JSON.parse(raw) : {};
      return {
        inAppEnabled: typeof parsed?.inAppEnabled === "boolean" ? parsed.inAppEnabled : true,
        pushEnabled: typeof parsed?.pushEnabled === "boolean" ? parsed.pushEnabled : true,
        quietHoursEnabled: typeof parsed?.quietHoursEnabled === "boolean" ? parsed.quietHoursEnabled : false,
        quietStart: typeof parsed?.quietStart === "string" ? parsed.quietStart : "22:00",
        quietEnd: typeof parsed?.quietEnd === "string" ? parsed.quietEnd : "07:00",
      };
    } catch {
      return {
        inAppEnabled: true,
        pushEnabled: true,
        quietHoursEnabled: false,
        quietStart: "22:00",
        quietEnd: "07:00",
      };
    }
  };

  const isInQuietHours = (start: string, end: string) => {
    const [startHour, startMinute] = String(start || "22:00").split(":").map((v) => Number.parseInt(v, 10) || 0);
    const [endHour, endMinute] = String(end || "07:00").split(":").map((v) => Number.parseInt(v, 10) || 0);
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    if (startMinutes === endMinutes) return true;
    if (startMinutes < endMinutes) {
      return nowMinutes >= startMinutes && nowMinutes < endMinutes;
    }
    return nowMinutes >= startMinutes || nowMinutes < endMinutes;
  };

  const playNotificationFeedback = () => {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.23);

      osc.onended = () => {
        ctx.close().catch(() => undefined);
      };
    } catch {
    }

    try {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate?.([110, 50, 110]);
      }
    } catch {
    }

    try {
      (navigator as any)?.setAppBadge?.(1);
    } catch {
    }
  };

  const showExternalSystemNotification = async (title?: string, body?: string, url?: string) => {
    try {
      const safeTitle = title || "إشعار جديد";
      const safeBody = body || "لديك تحديث جديد";
      const safeUrl = url || "/notifications";
      const signature = `${safeTitle}::${safeBody}::${safeUrl}`;
      const now = Date.now();
      const prev = externalNotifDedupeRef.current.get(signature) || 0;
      if (now - prev < 2500) return;
      externalNotifDedupeRef.current.set(signature, now);

      if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

      const reg = await navigator.serviceWorker?.ready;
      if (!reg) return;

      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: "SHOW_FEATURE_NOTIFICATION",
          payload: { title: safeTitle, body: safeBody, url: safeUrl },
        });
        return;
      }

      await reg.showNotification(safeTitle, {
        body: safeBody,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-96.png",
        data: { url: safeUrl },
        tag: "classify-live-notification",
      });
    } catch {
    }
  };

  const shouldShowForegroundToast = (title?: string, description?: string) => {
    const safeTitle = String(title || "إشعار جديد");
    const safeDescription = String(description || "لديك تحديث جديد");
    const signature = `${safeTitle}::${safeDescription}`;
    const now = Date.now();
    const prev = toastDedupeRef.current.get(signature) || 0;
    const WINDOW_MS = 4000;

    if (now - prev < WINDOW_MS) return false;

    toastDedupeRef.current.set(signature, now);

    if (toastDedupeRef.current.size > 100) {
      for (const [k, ts] of toastDedupeRef.current.entries()) {
        if (now - ts > WINDOW_MS * 3) {
          toastDedupeRef.current.delete(k);
        }
      }
    }

    return true;
  };

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "NAVIGATE" && typeof event.data.url === "string") {
        navigate(event.data.url);
      }

      if (event.data?.type === "IN_APP_NOTIFICATION") {
        const payload = event.data?.payload || {};
        const prefs = getNotificationPrefs();
        const mutedByQuietHours = prefs.quietHoursEnabled && isInQuietHours(prefs.quietStart, prefs.quietEnd);
        const canInApp = prefs.inAppEnabled && !mutedByQuietHours;
        const canPush = prefs.pushEnabled && !mutedByQuietHours;
        emitNotificationSync({
          source: "sw",
          title: payload.title,
          body: payload.body,
          url: payload.url,
        });
        if (!canInApp && !canPush) return;
        playNotificationFeedback();
        if (canPush) {
          showExternalSystemNotification(payload.title, payload.body, payload.url);
        }
        if (canInApp) {
          if (!shouldShowForegroundToast(payload.title, payload.body)) return;
          toast({
            title: payload.title || "إشعار جديد",
            description: payload.body || "لديك تحديث جديد",
          });
        }
      }
    };

    const nativeForegroundHandler = (event: Event) => {
      const detail = (event as CustomEvent<{ title?: string; body?: string }>).detail || {};
      const prefs = getNotificationPrefs();
      const mutedByQuietHours = prefs.quietHoursEnabled && isInQuietHours(prefs.quietStart, prefs.quietEnd);
      const canInApp = prefs.inAppEnabled && !mutedByQuietHours;
      const canPush = prefs.pushEnabled && !mutedByQuietHours;
      emitNotificationSync({ source: "mobile-push", title: detail.title, body: detail.body });
      if (!canInApp && !canPush) return;
      playNotificationFeedback();
      if (canPush) {
        showExternalSystemNotification(detail.title, detail.body, "/notifications");
      }
      if (canInApp) {
        if (!shouldShowForegroundToast(detail.title, detail.body)) return;
        toast({
          title: detail.title || "إشعار جديد",
          description: detail.body || "لديك تحديث جديد",
        });
      }
    };

    const nativeOpenHandler = (event: Event) => {
      const detail = (event as CustomEvent<{ url?: string }>).detail || {};
      if (typeof detail.url === "string" && detail.url.length > 0) {
        emitNotificationSync({ source: "mobile-push", url: detail.url });
        navigate(detail.url);
      }
    };

    const sharedSyncHandler = (event: Event) => {
      const detail = (event as CustomEvent<{ source?: string; title?: string; body?: string; url?: string }>).detail || {};
      if (detail.source !== "sse") return;

      const prefs = getNotificationPrefs();
      const mutedByQuietHours = prefs.quietHoursEnabled && isInQuietHours(prefs.quietStart, prefs.quietEnd);
      const canInApp = prefs.inAppEnabled && !mutedByQuietHours;
      const canPush = prefs.pushEnabled && !mutedByQuietHours;

      const title = detail.title || "إشعار جديد";
      const body = detail.body || "تم استلام إشعار جديد";
      const url = detail.url || "/notifications";

      if (!canInApp && !canPush) return;
      playNotificationFeedback();
      if (canPush) {
        showExternalSystemNotification(title, body, url);
      }
      if (canInApp) {
        if (!shouldShowForegroundToast(title, body)) return;
        toast({ title, description: body });
      }
    };

    navigator.serviceWorker?.addEventListener("message", handler);
    window.addEventListener("classify:foreground-notification", nativeForegroundHandler as EventListener);
    window.addEventListener("classify:notification-open", nativeOpenHandler as EventListener);
    window.addEventListener("classify:notifications-updated", sharedSyncHandler as EventListener);

    return () => {
      navigator.serviceWorker?.removeEventListener("message", handler);
      window.removeEventListener("classify:foreground-notification", nativeForegroundHandler as EventListener);
      window.removeEventListener("classify:notification-open", nativeOpenHandler as EventListener);
      window.removeEventListener("classify:notifications-updated", sharedSyncHandler as EventListener);
    };
  }, [navigate, toast]);
}

function useNativeBackNavigation(location: string) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const lastBackPressAtRef = useRef(0);

  useMobileControls({
    onBackPress: (canGoBack) => {
      const rootRoutes = new Set(["/", "/age-gate"]);
      const hasBrowserHistory = window.history.length > 1;

      const openDialog = document.querySelector(
        "[role='dialog'][data-state='open'], [data-radix-dialog-content][data-state='open']"
      );

      if (openDialog) {
        document.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "Escape",
            bubbles: true,
            cancelable: true,
          })
        );
        return;
      }

      if (canGoBack || hasBrowserHistory) {
        window.history.back();
        return;
      }

      if (!rootRoutes.has(location)) {
        navigate("/");
        return;
      }

      const now = Date.now();
      if (now - lastBackPressAtRef.current < 1600) {
        const appPlugin = (window as any)?.Capacitor?.Plugins?.App;
        if (typeof appPlugin?.exitApp === "function") {
          appPlugin.exitApp();
        }
        return;
      }

      lastBackPressAtRef.current = now;
      toast({
        title: "اضغط مرة أخرى للخروج",
        description: "Press back again to exit",
      });
    },
  });
}

function useNativeAppUrlOpen(navigate: (path: string, options?: { replace?: boolean }) => void) {
  useEffect(() => {
    const isNativeCapacitor = !!(window as any)?.Capacitor?.isNativePlatform?.();
    if (!isNativeCapacitor) return;

    const appPlugin = (window as any)?.Capacitor?.Plugins?.App;
    if (!appPlugin || typeof appPlugin.addListener !== "function") return;

    const handleIncomingUrl = (rawUrl: string) => {
      if (!rawUrl) return;

      try {
        const parsed = new URL(rawUrl);
        const pathWithQuery = `${parsed.pathname}${parsed.search}${parsed.hash}`;

        // Dedupe for duplicate appUrlOpen callbacks / getLaunchUrl replay (same URL)
        const dedupeKey = "_last_oauth_url";
        const existing = sessionStorage.getItem(dedupeKey);
        if (existing === pathWithQuery) return;
        sessionStorage.setItem(dedupeKey, pathWithQuery);
        setTimeout(() => {
          if (sessionStorage.getItem(dedupeKey) === pathWithQuery) {
            sessionStorage.removeItem(dedupeKey);
          }
        }, 10000);

        // If provider callback is delivered directly to /api/auth/oauth/:provider/callback,
        // let backend finish token exchange then redirect to /auth/oauth-callback.
        if (pathWithQuery.startsWith("/api/auth/oauth/")) {
          window.location.assign(pathWithQuery);
          return;
        }

        // Accept HTTPS app links that target in-app routes.
        if (
          pathWithQuery.startsWith("/auth/oauth-callback") ||
          /^\/auth\/[^/]+\/callback(\/)?(\?|#|$)/i.test(pathWithQuery) ||
          pathWithQuery.startsWith("/parent-auth")
        ) {
          navigate(pathWithQuery, { replace: true });
          return;
        }

        if (
          parsed.hostname === "classi-fy.com" ||
          parsed.hostname === "www.classi-fy.com"
        ) {
          navigate(pathWithQuery || "/", { replace: true });
        }
      } catch {
        // Ignore malformed deep links.
      }
    };

    let listenerHandle: any = null;

    (async () => {
      try {
        listenerHandle = await appPlugin.addListener("appUrlOpen", (event: any) => {
          handleIncomingUrl(String(event?.url || ""));
        });
      } catch {
        listenerHandle = null;
      }

      try {
        if (typeof appPlugin.getLaunchUrl === "function") {
          const launchData = await appPlugin.getLaunchUrl();
          handleIncomingUrl(String(launchData?.url || ""));
        }
      } catch {
        // Ignore launch URL read failures.
      }
    })();

    return () => {
      if (listenerHandle && typeof listenerHandle.remove === "function") {
        listenerHandle.remove();
      }
    };
  }, [navigate]);
}

function useTrialWriteBlockNotice() {
  const { toast } = useToast();

  useEffect(() => {
    const onTrialWriteBlocked = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string }>).detail || {};
      toast({
        title: "جلسة تجريبية مؤقتة",
        description:
          detail.message ||
          "يمكنك استكشاف جميع الأقسام الآن، لكن حفظ البيانات يتطلب إنشاء حساب دائم.",
        variant: "destructive",
      });
    };

    window.addEventListener("classify:trial-write-blocked", onTrialWriteBlocked as EventListener);
    return () => {
      window.removeEventListener("classify:trial-write-blocked", onTrialWriteBlocked as EventListener);
    };
  }, [toast]);
}

function useTrialFetchWriteGuard() {
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.fetch !== "function") return;

    const originalFetch = window.fetch.bind(window);

    window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const requestMethod =
        (init?.method || (input instanceof Request ? input.method : "GET") || "GET").toUpperCase();

      const requestUrl =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      ensureTrialWriteAllowed(requestMethod, requestUrl);
      return originalFetch(input, init);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);
}

function App() {
  const [location, navigate] = useLocation();

  useEffect(() => {
    bootOneSignalIdentitySync();
  }, []);

  useEffect(() => {
    markTrialRouteExploration(location || "");
  }, [location]);

  useEffect(() => {
    const decision = decideTrialRouteRedirect({
      pathname: location || "/",
      parentClassification: localStorage.getItem("parentAccountClassification"),
      childClassification: localStorage.getItem("childAccountClassification"),
      hasParentToken: Boolean(localStorage.getItem("token")),
      hasChildToken: Boolean(localStorage.getItem("childToken")),
    });

    if (!decision) return;
    if ((location || "").startsWith("/parent-auth")) return;
    navigate(decision.redirectPath, { replace: true });
  }, [location, navigate]);

  useSwipeBackGesture();
  useNativeBackNavigation(location || "/");
  useNativeAppUrlOpen(navigate);
  useMobileAppBranding();
  useServiceWorkerNavigate();
  useNotificationPermissionRecovery();
  usePersistentSession();
  useTrialWriteBlockNotice();
  useTrialFetchWriteGuard();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SEOProvider>
          <TooltipProvider>
            <OfflineGuard>
              <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:top-4 focus:start-4 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:shadow-lg"
              >
                Skip to content
              </a>
              <div className="min-h-screen">
                <main id="main-content">
                  <Router />
                </main>
              </div>
              <WhatsAppSupportButton />
              <Suspense fallback={null}>
                <Toaster />
              </Suspense>
              <Suspense fallback={null}>
                <RandomAdPopup />
              </Suspense>
            </OfflineGuard>
          </TooltipProvider>
        </SEOProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
