import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";
import { ChildBottomNav } from "@/components/ChildBottomNav";
import { motion } from "framer-motion";
import { 
  Star, 
  Trophy, 
  Target, 
  Zap, 
  Gift, 
  Calendar, 
  TrendingUp,
  Gamepad2,
  ArrowLeft,
  ArrowRight,
  Flame,
  Loader2
} from "lucide-react";

interface ProgressData {
  currentPoints: number;
  tasksCompleted: number;
  totalTasks: number;
  successRate: number;
  pointsPerDay: number;
  speedLevel: string;
  daysSinceJoined: number;
  pendingGiftsCount: number;
  claimedGiftsCount: number;
  activeGoalsCount: number;
  closestGoal: { progress: number; pointsNeeded: number } | null;
  nextMilestone: number;
  milestoneProgress: number;
  motivationalMessage: string;
}

const getSpeedLevelConfig = (t: any): Record<string, { label: string; color: string; icon: JSX.Element }> => ({
  superfast: { label: t("progress.superfast"), color: "from-purple-500 to-pink-500", icon: <Flame className="w-6 h-6" /> },
  fast: { label: t("progress.fast"), color: "from-green-500 to-emerald-500", icon: <Zap className="w-6 h-6" /> },
  moderate: { label: t("progress.moderate"), color: "from-blue-500 to-cyan-500", icon: <TrendingUp className="w-6 h-6" /> },
  slow: { label: t("progress.slow"), color: "from-yellow-500 to-orange-500", icon: <Star className="w-6 h-6" /> },
});

