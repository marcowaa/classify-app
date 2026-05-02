import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { TaskForm, type TaskFormValue } from "@/components/forms/TaskForm";
import { COVERAGE_STYLE_MAP, computeCoveragePercent, computeCoverageTone, computeTargetPreview } from "@/lib/coverage";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  ClipboardList,
  Plus,
  Trash2,
  Save,
  Search,
  ToggleLeft,
  ToggleRight,
  Settings2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
} from "lucide-react";

interface TemplateTask {
  id: string;
  subjectId: string;
  title: string;
  question: string;
  answers: { id: string; text: string; isCorrect: boolean }[];
  pointsReward: number;
  difficulty: string;
  isActive: boolean;
  isPublic: boolean;
  pointsCost: number;
  usageCount: number;
}

interface Subject {
  id: string;
  name: string;
  nameAr?: string;
  emoji?: string | null;
}

interface AdminChild {
  id: string;
  name: string;
  parents?: { parentId: string; parentName: string }[];
}

interface TasksSettings {
  id: string;
  maxTasksPerDay: number;
  allowCustomTasks: boolean;
  updatedAt: string;
}

interface ParentQuickTaskItem {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  verificationKey: string;
  rewardPoints: number;
  sortOrder: number;
  isActive: boolean;
  completionCount: number;
}

interface ParentQuickTaskOption {
  code: string;
  title: string;
  description: string;
  verificationKey: string;
  defaultRewardPoints: number;
}

const NO_CHILD_VALUE = "__none__";
const ALL_CHILDREN_VALUE = "__all__";

const hasLinkedParent = (child: AdminChild) => Array.isArray(child.parents) && child.parents.length > 0;

