import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { emitNotificationSync } from "@/lib/notificationRealtime";

interface TaskNotification {
  id: string;
  title: string;
  description?: string;
  type: "task" | "question" | "quiz";
  question?: string;
  answers?: { id: string; text: string; isCorrect?: boolean; emoji?: string; imageUrl?: string }[];
  points: number;
  failedAttempts?: number;
  isMandatory?: boolean;
  expiresAt?: Date;
}

interface SponsoredTaskNotificationProps {
  notification: TaskNotification;
  onComplete: (notificationId: string, answerId?: string) => void;
  onRequestHelp?: (notificationId: string) => Promise<void> | void;
  isSubmitting?: boolean;
  isRequestingHelp?: boolean;
  helpRequested?: boolean;
  errorMessage?: string;
  showSuccess?: boolean;
  cooldownSeconds?: number;
}

export function SponsoredTaskNotification({
  notification,
  onComplete,
  onRequestHelp,
  isSubmitting = false,
  isRequestingHelp = false,
  helpRequested = false,
  errorMessage,
  showSuccess = false,
  cooldownSeconds = 0,
}: SponsoredTaskNotificationProps) {
  const { t } = useTranslation();
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const [inputAnswer, setInputAnswer] = useState("");
  const taskType = notification.type === "quiz"
    ? "question"
    : notification.type === "question" || ((notification.answers && notification.answers.length > 0) || notification.question)
      ? "question"
      : "task";

  const handleSubmitAnswer = useCallback(() => {
    if (isSubmitting) return;
    if (cooldownSeconds > 0) return;
    if (!selectedAnswer && !inputAnswer) return;

    const answerId = selectedAnswer || inputAnswer;

    if (notification.answers) {
      const selectedAnswerObj = notification.answers.find((a) => a.id === selectedAnswer);
      if (selectedAnswerObj?.isCorrect === false) {
        setShowError(true);
        setTimeout(() => setShowError(false), 2000);
        return;
      }
    }

    onComplete(notification.id, answerId);
  }, [selectedAnswer, inputAnswer, notification, onComplete, isSubmitting, cooldownSeconds]);

  const handleCompleteTask = useCallback(() => {
    if (isSubmitting) return;
    if (cooldownSeconds > 0) return;
    onComplete(notification.id);
  }, [notification.id, onComplete, isSubmitting, cooldownSeconds]);

  const handleRequestHelp = useCallback(() => {
    if (!onRequestHelp) return;
    if (isRequestingHelp || helpRequested) return;
    void onRequestHelp(notification.id);
  }, [helpRequested, isRequestingHelp, notification.id, onRequestHelp]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevTouchAction = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouchAction;
    };
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ y: 50 }}
          animate={{ y: 0 }}
          className="relative w-full max-w-md"
        >
          <Card className="relative overflow-hidden border-4 border-yellow-400 shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400" />

            <CardHeader className="text-center pt-8 pb-4">
              <div className="flex justify-center mb-2">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                  <Star className="w-8 h-8 text-white" />
                </div>
              </div>
              <CardTitle className="text-xl font-bold">
                {notification.title}
              </CardTitle>
              {notification.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {notification.description}
                </p>
              )}
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="text-lg font-bold text-yellow-600">
                  +{notification.points}
                </span>
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              </div>

              {showSuccess && (
                <div className="mt-3 rounded-lg bg-green-100 px-3 py-2 text-center text-sm font-bold text-green-700">
                  تم حفظ الإجابة بنجاح
                </div>
              )}
            </CardHeader>

            <CardContent className="space-y-4 pb-6">
              {taskType === "question" && notification.question && (
                <div className="space-y-4">
                  <p className="text-center font-medium text-lg">
                    {notification.question}
                  </p>

                  {notification.answers && notification.answers.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {notification.answers.map((answer) => (
                        <motion.button
                          key={answer.id}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setSelectedAnswer(answer.id)}
                          className={`p-4 rounded-xl border-2 transition-all ${selectedAnswer === answer.id
                            ? "border-primary bg-primary/10"
                            : "border-gray-200 hover:border-gray-300"
                            }`}
                        >
                          {answer.emoji && (
                            <span className="text-3xl mb-2 block">{answer.emoji}</span>
                          )}
                          {answer.imageUrl && (
                            <img
                              src={answer.imageUrl}
                              alt={answer.text}
                              className="w-12 h-12 mx-auto mb-2 object-contain"
                            />
                          )}
                          <span className="text-sm font-medium">
                            {answer.text}
                          </span>
                        </motion.button>
                      ))}
                    </div>
                  ) : (
                    <Input
                      value={inputAnswer}
                      onChange={(e) => setInputAnswer(e.target.value)}
                      placeholder={t("sponsoredTask.writeAnswerHere")}
                      className="text-center"
                      data-testid="input-task-answer"
                    />
                  )}
                </div>
              )}

              {showError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-center gap-2 text-red-500 font-medium"
                >
                  <XCircle className="w-5 h-5" />
                  <span>إجابة خاطئة! حاول مرة أخرى</span>
                </motion.div>
              )}

              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-center gap-2 text-red-600 font-medium text-sm"
                >
                  <XCircle className="w-4 h-4" />
                  <span>{errorMessage}</span>
                </motion.div>
              )}

              {cooldownSeconds > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg bg-orange-100 px-3 py-2 text-center text-sm font-bold text-orange-700"
                >
                  يرجى الانتظار {cooldownSeconds} ثانية قبل المحاولة التالية
                </motion.div>
              )}

              <div className="flex gap-3">
                {taskType === "task" ? (
                  <Button
                    onClick={handleCompleteTask}
                    disabled={isSubmitting || showSuccess || cooldownSeconds > 0}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                    data-testid="button-complete-task"
                  >
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    {isSubmitting ? "جاري التحقق..." : "أكملت المهمة"}
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      onClick={handleRequestHelp}
                      disabled={isRequestingHelp || helpRequested}
                      variant="secondary"
                      className="flex-1 border border-amber-300 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-900 hover:from-amber-200 hover:to-orange-200"
                      data-testid="button-request-help"
                    >
                      {isRequestingHelp
                        ? t("childTasks.sending")
                        : helpRequested
                          ? t("childTasks.helpStatusWaiting")
                          : t("childTasks.requestHelp")}
                    </Button>
                    <Button
                      onClick={handleSubmitAnswer}
                      disabled={isSubmitting || showSuccess || cooldownSeconds > 0 || (!selectedAnswer && !inputAnswer)}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                      data-testid="button-submit-answer"
                    >
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      {isSubmitting ? "جاري الإرسال..." : t("childTasks.submitAnswer")}
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function ChildTaskNotificationManager() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [activeNotification, setActiveNotification] = useState<TaskNotification | null>(null);
  const [notifications, setNotifications] = useState<TaskNotification[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [isRequestingHelpForId, setIsRequestingHelpForId] = useState<string | null>(null);
  const [helpRequestedIds, setHelpRequestedIds] = useState<Set<string>>(new Set());
  const knownNotificationIdsRef = useRef<Set<string>>(new Set());
  const completedNotificationIdsRef = useRef<Set<string>>(new Set());
  const hideSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasPrimedInitialFetchRef = useRef(false);

  const prioritize = useCallback((items: TaskNotification[]) => {
    return [...items].sort((a, b) => {
      const failedDiff = (b.failedAttempts || 0) - (a.failedAttempts || 0);
      if (failedDiff !== 0) return failedDiff;
      return (b.points || 0) - (a.points || 0);
    });
  }, []);

  const mergeNotifications = useCallback((current: TaskNotification[], incoming: TaskNotification[]) => {
    const map = new Map<string, TaskNotification>();
    for (const item of current) map.set(item.id, item);
    for (const item of incoming) map.set(item.id, item);
    return prioritize(Array.from(map.values()));
  }, [prioritize]);

  const triggerTaskAlert = useCallback((item: TaskNotification) => {
    const title = item.title || "مهمة جديدة!";
    const body = item.question || item.description || "لديك مهمة جديدة";

    toast({ title, description: body });
    emitNotificationSync({ source: "manual", title, body, url: "/child-tasks" });

    try {
      const audio = new Audio("/sounds/notification.mp3");
      audio.volume = 0.7;
      void audio.play().catch(() => undefined);
    } catch {
    }

    try {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate?.([110, 50, 110]);
      }
    } catch {
    }

    try {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification(title, {
          body,
          icon: "/icons/icon-192.png",
          tag: `task-popup-${item.id}`,
        });
      }
    } catch {
    }
  }, [toast]);

  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem("childToken");
    if (!token) return;
    try {
      const res = await fetch("/api/child/task-notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) return;
      if (!res.ok) return;

      const json = await res.json();
      const data = json?.data || json || [];
      if (!Array.isArray(data)) return;

      const visibleData = data.filter((item: TaskNotification) => !completedNotificationIdsRef.current.has(item.id));
      const newItems = visibleData.filter((item: TaskNotification) => !knownNotificationIdsRef.current.has(item.id));

      for (const item of visibleData) {
        knownNotificationIdsRef.current.add(item.id);
      }

      setNotifications((prev) => mergeNotifications(prev, visibleData));

      if (newItems.length > 0 && hasPrimedInitialFetchRef.current) {
        const topNewItem = prioritize(newItems)[0];
        if (topNewItem) {
          triggerTaskAlert(topNewItem);
        }
      }

      if (!hasPrimedInitialFetchRef.current) {
        hasPrimedInitialFetchRef.current = true;
      }

      if (!activeNotification && !showSuccess && newItems.length > 0) {
        const top = prioritize(newItems)[0] || null;
        if (top) {
          setActiveNotification(top);
          setSubmitError("");
        }
      }
    } catch (error) {
      console.error("Failed to fetch task notifications:", error);
    }
  }, [mergeNotifications, activeNotification, prioritize, showSuccess, triggerTaskAlert]);

  const handleRequestHelp = useCallback(
    async (notificationId: string) => {
      const token = localStorage.getItem("childToken");
      if (!token) return;
      if (isRequestingHelpForId === notificationId || helpRequestedIds.has(notificationId)) return;

      setIsRequestingHelpForId(notificationId);
      try {
        const res = await fetch("/api/child/request-help", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ taskId: notificationId }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: "تعذر إرسال طلب المساعدة" }));
          throw new Error(err?.message || "تعذر إرسال طلب المساعدة");
        }

        setHelpRequestedIds((prev) => {
          const next = new Set(prev);
          next.add(notificationId);
          return next;
        });

        toast({
          title: t("childTasks.requestHelp"),
          description: t("parentWillReceiveNotification"),
        });
      } catch (error) {
        console.error("Failed to request task help:", error);
        toast({
          title: t("childTasks.requestHelp"),
          description: error instanceof Error ? error.message : "تعذر إرسال طلب المساعدة",
          variant: "destructive",
        });
      } finally {
        setIsRequestingHelpForId((prev) => (prev === notificationId ? null : prev));
      }
    },
    [helpRequestedIds, isRequestingHelpForId, t, toast]
  );

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 12000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        fetchNotifications();
      }
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fetchNotifications]);

  useEffect(() => {
    if (!activeNotification) return;
    const stillExists = notifications.some((n) => n.id === activeNotification.id);
    if (!stillExists) {
      setActiveNotification(null);
    }
  }, [notifications, activeNotification]);

  useEffect(() => {
    return () => {
      if (hideSuccessTimerRef.current) {
        clearTimeout(hideSuccessTimerRef.current);
      }
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (cooldownSeconds <= 0) {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
      return;
    }

    cooldownTimerRef.current = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          if (cooldownTimerRef.current) {
            clearInterval(cooldownTimerRef.current);
            cooldownTimerRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
    };
  }, [cooldownSeconds]);

  const handleComplete = useCallback(
    async (notificationId: string, answerId?: string) => {
      const token = localStorage.getItem("childToken");
      if (!token) return;
      if (isSubmitting) return;

      setIsSubmitting(true);
      setSubmitError("");

      try {
        const res = await fetch("/api/child/task-notifications/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ notificationId, answerId }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: "فشل إرسال الإجابة" }));
          const retryAfterHeader = res.headers.get("Retry-After");
          if (res.status === 429 && retryAfterHeader) {
            const nextCooldown = Math.max(0, parseInt(retryAfterHeader, 10) || 0);
            if (nextCooldown > 0) {
              setCooldownSeconds(nextCooldown);
            }
          }
          throw new Error(err?.message || "فشل إرسال الإجابة");
        }

        completedNotificationIdsRef.current.add(notificationId);
        setShowSuccess(true);
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        setHelpRequestedIds((prev) => {
          if (!prev.has(notificationId)) return prev;
          const next = new Set(prev);
          next.delete(notificationId);
          return next;
        });

        if (hideSuccessTimerRef.current) {
          clearTimeout(hideSuccessTimerRef.current);
        }

        hideSuccessTimerRef.current = setTimeout(async () => {
          setShowSuccess(false);
          setActiveNotification((prev) => (prev?.id === notificationId ? null : prev));
          await fetchNotifications();
        }, 1000);
      } catch (error) {
        console.error("Failed to complete task notification:", error);
        setSubmitError(error instanceof Error ? error.message : "تعذر إكمال المهمة الآن");
      } finally {
        setIsSubmitting(false);
      }
    },
    [fetchNotifications, isSubmitting]
  );

  if (!activeNotification) return null;

  return (
    <SponsoredTaskNotification
      notification={activeNotification}
      onComplete={handleComplete}
      onRequestHelp={handleRequestHelp}
      isSubmitting={isSubmitting}
      isRequestingHelp={isRequestingHelpForId === activeNotification.id}
      helpRequested={helpRequestedIds.has(activeNotification.id)}
      errorMessage={submitError}
      showSuccess={showSuccess}
      cooldownSeconds={cooldownSeconds}
    />
  );
}
