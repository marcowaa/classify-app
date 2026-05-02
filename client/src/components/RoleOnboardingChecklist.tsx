import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, RotateCcw, ListChecks } from "lucide-react";

interface ChecklistItem {
  id: string;
  label: string;
}

interface RoleOnboardingChecklistProps {
  storageKey: string;
  items: ChecklistItem[];
}

export function RoleOnboardingChecklist({ storageKey, items }: RoleOnboardingChecklistProps) {
  const { t } = useTranslation();
  const persistKey = `classify_role_onboarding_${storageKey}`;

  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(persistKey);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return typeof parsed === "object" && parsed ? parsed : {};
    } catch {
      return {};
    }
  });

  const total = items.length;
  const done = useMemo(() => items.filter((item) => Boolean(completedItems[item.id])).length, [items, completedItems]);

  const saveState = (next: Record<string, boolean>) => {
    setCompletedItems(next);
    try {
      localStorage.setItem(persistKey, JSON.stringify(next));
    } catch {
    }
  };

  const toggleItem = (id: string) => {
    saveState({ ...completedItems, [id]: !completedItems[id] });
  };

  const resetChecklist = () => {
    saveState({});
  };

  return (
    <Card className="border-indigo-100 dark:border-slate-700 bg-gradient-to-r from-indigo-50/80 via-white to-cyan-50/70 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <CardContent className="p-4 md:p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm md:text-base font-black text-slate-900 dark:text-slate-100 inline-flex items-center gap-2">
              <ListChecks className="w-4 h-4" />
              {t("roleOnboarding.title")}
            </p>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 mt-1">
              {t("roleOnboarding.subtitle")}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={resetChecklist}
            className="inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {t("roleOnboarding.reset")}
          </Button>
        </div>

        <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
          {t("roleOnboarding.completed", { done, total })}
        </p>

        <div className="space-y-2">
          {items.map((item) => {
            const checked = Boolean(completedItems[item.id]);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleItem(item.id)}
                className="w-full text-start rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 px-3 py-2.5 inline-flex items-center gap-2 hover:border-indigo-300 dark:hover:border-indigo-500 transition-colors"
              >
                {checked ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-400 flex-shrink-0" />
                )}
                <span className={`text-sm ${checked ? "text-slate-500 dark:text-slate-400 line-through" : "text-slate-700 dark:text-slate-200"}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
