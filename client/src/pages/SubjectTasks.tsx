import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useSearch } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, BookOpen, Plus, Send, Star, Clock, CheckCircle, Sparkles } from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";

interface Subject {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

interface TemplateTask {
  id: string;
  subjectId: string;
  title: string;
  question: string;
  answers: { id: string; text: string; isCorrect: boolean }[];
  pointsReward: number;
  difficulty: string;
  isActive: boolean;
}

interface Child {
  id: string;
  name: string;
  totalPoints: number;
}

export default function SubjectTasks() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const subjectId = params.get("subject");
  
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const token = localStorage.getItem("parentToken");

  const [activeTab, setActiveTab] = useState<"classy" | "mine">("classy");
  const [selectedTask, setSelectedTask] = useState<TemplateTask | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [customPoints, setCustomPoints] = useState<number>(10);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    question: "",
    answers: [
      { id: "1", text: "", isCorrect: true },
      { id: "2", text: "", isCorrect: false },
      { id: "3", text: "", isCorrect: false },
    ],
    pointsReward: 10,
  });

  const { data: subject } = useQuery<Subject>({
    queryKey: ["/api/subjects", subjectId],
    queryFn: async () => {
      const res = await fetch(`/api/subjects/${subjectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.data || data;
    },
    enabled: !!subjectId && !!token,
  });

  const { data: templateTasks } = useQuery<TemplateTask[]>({
    queryKey: ["/api/subjects", subjectId, "template-tasks"],
    queryFn: async () => {
      const res = await fetch(`/api/subjects/${subjectId}/template-tasks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.data || [];
    },
    enabled: !!subjectId && !!token,
  });

  const { data: myTasks } = useQuery<TemplateTask[]>({
    queryKey: ["/api/parent/my-tasks", subjectId],
    queryFn: async () => {
      const res = await fetch(`/api/parent/my-tasks?subjectId=${subjectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.data || [];
    },
    enabled: !!subjectId && !!token,
  });

  const { data: children } = useQuery<Child[]>({
    queryKey: ["/api/parent/children"],
    enabled: !!token,
  });

  const { data: walletRaw } = useQuery<any>({
    queryKey: ["/api/parent/wallet"],
    enabled: !!token,
  });

  const walletBalance = Number(walletRaw?.data?.balance ?? walletRaw?.balance ?? 0);

  const sendTaskMutation = useMutation({
    mutationFn: async (data: { templateTaskId: string; childId: string; points: number }) => {
      const res = await fetch("/api/parent/send-template-task", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      setSelectedTask(null);
      setSelectedChildId("");
      setCustomPoints(10);
      queryClient.invalidateQueries({ queryKey: ["/api/parent/wallet"] });
      toast({ title: t("subjectTasks.taskSentSuccess") });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: typeof newTask & { subjectId: string }) => {
      const res = await fetch("/api/parent/create-custom-task", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parent/my-tasks", subjectId] });
      setShowCreateTask(false);
      setNewTask({
        title: "",
        question: "",
        answers: [
          { id: "1", text: "", isCorrect: true },
          { id: "2", text: "", isCorrect: false },
          { id: "3", text: "", isCorrect: false },
        ],
        pointsReward: 10,
      });
    },
  });

  const handleSendTask = () => {
    if (!selectedTask || !selectedChildId) return;
    sendTaskMutation.mutate({
      templateTaskId: selectedTask.id,
      childId: selectedChildId,
      points: customPoints,
    });
  };

  const childrenList = Array.isArray(children) ? children : [];
  const templateTasksList = Array.isArray(templateTasks) ? templateTasks : [];
  const myTasksList = Array.isArray(myTasks) ? myTasks : [];

  useEffect(() => {
    if (childrenList.length > 0 && !selectedChildId) {
      setSelectedChildId(childrenList[0].id);
    }
  }, [childrenList, selectedChildId]);

  if (!subjectId) {
    navigate("/parent-dashboard");
    return null;
  }

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-900 text-white" : "bg-gray-50"}`}>
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            onClick={() => window.history.length > 1 ? window.history.back() : navigate("/parent-dashboard")}
            className=""
            data-testid="button-back"
          >
            <ArrowRight className="h-4 w-4 ml-2" />
            {t("subjectTasks.back")}
          </Button>
          <LanguageSelector />
        </div>

        {subject && (
          <Card className={`mb-6 ${isDark ? "bg-gray-800 border-gray-700" : ""}`} style={{ borderTop: `4px solid ${subject.color}` }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <span className="text-4xl">{subject.emoji}</span>
                {subject.name}
              </CardTitle>
            </CardHeader>
          </Card>
        )}

        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === "classy" ? "default" : "outline"}
            onClick={() => setActiveTab("classy")}
            className="flex-1"
            data-testid="button-classy-tasks"
          >
            <Sparkles className="h-4 w-4 ml-2" />
            {t("subjectTasks.classiTasks")}
          </Button>
          <Button
            variant={activeTab === "mine" ? "default" : "outline"}
            onClick={() => setActiveTab("mine")}
            className="flex-1"
            data-testid="button-my-tasks"
          >
            <BookOpen className="h-4 w-4 ml-2" />
            {t("subjectTasks.myTasks")}
          </Button>
        </div>

        <Button
          onClick={() => setShowCreateTask(true)}
          className="w-full mb-6 bg-green-600 hover:bg-green-700"
          data-testid="button-create-task"
        >
          <Plus className="h-4 w-4 ml-2" />
          {t("subjectTasks.createNewTask")}
        </Button>

        {activeTab === "classy" ? (
          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              {t("subjectTasks.readyClassiTasks")} ({templateTasksList.length})
            </h3>
            {templateTasksList.length === 0 ? (
              <Card className={isDark ? "bg-gray-800 border-gray-700" : ""}>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">{t("subjectTasks.noReadyTasksForSubject")}</p>
                </CardContent>
              </Card>
            ) : (
              templateTasksList.map((task) => (
                <Card
                  key={task.id}
                  className={`cursor-pointer transition-all hover:scale-[1.02] ${isDark ? "bg-gray-800 border-gray-700" : ""} ${
                    selectedTask?.id === task.id ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setSelectedTask(task)}
                  data-testid={`card-task-${task.id}`}
                >
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-bold text-lg mb-2">{task.title}</h4>
                        <p className="text-muted-foreground mb-3">{task.question}</p>
                        <div className="flex gap-2">
                          <Badge className="bg-amber-500">
                            <Star className="h-3 w-3 ml-1" />
                            {task.pointsReward} {t("subjectTasks.point")}
                          </Badge>
                          <Badge variant="outline">
                            {task.difficulty === "easy" ? t("subjectTasks.easy") : task.difficulty === "medium" ? t("subjectTasks.medium") : t("subjectTasks.hard")}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTask(task);
                        }}
                        data-testid={`button-select-task-${task.id}`}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-500" />
              {t("subjectTasks.myCustomTasks")} ({myTasksList.length})
            </h3>
            {myTasksList.length === 0 ? (
              <Card className={isDark ? "bg-gray-800 border-gray-700" : ""}>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">{t("subjectTasks.noTasksYet")}</p>
                  <Button className="mt-4" onClick={() => setShowCreateTask(true)}>
                    <Plus className="h-4 w-4 ml-2" />
                    {t("subjectTasks.createFirstTask")}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              myTasksList.map((task) => (
                <Card
                  key={task.id}
                  className={`cursor-pointer transition-all hover:scale-[1.02] ${isDark ? "bg-gray-800 border-gray-700" : ""} ${
                    selectedTask?.id === task.id ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setSelectedTask(task)}
                  data-testid={`card-my-task-${task.id}`}
                >
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-bold text-lg mb-2">{task.title}</h4>
                        <p className="text-muted-foreground mb-3">{task.question}</p>
                        <Badge className="bg-blue-500">
                          <Star className="h-3 w-3 ml-1" />
                          {task.pointsReward} {t("subjectTasks.point")}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTask(task);
                        }}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {selectedTask && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className={`w-full max-w-md ${isDark ? "bg-gray-800 border-gray-700" : ""}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-green-500" />
                  {t("subjectTasks.sendTaskToChild")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className={`p-4 rounded-lg ${isDark ? "bg-gray-700" : "bg-gray-100"}`}>
                  <h4 className="font-bold">{selectedTask.title}</h4>
                  <p className="text-sm text-muted-foreground">{selectedTask.question}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">{t("subjectTasks.chooseChild")}</label>
                  <select
                    value={selectedChildId}
                    onChange={(e) => setSelectedChildId(e.target.value)}
                    className={`w-full p-3 rounded-lg border ${isDark ? "bg-gray-700 border-gray-600" : ""}`}
                    data-testid="select-child"
                  >
                    {childrenList.map((child) => (
                      <option key={child.id} value={child.id}>
                        {child.name} ({child.totalPoints} {t("subjectTasks.point")})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">{t("subjectTasks.pointsCount")}</label>
                  <input
                    type="number"
                    value={customPoints}
                    onChange={(e) => setCustomPoints(parseInt(e.target.value) || 0)}
                    min={1}
                    max={100}
                    className={`w-full p-3 rounded-lg border ${isDark ? "bg-gray-700 border-gray-600" : ""}`}
                    data-testid="input-points"
                  />
                </div>

                <div className="flex gap-2">
                  {customPoints > walletBalance && (
                    <div className="w-full p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm text-center mb-2">
                      {t("subjectTasks.insufficientBalance", { balance: walletBalance, required: customPoints })}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSendTask}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    disabled={sendTaskMutation.isPending || customPoints > walletBalance}
                    data-testid="button-send-task"
                  >
                    {sendTaskMutation.isPending ? t("subjectTasks.sending") : t("subjectTasks.sendTask")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedTask(null)}
                    data-testid="button-cancel-send"
                  >
                    {t("subjectTasks.cancel")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {showCreateTask && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <Card className={`w-full max-w-lg my-4 ${isDark ? "bg-gray-800 border-gray-700" : ""}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-green-500" />
                  {t("subjectTasks.createNewTask")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t("subjectTasks.taskTitle")}</label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className={`w-full p-3 rounded-lg border ${isDark ? "bg-gray-700 border-gray-600" : ""}`}
                    placeholder={t("subjectTasks.taskTitlePlaceholder")}
                    data-testid="input-task-title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">{t("subjectTasks.question")}</label>
                  <textarea
                    value={newTask.question}
                    onChange={(e) => setNewTask({ ...newTask, question: e.target.value })}
                    className={`w-full p-3 rounded-lg border ${isDark ? "bg-gray-700 border-gray-600" : ""}`}
                    rows={2}
                    placeholder={t("subjectTasks.questionPlaceholder")}
                    data-testid="input-task-question"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">{t("subjectTasks.answers")}</label>
                  {newTask.answers.map((answer, index) => (
                    <div key={answer.id} className="flex items-center gap-2 mb-2">
                      <input
                        type="radio"
                        name="correctAnswer"
                        checked={answer.isCorrect}
                        onChange={() => {
                          const updated = newTask.answers.map((a, i) => ({
                            ...a,
                            isCorrect: i === index,
                          }));
                          setNewTask({ ...newTask, answers: updated });
                        }}
                      />
                      <input
                        type="text"
                        value={answer.text}
                        onChange={(e) => {
                          const updated = [...newTask.answers];
                          updated[index].text = e.target.value;
                          setNewTask({ ...newTask, answers: updated });
                        }}
                        className={`flex-1 p-2 rounded-lg border ${isDark ? "bg-gray-700 border-gray-600" : ""}`}
                        placeholder={t("subjectTasks.answerN", { n: index + 1 })}
                        data-testid={`input-answer-${index}`}
                      />
                      {answer.isCorrect && (
                        <Badge className="bg-green-500">{t("subjectTasks.correct")}</Badge>
                      )}
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">{t("subjectTasks.pointsLabel")}</label>
                  <input
                    type="number"
                    value={newTask.pointsReward}
                    onChange={(e) => setNewTask({ ...newTask, pointsReward: parseInt(e.target.value) || 10 })}
                    min={1}
                    max={100}
                    className={`w-full p-3 rounded-lg border ${isDark ? "bg-gray-700 border-gray-600" : ""}`}
                    data-testid="input-task-points"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      if (subjectId) {
                        createTaskMutation.mutate({ ...newTask, subjectId });
                      }
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    disabled={createTaskMutation.isPending || !newTask.title || !newTask.question}
                    data-testid="button-save-task"
                  >
                    {createTaskMutation.isPending ? t("subjectTasks.saving") : t("subjectTasks.saveTask")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateTask(false)}
                    data-testid="button-cancel-create"
                  >
                    {t("subjectTasks.cancel")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
