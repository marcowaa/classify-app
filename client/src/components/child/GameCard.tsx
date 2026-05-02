import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { Star, Play, Clock, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface GameCardProps {
  id: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  imageUrl?: string;
  pointsReward: number;
  playTime?: number;
  highScore?: number;
  onPlay: (gameId: string) => void;
  index?: number;
}

export function GameCard({
  id,
  name,
  nameAr,
  description,
  descriptionAr,
  imageUrl,
  pointsReward,
  playTime,
  highScore,
  onPlay,
  index = 0,
}: GameCardProps) {
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();
  const isRTL = i18n.language === "ar";

  const displayName = isRTL && nameAr ? nameAr : name;
  const displayDescription = isRTL && descriptionAr ? descriptionAr : description;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      className={`rounded-2xl overflow-hidden shadow-lg ${
        isDark ? "bg-gray-800" : "bg-white"
      }`}
    >
      {imageUrl && (
        <div className="h-32 overflow-hidden">
          <img
            src={imageUrl}
            alt={displayName}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      <div className="p-4">
        <h3 className={`text-lg font-bold mb-2 ${isDark ? "text-white" : "text-gray-800"}`}>
          {displayName}
        </h3>
        
        {displayDescription && (
          <p className={`text-sm mb-3 line-clamp-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            {displayDescription}
          </p>
        )}
        
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-yellow-500" />
            <span className={`text-sm font-medium ${isDark ? "text-yellow-400" : "text-yellow-600"}`}>
              +{pointsReward}
            </span>
          </div>
          
          {playTime && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                {playTime} {t("minutes") || "دقيقة"}
              </span>
            </div>
          )}
          
          {highScore !== undefined && highScore > 0 && (
            <div className="flex items-center gap-1">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                {highScore}
              </span>
            </div>
          )}
        </div>
        
        <Button
          onClick={() => onPlay(id)}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          data-testid={`button-play-game-${id}`}
        >
          <Play className="w-4 h-4 mr-2" />
          {t("childGames.playNow") || "العب الآن"}
        </Button>
      </div>
    </motion.div>
  );
}
