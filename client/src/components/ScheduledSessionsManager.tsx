import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Clock,
  Play,
  Pause,
  XCircle,
  Trash2,
  BarChart3,
  Loader2,
  CalendarClock,
  Plus,
  CheckCircle,
  Lock,
  Unlock,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CreateSessionDialog } from "./CreateSessionDialog";

interface SessionTask {
  id: string;
  orderIndex: number;
  question: string;
  pointsReward: number;
  status: string;
  unlockedAt: string | null;
  completedAt: string | null;
  isCorrect: boolean | null;
  pointsEarned: number | null;
}

interface Session {
  id: string;
  title: string;
  description: string | null;
  intervalMinutes: number;
  activationType: string;
  scheduledStartAt: string | null;
  actualStartAt: string | null;
  totalTasks: number;
  completedTasks: number;
  totalPointsReward: number;
  status: string;
  createdAt: string;
  child: { id: string; name: string } | null;
  tasks: SessionTask[];
}

interface SessionReport {
  session: Session;
  tasks: SessionTask[];
  summary: {
    correctCount: number;
    successRate: number;
    completionRate: number;
    totalPointsEarned: number;
  };
}

function getStatusBadge(status: string, t: (key: string) => string) {
  const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    draft: "secondary",
    active: "default",
    paused: "outline",
    completed: "default",
    cancelled: "destructive",
  };
  const labels: Record<string, string> = {
    draft: t("scheduledSessions.statusDraft"),
    active: t("scheduledSessions.statusActive"),
    paused: t("scheduledSessions.statusPaused"),
    completed: t("scheduledSessions.statusCompleted"),
    cancelled: t("scheduledSessions.statusCancelled"),
  };
  return <Badge variant={variants[status] || "secondary"}>{labels[status] || status}</Badge>;
}

function getTaskStatusIcon(status: string) {
  switch (status) {
    case "completed":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "unlocked":
      return <Unlock className="h-4 w-4 text-blue-500" />;
    case "locked":
      return <Lock className="h-4 w-4 text-gray-400" />;
    case "skipped":
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    default:
      return <Lock className="h-4 w-4 text-gray-400" />;
  }
}

