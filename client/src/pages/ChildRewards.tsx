import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/contexts/ThemeContext";
import { useLocation } from "wouter";
import { ChildBottomNav } from "@/components/ChildBottomNav";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Star, ArrowLeft, ArrowRight, Gift, Sparkles, Loader2 } from "lucide-react";

export default function ChildRewards() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { isDark } = useTheme();
  const [, navigate] = useLocation();
  const isRTL = i18n.language === "ar";
  const token = localStorage.getItem("childToken");

  const { data: rewardsRaw, isLoading } = useQuery({
    queryKey: ["/api/child/rewards"],
    enabled: !!token,
    refetchInterval: token ? 30000 : false,
  });

  const rewards = Array.isArray(rewardsRaw) ? rewardsRaw : [];

  return (
    <div
      className={`min-h-screen ${isDark ? "bg-gradient-to-br from-amber-900 via-orange-900 to-yellow-900" : "bg-gradient-to-br from-amber-400 via-orange-400 to-yellow-500"} pb-24`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 shadow-lg">
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
                  animate={{ rotate: [0, -15, 15, -15, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                >
                  <Trophy className="w-7 h-7 text-yellow-100" />
                </motion.div>
                <h1 className="text-xl font-bold text-white">{t("child.myRewards")}</h1>
              </div>
            </div>
          </div>
        </div>
        {/* Wave */}
        <div className="w-full overflow-hidden leading-[0] -mb-[1px]">
          <svg viewBox="0 0 1200 40" preserveAspectRatio="none" className="w-full h-3">
            <path d="M0,20 C200,35 400,5 600,20 C800,35 1000,5 1200,20 L1200,40 L0,40 Z" fill={isDark ? "rgb(60, 30, 10)" : "rgb(210, 160, 60)"} fillOpacity="0.3" />
          </svg>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex flex-col justify-center items-center h-48 gap-3">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
              <Loader2 className="w-10 h-10 text-white/70" />
            </motion.div>
            <p className="text-white/60 text-sm animate-pulse">{isRTL ? "جاري التحميل..." : "Loading..."}</p>
          </div>
        ) : rewards.length === 0 ? (
          /* Empty State */
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <motion.div
              animate={{ y: [0, -15, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="mb-6"
            >
              <span className="text-7xl">🏆</span>
            </motion.div>
            <h3 className="text-2xl font-bold text-white mb-2">
              {t("child.noRewards")}
            </h3>
            <p className="text-white/70 text-base max-w-xs mx-auto mb-6">
              {isRTL ? "العب ألعاب واكسب نقاط لتحصل على مكافآت رائعة!" : "Play games and earn points to get awesome rewards!"}
            </p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.03 }}
              onClick={() => navigate("/child-games")}
              className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-bold rounded-2xl backdrop-blur-sm inline-flex items-center gap-2 transition-all"
            >
              <Sparkles className="w-5 h-5" />
              {isRTL ? "ابدأ اللعب!" : "Start Playing!"}
            </motion.button>
          </motion.div>
        ) : (
          /* Rewards List */
          <div className="space-y-4">
            <AnimatePresence>
              {rewards.map((r: any, index: number) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: index * 0.08, type: "spring", stiffness: 200 }}
                  className={`${isDark ? "bg-gray-800/80 border-gray-700/50" : "bg-white/90 border-white/60"} border rounded-2xl p-4 shadow-xl backdrop-blur-sm`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center shrink-0 shadow-lg">
                        <Gift className="w-6 h-6 text-white" />
                      </div>
                      <div className="min-w-0">
                        <h3 className={`font-bold text-base truncate ${isDark ? "text-white" : "text-gray-800"}`}>
                          {r.productName}
                        </h3>
                        {/* Progress Bar */}
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className={`flex-1 h-2.5 rounded-full overflow-hidden ${isDark ? "bg-gray-700" : "bg-gray-200"}`}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(r.progress || 0, 100)}%` }}
                              transition={{ delay: index * 0.08 + 0.3, duration: 0.8, ease: "easeOut" }}
                              className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"
                            />
                          </div>
                          <span className={`text-xs font-bold ${isDark ? "text-yellow-300" : "text-orange-600"} whitespace-nowrap`}>
                            {r.progress || 0}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      whileHover={{ scale: 1.05 }}
                      onClick={() => toast({ title: t("child.redeemReward") })}
                      disabled={(r.progress || 0) < 100}
                      className={`px-4 py-2.5 rounded-xl font-bold text-sm shrink-0 transition-all flex items-center gap-1.5 ${
                        (r.progress || 0) >= 100
                          ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg"
                          : `${isDark ? "bg-gray-700 text-gray-500" : "bg-gray-200 text-gray-400"} cursor-not-allowed`
                      }`}
                    >
                      <Star className="w-4 h-4" />
                      {t("child.redeemReward")}
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <ChildBottomNav activeTab="games" />
    </div>
  );
}
