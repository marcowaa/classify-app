import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { LanguageSelector } from "@/components/LanguageSelector";
import { TaskForm, type TaskFormValue } from "@/components/forms/TaskForm";

export const AssignTask = (): JSX.Element => {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const token = localStorage.getItem("token");
  const isRTL = i18n.language === 'ar';

  const [selectedChild, setSelectedChild] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [createCustom, setCreateCustom] = useState(false);
  const [customTaskKey, setCustomTaskKey] = useState(0);

  const buildCustomTaskInitial = (): TaskFormValue => ({
    title: "",
    question: "",
    answers: [
      { id: "1", text: "", isCorrect: true },
      { id: "2", text: "", isCorrect: false },
      { id: "3", text: "", isCorrect: false },
    ],
    pointsReward: 10,
    difficulty: "medium",
    subjectId: selectedSubject || "",
    isPublic: false,
    pointsCost: 0,
    taskMedia: null,
  });

  const { data: childrenRaw } = useQuery({
    queryKey: ["/api/parent/children"],
    enabled: !!token,
  });

  const { data: subjectsRaw } = useQuery({
    queryKey: ["/api/subjects"],
    enabled: !!token,
  });

  const { data: templatesRaw } = useQuery({
    queryKey: [`/api/subjects/${selectedSubject}/templates`],
    enabled: !!selectedSubject && !!token,
  });

  const { data: walletRaw } = useQuery<any>({
    queryKey: ["/api/parent/wallet"],
    enabled: !!token,
  });

  const children = Array.isArray(childrenRaw) ? childrenRaw : [];
  const subjects = Array.isArray(subjectsRaw) ? subjectsRaw : [];
  const templates = Array.isArray(templatesRaw) ? templatesRaw : [];
  const walletBalance = Number(walletRaw?.data?.balance ?? walletRaw?.balance ?? 0);

  const assignMutation = useMutation({
    mutationFn: async () => {
      const template = templates.find((t: any) => t.id === selectedTemplate);
      if (!template) throw new Error("Template not found");
      return apiRequest("POST", "/api/parent/create-task-from-template", {
        childId: selectedChild,
        templateId: selectedTemplate,
        pointsReward: template.pointsReward,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parent/children"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/wallet"] });
      navigate("/parent-dashboard");
    },
  });

  const createCustomMutation = useMutation({
    mutationFn: async (form: TaskFormValue) => {
      return apiRequest("POST", "/api/parent/create-and-send-task", {
        title: form.title,
        question: form.question,
        answers: form.answers,
        pointsReward: form.pointsReward,
        subjectId: selectedSubject || form.subjectId || undefined,
        difficulty: form.difficulty || "medium",
        childId: selectedChild,
        saveAsTemplate: false,
        taskMedia: form.taskMedia || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parent/children"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/wallet"] });
      setCustomTaskKey((v) => v + 1);
      navigate("/parent-dashboard");
    },
  });

  const selectedTemplateData = templates.find((t: any) => t.id === selectedTemplate);
  const taskReward = selectedTemplateData?.pointsReward || 0;
  const insufficientBalance = taskReward > 0 && walletBalance < taskReward;
  const canSubmit =
    !!selectedChild &&
    (!!selectedSubject || !subjects.length) &&
    !createCustom &&
    !!selectedTemplate &&
    !assignMutation.isPending &&
    !insufficientBalance;

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-gradient-to-b from-blue-50 to-purple-50"}`} dir={isRTL ? "rtl" : "ltr"}>
      <div className="max-w-4xl mx-auto p-6 pb-44 md:pb-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className={`text-3xl font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
            📝 {t("assignTask.title")}
          </h1>
          <div className="flex gap-2">
            <LanguageSelector />
            <button
              onClick={toggleTheme}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg font-bold"
              data-testid="button-theme-toggle"
            >
              {isDark ? "☀️" : "🌙"}
            </button>
            <button
              onClick={() => window.history.length > 1 ? window.history.back() : navigate("/parent-dashboard")}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg font-bold"
              data-testid="button-back"
            >
              ← {t("assignTask.back")}
            </button>
          </div>
        </div>

        <div className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-2xl shadow-lg p-8`}>
          {/* Wallet Balance */}
          <div className={`flex items-center gap-2 mb-6 p-3 rounded-xl ${isDark ? "bg-gray-700" : "bg-blue-50"}`}>
            <span className="text-xl">💰</span>
            <span className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>{t("assignTask.balance")} {walletBalance}</span>
          </div>

          <div className="space-y-6">
            <div>
              <label className={`block text-lg font-bold mb-3 ${isDark ? "text-white" : "text-gray-800"}`}>
                👶 {t("assignTask.selectChild")}
              </label>
              <select
                value={selectedChild}
                onChange={(e) => setSelectedChild(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border-2 text-lg ${isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"
                  }`}
                data-testid="select-child"
              >
                <option value="">{t("assignTask.selectChildPlaceholder")}</option>
                {children.map((child: any) => (
                  <option key={child.id} value={child.id}>
                    {child.name} - ⭐ {child.points} {t("assignTask.childPoints")}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block text-lg font-bold mb-3 ${isDark ? "text-white" : "text-gray-800"}`}>
                📚 {t("assignTask.selectSubject")}
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => {
                  setSelectedSubject(e.target.value);
                  setSelectedTemplate("");
                }}
                className={`w-full px-4 py-3 rounded-xl border-2 text-lg ${isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"
                  }`}
                data-testid="select-subject"
              >
                <option value="">{t("assignTask.selectSubject")}</option>
                {subjects.map((subject: any) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.emoji} {subject.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedSubject && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setCreateCustom(false)}
                    className={`flex-1 p-4 rounded-xl border-2 font-bold ${!createCustom
                        ? "border-green-500 bg-green-500 text-white"
                        : isDark
                          ? "border-gray-600 bg-gray-700 text-white"
                          : "border-gray-300"
                      }`}
                    data-testid="button-use-template"
                  >
                    📋 {t("assignTask.useTemplate")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateCustom(true)}
                    className={`flex-1 p-4 rounded-xl border-2 font-bold ${createCustom
                        ? "border-purple-500 bg-purple-500 text-white"
                        : isDark
                          ? "border-gray-600 bg-gray-700 text-white"
                          : "border-gray-300"
                      }`}
                    data-testid="button-create-custom"
                  >
                    ✏️ {t("assignTask.createCustom")}
                  </button>
                </div>

                {!createCustom && (
                  <div>
                    <label className={`block text-lg font-bold mb-3 ${isDark ? "text-white" : "text-gray-800"}`}>
                      📝 {t("assignTask.selectTask")}
                    </label>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {templates.length === 0 && (
                        <p className={`text-center py-8 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                          {t("assignTask.noTemplates")}
                        </p>
                      )}
                      {templates.map((template: any) => (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => setSelectedTemplate(template.id)}
                          className={`w-full p-4 rounded-xl border-2 text-right transition-all ${selectedTemplate === template.id
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                              : isDark
                                ? "border-gray-600 bg-gray-700 hover:border-blue-400"
                                : "border-gray-300 bg-white hover:border-blue-400"
                            }`}
                          data-testid={`button-template-${template.id}`}
                        >
                          <div className="flex justify-between items-start">
                            <span className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                              {template.title}
                            </span>
                            <span className="text-yellow-500 font-bold">⭐ {template.pointsReward}</span>
                          </div>
                          <p className={`mt-2 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                            {template.question.substring(0, 100)}...
                          </p>
                          <span className={`inline-block mt-2 px-2 py-1 rounded text-xs ${template.difficulty === "easy" ? "bg-green-100 text-green-800" :
                              template.difficulty === "medium" ? "bg-yellow-100 text-yellow-800" :
                                "bg-red-100 text-red-800"
                            }`}>
                            {template.difficulty === "easy" ? t("assignTask.easy") :
                              template.difficulty === "medium" ? t("assignTask.medium") : t("assignTask.hard")}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {createCustom && (
                  <div className={`rounded-xl border ${isDark ? "border-gray-700" : "border-gray-200"} p-3`}>
                    <TaskForm
                      key={`assign-task-custom-${customTaskKey}-${selectedSubject}`}
                      mode="parent"
                      initialValue={buildCustomTaskInitial()}
                      showSubject={false}
                      allowDifficulty={true}
                      allowPublic={false}
                      allowTaskMedia={true}
                      enableDraftPersistence
                      draftStorageKey={`assign-task-custom:${selectedChild || "none"}:${selectedSubject || "none"}`}
                      submitLabel={t("assignTask.sendTask")}
                      submitting={createCustomMutation.isPending}
                      submitDisabled={!selectedChild || !selectedSubject}
                      submitHelperText={!selectedChild ? t("assignTask.selectChildPlaceholder") : (!selectedSubject ? t("assignTask.selectSubject") : "")}
                      onSubmit={async (form) => {
                        await createCustomMutation.mutateAsync(form);
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {selectedTemplateData && !createCustom && (
              <div className={`p-4 rounded-xl ${isDark ? "bg-gray-700" : "bg-blue-50"}`}>
                <h3 className={`font-bold mb-2 ${isDark ? "text-white" : "text-gray-800"}`}>
                  {t("assignTask.taskPreview")}
                </h3>
                <p className={isDark ? "text-gray-300" : "text-gray-700"}>{selectedTemplateData.question}</p>
                <div className="mt-3 space-y-1">
                  {selectedTemplateData.answers.map((ans: any, i: number) => (
                    <div
                      key={i}
                      className={`px-3 py-2 rounded ${ans.isCorrect
                          ? "bg-green-100 text-green-800"
                          : isDark ? "bg-gray-600 text-gray-300" : "bg-gray-100"
                        }`}
                    >
                      {ans.isCorrect && "✓ "}{ans.text}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!createCustom && insufficientBalance && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm text-center">
                {t("assignTask.insufficientBalanceDetail", { balance: walletBalance, required: taskReward })}
              </div>
            )}

            {!createCustom && (
              <button
                onClick={() => assignMutation.mutate()}
                disabled={!canSubmit}
                className="hidden md:block w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-green-600 hover:to-emerald-700 transition-all"
                data-testid="button-assign-task-desktop"
              >
                {assignMutation.isPending ? t("assignTask.sending") : `📤 ${t("assignTask.sendTask")}`}
              </button>
            )}
          </div>
        </div>
      </div>

      {!createCustom && (
        <div className="fixed md:hidden inset-x-0 bottom-0 z-40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 bg-gradient-to-t from-gray-900/15 to-transparent pointer-events-none">
          <div className={`pointer-events-auto max-w-4xl mx-auto rounded-2xl shadow-2xl p-3 ${isDark ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"}`}>
            {insufficientBalance && (
              <div className="mb-2 p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs text-center">
                {t("assignTask.insufficientBalanceDetail", { balance: walletBalance, required: taskReward })}
              </div>
            )}
            <button
              onClick={() => assignMutation.mutate()}
              disabled={!canSubmit}
              className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-green-600 hover:to-emerald-700 transition-all"
              data-testid="button-assign-task"
            >
              {assignMutation.isPending ? t("assignTask.sending") : `📤 ${t("assignTask.sendTask")}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
