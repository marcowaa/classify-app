import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, ListChecks, X } from "lucide-react";

type ParentQuickTask = {
  id: string;
  title: string;
  description?: string | null;
  rewardPoints: number;
  completed: boolean;
  completedAt?: string | null;
  awardedPoints: number;
};

export function ParentQuickStartChecklist({ token }: { token: string | null }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const { data } = useQuery<{ tasks: ParentQuickTask[]; autoCompletedTaskIds: string[] }>({
    queryKey: ["parent-quick-start-tasks"],
    queryFn: async () => {
      const res = await fetch("/api/parent/quick-start/tasks", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      return json?.data || { tasks: [], autoCompletedTaskIds: [] };
    },
    enabled: !!token,
    refetchInterval: 45000,
  });

  const tasks = data?.tasks || [];
  const autoCompletedTaskIds = data?.autoCompletedTaskIds || [];

  const done = useMemo(() => tasks.filter((task) => task.completed).length, [tasks]);
  const total = tasks.length;

  useEffect(() => {
    if (autoCompletedTaskIds.length === 0) {
      return;
    }

    const completedTasks = tasks.filter((task) => autoCompletedTaskIds.includes(task.id));
    const gainedPoints = completedTasks.reduce((sum, task) => sum + Number(task.awardedPoints || task.rewardPoints || 0), 0);

    toast({
      title: t("roleOnboarding.congratsTitle"),
      description: t("roleOnboarding.congratsDescription", {
        count: completedTasks.length,
        points: gainedPoints,
      }),
    });
  }, [autoCompletedTaskIds, tasks, toast, t]);

  if (!token) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={t("roleOnboarding.title")}
        className="fixed top-1/2 -translate-y-1/2 right-2 z-50 h-12 w-12 rounded-full bg-indigo-600 text-white shadow-xl hover:bg-indigo-700 transition-colors"
      >
        <div className="relative flex items-center justify-center h-full w-full">
          <ListChecks className="w-5 h-5" />
          <span className="absolute -top-1 -left-1 bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
            {done}/{total}
          </span>
        </div>
      </button>

      <div
        className={`fixed top-0 right-0 h-full w-[min(24rem,92vw)] z-50 transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <Card className="h-full rounded-none border-l border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm">
          <CardContent className="p-4 md:p-5 space-y-3 h-full overflow-y-auto">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm md:text-base font-black text-slate-900 dark:text-slate-100 inline-flex items-center gap-2">
                  <ListChecks className="w-4 h-4" />
                  {t("roleOnboarding.title")}
                </p>
                <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 mt-1">
                  {t("roleOnboarding.subtitle")}
                </p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label={t("close")}> 
                <X className="w-4 h-4" />
              </Button>
            </div>

            <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
              {t("roleOnboarding.completed", { done, total })}
            </p>

            <div className="space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 px-3 py-2.5 inline-flex items-start gap-2"
                >
                  {task.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm ${task.completed ? "text-slate-500 dark:text-slate-400 line-through" : "text-slate-700 dark:text-slate-200"}`}>
                        {task.title}
                      </span>
                      <Badge variant="secondary" className="text-[11px] whitespace-nowrap">
                        +{task.rewardPoints}
                      </Badge>
                    </div>
                    {task.description ? (
                      <p className="text-xs mt-1 text-slate-500 dark:text-slate-400">{task.description}</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
