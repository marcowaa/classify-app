import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Clock, Timer, Shield } from "lucide-react";

interface ScreenTimeDialogProps {
  child: { id: string; name: string } | null;
  open: boolean;
  onClose: () => void;
}

export function ScreenTimeDialog({ child, open, onClose }: ScreenTimeDialogProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const { toast } = useToast();
  const token = localStorage.getItem("token");

  const [isEnabled, setIsEnabled] = useState(false);
  const [dailyLimit, setDailyLimit] = useState(120);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("20:00");

  const { data: screenTimeData, isLoading } = useQuery({
    queryKey: ["/api/parent/screen-time", child?.id],
    queryFn: async () => {
      const res = await fetch(`/api/parent/screen-time/${child!.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    enabled: !!child?.id && open,
  });

  const { data: historyData } = useQuery({
    queryKey: ["/api/parent/screen-time/history", child?.id],
    queryFn: async () => {
      const res = await fetch(`/api/parent/screen-time/${child!.id}/history?days=7`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    enabled: !!child?.id && open,
  });

  useEffect(() => {
    if (screenTimeData?.data?.settings) {
      const s = screenTimeData.data.settings;
      setIsEnabled(s.isEnabled ?? false);
      setDailyLimit(s.dailyLimitMinutes ?? 120);
      setStartTime(s.allowedStartTime ?? "08:00");
      setEndTime(s.allowedEndTime ?? "20:00");
    }
  }, [screenTimeData]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PUT", `/api/parent/screen-time/${child!.id}`, {
        isEnabled,
        dailyLimitMinutes: dailyLimit,
        allowedStartTime: startTime,
        allowedEndTime: endTime,
      });
    },
    onSuccess: () => {
      toast({ title: t("screenTime.settingsSaved") });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/screen-time", child?.id] });
    },
    onError: () => {
      toast({ title: t("screenTime.errorOccurred"), variant: "destructive" });
    },
  });

  const settings = screenTimeData?.data?.settings;
  const todayUsage = screenTimeData?.data?.todayUsage;
  const history = historyData?.data || [];
  const usedMinutes = todayUsage?.totalMinutes || 0;
  const limitMinutes = settings?.dailyLimitMinutes || 120;
  const usagePercent = Math.min(100, Math.round((usedMinutes / limitMinutes) * 100));

  const formatMinutes = (m: number) => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return h > 0 ? `${h}${t("screenTime.hours")} ${min}${t("screenTime.minutes")}` : `${min}${t("screenTime.minutesFull")}`;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md" dir={isRTL ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t("screenTime.title", { name: child?.name })}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Today's Usage */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t("screenTime.todayUsage")}
                </span>
                <span className="text-sm font-bold">
                  {formatMinutes(usedMinutes)} / {formatMinutes(limitMinutes)}
                </span>
              </div>
              <Progress value={usagePercent} className="h-3" />
              <p className="text-xs text-gray-500 mt-1">
                {usagePercent}% {t("screenTime.used")}
              </p>
            </div>

            {/* Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-600" />
                <Label>{t("screenTime.enableLimit")}</Label>
              </div>
              <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
            </div>

            {isEnabled && (
              <>
                {/* Daily limit slider */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Timer className="h-4 w-4" />
                    {t("screenTime.dailyLimit")}: {formatMinutes(dailyLimit)}
                  </Label>
                  <input
                    type="range"
                    min={15}
                    max={480}
                    step={15}
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(Number(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>15{t("screenTime.minutes")}</span>
                    <span>8{t("screenTime.hours")}</span>
                  </div>
                </div>

                {/* Time window */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">{t("screenTime.startTime")}</Label>
                    <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t("screenTime.endTime")}</Label>
                    <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                  </div>
                </div>
              </>
            )}

            {/* 7-day history */}
            {history.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">{t("screenTime.last7Days")}</Label>
                <div className="flex items-end gap-1 h-20">
                  {history.slice(0, 7).reverse().map((day: any, i: number) => {
                    const pct = Math.min(100, Math.round((day.totalMinutes / limitMinutes) * 100));
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-t relative" style={{ height: "60px" }}>
                          <div
                            className={`w-full rounded-t absolute bottom-0 ${pct > 100 ? "bg-red-500" : "bg-blue-500"}`}
                            style={{ height: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-500">
                          {day.date?.slice(5)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("screenTime.cancel")}
          </Button>
          <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
            {updateMutation.isPending
              ? t("screenTime.saving")
              : t("screenTime.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ScreenTimeDialog;
