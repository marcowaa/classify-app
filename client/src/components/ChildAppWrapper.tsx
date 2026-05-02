import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChildPermissionsSetup } from "./ChildPermissionsSetup";
import { NotificationCenter } from "./notifications/NotificationCenter";
import { ChildTaskNotificationManager } from "./child/SponsoredTaskNotification";
import { ChildWebPushRegistrar } from "./child/ChildWebPushRegistrar";
import { ChildMobilePushRegistrar } from "./child/ChildMobilePushRegistrar";
import { useScreenTimeHeartbeat } from "@/hooks/useScreenTimeHeartbeat";
import { LoadingSpinner } from "./LoadingSpinner";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { readTrialChildLinkData } from "@/lib/trialChildLinkStorage";
import { X } from "lucide-react";

interface ChildLoginRewardData {
  dayKey: string;
  streakDays: number;
  totalClaims: number;
  claimedToday: boolean;
  currentDayIndex: number;
  currentRewardPoints: number;
  baseRewardPoints?: number;
  weeklyBonusPoints: number;
  weeklyBonusAwarded: boolean;
  nextWeeklyBonusInDays: number;
  rewardTable: number[];
}

function ScreenTimeHeartbeatRunner() {
  useScreenTimeHeartbeat();
  return null;
}

interface ChildAppWrapperProps {
  children: React.ReactNode;
}

