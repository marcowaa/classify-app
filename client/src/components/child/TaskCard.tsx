import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { Star, CheckCircle, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface TaskCardProps {
  id: string;
  question: string;
  pointsReward: number;
  imageUrl?: string;
  status: "pending" | "completed" | "failed";
  subjectName?: string;
  onStart: (taskId: string) => void;
  index?: number;
}

export function TaskCard({
  id,
  question,
  pointsReward,
  imageUrl,
  status,
  subjectName,
  onStart,
  index = 0,
}: TaskCardProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();

  const statusConfig = {
    pending: {
      icon: Clock,
      color: "text-blue-500",
      bg: isDark ? "bg-blue-900/30" : "bg-blue-100",
      label: t("childTasks.pending") || "قيد الانتظار",
    },
    completed: {
      icon: CheckCircle,
      color: "text-green-500",
      bg: isDark ? "bg-green-900/30" : "bg-green-100",
      label: t("childTasks.completed") || "مكتملة",
    },
    failed: {
      icon: XCircle,
      color: "text-red-500",
      bg: isDark ? "bg-red-900/30" : "bg-red-100",
      label: t("childTasks.failed") || "فشلت",
    },
  };

  const currentStatus = statusConfig[status];
  const StatusIcon = currentStatus.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      className={`rounded-xl overflow-hidden shadow-md ${
        isDark ? "bg-gray-800" : "bg-white"
      }`}
    >
      <div className="flex">
        {imageUrl && (
          <div className="w-24 h-24 flex-shrink-0">
            <img
              src={imageUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className={`font-bold line-clamp-2 ${isDark ? "text-white" : "text-gray-800"}`}>
              {question}
            </h3>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${currentStatus.bg}`}>
              <StatusIcon className={`w-4 h-4 ${currentStatus.color}`} />
            </div>
          </div>
          
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className={`text-sm font-medium ${isDark ? "text-yellow-400" : "text-yellow-600"}`}>
                +{pointsReward}
              </span>
            </div>
            
            {subjectName && (
              <span className={`text-xs px-2 py-1 rounded-full ${
                isDark ? "bg-purple-900/50 text-purple-300" : "bg-purple-100 text-purple-600"
              }`}>
                {subjectName}
              </span>
            )}
          </div>
          
          {status === "pending" && (
            <Button
              size="sm"
              onClick={() => onStart(id)}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              data-testid={`button-start-task-${id}`}
            >
              {t("childTasks.start") || "ابدأ"}
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
