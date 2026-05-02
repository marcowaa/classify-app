import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Child {
  id: string;
  displayName: string;
  totalPoints: number;
  avatarUrl?: string;
}

interface ChildrenListProps {
  children: Child[];
  selectedChildId?: string;
  onSelectChild: (child: Child) => void;
  isLoading?: boolean;
}

export function ChildrenList({
  children,
  selectedChildId,
  onSelectChild,
  isLoading,
}: ChildrenListProps) {
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();
  const isRTL = i18n.language === "ar";

  if (isLoading) {
    return (
      <div className={`p-4 rounded-xl ${isDark ? "bg-gray-800" : "bg-white"} shadow-lg`}>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24" />
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-16 mt-2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className={`p-6 rounded-xl ${isDark ? "bg-gray-800" : "bg-white"} shadow-lg text-center`}>
        <p className={`${isDark ? "text-gray-400" : "text-gray-500"}`}>
          {t("parentDashboard.noChildren") || "لا يوجد أطفال مرتبطين"}
        </p>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-xl ${isDark ? "bg-gray-800" : "bg-white"} shadow-lg`}>
      <h3 className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-gray-800"}`} data-testid="text-children-list-title">
        {t("parentDashboard.linkedChildren") || "الأطفال المرتبطين"}
      </h3>
      <div className="space-y-3">
        {children.map((child) => (
          <button
            key={child.id}
            onClick={() => onSelectChild(child)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
              selectedChildId === child.id
                ? isDark
                  ? "bg-purple-900/50 border-2 border-purple-500"
                  : "bg-purple-100 border-2 border-purple-500"
                : isDark
                ? "bg-gray-700 hover:bg-gray-600"
                : "bg-gray-50 hover:bg-gray-100"
            }`}
            data-testid={`button-child-${child.id}`}
          >
            <Avatar className="w-12 h-12">
              <AvatarImage src={child.avatarUrl} />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold">
                {child.displayName?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-right">
              <p className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`} data-testid={`text-child-name-${child.id}`}>
                {child.displayName}
              </p>
              <p className={`text-sm flex items-center gap-1 ${isDark ? "text-gray-400" : "text-gray-500"}`} data-testid={`text-child-points-${child.id}`}>
                <Star className="w-4 h-4 text-yellow-500" />
                {child.totalPoints} {t("points") || "نقطة"}
              </p>
            </div>
            {isRTL ? (
              <ChevronLeft className={`w-5 h-5 ${isDark ? "text-gray-400" : "text-gray-500"}`} />
            ) : (
              <ChevronRight className={`w-5 h-5 ${isDark ? "text-gray-400" : "text-gray-500"}`} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
