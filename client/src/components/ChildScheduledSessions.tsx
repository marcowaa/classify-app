import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CalendarClock,
  Lock,
  Unlock,
  CheckCircle,
  Clock,
  Star,
  Loader2,
  AlertCircle,
  PartyPopper,
} from "lucide-react";

interface SessionTask {
  id: string;
  orderIndex: number;
  status: string;
  pointsReward: number;
  unlockedAt: string | null;
  completedAt: string | null;
  isCorrect: boolean | null;
  pointsEarned: number | null;
}

interface CurrentTaskData {
  id: string;
  question: string;
  answers: Array<{ id: string; text: string; isCorrect?: boolean; imageUrl?: string }>;
  pointsReward: number;
  status: string;
}

interface ScheduledSession {
  id: string;
  title: string;
  description: string | null;
  status: string;
  intervalMinutes: number;
  totalTasks: number;
  completedTasks: number;
  totalPointsReward: number;
  actualStartAt: string | null;
  createdAt: string;
  tasks: SessionTask[];
  currentTask: CurrentTaskData | null;
}

function getTaskIcon(status: string) {
  switch (status) {
    case "completed":
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case "unlocked":
      return <Unlock className="h-5 w-5 text-blue-500 animate-pulse" />;
    case "locked":
      return <Lock className="h-5 w-5 text-gray-400" />;
    case "skipped":
      return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    default:
      return <Lock className="h-5 w-5 text-gray-400" />;
  }
}

