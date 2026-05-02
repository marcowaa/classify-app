import { useEffect, useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import ImageCropper from "@/components/ImageCropper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { ShareMenu } from "@/components/ui/ShareMenu";
import { SchoolNotificationBell } from "@/components/AccountNotificationBell";
import { LanguageSelector } from "@/components/LanguageSelector";
import { RoleOnboardingChecklist } from "@/components/RoleOnboardingChecklist";
import { AccountSwitcherDialog } from "@/components/AccountSwitcherDialog";
import {
  Copy,
  Edit,
  Eye,
  EyeOff,
  GraduationCap,
  Heart,
  MapPin,
  LogOut,
  MessageSquare,
  Pin,
  PinOff,
  Plus,
  School,
  Send,
  Star,
  Trash2,
  TrendingUp,
  Upload,
  Users,
  Loader2,
  BarChart3,
  Lock,
  Unlock,
  CheckCircle,
  ClipboardList,
  XCircle,
  Filter,
  Calendar,
  ChevronDown,
  ChevronUp,
  Settings,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type SocialLinks = {
  facebook?: string;
  twitter?: string;
  instagram?: string;
  youtube?: string;
  tiktok?: string;
  website?: string;
};

interface Teacher {
  id: string;
  name: string;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  birthday: string | null;
  bio: string | null;
  subject: string | null;
  yearsExperience: number;
  username: string;
  monthlyRate: string | null;
  perTaskRate: string | null;
  pricingModel: string;
  socialLinks: SocialLinks | null;
  isActive: boolean;
  totalTasksSold: number;
  totalStudents: number;
  activityScore: number;
  createdAt: string;
}

interface Post {
  id: string;
  authorType: "school" | "teacher";
  content: string;
  mediaUrls: string[];
  mediaTypes: string[];
  likesCount: number;
  commentsCount: number;
  isPinned: boolean;
  isActive: boolean;
  teacherName?: string;
  teacherAvatar?: string;
  createdAt: string;
}

interface SchoolProfile {
  id: string;
  name: string;
  nameAr?: string | null;
  description?: string | null;
  address?: string | null;
  city?: string | null;
  governorate?: string | null;
  imageUrl?: string | null;
  coverImageUrl?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  referralCode: string;
  socialLinks?: SocialLinks | null;
  stats: {
    teachersCount: number;
    studentsCount: number;
    postsCount: number;
    reviewsCount: number;
    avgRating: number;
  };
}

interface SchoolStats {
  activityScore: number;
  totalTeachers: number;
  activeTeachers: number;
  totalStudents: number;
  totalPosts: number;
  totalReviews: number;
  avgRating: number;
}

interface PagedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

interface PostComment {
  id: string;
  authorName: string;
  content: string;
  createdAt: string;
}

interface Poll {
  id: string;
  authorType: "school" | "teacher";
  question: string;
  options: { id: string; text: string; imageUrl?: string }[];
  allowMultiple: boolean;
  isAnonymous: boolean;
  isPinned: boolean;
  isClosed: boolean;
  expiresAt: string | null;
  totalVotes: number;
  isActive: boolean;
  optionCounts: Record<string, number>;
  votersCount: number;
  createdAt: string;
}

const emptySocial = { facebook: "", twitter: "", instagram: "", youtube: "", tiktok: "", website: "" };

const PAGE_SIZE = 10;

function getActivityLabel(action: string, t: (key: string) => string) {
  const map: Record<string, string> = {
    teacher_added: t("schoolDashboard.activity.teacherAdded"),
    teacher_updated: t("schoolDashboard.activity.teacherUpdated"),
    teacher_transferred_out: t("schoolDashboard.activity.teacherTransferredOut"),
    teacher_transferred_in: t("schoolDashboard.activity.teacherTransferredIn"),
    post_created: t("schoolDashboard.activity.postCreated"),
    profile_updated: t("schoolDashboard.activity.profileUpdated"),
  };
  return map[action] || action;
}

export default function SchoolDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const token = localStorage.getItem("schoolToken");
  const schoolData = JSON.parse(localStorage.getItem("schoolData") || "{}");

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
  const [uploadingProfileCover, setUploadingProfileCover] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImage, setCropperImage] = useState("");
  const [cropperMode, setCropperMode] = useState<"avatar" | "cover">("avatar");
  const [pendingPostFiles, setPendingPostFiles] = useState<File[]>([]);
  const [pendingPostPreviews, setPendingPostPreviews] = useState<{ url: string; type: string }[]>([]);
  const [publishingPost, setPublishingPost] = useState(false);
  const [studentsPage, setStudentsPage] = useState(1);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [teacherSearch, setTeacherSearch] = useState("");
  const [studentsSearch, setStudentsSearch] = useState("");
  const [reviewsSearch, setReviewsSearch] = useState("");
  const [debouncedTeacherSearch, setDebouncedTeacherSearch] = useState("");
  const [debouncedStudentsSearch, setDebouncedStudentsSearch] = useState("");
  const [debouncedReviewsSearch, setDebouncedReviewsSearch] = useState("");
  const [teacherSort, setTeacherSort] = useState<"newest" | "oldest" | "mostActive" | "mostStudents">("newest");
  const [studentsSort, setStudentsSort] = useState<"newest" | "oldest" | "nameAsc" | "nameDesc">("newest");
  const [reviewsSort, setReviewsSort] = useState<"newest" | "oldest" | "highest" | "lowest">("newest");
  const [commentsByPost, setCommentsByPost] = useState<Record<string, PostComment[]>>({});
  const [showCommentsByPost, setShowCommentsByPost] = useState<Record<string, boolean>>({});
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTeacherId, setTransferTeacherId] = useState<string | null>(null);
  const [transferTeacherName, setTransferTeacherName] = useState("");
  const [transferForm, setTransferForm] = useState({ toSchoolId: "", performanceRating: 0, performanceComment: "", reason: "" });
  const [commentInputByPost, setCommentInputByPost] = useState<Record<string, string>>({});
  const [commentsLoadingByPost, setCommentsLoadingByPost] = useState<Record<string, boolean>>({});

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

  // Enrollment state
  const [enrollmentStatusFilter, setEnrollmentStatusFilter] = useState<string>("all");
  const [enrollmentSearch, setEnrollmentSearch] = useState("");
  const [debouncedEnrollmentSearch, setDebouncedEnrollmentSearch] = useState("");
  const [enrollmentPage, setEnrollmentPage] = useState(1);
  const [selectedEnrollments, setSelectedEnrollments] = useState<string[]>([]);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [bulkAction, setBulkAction] = useState<"approve" | "reject" | null>(null);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [enrollmentDetailId, setEnrollmentDetailId] = useState<string | null>(null);

  const [teacherForm, setTeacherForm] = useState({
    name: "",
    username: "",
    password: "",
    avatarUrl: "",
    coverImageUrl: "",
    birthday: "",
    bio: "",
    subject: "",
    yearsExperience: 0,
    monthlyRate: "",
    perTaskRate: "",
    pricingModel: "per_task",
    socialLinks: { ...emptySocial },
    isActive: true,
  });

  const [profileForm, setProfileForm] = useState({
    name: "",
    nameAr: "",
    description: "",
    address: "",
    city: "",
    governorate: "",
    imageUrl: "",
    coverImageUrl: "",
    phoneNumber: "",
    email: "",
    socialLinks: { ...emptySocial },
  });

  const [postForm, setPostForm] = useState({
    content: "",
    isPinned: false,
    mediaUrls: [] as string[],
    mediaTypes: [] as string[],
  });

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      pendingPostPreviews.forEach((p) => {
        if (p.url.startsWith("blob:")) URL.revokeObjectURL(p.url);
      });
    };
  }, []);

  useEffect(() => {
    if (!token) setLocation("/school/login");
  }, [token, setLocation]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTeacherSearch(teacherSearch.trim()), 300);
    return () => clearTimeout(timer);
  }, [teacherSearch]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedStudentsSearch(studentsSearch.trim()), 300);
    return () => clearTimeout(timer);
  }, [studentsSearch]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedReviewsSearch(reviewsSearch.trim()), 300);
    return () => clearTimeout(timer);
  }, [reviewsSearch]);

  useEffect(() => {
    setStudentsPage(1);
  }, [debouncedStudentsSearch]);

  useEffect(() => {
    setReviewsPage(1);
  }, [debouncedReviewsSearch]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedEnrollmentSearch(enrollmentSearch.trim()), 300);
    return () => clearTimeout(timer);
  }, [enrollmentSearch]);

  useEffect(() => {
    setEnrollmentPage(1);
  }, [debouncedEnrollmentSearch, enrollmentStatusFilter]);

  const { data: profile } = useQuery<SchoolProfile>({
    queryKey: ["school-profile"],
    queryFn: async () => {
      const res = await fetch("/api/school/profile", { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to fetch profile");
      return (await res.json()).data;
    },
    enabled: !!token,
  });

  const { data: stats } = useQuery<SchoolStats>({
    queryKey: ["school-stats"],
    queryFn: async () => {
      const res = await fetch("/api/school/stats", { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return (await res.json()).data;
    },
    enabled: !!token,
  });

  const { data: teachers = [], isFetching: isTeachersFetching } = useQuery<Teacher[]>({
    queryKey: ["school-teachers", debouncedTeacherSearch, teacherSort],
    queryFn: async () => {
      const params = new URLSearchParams({
        q: debouncedTeacherSearch,
        sort: teacherSort,
      });
      const res = await fetch(`/api/school/teachers?${params.toString()}`, { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to fetch teachers");
      return (await res.json()).data;
    },
    enabled: !!token,
  });

  const { data: feed = [] } = useQuery<Post[]>({
    queryKey: ["school-feed"],
    queryFn: async () => {
      const res = await fetch("/api/school/feed", { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to fetch feed");
      return (await res.json()).data;
    },
    enabled: !!token,
  });

  const { data: studentsRes, isFetching: isStudentsFetching } = useQuery<PagedResult<any>>({
    queryKey: ["school-students", debouncedStudentsSearch, studentsSort, studentsPage],
    queryFn: async () => {
      const params = new URLSearchParams({
        q: debouncedStudentsSearch,
        sort: studentsSort,
        page: String(studentsPage),
        limit: String(PAGE_SIZE),
      });
      const res = await fetch(`/api/school/students?${params.toString()}`, { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to fetch students");
      const body = await res.json();
      return {
        data: body.data || [],
        total: body.total || 0,
        page: body.page || 1,
        limit: body.limit || PAGE_SIZE,
      };
    },
    enabled: !!token,
  });

  const { data: reviewsRes, isFetching: isReviewsFetching } = useQuery<PagedResult<any>>({
    queryKey: ["school-reviews", debouncedReviewsSearch, reviewsSort, reviewsPage],
    queryFn: async () => {
      const params = new URLSearchParams({
        q: debouncedReviewsSearch,
        sort: reviewsSort,
        page: String(reviewsPage),
        limit: String(PAGE_SIZE),
      });
      const res = await fetch(`/api/school/reviews?${params.toString()}`, { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to fetch reviews");
      const body = await res.json();
      return {
        data: body.data || [],
        total: body.total || 0,
        page: body.page || 1,
        limit: body.limit || PAGE_SIZE,
      };
    },
    enabled: !!token,
  });

  const { data: activity = [] } = useQuery<any[]>({
    queryKey: ["school-activity"],
    queryFn: async () => {
      const res = await fetch("/api/school/activity", { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to fetch activity");
      return (await res.json()).data;
    },
    enabled: !!token,
  });

  const { data: polls = [] } = useQuery<Poll[]>({
    queryKey: ["school-polls"],
    queryFn: async () => {
      const res = await fetch("/api/school/polls", { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to fetch polls");
      return (await res.json()).data;
    },
    enabled: !!token,
  });

  // Enrollment queries
  const { data: enrollmentData, isFetching: isEnrollmentsFetching } = useQuery<any>({
    queryKey: ["school-enrollments", enrollmentStatusFilter, enrollmentPage, debouncedEnrollmentSearch],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(enrollmentPage), limit: "20" });
      if (enrollmentStatusFilter !== "all") params.set("status", enrollmentStatusFilter);
      if (debouncedEnrollmentSearch) params.set("search", debouncedEnrollmentSearch);
      const res = await fetch(`/api/school/enrollments?${params}`, { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to fetch enrollments");
      return (await res.json()).data;
    },
    enabled: !!token,
  });

  const { data: enrollmentSettings } = useQuery<any>({
    queryKey: ["school-enrollment-settings"],
    queryFn: async () => {
      const res = await fetch("/api/school/enrollment-settings", { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to fetch settings");
      return (await res.json()).data;
    },
    enabled: !!token,
  });

  const enrollments = enrollmentData?.enrollments || [];
  const enrollmentCounts = enrollmentData?.counts || { total: 0, pending: 0, approved: 0, rejected: 0 };

  const updateEnrollmentSettings = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/school/enrollment-settings", {
        method: "PUT",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-enrollment-settings"] });
      toast({ title: t("schoolDashboard.enrollmentSettingsUpdated") });
    },
  });

  const bulkEnrollmentAction = useMutation({
    mutationFn: async (payload: { ids: string[]; action: "approve" | "reject"; rejectionReason?: string }) => {
      const res = await fetch("/api/school/enrollments/bulk-action", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to perform action");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["school-enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["school-stats"] });
      setSelectedEnrollments([]);
      setShowRejectDialog(false);
      setRejectionReason("");
      setBulkAction(null);
      toast({ title: data.message || t("schoolDashboard.enrollmentActionDone") });
    },
  });

  const students = studentsRes?.data || [];
  const studentsPagesCount = Math.max(1, Math.ceil((studentsRes?.total || 0) / PAGE_SIZE));

  const reviews = reviewsRes?.data || [];
  const reviewsPagesCount = Math.max(1, Math.ceil((reviewsRes?.total || 0) / PAGE_SIZE));

  const updateProfile = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/school/profile", {
        method: "PUT",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed");
      return body.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-profile"] });
      toast({ title: t("schoolDashboard.profileUpdateSuccess") });
      setShowProfileModal(false);
    },
    onError: (err: any) => toast({ title: err.message || t("schoolDashboard.updateFailed"), variant: "destructive" }),
  });

  const createTeacher = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/school/teachers", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed");
      return body.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-teachers"] });
      queryClient.invalidateQueries({ queryKey: ["school-stats"] });
      setShowTeacherModal(false);
      setEditingTeacher(null);
      resetTeacherForm();
      toast({ title: t("schoolDashboard.teacherAddSuccess") });
    },
    onError: (err: any) => toast({ title: err.message || t("schoolDashboard.teacherAddFailed"), variant: "destructive" }),
  });

  const updateTeacher = useMutation({
    mutationFn: async ({ id, ...payload }: any) => {
      const res = await fetch(`/api/school/teachers/${id}`, {
        method: "PUT",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed");
      return body.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-teachers"] });
      queryClient.invalidateQueries({ queryKey: ["school-stats"] });
      setShowTeacherModal(false);
      setEditingTeacher(null);
      resetTeacherForm();
      toast({ title: t("schoolDashboard.teacherUpdateSuccess") });
    },
    onError: (err: any) => toast({ title: err.message || t("schoolDashboard.teacherUpdateFailed"), variant: "destructive" }),
  });

  const deleteTeacher = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/school/teachers/${id}`, { method: "DELETE", headers: authHeaders });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed");
      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-teachers"] });
      queryClient.invalidateQueries({ queryKey: ["school-stats"] });
      toast({ title: t("schoolDashboard.teacherDeleteSuccess") });
    },
    onError: (err: any) => toast({ title: err.message || t("schoolDashboard.teacherDeleteFailed"), variant: "destructive" }),
  });

  const { data: availableSchools = [] } = useQuery<{ id: string; name: string; imageUrl: string | null; isActive: boolean; isVerified: boolean }[]>({
    queryKey: ["available-schools"],
    queryFn: async () => {
      const res = await fetch("/api/school/available-schools", { headers: authHeaders });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data || [];
    },
    enabled: showTransferModal,
  });

  const transferTeacher = useMutation({
    mutationFn: async ({ id, ...payload }: any) => {
      const res = await fetch(`/api/school/teachers/${id}/transfer`, {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed");
      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-teachers"] });
      queryClient.invalidateQueries({ queryKey: ["school-stats"] });
      setShowTransferModal(false);
      setTransferTeacherId(null);
      setTransferForm({ toSchoolId: "", performanceRating: 0, performanceComment: "", reason: "" });
      toast({ title: t("schoolDashboard.teacherTransferSuccess") });
    },
    onError: (err: any) => toast({ title: err.message || t("schoolDashboard.teacherTransferFailed"), variant: "destructive" }),
  });

  const updatePost = useMutation({
    mutationFn: async ({ id, ...payload }: any) => {
      const res = await fetch(`/api/school/posts/${id}`, {
        method: "PUT",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed");
      return body.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-feed"] });
      resetPostForm();
      setEditingPost(null);
      setShowPostModal(false);
      toast({ title: t("schoolDashboard.postUpdateSuccess") });
    },
    onError: (err: any) => toast({ title: err.message || t("schoolDashboard.postUpdateFailed"), variant: "destructive" }),
  });

  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/school/posts/${id}`, { method: "DELETE", headers: authHeaders });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed");
      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-feed"] });
      queryClient.invalidateQueries({ queryKey: ["school-stats"] });
      toast({ title: t("schoolDashboard.postDeleteSuccess") });
    },
    onError: (err: any) => toast({ title: err.message || t("schoolDashboard.postDeleteFailed"), variant: "destructive" }),
  });

  const addPostComment = useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      const res = await fetch(`/api/store/schools/posts/${postId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorName: profile?.name || t("schoolDashboard.school"),
          content,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed");
      return body.data;
    },
    onSuccess: async (_data, vars) => {
      setCommentInputByPost((prev) => ({ ...prev, [vars.postId]: "" }));
      await loadPostComments(vars.postId);
      queryClient.invalidateQueries({ queryKey: ["school-feed"] });
      toast({ title: t("schoolDashboard.replySuccess") });
    },
    onError: (err: any) => toast({ title: err.message || t("schoolDashboard.replyFailed"), variant: "destructive" }),
  });

  const createPoll = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/school/polls", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed");
      return body.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-polls"] });
      setShowPollModal(false);
      resetPollForm();
      toast({ title: t("schoolDashboard.pollCreateSuccess") });
    },
    onError: (err: any) => toast({ title: err.message || t("schoolDashboard.pollCreateFailed"), variant: "destructive" }),
  });

  const updatePoll = useMutation({
    mutationFn: async ({ id, ...payload }: any) => {
      const res = await fetch(`/api/school/polls/${id}`, {
        method: "PUT",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed");
      return body.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-polls"] });
      toast({ title: t("schoolDashboard.pollUpdateSuccess") });
    },
    onError: (err: any) => toast({ title: err.message || t("schoolDashboard.pollUpdateFailed"), variant: "destructive" }),
  });

  const deletePoll = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/school/polls/${id}`, { method: "DELETE", headers: authHeaders });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed");
      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-polls"] });
      toast({ title: t("schoolDashboard.pollDeleteSuccess") });
    },
    onError: (err: any) => toast({ title: err.message || t("schoolDashboard.deleteFailed"), variant: "destructive" }),
  });

  function cleanSocialLinks(input: any): SocialLinks | null {
    const trimmed = {
      facebook: input.facebook?.trim() || "",
      twitter: input.twitter?.trim() || "",
      instagram: input.instagram?.trim() || "",
      youtube: input.youtube?.trim() || "",
      tiktok: input.tiktok?.trim() || "",
      website: input.website?.trim() || "",
    };
    const hasAny = Object.values(trimmed).some(Boolean);
    return hasAny ? trimmed : null;
  }

  function resetTeacherForm() {
    setTeacherForm({
      name: "",
      username: "",
      password: "",
      avatarUrl: "",
      coverImageUrl: "",
      birthday: "",
      bio: "",
      subject: "",
      yearsExperience: 0,
      monthlyRate: "",
      perTaskRate: "",
      pricingModel: "per_task",
      socialLinks: { ...emptySocial },
      isActive: true,
    });
  }

  function resetPostForm() {
    // Revoke blob URLs before clearing
    pendingPostPreviews.forEach((p) => {
      if (p.url.startsWith("blob:")) URL.revokeObjectURL(p.url);
    });
    setPostForm({ content: "", isPinned: false, mediaUrls: [], mediaTypes: [] });
    setPendingPostFiles([]);
    setPendingPostPreviews([]);
  }

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
      toast({ title: t("schoolDashboard.pollQuestionRequired"), variant: "destructive" });
      return;
    }
    const validOptions = pollForm.options.filter((o) => o.text.trim());
    if (validOptions.length < 2) {
      toast({ title: t("schoolDashboard.pollMinOptions"), variant: "destructive" });
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

  function openEditTeacher(teacher: Teacher) {
    setEditingTeacher(teacher);
    setTeacherForm({
      name: teacher.name,
      username: teacher.username,
      password: "",
      avatarUrl: teacher.avatarUrl || "",
      coverImageUrl: teacher.coverImageUrl || "",
      birthday: teacher.birthday || "",
      bio: teacher.bio || "",
      subject: teacher.subject || "",
      yearsExperience: teacher.yearsExperience || 0,
      monthlyRate: teacher.monthlyRate || "",
      perTaskRate: teacher.perTaskRate || "",
      pricingModel: teacher.pricingModel || "per_task",
      socialLinks: {
        ...emptySocial,
        ...(teacher.socialLinks || {}),
      },
      isActive: teacher.isActive,
    });
    setShowTeacherModal(true);
  }

  function openEditProfile() {
    if (!profile) return;
    setProfileForm({
      name: profile.name || "",
      nameAr: profile.nameAr || "",
      description: profile.description || "",
      address: profile.address || "",
      city: profile.city || "",
      governorate: profile.governorate || "",
      imageUrl: profile.imageUrl || "",
      coverImageUrl: profile.coverImageUrl || "",
      phoneNumber: profile.phoneNumber || "",
      email: profile.email || "",
      socialLinks: { ...emptySocial, ...(profile.socialLinks || {}) },
    });
    setShowProfileModal(true);
  }

  function openEditPost(post: Post) {
    setEditingPost(post);
    setPostForm({
      content: post.content,
      isPinned: post.isPinned,
      mediaUrls: post.mediaUrls || [],
      mediaTypes: post.mediaTypes || [],
    });
    setShowPostModal(true);
  }

  async function loadPostComments(postId: string) {
    try {
      setCommentsLoadingByPost((prev) => ({ ...prev, [postId]: true }));
      const res = await fetch(`/api/store/schools/posts/${postId}/comments`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed");
      setCommentsByPost((prev) => ({ ...prev, [postId]: body.data || [] }));
    } catch (error: any) {
      toast({ title: error.message || t("schoolDashboard.commentsLoadFailed"), variant: "destructive" });
    } finally {
      setCommentsLoadingByPost((prev) => ({ ...prev, [postId]: false }));
    }
  }

  async function togglePostComments(postId: string) {
    const next = !showCommentsByPost[postId];
    setShowCommentsByPost((prev) => ({ ...prev, [postId]: next }));
    if (next && !commentsByPost[postId]) {
      await loadPostComments(postId);
    }
  }

  async function uploadFileToStorage(file: File): Promise<{ url: string; objectPath: string }> {
    const presignRes = await fetch("/api/school/uploads/presign", {
      method: "POST",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        contentType: file.type,
        size: file.size,
        purpose: "task_media",
        originalName: file.name,
      }),
    });
    const presignBody = await presignRes.json();
    if (!presignRes.ok) throw new Error(presignBody.message || t("schoolDashboard.presignFailed"));

    const { uploadURL, objectPath } = presignBody.data;

    // If uploadURL is a local relative path, PUT directly; otherwise use proxy
    const isLocalUrl = uploadURL.startsWith("/api/");
    if (isLocalUrl) {
      const directRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      const directBody = await directRes.json();
      if (!directRes.ok) throw new Error(directBody.message || t("schoolDashboard.uploadFailed"));
    } else {
      const proxyRes = await fetch("/api/school/uploads/proxy", {
        method: "PUT",
        headers: {
          ...authHeaders,
          "x-upload-object-path": objectPath,
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      });
      const proxyBody = await proxyRes.json();
      if (!proxyRes.ok) throw new Error(proxyBody.message || t("schoolDashboard.uploadFailed"));
    }

    const finalizeRes = await fetch("/api/school/uploads/finalize", {
      method: "POST",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        objectPath,
        mimeType: file.type,
        size: file.size,
        originalName: file.name,
        purpose: "task_media",
      }),
    });
    const finalizeBody = await finalizeRes.json();
    if (!finalizeRes.ok) throw new Error(finalizeBody.message || t("schoolDashboard.uploadFinalizeFailed"));

    return {
      url: finalizeBody.data.url,
      objectPath,
    };
  }

  async function uploadFileForPost(file: File): Promise<{ url: string; type: string }> {
    const { url } = await uploadFileToStorage(file);
    return {
      url,
      type: file.type.startsWith("video/") ? "video" : "image",
    };
  }

  async function uploadSchoolImage(file: File): Promise<string> {
    const { url } = await uploadFileToStorage(file);
    return url;
  }

  function handleSelectSchoolProfileImage(file: File | undefined, type: "avatar" | "cover") {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: t("schoolDashboard.imageOnlyPlease"), variant: "destructive" });
      return;
    }
    const url = URL.createObjectURL(file);
    setCropperImage(url);
    setCropperMode(type);
    setCropperOpen(true);
  }

  async function handleCroppedImageUpload(blob: Blob) {
    const type = cropperMode;
    const file = new File([blob], `profile-${type}.jpg`, { type: "image/jpeg" });

    if (type === "avatar") setUploadingProfileImage(true);
    if (type === "cover") setUploadingProfileCover(true);

    try {
      const url = await uploadSchoolImage(file);
      setProfileForm((prev) => ({
        ...prev,
        imageUrl: type === "avatar" ? url : prev.imageUrl,
        coverImageUrl: type === "cover" ? url : prev.coverImageUrl,
      }));
      toast({ title: type === "avatar" ? t("schoolDashboard.schoolImageUploaded") : t("schoolDashboard.coverImageUploaded") });
    } catch (error: any) {
      toast({ title: error.message || t("schoolDashboard.imageUploadFailed"), variant: "destructive" });
    } finally {
      if (type === "avatar") setUploadingProfileImage(false);
      if (type === "cover") setUploadingProfileCover(false);
    }
  }

  function handlePostMediaSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files);
    const newPreviews = newFiles.map((f) => ({
      url: URL.createObjectURL(f),
      type: f.type.startsWith("video/") ? "video" : "image",
    }));
    setPendingPostFiles((prev) => [...prev, ...newFiles]);
    setPendingPostPreviews((prev) => [...prev, ...newPreviews]);
  }

  function removePostMedia(index: number) {
    // Check if it's a pending file (not yet uploaded) or already uploaded URL
    const totalUploaded = postForm.mediaUrls.length;
    if (index < totalUploaded) {
      // Remove from already uploaded
      setPostForm((prev) => ({
        ...prev,
        mediaUrls: prev.mediaUrls.filter((_, i) => i !== index),
        mediaTypes: prev.mediaTypes.filter((_, i) => i !== index),
      }));
    } else {
      // Remove from pending files
      const pendingIndex = index - totalUploaded;
      const preview = pendingPostPreviews[pendingIndex];
      if (preview?.url.startsWith("blob:")) URL.revokeObjectURL(preview.url);
      setPendingPostFiles((prev) => prev.filter((_, i) => i !== pendingIndex));
      setPendingPostPreviews((prev) => prev.filter((_, i) => i !== pendingIndex));
    }
  }

  function handleSubmitTeacher() {
    if (!teacherForm.name || !teacherForm.username || (!editingTeacher && !teacherForm.password)) {
      toast({ title: t("schoolDashboard.teacherFormRequired"), variant: "destructive" });
      return;
    }

    const payload = {
      name: teacherForm.name,
      username: teacherForm.username,
      password: teacherForm.password || undefined,
      avatarUrl: teacherForm.avatarUrl || null,
      coverImageUrl: teacherForm.coverImageUrl || null,
      birthday: teacherForm.birthday || null,
      bio: teacherForm.bio || null,
      subject: teacherForm.subject || null,
      yearsExperience: teacherForm.yearsExperience || 0,
      monthlyRate: teacherForm.monthlyRate || null,
      perTaskRate: teacherForm.perTaskRate || null,
      pricingModel: teacherForm.pricingModel,
      socialLinks: cleanSocialLinks(teacherForm.socialLinks),
      isActive: teacherForm.isActive,
    };

    if (editingTeacher) {
      updateTeacher.mutate({ id: editingTeacher.id, ...payload });
      return;
    }

    createTeacher.mutate(payload);
  }

  function handleSubmitPost() {
    const hasContent = postForm.content.trim().length > 0;
    const hasExistingMedia = postForm.mediaUrls.length > 0;
    const hasPendingFiles = pendingPostFiles.length > 0;

    if (!hasContent && !hasExistingMedia && !hasPendingFiles) {
      toast({ title: t("schoolDashboard.postContentRequired"), variant: "destructive" });
      return;
    }

    // Capture form state before closing
    const capturedContent = postForm.content;
    const capturedIsPinned = postForm.isPinned;
    const capturedExistingUrls = [...postForm.mediaUrls];
    const capturedExistingTypes = [...postForm.mediaTypes];
    const capturedFiles = [...pendingPostFiles];
    const capturedEditingPost = editingPost;

    // Close modal immediately so user can browse
    setShowPostModal(false);
    setEditingPost(null);
    resetPostForm();
    setPublishingPost(true);

    toast({ title: t("schoolDashboard.postPublishingInBackground") });

    // Background upload + publish
    (async () => {
      try {
        // Upload pending files
        let uploadedUrls = capturedExistingUrls;
        let uploadedTypes = capturedExistingTypes;

        if (capturedFiles.length > 0) {
          const results = await Promise.all(capturedFiles.map(uploadFileForPost));
          uploadedUrls = [...capturedExistingUrls, ...results.map((r) => r.url)];
          uploadedTypes = [...capturedExistingTypes, ...results.map((r) => r.type)];
        }

        const payload = {
          content: capturedContent,
          mediaUrls: uploadedUrls,
          mediaTypes: uploadedTypes,
          isPinned: capturedIsPinned,
        };

        let res: Response;
        if (capturedEditingPost) {
          res = await fetch(`/api/school/posts/${capturedEditingPost.id}`, {
            method: "PUT",
            headers: { ...authHeaders, "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } else {
          res = await fetch("/api/school/posts", {
            method: "POST",
            headers: { ...authHeaders, "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        }

        const body = await res.json();
        if (!res.ok) throw new Error(body.message || t("schoolDashboard.postPublishFailed"));

        queryClient.invalidateQueries({ queryKey: ["school-feed"] });
        queryClient.invalidateQueries({ queryKey: ["school-stats"] });
        toast({ title: capturedEditingPost ? t("schoolDashboard.postUpdateSuccessMsg") : t("schoolDashboard.postPublishSuccessMsg") });
      } catch (error: any) {
        toast({ title: error.message || t("schoolDashboard.postPublishFailed"), variant: "destructive" });
      } finally {
        setPublishingPost(false);
      }
    })();
  }

  function handleSubmitProfile() {
    if (!profileForm.name.trim()) {
      toast({ title: t("schoolDashboard.schoolNameRequired"), variant: "destructive" });
      return;
    }

    updateProfile.mutate({
      ...profileForm,
      name: profileForm.name.trim(),
      nameAr: profileForm.nameAr.trim() || null,
      description: profileForm.description.trim() || null,
      address: profileForm.address.trim() || null,
      city: profileForm.city.trim() || null,
      governorate: profileForm.governorate.trim() || null,
      imageUrl: profileForm.imageUrl.trim() || null,
      coverImageUrl: profileForm.coverImageUrl.trim() || null,
      phoneNumber: profileForm.phoneNumber.trim() || null,
      email: profileForm.email.trim() || null,
      socialLinks: cleanSocialLinks(profileForm.socialLinks),
    });
  }

  function handleLogout() {
    localStorage.removeItem("schoolToken");
    localStorage.removeItem("schoolData");
    setLocation("/school/login");
  }

  if (!token) return null;
  const schoolOnboardingItems = [
    { id: "add-teacher", label: t("schoolDashboard.addTeacher") },
    { id: "create-post", label: t("schoolDashboard.newPost") },
    { id: "review-students", label: t("schoolDashboard.studentsTab") },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" dir="rtl">
      {/* Background publishing indicator */}
      {publishingPost && (
        <div className="fixed bottom-4 left-4 z-50 bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm font-medium">{t("schoolDashboard.publishingPost")}</span>
        </div>
      )}
      <div className="bg-blue-600 text-white p-3 sm:p-4">
        <div className="max-w-7xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full relative overflow-hidden flex items-center justify-center bg-blue-700 flex-shrink-0">
              <School className="h-6 w-6" />
              {profile?.imageUrl && (
                <img src={profile.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-lg truncate">{profile?.name || schoolData.name}</h1>
              <p className="text-blue-100 text-xs truncate">{t("schoolDashboard.dashboardTitle")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="ghost" size="sm" className="text-white hover:bg-blue-700" onClick={openEditProfile}>
              <Edit className="h-4 w-4 ml-1" />
              {t("schoolDashboard.editSchool")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-blue-700"
              onClick={() => {
                navigator.clipboard.writeText(profile?.referralCode || "");
                toast({ title: t("schoolDashboard.referralCodeCopied") });
              }}
            >
              <Copy className="h-4 w-4 ml-1" />
              {profile?.referralCode}
            </Button>
            <ShareMenu
              url={typeof window !== "undefined" ? `${window.location.origin}/school/${profile?.id || ""}` : ""}
              title={`${profile?.nameAr || profile?.name || t("schoolDashboard.school")} — Classify`}
              description={profile?.description || t("schoolDashboard.schoolShareDescription")}
              variant="ghost"
              className="text-white hover:bg-blue-700"
              buttonLabel={t("schoolDashboard.share")}
            />
            <LanguageSelector />
            <SchoolNotificationBell />
            <AccountSwitcherDialog currentRole="school" className="text-white hover:bg-blue-700" />
            <Button variant="ghost" size="icon" className="text-white hover:bg-blue-700" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-3 sm:p-4 space-y-6">
        <RoleOnboardingChecklist storageKey="school" items={schoolOnboardingItems} />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <GraduationCap className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <div className="text-2xl font-bold">{stats?.totalTeachers || 0}</div>
              <div className="text-xs text-muted-foreground">{t("schoolDashboard.teachersCount")} ({stats?.activeTeachers || 0} {t("schoolDashboard.active")})</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold">{stats?.totalStudents || 0}</div>
              <div className="text-xs text-muted-foreground">{t("schoolDashboard.students")}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <div className="text-2xl font-bold">{stats?.totalPosts || 0}</div>
              <div className="text-xs text-muted-foreground">{t("schoolDashboard.posts")}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Star className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
              <div className="text-2xl font-bold">{stats?.avgRating || 0}</div>
              <div className="text-xs text-muted-foreground">{t("schoolDashboard.rating")} ({stats?.totalReviews || 0})</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-rose-600" />
              <div className="text-2xl font-bold">{stats?.activityScore || 0}</div>
              <div className="text-xs text-muted-foreground">{t("schoolDashboard.activityPoints")}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="teachers" dir="rtl">
          <div className="overflow-x-auto pb-1">
            <TabsList className="inline-flex w-max min-w-full h-auto gap-1">
              <TabsTrigger className="whitespace-nowrap text-xs sm:text-sm" value="teachers">{t("schoolDashboard.teachersTab")}</TabsTrigger>
              <TabsTrigger className="whitespace-nowrap text-xs sm:text-sm" value="posts">{t("schoolDashboard.postsTab")}</TabsTrigger>
              <TabsTrigger className="whitespace-nowrap text-xs sm:text-sm" value="polls">{t("schoolDashboard.pollsTab")}</TabsTrigger>
              <TabsTrigger className="whitespace-nowrap text-xs sm:text-sm" value="students">{t("schoolDashboard.studentsTab")}</TabsTrigger>
              <TabsTrigger className="relative whitespace-nowrap text-xs sm:text-sm" value="enrollments">
                {t("schoolDashboard.enrollmentsTab")}
                {enrollmentCounts.pending > 0 && (
                  <span className="absolute -top-1 -left-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">{enrollmentCounts.pending}</span>
                )}
              </TabsTrigger>
              <TabsTrigger className="whitespace-nowrap text-xs sm:text-sm" value="reviews">{t("schoolDashboard.reviewsTab")}</TabsTrigger>
              <TabsTrigger className="whitespace-nowrap text-xs sm:text-sm" value="activity">{t("schoolDashboard.activityTab")}</TabsTrigger>
              <TabsTrigger className="whitespace-nowrap text-xs sm:text-sm" value="profile">{t("schoolDashboard.profileTab")}</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="teachers" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">{t("schoolDashboard.manageTeachers")}</h2>
              <Button onClick={() => { setEditingTeacher(null); resetTeacherForm(); setShowTeacherModal(true); }} className="bg-blue-600">
                <Plus className="h-4 w-4 ml-1" />
                {t("schoolDashboard.addTeacher")}
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-2">
              <Input
                placeholder={t("schoolDashboard.teacherSearchPlaceholder")}
                value={teacherSearch}
                onChange={(e) => setTeacherSearch(e.target.value)}
              />
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={teacherSort}
                onChange={(e) => setTeacherSort(e.target.value as any)}
              >
                <option value="newest">{t("schoolDashboard.newest")}</option>
                <option value="oldest">{t("schoolDashboard.oldest")}</option>
                <option value="mostActive">{t("schoolDashboard.mostActive")}</option>
                <option value="mostStudents">{t("schoolDashboard.mostStudents")}</option>
              </select>
            </div>
            {isTeachersFetching && (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                {t("schoolDashboard.updatingTeachers")}
              </div>
            )}

            {teachers.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">{t("schoolDashboard.noTeachersYet")}</CardContent></Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {teachers.map((teacher) => (
                  <Card key={teacher.id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full relative overflow-hidden bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <GraduationCap className="h-6 w-6 text-blue-600" />
                            {teacher.avatarUrl && (
                              <img src={teacher.avatarUrl} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                            )}
                          </div>
                          <div>
                            <h3 className="font-bold">{teacher.name}</h3>
                            <p className="text-sm text-muted-foreground">{teacher.subject || t("schoolDashboard.noSubject")}</p>
                            <p className="text-xs text-muted-foreground">@{teacher.username}</p>
                          </div>
                        </div>
                        <Badge variant={teacher.isActive ? "default" : "secondary"}>
                          {teacher.isActive ? t("schoolDashboard.activeStatus") : t("schoolDashboard.inactiveStatus")}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <span>{teacher.totalTasksSold} {t("schoolDashboard.tasksSold")}</span>
                        <span>{teacher.totalStudents} {t("schoolDashboard.student")}</span>
                        <span>{teacher.yearsExperience} {t("schoolDashboard.yearsExperience")}</span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEditTeacher(teacher)}>
                          <Edit className="h-3 w-3 ml-1" />
                          {t("schoolDashboard.edit")}
                        </Button>
                        <Button
                          size="sm"
                          variant={teacher.isActive ? "secondary" : "default"}
                          onClick={() => updateTeacher.mutate({ id: teacher.id, isActive: !teacher.isActive })}
                        >
                          {teacher.isActive ? t("schoolDashboard.deactivate") : t("schoolDashboard.activate")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-orange-600 border-orange-300 hover:bg-orange-50"
                          onClick={() => {
                            setTransferTeacherId(teacher.id);
                            setTransferTeacherName(teacher.name);
                            setTransferForm({ toSchoolId: "", performanceRating: 0, performanceComment: "", reason: "" });
                            setShowTransferModal(true);
                          }}
                        >
                          <Send className="h-3 w-3 ml-1" />
                          {t("schoolDashboard.transfer")}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="posts" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">{t("schoolDashboard.postsHeader")}</h2>
              <Button onClick={() => { setEditingPost(null); resetPostForm(); setShowPostModal(true); }} className="bg-blue-600">
                <Plus className="h-4 w-4 ml-1" />
                {t("schoolDashboard.newPost")}
              </Button>
            </div>

            {feed.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">{t("schoolDashboard.noPostsYet")}</CardContent></Card>
            ) : (
              <div className="space-y-4">
                {[...feed].sort((a, b) => {
                  if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
                  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                }).map((post) => (
                  <Card key={post.id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={post.authorType === "school" ? "default" : "secondary"}>
                            {post.authorType === "school" ? t("schoolDashboard.school") : post.teacherName || t("schoolDashboard.teacher")}
                          </Badge>
                          {post.isPinned && <Badge variant="outline">{t("schoolDashboard.pinned")}</Badge>}
                        </div>

                        {post.authorType === "school" && (
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" onClick={() => openEditPost(post)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => updatePost.mutate({ id: post.id, isPinned: !post.isPinned })}
                            >
                              {post.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (confirm(t("schoolDashboard.confirmDeletePost"))) deletePost.mutate(post.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {post.content && <p className="text-sm whitespace-pre-wrap">{post.content}</p>}

                      {post.mediaUrls?.length > 0 && (
                        <div className={`${post.mediaUrls.length === 1 ? "" : "grid grid-cols-2 md:grid-cols-3 gap-2"}`}>
                          {post.mediaUrls.map((url, i) => (
                            post.mediaTypes?.[i] === "video" ? (
                              <video key={i} src={url} controls className={`w-full rounded bg-black ${post.mediaUrls.length === 1 ? "max-h-[500px] object-contain" : "h-48 object-cover"}`} />
                            ) : (
                              <img key={i} src={url} alt="" className={`w-full rounded bg-gray-100 ${post.mediaUrls.length === 1 ? "max-h-[500px] object-contain" : "h-48 object-cover"}`} onError={(e) => { e.currentTarget.style.display = 'none' }} />
                            )
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                        <span className="flex items-center gap-1">
                          {post.likesCount > 0 && <><span className="bg-blue-600 text-white rounded-full p-0.5 inline-flex"><Heart className="h-2.5 w-2.5 fill-white" /></span> {post.likesCount}</>}
                        </span>
                        <button
                          onClick={() => togglePostComments(post.id)}
                          className="hover:underline cursor-pointer"
                        >
                          💬 {post.commentsCount} {t("schoolDashboard.comment")}
                        </button>
                        <span>{new Date(post.createdAt).toLocaleString("ar-EG", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>

                      {/* Comments section */}
                      {showCommentsByPost[post.id] && (
                        <div className="border-t pt-2 space-y-2">
                          {commentsLoadingByPost[post.id] ? (
                            <div className="text-center text-xs text-muted-foreground py-2">{t("schoolDashboard.loading")}</div>
                          ) : commentsByPost[post.id]?.length > 0 ? (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {commentsByPost[post.id].map((c) => (
                                <div key={c.id} className="flex items-start gap-2">
                                  <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
                                    <Users className="h-3.5 w-3.5 text-gray-500" />
                                  </div>
                                  <div className="bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-1.5">
                                    <p className="text-xs font-bold">{c.authorName}</p>
                                    <p className="text-sm">{c.content}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : null}
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder={t("schoolDashboard.writeReply")}
                              value={commentInputByPost[post.id] || ""}
                              onChange={(e) => setCommentInputByPost((prev) => ({ ...prev, [post.id]: e.target.value }))}
                              className="text-sm rounded-full bg-gray-100 dark:bg-gray-800 border-0 h-9"
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && commentInputByPost[post.id]?.trim()) {
                                  addPostComment.mutate({ postId: post.id, content: commentInputByPost[post.id] });
                                }
                              }}
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="shrink-0 h-9 w-9"
                              disabled={!commentInputByPost[post.id]?.trim()}
                              onClick={() => {
                                if (commentInputByPost[post.id]?.trim()) {
                                  addPostComment.mutate({ postId: post.id, content: commentInputByPost[post.id] });
                                }
                              }}
                            >
                              <Send className="h-4 w-4 text-blue-600" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="students" className="space-y-4">
            <h2 className="text-lg font-bold">{t("schoolDashboard.registeredStudents")}</h2>
            <div className="grid md:grid-cols-2 gap-2">
              <Input
                placeholder={t("schoolDashboard.studentSearchPlaceholder")}
                value={studentsSearch}
                onChange={(e) => {
                  setStudentsSearch(e.target.value);
                  setStudentsPage(1);
                }}
              />
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={studentsSort}
                onChange={(e) => {
                  setStudentsSort(e.target.value as any);
                  setStudentsPage(1);
                }}
              >
                <option value="newest">{t("schoolDashboard.newest")}</option>
                <option value="oldest">{t("schoolDashboard.oldest")}</option>
                <option value="nameAsc">{t("schoolDashboard.nameAsc")}</option>
                <option value="nameDesc">{t("schoolDashboard.nameDesc")}</option>
              </select>
            </div>
            {isStudentsFetching && (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                {t("schoolDashboard.updatingStudents")}
              </div>
            )}
            {students.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">{t("schoolDashboard.noStudentsYet")}</CardContent></Card>
            ) : (
              <>
                <div className="grid md:grid-cols-2 gap-4">
                  {students.map((student) => (
                    <Card key={student.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full relative overflow-hidden bg-green-100 flex items-center justify-center flex-shrink-0">
                            <Users className="h-5 w-5 text-green-600" />
                            {student.childAvatar && (
                              <img src={student.childAvatar} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                            )}
                          </div>
                          <div>
                            <h3 className="font-bold">{student.childName || t("schoolDashboard.studentDefault")}</h3>
                            <p className="text-sm text-muted-foreground">{t("schoolDashboard.parentLabel")} {student.parentName || "—"}</p>
                            <p className="text-xs text-muted-foreground">{new Date(student.createdAt).toLocaleDateString("ar")}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Button variant="outline" size="sm" disabled={studentsPage <= 1} onClick={() => setStudentsPage((p) => Math.max(1, p - 1))}>{t("schoolDashboard.previous")}</Button>
                  <span className="text-sm text-muted-foreground">{t("schoolDashboard.page")} {studentsPage} {t("schoolDashboard.of")} {studentsPagesCount}</span>
                  <Button variant="outline" size="sm" disabled={studentsPage >= studentsPagesCount} onClick={() => setStudentsPage((p) => Math.min(studentsPagesCount, p + 1))}>{t("schoolDashboard.next")}</Button>
                </div>
              </>
            )}
          </TabsContent>

          {/* ===== ENROLLMENTS TAB ===== */}
          <TabsContent value="enrollments" className="space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <h2 className="text-lg font-bold">{t("schoolDashboard.enrollmentsHeader")}</h2>
              <Button variant="outline" size="sm" onClick={() => setShowSettingsPanel(!showSettingsPanel)}>
                <Settings className="h-4 w-4 ml-1" />
                {t("schoolDashboard.enrollmentSettings")}
              </Button>
            </div>

            {/* Settings Panel */}
            {showSettingsPanel && (
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <Label className="font-medium">{t("schoolDashboard.enrollmentOpenLabel")}</Label>
                    <Switch
                      checked={enrollmentSettings?.enrollmentOpen || false}
                      onCheckedChange={(checked) => updateEnrollmentSettings.mutate({ enrollmentOpen: checked })}
                    />
                    <Badge variant={enrollmentSettings?.enrollmentOpen ? "default" : "secondary"}>
                      {enrollmentSettings?.enrollmentOpen ? t("schoolDashboard.enrollmentOpen") : t("schoolDashboard.enrollmentClosed")}
                    </Badge>
                  </div>
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-sm">{t("schoolDashboard.enrollmentMinAge")}</Label>
                      <Input
                        type="number"
                        min={3} max={18}
                        placeholder="3"
                        defaultValue={enrollmentSettings?.enrollmentConditions?.minAge || ""}
                        onBlur={(e) => {
                          const val = parseInt(e.target.value);
                          if (val) updateEnrollmentSettings.mutate({ enrollmentConditions: { ...enrollmentSettings?.enrollmentConditions, minAge: val } });
                        }}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">{t("schoolDashboard.enrollmentMaxAge")}</Label>
                      <Input
                        type="number"
                        min={3} max={18}
                        placeholder="18"
                        defaultValue={enrollmentSettings?.enrollmentConditions?.maxAge || ""}
                        onBlur={(e) => {
                          const val = parseInt(e.target.value);
                          if (val) updateEnrollmentSettings.mutate({ enrollmentConditions: { ...enrollmentSettings?.enrollmentConditions, maxAge: val } });
                        }}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">{t("schoolDashboard.enrollmentMinActivity")}</Label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="0"
                        defaultValue={enrollmentSettings?.enrollmentConditions?.minActivityScore || ""}
                        onBlur={(e) => {
                          const val = parseInt(e.target.value);
                          if (!isNaN(val)) updateEnrollmentSettings.mutate({ enrollmentConditions: { ...enrollmentSettings?.enrollmentConditions, minActivityScore: val } });
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        defaultChecked={enrollmentSettings?.enrollmentConditions?.requireCompleteProfile || false}
                        onChange={(e) => updateEnrollmentSettings.mutate({ enrollmentConditions: { ...enrollmentSettings?.enrollmentConditions, requireCompleteProfile: e.target.checked } })}
                      />
                      {t("schoolDashboard.enrollmentRequireProfile")}
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        defaultChecked={enrollmentSettings?.enrollmentConditions?.requireAvatar || false}
                        onChange={(e) => updateEnrollmentSettings.mutate({ enrollmentConditions: { ...enrollmentSettings?.enrollmentConditions, requireAvatar: e.target.checked } })}
                      />
                      {t("schoolDashboard.enrollmentRequireAvatar")}
                    </label>
                  </div>
                  <div>
                    <Label className="text-sm">{t("schoolDashboard.enrollmentCustomNote")}</Label>
                    <Textarea
                      placeholder={t("schoolDashboard.enrollmentCustomNotePlaceholder")}
                      defaultValue={enrollmentSettings?.enrollmentConditions?.customNote || ""}
                      onBlur={(e) => updateEnrollmentSettings.mutate({ enrollmentConditions: { ...enrollmentSettings?.enrollmentConditions, customNote: e.target.value } })}
                      maxLength={500}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stats Badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant={enrollmentStatusFilter === "all" ? "default" : "outline"} className="cursor-pointer" onClick={() => setEnrollmentStatusFilter("all")}>
                {t("schoolDashboard.enrollmentAll")} ({enrollmentCounts.total})
              </Badge>
              <Badge variant={enrollmentStatusFilter === "pending" ? "default" : "outline"} className="cursor-pointer bg-yellow-100 text-yellow-800" onClick={() => setEnrollmentStatusFilter("pending")}>
                {t("schoolDashboard.enrollmentPending")} ({enrollmentCounts.pending})
              </Badge>
              <Badge variant={enrollmentStatusFilter === "approved" ? "default" : "outline"} className="cursor-pointer bg-green-100 text-green-800" onClick={() => setEnrollmentStatusFilter("approved")}>
                {t("schoolDashboard.enrollmentApproved")} ({enrollmentCounts.approved})
              </Badge>
              <Badge variant={enrollmentStatusFilter === "rejected" ? "default" : "outline"} className="cursor-pointer bg-red-100 text-red-800" onClick={() => setEnrollmentStatusFilter("rejected")}>
                {t("schoolDashboard.enrollmentRejected")} ({enrollmentCounts.rejected})
              </Badge>
            </div>

            {/* Search + Bulk Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder={t("schoolDashboard.enrollmentSearchPlaceholder")}
                value={enrollmentSearch}
                onChange={(e) => setEnrollmentSearch(e.target.value)}
                className="max-w-xs"
              />
              {selectedEnrollments.length > 0 && (
                <>
                  <span className="text-sm text-muted-foreground">{selectedEnrollments.length} {t("schoolDashboard.enrollmentSelected")}</span>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => bulkEnrollmentAction.mutate({ ids: selectedEnrollments, action: "approve" })} disabled={bulkEnrollmentAction.isPending}>
                    <CheckCircle className="h-4 w-4 ml-1" />
                    {t("schoolDashboard.enrollmentApproveBtn")}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => { setBulkAction("reject"); setShowRejectDialog(true); }} disabled={bulkEnrollmentAction.isPending}>
                    <XCircle className="h-4 w-4 ml-1" />
                    {t("schoolDashboard.enrollmentRejectBtn")}
                  </Button>
                </>
              )}
            </div>

            {/* Enrollment List */}
            {isEnrollmentsFetching ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : enrollments.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">{t("schoolDashboard.enrollmentNoResults")}</CardContent></Card>
            ) : (
              <div className="space-y-2">
                {/* Select All */}
                {enrollmentStatusFilter === "pending" && enrollments.length > 0 && (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedEnrollments.length === enrollments.filter((e: any) => e.status === "pending").length && selectedEnrollments.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedEnrollments(enrollments.filter((en: any) => en.status === "pending").map((en: any) => en.id));
                        } else {
                          setSelectedEnrollments([]);
                        }
                      }}
                    />
                    {t("schoolDashboard.enrollmentSelectAll")}
                  </label>
                )}

                {enrollments.map((enrollment: any) => (
                  <Card key={enrollment.id} className={`${selectedEnrollments.includes(enrollment.id) ? "ring-2 ring-blue-500" : ""}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {enrollment.status === "pending" && (
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={selectedEnrollments.includes(enrollment.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedEnrollments(prev => [...prev, enrollment.id]);
                              else setSelectedEnrollments(prev => prev.filter(id => id !== enrollment.id));
                            }}
                          />
                        )}
                        <div className="flex-shrink-0">
                          {enrollment.child?.avatarUrl ? (
                            <img src={enrollment.child.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                              {enrollment.child?.name?.charAt(0) || "?"}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{enrollment.child?.name}</span>
                            <Badge variant={enrollment.status === "pending" ? "outline" : enrollment.status === "approved" ? "default" : "destructive"} className={enrollment.status === "pending" ? "bg-yellow-50 text-yellow-700 border-yellow-200" : enrollment.status === "approved" ? "bg-green-50 text-green-700" : ""}>
                              {enrollment.status === "pending" ? t("schoolDashboard.enrollmentPending") : enrollment.status === "approved" ? t("schoolDashboard.enrollmentApproved") : t("schoolDashboard.enrollmentRejected")}
                            </Badge>
                            {enrollment.child?.age && <span className="text-xs text-muted-foreground">{enrollment.child.age} {t("schoolDashboard.enrollmentYears")}</span>}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {t("schoolDashboard.enrollmentParent")}: {enrollment.parent?.name} | {enrollment.child?.governorate || "-"} | {t("schoolDashboard.enrollmentPoints")}: {enrollment.child?.totalPoints || 0}
                          </div>
                          {enrollment.parentNote && <p className="text-sm mt-1 text-gray-600">"{enrollment.parentNote}"</p>}
                          {enrollment.rejectionReason && <p className="text-sm mt-1 text-red-600">{t("schoolDashboard.enrollmentRejectionReason")}: {enrollment.rejectionReason}</p>}
                          <div className="text-xs text-muted-foreground mt-1">{new Date(enrollment.createdAt).toLocaleString("ar")}</div>
                        </div>
                        <div className="flex gap-1">
                          {enrollment.status === "pending" && (
                            <>
                              <Button size="sm" variant="ghost" className="text-green-600 hover:text-green-700" onClick={() => bulkEnrollmentAction.mutate({ ids: [enrollment.id], action: "approve" })} disabled={bulkEnrollmentAction.isPending}>
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => { setSelectedEnrollments([enrollment.id]); setBulkAction("reject"); setShowRejectDialog(true); }} disabled={bulkEnrollmentAction.isPending}>
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Pagination */}
                {enrollmentData?.pagination?.hasMore && (
                  <div className="flex justify-center pt-2">
                    <Button variant="outline" size="sm" onClick={() => setEnrollmentPage(p => p + 1)}>{t("schoolDashboard.enrollmentLoadMore")}</Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reviews" className="space-y-4">
            <h2 className="text-lg font-bold">{t("schoolDashboard.reviewsHeader")}</h2>
            <div className="grid md:grid-cols-2 gap-2">
              <Input
                placeholder={t("schoolDashboard.reviewsSearchPlaceholder")}
                value={reviewsSearch}
                onChange={(e) => {
                  setReviewsSearch(e.target.value);
                  setReviewsPage(1);
                }}
              />
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={reviewsSort}
                onChange={(e) => {
                  setReviewsSort(e.target.value as any);
                  setReviewsPage(1);
                }}
              >
                <option value="newest">{t("schoolDashboard.newest")}</option>
                <option value="oldest">{t("schoolDashboard.oldest")}</option>
                <option value="highest">{t("schoolDashboard.highestRated")}</option>
                <option value="lowest">{t("schoolDashboard.lowestRated")}</option>
              </select>
            </div>
            {isReviewsFetching && (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                {t("schoolDashboard.updatingReviews")}
              </div>
            )}
            {reviews.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">{t("schoolDashboard.noReviewsYet")}</CardContent></Card>
            ) : (
              <>
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <Card key={review.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <span className="font-bold">{review.parentName || t("schoolDashboard.parentDefault")}</span>
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <Star key={n} className={`h-4 w-4 ${n <= review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />
                            ))}
                          </div>
                        </div>
                        {review.comment && <p className="text-sm mt-2 text-muted-foreground">{review.comment}</p>}
                        <p className="text-xs text-muted-foreground mt-1">{new Date(review.createdAt).toLocaleDateString("ar")}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Button variant="outline" size="sm" disabled={reviewsPage <= 1} onClick={() => setReviewsPage((p) => Math.max(1, p - 1))}>{t("schoolDashboard.previous")}</Button>
                  <span className="text-sm text-muted-foreground">{t("schoolDashboard.page")} {reviewsPage} {t("schoolDashboard.of")} {reviewsPagesCount}</span>
                  <Button variant="outline" size="sm" disabled={reviewsPage >= reviewsPagesCount} onClick={() => setReviewsPage((p) => Math.min(reviewsPagesCount, p + 1))}>{t("schoolDashboard.next")}</Button>
                </div>
              </>
            )}
          </TabsContent>

          {/* Polls Tab */}
          <TabsContent value="polls" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">{t("schoolDashboard.pollsHeader")}</h2>
              <Button onClick={() => { resetPollForm(); setShowPollModal(true); }} className="bg-blue-600">
                <Plus className="h-4 w-4 ml-1" />
                {t("schoolDashboard.createPoll")}
              </Button>
            </div>

            {polls.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">{t("schoolDashboard.noPollsYet")}</CardContent></Card>
            ) : (
              <div className="space-y-4">
                {[...polls].sort((a, b) => {
                  if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
                  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                }).map((poll) => {
                  const isExpired = poll.expiresAt && new Date(poll.expiresAt) < new Date();
                  const maxVotes = Math.max(1, ...Object.values(poll.optionCounts || {}));
                  return (
                    <Card key={poll.id} className={`overflow-hidden ${poll.isPinned ? "border-blue-400 border-2" : ""}`}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-blue-600" />
                            <div>
                              <h3 className="font-bold text-base">{poll.question}</h3>
                              <p className="text-xs text-muted-foreground">
                                {poll.authorType === "teacher"
                                  ? `👨‍🏫 ${(poll as any).teacherName || t("schoolDashboard.teacher")}`
                                  : `🏫 ${t("schoolDashboard.school")}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {poll.authorType === "teacher" && <Badge variant="secondary" className="text-xs">{t("schoolDashboard.teacher")}</Badge>}
                            {poll.isPinned && <Badge variant="secondary">📌 {t("schoolDashboard.pinned")}</Badge>}
                            {poll.isClosed && <Badge variant="destructive">{t("schoolDashboard.closed")}</Badge>}
                            {isExpired && !poll.isClosed && <Badge variant="outline">{t("schoolDashboard.expired")}</Badge>}
                            {poll.isAnonymous && <Badge variant="outline">{t("schoolDashboard.anonymous")}</Badge>}
                            {poll.allowMultiple && <Badge variant="outline">{t("schoolDashboard.multiple")}</Badge>}
                            {!poll.allowMultiple && <Badge variant="outline">{t("schoolDashboard.singleOnly")}</Badge>}
                          </div>
                        </div>

                        <div className="space-y-2">
                          {(poll.options || []).map((opt) => {
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
                                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="text-xs text-muted-foreground flex items-center gap-3">
                            <span>👥 {poll.votersCount} {t("schoolDashboard.voters")}</span>
                            <span>{new Date(poll.createdAt).toLocaleString("ar-EG", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                            {poll.expiresAt && <span>⏰ {new Date(poll.expiresAt).toLocaleString("ar-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updatePoll.mutate({ id: poll.id, isPinned: !poll.isPinned })}
                              title={poll.isPinned ? t("schoolDashboard.unpin") : t("schoolDashboard.pin")}
                            >
                              {poll.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updatePoll.mutate({ id: poll.id, isClosed: !poll.isClosed })}
                              title={poll.isClosed ? t("schoolDashboard.openPoll") : t("schoolDashboard.closePoll")}
                            >
                              {poll.isClosed ? <Unlock className="h-4 w-4 text-green-600" /> : <Lock className="h-4 w-4 text-orange-600" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { if (confirm(t("schoolDashboard.confirmDeletePoll"))) deletePoll.mutate(poll.id); }}
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

          <TabsContent value="activity" className="space-y-4">
            <h2 className="text-lg font-bold">{t("schoolDashboard.activityLog")}</h2>
            {activity.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">{t("schoolDashboard.noActivityYet")}</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {activity.map((log) => (
                  <Card key={log.id}>
                    <CardContent className="p-4 flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium">{getActivityLabel(log.action, t)}</p>
                        {log.metadata && <p className="text-xs text-muted-foreground mt-1">{JSON.stringify(log.metadata)}</p>}
                      </div>
                      <div className="text-left">
                        <Badge>{log.points > 0 ? `+${log.points}` : log.points}</Badge>
                        <p className="text-xs text-muted-foreground mt-1">{new Date(log.createdAt).toLocaleString("ar")}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="profile" className="space-y-4">
            <Card className="overflow-hidden">
              <div className="h-40 sm:h-48 md:h-56 bg-gradient-to-l from-blue-600 to-indigo-700 relative">
                {profile?.coverImageUrl && (
                  <img src={profile.coverImageUrl} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                )}
              </div>
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-14 sm:-mt-16">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white border-4 border-white flex items-center justify-center shadow-lg relative z-10 overflow-hidden">
                    <School className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600" />
                    {profile?.imageUrl && (
                      <img src={profile.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                    )}
                  </div>
                  <div className="flex-1 relative z-10">
                    <h2 className="text-xl sm:text-2xl font-bold">{profile?.name || t("schoolDashboard.school")}</h2>
                    {profile?.nameAr && <p className="text-muted-foreground text-sm">{profile.nameAr}</p>}
                    {profile?.description && <p className="text-sm mt-1 text-muted-foreground">{profile.description}</p>}
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-2">
                      {(profile?.address || profile?.city || profile?.governorate) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {[profile?.address, profile?.city, profile?.governorate].filter(Boolean).join("، ")}
                        </span>
                      )}
                      {profile?.email && <span>{profile.email}</span>}
                      {profile?.phoneNumber && <span>{profile.phoneNumber}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 relative z-10">
                    <Button variant="outline" onClick={openEditProfile}>
                      <Edit className="h-4 w-4 ml-1" />
                      {t("schoolDashboard.editData")}
                    </Button>
                    <Button variant="outline" onClick={() => window.open(`/school/${profile?.id}`, "_blank")}>
                      <Eye className="h-4 w-4 ml-1" />
                      {t("schoolDashboard.viewPublicPage")}
                    </Button>
                    <ShareMenu
                      url={typeof window !== "undefined" ? `${window.location.origin}/school/${profile?.id || ""}` : ""}
                      title={`${profile?.nameAr || profile?.name || t("schoolDashboard.school")} — Classify`}
                      description={profile?.description || ""}
                    />
                    <Button className="bg-blue-600" onClick={() => { setEditingPost(null); resetPostForm(); setShowPostModal(true); }}>
                      <Plus className="h-4 w-4 ml-1" />
                      {t("schoolDashboard.createPost")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {feed.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">{t("schoolDashboard.noPostsYet")}</CardContent></Card>
            ) : (
              <div className="space-y-4">
                {[...feed].sort((a, b) => {
                  if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
                  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                }).map((post) => (
                  <Card key={post.id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={post.authorType === "school" ? "default" : "secondary"}>
                            {post.authorType === "school" ? t("schoolDashboard.school") : post.teacherName || t("schoolDashboard.teacher")}
                          </Badge>
                          {post.isPinned && <Badge variant="outline">{t("schoolDashboard.pinned")}</Badge>}
                        </div>

                        {post.authorType === "school" && (
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" onClick={() => openEditPost(post)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => updatePost.mutate({ id: post.id, isPinned: !post.isPinned })}>
                              {post.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => {
                              if (confirm(t("schoolDashboard.confirmDeletePost"))) deletePost.mutate(post.id);
                            }}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {post.content && <p className="text-sm whitespace-pre-wrap">{post.content}</p>}

                      {post.mediaUrls?.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {post.mediaUrls.map((url, i) => (
                            post.mediaTypes?.[i] === "video" ? (
                              <video key={i} src={url} controls className="w-full h-36 rounded object-cover bg-black" />
                            ) : (
                              <img key={i} src={url} alt="" className="w-full h-36 rounded object-cover bg-gray-100" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                            )
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-4">
                          <span>❤️ {post.likesCount}</span>
                          <span>💬 {post.commentsCount}</span>
                          <span>{new Date(post.createdAt).toLocaleString("ar-EG", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => togglePostComments(post.id)}>
                          <MessageSquare className="h-4 w-4 ml-1" />
                          {showCommentsByPost[post.id] ? t("schoolDashboard.hideComments") : t("schoolDashboard.showComments")}
                        </Button>
                      </div>

                      {showCommentsByPost[post.id] && (
                        <div className="space-y-2 border-t pt-3">
                          {commentsLoadingByPost[post.id] ? (
                            <p className="text-xs text-muted-foreground">{t("schoolDashboard.loadingComments")}</p>
                          ) : (
                            (commentsByPost[post.id] || []).map((comment) => (
                              <div key={comment.id} className="bg-gray-50 dark:bg-gray-800 rounded p-2 text-sm">
                                <div className="font-medium text-xs">{comment.authorName}</div>
                                <div>{comment.content}</div>
                              </div>
                            ))
                          )}

                          <div className="flex gap-2">
                            <Input
                              placeholder={t("schoolDashboard.writeReplyToComments")}
                              value={commentInputByPost[post.id] || ""}
                              onChange={(e) => setCommentInputByPost((prev) => ({ ...prev, [post.id]: e.target.value }))}
                            />
                            <Button
                              size="sm"
                              className="bg-blue-600"
                              disabled={!commentInputByPost[post.id]?.trim() || addPostComment.isPending}
                              onClick={() => addPostComment.mutate({ postId: post.id, content: (commentInputByPost[post.id] || "").trim() })}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showTeacherModal} onOpenChange={setShowTeacherModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTeacher ? t("schoolDashboard.editTeacher") : t("schoolDashboard.addNewTeacher")}</DialogTitle>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>{t("schoolDashboard.nameLabel")}</Label>
              <Input value={teacherForm.name} onChange={(e) => setTeacherForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>{t("schoolDashboard.usernameLabel")}</Label>
              <Input value={teacherForm.username} onChange={(e) => setTeacherForm((f) => ({ ...f, username: e.target.value }))} />
            </div>
            <div>
              <Label>{editingTeacher ? t("schoolDashboard.newPasswordOptional") : t("schoolDashboard.passwordLabel")}</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={teacherForm.password}
                  onChange={(e) => setTeacherForm((f) => ({ ...f, password: e.target.value }))}
                />
                <Button type="button" variant="ghost" size="icon" className="absolute left-1 top-1/2 -translate-y-1/2" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div>
              <Label>{t("schoolDashboard.subjectLabel")}</Label>
              <Input value={teacherForm.subject} onChange={(e) => setTeacherForm((f) => ({ ...f, subject: e.target.value }))} />
            </div>
            <div>
              <Label>{t("schoolDashboard.yearsExpLabel")}</Label>
              <Input type="number" value={teacherForm.yearsExperience} onChange={(e) => setTeacherForm((f) => ({ ...f, yearsExperience: parseInt(e.target.value || "0", 10) || 0 }))} />
            </div>
            <div>
              <Label>{t("schoolDashboard.birthdayLabel")}</Label>
              <Input type="date" value={teacherForm.birthday} onChange={(e) => setTeacherForm((f) => ({ ...f, birthday: e.target.value }))} />
            </div>
            <div>
              <Label>{t("schoolDashboard.avatarUrlLabel")}</Label>
              <Input value={teacherForm.avatarUrl} onChange={(e) => setTeacherForm((f) => ({ ...f, avatarUrl: e.target.value }))} />
            </div>
            <div>
              <Label>{t("schoolDashboard.coverImageUrlLabel")}</Label>
              <Input value={teacherForm.coverImageUrl} onChange={(e) => setTeacherForm((f) => ({ ...f, coverImageUrl: e.target.value }))} />
            </div>
            <div>
              <Label>{t("schoolDashboard.monthlyRateLabel")}</Label>
              <Input value={teacherForm.monthlyRate} onChange={(e) => setTeacherForm((f) => ({ ...f, monthlyRate: e.target.value }))} />
            </div>
            <div>
              <Label>{t("schoolDashboard.perTaskRateLabel")}</Label>
              <Input value={teacherForm.perTaskRate} onChange={(e) => setTeacherForm((f) => ({ ...f, perTaskRate: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <Label>{t("schoolDashboard.bioLabel")}</Label>
              <Textarea value={teacherForm.bio} onChange={(e) => setTeacherForm((f) => ({ ...f, bio: e.target.value }))} />
            </div>

            <div>
              <Label>Facebook</Label>
              <Input value={teacherForm.socialLinks.facebook} onChange={(e) => setTeacherForm((f) => ({ ...f, socialLinks: { ...f.socialLinks, facebook: e.target.value } }))} />
            </div>
            <div>
              <Label>Twitter / X</Label>
              <Input value={teacherForm.socialLinks.twitter} onChange={(e) => setTeacherForm((f) => ({ ...f, socialLinks: { ...f.socialLinks, twitter: e.target.value } }))} />
            </div>
            <div>
              <Label>Instagram</Label>
              <Input value={teacherForm.socialLinks.instagram} onChange={(e) => setTeacherForm((f) => ({ ...f, socialLinks: { ...f.socialLinks, instagram: e.target.value } }))} />
            </div>
            <div>
              <Label>YouTube</Label>
              <Input value={teacherForm.socialLinks.youtube} onChange={(e) => setTeacherForm((f) => ({ ...f, socialLinks: { ...f.socialLinks, youtube: e.target.value } }))} />
            </div>
            <div>
              <Label>TikTok</Label>
              <Input value={teacherForm.socialLinks.tiktok} onChange={(e) => setTeacherForm((f) => ({ ...f, socialLinks: { ...f.socialLinks, tiktok: e.target.value } }))} />
            </div>
            <div>
              <Label>Website</Label>
              <Input value={teacherForm.socialLinks.website} onChange={(e) => setTeacherForm((f) => ({ ...f, socialLinks: { ...f.socialLinks, website: e.target.value } }))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTeacherModal(false)}>{t("schoolDashboard.cancel")}</Button>
            <Button className="bg-blue-600" onClick={handleSubmitTeacher}>
              {editingTeacher ? t("schoolDashboard.update") : t("schoolDashboard.add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPostModal} onOpenChange={setShowPostModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPost ? t("schoolDashboard.editPost") : t("schoolDashboard.newPostTitle")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Textarea
              placeholder={t("schoolDashboard.postContentPlaceholder")}
              value={postForm.content}
              onChange={(e) => setPostForm((p) => ({ ...p, content: e.target.value }))}
              className="min-h-[120px]"
            />

            <div className="flex flex-wrap items-center gap-2">
              <Label className="cursor-pointer inline-flex items-center gap-2 border rounded-md px-3 py-2">
                <Upload className="h-4 w-4" />
                {t("schoolDashboard.uploadMedia")}
                <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => { handlePostMediaSelected(e.target.files); e.target.value = ""; }} />
              </Label>
              <Button type="button" variant={postForm.isPinned ? "default" : "outline"} onClick={() => setPostForm((p) => ({ ...p, isPinned: !p.isPinned }))}>
                {postForm.isPinned ? <Pin className="h-4 w-4 ml-1" /> : <PinOff className="h-4 w-4 ml-1" />}
                {postForm.isPinned ? t("schoolDashboard.pinned") : t("schoolDashboard.unpinned")}
              </Button>
            </div>

            {(postForm.mediaUrls.length > 0 || pendingPostPreviews.length > 0) && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {/* Already uploaded media (for editing) */}
                {postForm.mediaUrls.map((url, i) => (
                  <div key={`uploaded-${i}`} className="relative rounded overflow-hidden border">
                    {postForm.mediaTypes[i] === "video" ? (
                      <video src={url} controls className="w-full h-28 object-cover bg-black" />
                    ) : (
                      <img src={url} alt="" className="w-full h-28 object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                    )}
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="absolute top-1 left-1 h-6 w-6"
                      onClick={() => removePostMedia(i)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                {/* Pending file previews (not yet uploaded) */}
                {pendingPostPreviews.map((preview, i) => (
                  <div key={`pending-${i}`} className="relative rounded overflow-hidden border">
                    {preview.type === "video" ? (
                      <video src={preview.url} controls className="w-full h-28 object-cover bg-black" />
                    ) : (
                      <img src={preview.url} alt="" className="w-full h-28 object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                    )}
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="absolute top-1 left-1 h-6 w-6"
                      onClick={() => removePostMedia(postForm.mediaUrls.length + i)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPostModal(false);
                setEditingPost(null);
                resetPostForm();
              }}
            >
              {t("schoolDashboard.cancel")}
            </Button>
            <Button className="bg-blue-600" onClick={handleSubmitPost} disabled={publishingPost}>
              {editingPost ? t("schoolDashboard.update") : t("schoolDashboard.publish")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("schoolDashboard.editSchoolData")}</DialogTitle>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>{t("schoolDashboard.nameLabel")}</Label>
              <Input value={profileForm.name} onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>{t("schoolDashboard.arabicNameLabel")}</Label>
              <Input value={profileForm.nameAr} onChange={(e) => setProfileForm((f) => ({ ...f, nameAr: e.target.value }))} />
            </div>
            <div>
              <Label>{t("schoolDashboard.schoolImageLabel")}</Label>
              <div className="space-y-2">
                <div className="w-16 h-16 rounded-full relative overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center border">
                  <School className="h-7 w-7 text-blue-600" />
                  {profileForm.imageUrl && (
                    <img src={profileForm.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                  )}
                </div>
                <Label className="cursor-pointer inline-flex items-center gap-2 border rounded-md px-3 py-2 text-sm">
                  <Upload className="h-4 w-4" />
                  {uploadingProfileImage ? t("schoolDashboard.uploading") : t("schoolDashboard.uploadFromDevice")}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { handleSelectSchoolProfileImage(e.target.files?.[0], "avatar"); e.target.value = ""; }}
                    disabled={uploadingProfileImage}
                  />
                </Label>
              </div>
            </div>
            <div>
              <Label>{t("schoolDashboard.coverImageLabel")}</Label>
              <div className="space-y-2">
                <div className="w-full h-16 rounded relative overflow-hidden bg-gray-100 dark:bg-gray-800 border">
                  {profileForm.coverImageUrl && (
                    <img src={profileForm.coverImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                  )}
                </div>
                <Label className="cursor-pointer inline-flex items-center gap-2 border rounded-md px-3 py-2 text-sm">
                  <Upload className="h-4 w-4" />
                  {uploadingProfileCover ? t("schoolDashboard.uploading") : t("schoolDashboard.uploadFromDevice")}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { handleSelectSchoolProfileImage(e.target.files?.[0], "cover"); e.target.value = ""; }}
                    disabled={uploadingProfileCover}
                  />
                </Label>
              </div>
            </div>
            <div>
              <Label>{t("schoolDashboard.phoneLabel")}</Label>
              <Input value={profileForm.phoneNumber} onChange={(e) => setProfileForm((f) => ({ ...f, phoneNumber: e.target.value }))} />
            </div>
            <div>
              <Label>{t("schoolDashboard.emailLabel")}</Label>
              <Input value={profileForm.email} onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <Label>{t("schoolDashboard.addressLabel")}</Label>
              <Input value={profileForm.address} onChange={(e) => setProfileForm((f) => ({ ...f, address: e.target.value }))} />
            </div>
            <div>
              <Label>{t("schoolDashboard.cityLabel")}</Label>
              <Input value={profileForm.city} onChange={(e) => setProfileForm((f) => ({ ...f, city: e.target.value }))} />
            </div>
            <div>
              <Label>{t("schoolDashboard.governorateLabel")}</Label>
              <Input value={profileForm.governorate} onChange={(e) => setProfileForm((f) => ({ ...f, governorate: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <Label>{t("schoolDashboard.descriptionLabel")}</Label>
              <Textarea value={profileForm.description} onChange={(e) => setProfileForm((f) => ({ ...f, description: e.target.value }))} />
            </div>

            <div>
              <Label>Facebook</Label>
              <Input value={profileForm.socialLinks.facebook} onChange={(e) => setProfileForm((f) => ({ ...f, socialLinks: { ...f.socialLinks, facebook: e.target.value } }))} />
            </div>
            <div>
              <Label>Twitter / X</Label>
              <Input value={profileForm.socialLinks.twitter} onChange={(e) => setProfileForm((f) => ({ ...f, socialLinks: { ...f.socialLinks, twitter: e.target.value } }))} />
            </div>
            <div>
              <Label>Instagram</Label>
              <Input value={profileForm.socialLinks.instagram} onChange={(e) => setProfileForm((f) => ({ ...f, socialLinks: { ...f.socialLinks, instagram: e.target.value } }))} />
            </div>
            <div>
              <Label>YouTube</Label>
              <Input value={profileForm.socialLinks.youtube} onChange={(e) => setProfileForm((f) => ({ ...f, socialLinks: { ...f.socialLinks, youtube: e.target.value } }))} />
            </div>
            <div>
              <Label>TikTok</Label>
              <Input value={profileForm.socialLinks.tiktok} onChange={(e) => setProfileForm((f) => ({ ...f, socialLinks: { ...f.socialLinks, tiktok: e.target.value } }))} />
            </div>
            <div>
              <Label>Website</Label>
              <Input value={profileForm.socialLinks.website} onChange={(e) => setProfileForm((f) => ({ ...f, socialLinks: { ...f.socialLinks, website: e.target.value } }))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProfileModal(false)}>{t("schoolDashboard.cancel")}</Button>
            <Button className="bg-blue-600" onClick={handleSubmitProfile}>{t("schoolDashboard.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Poll Creation Modal */}
      <Dialog open={showPollModal} onOpenChange={setShowPollModal}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t("schoolDashboard.createNewPoll")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("schoolDashboard.questionLabel")}</Label>
              <Input
                placeholder={t("schoolDashboard.pollQuestionPlaceholder")}
                value={pollForm.question}
                onChange={(e) => setPollForm((f) => ({ ...f, question: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("schoolDashboard.optionsLabel")}</Label>
              {pollForm.options.map((opt, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex gap-2">
                    <Input
                      placeholder={t("schoolDashboard.optionPlaceholder") + ` ${i + 1}`}
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
                            toast({ title: t("schoolDashboard.imageSizeLimit"), variant: "destructive" });
                            return;
                          }
                          try {
                            setUploadingPollOptionIdx(i);
                            const { url } = await uploadFileToStorage(file);
                            const newOpts = [...pollForm.options];
                            newOpts[i] = { ...newOpts[i], imageUrl: url };
                            setPollForm((f) => ({ ...f, options: newOpts }));
                            toast({ title: t("schoolDashboard.optionImageUploaded") + ` ${i + 1}` });
                          } catch (err: any) {
                            toast({ title: err.message || t("schoolDashboard.imageUploadFailed"), variant: "destructive" });
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
                            <Loader2 className="h-4 w-4 animate-spin" />
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
                  {t("schoolDashboard.addOption")}
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
                <span className="text-sm">{t("schoolDashboard.allowMultiple")}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pollForm.isAnonymous}
                  onChange={(e) => setPollForm((f) => ({ ...f, isAnonymous: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">{t("schoolDashboard.anonymousVoting")}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pollForm.isPinned}
                  onChange={(e) => setPollForm((f) => ({ ...f, isPinned: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">{t("schoolDashboard.pinPoll")}</span>
              </label>
            </div>

            <div>
              <Label>{t("schoolDashboard.expiryDateOptional")}</Label>
              <Input
                type="datetime-local"
                value={pollForm.expiresAt}
                onChange={(e) => setPollForm((f) => ({ ...f, expiresAt: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPollModal(false)}>{t("schoolDashboard.cancel")}</Button>
            <Button className="bg-blue-600" onClick={handleSubmitPoll} disabled={createPoll.isPending}>
              {createPoll.isPending ? t("schoolDashboard.creating") : t("schoolDashboard.createPollBtn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Cropper */}
      <ImageCropper
        open={cropperOpen}
        onClose={() => { setCropperOpen(false); setCropperImage(""); }}
        imageSrc={cropperImage}
        onCropComplete={handleCroppedImageUpload}
        mode={cropperMode}
      />

      {/* Transfer Teacher Modal */}
      <Dialog open={showTransferModal} onOpenChange={setShowTransferModal}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t("schoolDashboard.transferTeacher")} {transferTeacherName}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("schoolDashboard.targetSchoolLabel")}</Label>
              <select
                className="w-full border rounded-md p-2 mt-1 bg-background"
                value={transferForm.toSchoolId}
                onChange={e => setTransferForm(f => ({ ...f, toSchoolId: e.target.value }))}
              >
                <option value="">{t("schoolDashboard.selectSchoolPlaceholder")}</option>
                {availableSchools.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <Label>{t("schoolDashboard.performanceRatingLabel")}</Label>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setTransferForm(f => ({ ...f, performanceRating: n }))}
                    className={`p-1 rounded transition-colors ${transferForm.performanceRating >= n ? "text-yellow-500" : "text-gray-300"}`}
                  >
                    <Star className="h-6 w-6" fill={transferForm.performanceRating >= n ? "currentColor" : "none"} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>{t("schoolDashboard.performanceCommentLabel")}</Label>
              <Textarea
                value={transferForm.performanceComment}
                onChange={e => setTransferForm(f => ({ ...f, performanceComment: e.target.value }))}
                placeholder={t("schoolDashboard.performanceCommentPlaceholder")}
                rows={3}
              />
            </div>

            <div>
              <Label>{t("schoolDashboard.transferReasonLabel")}</Label>
              <Input
                value={transferForm.reason}
                onChange={e => setTransferForm(f => ({ ...f, reason: e.target.value }))}
                placeholder={t("schoolDashboard.transferReasonPlaceholder")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferModal(false)}>{t("schoolDashboard.cancel")}</Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700"
              disabled={!transferForm.toSchoolId || !transferForm.performanceRating || !transferForm.performanceComment || transferTeacher.isPending}
              onClick={() => {
                if (!transferTeacherId) return;
                transferTeacher.mutate({
                  id: transferTeacherId,
                  toSchoolId: transferForm.toSchoolId,
                  performanceRating: transferForm.performanceRating,
                  performanceComment: transferForm.performanceComment,
                  reason: transferForm.reason || undefined,
                });
              }}
            >
              {transferTeacher.isPending ? t("schoolDashboard.transferring") : t("schoolDashboard.confirmTransfer")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enrollment Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("schoolDashboard.enrollmentRejectTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>{t("schoolDashboard.enrollmentRejectionReasonLabel")}</Label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder={t("schoolDashboard.enrollmentRejectionReasonPlaceholder")}
              maxLength={500}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowRejectDialog(false); setRejectionReason(""); }}>{t("schoolDashboard.cancel")}</Button>
            <Button variant="destructive" disabled={bulkEnrollmentAction.isPending} onClick={() => {
              bulkEnrollmentAction.mutate({ ids: selectedEnrollments, action: "reject", rejectionReason: rejectionReason || undefined });
            }}>
              {bulkEnrollmentAction.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("schoolDashboard.enrollmentConfirmReject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