export function TasksTab({ token }: { token: string }) {
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const isRTL = i18n.language === "ar";

  const [searchTerm, setSearchTerm] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ maxTasksPerDay: 10, allowCustomTasks: true });
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedChildForCreate, setSelectedChildForCreate] = useState<string>(NO_CHILD_VALUE);
  const [saveAsTemplate, setSaveAsTemplate] = useState(true);
  const [createFormKey, setCreateFormKey] = useState(0);
  const [selectedQuickOptionCode, setSelectedQuickOptionCode] = useState<string>("");
  const [quickRewardPoints, setQuickRewardPoints] = useState<number>(20);
  const [quickTitle, setQuickTitle] = useState<string>("");
  const [quickDescription, setQuickDescription] = useState<string>("");
  const [quickDraftVerificationKey, setQuickDraftVerificationKey] = useState<string>("");
  const [editingQuickTaskId, setEditingQuickTaskId] = useState<string | null>(null);

  const DIFFICULTIES = useMemo(
    () => [
      { value: "easy", labelAr: t("admin.tasksTab.easy"), labelEn: "Easy", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
      { value: "medium", labelAr: t("admin.tasksTab.medium"), labelEn: "Medium", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" },
      { value: "hard", labelAr: t("admin.tasksTab.hard"), labelEn: "Hard", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
    ],
    [t]
  );

  const buildDefaultForm = (): TaskFormValue => ({
    title: "",
    question: "",
    answers: [
      { id: "1", text: "", isCorrect: true },
      { id: "2", text: "", isCorrect: false },
      { id: "3", text: "", isCorrect: false },
    ],
    pointsReward: 10,
    difficulty: "medium",
    subjectId: filterSubject || "",
    isPublic: false,
    pointsCost: 5,
    taskMedia: null,
  });

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const { data: tasks = [], isLoading } = useQuery<TemplateTask[]>({
    queryKey: ["admin-template-tasks"],
    queryFn: async () => {
      const res = await fetch("/api/admin/template-tasks", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return json?.data || [];
    },
    enabled: !!token,
  });

  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ["admin-subjects"],
    queryFn: async () => {
      const res = await fetch("/api/admin/subjects", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return json?.data || [];
    },
    enabled: !!token,
  });

  const { data: children = [] } = useQuery<AdminChild[]>({
    queryKey: ["admin-children"],
    queryFn: async () => {
      const res = await fetch("/api/admin/children", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return json?.data || [];
    },
    enabled: !!token,
  });

  useQuery<TasksSettings>({
    queryKey: ["admin-tasks-settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/tasks-settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json?.data) {
        setSettingsForm({
          maxTasksPerDay: json.data.maxTasksPerDay,
          allowCustomTasks: json.data.allowCustomTasks,
        });
      }
      return json?.data || null;
    },
    enabled: !!token,
  });

  const { data: parentQuickPayload, isLoading: isQuickTasksLoading } = useQuery<{
    tasks: ParentQuickTaskItem[];
    options: ParentQuickTaskOption[];
    stats?: {
      totalTasks: number;
      totalCompletions: number;
      averageAwardedPoints: number;
      topCompletedTasks: Array<{
        id: string;
        title: string;
        completionCount: number;
        rewardPoints: number;
        averageAwardedPoints: number;
      }>;
    };
  }>({
    queryKey: ["admin-parent-quick-tasks"],
    queryFn: async () => {
      const res = await fetch("/api/admin/parent-quick-tasks", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return {
        tasks: json?.data?.tasks || [],
        options: json?.data?.options || [],
        stats: json?.data?.stats,
      };
    },
    enabled: !!token,
  });

  const quickTasks = parentQuickPayload?.tasks || [];
  const quickTaskOptions = parentQuickPayload?.options || [];

  const createQuickTaskMutation = useMutation({
    mutationFn: async (payload: {
      code: string;
      title: string;
      description: string;
      verificationKey: string;
      rewardPoints: number;
    }) => {
      const res = await fetch("/api/admin/parent-quick-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || "Failed to create parent quick task");
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-parent-quick-tasks"] });
      setSelectedQuickOptionCode("");
      setQuickTitle("");
      setQuickDescription("");
      setQuickDraftVerificationKey("");
      setQuickRewardPoints(20);
      showToast("success", t("admin.tasksTab.quickStart.addSuccess"));
    },
    onError: (error: Error) => showToast("error", error.message),
  });

  const updateQuickTaskMutation = useMutation({
    mutationFn: async (payload: { id: string; rewardPoints?: number; isActive?: boolean }) => {
      const res = await fetch(`/api/admin/parent-quick-tasks/${payload.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || "Failed to update parent quick task");
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-parent-quick-tasks"] });
      setEditingQuickTaskId(null);
      showToast("success", t("admin.tasksTab.quickStart.updateSuccess"));
    },
    onError: (error: Error) => showToast("error", error.message),
  });

  const deleteQuickTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await fetch(`/api/admin/parent-quick-tasks/${taskId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || "Failed to delete parent quick task");
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-parent-quick-tasks"] });
      showToast("success", t("admin.tasksTab.quickStart.deleteSuccess"));
    },
    onError: (error: Error) => showToast("error", error.message),
  });

  const createAndSendMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/admin/create-and-send-task", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || "Failed to create task");
      }
      return json;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin-template-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["admin-children"] });
      setShowCreateDialog(false);
      setSelectedChildForCreate(NO_CHILD_VALUE);
      setSaveAsTemplate(true);
      setCreateFormKey((k) => k + 1);

      const createdCount = result?.data?.createdTasksCount ?? 0;
      const hasTemplate = !!result?.data?.templateTaskId;
      const skippedCount = result?.data?.skippedChildren ?? 0;

      const withSkipped = (base: string) =>
        skippedCount > 0
          ? `${base} ${t("admin.tasksTab.skippedChildrenNote", { count: skippedCount })}`
          : base;

      if (createdCount > 0 && hasTemplate) {
        showToast("success", withSkipped(t("admin.tasksTab.createSuccessAssignedAndTemplate", { count: createdCount })));
      } else if (createdCount > 0) {
        showToast("success", withSkipped(t("admin.tasksTab.createSuccessAssigned", { count: createdCount })));
      } else if (hasTemplate) {
        showToast("success", t("admin.tasksTab.createSuccessTemplateOnly"));
      } else {
        showToast("success", t("admin.tasksTab.taskCreated"));
      }
    },
    onError: (error: Error) => showToast("error", error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/template-tasks/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-template-tasks"] });
      showToast("success", t("admin.tasksTab.taskDeleted"));
    },
    onError: (e: Error) => showToast("error", e.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/admin/template-tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error("Failed to toggle");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-template-tasks"] }),
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: { maxTasksPerDay: number; allowCustomTasks: boolean }) => {
      const res = await fetch("/api/admin/tasks-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tasks-settings"] });
      showToast("success", t("admin.tasksTab.settingsSaved"));
    },
    onError: (e: Error) => showToast("error", e.message),
  });

  const handleCreateTaskSubmit = async (form: TaskFormValue) => {
    const target = selectedChildForCreate;
    const isTemplateOnly = target === NO_CHILD_VALUE;
    const isAllChildren = target === ALL_CHILDREN_VALUE;

    if (isTemplateOnly && !form.subjectId) {
      showToast("error", t("admin.tasksTab.templateNeedsSubject"));
      return;
    }

    if (!form.question || form.answers.filter((a) => a.text.trim()).length < 2) {
      showToast("error", t("admin.tasksTab.fillRequired"));
      return;
    }

    await createAndSendMutation.mutateAsync({
      title: form.title,
      question: form.question,
      answers: form.answers.map((a) => ({
        id: a.id,
        text: a.text,
        isCorrect: a.isCorrect,
        imageUrl: a.imageUrl,
      })),
      pointsReward: form.pointsReward,
      subjectId: form.subjectId || null,
      childId: !isTemplateOnly && !isAllChildren ? target : null,
      allChildren: isAllChildren,
      saveAsTemplate: isTemplateOnly ? true : saveAsTemplate,
      taskMedia: form.taskMedia,
    });
  };

  const getSubjectName = (id: string) => {
    const s = subjects.find((sub) => sub.id === id);
    return s ? (isRTL ? s.nameAr || s.name : s.name) : "-";
  };

  const getDifficultyBadge = (d: string) => DIFFICULTIES.find((x) => x.value === d) || DIFFICULTIES[1];

  const filtered = tasks.filter((task) => {
    const matchSearch =
      !searchTerm ||
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.question.toLowerCase().includes(searchTerm.toLowerCase());
    const matchSubject = !filterSubject || task.subjectId === filterSubject;
    const matchDiff = !filterDifficulty || task.difficulty === filterDifficulty;
    return matchSearch && matchSubject && matchDiff;
  });

  const totalTasks = tasks.length;
  const activeTasks = tasks.filter((task) => task.isActive).length;
  const easyCount = tasks.filter((task) => task.difficulty === "easy").length;
  const mediumCount = tasks.filter((task) => task.difficulty === "medium").length;
  const hardCount = tasks.filter((task) => task.difficulty === "hard").length;

  const targetModeText =
    selectedChildForCreate === NO_CHILD_VALUE
      ? t("admin.tasksTab.noChildTemplateOnly")
      : selectedChildForCreate === ALL_CHILDREN_VALUE
        ? t("admin.tasksTab.allChildren")
        : t("admin.tasksTab.singleChild");

  const eligibleChildrenCount = useMemo(
    () => children.filter(hasLinkedParent).length,
    [children]
  );

  useEffect(() => {
    if (selectedChildForCreate === ALL_CHILDREN_VALUE && eligibleChildrenCount === 0) {
      setSelectedChildForCreate(NO_CHILD_VALUE);
    }
  }, [eligibleChildrenCount, selectedChildForCreate]);

  const targetPreview = useMemo(() => {
    return computeTargetPreview({
      selectedTarget: selectedChildForCreate,
      noChildValue: NO_CHILD_VALUE,
      allChildrenValue: ALL_CHILDREN_VALUE,
      children,
      isEligible: hasLinkedParent,
    });
  }, [children, selectedChildForCreate]);

  const disableCreateForNoEligibleAll =
    selectedChildForCreate === ALL_CHILDREN_VALUE && targetPreview.eligible === 0;

  const expectedCoveragePercent = computeCoveragePercent(targetPreview);

  const coverageStatusLabel =
    targetPreview.targeted === 0
      ? t("admin.tasksTab.coverageNoTarget")
      : expectedCoveragePercent >= 100
        ? t("admin.tasksTab.coverageExcellent")
        : expectedCoveragePercent >= 50
          ? t("admin.tasksTab.coverageMedium")
          : t("admin.tasksTab.coverageLow");

  const coverageTone = computeCoverageTone(targetPreview, expectedCoveragePercent);

  const handleSelectQuickOption = (code: string) => {
    setSelectedQuickOptionCode(code);
    const option = quickTaskOptions.find((item) => item.code === code);
    if (!option) {
      return;
    }
    setQuickTitle(option.title);
    setQuickDescription(option.description || "");
    setQuickRewardPoints(option.defaultRewardPoints || 10);
    setQuickDraftVerificationKey(option.verificationKey);
  };

  const handleCreateQuickTask = async () => {
    if (!quickTitle.trim()) {
      showToast("error", t("admin.tasksTab.quickStart.selectTaskFirst"));
      return;
    }

    if (!quickDraftVerificationKey.trim()) {
      showToast("error", t("admin.tasksTab.quickStart.invalidVerificationKey"));
      return;
    }

    const fallbackCode = `custom-${Date.now()}`;
    const rawCode = selectedQuickOptionCode || quickTitle;
    const sanitizedCode = rawCode
      .toLowerCase()
      .replace(/[^a-z0-9\-]/g, "-")
      .replace(/-{2,}/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);

    await createQuickTaskMutation.mutateAsync({
      code: sanitizedCode || fallbackCode,
      title: quickTitle.trim(),
      description: quickDescription.trim(),
      verificationKey: quickDraftVerificationKey,
      rewardPoints: Math.max(1, Math.trunc(Number(quickRewardPoints) || 10)),
    });
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 text-white transition-all ${
          toast.type === "success" ? "bg-green-600" : "bg-red-600"
        }`}>
          {toast.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${isDark ? "bg-purple-500/20" : "bg-purple-100"}`}>
            <ClipboardList className={`h-6 w-6 ${isDark ? "text-purple-400" : "text-purple-600"}`} />
          </div>
          <div>
            <h2 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
              {t("admin.tasksTab.title")}
            </h2>
            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              {t("admin.tasksTab.subtitle")}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-colors ${
              isDark ? "bg-gray-700 hover:bg-gray-600 text-gray-200" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            }`}
          >
            <Settings2 size={18} />
            {t("admin.tasksTab.settings")}
          </button>

          <Dialog
            open={showCreateDialog}
            onOpenChange={(open) => {
              setShowCreateDialog(open);
              if (!open) {
                setSelectedChildForCreate(NO_CHILD_VALUE);
                setSaveAsTemplate(true);
              }
            }}
          >
            <DialogTrigger asChild>
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium transition-colors">
                <Plus size={18} />
                {t("admin.tasksTab.addTask")}
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t("admin.tasksTab.createDialogTitle")}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mb-4 p-4 rounded-lg bg-muted/50">
                <div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium">{t("admin.tasksTab.sendDirectlyToChild")}</Label>
                    {eligibleChildrenCount === 0 && (
                      <TooltipProvider delayDuration={150}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" aria-label={t("admin.tasksTab.tooltipAllChildrenDisabled")}>
                              <Info className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs text-xs">
                            {t("admin.tasksTab.tooltipAllChildrenDisabled")}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{t("admin.tasksTab.selectChildOrLeaveEmpty")}</p>
                  <Select value={selectedChildForCreate} onValueChange={setSelectedChildForCreate}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_CHILD_VALUE}>{t("admin.tasksTab.noChildTemplateOnly")}</SelectItem>
                      <SelectItem value={ALL_CHILDREN_VALUE} disabled={eligibleChildrenCount === 0}>
                        {t("admin.tasksTab.allChildren")}
                      </SelectItem>
                      {children.map((child) => (
                        <SelectItem key={child.id} value={child.id}>
                          {child.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedChildForCreate !== NO_CHILD_VALUE && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-background">
                    <div>
                      <Label className="text-sm">{t("admin.tasksTab.saveAsTemplate")}</Label>
                      <p className="text-xs text-muted-foreground">{t("admin.tasksTab.saveAsTemplateDesc")}</p>
                    </div>
                    <Switch checked={saveAsTemplate} onCheckedChange={setSaveAsTemplate} />
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  {t("admin.tasksTab.currentMode")}: <span className="font-medium">{targetModeText}</span>
                </p>

                {eligibleChildrenCount === 0 && (
                  <div className="rounded-lg border border-amber-300/70 bg-amber-50 dark:bg-amber-950/30 p-2 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <p className="text-xs text-amber-800 dark:text-amber-200">{t("admin.tasksTab.allChildrenDisabledNoEligible")}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="rounded-lg border p-2 bg-background">
                    <p className="text-[11px] text-muted-foreground">{t("admin.tasksTab.previewTargeted")}</p>
                    <p className="text-sm font-semibold">{targetPreview.targeted}</p>
                  </div>
                  <div className="rounded-lg border p-2 bg-background">
                    <p className="text-[11px] text-muted-foreground">{t("admin.tasksTab.previewEligible")}</p>
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{targetPreview.eligible}</p>
                  </div>
                  <div className="rounded-lg border p-2 bg-background">
                    <p className="text-[11px] text-muted-foreground">{t("admin.tasksTab.previewSkipped")}</p>
                    <p className={`text-sm font-semibold ${targetPreview.skipped > 0 ? "text-amber-600 dark:text-amber-400" : ""}`}>
                      {targetPreview.skipped}
                    </p>
                  </div>
                  <div className="rounded-lg border p-2 bg-background">
                    <p className="text-[11px] text-muted-foreground">{t("admin.tasksTab.previewCoverage")}</p>
                    <p className={`text-sm font-semibold ${expectedCoveragePercent < 100 && targetPreview.targeted > 0 ? "text-blue-700 dark:text-blue-300" : ""}`}>
                      {expectedCoveragePercent}%
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border p-2 bg-background space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <span>{t("admin.tasksTab.previewCoverage")}</span>
                      <TooltipProvider delayDuration={150}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              aria-label={t("admin.tasksTab.coverageStatusHint", {
                                targeted: targetPreview.targeted,
                                eligible: targetPreview.eligible,
                                skipped: targetPreview.skipped,
                              })}
                            >
                              <Info className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs text-xs">
                            {t("admin.tasksTab.coverageStatusHint", {
                              targeted: targetPreview.targeted,
                              eligible: targetPreview.eligible,
                              skipped: targetPreview.skipped,
                            })}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <span className="font-medium">{expectedCoveragePercent}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${COVERAGE_STYLE_MAP[coverageTone].bar}`}
                      style={{ width: `${expectedCoveragePercent}%` }}
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={expectedCoveragePercent}
                      aria-label={t("admin.tasksTab.previewCoverage")}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] text-muted-foreground">{coverageStatusLabel}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${COVERAGE_STYLE_MAP[coverageTone].badge}`}>
                      {coverageStatusLabel}
                    </span>
                  </div>
                </div>

                {targetPreview.skipped > 0 && (
                  <div className="rounded-lg border border-amber-300/70 bg-amber-50 dark:bg-amber-950/30 p-2 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                      {t("admin.tasksTab.warningSkippedChildren", { count: targetPreview.skipped })}
                    </p>
                  </div>
                )}
              </div>

              <TaskForm
                key={`admin-create-${createFormKey}`}
                mode="admin"
                token={token}
                initialValue={buildDefaultForm()}
                subjects={subjects.map((s) => ({ id: s.id, name: isRTL ? s.nameAr || s.name : s.name, emoji: s.emoji || undefined }))}
                showSubject
                allowDifficulty
                allowPublic={selectedChildForCreate === NO_CHILD_VALUE}
                onSubmit={handleCreateTaskSubmit}
                submitting={createAndSendMutation.isPending}
                submitLabel={t("admin.tasksTab.submitCreate")}
                submitDisabled={disableCreateForNoEligibleAll}
                submitHelperText={disableCreateForNoEligibleAll ? t("admin.tasksTab.createDisabledNoEligible") : undefined}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: t("admin.tasksTab.totalTasks"), value: totalTasks },
          { label: t("admin.tasksTab.activeTasks"), value: activeTasks },
          { label: t("admin.tasksTab.easy"), value: easyCount },
          { label: t("admin.tasksTab.medium"), value: mediumCount },
          { label: t("admin.tasksTab.hard"), value: hardCount },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`p-4 rounded-xl text-center ${isDark ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200 shadow-sm"}`}
          >
            <div className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{stat.value}</div>
            <div className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div className={`p-5 rounded-xl border ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200 shadow-sm"}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h3 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{t("admin.tasksTab.quickStart.sectionTitle")}</h3>
          <span className={`text-xs px-2.5 py-1 rounded-full ${isDark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-700"}`}>
            {t("admin.tasksTab.quickStart.countBadge", { count: quickTasks.length })}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className={`p-3 rounded-lg border ${isDark ? "bg-gray-900 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
            <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t("admin.tasksTab.quickStart.reportTotalCompletions")}</p>
            <p className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{Number(parentQuickPayload?.stats?.totalCompletions || 0)}</p>
          </div>
          <div className={`p-3 rounded-lg border ${isDark ? "bg-gray-900 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
            <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t("admin.tasksTab.quickStart.reportAveragePoints")}</p>
            <p className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{Number(parentQuickPayload?.stats?.averageAwardedPoints || 0).toFixed(1)}</p>
          </div>
          <div className={`p-3 rounded-lg border ${isDark ? "bg-gray-900 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
            <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t("admin.tasksTab.quickStart.reportTopTasks")}</p>
            <p className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{Number(parentQuickPayload?.stats?.topCompletedTasks?.length || 0)}</p>
          </div>
        </div>

        {!!(parentQuickPayload?.stats?.topCompletedTasks?.length) && (
          <div className={`rounded-lg border mb-4 overflow-hidden ${isDark ? "border-gray-700" : "border-gray-200"}`}>
            <div className={`px-3 py-2 text-xs font-semibold ${isDark ? "bg-gray-900 text-gray-300" : "bg-gray-50 text-gray-600"}`}>
              {t("admin.tasksTab.quickStart.reportTopTasksList")}
            </div>
            <div className={`divide-y ${isDark ? "divide-gray-700" : "divide-gray-200"}`}>
              {parentQuickPayload?.stats?.topCompletedTasks?.map((row) => (
                <div key={row.id} className="px-3 py-2 flex items-center justify-between gap-2 text-sm">
                  <span className={isDark ? "text-gray-200" : "text-gray-800"}>{row.title}</span>
                  <span className={isDark ? "text-gray-400" : "text-gray-600"}>{t("admin.tasksTab.quickStart.completedBy", { count: row.completionCount })}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-4">
          <div className="md:col-span-4">
            <Label className="text-xs mb-1 block">{t("admin.tasksTab.quickStart.selectPresetLabel")}</Label>
            <Select value={selectedQuickOptionCode} onValueChange={handleSelectQuickOption}>
              <SelectTrigger>
                <SelectValue placeholder={t("admin.tasksTab.quickStart.selectPresetPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {quickTaskOptions.map((option) => (
                  <SelectItem key={option.code} value={option.code}>
                    {option.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-3">
            <Label className="text-xs mb-1 block">{t("admin.tasksTab.quickStart.taskTitleLabel")}</Label>
            <input
              type="text"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${
                isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-900"
              }`}
            />
          </div>

          <div className="md:col-span-3">
            <Label className="text-xs mb-1 block">{t("admin.tasksTab.quickStart.taskDescriptionLabel")}</Label>
            <input
              type="text"
              value={quickDescription}
              onChange={(e) => setQuickDescription(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${
                isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-900"
              }`}
            />
          </div>

          <div className="md:col-span-2">
            <Label className="text-xs mb-1 block">{t("admin.tasksTab.quickStart.rewardPointsLabel")}</Label>
            <input
              type="number"
              min={1}
              value={quickRewardPoints}
              onChange={(e) => setQuickRewardPoints(Math.max(1, Number(e.target.value) || 1))}
              className={`w-full px-3 py-2 rounded-lg border ${
                isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-900"
              }`}
            />
          </div>
        </div>

        <div className="flex justify-end mb-4">
          <Button onClick={handleCreateQuickTask} disabled={createQuickTaskMutation.isPending}>
            {createQuickTaskMutation.isPending ? t("admin.tasksTab.quickStart.adding") : t("admin.tasksTab.quickStart.addButton")}
          </Button>
        </div>

        {isQuickTasksLoading ? (
          <div className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t("admin.tasksTab.quickStart.loading")}</div>
        ) : (
          <div className={`rounded-lg border overflow-hidden ${isDark ? "border-gray-700" : "border-gray-200"}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className={isDark ? "bg-gray-900" : "bg-gray-50"}>
                  <tr>
                    <th className={`px-3 py-2 text-start ${isDark ? "text-gray-300" : "text-gray-600"}`}>{t("admin.tasksTab.quickStart.columnTask")}</th>
                    <th className={`px-3 py-2 text-center ${isDark ? "text-gray-300" : "text-gray-600"}`}>{t("admin.tasksTab.quickStart.columnCompletedBy")}</th>
                    <th className={`px-3 py-2 text-center ${isDark ? "text-gray-300" : "text-gray-600"}`}>{t("admin.tasksTab.quickStart.columnPoints")}</th>
                    <th className={`px-3 py-2 text-center ${isDark ? "text-gray-300" : "text-gray-600"}`}>{t("admin.tasksTab.quickStart.columnStatus")}</th>
                    <th className={`px-3 py-2 text-center ${isDark ? "text-gray-300" : "text-gray-600"}`}>{t("admin.tasksTab.quickStart.columnActions")}</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? "divide-gray-700" : "divide-gray-200"}`}>
                  {quickTasks.map((task) => {
                    const isEditing = editingQuickTaskId === task.id;
                    return (
                      <tr key={task.id} className={isDark ? "bg-gray-800/50" : "bg-white"}>
                        <td className={`px-3 py-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                          <div className="font-medium">{task.title}</div>
                          <div className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{task.description || "-"}</div>
                        </td>
                        <td className={`px-3 py-2 text-center ${isDark ? "text-gray-300" : "text-gray-600"}`}>{task.completionCount}</td>
                        <td className="px-3 py-2 text-center">
                          {isEditing ? (
                            <input
                              type="number"
                              min={1}
                              defaultValue={task.rewardPoints}
                              onBlur={(e) => {
                                const nextPoints = Math.max(1, Number(e.target.value) || 1);
                                updateQuickTaskMutation.mutate({ id: task.id, rewardPoints: nextPoints });
                              }}
                              className={`w-20 mx-auto px-2 py-1 rounded border text-center ${
                                isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-900"
                              }`}
                            />
                          ) : (
                            <span className={`font-semibold ${isDark ? "text-yellow-300" : "text-yellow-600"}`}>{task.rewardPoints}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => updateQuickTaskMutation.mutate({ id: task.id, isActive: !task.isActive })}
                            className={`px-2 py-1 rounded text-xs ${
                              task.isActive
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                            }`}
                          >
                            {task.isActive ? t("admin.tasksTab.quickStart.active") : t("admin.tasksTab.quickStart.inactive")}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingQuickTaskId(isEditing ? null : task.id)}
                              className={`px-2 py-1 rounded text-xs ${isDark ? "bg-gray-700 text-gray-200" : "bg-gray-100 text-gray-700"}`}
                            >
                              {isEditing ? t("admin.tasksTab.quickStart.closeEdit") : t("admin.tasksTab.quickStart.edit")}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(t("admin.tasksTab.quickStart.confirmDelete"))) {
                                  deleteQuickTaskMutation.mutate(task.id);
                                }
                              }}
                              className="px-2 py-1 rounded text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                            >
                              {t("admin.tasksTab.quickStart.delete")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showSettings && (
        <div className={`p-6 rounded-xl border ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200 shadow-sm"}`}>
          <h3 className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
            {t("admin.tasksTab.settingsTitle")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                {t("admin.tasksTab.maxTasksPerDay")}
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={settingsForm.maxTasksPerDay}
                onChange={(e) => setSettingsForm((p) => ({ ...p, maxTasksPerDay: parseInt(e.target.value) || 10 }))}
                className={`w-full px-4 py-2.5 rounded-xl border ${
                  isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-900"
                }`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                {t("admin.tasksTab.allowCustomTasks")}
              </label>
              <button
                type="button"
                onClick={() => setSettingsForm((p) => ({ ...p, allowCustomTasks: !p.allowCustomTasks }))}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-colors ${
                  settingsForm.allowCustomTasks
                    ? "bg-green-50 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300"
                    : "bg-red-50 border-red-300 text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300"
                }`}
              >
                {settingsForm.allowCustomTasks ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                {settingsForm.allowCustomTasks ? t("admin.tasksTab.enabled") : t("admin.tasksTab.disabled")}
              </button>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => saveSettingsMutation.mutate(settingsForm)}
              disabled={saveSettingsMutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50"
            >
              <Save size={16} />
              {t("admin.tasksTab.saveSettings")}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? "right-3" : "left-3"} w-4 h-4 ${isDark ? "text-gray-400" : "text-gray-500"}`} />
          <input
            type="text"
            placeholder={t("admin.tasksTab.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full ${isRTL ? "pr-10 pl-4" : "pl-10 pr-4"} py-2.5 rounded-xl border ${
              isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
            }`}
          />
        </div>
        <select
          value={filterSubject}
          onChange={(e) => setFilterSubject(e.target.value)}
          className={`px-4 py-2.5 rounded-xl border ${
            isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"
          }`}
        >
          <option value="">{t("admin.tasksTab.allSubjects")}</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {isRTL ? subject.nameAr || subject.name : subject.name}
            </option>
          ))}
        </select>
        <select
          value={filterDifficulty}
          onChange={(e) => setFilterDifficulty(e.target.value)}
          className={`px-4 py-2.5 rounded-xl border ${
            isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"
          }`}
        >
          <option value="">{t("admin.tasksTab.allLevels")}</option>
          {DIFFICULTIES.map((d) => (
            <option key={d.value} value={d.value}>{isRTL ? d.labelAr : d.labelEn}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-3" />
          <p className={isDark ? "text-gray-400" : "text-gray-500"}>{t("admin.tasksTab.loading")}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className={`text-center py-16 rounded-xl border ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
          <ClipboardList className={`h-12 w-12 mx-auto mb-3 ${isDark ? "text-gray-600" : "text-gray-300"}`} />
          <p className={`text-lg font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            {searchTerm || filterSubject || filterDifficulty ? t("admin.tasksTab.noResults") : t("admin.tasksTab.noTasks")}
          </p>
        </div>
      ) : (
        <div className={`rounded-xl border overflow-hidden ${isDark ? "border-gray-700" : "border-gray-200"}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={isDark ? "bg-gray-800" : "bg-gray-50"}>
                <tr>
                  <th className={`px-4 py-3 text-start font-medium ${isDark ? "text-gray-300" : "text-gray-600"}`}>{t("admin.tasksTab.tableTitle")}</th>
                  <th className={`px-4 py-3 text-start font-medium ${isDark ? "text-gray-300" : "text-gray-600"}`}>{t("admin.tasksTab.subject")}</th>
                  <th className={`px-4 py-3 text-center font-medium ${isDark ? "text-gray-300" : "text-gray-600"}`}>{t("admin.tasksTab.difficulty")}</th>
                  <th className={`px-4 py-3 text-center font-medium ${isDark ? "text-gray-300" : "text-gray-600"}`}>{t("admin.tasksTab.points")}</th>
                  <th className={`px-4 py-3 text-center font-medium ${isDark ? "text-gray-300" : "text-gray-600"}`}>{t("admin.tasksTab.usage")}</th>
                  <th className={`px-4 py-3 text-center font-medium ${isDark ? "text-gray-300" : "text-gray-600"}`}>{t("admin.tasksTab.status")}</th>
                  <th className={`px-4 py-3 text-center font-medium ${isDark ? "text-gray-300" : "text-gray-600"}`}>{t("admin.tasksTab.actions")}</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? "divide-gray-700" : "divide-gray-200"}`}>
                {filtered.map((task) => {
                  const diff = getDifficultyBadge(task.difficulty);
                  return (
                    <tr key={task.id} className={isDark ? "bg-gray-800/50 hover:bg-gray-700/50" : "bg-white hover:bg-gray-50"}>
                      <td className={`px-4 py-3 ${isDark ? "text-white" : "text-gray-900"}`}>
                        <div className="font-medium">{task.title}</div>
                        <div className={`text-xs mt-0.5 line-clamp-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{task.question}</div>
                      </td>
                      <td className={`px-4 py-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}>{getSubjectName(task.subjectId)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${diff.color}`}>{isRTL ? diff.labelAr : diff.labelEn}</span>
                      </td>
                      <td className={`px-4 py-3 text-center font-medium ${isDark ? "text-yellow-400" : "text-yellow-600"}`}>{task.pointsReward} ⭐</td>
                      <td className={`px-4 py-3 text-center ${isDark ? "text-gray-400" : "text-gray-500"}`}>{task.usageCount}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleActiveMutation.mutate({ id: task.id, isActive: !task.isActive })}
                          className="inline-flex"
                        >
                          {task.isActive ? (
                            <span className="text-green-500"><ToggleRight size={22} /></span>
                          ) : (
                            <span className="text-gray-400"><ToggleLeft size={22} /></span>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              if (confirm(t("admin.tasksTab.confirmDeleteTask"))) {
                                deleteMutation.mutate(task.id);
                              }
                            }}
                            className={`p-1.5 rounded-lg transition-colors ${isDark ? "hover:bg-gray-600 text-red-400" : "hover:bg-gray-100 text-red-600"}`}
                            title={t("admin.tasksTab.delete")}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
