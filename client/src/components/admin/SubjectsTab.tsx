import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, BookOpen, Users, ListTodo, Settings, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskForm, type TaskFormValue } from "@/components/forms/TaskForm";

interface Subject {
  id: string;
  name: string;
  emoji: string;
  description: string;
  color: string;
  isActive: boolean;
  createdAt: string;
}

interface TemplateTask {
  id: string;
  subjectId: string;
  title: string;
  question: string;
  answers: { id: string; text: string; isCorrect: boolean; imageUrl?: string }[];
  pointsReward: number;
  difficulty: string;
  isActive: boolean;
  createdByParent?: boolean;
  parentId?: string;
  isPublic?: boolean;
  pointsCost?: number;
  taskMedia?: any;
}

export function SubjectsTab({
  token }: { token: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [editingTask, setEditingTask] = useState<TemplateTask | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [subjectForm, setSubjectForm] = useState({ name: "", emoji: "📚", description: "", color: "#6B4D9D" });
  const [taskFormKey, setTaskFormKey] = useState(0);
  const [showParentTasks, setShowParentTasks] = useState(false);
  const [modalTab, setModalTab] = useState<"settings" | "tasks">("settings");

  const { data: subjects, isLoading } = useQuery({
    queryKey: ["admin-subjects"],
    queryFn: async () => {
      const res = await fetch("/api/admin/subjects", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.data || [];
    },
  });

  const { data: templateTasks } = useQuery({
    queryKey: ["admin-template-tasks", selectedSubjectId],
    queryFn: async () => {
      const url = selectedSubjectId
        ? `/api/admin/template-tasks?subjectId=${selectedSubjectId}`
        : "/api/admin/template-tasks";
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.data || [];
    },
    enabled: !!selectedSubjectId,
  });

  const buildTaskFormValue = (): TaskFormValue => ({
    title: "",
    question: "",
    answers: [
      { id: "1", text: "", isCorrect: true },
      { id: "2", text: "", isCorrect: false },
      { id: "3", text: "", isCorrect: false },
    ],
    pointsReward: 10,
    difficulty: "medium",
    subjectId: selectedSubjectId || undefined,
    isPublic: false,
    pointsCost: 5,
    taskMedia: null,
  });

  const mapTaskToFormValue = (task: TemplateTask): TaskFormValue => ({
    title: task.title,
    question: task.question,
    answers: (task.answers || []).map((a, idx) => ({
      id: a.id || String(idx + 1),
      text: a.text,
      isCorrect: a.isCorrect,
      imageUrl: a.imageUrl,
    })),
    pointsReward: task.pointsReward,
    difficulty: task.difficulty || "medium",
    subjectId: task.subjectId,
    isPublic: (task as any).isPublic ?? false,
    pointsCost: (task as any).pointsCost ?? 5,
    taskMedia: (task as any).taskMedia || null,
  });

  const { data: editingSubjectTasks, isLoading: loadingEditingTasks } = useQuery({
    queryKey: ["admin-template-tasks", editingSubject?.id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/template-tasks?subjectId=${editingSubject?.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.data || [];
    },
    enabled: !!editingSubject?.id,
  });

  const createSubjectMutation = useMutation({
    mutationFn: async (data: typeof subjectForm) => {
      const res = await fetch("/api/admin/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-subjects"] });
      setShowSubjectModal(false);
      setSubjectForm({ name: "", emoji: "📚", description: "", color: "#6B4D9D" });
    },
  });

  const updateSubjectMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof subjectForm }) => {
      const res = await fetch(`/api/admin/subjects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-subjects"] });
      setShowSubjectModal(false);
      setEditingSubject(null);
      setSubjectForm({ name: "", emoji: "📚", description: "", color: "#6B4D9D" });
    },
  });

  const deleteSubjectMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/subjects/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-subjects"] });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      const subjectId = data.subjectId || selectedSubjectId;
      if (!subjectId) throw new Error(t("admin.subjects.subjectRequired"));
      const res = await fetch("/api/admin/template-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...data, subjectId }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-template-tasks", selectedSubjectId] });
      if (editingSubject?.id && editingSubject.id !== selectedSubjectId) {
        queryClient.invalidateQueries({ queryKey: ["admin-template-tasks", editingSubject.id] });
      }
      setShowTaskModal(false);
      setTaskFormKey((k) => k + 1);
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/template-tasks/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-template-tasks", selectedSubjectId] });
      if (editingSubject?.id && editingSubject.id !== selectedSubjectId) {
        queryClient.invalidateQueries({ queryKey: ["admin-template-tasks", editingSubject.id] });
      }
      queryClient.invalidateQueries({ queryKey: ["admin-parent-tasks"] });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const subjectId = data.subjectId || selectedSubjectId;
      const res = await fetch(`/api/admin/template-tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...data, subjectId }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-template-tasks", selectedSubjectId] });
      if (editingSubject?.id && editingSubject.id !== selectedSubjectId) {
        queryClient.invalidateQueries({ queryKey: ["admin-template-tasks", editingSubject.id] });
      }
      queryClient.invalidateQueries({ queryKey: ["admin-parent-tasks"] });
      setShowTaskModal(false);
      setEditingTask(null);
      setTaskFormKey((k) => k + 1);
    },
  });

  const { data: parentTasks } = useQuery({
    queryKey: ["admin-parent-tasks"],
    queryFn: async () => {
      const res = await fetch("/api/admin/parent-created-tasks", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.data || [];
    },
    enabled: showParentTasks,
  });

  const convertToTemplateMutation = useMutation({
    mutationFn: async (taskData: any) => {
      const res = await fetch("/api/admin/template-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(taskData),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-template-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["admin-parent-tasks"] });
    },
  });

  const seedSubjectsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/seed-subjects", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-subjects"] });
      queryClient.invalidateQueries({ queryKey: ["admin-template-tasks"] });
    },
  });

  const handleEditSubject = (subject: Subject) => {
    setEditingSubject(subject);
    setSubjectForm({
      name: subject.name,
      emoji: subject.emoji,
      description: subject.description || "",
      color: subject.color,
    });
    setShowSubjectModal(true);
  };

  const handleSaveSubject = () => {
    if (editingSubject) {
      updateSubjectMutation.mutate({ id: editingSubject.id, data: subjectForm });
    } else {
      createSubjectMutation.mutate(subjectForm);
    }
  };

  const handleEditTask = (task: TemplateTask) => {
    setEditingTask(task);
    setTaskFormKey((k) => k + 1);
    setShowTaskModal(true);
  };

  const handleTaskFormSubmit = async (form: TaskFormValue) => {
    const subjectId = form.subjectId || selectedSubjectId;
    if (!subjectId) {
      alert("يرجى اختيار المادة");
      return;
    }

    const payload = {
      ...form,
      subjectId,
      answers: form.answers.map((a) => ({ id: a.id, text: a.text, isCorrect: a.isCorrect, imageUrl: a.imageUrl })),
    };

    if (editingTask) {
      await updateTaskMutation.mutateAsync({ id: editingTask.id, data: payload });
    } else {
      await createTaskMutation.mutateAsync(payload);
    }
  };

  if (isLoading) {
    return <div className="p-4">Loading subjects...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6" />
          إدارة المواد الدراسية
        </h2>
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => setShowParentTasks(!showParentTasks)}
            variant={showParentTasks ? "default" : "outline"}
            data-testid="button-toggle-parent-tasks"
          >
            <Users className="h-4 w-4 ml-2" />
            {showParentTasks ? "إخفاء مهام الآباء" : "مهام الآباء"}
          </Button>
          <Button
            onClick={() => seedSubjectsMutation.mutate()}
            variant="outline"
            disabled={seedSubjectsMutation.isPending}
            data-testid="button-seed-subjects"
          >
            {seedSubjectsMutation.isPending ? "جاري الإضافة..." : "إضافة مواد افتراضية"}
          </Button>
          <Button
            onClick={() => {
              setEditingSubject(null);
              setSubjectForm({ name: "", emoji: "📚", description: "", color: "#6B4D9D" });
              setShowSubjectModal(true);
            }}
            data-testid="button-add-subject"
          >
            <Plus className="h-4 w-4 ml-2" />
            إضافة مادة
          </Button>
        </div>
      </div>

      {showParentTasks && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              المهام التي أنشأها الآباء
            </CardTitle>
          </CardHeader>
          <CardContent>
            {parentTasks && parentTasks.length > 0 ? (
              <div className="space-y-3">
                {parentTasks.map((task: any) => (
                  <div
                    key={task.id}
                    className="p-4 border rounded-lg flex items-center justify-between"
                    data-testid={`parent-task-${task.id}`}
                  >
                    <div>
                      <h4 className="font-medium">{task.question}</h4>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        <Badge variant="outline">{task.pointsReward} نقطة</Badge>
                        <Badge variant="secondary">{task.parentName || "والد"}</Badge>
                        <Badge variant="outline">{task.childName || "طفل"}</Badge>
                      </div>
                      {task.answers && (
                        <div className="mt-2 text-sm text-gray-500">
                          {task.answers.filter((a: any) => a.text).map((a: any, i: number) => (
                            <span key={i} className={`ml-2 ${a.isCorrect ? "text-green-500 font-bold" : ""}`}>
                              {a.text}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        className="text-sm p-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                        onChange={(e) => {
                          const subjectId = e.target.value;
                          if (!subjectId) return;
                          convertToTemplateMutation.mutate({
                            title: task.question.substring(0, 50),
                            question: task.question,
                            answers: task.answers || [],
                            pointsReward: task.pointsReward || 10,
                            difficulty: "medium",
                            subjectId: subjectId,
                          });
                        }}
                        defaultValue=""
                        disabled={convertToTemplateMutation.isPending}
                        data-testid={`select-subject-for-task-${task.id}`}
                      >
                        <option value="" disabled>اختر المادة</option>
                        {subjects?.map((s: Subject) => (
                          <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>
                        ))}
                      </select>
                      {convertToTemplateMutation.isPending && (
                        <span className="text-sm text-gray-500">جاري الإضافة...</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">لا توجد مهام أنشأها الآباء بعد</p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects?.map((subject: Subject) => (
          <Card
            key={subject.id}
            className={`cursor-pointer transition-all ${
              selectedSubjectId === subject.id ? "ring-2 ring-blue-500" : ""
            }`}
            onClick={() => setSelectedSubjectId(subject.id)}
            data-testid={`card-subject-${subject.id}`}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="text-2xl">{subject.emoji}</span>
                  {subject.name}
                </CardTitle>
                <Badge variant={subject.isActive ? "default" : "secondary"}>
                  {subject.isActive ? "نشط" : "غير نشط"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-3">{subject.description || "لا يوجد وصف"}</p>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: subject.color }}
                />
                <span className="text-xs text-gray-400">{subject.color}</span>
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditSubject(subject);
                  }}
                  data-testid={`button-edit-subject-${subject.id}`}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("هل أنت متأكد من حذف هذه المادة؟")) {
                      deleteSubjectMutation.mutate(subject.id);
                    }
                  }}
                  data-testid={`button-delete-subject-${subject.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedSubjectId && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <span className="text-xl">
                  {subjects?.find((s: Subject) => s.id === selectedSubjectId)?.emoji}
                </span>
                مهام {subjects?.find((s: Subject) => s.id === selectedSubjectId)?.name}
              </CardTitle>
              <Button
                onClick={() => {
                  setEditingTask(null);
                  setTaskFormKey((k) => k + 1);
                  setShowTaskModal(true);
                }}
                data-testid="button-add-template-task"
              >
                <Plus className="h-4 w-4 ml-2" />
                إضافة مهمة
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {templateTasks && templateTasks.length > 0 ? (
              <div className="space-y-3">
                {templateTasks.map((task: TemplateTask) => (
                  <div
                    key={task.id}
                    className="p-4 border rounded-lg flex items-center justify-between"
                    data-testid={`template-task-${task.id}`}
                  >
                    <div>
                      <h4 className="font-medium">{task.title}</h4>
                      <p className="text-sm text-gray-500">{task.question}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline">{task.pointsReward} نقطة</Badge>
                        <Badge variant="secondary">{task.difficulty}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handleEditTask(task)}
                        data-testid={`button-edit-task-${task.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={() => {
                          if (confirm("هل أنت متأكد من حذف هذه المهمة؟")) {
                            deleteTaskMutation.mutate(task.id);
                          }
                        }}
                        data-testid={`button-delete-task-${task.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">لا توجد مهام في هذه المادة</p>
            )}
          </CardContent>
        </Card>
      )}

      {showSubjectModal && (
        <Dialog open={showSubjectModal} onOpenChange={(open) => {
          setShowSubjectModal(open);
          if (!open) {
            setEditingSubject(null);
            setModalTab("settings");
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {editingSubject && <span className="text-2xl">{editingSubject.emoji}</span>}
                {editingSubject ? `تعديل: ${editingSubject.name}` : "إضافة مادة جديدة"}
              </DialogTitle>
            </DialogHeader>
            
            {editingSubject ? (
              <Tabs value={modalTab} onValueChange={(v) => setModalTab(v as "settings" | "tasks")} className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="settings" className="flex items-center gap-2" data-testid="tab-subject-settings">
                    <Settings className="h-4 w-4" />
                    إعدادات المادة
                  </TabsTrigger>
                  <TabsTrigger value="tasks" className="flex items-center gap-2" data-testid="tab-subject-tasks">
                    <ListTodo className="h-4 w-4" />
                    المهام ({editingSubjectTasks?.length || 0})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="settings" className="flex-1 overflow-y-auto mt-4">
                  <div className="space-y-4">
                    <div>
                      <Label>اسم المادة</Label>
                      <Input
                        value={subjectForm.name}
                        onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                        placeholder="مثال: الرياضيات"
                        data-testid="input-subject-name"
                      />
                    </div>
                    <div>
                      <Label>الرمز التعبيري</Label>
                      <Input
                        value={subjectForm.emoji}
                        onChange={(e) => setSubjectForm({ ...subjectForm, emoji: e.target.value })}
                        placeholder="📚"
                        data-testid="input-subject-emoji"
                      />
                    </div>
                    <div>
                      <Label>الوصف</Label>
                      <Textarea
                        value={subjectForm.description}
                        onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
                        placeholder="وصف مختصر للمادة..."
                        rows={2}
                        data-testid="input-subject-description"
                      />
                    </div>
                    <div>
                      <Label>اللون</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={subjectForm.color}
                          onChange={(e) => setSubjectForm({ ...subjectForm, color: e.target.value })}
                          className="w-12 h-10 p-1 border rounded-lg cursor-pointer"
                          data-testid="input-subject-color"
                        />
                        <Input
                          value={subjectForm.color}
                          onChange={(e) => setSubjectForm({ ...subjectForm, color: e.target.value })}
                          placeholder="#6B4D9D"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={handleSaveSubject}
                    disabled={updateSubjectMutation.isPending}
                    className="w-full mt-6"
                    data-testid="button-save-subject"
                  >
                    {updateSubjectMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 animate-spin ml-2" /> جاري الحفظ...</>
                    ) : "حفظ التغييرات"}
                  </Button>
                </TabsContent>
                
                <TabsContent value="tasks" className="flex-1 overflow-y-auto mt-4">
                  <div className="space-y-3">
                    {loadingEditingTasks ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                        جاري التحميل...
                      </div>
                    ) : editingSubjectTasks && editingSubjectTasks.length > 0 ? (
                      editingSubjectTasks.map((task: TemplateTask) => (
                        <div
                          key={task.id}
                          className="p-4 border rounded-lg flex items-center justify-between"
                          data-testid={`modal-task-${task.id}`}
                        >
                          <div className="flex-1">
                            <h4 className="font-medium">{task.title}</h4>
                            <p className="text-sm text-muted-foreground line-clamp-1">{task.question}</p>
                            <div className="flex gap-2 mt-2 flex-wrap">
                              <Badge variant="outline">{task.pointsReward} نقطة</Badge>
                              <Badge variant="secondary">{task.difficulty === "easy" ? "سهل" : task.difficulty === "hard" ? "صعب" : "متوسط"}</Badge>
                              <Badge variant={task.isActive ? "default" : "secondary"}>
                                {task.isActive ? "نشط" : "غير نشط"}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex gap-2 mr-4">
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => {
                                setSelectedSubjectId(editingSubject.id);
                                handleEditTask(task);
                              }}
                              data-testid={`button-edit-modal-task-${task.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="destructive"
                              onClick={() => {
                                if (confirm("هل أنت متأكد من حذف هذه المهمة؟")) {
                                  deleteTaskMutation.mutate(task.id);
                                }
                              }}
                              data-testid={`button-delete-modal-task-${task.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <ListTodo className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>لا توجد مهام في هذه المادة</p>
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={() => {
                      setSelectedSubjectId(editingSubject.id);
                      setEditingTask(null);
                      setTaskFormKey((k) => k + 1);
                      setShowTaskModal(true);
                    }}
                    className="w-full mt-4"
                    data-testid="button-add-task-from-modal"
                  >
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة مهمة جديدة
                  </Button>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label>اسم المادة</Label>
                  <Input
                    value={subjectForm.name}
                    onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                    placeholder="مثال: الرياضيات"
                    data-testid="input-subject-name"
                  />
                </div>
                <div>
                  <Label>الرمز التعبيري</Label>
                  <Input
                    value={subjectForm.emoji}
                    onChange={(e) => setSubjectForm({ ...subjectForm, emoji: e.target.value })}
                    placeholder="📚"
                    data-testid="input-subject-emoji"
                  />
                </div>
                <div>
                  <Label>الوصف</Label>
                  <Textarea
                    value={subjectForm.description}
                    onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
                    placeholder="وصف مختصر للمادة..."
                    rows={2}
                    data-testid="input-subject-description"
                  />
                </div>
                <div>
                  <Label>اللون</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={subjectForm.color}
                      onChange={(e) => setSubjectForm({ ...subjectForm, color: e.target.value })}
                      className="w-12 h-10 p-1 border rounded-lg cursor-pointer"
                      data-testid="input-subject-color"
                    />
                    <Input
                      value={subjectForm.color}
                      onChange={(e) => setSubjectForm({ ...subjectForm, color: e.target.value })}
                      placeholder="#6B4D9D"
                      className="flex-1"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleSaveSubject}
                  disabled={createSubjectMutation.isPending}
                  className="w-full"
                  data-testid="button-save-subject"
                >
                  {createSubjectMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin ml-2" /> جاري الإضافة...</>
                  ) : "إضافة المادة"}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {showTaskModal && (
        <Dialog open={showTaskModal} onOpenChange={setShowTaskModal}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTask ? "تعديل المهمة" : "إضافة مهمة جديدة"}
              </DialogTitle>
            </DialogHeader>
            <TaskForm
              key={`admin-task-${taskFormKey}-${editingTask?.id || "new"}`}
              mode="admin"
              token={token}
              initialValue={editingTask ? mapTaskToFormValue(editingTask) : buildTaskFormValue()}
              subjects={subjects as any}
              showSubject
              allowDifficulty
              allowPublic
              onSubmit={handleTaskFormSubmit}
              submitting={createTaskMutation.isPending || updateTaskMutation.isPending}
              submitLabel={editingTask ? "حفظ التغييرات" : "إضافة المهمة"}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
