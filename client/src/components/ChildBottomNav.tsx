import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { markTrialRouteExploration } from "@/lib/trialExperience";
import {
  Gamepad2,
  Gift,
  Trophy,
  BookOpen,
  User,
  Star,
  Sparkles,
  X,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";

interface NavItem {
  id: string;
  icon: React.ReactNode;
  activeIcon: React.ReactNode;
  label: string;
  path: string;
  color: string;
}

export function ChildBottomNav({ activeTab }: { activeTab?: string }) {
  const { t } = useTranslation();
  const [location, navigate] = useLocation();
  const { isDark } = useTheme();
  const token = localStorage.getItem("childToken");
  const [showOnboardingHint, setShowOnboardingHint] = useState(() => {
    return localStorage.getItem("child_ui_onboarding_seen") !== "1";
  });
  const [calmMode, setCalmMode] = useState(() => {
    return localStorage.getItem("child_ui_calm_mode") === "1";
  });
  const [barsVisible, setBarsVisible] = useState(true);
  const [navTransitioning, setNavTransitioning] = useState(false);
  const [pressedTab, setPressedTab] = useState<string | null>(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showCompanionModal, setShowCompanionModal] = useState(false);
  const lastScrollY = useRef(0);
  const scrollTicking = useRef(false);

  useEffect(() => {
    const onScroll = () => {
      if (scrollTicking.current) return;
      scrollTicking.current = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y > lastScrollY.current + 10) {
          setBarsVisible(false); // scrolling down → hide
        } else if (y < lastScrollY.current - 10) {
          setBarsVisible(true); // scrolling up → show
        }
        lastScrollY.current = y;
        scrollTicking.current = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const syncCalmMode = () => setCalmMode(localStorage.getItem("child_ui_calm_mode") === "1");
    window.addEventListener("storage", syncCalmMode);
    window.addEventListener("child-ui-mode-changed", syncCalmMode as EventListener);
    return () => {
      window.removeEventListener("storage", syncCalmMode);
      window.removeEventListener("child-ui-mode-changed", syncCalmMode as EventListener);
    };
  }, []);

  const motionConfig = useMemo(
    () => ({
      tapScale: calmMode ? 0.96 : 0.85,
      iconScale: calmMode ? 1.06 : 1.15,
      springStiffness: calmMode ? 220 : 300,
      springDamping: calmMode ? 28 : 22,
      indicatorStiffness: calmMode ? 280 : 400,
      indicatorDamping: calmMode ? 34 : 30,
    }),
    [calmMode]
  );

  const { data: childInfo } = useQuery<any>({
    queryKey: ["child-info"],
    queryFn: async () => {
      const res = await fetch("/api/child/info", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json?.data || json;
    },
    enabled: !!token,
    staleTime: 30000,
  });

  const { data: childTasks } = useQuery<any[]>({
    queryKey: ["/api/child/tasks"],
    queryFn: async () => {
      const res = await fetch("/api/child/tasks", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json?.data || json || [];
    },
    enabled: !!token,
    staleTime: 30000,
  });

  const pendingTasks = useMemo(
    () => (Array.isArray(childTasks) ? childTasks.filter((task: any) => task.status === "pending").length : 0),
    [childTasks]
  );
  const completedTasks = useMemo(
    () => (Array.isArray(childTasks) ? childTasks.filter((task: any) => task.status === "completed").length : 0),
    [childTasks]
  );
  const totalPoints = Number(childInfo?.totalPoints || 0);
  const pointsToNextStar = 100 - (totalPoints % 100 || 100);

  const resolveActiveTabFromPath = (path: string): string => {
    if (path.startsWith("/child-tasks")) return "tasks";
    if (path.startsWith("/child-gifts") || path.startsWith("/child-store")) return "gifts";
    if (path.startsWith("/child-progress") || path.startsWith("/child-rewards")) return "progress";
    if (
      path.startsWith("/child-profile") ||
      path.startsWith("/child-public-profile") ||
      path.startsWith("/child-settings") ||
      path.startsWith("/child-notifications") ||
      path.startsWith("/child-discover")
    ) {
      return "profile";
    }
    return "games";
  };

  const resolvedActiveTab = resolveActiveTabFromPath(location || "");
  const currentTab = activeTab && ["games", "tasks", "gifts", "progress", "profile"].includes(activeTab)
    ? activeTab
    : resolvedActiveTab;

  const companionMessage = useMemo(() => {
    if (showOnboardingHint) {
      return t("childNav.onboardingHint", { defaultValue: "اضغط على أيقونة للانتقال السريع 🚀" });
    }

    if (currentTab === "tasks" && pendingTasks > 0) {
      return t("childNav.pendingTasksHint", {
        defaultValue: `عندك ${pendingTasks} مهمة تنتظرك! ✍️`,
      });
    }

    if (currentTab === "progress") {
      return t("childNav.progressHint", {
        defaultValue: `باقي ${pointsToNextStar} نقطة للنجمة التالية ⭐`,
      });
    }

    if (currentTab === "gifts") {
      return t("childNav.giftsHint", { defaultValue: "افتح هدية جديدة اليوم 🎁" });
    }

    if (currentTab === "profile") {
      return t("childNav.profileHint", { defaultValue: "شارك إنجازاتك مع أصدقائك 🌟" });
    }

    return t("childNav.gamesHint", { defaultValue: "جاهز لمغامرة جديدة؟ 🎮" });
  }, [showOnboardingHint, currentTab, pendingTasks, pointsToNextStar, t]);

  const dismissOnboarding = () => {
    setShowOnboardingHint(false);
    localStorage.setItem("child_ui_onboarding_seen", "1");
  };

  const handleNavClick = (item: NavItem) => {
    if (navTransitioning) return;
    if (currentTab === item.id) return;

    setPressedTab(item.id);
    setNavTransitioning(true);
    setBarsVisible(false);

    // Give the click animation time to play before route change.
    window.setTimeout(() => {
      navigate(item.path);
    }, 170);
  };

  useEffect(() => {
    setNavTransitioning(false);
    setPressedTab(null);
  }, [location]);

  useEffect(() => {
    markTrialRouteExploration(location || "");
  }, [location]);

  const navItems: NavItem[] = [
    {
      id: "games",
      icon: <Gamepad2 className="w-5 h-5" />,
      activeIcon: <Gamepad2 className="w-5 h-5 fill-current" />,
      label: t("childNav.games", "ألعاب"),
      path: "/child-games",
      color: "text-purple-500",
    },
    {
      id: "tasks",
      icon: <BookOpen className="w-5 h-5" />,
      activeIcon: <BookOpen className="w-5 h-5 fill-current" />,
      label: t("childNav.tasks", "مهام"),
      path: "/child-tasks",
      color: "text-blue-500",
    },
    {
      id: "gifts",
      icon: <Gift className="w-5 h-5" />,
      activeIcon: <Gift className="w-5 h-5 fill-current" />,
      label: t("childNav.gifts", "هدايا"),
      path: "/child-gifts",
      color: "text-pink-500",
    },
    {
      id: "progress",
      icon: <Trophy className="w-5 h-5" />,
      activeIcon: <Trophy className="w-5 h-5 fill-current" />,
      label: t("childNav.progress", "تقدمي"),
      path: "/child-progress",
      color: "text-amber-500",
    },
    {
      id: "profile",
      icon: <User className="w-5 h-5" />,
      activeIcon: <User className="w-5 h-5 fill-current" />,
      label: t("childNav.profile", "ملفي"),
      path: "/child-profile",
      color: "text-emerald-500",
    },
  ];

  return (
    <>
    <div className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
      <AnimatePresence>
        {barsVisible && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.25 }}
            className="flex justify-end items-center gap-2 px-4 pb-2"
          >
            <motion.button
              whileTap={{ scale: 0.88 }}
              whileHover={{ scale: 1.08 }}
              onClick={() => setShowProgressModal(true)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full shadow-lg border backdrop-blur-xl ${
                isDark
                  ? "bg-purple-900/80 border-purple-700 text-purple-200"
                  : "bg-white/90 border-purple-200 text-purple-700"
              }`}
              aria-label="عرض التقدم اليومي"
            >
              <Star className="w-4 h-4 fill-current" />
              <span className="text-[12px] font-bold">{totalPoints}</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.88 }}
              whileHover={{ scale: 1.08 }}
              onClick={() => { dismissOnboarding(); setShowCompanionModal(true); }}
              className={`w-10 h-10 rounded-full shadow-lg border backdrop-blur-xl flex items-center justify-center ${
                isDark
                  ? "bg-purple-900/80 border-purple-700 text-purple-200"
                  : "bg-white/90 border-purple-200 text-purple-700"
              }`}
              aria-label="انتقال سريع"
              data-testid="child-companion-bubble"
            >
              <Sparkles className="w-5 h-5" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!navTransitioning && (
          <motion.nav
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 22, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className={`${
              isDark ? "bg-gray-900/95" : "bg-white/95"
            } backdrop-blur-xl border-t ${
              isDark ? "border-gray-800" : "border-gray-100"
            } shadow-[0_-4px_20px_rgba(0,0,0,0.08)]`}
          >
            <div className="max-w-lg mx-auto flex items-center justify-around px-2 py-1.5 [perspective:900px]">
              {navItems.map((item) => {
                const isActive = currentTab === item.id;
                const isPressed = pressedTab === item.id;

                return (
                  <motion.button
                    key={item.id}
                    whileHover={{ scale: 1.14, y: -4, rotateX: 10 }}
                    whileTap={{ scale: motionConfig.tapScale }}
                    onClick={() => handleNavClick(item)}
                    animate={
                      isPressed
                        ? { scale: 1.28, y: -11, rotateX: 14 }
                        : { scale: 1, y: 0, rotateX: 0 }
                    }
                    transition={
                      isPressed
                        ? { duration: 0.16, ease: "easeOut" }
                        : { type: "spring", stiffness: 260, damping: 20 }
                    }
                    className={`relative flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-2xl transition-all min-h-[56px] min-w-[56px] [transform-style:preserve-3d]
                      ${isActive
                        ? `${item.color} ${isDark ? "bg-white/10 shadow-[0_10px_24px_rgba(59,130,246,0.18)]" : "bg-gray-100 shadow-[0_10px_24px_rgba(0,0,0,0.14)]"}`
                        : `${isDark ? "text-gray-500" : "text-gray-400"} hover:text-gray-600`
                      }`}
                    aria-label={item.label}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="bottomNavIndicator"
                        className={`absolute -top-1 w-8 h-1 rounded-full bg-gradient-to-r ${
                          item.id === "games" ? "from-purple-400 to-purple-600" :
                          item.id === "tasks" ? "from-blue-400 to-blue-600" :
                          item.id === "gifts" ? "from-pink-400 to-pink-600" :
                          item.id === "progress" ? "from-amber-400 to-amber-600" :
                          "from-emerald-400 to-emerald-600"
                        }`}
                        transition={{ type: "spring", stiffness: motionConfig.indicatorStiffness, damping: motionConfig.indicatorDamping }}
                      />
                    )}

                    <motion.span
                      className={`rounded-xl px-2 py-1 ${
                        isActive ? (isDark ? "bg-white/10" : "bg-white") : ""
                      }`}
                      animate={
                        isPressed
                          ? { scale: [1, 1.22, 1.14], y: [0, -6, -9], rotate: [0, -6, 6, 0] }
                          : isActive
                            ? { scale: [motionConfig.iconScale, motionConfig.iconScale + 0.06, motionConfig.iconScale], y: [0, -1.5, 0] }
                            : { scale: 1 }
                      }
                      transition={
                        isPressed
                          ? { duration: 0.17, ease: "easeInOut" }
                          : isActive
                            ? { duration: 1.45, repeat: Infinity, ease: "easeInOut" }
                            : { type: "spring", stiffness: motionConfig.springStiffness, damping: motionConfig.springDamping }
                      }
                      style={{ filter: isActive ? "drop-shadow(0 6px 10px rgba(0,0,0,0.25))" : "none" }}
                    >
                      {isActive ? item.activeIcon : item.icon}
                    </motion.span>

                    <span
                      className={`text-[10px] font-semibold leading-tight ${
                        isActive ? "font-bold" : ""
                      }`}
                    >
                      {item.label}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </div>

    {/* ── Progress Modal ── */}
    <AnimatePresence>
      {showProgressModal && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-[2px]"
            onClick={() => setShowProgressModal(false)}
          />
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className={`fixed bottom-0 left-0 right-0 z-[201] rounded-t-3xl shadow-2xl ${
              isDark ? "bg-gray-900" : "bg-white"
            }`}
            dir="rtl"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className={`w-12 h-1.5 rounded-full ${isDark ? "bg-gray-700" : "bg-gray-200"}`} />
            </div>

            <div className="px-6 pb-10">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <h2 className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                  ⭐ تقدمك اليوم
                </h2>
                <button
                  onClick={() => setShowProgressModal(false)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isDark ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Big total points */}
              <div
                className={`rounded-2xl p-5 mb-4 text-center ${
                  isDark
                    ? "bg-purple-900/40"
                    : "bg-gradient-to-br from-purple-50 to-indigo-50"
                }`}
              >
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 280, damping: 20, delay: 0.1 }}
                  className={`text-6xl font-black mb-1 ${
                    isDark ? "text-purple-300" : "text-purple-600"
                  }`}
                >
                  {totalPoints}
                </motion.div>
                <div
                  className={`text-sm font-medium ${
                    isDark ? "text-purple-400" : "text-purple-500"
                  }`}
                >
                  مجموع نقاطك
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div
                  className={`rounded-2xl p-3.5 text-center ${
                    isDark ? "bg-green-900/30" : "bg-green-50"
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto mb-1" />
                  <div
                    className={`text-2xl font-bold ${
                      isDark ? "text-green-400" : "text-green-600"
                    }`}
                  >
                    {completedTasks}
                  </div>
                  <div
                    className={`text-[11px] font-medium ${
                      isDark ? "text-green-500" : "text-green-600"
                    }`}
                  >
                    منجز
                  </div>
                </div>

                <div
                  className={`rounded-2xl p-3.5 text-center ${
                    isDark ? "bg-blue-900/30" : "bg-blue-50"
                  }`}
                >
                  <Clock className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                  <div
                    className={`text-2xl font-bold ${
                      isDark ? "text-blue-400" : "text-blue-600"
                    }`}
                  >
                    {pendingTasks}
                  </div>
                  <div
                    className={`text-[11px] font-medium ${
                      isDark ? "text-blue-500" : "text-blue-600"
                    }`}
                  >
                    متبقي
                  </div>
                </div>

                <div
                  className={`rounded-2xl p-3.5 text-center ${
                    isDark ? "bg-amber-900/30" : "bg-amber-50"
                  }`}
                >
                  <Star className="w-5 h-5 text-amber-500 mx-auto mb-1 fill-current" />
                  <div
                    className={`text-2xl font-bold ${
                      isDark ? "text-amber-400" : "text-amber-500"
                    }`}
                  >
                    {Math.floor(totalPoints / 100)}
                  </div>
                  <div
                    className={`text-[11px] font-medium ${
                      isDark ? "text-amber-500" : "text-amber-500"
                    }`}
                  >
                    نجوم
                  </div>
                </div>
              </div>

              {/* Progress bar to next star */}
              <div
                className={`rounded-2xl p-4 ${
                  isDark ? "bg-gray-800" : "bg-gray-50"
                }`}
              >
                <div
                  className={`flex justify-between text-[12px] font-semibold mb-2 ${
                    isDark ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  <span>نحو النجمة التالية</span>
                  <span>{100 - pointsToNextStar} / 100</span>
                </div>
                <div
                  className={`w-full h-2.5 rounded-full ${
                    isDark ? "bg-gray-700" : "bg-gray-200"
                  }`}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${100 - pointsToNextStar}%` }}
                    transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
                    className="h-2.5 rounded-full bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400"
                  />
                </div>
                <div
                  className={`text-[11px] mt-2 text-center ${
                    isDark ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  باقي {pointsToNextStar} نقطة للنجمة القادمة ⭐
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>

    {/* ── Quick Nav Modal ── */}
    <AnimatePresence>
      {showCompanionModal && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-[2px]"
            onClick={() => setShowCompanionModal(false)}
          />
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className={`fixed bottom-0 left-0 right-0 z-[201] rounded-t-3xl shadow-2xl ${
              isDark ? "bg-gray-900" : "bg-white"
            }`}
            dir="rtl"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className={`w-12 h-1.5 rounded-full ${isDark ? "bg-gray-700" : "bg-gray-200"}`} />
            </div>

            <div className="px-6 pb-10">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <h2
                  className={`text-xl font-bold ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  ✨ انتقال سريع
                </h2>
                <button
                  onClick={() => setShowCompanionModal(false)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isDark ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Nav grid – 5 items */}
              <div className="grid grid-cols-5 gap-2 mb-5">
                {navItems.map((item, navIdx) => (
                  <motion.button
                    key={item.id}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: navIdx * 0.05, type: "spring", stiffness: 300, damping: 22 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      setShowCompanionModal(false);
                      navigate(item.path);
                    }}
                    className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl border transition-colors ${
                      currentTab === item.id
                        ? isDark
                          ? "bg-purple-900/50 border-purple-600"
                          : "bg-purple-50 border-purple-300"
                        : isDark
                          ? "bg-gray-800 border-gray-700"
                          : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div
                      className={`${
                        item.color
                      } transition-transform ${
                        currentTab === item.id ? "scale-115" : ""
                      }`}
                    >
                      {item.icon}
                    </div>
                    <span
                      className={`text-[10px] font-semibold leading-tight text-center ${
                        isDark ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      {item.label}
                    </span>
                    {currentTab === item.id && (
                      <div
                        className={`w-1 h-1 rounded-full ${
                          item.id === "games"
                            ? "bg-purple-500"
                            : item.id === "tasks"
                              ? "bg-blue-500"
                              : item.id === "gifts"
                                ? "bg-pink-500"
                                : item.id === "progress"
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                        }`}
                      />
                    )}
                  </motion.button>
                ))}
              </div>

              {/* Tip bubble */}
              <div
                className={`rounded-2xl p-4 flex items-center gap-3 ${
                  isDark
                    ? "bg-purple-900/30 border border-purple-800"
                    : "bg-purple-50 border border-purple-100"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isDark ? "bg-purple-800" : "bg-purple-100"
                  }`}
                >
                  <Sparkles
                    className={`w-5 h-5 ${
                      isDark ? "text-purple-300" : "text-purple-600"
                    }`}
                  />
                </div>
                <p
                  className={`text-[12px] font-medium leading-relaxed ${
                    isDark ? "text-purple-200" : "text-purple-700"
                  }`}
                >
                  {companionMessage}
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    </>
  );
}
