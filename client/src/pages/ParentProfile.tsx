import { useState, useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, authenticatedFetch } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/contexts/ThemeContext";
import { ParentNotificationBell } from "@/components/NotificationBell";
import { LanguageSelector } from "@/components/LanguageSelector";
import { FollowButton } from "@/components/ui/FollowButton";
import { ShareMenu } from "@/components/ui/ShareMenu";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ImageCropper from "@/components/ImageCropper";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, ArrowLeft, Heart, BookOpen, Users, Star, Camera, Loader2,
  Send, ThumbsUp, MessageCircle, Trash2, Image as ImageIcon, Info, Clock,
  PenSquare, X, MapPin, School, GraduationCap, Sparkles, ChevronRight,
  ShoppingCart, UserCheck, Settings, Globe, Lock, Eye, EyeOff, Save,
  Facebook, Instagram, Youtube, Link2, Share2, Mail,
} from "lucide-react";

// ======= INTERFACES =======
interface ParentPost {
  id: string; parentId: string; content: string; mediaUrls?: string[]; mediaTypes?: string[];
  likesCount: number; commentsCount: number; isPinned: boolean; isActive: boolean;
  createdAt: string; updatedAt: string; authorName: string; authorAvatar?: string | null;
}
interface PostComment {
  id: string; postId: string; authorId: string; authorName: string; authorAvatar?: string | null;
  authorType: string; content: string; isActive: boolean; createdAt: string;
}

type TabType = "posts" | "about" | "library" | "following" | "edit";

