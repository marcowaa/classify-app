import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { Star, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

interface PointsDisplayProps {
  totalPoints: number;
  todayPoints?: number;
  level?: number;
  showAnimation?: boolean;
}

export function PointsDisplay({
  totalPoints,
  todayPoints = 0,
  level = 1,
  showAnimation = true,
}: PointsDisplayProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();

  const Container = showAnimation ? motion.div : "div";
  const containerProps = showAnimation
    ? {
        initial: { scale: 0.9, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        transition: { duration: 0.3 },
      }
    : {};

  return (
    <Container
      {...containerProps}
      className={`p-4 rounded-2xl ${
        isDark
          ? "bg-gradient-to-br from-yellow-900/50 to-orange-900/50"
          : "bg-gradient-to-br from-yellow-100 to-orange-100"
      } shadow-lg`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-yellow-500 rounded-full">
            <Star className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              {t("childGames.yourPoints") || "نقاطك"}
            </p>
            <p className={`text-3xl font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
              {totalPoints.toLocaleString("ar-EG")}
            </p>
          </div>
        </div>
        
        {todayPoints > 0 && (
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${
            isDark ? "bg-green-900/50 text-green-400" : "bg-green-100 text-green-600"
          }`}>
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm font-medium">+{todayPoints}</span>
          </div>
        )}
      </div>
      
      {level > 0 && (
        <div className="mt-3 pt-3 border-t border-yellow-500/30">
          <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            {t("childGames.level") || "المستوى"}: {level}
          </p>
        </div>
      )}
    </Container>
  );
}
