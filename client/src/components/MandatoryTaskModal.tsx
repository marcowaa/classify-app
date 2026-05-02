import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useTheme } from "@/contexts/ThemeContext";

interface MandatoryTaskModalProps {
  childId: string;
}

function isLikelyAudio(mimeType?: string, url?: string): boolean {
  const mime = String(mimeType || "").toLowerCase();
  if (mime.startsWith("audio/")) return true;
  return /\.(mp3|wav|ogg|m4a|aac|webm)(\?|$)/i.test(String(url || ""));
}

function isLikelyVideo(mimeType?: string, url?: string): boolean {
  const mime = String(mimeType || "").toLowerCase();
  if (mime.startsWith("video/")) return true;
  return /\.(mp4|webm|mov|mkv)(\?|$)/i.test(String(url || ""));
}

export const MandatoryTaskModal = ({
  childId }: MandatoryTaskModalProps): JSX.Element | null => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [helpRequested, setHelpRequested] = useState(false);

  const childToken = localStorage.getItem("childToken");

  const { data: pendingTasks, refetch } = useQuery({
    queryKey: ["child-pending-tasks", childId],
    queryFn: async () => {
      const token = localStorage.getItem("childToken");
      if (!token) return [];
      const res = await fetch("/api/child/pending-tasks", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!childId && !!childToken,
    refetchInterval: childToken ? 30000 : false, // Stop polling when no token
  });

  const answerMutation = useMutation({
    mutationFn: async ({ taskId, selectedAnswerId }: { taskId: string; selectedAnswerId: string }) => {
      const token = localStorage.getItem("childToken");
      const res = await fetch("/api/child/answer-task", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ taskId, selectedAnswerId }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to answer" }));
        throw new Error(error.message || "Failed to answer");
      }
      return res.json();
    },
    onSuccess: (data) => {
      const payload = (data as any)?.data ?? data;
      setIsCorrect(payload.isCorrect);
      setShowResult(true);
      setTimeout(() => {
        setShowResult(false);
        setSelectedAnswer(null);
        setIsVisible(false);
        refetch();
        queryClient.invalidateQueries({ queryKey: ["child-info"] });
        queryClient.invalidateQueries({ queryKey: ["child-tasks"] });
      }, 2500);
    },
    onError: (error: any) => {
      console.error("Task answer error:", error);
      setShowResult(false);
      setSelectedAnswer(null);
    },
  });

  const requestHelpMutation = useMutation({
    mutationFn: async ({ taskId }: { taskId: string }) => {
      const token = localStorage.getItem("childToken");
      const res = await fetch("/api/child/request-help", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ taskId }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to request help" }));
        throw new Error(error.message || "Failed to request help");
      }
      return res.json();
    },
    onSuccess: () => {
      setHelpRequested(true);
      queryClient.invalidateQueries({ queryKey: ["/api/child/help-requests"] });
    },
    onError: (error: any) => {
      console.error("Request help error:", error);
    },
  });

  const currentTask = pendingTasks?.[0];

  const renderMediaPreview = ({
    url,
    mimeType,
    maxHeightClass,
  }: {
    url?: string;
    mimeType?: string;
    maxHeightClass: string;
  }) => {
    const resolvedUrl = String(url || "").trim();
    if (!resolvedUrl) return null;

    if (isLikelyAudio(mimeType, resolvedUrl)) {
      return (
        <audio
          controls
          preload="metadata"
          src={resolvedUrl}
          className="w-full"
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        />
      );
    }

    if (isLikelyVideo(mimeType, resolvedUrl)) {
      return (
        <video
          controls
          preload="metadata"
          src={resolvedUrl}
          className={`w-full ${maxHeightClass} rounded-lg object-contain bg-black/70`}
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        />
      );
    }

    return (
      <img
        src={resolvedUrl}
        alt="task-media"
        className={`w-full ${maxHeightClass} rounded-lg object-contain bg-black/5`}
      />
    );
  };

  useEffect(() => {
    if (currentTask && !showResult) {
      setIsVisible(true);
      setHelpRequested(false);
    }
  }, [currentTask, showResult]);

  const handleAnswer = () => {
    if (!selectedAnswer || !currentTask) return;
    answerMutation.mutate({ taskId: currentTask.id, selectedAnswerId: selectedAnswer });
  };

  if (!currentTask || !isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <div
        className={`relative w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 ${isDark ? "bg-gray-800" : "bg-white"
          }`}
      >
        {showResult ? (
          <div className={`p-8 text-center ${isCorrect ? "bg-green-500" : "bg-red-500"}`}>
            <div className="text-6xl mb-4">{isCorrect ? "🎉" : "😢"}</div>
            <h2 className="text-3xl font-bold text-white mb-2">
              {isCorrect ? t("mandatoryTask.wellDone") : t("mandatoryTask.tryAgain")}
            </h2>
            <p className="text-white text-lg">
              {isCorrect
                ? `حصلت على ${currentTask.pointsReward} نقطة!`
                : "الإجابة غير صحيحة"}
            </p>
          </div>
        ) : (
          <>
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-4xl animate-bounce">📝</span>
                  <div>
                    <h2 className="text-2xl font-bold">مهمة جديدة!</h2>
                    <p className="text-purple-200">أجب للحصول على النقاط</p>
                  </div>
                </div>
                <div className="bg-yellow-400 text-yellow-900 px-4 py-2 rounded-full font-bold">
                  ⭐ {currentTask.pointsReward}
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className={`p-4 rounded-xl mb-6 ${isDark ? "bg-gray-700" : "bg-blue-50"}`}>
                {String(currentTask.question || "").trim() && (
                  <p className={`text-lg font-medium ${isDark ? "text-white" : "text-gray-800"}`}>
                    {currentTask.question}
                  </p>
                )}
                {(currentTask.imageUrl || currentTask.gifUrl) && (
                  <div className={String(currentTask.question || "").trim() ? "mt-3" : ""}>
                    {renderMediaPreview({
                      url: String(currentTask.imageUrl || currentTask.gifUrl || ""),
                      maxHeightClass: "max-h-64",
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {currentTask.answers?.map((answer: any, index: number) => (
                  <div
                    key={answer.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedAnswer(answer.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedAnswer(answer.id);
                      }
                    }}
                    className={`w-full p-4 rounded-xl text-right font-medium transition-all ${selectedAnswer === answer.id
                        ? "bg-purple-600 text-white scale-[1.02] shadow-lg"
                        : isDark
                          ? "bg-gray-700 text-white hover:bg-gray-600"
                          : "bg-gray-100 hover:bg-gray-200"
                      }`}
                    data-testid={`answer-option-${index}`}
                  >
                    <span className="inline-block w-8 h-8 rounded-full bg-current/20 mr-3 text-center leading-8">
                      {String.fromCharCode(1571 + index)}
                    </span>
                    {String(answer.text || "").trim()}
                    {(answer.media?.url || answer.imageUrl) && (
                      <div className="mt-3">
                        {renderMediaPreview({
                          url: String(answer.media?.url || answer.imageUrl || ""),
                          mimeType: String(answer.media?.mimeType || ""),
                          maxHeightClass: "max-h-40",
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => currentTask?.id && requestHelpMutation.mutate({ taskId: currentTask.id })}
                  disabled={requestHelpMutation.isPending || helpRequested}
                  className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="button-request-help"
                >
                  {requestHelpMutation.isPending ? "جاري فتح المساعدة..." : helpRequested ? "تم فتح طلب المساعدة" : "طلب مساعدة"}
                </button>
                <button
                  onClick={handleAnswer}
                  disabled={!selectedAnswer || answerMutation.isPending}
                  className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="button-submit-answer"
                >
                  {answerMutation.isPending ? "جاري الإرسال..." : "تأكيد الإجابة ✓"}
                </button>
              </div>

              <p className={`text-center mt-4 text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                ستظهر هذه المهمة مرة أخرى إذا لم تقم بحلها
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