export function ChildAppWrapper({ children }: ChildAppWrapperProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [showPermissions, setShowPermissions] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [showLoginRewardModal, setShowLoginRewardModal] = useState(false);
  const [showWeeklyBonusBurst, setShowWeeklyBonusBurst] = useState(false);
  const [weeklyBonusBurstPoints, setWeeklyBonusBurstPoints] = useState(0);
  const [showTrialBannerCard, setShowTrialBannerCard] = useState(() => {
    return sessionStorage.getItem("child-trial-banner-dismissed") !== "1";
  });
  const [dismissedLoginRewardDayKey, setDismissedLoginRewardDayKey] = useState<string | null>(() => {
    return sessionStorage.getItem("child-login-reward-dismissed-day");
  });
  const [path, navigate] = useLocation();
  const token = localStorage.getItem("childToken");
  const trialReminderCountRef = useRef(0);
  const trialReminderTimerRef = useRef<number | null>(null);
  const lastReminderIndexRef = useRef<number | null>(null);

  const { data: childInfo, isLoading: isAuthLoading, isError: isAuthError } = useQuery({
    queryKey: ["child-info"],
    queryFn: async () => {
      const res = await fetch("/api/child/info", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        throw new Error("UNAUTHORIZED");
      }
      if (!res.ok) {
        throw new Error("AUTH_CHECK_FAILED");
      }
      const json = await res.json();
      return json?.data || json;
    },
    enabled: !!token,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
    retry: (count, error) => error.message !== "UNAUTHORIZED" && count < 1,
  });

  const { data: mandatoryTaskState } = useQuery({
    queryKey: ["child-mandatory-task-state"],
    queryFn: async () => {
      const res = await fetch("/api/child/mandatory-task-state", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        throw new Error("UNAUTHORIZED");
      }
      if (!res.ok) {
        throw new Error("MANDATORY_STATE_FAILED");
      }

      const json = await res.json();
      return json?.data || null;
    },
    enabled: !!token,
    refetchInterval: token ? 5000 : false,
    staleTime: 2000,
    retry: false,
  });

  const mandatoryLockActive = !!mandatoryTaskState?.mandatoryLockActive;
  const isSensitiveWindow = mandatoryLockActive || path === "/child-tasks";
  const childPoints = Number((childInfo as any)?.totalPoints ?? (childInfo as any)?.points ?? 0);
  const isChildTrial = (() => {
    const classification = String(
      (childInfo as any)?.accountClassification
      || (childInfo as any)?.classification
      || ""
    ).trim().toUpperCase();

    // Show trial banner only for explicit child-trial classification.
    // Avoid heuristic fallbacks that can mislabel fully linked accounts.
    return classification === "CHILD_TRIAL";
  })();

  const { data: loginRewardState, refetch: refetchLoginReward } = useQuery({
    queryKey: ["child-login-reward-state"],
    queryFn: async (): Promise<ChildLoginRewardData> => {
      const res = await fetch("/api/child/login-reward", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        throw new Error("UNAUTHORIZED");
      }
      if (!res.ok) {
        throw new Error("LOGIN_REWARD_STATE_FAILED");
      }

      const json = await res.json();
      return json?.data;
    },
    enabled: !!token && !isAuthLoading && !isAuthError,
    staleTime: 10000,
    retry: false,
  });

  const claimLoginRewardMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/child/login-reward/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("LOGIN_REWARD_CLAIM_FAILED");
      }
      return res.json();
    },
    onSuccess: async (payload: any) => {
      const bonusAwarded = Boolean(payload?.data?.weeklyBonusAwarded);
      const bonusPoints = Math.max(0, Number(payload?.data?.weeklyBonusPoints) || 0);

      setShowLoginRewardModal(false);
      setDismissedLoginRewardDayKey(null);
      sessionStorage.removeItem("child-login-reward-dismissed-day");

      if (bonusAwarded && bonusPoints > 0) {
        setWeeklyBonusBurstPoints(bonusPoints);
        setShowWeeklyBonusBurst(true);
        window.setTimeout(() => setShowWeeklyBonusBurst(false), 1800);
      }
      await refetchLoginReward();
    },
  });

  useEffect(() => {
    if (!loginRewardState) return;
    if (mandatoryLockActive) return;
    if (loginRewardState.claimedToday) {
      setShowLoginRewardModal(false);
      return;
    }

    if (dismissedLoginRewardDayKey === loginRewardState.dayKey) {
      return;
    }

    if (!loginRewardState.claimedToday) {
      setShowLoginRewardModal(true);
    }
  }, [dismissedLoginRewardDayKey, loginRewardState, mandatoryLockActive]);

  useEffect(() => {
    if (!isChildTrial) {
      setShowTrialBannerCard(false);
      return;
    }

    const dismissed = sessionStorage.getItem("child-trial-banner-dismissed") === "1";
    setShowTrialBannerCard(!dismissed);
  }, [isChildTrial]);

  useEffect(() => {
    if (!token) {
      navigate("/child-link");
      return;
    }

    const setupComplete = localStorage.getItem("child_permissions_setup_complete");
    if (!setupComplete) {
      setShowPermissions(true);
    }
    setIsChecked(true);
  }, [navigate, token]);

  useEffect(() => {
    const classification = String(
      (childInfo as any)?.accountClassification
      || (childInfo as any)?.classification
      || ""
    ).trim().toUpperCase();

    if (!classification) {
      localStorage.removeItem("childAccountClassification");
      return;
    }

    localStorage.setItem("childAccountClassification", classification);
  }, [childInfo]);

  useEffect(() => {
    if (!token || !isAuthError) return;
    localStorage.removeItem("childToken");
    localStorage.removeItem("childId");
    localStorage.removeItem("childAccountClassification");
    localStorage.removeItem("rememberedChild");
    navigate("/child-link");
  }, [isAuthError, navigate, token]);

  useEffect(() => {
    if (!token) return;
    if (!mandatoryLockActive) return;
    if (path === "/child-tasks") return;
    navigate("/child-tasks");
  }, [mandatoryLockActive, navigate, path, token]);

  useEffect(() => {
    if (!token) {
      sessionStorage.removeItem("classify-child-silent-window");
      return;
    }
    if (isSensitiveWindow) {
      sessionStorage.setItem("classify-child-silent-window", "1");
      return;
    }
    sessionStorage.removeItem("classify-child-silent-window");
  }, [isSensitiveWindow, token]);

  useEffect(() => {
    if (!token || !isChildTrial) {
      trialReminderCountRef.current = 0;
      lastReminderIndexRef.current = null;
      if (trialReminderTimerRef.current) {
        window.clearTimeout(trialReminderTimerRef.current);
        trialReminderTimerRef.current = null;
      }
      return;
    }

    let cancelled = false;
    const maxRemindersPerSession = 4;

    const reminderPool = [
      {
        title: t("childStore.askParentToRegister"),
        description: t("childStore.askParentToRegisterDesc"),
      },
      {
        title: t("childStore.parentApprovalNeeded"),
        description: t("childStore.requestWillBeSentToParent"),
      },
      {
        title: t("newAccount"),
        description: t("childOwnAccount"),
      },
    ];

    const scheduleReminder = () => {
      if (cancelled || trialReminderCountRef.current >= maxRemindersPerSession) return;

      const delayMs = 35000 + Math.floor(Math.random() * 75000);
      trialReminderTimerRef.current = window.setTimeout(() => {
        if (cancelled) return;

        const inSilentWindow = sessionStorage.getItem("classify-child-silent-window") === "1";
        if (document.hidden || inSilentWindow) {
          scheduleReminder();
          return;
        }

        const trialLink = readTrialChildLinkData();
        const trialToken = String(
          trialLink?.trialChildToken || localStorage.getItem("trialChildToken") || ""
        ).trim();

        let randomIndex = Math.floor(Math.random() * reminderPool.length);
        if (reminderPool.length > 1 && lastReminderIndexRef.current === randomIndex) {
          randomIndex = (randomIndex + 1) % reminderPool.length;
        }

        const selectedReminder = reminderPool[randomIndex];
        lastReminderIndexRef.current = randomIndex;

        const redirectPath = path || "/child-games";
        const authParams = new URLSearchParams({
          mode: "register",
          redirect: redirectPath,
        });

        if (trialToken) {
          authParams.set("trialChildToken", trialToken);
        }

        toast({
          title: selectedReminder.title,
          description: `${selectedReminder.description} ${t("childStore.askParentToRegisterDesc")}`,
          duration: 5000,
        });

        trialReminderCountRef.current += 1;
        scheduleReminder();
      }, delayMs);
    };

    scheduleReminder();

    return () => {
      cancelled = true;
      if (trialReminderTimerRef.current) {
        window.clearTimeout(trialReminderTimerRef.current);
        trialReminderTimerRef.current = null;
      }
    };
  }, [isChildTrial, path, t, toast, token]);

  const handlePermissionsComplete = () => {
    setShowPermissions(false);
  };

  if (!isChecked || !token || isAuthLoading || isAuthError) {
    return <LoadingSpinner />;
  }

  if (showPermissions) {
    return <ChildPermissionsSetup onComplete={handlePermissionsComplete} />;
  }

  return (
    <div data-testid="child-wrapper-root">
      <ChildWebPushRegistrar />
      <ChildMobilePushRegistrar />
      <ScreenTimeHeartbeatRunner />
      <NotificationCenter silentWindowActive={isSensitiveWindow} />
      <ChildTaskNotificationManager />
      {isChildTrial && showTrialBannerCard && (
        <div className="fixed top-3 left-1/2 z-[950] w-[min(94vw,56rem)] -translate-x-1/2 px-2" data-testid="child-trial-banner">
          <div className="rounded-2xl border border-emerald-200/70 bg-gradient-to-r from-emerald-50 to-sky-50 px-3 py-2 shadow-xl">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="inline-flex h-6 items-center rounded-full bg-emerald-600 px-2 text-[11px] font-bold text-white shrink-0">
                {t("newAccount")}
              </span>
              <p className="min-w-0 flex-1 text-xs sm:text-sm font-semibold text-emerald-800 line-clamp-2 sm:line-clamp-1">
                {t("childOwnAccount")}
              </p>
              <span className="hidden sm:inline text-xs sm:text-sm font-black text-amber-700 whitespace-nowrap">
                ⭐ {childPoints} {t("points")}
              </span>
              <button
                type="button"
                onClick={() => {
                  sessionStorage.setItem("child-trial-banner-dismissed", "1");
                  setShowTrialBannerCard(false);
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-emerald-700 hover:bg-white"
                aria-label={t("common.close", "إغلاق")}
              >
                <X className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate("/child-games")}
                className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700 shrink-0"
              >
                {t("playNow")}
              </button>
            </div>
          </div>
        </div>
      )}
      {showLoginRewardModal && loginRewardState && !mandatoryLockActive && (
        <div className="fixed top-3 left-1/2 z-[1100] w-[min(96vw,34rem)] -translate-x-1/2 px-2">
          <div className="relative overflow-hidden rounded-3xl border border-indigo-300/30 bg-gradient-to-b from-indigo-900 to-indigo-950 p-4 shadow-2xl text-white">
            {showWeeklyBonusBurst && (
              <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/25">
                <div className="absolute inset-0">
                  {Array.from({ length: 12 }, (_, idx) => (
                    <span
                      key={idx}
                      className="absolute text-lg animate-ping"
                      style={{
                        left: `${6 + (idx * 8)}%`,
                        top: `${12 + ((idx % 6) * 12)}%`,
                        animationDuration: `${900 + (idx % 5) * 180}ms`,
                      }}
                    >
                      {idx % 2 === 0 ? "✨" : "🏆"}
                    </span>
                  ))}
                </div>
                <div className="relative rounded-2xl border border-yellow-300/70 bg-yellow-400/95 text-indigo-950 px-4 py-3 text-center shadow-2xl">
                  <p className="text-xs font-black">{t("childLoginRewardWeeklyBonusReady")}</p>
                  <p className="text-lg font-black">+{weeklyBonusBurstPoints}</p>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-2xl font-extrabold">{t("childLoginRewardTitle")}</h3>
              <button
                type="button"
                onClick={() => {
                  setShowLoginRewardModal(false);
                  setDismissedLoginRewardDayKey(loginRewardState.dayKey);
                  sessionStorage.setItem("child-login-reward-dismissed-day", loginRewardState.dayKey);
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15 hover:bg-white/25"
                aria-label={t("common.close", "إغلاق")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-sm opacity-90 mb-3">
              {t("childLoginRewardStreak", { days: loginRewardState.streakDays })}
            </p>

            <div className="grid grid-cols-7 gap-1 mb-4">
              {loginRewardState.rewardTable.map((reward, idx) => {
                const day = idx + 1;
                const isCurrent = day === loginRewardState.currentDayIndex;
                return (
                  <div
                    key={day}
                    className={`rounded-xl border text-center px-1 py-2 ${isCurrent ? "border-yellow-300 bg-yellow-400/20 shadow-[0_0_12px_rgba(251,191,36,0.8)]" : "border-white/20 bg-white/10"}`}
                  >
                    <div className="text-[10px] font-bold opacity-90">{t("childLoginRewardDay", { day })}</div>
                    <div className="text-xs mt-1">🪙</div>
                    <div className="text-sm font-extrabold">{reward}</div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2 mb-3">
              <button
                type="button"
                onClick={() => claimLoginRewardMutation.mutate()}
                disabled={claimLoginRewardMutation.isPending || loginRewardState.claimedToday}
                className={`flex-1 rounded-xl px-4 py-2 text-sm font-extrabold transition-colors ${
                  loginRewardState.claimedToday
                    ? "bg-emerald-500/70 text-white"
                    : "bg-yellow-400 text-indigo-950 hover:bg-yellow-300"
                }`}
              >
                {loginRewardState.claimedToday
                  ? t("childLoginRewardClaimed")
                  : `${t("childLoginRewardClaim")} ${loginRewardState.currentRewardPoints}`}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLoginRewardModal(false);
                  setDismissedLoginRewardDayKey(loginRewardState.dayKey);
                  sessionStorage.setItem("child-login-reward-dismissed-day", loginRewardState.dayKey);
                  navigate("/child-games");
                }}
                className="rounded-xl bg-indigo-500/60 hover:bg-indigo-500/80 px-3 py-2 text-xs font-bold"
              >
                {t("childLoginRewardOpenGarden")}
              </button>
            </div>

            <div className="rounded-2xl bg-yellow-400/15 border border-yellow-300/30 px-3 py-2 mb-3">
              <p className="text-xs font-bold mb-1">
                {t("childLoginRewardWeeklyBonusTitle", { points: loginRewardState.weeklyBonusPoints })}
              </p>
              <p className="text-xs opacity-90">
                {loginRewardState.weeklyBonusAwarded
                  ? t("childLoginRewardWeeklyBonusReady")
                  : t("childLoginRewardWeeklyBonusIn", { days: loginRewardState.nextWeeklyBonusInDays })}
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 border border-white/15 px-3 py-2">
              <p className="text-xs font-bold mb-1">{t("childLoginRewardWeeklyHintTitle")}</p>
              <p className="text-xs opacity-90">{t("childLoginRewardWeeklyHintText")}</p>
            </div>
          </div>
        </div>
      )}
      {mandatoryLockActive && path !== "/child-tasks" && (
        <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl bg-white p-6 text-center shadow-2xl">
            <div className="text-4xl mb-3">🚨</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">مهمة إلزامية قيد الانتظار</h2>
            <p className="text-sm text-gray-600 mb-4">يجب حل المهمة أولاً قبل استخدام بقية التطبيق.</p>
            <button
              type="button"
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white font-bold hover:bg-blue-700"
              onClick={() => navigate("/child-tasks")}
            >
              الانتقال إلى المهام الآن
            </button>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