export function ChildScheduledSessions() {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const token = localStorage.getItem("childToken");

  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState<{
    correct: boolean;
    points: number;
  } | null>(null);

  const { data: sessionsRaw, isLoading } = useQuery<any>({
    queryKey: ["/api/child/scheduled-sessions"],
    enabled: !!token,
    refetchInterval: token ? 15000 : false,
  });

  const sessions: ScheduledSession[] = Array.isArray(sessionsRaw?.data)
    ? sessionsRaw.data
    : [];

  const submitMutation = useMutation({
    mutationFn: async ({
      taskId,
      selectedAnswerId,
    }: {
      taskId: string;
      selectedAnswerId: string;
    }) => {
      const res = await fetch("/api/child/submit-task", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ taskId, selectedAnswerId }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed" }));
        throw new Error(error.message || "Failed to submit");
      }
      return res.json();
    },
    onSuccess: (data) => {
      const payload = (data as any)?.data ?? data;
      setShowResult({
        correct: payload.isCorrect,
        points: payload.pointsEarned || 0,
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/child/scheduled-sessions"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/child/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/child/info"] });
      setTimeout(() => {
        setShowResult(null);
        setSelectedAnswer(null);
      }, 2500);
    },
    onError: () => {
      setShowResult(null);
      setSelectedAnswer(null);
    },
  });

  if (isLoading) return null;
  if (sessions.length === 0) return null;

  return (
    <div className="space-y-4 mb-6">
      <h2
        className={`text-xl font-bold flex items-center gap-2 ${
          isDark ? "text-white" : "text-gray-800"
        }`}
      >
        <CalendarClock className="h-5 w-5 text-purple-500" />
        {t("scheduledSessions.childView")}
      </h2>

      {sessions.map((session) => {
        const isExpanded = selectedSession === session.id;
        const progressPercent =
          session.totalTasks > 0
            ? (session.completedTasks / session.totalTasks) * 100
            : 0;
        const isCompleted = session.status === "completed";

        return (
          <motion.div
            key={session.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card
              className={`overflow-hidden ${
                isDark ? "bg-gray-800 border-gray-700" : "bg-white"
              } ${
                isCompleted
                  ? "border-green-500/50"
                  : session.status === "active"
                  ? "border-blue-500/50"
                  : "border-yellow-500/50"
              }`}
            >
              <CardContent className="p-4">
                {/* Header */}
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() =>
                    setSelectedSession(isExpanded ? null : session.id)
                  }
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg truncate">
                        {session.title}
                      </h3>
                      {isCompleted && (
                        <PartyPopper className="h-5 w-5 text-yellow-500" />
                      )}
                    </div>
                    {session.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {session.description}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant={
                      isCompleted
                        ? "default"
                        : session.status === "active"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {t(
                      `scheduledSessions.status${
                        session.status.charAt(0).toUpperCase() +
                        session.status.slice(1)
                      }`
                    )}
                  </Badge>
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span>
                      {t("scheduledSessions.progress", {
                        completed: session.completedTasks,
                        total: session.totalTasks,
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-500" />
                      {session.totalPointsReward}
                    </span>
                  </div>
                  <Progress value={progressPercent} className="h-3" />
                </div>

                {/* Task progress dots */}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {session.tasks.map((task, idx) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-1"
                      title={`${t("scheduledSessions.taskOrder", {
                        index: idx + 1,
                      })}`}
                    >
                      {getTaskIcon(task.status)}
                    </div>
                  ))}
                </div>

                {/* Expanded: show current task */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 pt-4 border-t">
                        {isCompleted ? (
                          <div className="text-center py-4">
                            <PartyPopper className="h-10 w-10 mx-auto mb-2 text-yellow-500" />
                            <p className="text-lg font-bold">
                              {t("scheduledSessions.allTasksDone")}
                            </p>
                          </div>
                        ) : session.currentTask ? (
                          <div className="space-y-3">
                            <h4 className="font-bold flex items-center gap-2">
                              <Unlock className="h-4 w-4 text-blue-500" />
                              {t("scheduledSessions.currentTask")}
                            </h4>

                            <p
                              className={`text-base font-medium ${
                                isDark ? "text-white" : "text-gray-800"
                              }`}
                            >
                              {session.currentTask.question}
                            </p>

                            {/* Answer buttons */}
                            <div className="grid gap-2">
                              {session.currentTask.answers.map((answer) => {
                                const isSelected =
                                  selectedAnswer === answer.id;
                                return (
                                  <Button
                                    key={answer.id}
                                    variant={isSelected ? "default" : "outline"}
                                    className={`w-full text-start justify-start h-auto py-3 px-4 ${
                                      showResult
                                        ? answer.isCorrect
                                          ? "bg-green-500/20 border-green-500"
                                          : isSelected
                                          ? "bg-red-500/20 border-red-500"
                                          : ""
                                        : ""
                                    }`}
                                    onClick={() => {
                                      if (showResult || submitMutation.isPending)
                                        return;
                                      setSelectedAnswer(answer.id);
                                    }}
                                    disabled={
                                      submitMutation.isPending || !!showResult
                                    }
                                  >
                                    {answer.text}
                                    {answer.imageUrl && (
                                      <img
                                        src={answer.imageUrl}
                                        alt=""
                                        className="max-h-16 rounded mt-1"
                                      />
                                    )}
                                  </Button>
                                );
                              })}
                            </div>

                            {/* Submit answer */}
                            {selectedAnswer && !showResult && (
                              <Button
                                className="w-full"
                                onClick={() =>
                                  submitMutation.mutate({
                                    taskId: session.currentTask!.id,
                                    selectedAnswerId: selectedAnswer,
                                  })
                                }
                                disabled={submitMutation.isPending}
                              >
                                {submitMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  t("child.submitAnswer")
                                )}
                              </Button>
                            )}

                            {/* Result display */}
                            <AnimatePresence>
                              {showResult && (
                                <motion.div
                                  initial={{ scale: 0.5, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 0.5, opacity: 0 }}
                                  className={`p-4 rounded-lg text-center ${
                                    showResult.correct
                                      ? "bg-green-500/20 border border-green-500/50"
                                      : "bg-red-500/20 border border-red-500/50"
                                  }`}
                                >
                                  {showResult.correct ? (
                                    <>
                                      <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
                                      <p className="font-bold text-green-600">
                                        +{showResult.points} ⭐
                                      </p>
                                    </>
                                  ) : (
                                    <>
                                      <AlertCircle className="h-8 w-8 mx-auto text-red-500 mb-2" />
                                      <p className="font-bold text-red-600">
                                        {t("child.wrongAnswer")}
                                      </p>
                                    </>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ) : (
                          <div className="text-center py-4 text-muted-foreground">
                            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>{t("scheduledSessions.waitingForNext")}</p>
                            {session.intervalMinutes > 0 && (
                              <p className="text-xs mt-1">
                                {t("scheduledSessions.nextTaskIn", {
                                  minutes: session.intervalMinutes,
                                })}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