export const ChildProgress = (): JSX.Element => {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark } = useTheme();
  const isRTL = i18n.language === "ar";
  const token = localStorage.getItem("childToken");

  const { data: progressData, isLoading } = useQuery<{ success: boolean; data: ProgressData }>({
    queryKey: ["child-progress"],
    queryFn: async () => {
      const res = await fetch("/api/child/progress", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    enabled: !!token,
    refetchInterval: token ? 30000 : false,
  });

  const { data: childInfo } = useQuery({
    queryKey: ["child-info"],
    queryFn: async () => {
      const res = await fetch("/api/child/info", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return json?.data || json;
    },
    enabled: !!token,
    refetchInterval: token ? 30000 : false,
  });

  const progress = progressData?.data;
  const speedLevelConfig = getSpeedLevelConfig(t);
  const speedConfig = progress ? speedLevelConfig[progress.speedLevel] || speedLevelConfig.slow : speedLevelConfig.slow;

  return (
    <div className={`min-h-screen ${isDark ? "bg-gradient-to-br from-indigo-900 to-purple-900" : "bg-gradient-to-br from-blue-400 to-purple-500"} pb-24`} dir={isRTL ? "rtl" : "ltr"}>
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => navigate("/child-games")}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-all"
              >
                {isRTL ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
              </motion.button>
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
                >
                  <Trophy className="w-7 h-7 text-yellow-300" />
                </motion.div>
                <h1 className="text-xl font-bold text-white">{t("progress.myProgress")}</h1>
              </div>
            </div>
            {childInfo?.name && (
              <p className="text-white/70 text-sm hidden sm:block">
                {t("progress.hello")} {childInfo.name}! 🌟
              </p>
            )}
          </div>
        </div>
        <div className="w-full overflow-hidden leading-[0] -mb-[1px]">
          <svg viewBox="0 0 1200 40" preserveAspectRatio="none" className="w-full h-3">
            <path d="M0,20 C200,35 400,5 600,20 C800,35 1000,5 1200,20 L1200,40 L0,40 Z" fill={isDark ? "rgb(30, 20, 60)" : "rgb(100, 120, 200)"} fillOpacity="0.3" />
          </svg>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">

        {isLoading ? (
          <div className="flex flex-col justify-center items-center h-48 gap-3">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
              <Loader2 className="w-10 h-10 text-white/70" />
            </motion.div>
            <p className="text-white/60 text-sm animate-pulse">{isRTL ? "جاري التحميل..." : "Loading..."}</p>
          </div>
        ) : progress ? (
          <div className="space-y-6">
            {/* Today Focus */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className={`${isDark ? "bg-gray-800/90 border border-gray-700/50" : "bg-white/90 border border-white/50"} rounded-2xl p-4 shadow-xl backdrop-blur-sm`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                  {t("progress.myProgress")}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate("/child-tasks")}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                  >
                    {t("childNav.tasks", "Tasks")}
                  </button>
                  <button
                    onClick={() => navigate("/child-games")}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors"
                  >
                    {t("childNav.games", "Games")}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className={`rounded-xl p-2.5 ${isDark ? "bg-gray-700/60" : "bg-gray-100/80"}`}>
                  <p className={`text-[10px] ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t("child.pendingTasks", "Pending")}</p>
                  <p className={`text-lg font-extrabold ${isDark ? "text-white" : "text-gray-800"}`}>{Math.max(0, progress.totalTasks - progress.tasksCompleted)}</p>
                </div>
                <div className={`rounded-xl p-2.5 ${isDark ? "bg-gray-700/60" : "bg-gray-100/80"}`}>
                  <p className={`text-[10px] ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t("childProgress.completedTask")}</p>
                  <p className={`text-lg font-extrabold ${isDark ? "text-white" : "text-gray-800"}`}>{progress.tasksCompleted}</p>
                </div>
                <div className={`rounded-xl p-2.5 ${isDark ? "bg-gray-700/60" : "bg-gray-100/80"}`}>
                  <p className={`text-[10px] ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t("childProgress.successRate")}</p>
                  <p className={`text-lg font-extrabold ${isDark ? "text-white" : "text-gray-800"}`}>{Math.max(0, progress.successRate)}%</p>
                </div>
              </div>
            </motion.div>

            {/* Speed Level Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className={`${isDark ? "bg-gray-800/90 border border-gray-700/50" : "bg-white/90 border border-white/50"} rounded-2xl p-5 shadow-xl backdrop-blur-sm`}
            >
              <div className="flex items-center gap-4 mb-5">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-r ${speedConfig.color} flex items-center justify-center text-white shadow-lg`}
                >
                  {speedConfig.icon}
                </motion.div>
                <div className="flex-1">
                  <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t("childProgress.speedLevel")}</p>
                  <h2 className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                    {speedConfig.label}
                  </h2>
                </div>
                <div className="text-center">
                  <motion.p
                    key={progress.pointsPerDay}
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-800"}`}
                  >
                    {progress.pointsPerDay}
                  </motion.p>
                  <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t("childProgress.pointsPerDay")}</p>
                </div>
              </div>
              <div className={`p-3.5 rounded-xl ${isDark ? "bg-gray-700/50" : "bg-blue-50"}`}>
                <p className={`text-sm text-center font-medium ${isDark ? "text-white/80" : "text-gray-700"}`}>
                  💪 {progress.motivationalMessage}
                </p>
              </div>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: Star, value: progress.currentPoints, label: t("childProgress.points"), color: "text-yellow-500", bg: "from-yellow-400 to-amber-500", emoji: "⭐" },
                { icon: Trophy, value: progress.tasksCompleted, label: t("childProgress.completedTask"), color: "text-green-500", bg: "from-green-400 to-emerald-500", emoji: "🏆" },
                { icon: Gift, value: progress.claimedGiftsCount, label: t("childProgress.giftsReceived"), color: "text-pink-500", bg: "from-pink-400 to-rose-500", emoji: "🎁" },
                { icon: Calendar, value: progress.daysSinceJoined, label: t("childProgress.days"), color: "text-blue-500", bg: "from-blue-400 to-indigo-500", emoji: "📅" },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: index * 0.1, type: "spring", stiffness: 200 }}
                  whileHover={{ y: -4, scale: 1.03 }}
                  className={`${isDark ? "bg-gray-800/90 border border-gray-700/50" : "bg-white/90 border border-white/50"} rounded-2xl p-4 text-center shadow-xl backdrop-blur-sm`}
                >
                  <motion.div
                    className="text-3xl mb-2"
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
                  >
                    {stat.emoji}
                  </motion.div>
                  <motion.p
                    key={stat.value}
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-800"}`}
                  >
                    {stat.value}
                  </motion.p>
                  <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{stat.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Next Goal */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className={`${isDark ? "bg-gray-800/90 border border-gray-700/50" : "bg-white/90 border border-white/50"} rounded-2xl p-5 shadow-xl backdrop-blur-sm`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-800"} flex items-center gap-2`}>
                  🎯 {t("childProgress.nextGoal")}
                </h3>
                <span className="px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-xl text-xs font-bold shadow-md">
                  {t("childProgress.pointsCount", { count: progress.nextMilestone })}
                </span>
              </div>
              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className={isDark ? "text-gray-400" : "text-gray-500"}>
                    {progress.currentPoints} / {progress.nextMilestone}
                  </span>
                  <span className={`font-bold ${isDark ? "text-yellow-300" : "text-orange-600"}`}>
                    {progress.milestoneProgress}%
                  </span>
                </div>
                <div className={`h-3.5 rounded-full ${isDark ? "bg-gray-700" : "bg-gray-200"} overflow-hidden`}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(progress.milestoneProgress, 100)}%` }}
                    transition={{ duration: 1, delay: 0.7, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"
                  />
                </div>
              </div>
              <p className={`text-center text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                ✨ {t("childProgress.remainingToGoal", { count: progress.nextMilestone - progress.currentPoints })}
              </p>
            </motion.div>

            {progress.closestGoal && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className={`${isDark ? "bg-gray-800/90 border border-gray-700/50" : "bg-white/90 border border-white/50"} rounded-2xl p-5 shadow-xl backdrop-blur-sm`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  >
                    <Target className="w-7 h-7 text-purple-500" />
                  </motion.div>
                  <h3 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                    {t("childProgress.closestGift")}
                  </h3>
                </div>
                <div className="mb-3">
                  <div className={`h-3.5 rounded-full ${isDark ? "bg-gray-700" : "bg-gray-200"} overflow-hidden`}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(progress.closestGoal.progress, 100)}%` }}
                      transition={{ duration: 1, delay: 0.8, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                    />
                  </div>
                </div>
                <p className={`text-center text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  🎁 {progress.closestGoal.progress}% - {t("childProgress.remaining", { count: progress.closestGoal.pointsNeeded })}
                </p>
              </motion.div>
            )}

            {progress.pendingGiftsCount > 0 && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                whileTap={{ scale: 0.97 }}
                whileHover={{ scale: 1.02 }}
                onClick={() => navigate("/child-gifts")}
                className="w-full p-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl transition-all"
                data-testid="button-pending-gifts"
              >
                <Gift className="w-6 h-6" />
                {t("childProgress.pendingGifts", { count: progress.pendingGiftsCount })}
              </motion.button>
            )}

            <div className="grid grid-cols-2 gap-3">
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/child-games")}
                className="p-5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-2xl font-bold flex flex-col items-center gap-2 shadow-xl"
                data-testid="button-games"
              >
                <Gamepad2 className="w-9 h-9" />
                <span className="text-sm">{t("childProgress.playAndEarn")}</span>
              </motion.button>
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/child-gifts")}
                className="p-5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-2xl font-bold flex flex-col items-center gap-2 shadow-xl"
                data-testid="button-gifts"
              >
                <Gift className="w-9 h-9" />
                <span className="text-sm">{t("childProgress.myGifts")}</span>
              </motion.button>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${isDark ? "bg-gray-800/90 border border-gray-700/50" : "bg-white/90 border border-white/50"} rounded-2xl p-10 text-center shadow-xl backdrop-blur-sm`}
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="mb-4"
            >
              <span className="text-6xl">🏆</span>
            </motion.div>
            <h3 className={`text-2xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-800"}`}>
              {t("childProgress.startJourney")}
            </h3>
            <p className={`${isDark ? "text-gray-400" : "text-gray-500"} mb-6 text-sm`}>
              {t("childProgress.emptyMessage")}
            </p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.03 }}
              onClick={() => navigate("/child-games")}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-bold shadow-xl"
              data-testid="button-start"
            >
              {t("childProgress.startNow")} ✨
            </motion.button>
          </motion.div>
        )}
      </div>

      {/* Bottom Navigation */}
      <ChildBottomNav activeTab="progress" />
    </div>
  );
};

export default ChildProgress;
