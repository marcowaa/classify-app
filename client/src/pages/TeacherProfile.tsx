import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ProfileHeader } from "@/components/ui/ProfileHeader";
import {
  GraduationCap, Star, MessageSquare, BookOpen, Heart,
  Users, Briefcase, Clock, Send, ShoppingCart, UserPlus, Check, ArrowRight
} from "lucide-react";
import { ShareMenu } from "@/components/ui/ShareMenu";
import { LanguageSelector } from "@/components/LanguageSelector";

export default function TeacherProfile() {
  const [, params] = useRoute("/teacher/:id");
  const [, navigate] = useLocation();
  const teacherId = params?.id;
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [localLikesCount, setLocalLikesCount] = useState<Record<string, number>>({});
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const [postComments, setPostComments] = useState<Record<string, any[]>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [taskLiked, setTaskLiked] = useState<Record<string, boolean>>({});
  const [taskLikesLocal, setTaskLikesLocal] = useState<Record<string, number>>({});
  const [taskInCart, setTaskInCart] = useState<Record<string, boolean>>({});
  const [taskPurchased, setTaskPurchased] = useState<Record<string, boolean>>({});
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);
  const [monthlyPoints, setMonthlyPoints] = useState("");
  const [perHelpPoints, setPerHelpPoints] = useState("");
  const [activeTab, setActiveTab] = useState("tasks");
  const [showMiniHeader, setShowMiniHeader] = useState(false);

  const token = localStorage.getItem("token") || localStorage.getItem("childToken");
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const { data: teacher, isLoading } = useQuery({
    queryKey: ["public-teacher", teacherId],
    queryFn: async () => {
      const res = await fetch(`/api/public/teacher/${teacherId}`);
      if (!res.ok) throw new Error("Not found");
      const json = await res.json();
      return json.data;
    },
    enabled: !!teacherId,
  });

  // Teacher posts (same as school posts but filtered by teacher)
  const { data: postsData } = useQuery({
    queryKey: ["teacher-posts", teacherId],
    queryFn: async () => {
      const res = await fetch(`/api/store/schools/teacher/${teacherId}/posts`);
      if (!res.ok) return { posts: [] };
      const json = await res.json();
      return json.data || { posts: [] };
    },
    enabled: !!teacherId,
  });

  // Teacher tasks for sale - use browse-tasks with teacher filter
  const { data: tasksData } = useQuery({
    queryKey: ["teacher-tasks-public", teacherId],
    queryFn: async () => {
      // Use browse-tasks if parent is logged in (for purchase/like/cart status)
      const parentToken = localStorage.getItem("token");
      if (parentToken) {
        const res = await fetch(`/api/parent/browse-tasks?teacherId=${teacherId}`, {
          headers: { Authorization: `Bearer ${parentToken}` },
        });
        if (res.ok) {
          const json = await res.json();
          const tasks = json.data?.tasks || [];
          // Initialize local state from server data
          const liked: Record<string, boolean> = {};
          const likes: Record<string, number> = {};
          const inCart: Record<string, boolean> = {};
          const purchased: Record<string, boolean> = {};
          tasks.forEach((t: any) => {
            liked[t.id] = t.isLiked;
            likes[t.id] = t.likesCount;
            inCart[t.id] = t.inCart;
            purchased[t.id] = t.isPurchased;
          });
          setTaskLiked(liked);
          setTaskLikesLocal(likes);
          setTaskInCart(inCart);
          setTaskPurchased(purchased);
          return { tasks };
        }
      }
      // Fallback for non-logged-in users
      const res = await fetch(`/api/store/teachers/${teacherId}/tasks`);
      if (!res.ok) return { tasks: [] };
      const json = await res.json();
      return json.data || { tasks: [] };
    },
    enabled: !!teacherId,
  });

  // Like a teacher task
  const likeTask = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await fetch(`/api/parent/tasks/${taskId}/like`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!res.ok) throw new Error("Failed to like");
      return res.json();
    },
    onMutate: (taskId) => {
      const wasLiked = taskLiked[taskId];
      setTaskLiked(p => ({ ...p, [taskId]: !wasLiked }));
      setTaskLikesLocal(p => ({ ...p, [taskId]: (p[taskId] || 0) + (wasLiked ? -1 : 1) }));
    },
    onSuccess: (json, taskId) => {
      setTaskLiked(p => ({ ...p, [taskId]: json.data.isLiked }));
      setTaskLikesLocal(p => ({ ...p, [taskId]: json.data.likesCount }));
    },
  });

  // Add to cart
  const addToCart = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await fetch("/api/parent/cart/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ teacherTaskId: Number(taskId) }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || t("teacherProfile.addToCartFailed"));
      }
      return res.json();
    },
    onSuccess: (_, taskId) => {
      setTaskInCart(p => ({ ...p, [taskId]: true }));
      queryClient.invalidateQueries({ queryKey: ["task-cart-count"] });
      toast({ title: t("teacherProfile.addedToCart") });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  // Teacher reviews
  const { data: reviewsData } = useQuery({
    queryKey: ["teacher-reviews", teacherId],
    queryFn: async () => {
      const res = await fetch(`/api/store/teachers/${teacherId}/reviews`);
      if (!res.ok) return { reviews: [], avgRating: "0" };
      const json = await res.json();
      return json.data || { reviews: [], avgRating: "0" };
    },
    enabled: !!teacherId,
  });

  const submitReview = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/store/teachers/${teacherId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || t("teacherProfile.submitReviewFailed"));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-reviews", teacherId] });
      setReviewComment("");
      setReviewRating(5);
      toast({ title: t("teacherProfile.reviewSubmitted") });
    },
    onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
  });

  // Parent's children for assignment request
  const parentToken = localStorage.getItem("token");
  const { data: parentChildren = [] } = useQuery({
    queryKey: ["parent-children-for-assign"],
    queryFn: async () => {
      const res = await fetch("/api/family/children", {
        headers: { Authorization: `Bearer ${parentToken}` },
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
    enabled: !!parentToken && showAssignmentModal,
  });

  // Send assignment request
  const sendAssignmentRequest = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/parent/teacher-assignment-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${parentToken}`,
        },
        body: JSON.stringify({
          teacherId,
          childIds: selectedChildIds,
          monthlyPoints: Number(monthlyPoints),
          perHelpPoints: Number(perHelpPoints),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "فشل الإرسال" }));
        throw new Error(err.message || "فشل إرسال الطلب");
      }
      return res.json();
    },
    onSuccess: () => {
      setShowAssignmentModal(false);
      setSelectedChildIds([]);
      setMonthlyPoints("");
      setPerHelpPoints("");
      toast({ title: "تم إرسال طلب التعيين بنجاح ✅" });
    },
    onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
  });

  // Check liked posts
  const checkLikedPosts = useCallback(async (posts: any[]) => {
    if (!token || !posts?.length) return;
    try {
      const res = await fetch("/api/store/schools/posts/check-likes", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ postIds: posts.map((p: any) => p.id) }),
      });
      if (res.ok) {
        const body = await res.json();
        setLikedPosts(body.data || {});
      }
    } catch { /* ignore */ }
  }, [token]);

  useEffect(() => {
    const posts = postsData?.posts || [];
    if (posts.length) {
      checkLikedPosts(posts);
      const counts: Record<string, number> = {};
      posts.forEach((p: any) => { counts[p.id] = p.likesCount || 0; });
      setLocalLikesCount(counts);
    }
  }, [postsData?.posts]);

  useEffect(() => {
    const onScroll = () => {
      setShowMiniHeader(window.scrollY > 180);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const fetchComments = useCallback(async (postId: string) => {
    setLoadingComments(prev => ({ ...prev, [postId]: true }));
    try {
      const res = await fetch(`/api/store/schools/posts/${postId}/comments`);
      if (res.ok) {
        const body = await res.json();
        setPostComments(prev => ({ ...prev, [postId]: body.data || [] }));
      }
    } catch { /* ignore */ }
    setLoadingComments(prev => ({ ...prev, [postId]: false }));
  }, []);

  const likePost = useMutation({
    mutationFn: async (postId: string) => {
      if (!token) throw new Error(t("teacherProfile.loginRequired"));
      const res = await fetch(`/api/store/schools/posts/${postId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message || "Failed"); }
      return await res.json();
    },
    onSuccess: (data, postId) => {
      setLikedPosts(prev => ({ ...prev, [postId]: data.liked }));
      setLocalLikesCount(prev => ({ ...prev, [postId]: data.likesCount }));
    },
    onError: (err: any) => toast({ title: err.message || t("teacherProfile.likeFailed"), variant: "destructive" }),
  });

  const addComment = useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      if (!token) throw new Error(t("teacherProfile.loginRequired"));
      const res = await fetch(`/api/store/schools/posts/${postId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message || "Failed"); }
      return await res.json();
    },
    onSuccess: (data, { postId }) => {
      setCommentTexts(prev => ({ ...prev, [postId]: "" }));
      if (data.data) setPostComments(prev => ({ ...prev, [postId]: [data.data, ...(prev[postId] || [])] }));
      toast({ title: t("teacherProfile.commentAdded") });
    },
    onError: (err: any) => toast({ title: err.message || t("teacherProfile.commentFailed"), variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950" dir="rtl">
        <div className="sticky top-0 z-30 border-b border-gray-200/70 dark:border-gray-800/70 bg-gray-50/95 dark:bg-gray-950/95 backdrop-blur">
          <div className="max-w-4xl mx-auto px-3 py-2.5 flex items-center justify-between">
            <div className="h-9 w-24 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
            <div className="h-9 w-16 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-3 py-4 space-y-4">
          <div className="h-52 rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
          <div className="grid grid-cols-2 gap-2">
            <div className="h-14 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
            <div className="h-14 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
          </div>
          <div className="h-12 rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
          <div className="h-36 rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
          <div className="h-36 rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">{t("teacherProfile.notFound")}</p>
      </div>
    );
  }

  const posts = postsData?.posts || [];
  const tasks = tasksData?.tasks || [];
  const reviews = reviewsData?.reviews || [];
  const avgRating = reviewsData?.avgRating || "0";
  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    navigate("/parent-dashboard");
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-b from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-gray-950 dark:to-slate-900" dir="rtl">
      <div className="pointer-events-none absolute -top-20 -left-24 h-72 w-72 rounded-full bg-cyan-200/35 dark:bg-cyan-700/20 blur-3xl" />
      <div className="pointer-events-none absolute top-72 -right-24 h-72 w-72 rounded-full bg-violet-200/35 dark:bg-violet-700/20 blur-3xl" />
      {/* Mobile-first top bar with explicit back navigation */}
      <div className="sticky top-0 z-40 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl border-b border-indigo-100 dark:border-slate-800 shadow-sm">
        <div className="max-w-4xl mx-auto px-3 py-2.5 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 rounded-xl"
            onClick={handleBack}
          >
            <ArrowRight className="h-4 w-4" />
            رجوع
          </Button>
          <LanguageSelector />
        </div>
        {showMiniHeader && teacher && (
          <div className="max-w-4xl mx-auto px-3 pb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {teacher.avatarUrl ? (
                <img src={teacher.avatarUrl} alt={teacher.name} className="h-9 w-9 rounded-full object-cover border border-white/40" />
              ) : (
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-white flex items-center justify-center font-bold">
                  {teacher.name?.charAt(0) || "م"}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">{teacher.name}</p>
                <p className="text-xs text-muted-foreground truncate">{teacher.subject || "معلم"}</p>
              </div>
            </div>
            {parentToken && (
              <Button size="sm" className="h-8 px-3 bg-green-600 hover:bg-green-700" onClick={() => setShowAssignmentModal(true)}>
                <UserPlus className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-24 sm:pb-6 relative z-10">
        <ProfileHeader
          name={teacher.name}
          bio={teacher.bio}
          avatarUrl={teacher.avatarUrl}
          coverImageUrl={teacher.coverImageUrl}
          governorate=""
          socialLinks={teacher.socialLinks}
          entityType="teacher"
          entityId={teacherId!}
          avgRating={avgRating}
          totalReviews={reviews.length}
          shareTitle={`${teacher.name} — ${t("teacherProfile.teacherOnClassify")}`}
          shareDescription={teacher.bio || `${t("teacherProfile.meetTeacher")} ${teacher.name} ${t("teacherProfile.onClassifyPlatform")}`}
          extraBadges={
            <>
              {teacher.subject && (
                <Badge variant="outline" className="gap-1">
                  <BookOpen className="h-3 w-3" />
                  {teacher.subject}
                </Badge>
              )}
              {teacher.yearsExperience > 0 && (
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {teacher.yearsExperience} {t("teacherProfile.yearsExperience")}
                </Badge>
              )}
            </>
          }
        >
          {teacher.schoolName && (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <GraduationCap className="h-4 w-4" />
              <span>{t("teacherProfile.worksAt")}{" "}{teacher.schoolName}</span>
            </div>
          )}

          {/* Compact mobile-friendly stats */}
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="rounded-xl bg-gray-100 dark:bg-gray-800 px-3 py-2 text-sm text-muted-foreground flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              {teacher.totalStudents || 0} {t("teacherProfile.student")}
            </div>
            <div className="rounded-xl bg-gray-100 dark:bg-gray-800 px-3 py-2 text-sm text-muted-foreground flex items-center gap-1.5">
              <Briefcase className="h-4 w-4" />
              {teacher.totalTasksSold || 0} {t("teacherProfile.tasksSold")}
            </div>
          </div>

          {/* Assignment Request Button - only for logged-in parents */}
          {parentToken && (
            <Button
              className="hidden sm:inline-flex mt-3 gap-2 bg-green-600 hover:bg-green-700"
              onClick={() => setShowAssignmentModal(true)}
            >
              <UserPlus className="h-4 w-4" />
              طلب تعيين معلم لأطفالي
            </Button>
          )}
        </ProfileHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="w-full grid grid-cols-3 h-auto p-1.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-indigo-100 dark:border-slate-800 shadow-sm backdrop-blur">
            <TabsTrigger value="tasks" className="gap-1">
              <BookOpen className="h-4 w-4" />
              {t("teacherProfile.tasks")} ({tasks.length})
            </TabsTrigger>
            <TabsTrigger value="posts" className="gap-1">
              <MessageSquare className="h-4 w-4" />
              {t("teacherProfile.posts")} ({posts.length})
            </TabsTrigger>
            <TabsTrigger value="reviews" className="gap-1">
              <Star className="h-4 w-4" />
              {t("teacherProfile.reviews")} ({reviews.length})
            </TabsTrigger>
          </TabsList>

          <p className="text-xs sm:text-sm text-muted-foreground mt-3 px-1">
            {activeTab === "tasks" && "مهام المعلم المتاحة للشراء والاستخدام مباشرة مع أطفالك."}
            {activeTab === "posts" && "منشورات المعلم وتحديثاته التعليمية، مع تفاعل مباشر."}
            {activeTab === "reviews" && "آراء أولياء الأمور وتجاربهم مع هذا المعلم."}
          </p>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-4 mt-4">
            {tasks.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground space-y-3">
                  <BookOpen className="h-12 w-12 mx-auto text-gray-300" />
                  <p className="font-semibold text-base text-gray-700 dark:text-gray-200">{t("teacherProfile.noTasksAvailable")}</p>
                  <p className="text-sm">تابع منشورات المعلم لحين إضافة مهام جديدة.</p>
                  <div className="flex justify-center gap-2 pt-1">
                    <Button variant="outline" onClick={() => setActiveTab("posts")}>عرض المنشورات</Button>
                    {parentToken && (
                      <Button className="bg-green-600 hover:bg-green-700" onClick={() => setShowAssignmentModal(true)}>
                        طلب تعيين
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              tasks.map((task: any) => (
                <Card key={task.id} className="overflow-hidden hover:shadow-lg transition-all border-indigo-100/70 dark:border-slate-800">
                  {task.coverImageUrl && (
                    <img src={task.coverImageUrl} alt="" className="w-full h-36 object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                  )}
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base sm:text-lg leading-6">{task.title || task.question}</h3>
                        {task.title && task.question !== task.title && (
                          <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{task.question}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {task.subjectLabel && (
                            <Badge variant="outline" className="text-xs">{task.subjectLabel}</Badge>
                          )}
                          {task.pointsReward > 0 && (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <Star className="h-3 w-3" />
                              {task.pointsReward} {t("teacherProfile.points")}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-left shrink-0">
                        <div className="bg-green-50 dark:bg-green-950 px-3 py-2 rounded-xl text-center min-w-[82px]">
                          <span className="text-xl font-extrabold text-green-600">{task.price}</span>
                          <span className="text-xs text-green-600 block">{t("teacherProfile.currency")}</span>
                        </div>
                      </div>
                    </div>

                    {/* Like + Cart actions */}
                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t">
                      <button
                        onClick={() => {
                          if (!token) { toast({ title: t("teacherProfile.loginRequired"), variant: "destructive" }); return; }
                          likeTask.mutate(String(task.id));
                        }}
                        className={`h-10 rounded-xl border text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${
                          taskLiked[task.id]
                            ? "text-red-500 border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-900"
                            : "text-muted-foreground border-gray-200 dark:border-gray-800 hover:text-red-400"
                        }`}
                      >
                        <Heart className={`h-4 w-4 ${taskLiked[task.id] ? "fill-red-500" : ""}`} />
                        <span>{taskLikesLocal[task.id] ?? task.likesCount ?? 0}</span>
                      </button>

                      {taskPurchased[task.id] ? (
                        <div className="h-10 rounded-xl bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 flex items-center justify-center text-sm font-semibold">
                          {t("teacherProfile.purchased")}
                        </div>
                      ) : taskInCart[task.id] ? (
                        <div className="h-10 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 flex items-center justify-center text-sm font-semibold">
                          {t("teacherProfile.inCart")}
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          className="h-10 rounded-xl gap-1.5 text-sm"
                          onClick={() => {
                            if (!token) { toast({ title: t("teacherProfile.loginRequired"), variant: "destructive" }); return; }
                            addToCart.mutate(String(task.id));
                          }}
                          disabled={addToCart.isPending}
                        >
                          <ShoppingCart className="h-3.5 w-3.5" />
                          {t("teacherProfile.addToCart")}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Posts Tab */}
          <TabsContent value="posts" className="space-y-4 mt-4">
            {posts.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground space-y-3">
                  <MessageSquare className="h-12 w-12 mx-auto text-gray-300" />
                  <p className="font-semibold text-base text-gray-700 dark:text-gray-200">{t("teacherProfile.noPosts")}</p>
                  <p className="text-sm">يمكنك متابعة المعلم وسيتم إظهار منشوراته هنا فور نشرها.</p>
                </CardContent>
              </Card>
            ) : (
              posts.map((post: any) => (
                <Card key={post.id} className="hover:shadow-lg transition-all border-indigo-100/70 dark:border-slate-800">
                  <CardContent className="p-4">
                    <p className="whitespace-pre-wrap text-[15px] leading-7 font-medium text-gray-800 dark:text-gray-100">{post.content}</p>
                    {post.mediaUrls?.length > 0 && (
                      <div className={`mt-3 ${post.mediaUrls.length === 1 ? "" : "grid grid-cols-2 gap-1"} rounded-lg overflow-hidden`}>
                        {post.mediaUrls.map((url: string, i: number) => {
                          const mediaType = post.mediaTypes?.[i];
                          if (mediaType === "video") {
                            return <video key={i} src={url} controls className="w-full max-h-[500px] object-contain bg-black" />;
                          }
                          return (
                            <img key={i} src={url} alt="" className={`w-full ${post.mediaUrls.length === 1 ? "max-h-[500px] object-contain bg-gray-50 dark:bg-gray-800 rounded-lg" : "h-56 object-cover"}`} onError={(e) => { e.currentTarget.style.display = 'none' }} />
                          );
                        })}
                      </div>
                    )}

                    {/* Likes & comments count bar */}
                    <div className="flex items-center justify-between mt-3 pt-2 border-t text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        {(localLikesCount[post.id] ?? post.likesCount ?? 0) > 0 && (
                          <><span className="bg-blue-600 text-white rounded-full p-0.5 inline-flex"><Heart className="h-2.5 w-2.5 fill-white" /></span> {localLikesCount[post.id] ?? post.likesCount ?? 0}</>
                        )}
                      </span>
                      <button onClick={() => {
                        const next = !showComments[post.id];
                        setShowComments(p => ({ ...p, [post.id]: next }));
                        if (next && !postComments[post.id]) fetchComments(post.id);
                      }} className="hover:underline">
                        {post.commentsCount || 0} {t("teacherProfile.comment")}
                      </button>
                    </div>

                    {/* Action buttons */}
                    <div className="grid grid-cols-3 gap-1 mt-2 p-1 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                      <button
                        onClick={() => {
                          if (!token) { toast({ title: t("teacherProfile.loginToLike"), variant: "destructive" }); return; }
                          likePost.mutate(post.id);
                        }}
                        className={`h-10 flex items-center justify-center gap-1.5 text-sm font-medium rounded-lg transition-colors ${
                          likedPosts[post.id] ? "text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950" : "text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800"
                        }`}
                      >
                        <Heart className={`h-5 w-5 ${likedPosts[post.id] ? "fill-blue-600 text-blue-600" : ""}`} />
                        {t("teacherProfile.like")}
                      </button>
                      <button
                        onClick={() => {
                          const next = !showComments[post.id];
                          setShowComments(p => ({ ...p, [post.id]: next }));
                          if (next && !postComments[post.id]) fetchComments(post.id);
                        }}
                        className="h-10 flex items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        <MessageSquare className="h-5 w-5" />
                        {t("teacherProfile.commentAction")}
                      </button>
                      <div className="flex items-center justify-center">
                        <ShareMenu
                          url={typeof window !== "undefined" ? window.location.href : ""}
                          title={post.content?.substring(0, 60) || t("teacherProfile.post")}
                          description={post.content?.substring(0, 120) || ""}
                          variant="ghost"
                          size="sm"
                          buttonLabel={t("teacherProfile.share")}
                          className="text-xs w-full justify-center"
                        />
                      </div>
                    </div>

                    {/* Comments section */}
                    {showComments[post.id] && (
                      <div className="pt-2 space-y-2">
                        {loadingComments[post.id] ? (
                          <div className="text-center text-xs text-muted-foreground py-2">{t("teacherProfile.loading")}</div>
                        ) : postComments[post.id]?.length > 0 ? (
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {postComments[post.id].map((c: any) => (
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
                            placeholder={token ? t("teacherProfile.writeComment") : t("teacherProfile.loginToComment")}
                            value={commentTexts[post.id] || ""}
                            onChange={e => setCommentTexts(prev => ({ ...prev, [post.id]: e.target.value }))}
                            className="text-sm rounded-full bg-gray-100 dark:bg-gray-800 border-0 h-9"
                            disabled={!token}
                            onKeyDown={e => {
                              if (e.key === "Enter" && commentTexts[post.id]?.trim()) {
                                addComment.mutate({ postId: post.id, content: commentTexts[post.id] });
                              }
                            }}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="shrink-0 h-9 w-9"
                            disabled={!token || !commentTexts[post.id]?.trim()}
                            onClick={() => {
                              if (commentTexts[post.id]?.trim()) addComment.mutate({ postId: post.id, content: commentTexts[post.id] });
                            }}
                          >
                            <Send className="h-4 w-4 text-blue-600" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="space-y-4 mt-4">
            {/* Rating Summary Card */}
            <Card className="shadow-sm border-indigo-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
              <CardContent className="p-6">
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-5xl font-extrabold text-foreground">{avgRating}</div>
                    <div className="flex gap-0.5 mt-1 justify-center">
                      {[1, 2, 3, 4, 5].map(n => (
                        <Star key={n} className={`h-4 w-4 ${n <= Math.round(parseFloat(avgRating)) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{reviews.length} {t("teacherProfile.reviewCount")}</p>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {[5, 4, 3, 2, 1].map(n => {
                      const count = reviews.filter((r: any) => r.rating === n).length;
                      const pct = reviews.length ? (count / reviews.length) * 100 : 0;
                      return (
                        <div key={n} className="flex items-center gap-2 text-sm">
                          <span className="w-3">{n}</span>
                          <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                          <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-6 text-xs text-muted-foreground text-left">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit Review Form */}
            <Card className="shadow-sm border-indigo-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
              <CardContent className="p-6 space-y-3">
                <h3 className="font-bold text-lg">{t("teacherProfile.addYourReview")}</h3>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star className={`h-8 w-8 ${star <= reviewRating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />
                    </button>
                  ))}
                </div>
                <Textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder={t("teacherProfile.shareOpinionTeacher")}
                  className="min-h-[80px]"
                />
                <Button
                  onClick={() => submitReview.mutate()}
                  disabled={submitReview.isPending}
                  className="bg-blue-600 hover:bg-blue-700 gap-2"
                >
                  {submitReview.isPending ? t("teacherProfile.submitting") : t("teacherProfile.submitReview")}
                </Button>
              </CardContent>
            </Card>

            {reviews.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground space-y-3">
                  <Star className="h-12 w-12 mx-auto text-gray-300" />
                  <p className="font-semibold text-base text-gray-700 dark:text-gray-200">{t("teacherProfile.noReviewsYet")}</p>
                  <p className="text-sm">كن أول ولي أمر يشارك تجربته مع هذا المعلم.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {reviews.map((review: any) => (
                  <Card key={review.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center shrink-0">
                          <Users className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm">{review.parentName || t("teacherProfile.parent")}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(review.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}
                            </span>
                          </div>
                          <div className="flex gap-0.5 mt-0.5">
                            {[1, 2, 3, 4, 5].map(n => (
                              <Star key={n} className={`h-3.5 w-3.5 ${n <= review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />
                            ))}
                          </div>
                          {review.comment && (
                            <p className="text-sm mt-2 text-muted-foreground">{review.comment}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Sticky mobile assignment CTA */}
      {parentToken && (
        <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 p-3 bg-gradient-to-t from-gray-50 dark:from-gray-950 to-transparent">
          <Button
            className="w-full h-12 text-base font-bold gap-2 bg-green-600 hover:bg-green-700 shadow-lg"
            onClick={() => setShowAssignmentModal(true)}
          >
            <UserPlus className="h-4 w-4" />
            طلب تعيين معلم لأطفالي
          </Button>
        </div>
      )}

      {/* Assignment Request Dialog */}
      <Dialog open={showAssignmentModal} onOpenChange={setShowAssignmentModal}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-green-600" />
              طلب تعيين المعلم لأطفالي
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm text-blue-700 dark:text-blue-300">
              سيتم إرسال طلب للمعلم <strong>{teacher?.name}</strong> لتعيينه لإرسال مهام لأطفالك المحددين. المعلم يمكنه قبول أو رفض الطلب.
            </div>

            {/* Children selection */}
            <div>
              <Label className="text-sm font-bold">اختر الأطفال</Label>
              <div className="mt-2 space-y-2">
                {parentChildren.length === 0 ? (
                  <p className="text-sm text-muted-foreground">لا يوجد أطفال مسجلين</p>
                ) : (
                  parentChildren.map((child: any) => (
                    <label
                      key={child.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedChildIds.includes(String(child.id))
                          ? "border-green-500 bg-green-50 dark:bg-green-950"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedChildIds.includes(String(child.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedChildIds(prev => [...prev, String(child.id)]);
                          } else {
                            setSelectedChildIds(prev => prev.filter(id => id !== String(child.id)));
                          }
                        }}
                        className="rounded accent-green-600"
                      />
                      <div className="flex items-center gap-2">
                        {child.avatarUrl ? (
                          <img src={child.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                            {child.name?.[0] || "؟"}
                          </div>
                        )}
                        <span className="font-medium text-sm">{child.name}</span>
                      </div>
                      {selectedChildIds.includes(String(child.id)) && (
                        <Check className="h-4 w-4 text-green-600 mr-auto" />
                      )}
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Monthly Points */}
            <div>
              <Label className="text-sm font-bold">عدد النقاط الشهرية</Label>
              <p className="text-xs text-muted-foreground mb-1">عدد النقاط التي ستدفعها شهرياً للمعلم</p>
              <Input
                type="number"
                min="1"
                max="100000"
                value={monthlyPoints}
                onChange={(e) => setMonthlyPoints(e.target.value)}
                placeholder="مثال: 500"
              />
            </div>

            <div>
              <Label className="text-sm font-bold">عدد النقاط لكل مساعدة</Label>
              <p className="text-xs text-muted-foreground mb-1">عدد النقاط لكل مرة يساعد فيها المعلم الطفل في المهام</p>
              <Input
                type="number"
                min="0"
                max="100000"
                value={perHelpPoints}
                onChange={(e) => setPerHelpPoints(e.target.value)}
                placeholder="مثال: 25"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAssignmentModal(false)}>إلغاء</Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => sendAssignmentRequest.mutate()}
              disabled={selectedChildIds.length === 0 || !monthlyPoints || !perHelpPoints || sendAssignmentRequest.isPending}
            >
              {sendAssignmentRequest.isPending ? "جاري الإرسال..." : "إرسال الطلب"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
