import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useTranslation } from 'react-i18next';
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
// Lazy-load heavy image cropper component
const ImageCropper = lazy(() => import("@/components/ImageCropper"));
import { TeacherWebPushRegistrar } from "@/components/TeacherWebPushRegistrar";
import { TeacherMobilePushRegistrar } from "@/components/TeacherMobilePushRegistrar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { ShareMenu } from "@/components/ui/ShareMenu";
import { TeacherNotificationBell } from "@/components/AccountNotificationBell";
import { LanguageSelector } from "@/components/LanguageSelector";
import { RoleOnboardingChecklist } from "@/components/RoleOnboardingChecklist";
import { AccountSwitcherDialog } from "@/components/AccountSwitcherDialog";
import { HelpChatDialog } from "@/components/HelpChatDialog";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  GraduationCap, BookOpen, Users, Star, LogOut, Plus, Edit, Trash2,
  DollarSign, TrendingUp, ArrowDownToLine, CheckCircle, Clock, MessageSquare,
  Image, Video, Upload, X, FileText, Settings, Camera, Link2, User,
  BarChart3, Lock, Unlock, Pin, PinOff, UserPlus, Send, XCircle, HelpCircle,
  Download, Search,
} from "lucide-react";

interface Task {
  id: string;
  title?: string;
  question: string;
  answers: { id: string; text: string; isCorrect: boolean; imageUrl?: string; videoUrl?: string }[];
  explanation: string | null;
  imageUrl?: string | null;
  gifUrl?: string | null;
  videoUrl?: string | null;
  coverImageUrl?: string | null;
  questionImages?: string[];
  subjectLabel?: string | null;
  price: string;
  purchaseCount: number;
  isActive: boolean;
  createdAt: string;
}

interface Post {
  id: string;
  content: string;
  mediaUrls: string[];
  mediaTypes: string[];
  likesCount: number;
  commentsCount: number;
  isPinned: boolean;
  isActive: boolean;
  createdAt: string;
}

// ===== File Upload Helper =====
async function uploadFileForTeacher(file: File, token: string, purpose: string): Promise<string> {
  // Step 1: Get presigned URL
  const presignRes = await fetch("/api/teacher/uploads/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      contentType: file.type,
      size: file.size,
      purpose,
      originalName: file.name,
    }),
  });
  if (!presignRes.ok) throw new Error("Upload file failed");
  const { data: presign } = await presignRes.json();

  // Step 2: Upload file — handle local vs remote URLs
  const isLocalUrl = presign.uploadURL.startsWith("/api/");
  if (isLocalUrl) {
    // Local storage: PUT directly to server endpoint
    const directRes = await fetch(presign.uploadURL, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    if (!directRes.ok) throw new Error("Upload to storage failed");
  } else {
    // Remote storage: Upload via proxy
    const proxyRes = await fetch("/api/teacher/uploads/proxy", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": file.type,
        "x-upload-object-path": presign.objectPath,
      },
      body: file,
    });
    if (!proxyRes.ok) throw new Error("Upload to storage failed");
  }

  // Step 3: Finalize
  const finalizeRes = await fetch("/api/teacher/uploads/finalize", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      objectPath: presign.objectPath,
      mimeType: file.type,
      size: file.size,
      originalName: file.name,
      purpose,
    }),
  });
  if (!finalizeRes.ok) throw new Error("Upload finalize failed");
  const { data: media } = await finalizeRes.json();
  return media.url;
}

