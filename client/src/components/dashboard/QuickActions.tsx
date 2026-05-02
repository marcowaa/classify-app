import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { Plus, ShoppingBag, BookOpen, Wallet, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuickActionsProps {
  onCreateTask: () => void;
  onOpenStore: () => void;
  onOpenSubjects: () => void;
  onOpenWallet: () => void;
}

export function QuickActions({
  onCreateTask,
  onOpenStore,
  onOpenSubjects,
  onOpenWallet,
}: QuickActionsProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();

  const actions = [
    {
      id: "create-task",
      label: t("parentDashboard.createTask") || "إنشاء مهمة",
      icon: Plus,
      onClick: onCreateTask,
    },
    {
      id: "store",
      label: t("parentDashboard.store") || "المتجر",
      icon: ShoppingBag,
      onClick: onOpenStore,
    },
    {
      id: "subjects",
      label: t("parentDashboard.subjects") || "المواد",
      icon: BookOpen,
      onClick: onOpenSubjects,
    },
    {
      id: "wallet",
      label: t("parentDashboard.wallet") || "المحفظة",
      icon: Wallet,
      onClick: onOpenWallet,
    },
  ];

  return (
    <div className={`p-4 rounded-xl ${isDark ? "bg-gray-800" : "bg-white"} shadow-lg`}>
      <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDark ? "text-white" : "text-gray-800"}`} data-testid="text-quick-actions-title">
        <Zap className="w-5 h-5 text-yellow-500" />
        <span data-testid="text-quick-actions-label">{t("parentDashboard.quickActions") || "إجراءات سريعة"}</span>
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <Button
            key={action.id}
            onClick={action.onClick}
            size="lg"
            data-testid={`button-${action.id}`}
          >
            <action.icon className="w-5 h-5" />
            <span data-testid={`text-action-${action.id}`}>{action.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