export function ScheduledSessionsManager() {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showSessions, setShowSessions] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showReport, setShowReport] = useState<string | null>(null);

  const { data: sessionsData, isLoading } = useQuery<any>({
    queryKey: ["/api/parent/scheduled-sessions"],
    enabled: showSessions,
  });

  const sessions: Session[] = Array.isArray(sessionsData?.data)
    ? sessionsData.data
    : Array.isArray(sessionsData)
    ? sessionsData
    : [];

  const { data: reportData, isLoading: reportLoading } = useQuery<any>({
    queryKey: ["/api/parent/scheduled-sessions", showReport, "report"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/parent/scheduled-sessions/${showReport}/report`);
      return res.json();
    },
    enabled: !!showReport,
  });

  const report: SessionReport | null = reportData?.data || null;

  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/parent/scheduled-sessions/${id}/activate`);
    },
    onSuccess: () => {
      toast({ title: t("scheduledSessions.activated") });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/scheduled-sessions"] });
    },
    onError: (err: any) => {
      toast({ title: err.message || "Failed", variant: "destructive" });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/parent/scheduled-sessions/${id}/pause`);
    },
    onSuccess: () => {
      toast({ title: t("scheduledSessions.paused") });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/scheduled-sessions"] });
    },
    onError: (err: any) => {
      toast({ title: err.message || "Failed", variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/parent/scheduled-sessions/${id}/cancel`);
    },
    onSuccess: () => {
      toast({ title: t("scheduledSessions.cancelled") });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/scheduled-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/wallet"] });
    },
    onError: (err: any) => {
      toast({ title: err.message || "Failed", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/parent/scheduled-sessions/${id}`);
    },
    onSuccess: () => {
      toast({ title: t("scheduledSessions.deleted") });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/scheduled-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/wallet"] });
    },
    onError: (err: any) => {
      toast({ title: err.message || "Failed", variant: "destructive" });
    },
  });

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setShowSessions(true)}
        data-testid="view-scheduled-sessions"
      >
        <CalendarClock className="h-4 w-4 ml-2" />
        {t("scheduledSessions.title")}
      </Button>

      {/* Sessions List Dialog */}
      <Dialog open={showSessions} onOpenChange={setShowSessions}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5" />
                {t("scheduledSessions.title")}
              </span>
              <Button size="sm" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 ml-1" />
                {t("scheduledSessions.createSession")}
              </Button>
            </DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarClock className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{t("scheduledSessions.noSessions")}</p>
              <Button className="mt-4" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 ml-1" />
                {t("scheduledSessions.createSession")}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <Card key={session.id} className={isDark ? "bg-gray-800" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-sm truncate">{session.title}</h4>
                          {getStatusBadge(session.status, t)}
                        </div>
                        {session.child && (
                          <p className="text-xs text-muted-foreground mb-2">
                            👤 {session.child.name}
                          </p>
                        )}
                        {session.description && (
                          <p className="text-xs text-muted-foreground mb-2">{session.description}</p>
                        )}

                        {/* Progress */}
                        <div className="mb-2">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span>
                              {t("scheduledSessions.progress", {
                                completed: session.completedTasks,
                                total: session.totalTasks,
                              })}
                            </span>
                            <span>{session.totalPointsReward} ⭐</span>
                          </div>
                          <Progress
                            value={
                              session.totalTasks > 0
                                ? (session.completedTasks / session.totalTasks) * 100
                                : 0
                            }
                            className="h-2"
                          />
                        </div>

                        {/* Task pills */}
                        <div className="flex flex-wrap gap-1">
                          {(session.tasks || []).map((task, idx) => (
                            <div
                              key={task.id}
                              className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border"
                              title={`${t("scheduledSessions.taskOrder", { index: idx + 1 })} - ${t(`scheduledSessions.task${task.status.charAt(0).toUpperCase() + task.status.slice(1)}`)}`}
                            >
                              {getTaskStatusIcon(task.status)}
                              <span>{idx + 1}</span>
                            </div>
                          ))}
                        </div>

                        {/* Interval info */}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                          <Clock className="h-3 w-3" />
                          {session.intervalMinutes > 0
                            ? `${session.intervalMinutes} ${t("scheduledSessions.intervalMinutes")}`
                            : t("scheduledSessions.intervalHelp")}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-col gap-1">
                        {session.status === "draft" && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => activateMutation.mutate(session.id)}
                            disabled={activateMutation.isPending}
                            title={t("scheduledSessions.activate")}
                          >
                            <Play className="h-3 w-3" />
                          </Button>
                        )}
                        {session.status === "active" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => pauseMutation.mutate(session.id)}
                            disabled={pauseMutation.isPending}
                            title={t("scheduledSessions.pause")}
                          >
                            <Pause className="h-3 w-3" />
                          </Button>
                        )}
                        {(session.status === "active" || session.status === "paused") && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (confirm(t("scheduledSessions.confirmCancel"))) {
                                cancelMutation.mutate(session.id);
                              }
                            }}
                            disabled={cancelMutation.isPending}
                            title={t("scheduledSessions.cancel")}
                          >
                            <XCircle className="h-3 w-3" />
                          </Button>
                        )}
                        {(session.status === "draft" || session.status === "cancelled") && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm(t("scheduledSessions.confirmDelete"))) {
                                deleteMutation.mutate(session.id);
                              }
                            }}
                            disabled={deleteMutation.isPending}
                            title={t("scheduledSessions.delete")}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        )}
                        {(session.status === "completed" || session.completedTasks > 0) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setShowReport(session.id)}
                            title={t("scheduledSessions.viewReport")}
                          >
                            <BarChart3 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={!!showReport} onOpenChange={() => setShowReport(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {t("scheduledSessions.report")}
            </DialogTitle>
          </DialogHeader>

          {reportLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : report ? (
            <div className="space-y-4">
              <h3 className="font-bold">{report.session.title}</h3>

              {/* Summary stats */}
              <div className="grid grid-cols-2 gap-3">
                <Card className={isDark ? "bg-gray-800" : ""}>
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold text-green-500">
                      {report.summary.correctCount}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t("scheduledSessions.correctCount")}
                    </div>
                  </CardContent>
                </Card>
                <Card className={isDark ? "bg-gray-800" : ""}>
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold text-blue-500">
                      {Math.round(report.summary.successRate)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t("scheduledSessions.successRate")}
                    </div>
                  </CardContent>
                </Card>
                <Card className={isDark ? "bg-gray-800" : ""}>
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold text-purple-500">
                      {Math.round(report.summary.completionRate)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t("scheduledSessions.completionRate")}
                    </div>
                  </CardContent>
                </Card>
                <Card className={isDark ? "bg-gray-800" : ""}>
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold text-yellow-500">
                      {report.summary.totalPointsEarned} ⭐
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t("scheduledSessions.totalPointsEarned")}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Task details */}
              <div className="space-y-2">
                {(report.tasks || []).map((task: SessionTask, idx: number) => (
                  <div
                    key={task.id}
                    className={`flex items-center gap-3 p-2 rounded-lg border ${
                      task.isCorrect === true
                        ? "border-green-500/30 bg-green-500/5"
                        : task.isCorrect === false
                        ? "border-red-500/30 bg-red-500/5"
                        : ""
                    }`}
                  >
                    {getTaskStatusIcon(task.status)}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">
                        {t("scheduledSessions.taskOrder", { index: idx + 1 })}
                      </span>
                      <p className="text-xs text-muted-foreground truncate">
                        {task.question}
                      </p>
                    </div>
                    <div className="text-xs">
                      {task.pointsEarned != null && (
                        <span className={task.isCorrect ? "text-green-500" : "text-red-500"}>
                          {task.pointsEarned} ⭐
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              {t("scheduledSessions.noSessions")}
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Session Dialog */}
      <CreateSessionDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/parent/scheduled-sessions"] });
          queryClient.invalidateQueries({ queryKey: ["/api/parent/wallet"] });
        }}
      />
    </>
  );
}