export default function TeacherDashboard() {
  const { t } = useTranslation();

  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const token = localStorage.getItem("teacherToken");
  const teacherData = JSON.parse(localStorage.getItem("teacherData") || "{}");

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [postContent, setPostContent] = useState("");
  const [postMediaFiles, setPostMediaFiles] = useState<File[]>([]);
  const [postMediaPreviews, setPostMediaPreviews] = useState<{ url: string; type: string }[]>([]);
  const [postUploading, setPostUploading] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [taskImageFile, setTaskImageFile] = useState<File | null>(null);
  const [taskVideoFile, setTaskVideoFile] = useState<File | null>(null);
  const [taskCoverFile, setTaskCoverFile] = useState<File | null>(null);
  const [taskImagePreview, setTaskImagePreview] = useState<string | null>(null);
  const [taskVideoPreview, setTaskVideoPreview] = useState<string | null>(null);
  const [taskCoverPreview, setTaskCoverPreview] = useState<string | null>(null);
  const [taskUploading, setTaskUploading] = useState(false);
  // Answer media: per-answer image/video files
  const [answerMediaFiles, setAnswerMediaFiles] = useState<Record<string, { imageFile?: File; videoFile?: File }>>({});
  const [answerMediaPreviews, setAnswerMediaPreviews] = useState<Record<string, { imageUrl?: string; videoUrl?: string }>>({});
  // Question images (multiple)
  const [questionImageFiles, setQuestionImageFiles] = useState<File[]>([]);
  const [questionImagePreviews, setQuestionImagePreviews] = useState<string[]>([]);
  const questionImagesInputRef = useRef<HTMLInputElement>(null);
  // Profile editing
  const [profileEditMode, setProfileEditMode] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", bio: "", subject: "", yearsExperience: 0, socialLinks: {} as Record<string, string> });
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImage, setCropperImage] = useState("");
  const [cropperMode, setCropperMode] = useState<"avatar" | "cover">("avatar");
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const postMediaInputRef = useRef<HTMLInputElement>(null);

  // Poll state
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollForm, setPollForm] = useState({
    question: "",
    options: [{ text: "", imageUrl: "" }, { text: "", imageUrl: "" }] as { text: string; imageUrl: string }[],
    allowMultiple: false,
    isAnonymous: false,
    isPinned: false,
    expiresAt: "",
  });
  const [uploadingPollOptionIdx, setUploadingPollOptionIdx] = useState<number | null>(null);

  // Assignment & Help states
  const [showSendTaskModal, setShowSendTaskModal] = useState(false);
  const [selectedChildForTask, setSelectedChildForTask] = useState<any>(null);
  const [sendTaskForm, setSendTaskForm] = useState({ question: "", pointsReward: "", answers: [{ id: "s1", text: "", isCorrect: true }, { id: "s2", text: "", isCorrect: false }] });
  const [selectedHelpRequest, setSelectedHelpRequest] = useState<any>(null);
  const [respondingRequestId, setRespondingRequestId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [helpPaymentsMonth, setHelpPaymentsMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  // Child reports states
  const [showReportsDialog, setShowReportsDialog] = useState(false);
  // Help filter/search states
  const [helpFilterStatus, setHelpFilterStatus] = useState<"all" | "active" | "resolved">("all");
  const [helpSearchQuery, setHelpSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("tasks");
  const [pendingHelpRequestId, setPendingHelpRequestId] = useState<string | null>(null);
  const [pendingOpenHelpChat, setPendingOpenHelpChat] = useState(false);
  const [reportsChildId, setReportsChildId] = useState<string | null>(null);
  const [reportsChildName, setReportsChildName] = useState("");

  const [taskForm, setTaskForm] = useState({
    title: "",
    question: "",
    explanation: "",
    subjectLabel: "",
    price: "",
    answers: [
      { id: "a1", text: "", isCorrect: true, imageUrl: undefined as string | undefined, videoUrl: undefined as string | undefined },
      { id: "a2", text: "", isCorrect: false, imageUrl: undefined as string | undefined, videoUrl: undefined as string | undefined },
      { id: "a3", text: "", isCorrect: false, imageUrl: undefined as string | undefined, videoUrl: undefined as string | undefined },
      { id: "a4", text: "", isCorrect: false, imageUrl: undefined as string | undefined, videoUrl: undefined as string | undefined },
    ],
  });

  useEffect(() => {
    if (!token) setLocation("/teacher/login");
  }, [token, setLocation]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    const helpRequestId = params.get("helpRequestId");
    const openChat = params.get("openChat") === "1";

    if (tab) {
      setActiveTab(tab);
    }

    if (helpRequestId) {
      setActiveTab("help-requests");
      setPendingHelpRequestId(helpRequestId);
      setPendingOpenHelpChat(openChat);
    }
  }, [location]);

  const authHeaders = { Authorization: `Bearer ${token}` };

  // ===== Queries =====

  const { data: profile } = useQuery({
    queryKey: ["teacher-profile"],
    queryFn: async () => {
      const res = await fetch("/api/teacher/profile", { headers: authHeaders });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
    enabled: !!token,
  });

  const { data: stats } = useQuery({
    queryKey: ["teacher-stats"],
    queryFn: async () => {
      const res = await fetch("/api/teacher/stats", { headers: authHeaders });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
    enabled: !!token,
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["teacher-tasks"],
    queryFn: async () => {
      const res = await fetch("/api/teacher/tasks", { headers: authHeaders });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
    enabled: !!token,
  });

  const { data: balance } = useQuery({
    queryKey: ["teacher-balance"],
    queryFn: async () => {
      const res = await fetch("/api/teacher/balance", { headers: authHeaders });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
    enabled: !!token,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["teacher-orders"],
    queryFn: async () => {
      const res = await fetch("/api/teacher/orders", { headers: authHeaders });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
    enabled: !!token,
  });

  const { data: posts = [] } = useQuery<Post[]>({
    queryKey: ["teacher-posts"],
    queryFn: async () => {
      const res = await fetch("/api/teacher/posts", { headers: authHeaders });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
    enabled: !!token,
  });

  const { data: withdrawals = [] } = useQuery({
    queryKey: ["teacher-withdrawals"],
    queryFn: async () => {
      const res = await fetch("/api/teacher/withdrawals", { headers: authHeaders });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
    enabled: !!token,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["teacher-reviews"],
    queryFn: async () => {
      const res = await fetch("/api/teacher/reviews", { headers: authHeaders });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
    enabled: !!token,
  });

  const { data: teacherPolls = [] } = useQuery<any[]>({
    queryKey: ["teacher-polls"],
    queryFn: async () => {
      const res = await fetch("/api/teacher/polls", { headers: authHeaders });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
    enabled: !!token,
  });

  // Subjects
  const { data: subjectsList = [] } = useQuery<any[]>({
    queryKey: ["teacher-subjects"],
    queryFn: async () => {
      const res = await fetch("/api/teacher/subjects", { headers: authHeaders });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
    enabled: !!token,
  });

  // Template tasks for selected subject
  const { data: templateTasks = [] } = useQuery<any[]>({
    queryKey: ["teacher-templates", selectedSubjectId],
    queryFn: async () => {
      const res = await fetch(`/api/teacher/subjects/${selectedSubjectId}/templates`, { headers: authHeaders });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
    enabled: !!token && !!selectedSubjectId,
  });

  // Assignment requests
  const { data: assignmentRequests = [] } = useQuery<any[]>({
    queryKey: ["teacher-assignment-requests"],
    queryFn: async () => {
      const res = await fetch("/api/teacher/assignment-requests", { headers: authHeaders });
      if (!res.ok) return [];
      return (await res.json()).data || [];
    },
    enabled: !!token,
  });

  // Assigned children
  const { data: assignedChildren = [] } = useQuery<any[]>({
    queryKey: ["teacher-assigned-children"],
    queryFn: async () => {
      const res = await fetch("/api/teacher/assigned-children", { headers: authHeaders });
      if (!res.ok) return [];
      return (await res.json()).data || [];
    },
    enabled: !!token,
  });

  // Help requests
  // Child reports query
  const { data: childReportsData, isLoading: isLoadingReports } = useQuery({
    queryKey: ["teacher-child-reports", reportsChildId],
    queryFn: async () => {
      const res = await fetch(`/api/teacher/child-reports/${reportsChildId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    },
    enabled: !!reportsChildId && showReportsDialog,
  });

  const { data: helpRequests = [] } = useQuery<any[]>({
    queryKey: ["teacher-help-requests"],
    queryFn: async () => {
      const res = await fetch("/api/teacher/help-requests", { headers: authHeaders });
      if (!res.ok) return [];
      return (await res.json()).data || [];
    },
    enabled: !!token,
  });

  useEffect(() => {
    if (!pendingHelpRequestId || !Array.isArray(helpRequests) || helpRequests.length === 0) return;

    const target = helpRequests.find((item: any) => String(item?.id) === String(pendingHelpRequestId));
    if (!target) return;

    setSelectedHelpRequest(target);

    setPendingHelpRequestId(null);
    setPendingOpenHelpChat(false);

    const cleaned = new URL(window.location.href);
    cleaned.searchParams.delete("helpRequestId");
    cleaned.searchParams.delete("openChat");
    window.history.replaceState({}, "", `${cleaned.pathname}${cleaned.search}`);
  }, [pendingHelpRequestId, pendingOpenHelpChat, helpRequests]);

  const { data: teacherHelpPaymentsData, isLoading: loadingTeacherHelpPayments } = useQuery<any>({
    queryKey: ["teacher-help-session-payments", helpPaymentsMonth],
    queryFn: async () => {
      const query = helpPaymentsMonth ? `?month=${encodeURIComponent(helpPaymentsMonth)}` : "";
      const res = await fetch(`/api/teacher/help-session-payments${query}`, { headers: authHeaders });
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      return json.data || {
        summary: { sessionsCount: 0, totalHelpPoints: 0, feedbackCount: 0, avgSessionRating: 0 },
        items: [],
      };
    },
    enabled: !!token,
  });

  const exportTeacherHelpPaymentsCsv = () => {
    const items = teacherHelpPaymentsData?.items || [];
    const lines = [
      ["session_id", "child_name", "parent_name", "points_amount", "feedback_rating", "resolved_at", "task_question"].join(","),
      ...items.map((item: any) => [
        item.id,
        `"${String(item.childName || "").replace(/"/g, '""')}"`,
        `"${String(item.parentName || "").replace(/"/g, '""')}"`,
        String(item.pointsAmount ?? 0),
        String(item.feedbackRating ?? ""),
        new Date(item.resolvedAt).toISOString(),
        `"${String(item.taskQuestion || "").replace(/"/g, '""')}"`,
      ].join(",")),
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `teacher_help_sessions_${helpPaymentsMonth || "all"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportTeacherHelpPaymentsPdf = () => {
    const items = teacherHelpPaymentsData?.items || [];
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    doc.setFontSize(14);
    doc.text("Teacher Help Sessions", 14, 14);
    doc.setFontSize(10);
    doc.text(`Month: ${helpPaymentsMonth || "all"}`, 14, 20);
    autoTable(doc, {
      startY: 25,
      head: [["Child", "Parent", "Points", "Rating", "Resolved At", "Question"]],
      body: items.map((item: any) => [
        item.childName || "",
        item.parentName || "",
        String(item.pointsAmount ?? 0),
        item.feedbackRating ? `${item.feedbackRating}/5` : "",
        item.resolvedAt ? new Date(item.resolvedAt).toLocaleString("ar-EG") : "",
        item.taskQuestion || "",
      ]),
      styles: { fontSize: 8 },
    });
    doc.save(`teacher_help_sessions_${helpPaymentsMonth || "all"}.pdf`);
  };

  const claimHelpRequest = useMutation({
    mutationFn: async (helpRequestId: string) => {
      const res = await fetch(`/api/teacher/help-requests/${helpRequestId}/claim`, {
        method: "PUT",
        headers: authHeaders,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "فشل استلام الطلب");
      return json;
    },
    onSuccess: (_data, helpRequestId) => {
      queryClient.invalidateQueries({ queryKey: ["teacher-help-requests"] });
      const current = helpRequests.find((r: any) => r.id === helpRequestId);
      if (current) {
        setSelectedHelpRequest({ ...current, canClaim: false, helperType: "teacher" });
      }
      toast({ title: "تم استلام طلب المساعدة" });
    },
    onError: (err: any) => toast({ title: err?.message || "فشل استلام الطلب", variant: "destructive" }),
  });

  // Filtered help requests based on status filter and search query
  const filteredHelpRequests = helpRequests.filter((hr: any) => {
    const matchesStatus = helpFilterStatus === "all" || hr.status === helpFilterStatus;
    const matchesSearch = !helpSearchQuery.trim() ||
      (hr.childName || "").toLowerCase().includes(helpSearchQuery.toLowerCase()) ||
      (hr.taskQuestion || "").toLowerCase().includes(helpSearchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // ===== Mutations =====

  const createTask = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/teacher/tasks", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed");
      }
      return (await res.json()).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-tasks"] });
      setShowTaskModal(false);
      resetTaskForm();
      toast({ title: t('teacherDashboard.taskAddedSuccess') });
    },
    onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await fetch(`/api/teacher/tasks/${id}`, {
        method: "PUT",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed");
      }
      return (await res.json()).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-tasks"] });
      setShowTaskModal(false);
      setEditingTask(null);
      resetTaskForm();
      toast({ title: t('teacherDashboard.taskUpdated') });
    },
    onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/teacher/tasks/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-tasks"] });
      toast({ title: t('teacherDashboard.taskDeleted') });
    },
  });

  const createPost = useMutation({
    mutationFn: async ({ content, mediaUrls, mediaTypes }: { content: string; mediaUrls: string[]; mediaTypes: string[] }) => {
      const res = await fetch("/api/teacher/posts", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ content, mediaUrls, mediaTypes }),
      });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-posts"] });
      setShowPostModal(false);
      setPostContent("");
      setPostMediaFiles([]);
      setPostMediaPreviews([]);
      toast({ title: t('teacherDashboard.postPublished') });
    },
  });

  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/teacher/posts/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-posts"] });
      toast({ title: t('teacherDashboard.postDeleted') });
    },
  });

  const requestWithdrawal = useMutation({
    mutationFn: async (amount: number) => {
      const res = await fetch("/api/teacher/withdrawals", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed");
      }
      return (await res.json()).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-balance"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-withdrawals"] });
      setShowWithdrawModal(false);
      setWithdrawAmount("");
      toast({ title: t('teacherDashboard.withdrawalRequestSent') });
    },
    onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
  });

  const createTaskFromTemplate = useMutation({
    mutationFn: async (data: { templateId: string; price: string; title?: string }) => {
      const res = await fetch("/api/teacher/create-task-from-template", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed");
      }
      return (await res.json()).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-tasks"] });
      setShowTemplateModal(false);
      toast({ title: t('teacherDashboard.taskFromTemplateSuccess') });
    },
    onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
  });

  const updateProfile = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/teacher/profile", {
        method: "PUT",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-profile"] });
      setProfileEditMode(false);
      toast({ title: t('teacherDashboard.profileUpdated') });
    },
    onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
  });

  const createPoll = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/teacher/polls", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed");
      return body.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-polls"] });
      setShowPollModal(false);
      resetPollForm();
      toast({ title: t('teacherDashboard.pollCreated') });
    },
    onError: (err: any) => toast({ title: err.message || t('teacherDashboard.pollCreateFailed'), variant: "destructive" }),
  });

  const updatePoll = useMutation({
    mutationFn: async ({ id, ...payload }: any) => {
      const res = await fetch(`/api/teacher/polls/${id}`, {
        method: "PUT",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed");
      return body.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-polls"] });
      toast({ title: t('teacherDashboard.pollUpdated') });
    },
    onError: (err: any) => toast({ title: err.message || t('teacherDashboard.updateFailed'), variant: "destructive" }),
  });

  const deletePoll = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/teacher/polls/${id}`, { method: "DELETE", headers: authHeaders });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed");
      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-polls"] });
      toast({ title: t('teacherDashboard.pollDeleted') });
    },
    onError: (err: any) => toast({ title: err.message || t('teacherDashboard.deleteFailed'), variant: "destructive" }),
  });

  // Respond to assignment request
  const respondToRequest = useMutation({
    mutationFn: async ({ id, status, rejectionReason }: { id: string; status: "accepted" | "rejected"; rejectionReason?: string }) => {
      const res = await fetch(`/api/teacher/assignment-requests/${id}/respond`, {
        method: "PUT",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ status, rejectionReason }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "فشل" }));
        throw new Error(err.message || "فشل");
      }
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["teacher-assignment-requests"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-assigned-children"] });
      setRespondingRequestId(null);
      setRejectionReason("");
      setShowRejectDialog(false);
      toast({ title: vars.status === "accepted" ? "تم قبول الطلب ✅" : "تم رفض الطلب" });
    },
    onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
  });

  // Send task to assigned child
  const sendTaskToChild = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/teacher/send-task-to-child", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "فشل" }));
        throw new Error(err.message || "فشل إرسال المهمة");
      }
      return res.json();
    },
    onSuccess: () => {
      setShowSendTaskModal(false);
      setSelectedChildForTask(null);
      setSendTaskForm({ question: "", pointsReward: "", answers: [{ id: "s1", text: "", isCorrect: true }, { id: "s2", text: "", isCorrect: false }] });
      toast({ title: "تم إرسال المهمة للطفل بنجاح ✅" });
    },
    onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
  });

  function resetPollForm() {
    setPollForm({
      question: "",
      options: [{ text: "", imageUrl: "" }, { text: "", imageUrl: "" }],
      allowMultiple: false,
      isAnonymous: false,
      isPinned: false,
      expiresAt: "",
    });
    setUploadingPollOptionIdx(null);
  }

  function handleSubmitPoll() {
    if (!pollForm.question.trim()) {
      toast({ title: t('teacherDashboard.pollQuestionRequired'), variant: "destructive" });
      return;
    }
    const validOptions = pollForm.options.filter((o) => o.text.trim());
    if (validOptions.length < 2) {
      toast({ title: t('teacherDashboard.minTwoOptionsRequired'), variant: "destructive" });
      return;
    }
    createPoll.mutate({
      question: pollForm.question.trim(),
      options: validOptions.map((o) => ({ text: o.text.trim(), ...(o.imageUrl ? { imageUrl: o.imageUrl } : {}) })),
      allowMultiple: pollForm.allowMultiple,
      isAnonymous: pollForm.isAnonymous,
      isPinned: pollForm.isPinned,
      expiresAt: pollForm.expiresAt || null,
    });
  }

  function resetTaskForm() {
    setTaskForm({
      title: "", question: "", explanation: "", subjectLabel: "", price: "",
      answers: [
        { id: "a1", text: "", isCorrect: true, imageUrl: undefined, videoUrl: undefined },
        { id: "a2", text: "", isCorrect: false, imageUrl: undefined, videoUrl: undefined },
        { id: "a3", text: "", isCorrect: false, imageUrl: undefined, videoUrl: undefined },
        { id: "a4", text: "", isCorrect: false, imageUrl: undefined, videoUrl: undefined },
      ],
    });
    setTaskImageFile(null);
    setTaskVideoFile(null);
    setTaskCoverFile(null);
    setTaskImagePreview(null);
    setTaskVideoPreview(null);
    setTaskCoverPreview(null);
    setAnswerMediaFiles({});
    setAnswerMediaPreviews({});
    setQuestionImageFiles([]);
    setQuestionImagePreviews([]);
  }

  function openEditTask(task: Task) {
    setEditingTask(task);
    setTaskForm({
      title: task.title || "",
      question: task.question,
      explanation: task.explanation || "",
      subjectLabel: task.subjectLabel || "",
      price: task.price,
      answers: task.answers.length > 0 ? task.answers.map(a => ({
        ...a,
        imageUrl: a.imageUrl || undefined,
        videoUrl: a.videoUrl || undefined,
      })) : [
        { id: "a1", text: "", isCorrect: true, imageUrl: undefined, videoUrl: undefined },
        { id: "a2", text: "", isCorrect: false, imageUrl: undefined, videoUrl: undefined },
        { id: "a3", text: "", isCorrect: false, imageUrl: undefined, videoUrl: undefined },
        { id: "a4", text: "", isCorrect: false, imageUrl: undefined, videoUrl: undefined },
      ],
    });
    setTaskImagePreview(task.imageUrl || null);
    setTaskVideoPreview(task.videoUrl || null);
    setTaskCoverPreview(task.coverImageUrl || null);
    setTaskImageFile(null);
    setTaskVideoFile(null);
    setTaskCoverFile(null);
    // Load answer media previews from existing data
    const previews: Record<string, { imageUrl?: string; videoUrl?: string }> = {};
    task.answers.forEach(a => {
      if (a.imageUrl || a.videoUrl) {
        previews[a.id] = { imageUrl: a.imageUrl, videoUrl: a.videoUrl };
      }
    });
    setAnswerMediaPreviews(previews);
    setAnswerMediaFiles({});
    // Load question images
    setQuestionImagePreviews(task.questionImages || []);
    setQuestionImageFiles([]);
    setShowTaskModal(true);
  }

  async function handleSubmitTask() {
    const filteredAnswers = taskForm.answers.filter(a => a.text.trim());
    if (!taskForm.question || !taskForm.price || filteredAnswers.length < 2) {
      toast({ title: t('teacherDashboard.taskFormValidation'), variant: "destructive" });
      return;
    }
    if (!filteredAnswers.some(a => a.isCorrect)) {
      toast({ title: t('teacherDashboard.correctAnswerRequired'), variant: "destructive" });
      return;
    }

    setTaskUploading(true);
    try {
      let imageUrl = editingTask?.imageUrl || null;
      let videoUrl = editingTask?.videoUrl || null;
      let coverImageUrl = editingTask?.coverImageUrl || null;

      if (taskImageFile && token) {
        imageUrl = await uploadFileForTeacher(taskImageFile, token, "task-image");
      }
      if (taskVideoFile && token) {
        videoUrl = await uploadFileForTeacher(taskVideoFile, token, "task-video");
      }
      if (taskCoverFile && token) {
        coverImageUrl = await uploadFileForTeacher(taskCoverFile, token, "task-cover");
      }

      // Upload answer media files
      const processedAnswers = await Promise.all(filteredAnswers.map(async (answer) => {
        const files = answerMediaFiles[answer.id];
        let answerImageUrl = answer.imageUrl || undefined;
        let answerVideoUrl = answer.videoUrl || undefined;

        if (files?.imageFile && token) {
          answerImageUrl = await uploadFileForTeacher(files.imageFile, token, `answer-img-${answer.id}`);
        }
        if (files?.videoFile && token) {
          answerVideoUrl = await uploadFileForTeacher(files.videoFile, token, `answer-vid-${answer.id}`);
        }

        return {
          id: answer.id,
          text: answer.text,
          isCorrect: answer.isCorrect,
          imageUrl: answerImageUrl,
          videoUrl: answerVideoUrl,
        };
      }));

      // Upload question images
      let questionImages: string[] = [...questionImagePreviews.filter(p => p.startsWith("http") || p.startsWith("/"))];
      if (questionImageFiles.length > 0 && token) {
        const uploaded = await Promise.all(
          questionImageFiles.map((f, i) => uploadFileForTeacher(f, token!, `question-img-${i}`))
        );
        questionImages = [...questionImages, ...uploaded];
      }

      const data: any = {
        title: taskForm.title || taskForm.question.substring(0, 60),
        question: taskForm.question,
        explanation: taskForm.explanation || null,
        subjectLabel: taskForm.subjectLabel || null,
        price: taskForm.price,
        answers: processedAnswers,
        imageUrl,
        videoUrl,
        coverImageUrl,
        questionImages,
      };

      if (editingTask) {
        updateTask.mutate({ id: editingTask.id, ...data });
      } else {
        createTask.mutate(data);
      }
    } catch (err: any) {
      toast({ title: err.message || t('teacherDashboard.uploadFilesFailed'), variant: "destructive" });
    } finally {
      setTaskUploading(false);
    }
  }

  async function handleSubmitPost() {
    if (!postContent.trim()) return;
    setPostUploading(true);
    try {
      const mediaUrls: string[] = [];
      const mediaTypes: string[] = [];
      for (const file of postMediaFiles) {
        if (token) {
          const url = await uploadFileForTeacher(file, token, "post-media");
          mediaUrls.push(url);
          mediaTypes.push(file.type.startsWith("video/") ? "video" : "image");
        }
      }
      createPost.mutate({ content: postContent, mediaUrls, mediaTypes });
    } catch (err: any) {
      toast({ title: err.message || t('teacherDashboard.uploadFilesFailed'), variant: "destructive" });
    } finally {
      setPostUploading(false);
    }
  }

  function handlePostMediaSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      if (file.type.startsWith("video/")) {
        // Check duration (max 30 seconds)
        const video = document.createElement("video");
        video.preload = "metadata";
        video.onloadedmetadata = () => {
          URL.revokeObjectURL(video.src);
          if (video.duration > 30) {
            toast({ title: t('teacherDashboard.videoMaxDuration'), variant: "destructive" });
            return;
          }
          setPostMediaFiles(prev => [...prev, file]);
          setPostMediaPreviews(prev => [...prev, { url: URL.createObjectURL(file), type: "video" }]);
        };
        video.src = URL.createObjectURL(file);
      } else {
        setPostMediaFiles(prev => [...prev, file]);
        setPostMediaPreviews(prev => [...prev, { url: URL.createObjectURL(file), type: "image" }]);
      }
    }
    e.target.value = "";
  }

  function removePostMedia(index: number) {
    setPostMediaFiles(prev => prev.filter((_, i) => i !== index));
    setPostMediaPreviews(prev => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  }

  function handleSelectTeacherImage(e: React.ChangeEvent<HTMLInputElement>, type: "avatar" | "cover") {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: t('teacherDashboard.imageOnlyPlease'), variant: "destructive" });
      return;
    }
    const url = URL.createObjectURL(file);
    setCropperImage(url);
    setCropperMode(type);
    setCropperOpen(true);
    e.target.value = "";
  }

  async function handleCroppedTeacherImage(blob: Blob) {
    if (!token) return;
    const type = cropperMode;
    const file = new File([blob], `teacher-${type}.jpg`, { type: "image/jpeg" });

    if (type === "avatar") setAvatarUploading(true);
    else setCoverUploading(true);

    try {
      const url = await uploadFileForTeacher(file, token, type);
      if (type === "avatar") {
        await updateProfile.mutateAsync({ avatarUrl: url });
      } else {
        await updateProfile.mutateAsync({ coverImageUrl: url });
      }
    } catch {
      toast({ title: type === "avatar" ? t('teacherDashboard.imageUploadFailed') : t('teacherDashboard.coverUploadFailed'), variant: "destructive" });
    } finally {
      if (type === "avatar") setAvatarUploading(false);
      else setCoverUploading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("teacherToken");
    localStorage.removeItem("teacherData");
    setLocation("/teacher/login");
  }

  if (!token) return null;
  const teacherOnboardingItems = [
    { id: "create-task", label: t("teacherDashboard.newTask") },
    { id: "publish-post", label: t("teacherDashboard.tabPosts") },
    { id: "review-wallet", label: t("teacherDashboard.tabWallet") },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" dir="rtl">
      <TeacherWebPushRegistrar />
      <TeacherMobilePushRegistrar />
      {/* Header */}
      <div className="bg-green-600 text-white p-3 sm:p-4">
        <div className="max-w-7xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
            ) : (
              <GraduationCap className="h-8 w-8 flex-shrink-0" />
            )}
            <div className="min-w-0">
              <h1 className="font-bold text-lg truncate">{profile?.name || teacherData.name}</h1>
              <p className="text-green-100 text-xs truncate">{t('teacherDashboard.headerTitle')}{profile?.schoolName || ""}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ShareMenu
              url={typeof window !== "undefined" ? `${window.location.origin}/teacher/${profile?.id || ""}` : ""}
              title={`${profile?.name || t('teacherDashboard.teacherFallbackName')} — Classify`}
              description={profile?.bio || t('teacherDashboard.shareDescription')}
              variant="ghost"
              className="text-white hover:bg-green-700"
              buttonLabel={t('teacherDashboard.share')}
            />
            <LanguageSelector />
            <TeacherNotificationBell />
            <AccountSwitcherDialog currentRole="teacher" className="text-white hover:bg-green-700" />
            <Button variant="ghost" size="icon" className="text-white hover:bg-green-700" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-3 sm:p-4 space-y-6">
        <RoleOnboardingChecklist storageKey="teacher" items={teacherOnboardingItems} />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <BookOpen className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold">{stats?.totalTasks || 0}</div>
              <div className="text-xs text-muted-foreground">{t('teacherDashboard.statsTasks')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <DollarSign className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <div className="text-2xl font-bold">{balance?.availableBalance || "0.00"}</div>
              <div className="text-xs text-muted-foreground">{t('teacherDashboard.statsAvailableBalance')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <div className="text-2xl font-bold">{stats?.totalOrders || 0}</div>
              <div className="text-xs text-muted-foreground">{t('teacherDashboard.statsOrders')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Star className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
              <div className="text-2xl font-bold">{stats?.avgRating || 0}</div>
              <div className="text-xs text-muted-foreground">{t('teacherDashboard.statsRating')} ({stats?.totalReviews || 0})</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 text-orange-600" />
              <div className="text-2xl font-bold">{stats?.totalHelpSessions || 0}</div>
              <div className="text-xs text-muted-foreground">جلسات المساعدة المكتملة</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
          <div className="overflow-x-auto pb-1">
            <TabsList className="inline-flex w-max min-w-full h-auto gap-1">
              <TabsTrigger className="whitespace-nowrap text-xs sm:text-sm" value="tasks">{t('teacherDashboard.tabTasks')}</TabsTrigger>
              <TabsTrigger className="whitespace-nowrap text-xs sm:text-sm" value="templates">{t('teacherDashboard.tabTemplates')}</TabsTrigger>
              <TabsTrigger className="relative whitespace-nowrap text-xs sm:text-sm" value="assignment-requests">
                طلبات التعيين
                {assignmentRequests.filter((r: any) => r.status === "pending").length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                    {assignmentRequests.filter((r: any) => r.status === "pending").length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger className="whitespace-nowrap text-xs sm:text-sm" value="assigned-children">طلابي</TabsTrigger>
              <TabsTrigger className="relative whitespace-nowrap text-xs sm:text-sm" value="help-requests">
                طلبات المساعدة
                {helpRequests.filter((r: any) => r.status === "active").length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                    {helpRequests.filter((r: any) => r.status === "active").length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger className="whitespace-nowrap text-xs sm:text-sm" value="orders">{t('teacherDashboard.tabOrders')}</TabsTrigger>
              <TabsTrigger className="whitespace-nowrap text-xs sm:text-sm" value="balance">{t('teacherDashboard.tabWallet')}</TabsTrigger>
              <TabsTrigger className="whitespace-nowrap text-xs sm:text-sm" value="posts">{t('teacherDashboard.tabPosts')}</TabsTrigger>
              <TabsTrigger className="whitespace-nowrap text-xs sm:text-sm" value="polls">{t('teacherDashboard.tabPolls')}</TabsTrigger>
              <TabsTrigger className="whitespace-nowrap text-xs sm:text-sm" value="profile">{t('teacherDashboard.tabProfile')}</TabsTrigger>
            </TabsList>
          </div>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">{t('teacherDashboard.manageTasks')}</h2>
              <Button onClick={() => { resetTaskForm(); setEditingTask(null); setShowTaskModal(true); }} className="bg-green-600">
                <Plus className="h-4 w-4 ml-1" />
                {t('teacherDashboard.newTask')}
              </Button>
            </div>

            {tasks.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">{t('teacherDashboard.noTasksYet')}</CardContent></Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {tasks.map((task: Task) => (
                  <Card key={task.id} className="overflow-hidden">
                    {task.coverImageUrl && (
                      <img src={task.coverImageUrl} alt="" className="w-full h-32 object-cover" />
                    )}
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          {task.title && <h3 className="font-bold text-sm">{task.title}</h3>}
                          <p className="text-xs text-muted-foreground mt-1">{task.question}</p>
                        </div>
                        <Badge variant={task.isActive ? "default" : "secondary"}>
                          {task.isActive ? t('teacherDashboard.active') : t('teacherDashboard.inactive')}
                        </Badge>
                      </div>
                      {task.subjectLabel && <Badge variant="outline" className="mt-2 text-xs">{task.subjectLabel}</Badge>}
                      <div className="mt-2 flex items-center gap-2 text-sm">
                        <span className="text-green-600 font-bold">{task.price} {t('teacherDashboard.currency')}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground">{task.purchaseCount} {t('teacherDashboard.purchases')}</span>
                        {task.imageUrl && <Image className="h-3 w-3 text-blue-500" />}
                        {task.videoUrl && <Video className="h-3 w-3 text-red-500" />}
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEditTask(task)}>
                          <Edit className="h-3 w-3 ml-1" />
                          {t('teacherDashboard.edit')}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => { if (confirm(t('teacherDashboard.confirmDeleteTask'))) deleteTask.mutate(task.id); }}>
                          <Trash2 className="h-3 w-3 ml-1" />
                          {t('teacherDashboard.delete')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            <h2 className="text-lg font-bold">{t('teacherDashboard.readyTemplates')}</h2>
            <p className="text-sm text-muted-foreground">{t('teacherDashboard.templateInstructions')}</p>

            <div className="flex flex-wrap gap-2">
              {subjectsList.map((subj: any) => (
                <Button
                  key={subj.id}
                  size="sm"
                  variant={selectedSubjectId === subj.id ? "default" : "outline"}
                  onClick={() => setSelectedSubjectId(subj.id)}
                  className="gap-1"
                >
                  <span>{subj.emoji}</span>
                  {subj.name}
                </Button>
              ))}
            </div>

            {selectedSubjectId && templateTasks.length === 0 && (
              <Card><CardContent className="p-6 text-center text-muted-foreground">{t('teacherDashboard.noTemplatesForSubject')}</CardContent></Card>
            )}

            {templateTasks.length > 0 && (
              <div className="grid md:grid-cols-2 gap-4">
                {templateTasks.map((tmpl: any) => (
                  <Card key={tmpl.id}>
                    <CardContent className="p-4">
                      <h3 className="font-bold text-sm">{tmpl.title || tmpl.question}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{tmpl.question}</p>
                      <div className="mt-2 text-xs text-muted-foreground">{tmpl.answers?.length || 0} {t('teacherDashboard.answers')} • {tmpl.pointsReward} {t('teacherDashboard.point')}</div>
                      <Button
                        size="sm"
                        className="mt-3 bg-green-600 gap-1"
                        onClick={() => {
                          setShowTemplateModal(true);
                          setTaskForm(f => ({
                            ...f,
                            title: tmpl.title || tmpl.question.substring(0, 60),
                            question: tmpl.question,
                            price: "",
                            subjectLabel: subjectsList.find((s: any) => s.id === tmpl.subjectId)?.name || "",
                          }));
                          setEditingTask(null);
                          // Store template ID for submission
                          (window as any).__selectedTemplateId = tmpl.id;
                        }}
                      >
                        <FileText className="h-3 w-3" />
                        {t('teacherDashboard.useTemplate')}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Assignment Requests Tab */}
          <TabsContent value="assignment-requests" className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-green-600" />
              طلبات تعيين من أولياء الأمور
            </h2>
            {assignmentRequests.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">
                <UserPlus className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p>لا توجد طلبات تعيين بعد</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-3">
                {assignmentRequests.map((req: any) => (
                  <Card key={req.id} className={req.status === "pending" ? "border-yellow-300 dark:border-yellow-700" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold">{req.parentName || "ولي أمر"}</span>
                            <Badge variant={req.status === "pending" ? "secondary" : req.status === "accepted" ? "default" : "destructive"}>
                              {req.status === "pending" ? "⏳ معلق" : req.status === "accepted" ? "✅ مقبول" : "❌ مرفوض"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            النقاط الشهرية: <strong className="text-green-600">{req.monthlyPoints}</strong> نقطة
                          </p>
                          <p className="text-sm text-muted-foreground">
                            لكل جلسة مساعدة: <strong className="text-orange-600">{req.perHelpPoints ?? 0}</strong> نقطة
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {req.children?.map((child: any) => (
                              <Badge key={child.id} variant="outline" className="text-xs gap-1">
                                👧 {child.name}
                              </Badge>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(req.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}
                          </p>
                        </div>
                        {req.status === "pending" && (
                          <div className="flex gap-2 shrink-0">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 gap-1"
                              onClick={() => respondToRequest.mutate({ id: String(req.id), status: "accepted" })}
                              disabled={respondToRequest.isPending}
                            >
                              <CheckCircle className="h-3 w-3" />
                              قبول
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="gap-1"
                              onClick={() => { setRespondingRequestId(String(req.id)); setShowRejectDialog(true); }}
                            >
                              <XCircle className="h-3 w-3" />
                              رفض
                            </Button>
                          </div>
                        )}
                      </div>
                      {req.rejectionReason && (
                        <p className="mt-2 text-sm text-red-600 bg-red-50 dark:bg-red-950 p-2 rounded">سبب الرفض: {req.rejectionReason}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Assigned Children Tab */}
          <TabsContent value="assigned-children" className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              طلابي المعينين
            </h2>
            {assignedChildren.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p>لا يوجد طلاب معينين بعد</p>
                <p className="text-xs mt-1">اقبل طلبات التعيين من أولياء الأمور لإضافة طلاب</p>
              </CardContent></Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {assignedChildren.map((child: any) => (
                  <Card key={child.childId} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        {child.avatarUrl ? (
                          <img src={child.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                            {child.childName?.[0] || "؟"}
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="font-bold">{child.childName}</h3>
                          <p className="text-xs text-muted-foreground">ولي الأمر: {child.parentName}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {child.monthlyPoints} نقطة/شهر
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {child.perHelpPoints ?? 0} نقطة/مساعدة
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-blue-600 hover:bg-blue-700 gap-1"
                          onClick={() => { setSelectedChildForTask(child); setShowSendTaskModal(true); }}
                        >
                          <Send className="h-3 w-3" />
                          إرسال مهمة
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-1"
                          onClick={() => {
                            setReportsChildId(child.childId);
                            setReportsChildName(child.childName);
                            setShowReportsDialog(true);
                          }}
                        >
                          <BarChart3 className="h-3 w-3" />
                          التقارير
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Help Requests Tab */}
          <TabsContent value="help-requests" className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-orange-500" />
                طلبات المساعدة
              </h2>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={helpFilterStatus === "all" ? "default" : "outline"}
                  onClick={() => setHelpFilterStatus("all")}
                  className="text-xs h-7"
                >
                  الكل ({helpRequests.length})
                </Button>
                <Button
                  size="sm"
                  variant={helpFilterStatus === "active" ? "default" : "outline"}
                  onClick={() => setHelpFilterStatus("active")}
                  className="text-xs h-7"
                >
                  🔴 نشط ({helpRequests.filter((hr: any) => hr.status === "active").length})
                </Button>
                <Button
                  size="sm"
                  variant={helpFilterStatus === "resolved" ? "default" : "outline"}
                  onClick={() => setHelpFilterStatus("resolved")}
                  className="text-xs h-7"
                >
                  ✅ تم الحل ({helpRequests.filter((hr: any) => hr.status === "resolved").length})
                </Button>
              </div>
            </div>
            {/* Search */}
            <div className="relative">
              <Input
                placeholder="🔍 بحث باسم الطفل أو السؤال..."
                value={helpSearchQuery}
                onChange={(e) => setHelpSearchQuery(e.target.value)}
                className="h-9 text-sm"
                dir="rtl"
              />
            </div>
            {filteredHelpRequests.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">
                <HelpCircle className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p>لا توجد طلبات مساعدة</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-3">
                {filteredHelpRequests.map((hr: any) => (
                  <Card key={hr.id} className={hr.status === "active" ? "border-orange-300 dark:border-orange-700" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-sm">🧒 {hr.childName || "طفل"}</span>
                            <Badge variant={hr.status === "active" ? "secondary" : "default"}>
                              {hr.status === "active" ? "🔴 نشط" : "✅ تم الحل"}
                            </Badge>
                          </div>
                          <p className="text-sm mt-1">📝 {hr.taskQuestion}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(hr.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        {hr.canClaim ? (
                          <Button
                            size="sm"
                            className="gap-1 bg-orange-600 hover:bg-orange-700"
                            disabled={claimHelpRequest.isPending}
                            onClick={() => claimHelpRequest.mutate(hr.id)}
                          >
                            {claimHelpRequest.isPending ? <Clock className="h-3 w-3 animate-spin" /> : <HelpCircle className="h-3 w-3" />}
                            استلام المساعدة
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="gap-1"
                            onClick={() => setSelectedHelpRequest(hr)}
                          >
                            <MessageSquare className="h-3 w-3" />
                            فتح المحادثة
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            <h2 className="text-lg font-bold">{t('teacherDashboard.ordersHeading')}</h2>
            {orders.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">{t('teacherDashboard.noOrdersYet')}</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {orders.map((order: any) => (
                  <Card key={order.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-sm">{order.taskQuestion || t('teacherDashboard.taskFallback')}</h3>
                          <p className="text-xs text-muted-foreground">{t('teacherDashboard.buyer')} {order.childName || t('teacherDashboard.studentFallback')}</p>
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-green-600">{order.teacherEarningAmount} {t('teacherDashboard.currency')}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            {order.isSettled ? (
                              <><CheckCircle className="h-3 w-3 text-green-600" /> {t('teacherDashboard.settled')}</>
                            ) : (
                              <><Clock className="h-3 w-3 text-yellow-600" /> {t('teacherDashboard.pending')}</>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Balance Tab */}
          <TabsContent value="balance" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-sm text-muted-foreground">{t('teacherDashboard.availableBalance')}</div>
                  <div className="text-2xl font-bold text-green-600">{balance?.availableBalance || "0.00"}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-sm text-muted-foreground">{t('teacherDashboard.pendingBalance')}</div>
                  <div className="text-2xl font-bold text-yellow-600">{balance?.pendingBalance || "0.00"}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-sm text-muted-foreground">{t('teacherDashboard.totalWithdrawn')}</div>
                  <div className="text-2xl font-bold">{balance?.totalWithdrawnAmount || "0.00"}</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-sm text-muted-foreground">جلسات المساعدة</div>
                  <div className="text-2xl font-bold">{teacherHelpPaymentsData?.summary?.sessionsCount ?? 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-sm text-muted-foreground">إجمالي نقاط المساعدة</div>
                  <div className="text-2xl font-bold text-orange-600">{teacherHelpPaymentsData?.summary?.totalHelpPoints ?? 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-sm text-muted-foreground">عدد التقييمات</div>
                  <div className="text-2xl font-bold">{teacherHelpPaymentsData?.summary?.feedbackCount ?? 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-sm text-muted-foreground">متوسط تقييم الجلسات</div>
                  <div className="text-2xl font-bold text-yellow-600">{Number(teacherHelpPaymentsData?.summary?.avgSessionRating ?? 0).toFixed(1)}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="p-4 flex flex-wrap items-center gap-2">
                <Input
                  type="month"
                  value={helpPaymentsMonth}
                  onChange={(e) => setHelpPaymentsMonth(e.target.value)}
                  className="w-44"
                />
                <Button size="sm" variant="outline" onClick={exportTeacherHelpPaymentsCsv}>
                  <Download className="h-4 w-4 ml-1" /> CSV
                </Button>
                <Button size="sm" variant="outline" onClick={exportTeacherHelpPaymentsPdf}>
                  <Download className="h-4 w-4 ml-1" /> PDF
                </Button>
              </CardContent>
            </Card>

            <div className="flex justify-between items-center">
              <h3 className="font-bold">{t('teacherDashboard.withdrawalRequests')}</h3>
              <Button onClick={() => setShowWithdrawModal(true)} className="bg-green-600">
                <ArrowDownToLine className="h-4 w-4 ml-1" />
                {t('teacherDashboard.requestWithdrawal')}
              </Button>
            </div>

            {withdrawals.length === 0 ? (
              <Card><CardContent className="p-6 text-center text-muted-foreground">{t('teacherDashboard.noWithdrawals')}</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {withdrawals.map((w: any) => (
                  <Card key={w.id}>
                    <CardContent className="p-4 flex justify-between items-center">
                      <div>
                        <p className="font-bold">{w.amount} {t('teacherDashboard.currency')}</p>
                        <p className="text-xs text-muted-foreground">
                          {t('teacherDashboard.net')} {w.netAmount} {t('teacherDashboard.currency')} ({t('teacherDashboard.commission')} {w.withdrawalCommissionPct}%)
                        </p>
                      </div>
                      <Badge variant={w.status === "approved" ? "default" : w.status === "rejected" ? "destructive" : "secondary"}>
                        {w.status === "approved" ? t('teacherDashboard.approved') : w.status === "rejected" ? t('teacherDashboard.rejected') : t('teacherDashboard.underReview')}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="font-bold text-sm">تفاصيل جلسات المساعدة المحاسبية</div>
                {loadingTeacherHelpPayments ? (
                  <div className="text-center py-4"><Clock className="h-5 w-5 animate-spin mx-auto" /></div>
                ) : (teacherHelpPaymentsData?.items?.length ?? 0) === 0 ? (
                  <div className="text-sm text-muted-foreground">لا توجد جلسات مساعدة مدفوعة بعد.</div>
                ) : (
                  <div className="space-y-2">
                    {teacherHelpPaymentsData.items.slice(0, 8).map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between border rounded-lg px-3 py-2 text-sm">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{item.childName || "طفل"}</p>
                          <p className="text-xs text-muted-foreground truncate">{item.taskQuestion || "جلسة مساعدة"}</p>
                        </div>
                        <div className="text-left">
                          <div className="font-bold text-orange-600">{item.pointsAmount} نقطة</div>
                          <div className="text-xs text-muted-foreground">
                            {item.feedbackRating ? `⭐ ${item.feedbackRating}/5` : "بدون تقييم"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Posts Tab */}
          <TabsContent value="posts" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">{t('teacherDashboard.postsHeading')}</h2>
              <Button onClick={() => { setPostContent(""); setPostMediaFiles([]); setPostMediaPreviews([]); setShowPostModal(true); }} className="bg-green-600">
                <Plus className="h-4 w-4 ml-1" />
                {t('teacherDashboard.newPost')}
              </Button>
            </div>
            {posts.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">{t('teacherDashboard.noPostsYet')}</CardContent></Card>
            ) : (
              <div className="space-y-4">
                {[...posts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((post: Post) => (
                  <Card key={post.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <p className="text-sm whitespace-pre-wrap flex-1">{post.content}</p>
                        <Button size="sm" variant="ghost" onClick={() => { if (confirm(t('teacherDashboard.confirmDeleteShort'))) deletePost.mutate(post.id); }}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                      {post.mediaUrls?.length > 0 && (
                        <div className="mt-2 flex gap-2 flex-wrap">
                          {post.mediaUrls.map((url: string, i: number) => {
                            const mediaType = post.mediaTypes?.[i];
                            if (mediaType === "video") {
                              return <video key={i} src={url} controls className="w-48 h-32 rounded object-cover" />;
                            }
                            return <img key={i} src={url} alt="" className="w-24 h-24 rounded object-cover" />;
                          })}
                        </div>
                      )}
                      <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                        <span>❤️ {post.likesCount}</span>
                        <span>💬 {post.commentsCount}</span>
                        <span>{new Date(post.createdAt).toLocaleString("ar-EG", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Polls Tab */}
          <TabsContent value="polls" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">{t('teacherDashboard.pollsHeading')}</h2>
              <Button onClick={() => { resetPollForm(); setShowPollModal(true); }} className="bg-green-600">
                <Plus className="h-4 w-4 ml-1" />
                {t('teacherDashboard.createPoll')}
              </Button>
            </div>

            {teacherPolls.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">{t('teacherDashboard.noPollsYet')}</CardContent></Card>
            ) : (
              <div className="space-y-4">
                {[...teacherPolls].sort((a: any, b: any) => {
                  if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
                  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                }).map((poll: any) => {
                  const isExpired = poll.expiresAt && new Date(poll.expiresAt) < new Date();
                  return (
                    <Card key={poll.id} className={`overflow-hidden ${poll.isPinned ? "border-green-400 border-2" : ""}`}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-green-600" />
                            <h3 className="font-bold text-base">{poll.question}</h3>
                          </div>
                          <div className="flex items-center gap-1">
                            {poll.isPinned && <Badge variant="secondary">📌 {t('teacherDashboard.pinned')}</Badge>}
                            {poll.isClosed && <Badge variant="destructive">{t('teacherDashboard.closed')}</Badge>}
                            {isExpired && !poll.isClosed && <Badge variant="outline">{t('teacherDashboard.expired')}</Badge>}
                            {poll.isAnonymous && <Badge variant="outline">{t('teacherDashboard.anonymous')}</Badge>}
                            {poll.allowMultiple && <Badge variant="outline">{t('teacherDashboard.multiple')}</Badge>}
                          </div>
                        </div>

                        <div className="space-y-2">
                          {(poll.options || []).map((opt: any) => {
                            const count = poll.optionCounts?.[opt.id] || 0;
                            const pct = poll.votersCount > 0 ? Math.round((count / poll.votersCount) * 100) : 0;
                            return (
                              <div key={opt.id} className="relative">
                                {opt.imageUrl && (
                                  <img src={opt.imageUrl} alt={opt.text} className="w-full h-32 object-cover rounded-lg mb-1" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                                )}
                                <div className="flex items-center justify-between text-sm mb-1">
                                  <span className="font-medium">{opt.text}</span>
                                  <span className="text-muted-foreground">{count} ({pct}%)</span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3 overflow-hidden">
                                  <div
                                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="text-xs text-muted-foreground flex items-center gap-3">
                            <span>👥 {poll.votersCount} {t('teacherDashboard.voters')}</span>
                            <span>{new Date(poll.createdAt).toLocaleString("ar-EG", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                            {poll.expiresAt && <span>⏰ {new Date(poll.expiresAt).toLocaleString("ar-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updatePoll.mutate({ id: poll.id, isPinned: !poll.isPinned })}
                              title={poll.isPinned ? t('teacherDashboard.unpin') : t('teacherDashboard.pin')}
                            >
                              {poll.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updatePoll.mutate({ id: poll.id, isClosed: !poll.isClosed })}
                              title={poll.isClosed ? t('teacherDashboard.openPoll') : t('teacherDashboard.closePoll')}
                            >
                              {poll.isClosed ? <Unlock className="h-4 w-4 text-green-600" /> : <Lock className="h-4 w-4 text-orange-600" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { if (confirm(t('teacherDashboard.confirmDeletePoll'))) deletePoll.mutate(poll.id); }}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            {/* Cover Image */}
            <Card className="overflow-hidden">
              <div className="relative h-40 sm:h-48 md:h-56 bg-gradient-to-l from-green-500 to-green-700">
                {profile?.coverImageUrl && (
                  <img src={profile.coverImageUrl} alt="" className="w-full h-full object-cover" />
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute bottom-2 left-2 gap-1 text-xs"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={coverUploading}
                >
                  <Camera className="h-3 w-3" />
                  {coverUploading ? t('teacherDashboard.uploading') : t('teacherDashboard.changeCover')}
                </Button>
                <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleSelectTeacherImage(e, "cover")} />
              </div>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start gap-4">
                  <div className="relative -mt-12 sm:-mt-14">
                    {profile?.avatarUrl ? (
                      <img src={profile.avatarUrl} alt="" className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-white object-cover shadow-lg bg-white" />
                    ) : (
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-white bg-green-100 flex items-center justify-center shadow-lg">
                        <User className="h-8 w-8 sm:h-10 sm:w-10 text-green-600" />
                      </div>
                    )}
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={avatarUploading}
                    >
                      <Camera className="h-3 w-3" />
                    </Button>
                    <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleSelectTeacherImage(e, "avatar")} />
                  </div>
                  <div className="flex-1 pt-2">
                    <h2 className="text-xl font-bold">{profile?.name}</h2>
                    <p className="text-sm text-muted-foreground">{profile?.subject || t('teacherDashboard.noSubjectSet')}</p>
                    <p className="text-sm text-muted-foreground">{profile?.schoolName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`/teacher/${profile?.id}`, "_blank")}
                      className="gap-1"
                    >
                      <User className="h-3 w-3" />
                      {t('teacherDashboard.viewPublicPage')}
                    </Button>
                    <ShareMenu
                      url={typeof window !== "undefined" ? `${window.location.origin}/teacher/${profile?.id || ""}` : ""}
                      title={`${profile?.name || t('teacherDashboard.teacherFallbackName')} — Classify`}
                      description={profile?.bio || ""}
                    />
                    <Button
                      size="sm"
                      variant={profileEditMode ? "default" : "outline"}
                      onClick={() => {
                        if (!profileEditMode && profile) {
                          setProfileForm({
                            name: profile.name || "",
                            bio: profile.bio || "",
                            subject: profile.subject || "",
                            yearsExperience: profile.yearsExperience || 0,
                            socialLinks: profile.socialLinks || {},
                          });
                        }
                        setProfileEditMode(!profileEditMode);
                      }}
                      className="gap-1"
                    >
                      <Settings className="h-3 w-3" />
                      {profileEditMode ? t('teacherDashboard.cancel') : t('teacherDashboard.edit')}
                    </Button>
                  </div>
                </div>

                {profile?.bio && !profileEditMode && (
                  <p className="mt-3 text-sm text-muted-foreground">{profile.bio}</p>
                )}

                {/* Profile Stats */}
                {!profileEditMode && (
                  <div className="mt-4 grid grid-cols-4 gap-3 text-center">
                    <div><div className="text-lg font-bold">{profile?.stats?.tasksCount || 0}</div><div className="text-xs text-muted-foreground">{t('teacherDashboard.statTask')}</div></div>
                    <div><div className="text-lg font-bold">{profile?.stats?.studentsCount || 0}</div><div className="text-xs text-muted-foreground">{t('teacherDashboard.statStudent')}</div></div>
                    <div><div className="text-lg font-bold">{profile?.stats?.postsCount || 0}</div><div className="text-xs text-muted-foreground">{t('teacherDashboard.statPost')}</div></div>
                    <div><div className="text-lg font-bold">{profile?.stats?.avgRating || 0}</div><div className="text-xs text-muted-foreground">{t('teacherDashboard.statRating')}</div></div>
                  </div>
                )}

                {/* Social Links Display */}
                {!profileEditMode && profile?.socialLinks && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {Object.entries(profile.socialLinks).filter(([, v]) => v).map(([key, value]) => (
                      <a key={key} href={value as string} target="_blank" rel="noopener noreferrer"
                        className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center gap-1 hover:bg-gray-200">
                        <Link2 className="h-3 w-3" />
                        {key}
                      </a>
                    ))}
                  </div>
                )}

                {/* Edit Form */}
                {profileEditMode && (
                  <div className="mt-4 space-y-3">
                    <div>
                      <Label>{t('teacherDashboard.name')}</Label>
                      <Input value={profileForm.name} onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div>
                      <Label>{t('teacherDashboard.aboutMe')}</Label>
                      <Textarea value={profileForm.bio} onChange={e => setProfileForm(f => ({ ...f, bio: e.target.value }))} />
                    </div>
                    <div>
                      <Label>{t('teacherDashboard.subject')}</Label>
                      <Input value={profileForm.subject} onChange={e => setProfileForm(f => ({ ...f, subject: e.target.value }))} />
                    </div>
                    <div>
                      <Label>{t('teacherDashboard.yearsExperience')}</Label>
                      <Input type="number" value={profileForm.yearsExperience} onChange={e => setProfileForm(f => ({ ...f, yearsExperience: parseInt(e.target.value) || 0 }))} />
                    </div>
                    <div>
                      <Label>{t('teacherDashboard.socialMedia')}</Label>
                      <div className="space-y-2 mt-1">
                        {["facebook", "instagram", "twitter", "youtube", "tiktok", "website"].map(platform => (
                          <div key={platform} className="flex items-center gap-2">
                            <span className="text-xs w-16 capitalize">{platform}</span>
                            <Input
                              placeholder={t('teacherDashboard.linkPlaceholder', { platform })}
                              value={profileForm.socialLinks[platform] || ""}
                              onChange={e => setProfileForm(f => ({
                                ...f,
                                socialLinks: { ...f.socialLinks, [platform]: e.target.value },
                              }))}
                              className="text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button
                      className="w-full bg-green-600"
                      onClick={() => updateProfile.mutate(profileForm)}
                      disabled={updateProfile.isPending}
                    >
                      {t('teacherDashboard.saveChanges')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Task Modal - Enhanced with media */}
      <Dialog open={showTaskModal} onOpenChange={setShowTaskModal}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTask ? t('teacherDashboard.editTask') : t('teacherDashboard.newTask')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t('teacherDashboard.taskTitle')}</Label>
              <Input value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} placeholder={t('teacherDashboard.taskTitlePlaceholder')} />
            </div>
            <div>
              <Label>{t('teacherDashboard.questionLabel')}</Label>
              <Textarea value={taskForm.question} onChange={e => setTaskForm(f => ({ ...f, question: e.target.value }))} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>{t('teacherDashboard.priceLabel')}</Label>
                <Input type="number" step="0.01" value={taskForm.price} onChange={e => setTaskForm(f => ({ ...f, price: e.target.value }))} />
              </div>
              <div>
                <Label>{t('teacherDashboard.subjectCategory')}</Label>
                <Input value={taskForm.subjectLabel} onChange={e => setTaskForm(f => ({ ...f, subjectLabel: e.target.value }))} placeholder={t('teacherDashboard.subjectPlaceholder')} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label>{t('teacherDashboard.answersLabel')}</Label>
                <span className="text-xs text-muted-foreground">{taskForm.answers.length} {t('teacherDashboard.answersCount')}</span>
              </div>
              <div className="space-y-3 mt-1">
                {taskForm.answers.map((answer, index) => (
                  <div key={answer.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correctAnswer"
                        checked={answer.isCorrect}
                        onChange={() => {
                          setTaskForm(f => ({
                            ...f,
                            answers: f.answers.map((a, i) => ({ ...a, isCorrect: i === index })),
                          }));
                        }}
                        className="accent-green-600"
                      />
                      <Input
                        placeholder={t('teacherDashboard.answerPlaceholder', { n: index + 1 })}
                        value={answer.text}
                        onChange={e => {
                          setTaskForm(f => ({
                            ...f,
                            answers: f.answers.map((a, i) => i === index ? { ...a, text: e.target.value } : a),
                          }));
                        }}
                        className="flex-1"
                      />
                      {taskForm.answers.length > 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            const removedId = answer.id;
                            setTaskForm(f => ({
                              ...f,
                              answers: f.answers.filter((_, i) => i !== index).map((a, i) => ({
                                ...a,
                                isCorrect: f.answers.filter((_, j) => j !== index).some(x => x.isCorrect) ? a.isCorrect : i === 0,
                              })),
                            }));
                            setAnswerMediaFiles(prev => { const n = { ...prev }; delete n[removedId]; return n; });
                            setAnswerMediaPreviews(prev => { const n = { ...prev }; delete n[removedId]; return n; });
                          }}
                          className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950"
                          title={t('teacherDashboard.deleteAnswer')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    {/* Answer media row */}
                    <div className="flex items-center gap-2 mr-6">
                      {/* Answer Image */}
                      {(answerMediaPreviews[answer.id]?.imageUrl || answer.imageUrl) ? (
                        <div className="relative">
                          <img src={answerMediaPreviews[answer.id]?.imageUrl || answer.imageUrl} alt="" className="w-14 h-14 rounded object-cover" />
                          <button onClick={() => {
                            setAnswerMediaPreviews(p => { const n = { ...p }; if (n[answer.id]) { delete n[answer.id].imageUrl; } return n; });
                            setAnswerMediaFiles(f => { const n = { ...f }; if (n[answer.id]) { delete n[answer.id].imageFile; } return n; });
                            setTaskForm(f => ({ ...f, answers: f.answers.map((a, i) => i === index ? { ...a, imageUrl: undefined } : a) }));
                          }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1" aria-label="Remove answer image"><X className="h-2 w-2" /></button>
                        </div>
                      ) : (
                        <label className="flex items-center gap-1 px-2 py-1 border border-dashed rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 text-xs text-muted-foreground">
                          <Image className="h-3 w-3" />
                          {t('teacherDashboard.image')}
                          <input type="file" accept="image/*" className="hidden" onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setAnswerMediaFiles(prev => ({ ...prev, [answer.id]: { ...prev[answer.id], imageFile: file } }));
                              setAnswerMediaPreviews(prev => ({ ...prev, [answer.id]: { ...prev[answer.id], imageUrl: URL.createObjectURL(file) } }));
                            }
                          }} />
                        </label>
                      )}
                      {/* Answer Video */}
                      {(answerMediaPreviews[answer.id]?.videoUrl || answer.videoUrl) ? (
                        <div className="relative">
                          <video src={answerMediaPreviews[answer.id]?.videoUrl || answer.videoUrl} className="w-14 h-14 rounded object-cover" />
                          <button onClick={() => {
                            setAnswerMediaPreviews(p => { const n = { ...p }; if (n[answer.id]) { delete n[answer.id].videoUrl; } return n; });
                            setAnswerMediaFiles(f => { const n = { ...f }; if (n[answer.id]) { delete n[answer.id].videoFile; } return n; });
                            setTaskForm(f => ({ ...f, answers: f.answers.map((a, i) => i === index ? { ...a, videoUrl: undefined } : a) }));
                          }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1" aria-label="Remove answer video"><X className="h-2 w-2" /></button>
                        </div>
                      ) : (
                        <label className="flex items-center gap-1 px-2 py-1 border border-dashed rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 text-xs text-muted-foreground">
                          <Video className="h-3 w-3" />
                          {t('teacherDashboard.video')}
                          <input type="file" accept="video/*" className="hidden" onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setAnswerMediaFiles(prev => ({ ...prev, [answer.id]: { ...prev[answer.id], videoFile: file } }));
                              setAnswerMediaPreviews(prev => ({ ...prev, [answer.id]: { ...prev[answer.id], videoUrl: URL.createObjectURL(file) } }));
                            }
                          }} />
                        </label>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {taskForm.answers.length < 8 && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-2 w-full gap-1 text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-950"
                  onClick={() => {
                    const newId = `a${Date.now()}`;
                    setTaskForm(f => ({
                      ...f,
                      answers: [...f.answers, { id: newId, text: "", isCorrect: false, imageUrl: undefined, videoUrl: undefined }],
                    }));
                  }}
                >
                  <Plus className="h-3 w-3" />
                  {t('teacherDashboard.addAnswer')}
                </Button>
              )}
            </div>
            <div>
              <Label>{t('teacherDashboard.explanationLabel')}</Label>
              <Textarea value={taskForm.explanation} onChange={e => setTaskForm(f => ({ ...f, explanation: e.target.value }))} />
            </div>

            {/* Question Images */}
            <div className="border-t pt-3">
              <Label className="text-sm font-bold">{t('teacherDashboard.questionImages')}</Label>
              <p className="text-xs text-muted-foreground">{t('teacherDashboard.questionImagesHint')}</p>
              <div className="flex gap-2 flex-wrap mt-2">
                {questionImagePreviews.map((url, i) => (
                  <div key={i} className="relative">
                    <img src={url} alt="" className="w-20 h-20 rounded object-cover" />
                    <button onClick={() => {
                      setQuestionImagePreviews(p => p.filter((_, idx) => idx !== i));
                      // If it's a local file preview, also remove from files
                      if (url.startsWith("blob:")) {
                        const localIndex = i - questionImagePreviews.filter((u, idx) => idx < i && !u.startsWith("blob:")).length;
                        setQuestionImageFiles(f => f.filter((_, idx) => idx !== localIndex));
                        URL.revokeObjectURL(url);
                      }
                    }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1" aria-label="Remove question image">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <label className="flex flex-col items-center justify-center w-20 h-20 border-2 border-dashed rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                  <Plus className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{t('teacherDashboard.add')}</span>
                  <input ref={questionImagesInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) {
                      setQuestionImageFiles(prev => [...prev, ...files]);
                      setQuestionImagePreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
                    }
                  }} />
                </label>
              </div>
            </div>

            {/* Media Uploads */}
            <div className="border-t pt-3">
              <Label className="text-sm font-bold">{t('teacherDashboard.media')}</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                {/* Cover Image */}
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">{t('teacherDashboard.mainImage')}</p>
                  {taskCoverPreview ? (
                    <div className="relative">
                      <img src={taskCoverPreview} alt="" className="w-full h-20 rounded object-cover" />
                      <button onClick={() => { setTaskCoverFile(null); setTaskCoverPreview(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1" aria-label="Remove cover image">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center gap-1 p-3 border-2 border-dashed rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                      <Image className="h-5 w-5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{t('teacherDashboard.cover')}</span>
                      <input type="file" accept="image/*" className="hidden" onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) { setTaskCoverFile(f); setTaskCoverPreview(URL.createObjectURL(f)); }
                      }} />
                    </label>
                  )}
                </div>
                {/* Task Image */}
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">{t('teacherDashboard.imageUpload')}</p>
                  {taskImagePreview ? (
                    <div className="relative">
                      <img src={taskImagePreview} alt="" className="w-full h-20 rounded object-cover" />
                      <button onClick={() => { setTaskImageFile(null); setTaskImagePreview(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1" aria-label="Remove task image">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center gap-1 p-3 border-2 border-dashed rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                      <Image className="h-5 w-5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{t('teacherDashboard.imageUpload')}</span>
                      <input type="file" accept="image/*" className="hidden" onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) { setTaskImageFile(f); setTaskImagePreview(URL.createObjectURL(f)); }
                      }} />
                    </label>
                  )}
                </div>
                {/* Task Video */}
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">{t('teacherDashboard.videoUpload')}</p>
                  {taskVideoPreview ? (
                    <div className="relative">
                      <video src={taskVideoPreview} className="w-full h-20 rounded object-cover" />
                      <button onClick={() => { setTaskVideoFile(null); setTaskVideoPreview(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1" aria-label="Remove task video">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center gap-1 p-3 border-2 border-dashed rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                      <Video className="h-5 w-5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{t('teacherDashboard.videoUpload')}</span>
                      <input type="file" accept="video/*" className="hidden" onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) { setTaskVideoFile(f); setTaskVideoPreview(URL.createObjectURL(f)); }
                      }} />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskModal(false)}>{t('teacherDashboard.cancelTask')}</Button>
            <Button className="bg-green-600" onClick={handleSubmitTask} disabled={taskUploading}>
              {taskUploading ? t('teacherDashboard.uploading') : editingTask ? t('teacherDashboard.update') : t('teacherDashboard.add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Task Modal */}
      <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('teacherDashboard.createFromTemplate')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="p-3 bg-green-50 dark:bg-green-950 rounded">
              <p className="text-sm font-bold">{taskForm.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{taskForm.question}</p>
            </div>
            <div>
              <Label>{t('teacherDashboard.templatePriceLabel')}</Label>
              <Input type="number" step="0.01" value={taskForm.price} onChange={e => setTaskForm(f => ({ ...f, price: e.target.value }))} placeholder={t('teacherDashboard.templatePricePlaceholder')} />
            </div>
            <div>
              <Label>{t('teacherDashboard.templateTitleLabel')}</Label>
              <Input value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateModal(false)}>{t('teacherDashboard.cancelTemplate')}</Button>
            <Button className="bg-green-600" onClick={() => {
              if (!taskForm.price) {
                toast({ title: t('teacherDashboard.priceRequired'), variant: "destructive" });
                return;
              }
              createTaskFromTemplate.mutate({
                templateId: (window as any).__selectedTemplateId,
                price: taskForm.price,
                title: taskForm.title,
              });
            }} disabled={createTaskFromTemplate.isPending}>
              {createTaskFromTemplate.isPending ? t('teacherDashboard.creating') : t('teacherDashboard.createTask')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Post Modal - Enhanced with media */}
      <Dialog open={showPostModal} onOpenChange={setShowPostModal}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader><DialogTitle>{t('teacherDashboard.newPostTitle')}</DialogTitle></DialogHeader>
          <Textarea placeholder={t('teacherDashboard.postPlaceholder')} value={postContent} onChange={e => setPostContent(e.target.value)} className="min-h-[100px]" />

          {/* Media previews */}
          {postMediaPreviews.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {postMediaPreviews.map((media, i) => (
                <div key={i} className="relative">
                  {media.type === "video" ? (
                    <video src={media.url} className="w-20 h-20 rounded object-cover" />
                  ) : (
                    <img src={media.url} alt="" className="w-20 h-20 rounded object-cover" />
                  )}
                  <button onClick={() => removePostMedia(i)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1" aria-label="Remove media">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => postMediaInputRef.current?.click()} className="gap-1">
              <Image className="h-4 w-4" />
              {t('teacherDashboard.postImage')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "video/*";
              input.onchange = (e: any) => handlePostMediaSelect(e);
              input.click();
            }} className="gap-1">
              <Video className="h-4 w-4" />
              {t('teacherDashboard.postVideo')}
            </Button>
            <input ref={postMediaInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePostMediaSelect} />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPostModal(false)}>{t('teacherDashboard.cancelPost')}</Button>
            <Button className="bg-green-600" onClick={handleSubmitPost} disabled={!postContent.trim() || postUploading || createPost.isPending}>
              {postUploading ? t('teacherDashboard.uploading') : t('teacherDashboard.publish')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Poll Creation Modal */}
      <Dialog open={showPollModal} onOpenChange={setShowPollModal}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t('teacherDashboard.createNewPoll')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('teacherDashboard.pollQuestionLabel')}</Label>
              <Input
                placeholder={t('teacherDashboard.pollQuestionPlaceholder')}
                value={pollForm.question}
                onChange={(e) => setPollForm((f) => ({ ...f, question: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('teacherDashboard.pollOptionsLabel')}</Label>
              {pollForm.options.map((opt, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex gap-2">
                    <Input
                      placeholder={t('teacherDashboard.pollOptionPlaceholder', { n: i + 1 })}
                      value={opt.text}
                      onChange={(e) => {
                        const newOpts = [...pollForm.options];
                        newOpts[i] = { ...newOpts[i], text: e.target.value };
                        setPollForm((f) => ({ ...f, options: newOpts }));
                      }}
                    />
                    <label className="shrink-0">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 5 * 1024 * 1024) {
                            toast({ title: t('teacherDashboard.imageSizeLimit'), variant: "destructive" });
                            return;
                          }
                          try {
                            setUploadingPollOptionIdx(i);
                            const url = await uploadFileForTeacher(file, token!, "poll_option");
                            const newOpts = [...pollForm.options];
                            newOpts[i] = { ...newOpts[i], imageUrl: url };
                            setPollForm((f) => ({ ...f, options: newOpts }));
                            toast({ title: t('teacherDashboard.optionImageUploaded', { n: i + 1 }) });
                          } catch (err: any) {
                            toast({ title: err.message || t('teacherDashboard.imageUploadFailed'), variant: "destructive" });
                          } finally {
                            setUploadingPollOptionIdx(null);
                          }
                          e.target.value = "";
                        }}
                      />
                      <Button
                        type="button"
                        variant={opt.imageUrl ? "default" : "outline"}
                        size="icon"
                        className={opt.imageUrl ? "bg-green-600 hover:bg-green-700" : ""}
                        disabled={uploadingPollOptionIdx === i}
                        asChild
                      >
                        <span>
                          {uploadingPollOptionIdx === i ? (
                            <Clock className="h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                        </span>
                      </Button>
                    </label>
                    {pollForm.options.length > 2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setPollForm((f) => ({ ...f, options: f.options.filter((_, j) => j !== i) }))}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                  {opt.imageUrl && (
                    <div className="relative inline-block mr-2">
                      <img src={opt.imageUrl} alt="" className="h-16 w-24 object-cover rounded border" />
                      <button
                        type="button"
                        onClick={() => {
                          const newOpts = [...pollForm.options];
                          newOpts[i] = { ...newOpts[i], imageUrl: "" };
                          setPollForm((f) => ({ ...f, options: newOpts }));
                        }}
                        className="absolute -top-1.5 -left-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {pollForm.options.length < 10 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPollForm((f) => ({ ...f, options: [...f.options, { text: "", imageUrl: "" }] }))}
                >
                  <Plus className="h-4 w-4 ml-1" />
                  {t('teacherDashboard.addOption')}
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pollForm.allowMultiple}
                  onChange={(e) => setPollForm((f) => ({ ...f, allowMultiple: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">{t('teacherDashboard.allowMultiple')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pollForm.isAnonymous}
                  onChange={(e) => setPollForm((f) => ({ ...f, isAnonymous: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">{t('teacherDashboard.anonymousPoll')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pollForm.isPinned}
                  onChange={(e) => setPollForm((f) => ({ ...f, isPinned: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">{t('teacherDashboard.pinPoll')}</span>
              </label>
            </div>

            <div>
              <Label>{t('teacherDashboard.expiryDate')}</Label>
              <Input
                type="datetime-local"
                value={pollForm.expiresAt}
                onChange={(e) => setPollForm((f) => ({ ...f, expiresAt: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPollModal(false)}>{t('teacherDashboard.cancelPoll')}</Button>
            <Button className="bg-green-600" onClick={handleSubmitPoll} disabled={createPoll.isPending}>
              {createPoll.isPending ? t('teacherDashboard.creating') : t('teacherDashboard.createPollSubmit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdraw Modal */}
      <Dialog open={showWithdrawModal} onOpenChange={setShowWithdrawModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('teacherDashboard.withdrawTitle')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t('teacherDashboard.availableBalanceLabel')} <strong className="text-green-600">{balance?.availableBalance || "0.00"} {t('teacherDashboard.currency')}</strong></p>
            <div>
              <Label>{t('teacherDashboard.amountLabel')}</Label>
              <Input
                type="number"
                step="0.01"
                min="1"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder={t('teacherDashboard.withdrawPlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWithdrawModal(false)}>{t('teacherDashboard.cancelWithdraw')}</Button>
            <Button className="bg-green-600" onClick={() => requestWithdrawal.mutate(parseFloat(withdrawAmount))} disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0}>
              {t('teacherDashboard.submitRequest')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Cropper */}
      <Suspense fallback={null}>
        <ImageCropper
          open={cropperOpen}
          onClose={() => { setCropperOpen(false); setCropperImage(""); }}
          imageSrc={cropperImage}
          onCropComplete={handleCroppedTeacherImage}
          mode={cropperMode}
        />
      </Suspense>

      {/* Reject Assignment Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader><DialogTitle>رفض طلب التعيين</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>سبب الرفض (اختياري)</Label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="اكتب سبب الرفض..."
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowRejectDialog(false); setRespondingRequestId(null); }}>إلغاء</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (respondingRequestId) {
                  respondToRequest.mutate({ id: respondingRequestId, status: "rejected", rejectionReason: rejectionReason || undefined });
                }
              }}
              disabled={respondToRequest.isPending}
            >
              {respondToRequest.isPending ? "جاري..." : "تأكيد الرفض"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Task to Child Modal */}
      <Dialog open={showSendTaskModal} onOpenChange={setShowSendTaskModal}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-blue-600" />
              إرسال مهمة إلى {selectedChildForTask?.childName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>السؤال</Label>
              <Textarea
                value={sendTaskForm.question}
                onChange={(e) => setSendTaskForm(f => ({ ...f, question: e.target.value }))}
                placeholder="اكتب السؤال..."
              />
            </div>
            <div>
              <Label>عدد النقاط (المكافأة)</Label>
              <Input
                type="number"
                min="1"
                value={sendTaskForm.pointsReward}
                onChange={(e) => setSendTaskForm(f => ({ ...f, pointsReward: e.target.value }))}
                placeholder="10"
              />
            </div>
            <div>
              <Label>الإجابات (حدد الصحيحة)</Label>
              <div className="space-y-2 mt-1">
                {sendTaskForm.answers.map((ans, i) => (
                  <div key={ans.id} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correctSendAnswer"
                      checked={ans.isCorrect}
                      onChange={() => setSendTaskForm(f => ({
                        ...f,
                        answers: f.answers.map((a, j) => ({ ...a, isCorrect: j === i })),
                      }))}
                      className="accent-green-600"
                    />
                    <Input
                      placeholder={`إجابة ${i + 1}`}
                      value={ans.text}
                      onChange={(e) => setSendTaskForm(f => ({
                        ...f,
                        answers: f.answers.map((a, j) => j === i ? { ...a, text: e.target.value } : a),
                      }))}
                      className="flex-1"
                    />
                    {sendTaskForm.answers.length > 2 && (
                      <button
                        onClick={() => setSendTaskForm(f => ({
                          ...f,
                          answers: f.answers.filter((_, j) => j !== i),
                        }))}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                {sendTaskForm.answers.length < 6 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-1"
                    onClick={() => setSendTaskForm(f => ({
                      ...f,
                      answers: [...f.answers, { id: `s${Date.now()}`, text: "", isCorrect: false }],
                    }))}
                  >
                    <Plus className="h-3 w-3" />
                    إضافة إجابة
                  </Button>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowSendTaskModal(false)}>إلغاء</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                const filteredAnswers = sendTaskForm.answers.filter(a => a.text.trim());
                if (!sendTaskForm.question.trim() || filteredAnswers.length < 2 || !sendTaskForm.pointsReward) {
                  toast({ title: "السؤال والنقاط وإجابتين على الأقل مطلوبة", variant: "destructive" });
                  return;
                }
                if (!filteredAnswers.some(a => a.isCorrect)) {
                  toast({ title: "يجب تحديد إجابة صحيحة", variant: "destructive" });
                  return;
                }
                sendTaskToChild.mutate({
                  childId: selectedChildForTask?.childId,
                  question: sendTaskForm.question,
                  pointsReward: Number(sendTaskForm.pointsReward),
                  answers: filteredAnswers.map(a => ({ text: a.text, isCorrect: a.isCorrect })),
                });
              }}
              disabled={sendTaskToChild.isPending}
            >
              {sendTaskToChild.isPending ? "جاري الإرسال..." : "إرسال المهمة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Help Chat Dialog */}
      {selectedHelpRequest && (
        <HelpChatDialog
          open={!!selectedHelpRequest}
          onClose={() => setSelectedHelpRequest(null)}
          helpRequestId={selectedHelpRequest.id}
          userType="teacher"
          token={token || ""}
          taskQuestion={selectedHelpRequest.taskQuestion}
          status={selectedHelpRequest.status}
        />
      )}

      {/* Child Reports Dialog */}
      <Dialog open={showReportsDialog} onOpenChange={(open) => { if (!open) { setShowReportsDialog(false); setReportsChildId(null); } }}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              تقارير {reportsChildName}
            </DialogTitle>
          </DialogHeader>
          {isLoadingReports ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : childReportsData ? (
            <div className="space-y-4">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200">
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600">{childReportsData.stats.totalTasks}</p>
                    <p className="text-xs text-muted-foreground">إجمالي المهام</p>
                  </CardContent>
                </Card>
                <Card className="bg-green-50 dark:bg-green-950/30 border-green-200">
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-green-600">{childReportsData.stats.completedTasks}</p>
                    <p className="text-xs text-muted-foreground">مكتملة</p>
                  </CardContent>
                </Card>
                <Card className="bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200">
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-yellow-600">{childReportsData.stats.pendingTasks}</p>
                    <p className="text-xs text-muted-foreground">قيد الانتظار</p>
                  </CardContent>
                </Card>
                <Card className="bg-purple-50 dark:bg-purple-950/30 border-purple-200">
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-purple-600">{childReportsData.stats.completionRate}%</p>
                    <p className="text-xs text-muted-foreground">نسبة الإكمال</p>
                  </CardContent>
                </Card>
              </div>

              {/* Total Points */}
              <Card>
                <CardContent className="p-3 flex items-center justify-between">
                  <span className="text-sm font-medium">النقاط المكتسبة</span>
                  <Badge className="bg-amber-100 text-amber-700 text-sm">⭐ {childReportsData.stats.totalPointsEarned}</Badge>
                </CardContent>
              </Card>

              {/* Recent Tasks */}
              {childReportsData.recentTasks.length > 0 && (
                <div>
                  <h4 className="font-bold text-sm mb-2">آخر المهام</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {childReportsData.recentTasks.map((task: any) => (
                      <div key={task.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                        <p className="text-xs flex-1 line-clamp-1">{task.question}</p>
                        <Badge variant={task.status === "completed" ? "default" : "secondary"} className="text-[10px] shrink-0">
                          {task.status === "completed" ? "✅ مكتمل" : "⏳ قيد الانتظار"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Export Button */}
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => {
                  const stats = childReportsData.stats;
                  const tasks = childReportsData.recentTasks;
                  const csvHeader = "السؤال,الحالة,النقاط,التاريخ\n";
                  const csvRows = tasks.map((t: any) =>
                    `"${(t.question || "").replace(/"/g, '""')}",${t.status === "completed" ? "مكتمل" : "قيد الانتظار"},${t.pointsReward || 0},${new Date(t.createdAt).toLocaleDateString("ar")}`
                  ).join("\n");
                  const summary = `\n\nملخص التقرير\nإجمالي المهام,${stats.totalTasks}\nمكتملة,${stats.completedTasks}\nقيد الانتظار,${stats.pendingTasks}\nنسبة الإكمال,${stats.completionRate}%\nالنقاط المكتسبة,${stats.totalPointsEarned}`;
                  const bom = "\uFEFF";
                  const blob = new Blob([bom + csvHeader + csvRows + summary], { type: "text/csv;charset=utf-8;" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `تقرير_${reportsChildName}_${new Date().toLocaleDateString("ar")}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="h-4 w-4" />
                تصدير التقرير (CSV)
              </Button>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p>لا توجد بيانات متاحة</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
