import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";
import { ChildBottomNav } from "@/components/ChildBottomNav";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, Clock, ArrowLeft, ArrowRight, BookOpen, Star, Award, Loader2, HelpCircle, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ChildScheduledSessions } from "@/components/ChildScheduledSessions";
import { HelpChatDialog } from "@/components/HelpChatDialog";
import { TaskCardSkeleton } from "@/components/skeletons/TaskCardSkeleton";

interface Task {
  id: string;
  question: string;
  answers: Array<{ id: string; text: string; isCorrect: boolean; imageUrl?: string }>;
  pointsReward: number;
  status: string;
  createdAt: string;
  subject?: { name: string; emoji: string; color: string };
}

interface TaskHelpRequest {
  id: string;
  taskId: string;
  status: "active" | "resolved";
  helperAssigned: boolean;
  createdAt: string;
}

export const ChildTasks = (): JSX.Element => {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark } = useTheme();
  const isRTL = i18n.language === "ar";
  const token = localStorage.getItem("childToken");
  const queryClient = useQueryClient();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState<{ correct: boolean; points: number } | null>(null);
  const [helpChatOpen, setHelpChatOpen] = useState(false);
  const [activeHelpRequestId, setActiveHelpRequestId] = useState<string | null>(null);
  const [activeHelpRequestStatus, setActiveHelpRequestStatus] = useState<string>("active");
  const [helpTaskQuestion, setHelpTaskQuestion] = useState("");
  const [helpTaskAnswers, setHelpTaskAnswers] = useState<Array<{ id: string; text: string; imageUrl?: string }>>([]);
  const [helpQuestionDialogOpen, setHelpQuestionDialogOpen] = useState(false);
  const [helpQuestionText, setHelpQuestionText] = useState("");
  const [helpQuestionTaskId, setHelpQuestionTaskId] = useState<string | null>(null);
  const [didHandleHelpTaskQuery, setDidHandleHelpTaskQuery] = useState(false);

  const { data: tasksRaw, isLoading } = useQuery({
    queryKey: ["/api/child/tasks"],
    enabled: !!token,
    refetchInterval: token ? 15000 : false,
  });

  const { data: childInfo } = useQuery({
    queryKey: ["/api/child/info"],
    enabled: !!token,
    refetchInterval: token ? 30000 : false,
  });

  const { data: helpRequestsRaw } = useQuery({
    queryKey: ["/api/child/help-requests"],
    enabled: !!token,
    refetchInterval: token ? 10000 : false,
  });

  const tasks: Task[] = Array.isArray(tasksRaw) ? tasksRaw : [];
  const helpRequests: TaskHelpRequest[] = Array.isArray(helpRequestsRaw) ? helpRequestsRaw : [];
  const latestHelpByTaskId = helpRequests.reduce<Record<string, TaskHelpRequest>>((acc, req) => {
    const prev = acc[req.taskId];
    if (!prev) {
      acc[req.taskId] = req;
      return acc;
    }
    if (new Date(req.createdAt).getTime() > new Date(prev.createdAt).getTime()) {
      acc[req.taskId] = req;
    }
    return acc;
  }, {});
  const helpSummary = Object.values(latestHelpByTaskId).reduce(
    (acc, req) => {
      if (req.status === "resolved") {
        acc.resolved += 1;
      } else if (req.helperAssigned) {
        acc.accepted += 1;
      } else {
        acc.waiting += 1;
      }
      return acc;
    },
    { waiting: 0, accepted: 0, resolved: 0 }
  );
  const pendingTasks = tasks.filter(t => t.status === "pending");
  const completedTasks = tasks.filter(t => t.status === "completed");
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;
  const childPoints = Number((childInfo as any)?.totalPoints ?? (childInfo as any)?.points ?? 0);

  const submitAnswerMutation = useMutation({
    mutationFn: async ({ taskId, selectedAnswerId }: { taskId: string; selectedAnswerId: string }) => {
      const res = await fetch("/api/child/submit-task", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ taskId, selectedAnswerId }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to submit" }));
        throw new Error(error.message || "Failed to submit");
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      const payload = (data as any)?.data ?? data;
      setShowResult({ correct: payload.isCorrect, points: payload.pointsEarned || 0 });

      if (payload.isCorrect) {
        const currentHelp = latestHelpByTaskId[variables.taskId];
        const shouldCloseHelpCard = Boolean(payload.helpAutoResolved) || Boolean(currentHelp && currentHelp.status === "active");
        if (shouldCloseHelpCard) {
          setHelpChatOpen(false);
          setActiveHelpRequestId(null);
          setActiveHelpRequestStatus("resolved");
          setHelpTaskQuestion("");
          setHelpTaskAnswers([]);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["/api/child/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/child/info"] });
      queryClient.invalidateQueries({ queryKey: ["/api/child/help-requests"] });
      setTimeout(() => {
        setShowResult(null);
        setSelectedTask(null);
        setSelectedAnswer(null);
      }, 2500);
    },
    onError: (error: any) => {
      console.error("Task submission error:", error);
      setShowResult(null);
      setSelectedTask(null);
      setSelectedAnswer(null);
    },
  });

  // Request help mutation
  const requestHelpMutation = useMutation({
    mutationFn: async ({ taskId, initialQuestion }: { taskId: string; initialQuestion?: string }) => {
      const res = await fetch("/api/child/request-help", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ taskId, initialQuestion }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "فشل" }));
        throw new Error(err.message || "فشل طلب المساعدة");
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      const helpRequest = data.data;
      const resolvedHelpRequestId = helpRequest?.helpRequestId || helpRequest?.id;
      setActiveHelpRequestId(String(resolvedHelpRequestId));
      const task = tasks.find(t => t.id === variables.taskId);
      setHelpTaskQuestion(task?.question || "");
      setHelpTaskAnswers(task?.answers || []);
      setActiveHelpRequestStatus("active");
      setHelpChatOpen(true);
      queryClient.invalidateQueries({ queryKey: ["/api/child/help-requests"] });
      setHelpQuestionDialogOpen(false);
      setHelpQuestionText("");
      setHelpQuestionTaskId(null);
    },
  });

  const getHelpState = (taskId: string) => {
    const req = latestHelpByTaskId[taskId];
    if (!req) return null;
    if (req.status === "resolved") return "resolved" as const;
    return req.helperAssigned ? "accepted" as const : "waiting" as const;
  };

  const openExistingHelpChat = (task: Task, req: TaskHelpRequest) => {
    setActiveHelpRequestId(String(req.id));
    setHelpTaskQuestion(task.question || "");
    setHelpTaskAnswers(task.answers || []);
    setActiveHelpRequestStatus(req.status || "active");
    setHelpChatOpen(true);
  };

  useEffect(() => {
    if (didHandleHelpTaskQuery || !token) return;

    const params = new URLSearchParams(window.location.search);
    const helpTaskId = String(params.get("helpTaskId") || "").trim();

    if (!helpTaskId) {
      setDidHandleHelpTaskQuery(true);
      return;
    }

    const task = pendingTasks.find((item) => item.id === helpTaskId);
    if (!task) {
      return;
    }

    const existingHelpRequest = latestHelpByTaskId[helpTaskId];
    if (existingHelpRequest && existingHelpRequest.status === "active") {
      openExistingHelpChat(task, existingHelpRequest);
    } else {
      setHelpQuestionTaskId(helpTaskId);
      setHelpQuestionText("");
      setHelpQuestionDialogOpen(true);
    }

    params.delete("helpTaskId");
    const nextQuery = params.toString();
    const nextPath = `/child-tasks${nextQuery ? `?${nextQuery}` : ""}`;
    window.history.replaceState(null, "", nextPath);
    setDidHandleHelpTaskQuery(true);
  }, [didHandleHelpTaskQuery, token, pendingTasks, latestHelpByTaskId]);

  if (isLoading) {
    return (
      <div className={`min-h-screen ${isDark ? "bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900" : "bg-gradient-to-br from-blue-400 via-cyan-400 to-teal-500"} pb-24`} dir={isRTL ? "rtl" : "ltr"}>
        <header className="sticky top-0 z-40 bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 shadow-lg">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <BookOpen className="w-5 h-5 text-white/50" />
              </div>
              <h1 className="text-xl font-bold text-white/70">{t("child.myTasks")}</h1>
            </div>
          </div>
        </header>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <TaskCardSkeleton count={4} />
        </div>
        <ChildBottomNav activeTab="tasks" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? "bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900" : "bg-gradient-to-br from-blue-400 via-cyan-400 to-teal-500"} pb-24`} dir={isRTL ? "rtl" : "ltr"}>
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => navigate("/child-games")}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-all"
              >
                {isRTL ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
              </motion.button>
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                >
                  <BookOpen className="w-7 h-7 text-cyan-100" />
                </motion.div>
                <h1 className="text-xl font-bold text-white">{t("child.myTasks")}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <motion.div
                className="flex items-center gap-1 bg-yellow-500/30 px-2.5 py-1 rounded-xl"
                whileHover={{ scale: 1.05 }}
              >
                <Star className="w-3.5 h-3.5 text-yellow-200 fill-yellow-200" />
                <span className="text-xs font-bold text-white">{(childInfo as any)?.points || 0}</span>
              </motion.div>
            </div>
          </div>
        </div>
        <div className="w-full overflow-hidden leading-[0] -mb-[1px]">
          <svg viewBox="0 0 1200 40" preserveAspectRatio="none" className="w-full h-3">
            <path d="M0,20 C200,35 400,5 600,20 C800,35 1000,5 1200,20 L1200,40 L0,40 Z" fill={isDark ? "rgb(15, 25, 60)" : "rgb(80, 160, 200)"} fillOpacity="0.3" />
          </svg>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
          {[
            { icon: Clock, value: pendingTasks.length, label: t("child.pendingTasks"), color: "from-orange-500 to-amber-500" },
            { icon: CheckCircle, value: completedTasks.length, label: t("childTasks.completedTasks"), color: "from-emerald-500 to-green-500" },
            { icon: Award, value: `${completionRate}%`, label: t("childProgress.successRate", "Success"), color: "from-blue-500 to-cyan-500" },
            { icon: Star, value: childPoints, label: t("childProfile.about.totalPoints"), color: "from-fuchsia-500 to-purple-500" },
          ].map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
              className={`rounded-2xl p-3 text-white bg-gradient-to-br ${item.color} shadow-lg`}
            >
              <item.icon className="h-4 w-4 mb-1.5" />
              <p className="text-xl font-black leading-tight">{item.value}</p>
              <p className="text-[11px] opacity-95 truncate">{item.label}</p>
            </motion.div>
          ))}
        </div>

        {(helpSummary.waiting > 0 || helpSummary.accepted > 0 || helpSummary.resolved > 0) && (
          <div className={`${isDark ? "bg-gray-800/80 border border-gray-700/40" : "bg-white/80 border border-white/50"} rounded-2xl p-3 mb-5 shadow-lg backdrop-blur-sm`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-xs font-bold ${isDark ? "text-gray-200" : "text-gray-700"}`}>
                {t("childTasks.helpSummary")}
              </span>
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold bg-amber-100 text-amber-700">
                ⏳ {t("childTasks.helpStatusWaiting")}: {helpSummary.waiting}
              </span>
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold bg-blue-100 text-blue-700">
                💬 {t("childTasks.helpStatusAccepted")}: {helpSummary.accepted}
              </span>
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold bg-emerald-100 text-emerald-700">
                ✅ {t("childTasks.helpStatusResolved")}: {helpSummary.resolved}
              </span>
            </div>
          </div>
        )}

        {/* Completion Progress */}
        <div className={`${isDark ? "bg-gray-800/80 border border-gray-700/40" : "bg-white/80 border border-white/50"} rounded-2xl p-4 mb-5 shadow-lg backdrop-blur-sm`}>
          <div className="flex items-center justify-between mb-2">
            <p className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-800"}`}>{t("childProfile.tabs.showcase")}</p>
            <p className={`text-xs font-bold ${isDark ? "text-cyan-300" : "text-cyan-700"}`}>{completionRate}%</p>
          </div>
          <div className={`h-2.5 rounded-full overflow-hidden ${isDark ? "bg-gray-700" : "bg-gray-200"}`}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(4, completionRate)}%` }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-cyan-400 to-blue-500"
            />
          </div>
        </div>

        {/* Scheduled Sessions */}
        <ChildScheduledSessions />

        {pendingTasks.length === 0 && completedTasks.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <motion.div
              animate={{ y: [0, -15, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="mb-6"
            >
              <span className="text-7xl">📚</span>
            </motion.div>
            <h3 className="text-2xl font-bold text-white mb-2">
              {t("child.noTasksNow")}
            </h3>
            <p className="text-white/60 text-sm max-w-xs mx-auto">
              {t("child.whenParentSendTask")}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {pendingTasks.length > 0 && (
              <div>
                <h2 className="text-lg font-bold mb-3 flex items-center gap-2 text-white">
                  <Clock className="h-5 w-5 text-orange-300" />
                  {t("child.pendingTasks")}
                  <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${isDark ? "bg-white/10" : "bg-white/20"}`}>
                    {pendingTasks.length}
                  </span>
                </h2>
                <div className="grid gap-3">
                  {pendingTasks.map((task, index) => (
                    (() => {
                      const taskHelpRequest = latestHelpByTaskId[task.id];
                      const helpState = getHelpState(task.id);
                      return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.06, type: "spring", stiffness: 200 }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className={`${isDark ? "bg-gray-800/90 border border-gray-700/50" : "bg-white/90 border border-white/50"} rounded-2xl p-4 shadow-xl cursor-pointer backdrop-blur-sm`}
                      onClick={() => setSelectedTask(task)}
                      data-testid={`card-task-${task.id}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            {task.subject && (
                              <span className="text-lg">{task.subject.emoji}</span>
                            )}
                            <span className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                              {task.subject?.name || t("childTasks.task")}
                            </span>
                          </div>
                          <p className={`font-bold text-sm ${isDark ? "text-white" : "text-gray-800"} line-clamp-2`}>
                            {task.question}
                          </p>
                          {helpState && (
                            <div className="mt-2">
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  helpState === "waiting"
                                    ? "bg-amber-100 text-amber-700"
                                    : helpState === "accepted"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-emerald-100 text-emerald-700"
                                }`}
                              >
                                {helpState === "waiting"
                                  ? t("childTasks.helpStatusWaiting")
                                  : helpState === "accepted"
                                  ? t("childTasks.helpStatusAccepted")
                                  : t("childTasks.helpStatusResolved")}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-center gap-1.5">
                          <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="flex items-center gap-1 bg-gradient-to-r from-yellow-400 to-orange-500 px-2.5 py-1.5 rounded-xl shrink-0 shadow-md"
                          >
                            <Star className="h-3.5 w-3.5 text-white fill-white" />
                            <span className="font-bold text-white text-xs">
                              +{task.pointsReward}
                            </span>
                          </motion.div>
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (taskHelpRequest && taskHelpRequest.status === "active") {
                                openExistingHelpChat(task, taskHelpRequest);
                                return;
                              }
                              setHelpQuestionTaskId(task.id);
                              setHelpQuestionText("");
                              setHelpQuestionDialogOpen(true);
                            }}
                            disabled={requestHelpMutation.isPending}
                            className="flex items-center gap-1 bg-orange-500/80 hover:bg-orange-600 px-2 py-1 rounded-lg text-white text-[10px] font-bold transition-all"
                          >
                            <HelpCircle className="h-3 w-3" />
                            {taskHelpRequest && taskHelpRequest.status === "active"
                              ? t("childTasks.continueHelpChat")
                              : t("childTasks.requestHelp")}
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                      );
                    })()
                  ))}
                </div>
              </div>
            )}

            {completedTasks.length > 0 && (
              <div>
                <h2 className="text-lg font-bold mb-3 flex items-center gap-2 text-white">
                  <CheckCircle className="h-5 w-5 text-green-300" />
                  {t("childTasks.completedTasks")}
                  <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${isDark ? "bg-white/10" : "bg-white/20"}`}>
                    {completedTasks.length}
                  </span>
                </h2>
                <div className="grid gap-2">
                  {completedTasks.map((task, index) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.04 }}
                      className={`${isDark ? "bg-gray-800/50 border border-gray-700/30" : "bg-white/50 border border-white/30"} rounded-xl p-3 backdrop-blur-sm`}
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
                        <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"} truncate`}>
                          {task.question}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <AnimatePresence>
          {selectedTask && !showResult && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              onClick={() => setSelectedTask(null)}
            >
              <motion.div
                initial={{ scale: 0.85, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.85, opacity: 0, y: 20 }}
                transition={{ type: "spring", stiffness: 300 }}
                className={`w-full max-w-3xl max-h-[88vh] overflow-y-auto rounded-2xl p-6 shadow-2xl ${isDark ? "bg-gray-800 border border-gray-700" : "bg-white"}`}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-gray-800"}`}>
                  📝 {selectedTask.question}
                </h3>
                {(() => {
                  const helpState = getHelpState(selectedTask.id);
                  if (!helpState) return null;
                  return (
                    <div className="mb-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${
                          helpState === "waiting"
                            ? "bg-amber-100 text-amber-700"
                            : helpState === "accepted"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {helpState === "waiting"
                          ? t("childTasks.helpStatusWaiting")
                          : helpState === "accepted"
                          ? t("childTasks.helpStatusAccepted")
                          : t("childTasks.helpStatusResolved")}
                      </span>
                    </div>
                  );
                })()}
                <div className="space-y-2.5">
                  {selectedTask.answers.map((answer, index) => (
                    <motion.button
                      key={index}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setSelectedAnswer(index)}
                      className={`w-full p-3.5 rounded-xl text-start transition-all ${
                        selectedAnswer === index
                          ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white ring-2 ring-blue-300 shadow-lg"
                          : isDark
                          ? "bg-gray-700/70 text-white hover:bg-gray-600"
                          : "bg-gray-50 text-gray-800 hover:bg-gray-100 border border-gray-200"
                      }`}
                      data-testid={`button-answer-${index}`}
                    >
                      {answer.imageUrl && (
                        <img
                          src={answer.imageUrl}
                          alt=""
                          className="w-full h-32 object-contain mb-2 rounded-lg"
                        />
                      )}
                      <span className="text-sm font-medium">{answer.text}</span>
                    </motion.button>
                  ))}
                </div>
                <div className="flex gap-3 mt-5">
                  <Button
                    onClick={() => {
                      if (selectedAnswer !== null && selectedTask) {
                        const answerId = selectedTask.answers[selectedAnswer]?.id;
                        if (answerId) {
                          submitAnswerMutation.mutate({
                            taskId: selectedTask.id,
                            selectedAnswerId: answerId,
                          });
                        }
                      }
                    }}
                    disabled={selectedAnswer === null || submitAnswerMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl py-3"
                    data-testid="button-submit-answer"
                  >
                    {submitAnswerMutation.isPending ? t("childTasks.sending") : t("childTasks.submitAnswer")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      const taskHelpRequest = latestHelpByTaskId[selectedTask.id];
                      if (taskHelpRequest && taskHelpRequest.status === "active") {
                        openExistingHelpChat(selectedTask, taskHelpRequest);
                        return;
                      }
                      setHelpQuestionTaskId(selectedTask.id);
                      setHelpQuestionText("");
                      setHelpQuestionDialogOpen(true);
                    }}
                    disabled={requestHelpMutation.isPending}
                    className="rounded-xl gap-1 text-orange-600 border-orange-300 hover:bg-orange-50"
                  >
                    <HelpCircle className="h-4 w-4" />
                    {(() => {
                      const taskHelpRequest = latestHelpByTaskId[selectedTask.id];
                      if (taskHelpRequest && taskHelpRequest.status === "active") {
                        return t("childTasks.continueHelpChat");
                      }
                      return t("childTasks.requestHelp");
                    })()}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedTask(null);
                      setSelectedAnswer(null);
                    }}
                    className="rounded-xl"
                    data-testid="button-cancel"
                  >
                    {t("childTasks.cancel")}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showResult && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
            >
              <motion.div
                initial={{ scale: 0.3, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0.3, rotate: 20 }}
                transition={{ type: "spring", damping: 12 }}
                className={`rounded-3xl p-8 text-center shadow-2xl ${
                  showResult.correct
                    ? "bg-gradient-to-br from-green-400 to-emerald-500"
                    : "bg-gradient-to-br from-red-400 to-rose-500"
                }`}
              >
                {showResult.correct ? (
                  <>
                    <motion.div
                      animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.6, repeat: 2 }}
                    >
                      <span className="text-6xl block mb-4">🎉</span>
                    </motion.div>
                    <h3 className="text-2xl font-bold text-white mb-2">{t("childTasks.wellDone")}</h3>
                    <p className="text-white text-lg font-bold">+{showResult.points} ⭐</p>
                  </>
                ) : (
                  <>
                    <motion.div
                      animate={{ x: [-5, 5, -5, 5, 0] }}
                      transition={{ duration: 0.5 }}
                    >
                      <span className="text-6xl block mb-4">💪</span>
                    </motion.div>
                    <h3 className="text-2xl font-bold text-white mb-2">{t("childTasks.tryAgain")}</h3>
                    <p className="text-white/80 text-sm">{t("childTasks.incorrectAnswer")}</p>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Help Question Dialog */}
      <Dialog open={helpQuestionDialogOpen} onOpenChange={setHelpQuestionDialogOpen}>
        <DialogContent className="max-w-sm" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <MessageCircle className="h-5 w-5 text-orange-500" />
              {isRTL ? "طلب مساعدة" : "Request Help"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {isRTL ? "وضّح مشكلتك أو سؤالك حتى يتمكن المساعد من مساعدتك بشكل أفضل" : "Describe your problem so the helper can assist you better"}
            </p>
            <Textarea
              placeholder={isRTL ? "اكتب سؤالك هنا..." : "Write your question here..."}
              value={helpQuestionText}
              onChange={(e) => setHelpQuestionText(e.target.value)}
              className="min-h-[100px] resize-none"
              dir={isRTL ? "rtl" : "ltr"}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setHelpQuestionDialogOpen(false);
                setHelpQuestionText("");
                setHelpQuestionTaskId(null);
              }}
            >
              {isRTL ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              onClick={() => {
                if (helpQuestionTaskId) {
                  requestHelpMutation.mutate({
                    taskId: helpQuestionTaskId,
                    initialQuestion: helpQuestionText.trim() || undefined,
                  });
                }
              }}
              disabled={requestHelpMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600 text-white gap-1"
            >
              {requestHelpMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <HelpCircle className="h-4 w-4" />}
              {isRTL ? "إرسال" : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bottom Navigation */}
      <ChildBottomNav activeTab="tasks" />

      {/* Help Chat Dialog */}
      {helpChatOpen && activeHelpRequestId && (
        <HelpChatDialog
          open={helpChatOpen}
          onClose={() => {
            setHelpChatOpen(false);
            setActiveHelpRequestId(null);
            setHelpTaskQuestion("");
            setHelpTaskAnswers([]);
          }}
          helpRequestId={activeHelpRequestId}
          userType="child"
          token={token || ""}
          taskQuestion={helpTaskQuestion}
          taskAnswers={helpTaskAnswers}
          status={activeHelpRequestStatus}
        />
      )}
    </div>
  );
};

export default ChildTasks;
