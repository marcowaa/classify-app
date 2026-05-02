import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: ReactNode;
  title?: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}

/**
 * Reusable empty state component for lists, tables, and data views.
 *
 * @example
 * <EmptyState
 *   icon={<ShoppingBag className="w-12 h-12" />}
 *   title={t("store.noProducts")}
 *   description={t("store.noProductsDesc")}
 *   action={<Button onClick={...}>Add Product</Button>}
 * />
 */
export function EmptyState({ icon, title, description, action, compact }: EmptyStateProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();

  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? "py-8 px-4" : "py-16 px-6"}`}>
      <div className={`${compact ? "p-3 mb-3" : "p-4 mb-4"} rounded-full ${isDark ? "bg-gray-800 text-gray-500" : "bg-gray-100 text-gray-400"}`}>
        {icon || <Inbox className={compact ? "w-8 h-8" : "w-12 h-12"} />}
      </div>
      <h3 className={`${compact ? "text-base" : "text-lg"} font-semibold mb-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
        {title || t("emptyState.title")}
      </h3>
      {description && (
        <p className={`${compact ? "text-xs" : "text-sm"} max-w-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export default EmptyState;
