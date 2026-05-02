import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import {
  Plus,
  Trash2,
  Loader2,
  Wallet,
  GripVertical,
  CalendarClock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TemplateTask {
  id: string;
  title: string;
  question: string;
  answers: Array<{ id: string; text: string; isCorrect: boolean }>;
  pointsReward: number;
  subject?: { name: string; emoji: string };
}

interface SelectedTask {
  templateTaskId: string;
  question: string;
  answers: Array<{ id: string; text: string; isCorrect: boolean }>;
  pointsReward: number;
  title: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateSessionDialog({ open, onOpenChange, onCreated }: Props) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [intervalMinutes, setIntervalMinutes] = useState(5);
  const [activationType, setActivationType] = useState("on_login");
  const [scheduledStartAt, setScheduledStartAt] = useState("");
  const [selectedChildId, setSelectedChildId] = useState("");
  const [selectedTasks, setSelectedTasks] = useState<SelectedTask[]>([]);
  const [showTaskPicker, setShowTaskPicker] = useState(false);

  const { data: childrenData } = useQuery<any>({
    queryKey: ["/api/parent/children"],
    enabled: open,
  });

  const children = Array.isArray(childrenData?.data)
    ? childrenData.data
    : Array.isArray(childrenData)
    ? childrenData
    : [];

  const { data: walletData } = useQuery<any>({
    queryKey: ["/api/parent/wallet"],
    enabled: open,
  });

  const walletBalance = walletData?.data?.balance ?? walletData?.balance ?? 0;

  const { data: templatesData } = useQuery<any>({
    queryKey: ["/api/parent/my-tasks"],
    enabled: open && showTaskPicker,
  });

  const templates: TemplateTask[] = Array.isArray(templatesData?.data)
    ? templatesData.data
    : Array.isArray(templatesData)
    ? templatesData
    : [];

  const totalPoints = selectedTasks.reduce((sum, t) => sum + t.pointsReward, 0);
  const hasEnoughBalance = walletBalance >= totalPoints;

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title,
        description: description || undefined,
        childId: selectedChildId,
        intervalMinutes,
        activationType,
        scheduledStartAt: activationType === "scheduled" ? scheduledStartAt : undefined,
        tasks: selectedTasks.map((t, idx) => ({
          templateTaskId: t.templateTaskId,
          question: t.question,
          answers: t.answers,
          pointsReward: t.pointsReward,
          orderIndex: idx,
        })),
      };
      const res = await apiRequest("POST", "/api/parent/scheduled-sessions", payload);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t("scheduledSessions.created") });
      resetForm();
      onOpenChange(false);
      onCreated();
    },
    onError: (err: any) => {
      toast({ title: err.message || "Failed to create session", variant: "destructive" });
    },
  });

  function resetForm() {
    setTitle("");
    setDescription("");
    setIntervalMinutes(5);
    setActivationType("on_login");
    setScheduledStartAt("");
    setSelectedChildId("");
    setSelectedTasks([]);
  }

  function addTask(template: TemplateTask) {
    setSelectedTasks((prev) => [
      ...prev,
      {
        templateTaskId: template.id,
        question: template.question,
        answers: template.answers,
        pointsReward: template.pointsReward,
        title: template.title,
      },
    ]);
    setShowTaskPicker(false);
  }

  function removeTask(index: number) {
    setSelectedTasks((prev) => prev.filter((_, i) => i !== index));
  }

  function moveTask(from: number, to: number) {
    if (to < 0 || to >= selectedTasks.length) return;
    const newTasks = [...selectedTasks];
    const [moved] = newTasks.splice(from, 1);
    newTasks.splice(to, 0, moved);
    setSelectedTasks(newTasks);
  }

  const canSubmit =
    title.trim() &&
    selectedChildId &&
    selectedTasks.length > 0 &&
    hasEnoughBalance &&
    !createMutation.isPending;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) resetForm();
          onOpenChange(v);
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              {t("scheduledSessions.createSession")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <Label>{t("scheduledSessions.sessionTitle")}</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("scheduledSessions.sessionTitlePlaceholder")}
                data-testid="session-title"
              />
            </div>

            {/* Description */}
            <div>
              <Label>{t("scheduledSessions.description")}</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("scheduledSessions.descriptionPlaceholder")}
                rows={2}
                data-testid="session-description"
              />
            </div>

            {/* Child selector */}
            <div>
              <Label>{t("parentTasks.chooseSendChild")}</Label>
              <Select value={selectedChildId} onValueChange={setSelectedChildId}>
                <SelectTrigger data-testid="session-child-select">
                  <SelectValue placeholder={t("parentTasks.selectChildPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {children.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Interval */}
            <div>
              <Label>{t("scheduledSessions.intervalMinutes")}</Label>
              <Input
                type="number"
                min={0}
                max={1440}
                value={intervalMinutes}
                onChange={(e) => setIntervalMinutes(Number(e.target.value) || 0)}
                data-testid="session-interval"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("scheduledSessions.intervalHelp")}
              </p>
            </div>

            {/* Activation type */}
            <div>
              <Label>{t("scheduledSessions.activationType")}</Label>
              <Select value={activationType} onValueChange={setActivationType}>
                <SelectTrigger data-testid="session-activation-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="on_login">
                    {t("scheduledSessions.activateOnLogin")}
                  </SelectItem>
                  <SelectItem value="immediate">
                    {t("scheduledSessions.activateImmediate")}
                  </SelectItem>
                  <SelectItem value="scheduled">
                    {t("scheduledSessions.activateScheduled")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Scheduled time */}
            {activationType === "scheduled" && (
              <div>
                <Label>{t("scheduledSessions.scheduledStartAt")}</Label>
                <Input
                  type="datetime-local"
                  value={scheduledStartAt}
                  onChange={(e) => setScheduledStartAt(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  data-testid="session-scheduled-time"
                />
              </div>
            )}

            {/* Selected tasks list */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>{t("scheduledSessions.selectTasks")}</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowTaskPicker(true)}
                  data-testid="add-session-task"
                >
                  <Plus className="h-3 w-3 ml-1" />
                  {t("scheduledSessions.addTask")}
                </Button>
              </div>

              {selectedTasks.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-sm border rounded-lg border-dashed">
                  {t("scheduledSessions.selectTasks")}
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedTasks.map((task, idx) => (
                    <Card key={idx} className={isDark ? "bg-gray-800" : ""}>
                      <CardContent className="p-2 flex items-center gap-2">
                        <div className="flex flex-col gap-0.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-5 w-5 p-0"
                            onClick={() => moveTask(idx, idx - 1)}
                            disabled={idx === 0}
                          >
                            ▲
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-5 w-5 p-0"
                            onClick={() => moveTask(idx, idx + 1)}
                            disabled={idx === selectedTasks.length - 1}
                          >
                            ▼
                          </Button>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {t("scheduledSessions.taskOrder", { index: idx + 1 })}: {task.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {task.question}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-yellow-500 whitespace-nowrap">
                          {task.pointsReward} ⭐
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeTask(idx)}
                          title={t("scheduledSessions.removeTask")}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Balance info */}
            {selectedTasks.length > 0 && (
              <div className={`p-3 rounded-lg border text-sm ${hasEnoughBalance ? "border-green-500/30 bg-green-500/5" : "border-destructive/30 bg-destructive/5"}`}>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Wallet className="h-4 w-4" />
                    {t("scheduledSessions.totalPoints", { points: totalPoints })}
                  </span>
                  <span>{t("scheduledSessions.walletBalance", { balance: walletBalance })}</span>
                </div>
                {!hasEnoughBalance && (
                  <p className="text-destructive text-xs mt-1">
                    {t("scheduledSessions.insufficientBalance")}
                  </p>
                )}
              </div>
            )}

            {/* Submit */}
            <Button
              onClick={() => createMutation.mutate()}
              className="w-full"
              disabled={!canSubmit}
              data-testid="submit-create-session"
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CalendarClock className="h-4 w-4 ml-1" />
                  {t("scheduledSessions.createSession")}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task Picker Dialog */}
      <Dialog open={showTaskPicker} onOpenChange={setShowTaskPicker}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("scheduledSessions.selectTasks")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            {templates.length === 0 ? (
              <div className="text-center py-4 space-y-3">
                <p className="text-muted-foreground text-sm">
                  {t("parentTasks.noTasksCreated")}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowTaskPicker(false);
                      navigate("/parent-tasks?tab=marketplace");
                    }}
                  >
                    {t("parentTasks.tabMarketplace")}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setShowTaskPicker(false);
                      navigate("/parent-tasks?tab=my&create=1");
                    }}
                  >
                    {t("parentTasks.createTask")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowTaskPicker(false);
                      navigate("/parent-tasks?tab=classy");
                    }}
                  >
                    {t("parentTasks.tabClassy")}
                  </Button>
                </div>
              </div>
            ) : (
              templates.map((tmpl) => {
                const alreadyAdded = selectedTasks.some(
                  (st) => st.templateTaskId === tmpl.id
                );
                return (
                  <Card
                    key={tmpl.id}
                    className={`cursor-pointer transition-colors hover:border-primary/50 ${
                      alreadyAdded ? "opacity-50" : ""
                    } ${isDark ? "bg-gray-800" : ""}`}
                    onClick={() => !alreadyAdded && addTask(tmpl)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {tmpl.subject?.emoji} {tmpl.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {tmpl.question}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-yellow-500">
                          {tmpl.pointsReward} ⭐
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
