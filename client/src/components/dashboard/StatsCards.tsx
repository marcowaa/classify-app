import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { getDateLocale } from "@/i18n/config";
import { Bell, Star, Wallet, Users } from "lucide-react";

interface StatsCardsProps {
  childrenCount: number;
  totalPoints: number;
  walletBalance: number;
  notificationsCount: number;
  onCardClick?: (card: "children" | "points" | "wallet" | "notifications") => void;
}

export function StatsCards({
  childrenCount,
  totalPoints,
  walletBalance,
  notificationsCount,
  onCardClick,
}: StatsCardsProps) {
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();

  const cards = [
    {
      id: "children" as const,
      label: t("parentDashboard.children") || "الأطفال",
      value: childrenCount,
      icon: Users,
      color: "from-purple-500 to-purple-600",
    },
    {
      id: "points" as const,
      label: t("parentDashboard.totalPoints") || "إجمالي النقاط",
      value: totalPoints,
      icon: Star,
      color: "from-yellow-500 to-orange-500",
    },
    {
      id: "wallet" as const,
      label: t("parentDashboard.walletBalance") || "رصيد المحفظة",
      value: walletBalance.toLocaleString(getDateLocale()),
      icon: Wallet,
      color: "from-green-500 to-emerald-600",
    },
    {
      id: "notifications" as const,
      label: t("parentDashboard.notifications") || "الإشعارات",
      value: notificationsCount,
      icon: Bell,
      color: "from-blue-500 to-indigo-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <button
          key={card.id}
          onClick={() => onCardClick?.(card.id)}
          className={`p-4 rounded-xl bg-gradient-to-br ${card.color} text-white shadow-lg transition-colors hover-elevate`}
          data-testid={`button-stat-${card.id}`}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm opacity-90" data-testid={`text-stat-label-${card.id}`}>{card.label}</p>
              <p className="text-2xl font-bold" data-testid={`text-stat-value-${card.id}`}>{card.value}</p>
            </div>
            <card.icon className="w-8 h-8 opacity-80" />
          </div>
        </button>
      ))}
    </div>
  );
}
