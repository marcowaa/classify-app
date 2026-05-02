import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";
import { ParentNotificationBell } from "@/components/NotificationBell";
import { LanguageSelector } from "@/components/LanguageSelector";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export const Subjects = (): JSX.Element => {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const isRTL = i18n.dir() === "rtl";
  const token = localStorage.getItem("token");
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const { toast } = useToast();
  const [selectedChild, setSelectedChild] = useState("");

  const { data: subjectsRaw } = useQuery({
    queryKey: ["/api/subjects"],
    enabled: !!token,
  });

  const { data: templatesRaw } = useQuery({
    queryKey: [`/api/subjects/${selectedSubject?.id}/templates`],
    enabled: !!selectedSubject && !!token,
  });

  const { data: childrenRaw } = useQuery({
    queryKey: ["/api/parent/children"],
    enabled: !!token,
  });

  const subjects = Array.isArray(subjectsRaw) ? subjectsRaw : [];
  const templates = Array.isArray(templatesRaw) ? templatesRaw : [];
  const children = Array.isArray(childrenRaw) ? childrenRaw : [];

  const { data: walletRaw } = useQuery<any>({
    queryKey: ["/api/parent/wallet"],
    enabled: !!token,
  });

  const walletBalance = Number(walletRaw?.data?.balance ?? walletRaw?.balance ?? 0);

  const pageShellClass = isDark
    ? "bg-gradient-to-b from-slate-950 via-slate-900 to-gray-900"
    : "bg-gradient-to-b from-emerald-50 via-cyan-50 to-gray-50";
  const surfaceClass = isDark
    ? "border border-white/10 bg-slate-900/82 backdrop-blur-xl shadow-[0_20px_34px_-24px_rgba(0,0,0,0.85)]"
    : "border border-white/70 bg-white/92 backdrop-blur-xl shadow-[0_20px_34px_-24px_rgba(15,23,42,0.55)]";
  const raisedControlClass = isDark
    ? "rounded-2xl border border-white/10 bg-slate-800/75 shadow-[0_14px_20px_-16px_rgba(0,0,0,0.85)] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-[1px]"
    : "rounded-2xl border border-white/45 bg-white/20 shadow-[0_14px_20px_-16px_rgba(15,23,42,0.65)] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-[1px]";
  const primaryButtonClass = "bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-500 hover:from-cyan-600 hover:via-blue-600 hover:to-indigo-600 text-white shadow-[0_14px_24px_-14px_rgba(59,130,246,0.95)]";

  const sendTaskMutation = useMutation({
    mutationFn: async ({ templateId, childId }: any) => {
      return apiRequest("POST", "/api/parent/create-task-from-template", { templateId, childId });
    },
    onSuccess: () => {
      toast({ title: t("subjects.taskSent") });
      setSelectedTemplate(null);
      setSelectedChild("");
      queryClient.invalidateQueries({ queryKey: ["/api/parent/wallet"] });
    },
  });

  return (
    <div className={`relative min-h-screen overflow-x-clip px-3 py-4 sm:p-6 ${pageShellClass}`} dir={isRTL ? "rtl" : "ltr"}>
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className={`absolute -top-24 ${isRTL ? "-left-24" : "-right-24"} h-72 w-72 rounded-full ${isDark ? "bg-cyan-500/18" : "bg-cyan-300/40"} blur-3xl`} />
        <div className={`absolute top-1/3 ${isRTL ? "-right-24" : "-left-24"} h-80 w-80 rounded-full ${isDark ? "bg-emerald-500/12" : "bg-emerald-200/55"} blur-3xl`} />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className={`mb-6 rounded-3xl p-4 sm:p-5 ${surfaceClass}`}>
          <div className="flex flex-col gap-4">
            <div>
              <h1 className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${isDark ? "text-white" : "text-gray-800"}`}>
                {t("subjects.title")}
              </h1>
              <p className={`mt-1 text-sm sm:text-base ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                {t("subjects.subtitle")}
              </p>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <LanguageSelector />
              <ParentNotificationBell />
              <button
                onClick={toggleTheme}
                className={`h-11 min-w-11 text-white font-bold ${raisedControlClass} ${primaryButtonClass}`}
              >
                {isDark ? "☀️" : "🌙"}
              </button>
              <button
                onClick={() => window.history.length > 1 ? window.history.back() : navigate("/parent-dashboard")}
                className={`h-11 px-4 font-bold whitespace-nowrap ${raisedControlClass} ${isDark ? "text-gray-200" : "text-gray-700"}`}
              >
                {t("subjects.back")}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Subjects List */}
          <div className={`lg:col-span-1 rounded-2xl p-4 sm:p-6 ${surfaceClass}`}>
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? "text-white" : "text-gray-800"}`}>
              {t("subjects.subjectsLabel")}
            </h2>
            <div className="space-y-2">
              {subjects.map((subject: any) => (
                <button
                  key={subject.id}
                  onClick={() => setSelectedSubject(subject)}
                  className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-all ${selectedSubject?.id === subject.id
                      ? `${primaryButtonClass}`
                      : isDark
                        ? "bg-slate-800 text-white hover:bg-slate-700"
                        : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                    }`}
                >
                  {subject.emoji} {subject.name}
                </button>
              ))}
            </div>
          </div>

          {/* Templates */}
          <div className={`lg:col-span-3 rounded-2xl p-4 sm:p-6 ${surfaceClass}`}>
            {selectedSubject ? (
              <div>
                <h2 className={`text-2xl font-bold mb-4 ${isDark ? "text-white" : "text-gray-800"}`}>
                  {selectedSubject.emoji} {selectedSubject.name} - {t("subjects.readyTasks")}
                </h2>

                {templates.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {templates.map((template: any) => (
                      <div
                        key={template.id}
                        className={`${isDark ? "bg-slate-800/70" : "bg-gray-50"} rounded-2xl p-4 border ${isDark ? "border-slate-700" : "border-gray-200"
                          }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                            {template.title}
                          </h3>
                          <span className={`text-sm px-2 py-1 rounded ${template.difficulty === "easy"
                              ? "bg-green-500"
                              : template.difficulty === "medium"
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            } text-white`}>
                            {template.difficulty}
                          </span>
                        </div>
                        <p className={`text-sm mb-3 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                          {template.question.substring(0, 100)}...
                        </p>
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-yellow-500">⭐ {template.pointsReward}</span>
                          <button
                            onClick={() => setSelectedTemplate(template)}
                            className={`px-3 py-1.5 rounded-lg font-bold text-sm ${primaryButtonClass}`}
                          >
                            {t("subjects.send")}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={isDark ? "text-gray-400" : "text-gray-600"}>
                    {t("subjects.noReadyTasksInSubject")}
                  </p>
                )}
              </div>
            ) : (
              <p className={`text-center py-8 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                {t("subjects.selectSubjectPrompt")}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Send Task Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-[3px] flex items-center justify-center p-4 z-50">
          <div className={`${isDark ? "bg-slate-900 border border-slate-700" : "bg-white border border-white/70"} rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-[0_34px_54px_-30px_rgba(15,23,42,0.9)]`}>
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>{t("subjects.sendTask")}</h2>
            <p className={`${isDark ? "text-gray-400" : "text-gray-600"} mb-6`}>{selectedTemplate.title}</p>

            {/* Select Child */}
            <div className="mb-4">
              <label className={`block text-sm font-bold mb-2 ${isDark ? "text-gray-200" : "text-gray-800"}`}>{t("subjects.chooseChild")}</label>
              <select
                value={selectedChild}
                onChange={(e) => setSelectedChild(e.target.value)}
                className={`w-full px-3 py-2.5 rounded-xl border ${isDark ? "bg-slate-800 border-slate-700 text-gray-100" : "bg-white border-gray-300 text-gray-900"}`}
              >
                <option value="">{t("subjects.selectOption")}</option>
                {children.map((child: any) => (
                  <option key={child.id} value={child.id}>
                    {child.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={`mb-4 p-3 rounded-xl text-sm ${isDark ? "bg-slate-800 text-blue-200" : "bg-blue-50 text-blue-800"}`}>
              {t("subjects.currentBalance", { balance: walletBalance })}
            </div>

            {selectedTemplate.pointsReward > walletBalance && (
              <div className={`mb-4 p-3 rounded-xl border text-sm text-center ${isDark ? "bg-red-900/20 border-red-800 text-red-300" : "bg-red-50 border-red-200 text-red-700"}`}>
                {t("subjects.insufficientBalance", { required: selectedTemplate.pointsReward })}
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => sendTaskMutation.mutate({ templateId: selectedTemplate.id, childId: selectedChild })}
                disabled={!selectedChild || sendTaskMutation.isPending || selectedTemplate.pointsReward > walletBalance}
                className={`flex-1 px-4 py-3.5 font-bold rounded-xl disabled:opacity-50 ${primaryButtonClass}`}
              >
                {sendTaskMutation.isPending ? t("subjects.sending") : t("subjects.send")}
              </button>
              <button
                onClick={() => setSelectedTemplate(null)}
                className={`flex-1 px-4 py-3.5 font-bold rounded-xl ${isDark ? "bg-slate-700 hover:bg-slate-600 text-gray-200" : "bg-gray-200 hover:bg-gray-300 text-gray-800"}`}
              >
                {t("subjects.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