// ======= POST CARD COMPONENT =======
function ParentPostCard({ post, isDark, isRTL, token, t, isLiked, expanded, commentOpen, commentInput,
  onToggleExpand, onLike, onDelete, onToggleComments, onCommentChange, onSubmitComment, isSubmittingComment,
}: {
  post: ParentPost; isDark: boolean; isRTL: boolean; token: string; t: (k: string) => string;
  isLiked: boolean; expanded: boolean; commentOpen: boolean; commentInput: string;
  onToggleExpand: () => void; onLike: () => void; onDelete: () => void;
  onToggleComments: () => void; onCommentChange: (v: string) => void; onSubmitComment: () => void;
  isSubmittingComment: boolean;
}) {
  const { data: comments } = useQuery<PostComment[]>({
    queryKey: ["parent-post-comments", post.id],
    queryFn: async () => {
      const res = await fetch(`/api/parent/posts/${post.id}/comments`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
    enabled: commentOpen,
  });

  const needsTruncate = post.content && post.content.length > 250;
  const displayContent = needsTruncate && !expanded ? post.content.slice(0, 250) + "..." : post.content;
  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return t("pp.posts.justNow");
    if (m < 60) return `${m} ${t("pp.posts.minutesAgo")}`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} ${t("pp.posts.hoursAgo")}`;
    const d = Math.floor(h / 24);
    return `${d} ${t("pp.posts.daysAgo")}`;
  };

  return (
    <Card className={`border-0 shadow-lg overflow-hidden ${isDark ? "bg-gray-800" : "bg-white"}`}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Avatar className="w-10 h-10">
              <AvatarImage src={post.authorAvatar || undefined} />
              <AvatarFallback className="bg-blue-100 text-blue-600 font-bold">{post.authorName?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className={`text-sm font-semibold leading-tight ${isDark ? "text-white" : "text-gray-800"}`}>{post.authorName}</p>
              <p className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>{timeAgo(post.createdAt)}</p>
            </div>
          </div>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        </div>

        {/* Content */}
        {post.content && (
          <div>
            <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isDark ? "text-gray-300" : "text-gray-700"}`}>{displayContent}</p>
            {needsTruncate && (
              <button onClick={onToggleExpand} className="text-xs text-blue-500 font-medium mt-1">
                {expanded ? t("pp.posts.showLess") : t("pp.posts.showMore")}
              </button>
            )}
          </div>
        )}

        {/* Media Gallery */}
        {post.mediaUrls && post.mediaUrls.length > 0 && (
          <div className={`grid gap-1.5 rounded-xl overflow-hidden ${post.mediaUrls.length === 1 ? "" : "grid-cols-2"}`}>
            {post.mediaUrls.map((url, i) => (
              post.mediaTypes?.[i] === "video" ? (
                <video key={i} src={url} controls className="w-full rounded-xl max-h-[300px] object-cover" />
              ) : (
                <img key={i} src={url} alt="" className="w-full rounded-xl max-h-[300px] object-cover cursor-pointer hover:opacity-90 transition-opacity" />
              )
            ))}
          </div>
        )}

        {/* Actions */}
        <div className={`flex items-center gap-1 pt-2 border-t ${isDark ? "border-gray-700" : "border-gray-100"}`}>
          <button onClick={onLike}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${isLiked ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : isDark ? "text-gray-400 hover:bg-gray-700" : "text-gray-500 hover:bg-gray-100"}`}>
            <ThumbsUp className={`w-3.5 h-3.5 ${isLiked ? "fill-current" : ""}`} />
            {post.likesCount > 0 && post.likesCount}
          </button>
          <button onClick={onToggleComments}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${commentOpen ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : isDark ? "text-gray-400 hover:bg-gray-700" : "text-gray-500 hover:bg-gray-100"}`}>
            <MessageCircle className="w-3.5 h-3.5" />
            {post.commentsCount > 0 && post.commentsCount}
          </button>
          <div className="flex-1" />
          <ShareMenu
            url={`${typeof window !== "undefined" ? window.location.origin : ""}/parent-post/${post.id}`}
            title={post.authorName}
            description={post.content?.slice(0, 100) || ""}
            size="sm"
            variant="ghost"
          />
        </div>

        {/* Comments Section */}
        {commentOpen && (
          <div className="space-y-2.5 pt-1">
            {comments && comments.length > 0 && (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {comments.map((c) => (
                  <div key={c.id} className={`flex items-start gap-2 p-2 rounded-xl ${isDark ? "bg-gray-700/50" : "bg-gray-50"}`}>
                    <Avatar className="w-6 h-6 flex-shrink-0">
                      <AvatarImage src={c.authorAvatar || undefined} />
                      <AvatarFallback className="bg-blue-100 text-blue-600 text-[10px] font-bold">{c.authorName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold ${isDark ? "text-white" : "text-gray-800"}`}>{c.authorName}</p>
                      <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>{c.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Input
                value={commentInput}
                onChange={(e) => onCommentChange(e.target.value)}
                placeholder={t("pp.posts.commentPlaceholder")}
                maxLength={1000}
                className={`flex-1 h-8 text-xs rounded-xl ${isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-50 border-gray-200"}`}
                onKeyDown={(e) => { if (e.key === "Enter" && commentInput.trim()) onSubmitComment(); }}
              />
              <Button size="sm" className="h-8 px-3 rounded-xl bg-blue-500 text-white" disabled={!commentInput.trim() || isSubmittingComment}
                onClick={onSubmitComment}>
                {isSubmittingComment ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ======= MAIN COMPONENT =======
export default function ParentProfile() {
  const [, navigate] = useLocation();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const token = localStorage.getItem("token");
  const isRTL = i18n.language === "ar";

  // State
  const [activeTab, setActiveTab] = useState<TabType>("posts");
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImage, setCropperImage] = useState("");
  const [cropperMode, setCropperMode] = useState<"avatar" | "cover">("avatar");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [imageVersion, setImageVersion] = useState(0);
  const [coverLoadError, setCoverLoadError] = useState(false);
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Post states
  const [postContent, setPostContent] = useState("");
  const [postMediaUrls, setPostMediaUrls] = useState<string[]>([]);
  const [postMediaTypes, setPostMediaTypes] = useState<string[]>([]);
  const [isUploadingPostMedia, setIsUploadingPostMedia] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());
  const postMediaRef = useRef<HTMLInputElement>(null);

  // Edit states
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editGovernorate, setEditGovernorate] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [profilePassword, setProfilePassword] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [selectedChild, setSelectedChild] = useState("");
  const [dismissedProfileHints, setDismissedProfileHints] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem("parentProfileSectionHints");
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  });

  // ======= QUERIES =======
  const { data: profileData } = useQuery<any>({
    queryKey: ["/api/parent/profile-data"],
    queryFn: () => authenticatedFetch("/api/parent/profile-data"),
    enabled: !!token,
  });

  const { data: postsData, isLoading: postsLoading } = useQuery<ParentPost[]>({
    queryKey: ["parent-my-posts"],
    queryFn: async () => {
      const res = await fetch("/api/parent/posts", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
    enabled: !!token && activeTab === "posts",
  });

  const { data: taskLibrary } = useQuery<any>({
    queryKey: ["/api/parent/task-library"],
    queryFn: () => authenticatedFetch("/api/parent/task-library"),
    enabled: !!token && activeTab === "library",
  });

  const { data: favorites } = useQuery<any>({
    queryKey: ["/api/parent/favorites"],
    queryFn: () => authenticatedFetch("/api/parent/favorites"),
    enabled: !!token && activeTab === "library",
  });

  const { data: following } = useQuery<any>({
    queryKey: ["/api/parent/following"],
    queryFn: () => authenticatedFetch("/api/parent/following"),
    enabled: !!token && activeTab === "following",
  });

  const { data: recommendations } = useQuery<any>({
    queryKey: ["/api/parent/recommendations"],
    queryFn: () => authenticatedFetch("/api/parent/recommendations"),
    enabled: !!token && activeTab === "following",
    staleTime: 120000,
  });

  const { data: childrenData } = useQuery({
    queryKey: ["/api/parent/children"],
    enabled: !!token,
  });

  // Check liked posts
  useEffect(() => {
    if (postsData && postsData.length > 0 && token) {
      const postIds = postsData.map(p => p.id);
      fetch("/api/parent/posts/check-likes", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ postIds }),
      }).then(r => r.json()).then(res => {
        if (res.success) setLikedPosts(res.data);
      }).catch(() => { });
    }
  }, [postsData, token]);

  // Fill edit form when profile loads
  useEffect(() => {
    if (profileData?.parent) {
      const p = profileData.parent;
      setEditName(p.name || "");
      setEditBio(p.bio || "");
      setEditGovernorate(p.governorate || "");
      setEditCity(p.city || "");
      setEditPhone(p.phoneNumber || "");
      setSocialLinks(p.socialLinks || {});
    }
  }, [profileData?.parent]);

  // ======= MUTATIONS =======
  const createPostMutation = useMutation({
    mutationFn: async (data: { content: string; mediaUrls: string[]; mediaTypes: string[] }) =>
      apiRequest("POST", "/api/parent/posts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parent-my-posts"] });
      setPostContent("");
      setPostMediaUrls([]);
      setPostMediaTypes([]);
      toast({ title: t("pp.posts.created") + " ✅" });
    },
    onError: (error: any) => {
      console.error("Create post error:", error);
      toast({ title: t("pp.posts.error") || "Failed to create post ❌", variant: "destructive" });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const res = await fetch(`/api/parent/posts/${postId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parent-my-posts"] });
      toast({ title: t("pp.posts.deleted") + " ✅" });
    },
  });

  const likePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const res = await fetch(`/api/parent/posts/${postId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()) as { liked: boolean; likesCount: number };
    },
    onSuccess: (data, postId) => {
      setLikedPosts(prev => ({ ...prev, [postId]: data.liked }));
      queryClient.invalidateQueries({ queryKey: ["parent-my-posts"] });
    },
  });

  const commentPostMutation = useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) =>
      apiRequest("POST", `/api/parent/posts/${postId}/comment`, { content }),
    onSuccess: (_, variables) => {
      setCommentInputs(prev => ({ ...prev, [variables.postId]: "" }));
      queryClient.invalidateQueries({ queryKey: ["parent-post-comments", variables.postId] });
      queryClient.invalidateQueries({ queryKey: ["parent-my-posts"] });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/parent/profile/update", data);
      return res.json();
    },
    onSuccess: (result: any) => {
      const updatedParent = result?.data?.parent;
      const profileRequiresPassword = result?.data?.profileRequiresPassword;

      queryClient.setQueryData(["/api/parent/profile-data"], (prev: any) => ({
        ...(prev || {}),
        parent: updatedParent || prev?.parent,
        profileRequiresPassword: typeof profileRequiresPassword === "boolean"
          ? profileRequiresPassword
          : prev?.profileRequiresPassword,
      }));

      setProfilePassword("");
      toast({ title: t("pp.edit.saved") + " ✅" });
    },
  });

  const updateSocialMutation = useMutation({
    mutationFn: async (links: any) => apiRequest("POST", "/api/parent/profile/social-links", { socialLinks: links }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parent/profile-data"] });
      toast({ title: t("pp.edit.saved") + " ✅" });
    },
  });

  const useTaskMutation = useMutation({
    mutationFn: async ({ libraryId, childId }: { libraryId: string; childId: string }) => {
      const res = await apiRequest("POST", `/api/parent/task-library/${libraryId}/use`, { childId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parent/task-library"] });
      toast({ title: t("pp.library.taskSent") + " ✅" });
    },
  });

  const toggleFavMutation = useMutation({
    mutationFn: async ({ taskType, taskId }: { taskType: string; taskId: string }) => {
      const res = await apiRequest("POST", "/api/parent/favorites/toggle", { taskType, taskId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parent/favorites"] });
    },
  });

  // ======= HANDLERS =======
  const handlePostMediaUpload = async (files: FileList) => {
    setIsUploadingPostMedia(true);
    try {
      const fd = new FormData();
      Array.from(files).slice(0, 5).forEach(f => fd.append("media", f));
      const res = await fetch("/api/parent/posts/media", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error("Upload failed");
      const json = await res.json();
      setPostMediaUrls(prev => [...prev, ...json.data.urls].slice(0, 5));
      setPostMediaTypes(prev => [...prev, ...json.data.types].slice(0, 5));
    } catch {
      toast({ title: t("pp.uploadFailed"), variant: "destructive" });
    } finally {
      setIsUploadingPostMedia(false);
    }
  };

  // Upload helpers for profile images (same as before)
  async function uploadFileForParent(file: File): Promise<string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
    const presignRes = await fetch("/api/parent/uploads/presign", {
      method: "POST", headers,
      body: JSON.stringify({ contentType: file.type, size: file.size, purpose: "profile_image", originalName: file.name }),
    });
    if (!presignRes.ok) throw new Error(t("pp.uploadFailed"));
    const { data: presign } = await presignRes.json();
    const isLocalUrl = presign.uploadURL.startsWith("/api/");
    if (isLocalUrl) {
      const directRes = await fetch(presign.uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!directRes.ok) throw new Error(t("pp.uploadFailed"));
    } else {
      const proxyRes = await fetch("/api/parent/uploads/proxy", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": file.type, "x-upload-object-path": presign.objectPath },
        body: file,
      });
      if (!proxyRes.ok) throw new Error(t("pp.uploadFailed"));
    }
    const finalizeRes = await fetch("/api/parent/uploads/finalize", {
      method: "POST", headers,
      body: JSON.stringify({ objectPath: presign.objectPath, mimeType: file.type, size: file.size, originalName: file.name, purpose: "profile_image" }),
    });
    if (!finalizeRes.ok) throw new Error(t("pp.uploadFailed"));
    const { data: media } = await finalizeRes.json();
    return media.url;
  }

  function handleSelectImage(e: React.ChangeEvent<HTMLInputElement>, type: "avatar" | "cover") {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: t("pp.selectImageOnly"), variant: "destructive" });
      return;
    }
    const url = URL.createObjectURL(file);
    setCropperImage(url);
    setCropperMode(type);
    setCropperOpen(true);
    e.target.value = "";
  }

  async function handleCroppedImage(blob: Blob) {
    const type = cropperMode;
    const file = new File([blob], `parent-${type}.jpg`, { type: "image/jpeg" });
    if (type === "avatar") { setAvatarUploading(true); setAvatarLoadError(false); }
    else { setCoverUploading(true); setCoverLoadError(false); }
    try {
      const url = await uploadFileForParent(file);
      await apiRequest("POST", "/api/parent/profile/update", { [type === "avatar" ? "avatarUrl" : "coverImageUrl"]: url });
      await queryClient.refetchQueries({ queryKey: ["/api/parent/profile-data"] });
      setImageVersion(v => v + 1);
      toast({ title: type === "avatar" ? t("pp.avatarUploaded") : t("pp.coverUploaded") });
    } catch (error: any) {
      toast({ title: error.message || t("pp.uploadFailed"), variant: "destructive" });
    } finally {
      if (type === "avatar") setAvatarUploading(false);
      else setCoverUploading(false);
    }
  }

  if (!token) { navigate("/parent-auth"); return null; }

  const parent = profileData?.parent;
  const stats = profileData?.stats;
  const childrenList = (childrenData as any)?.data || (childrenData as any) || [];
  const libraryTasks = taskLibrary?.tasks || [];
  const favList = favorites?.favorites || [];
  const followList = following?.following || [];
  const recs = recommendations || {};

  const tabs: { key: TabType; icon: any; label: string }[] = [
    { key: "posts", icon: PenSquare, label: t("pp.tabs.posts") },
    { key: "about", icon: Info, label: t("pp.tabs.about") },
    { key: "library", icon: BookOpen, label: t("pp.tabs.library") },
    { key: "following", icon: Users, label: t("pp.tabs.following") },
    { key: "edit", icon: Settings, label: t("pp.tabs.edit") },
  ];

  const profileSectionHints = useMemo(() => ([
    {
      id: "profile-posts",
      icon: "📝",
      title: t("pp.tabs.posts"),
    },
    {
      id: "profile-library",
      icon: "📘",
      title: t("pp.tabs.library"),
    },
    {
      id: "profile-edit",
      icon: "⚙️",
      title: t("pp.tabs.edit"),
    },
  ]), [t]);

  const visibleProfileHints = useMemo(
    () => profileSectionHints.filter((hint) => !dismissedProfileHints[hint.id]),
    [profileSectionHints, dismissedProfileHints]
  );

  const dismissProfileHint = (id: string) => {
    setDismissedProfileHints((prev) => {
      const next = { ...prev, [id]: true };
      localStorage.setItem("parentProfileSectionHints", JSON.stringify(next));
      return next;
    });
  };

  return (
    <div className={`relative min-h-screen pb-24 overflow-x-hidden ${isDark ? "bg-gradient-to-b from-slate-950 via-gray-950 to-slate-900 text-white" : "bg-gradient-to-br from-sky-50 via-white to-indigo-50 text-gray-900"}`} dir={isRTL ? "rtl" : "ltr"}>
      <div className={`pointer-events-none absolute -top-20 ${isRTL ? "-left-20" : "-right-20"} h-64 w-64 rounded-full blur-3xl ${isDark ? "bg-blue-700/20" : "bg-blue-300/35"}`} />
      <div className={`pointer-events-none absolute top-72 ${isRTL ? "-right-20" : "-left-20"} h-72 w-72 rounded-full blur-3xl ${isDark ? "bg-indigo-700/20" : "bg-indigo-200/40"}`} />
      {/* Sticky Header */}
      <div className={`sticky top-0 z-[10010] px-4 py-3 flex items-center gap-3 border-b ${isDark ? "bg-slate-900/90 border-slate-800" : "bg-white/90 border-indigo-100"} backdrop-blur-xl shadow-sm`}>
        <Button variant="ghost" size="icon" onClick={() => window.history.length > 1 ? window.history.back() : navigate("/parent-dashboard")}>
          {isRTL ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
        </Button>
        <h1 className="text-lg font-bold flex-1">{t("pp.title")}</h1>
        <LanguageSelector />
        <ParentNotificationBell />
      </div>

      {/* ======= COVER + AVATAR SECTION ======= */}
      <div className="relative max-w-4xl mx-auto">
        {/* Cover Image */}
        <div className={`h-44 sm:h-56 relative overflow-hidden rounded-b-3xl ring-1 ${isDark ? "bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 ring-slate-800" : "bg-gradient-to-br from-sky-400 via-indigo-500 to-blue-600 ring-white/70"}`}>
          {parent?.coverImageUrl && !coverLoadError && (
            <img
              key={`cover-${imageVersion}`}
              src={`${parent.coverImageUrl}${parent.coverImageUrl.includes("?") ? "&" : "?"}v=${imageVersion}`}
              alt="" className="absolute inset-0 w-full h-full object-cover"
              onError={() => setCoverLoadError(true)}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <button
            onClick={() => coverInputRef.current?.click()}
            disabled={coverUploading}
            className="absolute top-3 end-3 z-20 bg-black/45 hover:bg-black/65 text-white rounded-full px-3 py-1.5 text-xs flex items-center gap-1.5 transition-all backdrop-blur-sm shadow-lg"
          >
            {coverUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            {t("pp.changeCover")}
          </button>
          <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleSelectImage(e, "cover")} />
        </div>

        {/* Avatar + Info */}
        <div className="px-4 -mt-14 relative z-20">
          <div className="flex items-end gap-3">
            <div className={`relative h-24 w-24 rounded-full border-4 shadow-2xl flex items-center justify-center text-3xl font-bold ${isDark ? "bg-slate-800 border-slate-900 text-blue-400" : "bg-white border-white text-blue-600"}`}>
              {parent?.avatarUrl && !avatarLoadError ? (
                <img
                  key={`avatar-${imageVersion}`}
                  src={`${parent.avatarUrl}${parent.avatarUrl.includes("?") ? "&" : "?"}v=${imageVersion}`}
                  alt="" className="w-full h-full rounded-full object-cover"
                  onError={() => setAvatarLoadError(true)}
                />
              ) : (
                parent?.name?.charAt(0) || "👤"
              )}
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                className="absolute -bottom-1 -end-1 w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full flex items-center justify-center shadow-lg transition-all"
              >
                {avatarUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleSelectImage(e, "avatar")} />
            </div>
            <div className={`pb-1 flex-1 rounded-2xl px-3 py-2 backdrop-blur ${isDark ? "bg-slate-900/60" : "bg-white/70"}`}>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{parent?.name}</h2>
                <ShareMenu
                  url={typeof window !== "undefined" ? window.location.href : ""}
                  title={parent?.name || ""}
                  description={parent?.bio || t("pp.shareText")}
                  size="sm"
                  variant="ghost"
                />
              </div>
              {(parent?.governorate || parent?.city) && (
                <p className={`text-sm flex items-center gap-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  <MapPin className="w-3 h-3" /> {parent.governorate}{parent.city ? ` · ${parent.city}` : ""}
                </p>
              )}
              {parent?.bio && (
                <p className={`text-sm mt-1 line-clamp-2 ${isDark ? "text-gray-300" : "text-gray-600"}`}>{parent.bio}</p>
              )}
            </div>
          </div>
        </div>

        {/* Social Links row */}
        {parent?.socialLinks && Object.values(parent.socialLinks).some(Boolean) && (
          <div className="flex items-center gap-2 px-4 mt-3">
            {parent.socialLinks.facebook && (
              <a href={parent.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:opacity-80"><Facebook className="w-4 h-4" /></a>
            )}
            {parent.socialLinks.instagram && (
              <a href={parent.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 hover:opacity-80"><Instagram className="w-4 h-4" /></a>
            )}
            {parent.socialLinks.youtube && (
              <a href={parent.socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:opacity-80"><Youtube className="w-4 h-4" /></a>
            )}
            {parent.socialLinks.twitter && (
              <a href={parent.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 hover:opacity-80"><Globe className="w-4 h-4" /></a>
            )}
            {parent.socialLinks.website && (
              <a href={parent.socialLinks.website} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:opacity-80"><Link2 className="w-4 h-4" /></a>
            )}
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-2 px-4 mt-4 max-w-4xl mx-auto">
          {[
            { label: t("pp.stats.children"), value: stats?.children || 0, icon: Users, color: "text-blue-500", bg: isDark ? "bg-blue-900/20" : "bg-blue-50" },
            { label: t("pp.stats.library"), value: stats?.libraryTasks || 0, icon: BookOpen, color: "text-green-500", bg: isDark ? "bg-green-900/20" : "bg-green-50" },
            { label: t("pp.stats.favorites"), value: stats?.favorites || 0, icon: Heart, color: "text-pink-500", bg: isDark ? "bg-pink-900/20" : "bg-pink-50" },
            { label: t("pp.stats.following"), value: stats?.following || 0, icon: Star, color: "text-amber-500", bg: isDark ? "bg-amber-900/20" : "bg-amber-50" },
          ].map((s, i) => (
            <div key={i} className={`text-center p-2.5 rounded-2xl border shadow-sm ${s.bg} ${isDark ? "border-slate-800" : "border-white"}`}>
              <s.icon className={`h-4 w-4 mx-auto mb-1 ${s.color}`} />
              <p className="text-lg font-bold">{s.value}</p>
              <p className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ======= TAB BAR ======= */}
      <div className={`sticky top-[53px] z-30 mt-4 px-4 ${isDark ? "bg-slate-950/90" : "bg-transparent"} backdrop-blur-sm`}>
        <div className={`flex gap-1.5 overflow-x-auto hide-scrollbar pb-1 px-1.5 py-1.5 rounded-2xl border ${isDark ? "border-slate-800 bg-slate-900/80" : "border-indigo-100 bg-white/85"} shadow-sm`}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all rounded-t-xl ${activeTab === tab.key
                  ? "border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-950 shadow-sm"
                  : `border-transparent ${isDark ? "text-gray-500 hover:text-gray-300" : "text-gray-500 hover:text-gray-700"}`
                }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {visibleProfileHints.length > 0 && (
        <section className="px-4 mt-3 max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3">
          {visibleProfileHints.map((hint) => (
            <div key={hint.id} className={`relative rounded-2xl border p-3 sm:p-4 ${isDark ? "bg-slate-900/80 border-slate-700" : "bg-white/90 border-sky-100"}`}>
              <button
                type="button"
                className="absolute top-2 end-2 h-6 w-6 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center"
                onClick={() => dismissProfileHint(hint.id)}
                aria-label={hint.title}
              >
                <X className="w-3.5 h-3.5 text-gray-500" />
              </button>
              <div className="flex items-start gap-2 sm:gap-3 pe-6">
                <span className="text-lg sm:text-xl leading-none">{hint.icon}</span>
                <div>
                  <p className={`text-sm font-bold ${isDark ? "text-gray-100" : "text-gray-900"}`}>{hint.title}</p>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ======= TAB CONTENT ======= */}
      <main className="px-4 mt-4 max-w-4xl mx-auto">
        <AnimatePresence mode="wait">
          {/* ========== POSTS TAB ========== */}
          {activeTab === "posts" && (
            <motion.div key="posts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              {/* Create Post */}
              <Card className={`border-0 shadow-lg ${isDark ? "bg-gray-800" : "bg-white"}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      <AvatarImage src={parent?.avatarUrl || undefined} />
                      <AvatarFallback className="bg-blue-100 text-blue-600 font-bold">{parent?.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <Textarea
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      placeholder={t("pp.posts.placeholder")}
                      maxLength={5000}
                      className={`min-h-[80px] resize-none rounded-xl flex-1 ${isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-50 border-gray-200"}`}
                    />
                  </div>

                  {/* Media Preview */}
                  {postMediaUrls.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {postMediaUrls.map((url, i) => (
                        <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden">
                          {postMediaTypes[i] === "video" ? (
                            <video src={url} className="w-full h-full object-cover" />
                          ) : (
                            <img src={url} alt="" className="w-full h-full object-cover" />
                          )}
                          <button
                            onClick={() => {
                              setPostMediaUrls(prev => prev.filter((_, idx) => idx !== i));
                              setPostMediaTypes(prev => prev.filter((_, idx) => idx !== i));
                            }}
                            className="absolute top-0.5 end-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px]"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => postMediaRef.current?.click()}
                        disabled={isUploadingPostMedia || postMediaUrls.length >= 5}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${isDark ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"} disabled:opacity-50`}
                      >
                        {isUploadingPostMedia ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                        {t("pp.posts.addMedia")}
                      </button>
                      <input ref={postMediaRef} type="file" accept="image/*,video/*" multiple className="hidden"
                        onChange={(e) => { if (e.target.files) handlePostMediaUpload(e.target.files); e.target.value = ""; }} />
                      <span className={`text-[10px] ${isDark ? "text-gray-600" : "text-gray-400"}`}>{postContent.length}/5000</span>
                    </div>
                    <Button
                      size="sm"
                      className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white"
                      disabled={createPostMutation.isPending || (!postContent.trim() && postMediaUrls.length === 0)}
                      onClick={() => createPostMutation.mutate({ content: postContent.trim(), mediaUrls: postMediaUrls, mediaTypes: postMediaTypes })}
                    >
                      {createPostMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-3.5 h-3.5 me-1" /> {t("pp.posts.publish")}</>}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Posts Feed */}
              {postsLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
              ) : (!postsData || postsData.length === 0) ? (
                <div className="text-center py-10">
                  <PenSquare className={`w-10 h-10 mx-auto mb-3 ${isDark ? "text-gray-600" : "text-gray-300"}`} />
                  <p className={`text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>{t("pp.posts.empty")}</p>
                </div>
              ) : (
                postsData.map((post) => (
                  <ParentPostCard
                    key={post.id}
                    post={post}
                    isDark={isDark}
                    isRTL={isRTL}
                    token={token!}
                    t={t}
                    isLiked={likedPosts[post.id] || false}
                    expanded={expandedPosts.has(post.id)}
                    commentOpen={openComments.has(post.id)}
                    commentInput={commentInputs[post.id] || ""}
                    onToggleExpand={() => setExpandedPosts(prev => { const n = new Set(prev); if (n.has(post.id)) n.delete(post.id); else n.add(post.id); return n; })}
                    onLike={() => likePostMutation.mutate(post.id)}
                    onDelete={() => deletePostMutation.mutate(post.id)}
                    onToggleComments={() => setOpenComments(prev => { const n = new Set(prev); if (n.has(post.id)) n.delete(post.id); else n.add(post.id); return n; })}
                    onCommentChange={(val) => setCommentInputs(prev => ({ ...prev, [post.id]: val }))}
                    onSubmitComment={() => commentPostMutation.mutate({ postId: post.id, content: commentInputs[post.id] || "" })}
                    isSubmittingComment={commentPostMutation.isPending}
                  />
                ))
              )}
            </motion.div>
          )}

          {/* ========== ABOUT TAB ========== */}
          {activeTab === "about" && (
            <motion.div key="about" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              {/* Bio */}
              {parent?.bio && (
                <Card className={`border-0 shadow-lg ${isDark ? "bg-gray-800" : "bg-white"}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Info className="w-5 h-5 text-blue-500" />
                      <h3 className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>{t("pp.about.bio")}</h3>
                    </div>
                    <p className={`text-sm leading-relaxed ${isDark ? "text-gray-300" : "text-gray-600"}`}>{parent.bio}</p>
                  </CardContent>
                </Card>
              )}

              {/* Personal Info */}
              <Card className={`border-0 shadow-lg ${isDark ? "bg-gray-800" : "bg-white"}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <UserCheck className="w-5 h-5 text-indigo-500" />
                    <h3 className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>{t("pp.about.personalInfo")}</h3>
                  </div>
                  {parent?.email && (
                    <div className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? "bg-gray-700/50" : "bg-gray-50"}`}>
                      <Mail className="w-5 h-5 text-blue-500 flex-shrink-0" />
                      <div>
                        <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>{t("pp.about.email")}</p>
                        <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-800"}`}>{parent.email}</p>
                      </div>
                    </div>
                  )}
                  {parent?.phoneNumber && (
                    <div className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? "bg-gray-700/50" : "bg-gray-50"}`}>
                      <Globe className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <div>
                        <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>{t("pp.about.phone")}</p>
                        <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-800"}`}>{parent.phoneNumber}</p>
                      </div>
                    </div>
                  )}
                  {parent?.governorate && (
                    <div className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? "bg-gray-700/50" : "bg-gray-50"}`}>
                      <MapPin className="w-5 h-5 text-red-500 flex-shrink-0" />
                      <div>
                        <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>{t("pp.about.location")}</p>
                        <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-800"}`}>{parent.governorate}{parent.city ? ` · ${parent.city}` : ""}</p>
                      </div>
                    </div>
                  )}
                  {parent?.createdAt && (
                    <div className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? "bg-gray-700/50" : "bg-gray-50"}`}>
                      <Clock className="w-5 h-5 text-gray-500 flex-shrink-0" />
                      <div>
                        <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>{t("pp.about.joined")}</p>
                        <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-800"}`}>
                          {new Date(parent.createdAt).toLocaleDateString(isRTL ? "ar-EG" : "en-US", { year: "numeric", month: "long", day: "numeric" })}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Children Overview */}
              {Array.isArray(childrenList) && childrenList.length > 0 && (
                <Card className={`border-0 shadow-lg ${isDark ? "bg-gray-800" : "bg-white"}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="w-5 h-5 text-purple-500" />
                      <h3 className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>{t("pp.about.children")}</h3>
                      <Badge className="ms-auto">{childrenList.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {childrenList.map((child: any) => (
                        <div key={child.id} className={`flex items-center gap-3 p-2.5 rounded-xl ${isDark ? "bg-gray-700/50" : "bg-gray-50"}`}>
                          <Avatar className="w-9 h-9">
                            <AvatarImage src={child.avatarUrl} />
                            <AvatarFallback className="bg-purple-100 text-purple-600 font-bold text-sm">{child.name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-800"}`}>{child.name}</p>
                            <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>{child.totalPoints || 0} {t("pp.about.pts")}</p>
                          </div>
                          <Star className="w-4 h-4 text-amber-500" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Share Profile */}
              <Card className={`border-0 shadow-lg ${isDark ? "bg-gray-800" : "bg-white"}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Share2 className="w-5 h-5 text-blue-500" />
                      <h3 className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>{t("pp.about.shareProfile")}</h3>
                    </div>
                    <ShareMenu
                      url={typeof window !== "undefined" ? window.location.href : ""}
                      title={parent?.name || ""}
                      description={parent?.bio || t("pp.shareText")}
                      size="sm"
                    />
                  </div>
                  {parent?.uniqueCode && (
                    <div className={`mt-3 flex items-center gap-3 p-3 rounded-xl ${isDark ? "bg-gray-700/50" : "bg-gray-50"}`}>
                      <div className="flex-1">
                        <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t("pp.about.linkCode")}</p>
                        <p className={`text-sm font-mono font-bold ${isDark ? "text-white" : "text-gray-800"}`}>{parent.uniqueCode}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ========== LIBRARY TAB ========== */}
          {activeTab === "library" && (
            <motion.div key="library" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              {/* Task Library */}
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className={`w-5 h-5 ${isDark ? "text-green-400" : "text-green-600"}`} />
                <h3 className={`font-bold text-sm ${isDark ? "text-white" : "text-gray-800"}`}>{t("pp.library.title")}</h3>
              </div>
              {libraryTasks.length === 0 ? (
                <Card className={`border-0 shadow-lg ${isDark ? "bg-gray-800" : "bg-white"}`}>
                  <CardContent className="p-6 text-center">
                    <BookOpen className={`h-10 w-10 mx-auto mb-2 ${isDark ? "text-gray-600" : "text-gray-300"}`} />
                    <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t("pp.library.empty")}</p>
                  </CardContent>
                </Card>
              ) : (
                libraryTasks.map((item: any) => (
                  <Card key={item.id} className={`border-0 shadow-lg ${isDark ? "bg-gray-800" : "bg-white"}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className={`font-semibold text-sm ${isDark ? "text-white" : "text-gray-800"}`}>{item.title}</h4>
                          <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                            {item.subjectLabel || t("pp.library.noSubject")} • {item.pointsReward} {t("pp.library.pts")}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {item.purchaseType === "permanent" ? t("pp.library.permanent") : t("pp.library.oneTime")}
                            </Badge>
                            <span className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                              {t("pp.library.used")} {item.usageCount}x
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <select
                            value={selectedChild}
                            onChange={(e) => setSelectedChild(e.target.value)}
                            className={`text-xs px-2 py-1 rounded-lg border ${isDark ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"}`}
                          >
                            <option value="">{t("pp.library.selectChild")}</option>
                            {(Array.isArray(childrenList) ? childrenList : []).map((c: any) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                          <Button size="sm" className="text-xs gap-1" disabled={!selectedChild || useTaskMutation.isPending}
                            onClick={() => useTaskMutation.mutate({ libraryId: item.id, childId: selectedChild })}>
                            <Send className="h-3 w-3" /> {t("pp.library.send")}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}

              {/* Favorites Section */}
              <div className="flex items-center gap-2 mt-6 mb-1">
                <Heart className={`w-5 h-5 ${isDark ? "text-pink-400" : "text-pink-600"}`} />
                <h3 className={`font-bold text-sm ${isDark ? "text-white" : "text-gray-800"}`}>{t("pp.library.favorites")}</h3>
              </div>
              {favList.length === 0 ? (
                <Card className={`border-0 shadow-lg ${isDark ? "bg-gray-800" : "bg-white"}`}>
                  <CardContent className="p-6 text-center">
                    <Heart className={`h-10 w-10 mx-auto mb-2 ${isDark ? "text-gray-600" : "text-gray-300"}`} />
                    <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t("pp.library.noFavorites")}</p>
                  </CardContent>
                </Card>
              ) : (
                favList.map((fav: any) => (
                  <Card key={fav.id} className={`border-0 shadow-lg ${isDark ? "bg-gray-800" : "bg-white"}`}>
                    <CardContent className="p-4 flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className={`font-semibold text-sm ${isDark ? "text-white" : "text-gray-800"}`}>{fav.task?.title || fav.task?.question}</h4>
                        <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                          {fav.taskType === "teacher_task" ? t("pp.library.teacherTask") : t("pp.library.templateTask")}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => toggleFavMutation.mutate({ taskType: fav.taskType, taskId: fav.taskId })}>
                        <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </motion.div>
          )}

          {/* ========== FOLLOWING TAB ========== */}
          {activeTab === "following" && (
            <motion.div key="following" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              {/* Following List */}
              <div className="flex items-center gap-2 mb-1">
                <Users className={`w-5 h-5 ${isDark ? "text-blue-400" : "text-blue-600"}`} />
                <h3 className={`font-bold text-sm ${isDark ? "text-white" : "text-gray-800"}`}>{t("pp.following.title")}</h3>
              </div>
              {followList.length === 0 ? (
                <Card className={`border-0 shadow-lg ${isDark ? "bg-gray-800" : "bg-white"}`}>
                  <CardContent className="p-6 text-center">
                    <Users className={`h-10 w-10 mx-auto mb-2 ${isDark ? "text-gray-600" : "text-gray-300"}`} />
                    <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t("pp.following.empty")}</p>
                  </CardContent>
                </Card>
              ) : (
                followList.map((f: any) => (
                  <Card key={f.id} className={`border-0 shadow-lg cursor-pointer ${isDark ? "bg-gray-800" : "bg-white"}`}
                    onClick={() => navigate(f.entityType === "school" ? `/school/${f.entityId}` : `/teacher/${f.entityId}`)}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isDark ? "bg-gray-700" : "bg-gray-100"}`}>
                        {f.entityType === "school" ? <School className="h-5 w-5 text-blue-500" /> : <GraduationCap className="h-5 w-5 text-purple-500" />}
                      </div>
                      <div className="flex-1">
                        <h4 className={`font-semibold text-sm ${isDark ? "text-white" : "text-gray-800"}`}>{f.entity?.name || t("pp.following.unknown")}</h4>
                        <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                          {f.entityType === "school" ? t("pp.following.school") : t("pp.following.teacher")}
                          {f.entity?.subject ? ` · ${f.entity.subject}` : ""}
                        </p>
                      </div>
                      <ChevronRight className={`h-4 w-4 ${isDark ? "text-gray-500" : "text-gray-400"}`} />
                    </CardContent>
                  </Card>
                ))
              )}

              {/* Recommendations */}
              {recs.teachers && recs.teachers.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className={`w-5 h-5 text-amber-500`} />
                    <h3 className={`font-bold text-sm ${isDark ? "text-white" : "text-gray-800"}`}>{t("pp.following.suggested")}</h3>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
                    {recs.teachers.map((teacher: any) => (
                      <Card key={teacher.id} className={`min-w-[150px] cursor-pointer flex-shrink-0 border-0 shadow-lg ${isDark ? "bg-gray-800" : "bg-white"}`}
                        onClick={() => navigate(`/teacher/${teacher.id}`)}>
                        <CardContent className="p-3 text-center">
                          <Avatar className="w-12 h-12 mx-auto">
                            <AvatarImage src={teacher.avatarUrl} />
                            <AvatarFallback className="bg-purple-100 text-purple-600 font-bold">{teacher.name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <p className="font-semibold text-sm mt-2 truncate">{teacher.name}</p>
                          <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{teacher.subject || t("pp.following.general")}</p>
                          <FollowButton entityType="teacher" entityId={teacher.id} size="sm" className="mt-2 w-full text-xs" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {recs.schools && recs.schools.length > 0 && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <School className={`w-5 h-5 text-blue-500`} />
                    <h3 className={`font-bold text-sm ${isDark ? "text-white" : "text-gray-800"}`}>{t("pp.following.suggestedSchools")}</h3>
                  </div>
                  {recs.schools.map((s: any) => (
                    <Card key={s.id} className={`cursor-pointer border-0 shadow-lg mb-2 ${isDark ? "bg-gray-800" : "bg-white"}`}
                      onClick={() => navigate(`/school/${s.id}`)}>
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isDark ? "bg-blue-900/50" : "bg-blue-100"}`}>
                          <School className="h-5 w-5 text-blue-500" />
                        </div>
                        <div className="flex-1">
                          <p className={`font-semibold text-sm ${isDark ? "text-white" : "text-gray-800"}`}>{s.name}</p>
                          <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{s.governorate || ""}</p>
                        </div>
                        <FollowButton entityType="school" entityId={s.id} size="sm" className="text-xs" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ========== EDIT TAB ========== */}
          {activeTab === "edit" && (
            <motion.div key="edit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              {/* Basic Info */}
              <Card className={`border-0 shadow-lg ${isDark ? "bg-gray-800" : "bg-white"}`}>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <UserCheck className="w-5 h-5 text-blue-500" />
                    <h3 className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>{t("pp.edit.basicInfo")}</h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className={`text-xs font-medium block mb-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t("pp.edit.name")}</label>
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)}
                        className={`rounded-xl ${isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-50 border-gray-200"}`} />
                    </div>
                    <div>
                      <label className={`text-xs font-medium block mb-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t("pp.edit.bio")}</label>
                      <Textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} maxLength={500}
                        placeholder={t("pp.edit.bioPlaceholder")}
                        className={`min-h-[80px] resize-none rounded-xl ${isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-50 border-gray-200"}`} />
                    </div>
                    <div>
                      <label className={`text-xs font-medium block mb-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t("pp.edit.phone")}</label>
                      <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)}
                        className={`rounded-xl ${isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-50 border-gray-200"}`} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={`text-xs font-medium block mb-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t("pp.edit.governorate")}</label>
                        <Input value={editGovernorate} onChange={(e) => setEditGovernorate(e.target.value)}
                          className={`rounded-xl ${isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-50 border-gray-200"}`} />
                      </div>
                      <div>
                        <label className={`text-xs font-medium block mb-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t("pp.edit.city")}</label>
                        <Input value={editCity} onChange={(e) => setEditCity(e.target.value)}
                          className={`rounded-xl ${isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-50 border-gray-200"}`} />
                      </div>
                    </div>
                  </div>
                  <Button
                    className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white"
                    disabled={updateProfileMutation.isPending || (!!profileData?.profileRequiresPassword && !profilePassword.trim())}
                    onClick={() => updateProfileMutation.mutate({
                      name: editName,
                      bio: editBio,
                      phoneNumber: editPhone,
                      governorate: editGovernorate,
                      city: editCity,
                      currentPassword: profileData?.profileRequiresPassword ? profilePassword : undefined,
                    })}
                  >
                    {updateProfileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 me-2" /> {t("pp.edit.save")}</>}
                  </Button>

                  {profileData?.profileRequiresPassword && (
                    <div>
                      <label className={`text-xs font-medium block mb-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t("pp.edit.oldPassword")}</label>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          value={profilePassword}
                          onChange={(e) => setProfilePassword(e.target.value)}
                          className={`rounded-xl pe-10 ${isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-50 border-gray-200"}`}
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute end-3 top-1/2 -translate-y-1/2">
                          {showPassword ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                        </button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Social Links */}
              <Card className={`border-0 shadow-lg ${isDark ? "bg-gray-800" : "bg-white"}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Globe className="w-5 h-5 text-indigo-500" />
                    <h3 className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>{t("pp.edit.socialLinks")}</h3>
                  </div>
                  {[
                    { key: "facebook", icon: Facebook, color: "text-blue-600", placeholder: "https://facebook.com/..." },
                    { key: "instagram", icon: Instagram, color: "text-pink-600", placeholder: "https://instagram.com/..." },
                    { key: "twitter", icon: Globe, color: "text-sky-500", placeholder: "https://x.com/..." },
                    { key: "youtube", icon: Youtube, color: "text-red-600", placeholder: "https://youtube.com/..." },
                    { key: "tiktok", icon: Sparkles, color: "text-purple-500", placeholder: "https://tiktok.com/@..." },
                    { key: "website", icon: Link2, color: "text-gray-500", placeholder: "https://..." },
                  ].map(s => (
                    <div key={s.key} className="flex items-center gap-2">
                      <s.icon className={`w-4 h-4 flex-shrink-0 ${s.color}`} />
                      <Input
                        value={socialLinks[s.key] || ""}
                        onChange={(e) => setSocialLinks(prev => ({ ...prev, [s.key]: e.target.value }))}
                        placeholder={s.placeholder}
                        className={`flex-1 h-9 text-xs rounded-xl ${isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-50 border-gray-200"}`}
                      />
                    </div>
                  ))}
                  <Button
                    className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
                    disabled={updateSocialMutation.isPending}
                    onClick={() => updateSocialMutation.mutate(socialLinks)}
                  >
                    {updateSocialMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 me-2" /> {t("pp.edit.saveSocial")}</>}
                  </Button>
                </CardContent>
              </Card>

              {/* Change Password */}
              <Card className={`border-0 shadow-lg ${isDark ? "bg-gray-800" : "bg-white"}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Lock className="w-5 h-5 text-red-500" />
                    <h3 className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>{t("pp.edit.changePassword")}</h3>
                  </div>
                  <div>
                    <label className={`text-xs font-medium block mb-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t("pp.edit.oldPassword")}</label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        className={`rounded-xl pe-10 ${isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-50 border-gray-200"}`}
                      />
                      <button onClick={() => setShowPassword(!showPassword)} className="absolute end-3 top-1/2 -translate-y-1/2">
                        {showPassword ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className={`text-xs font-medium block mb-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t("pp.edit.newPassword")}</label>
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={`rounded-xl ${isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-50 border-gray-200"}`}
                    />
                  </div>
                  <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>{t("pp.edit.passwordNote")}</p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Image Cropper */}
      <ImageCropper
        open={cropperOpen}
        onClose={() => { setCropperOpen(false); setCropperImage(""); }}
        imageSrc={cropperImage}
        onCropComplete={handleCroppedImage}
        mode={cropperMode}
      />
    </div>
  );
}
