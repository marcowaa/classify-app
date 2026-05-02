import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import i18next from "i18next";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import {
  School, GraduationCap, Star, MessageSquare, BookOpen, Heart,
  MapPin, Globe, Phone, Mail, Send, Users, Calendar, Award,
  ExternalLink, Facebook, Instagram, Youtube, Clock,
  CheckCircle, Share2, BookOpenCheck, TrendingUp,
  BarChart3, Lock, Check, Pin
} from "lucide-react";
import { FollowButton } from "@/components/ui/FollowButton";
import { ShareMenu } from "@/components/ui/ShareMenu";
import { LanguageSelector } from "@/components/LanguageSelector";
import { getDateLocale } from "@/i18n/config";

function SocialIcon({ platform }: { platform: string }) {
  switch (platform) {
    case "facebook": return <Facebook className="h-4 w-4" />;
    case "instagram": return <Instagram className="h-4 w-4" />;
    case "youtube": return <Youtube className="h-4 w-4" />;
    case "twitter": return <span className="text-sm font-bold leading-none">𝕏</span>;
    case "tiktok": return <span className="text-sm font-bold leading-none">T</span>;
    case "website": return <Globe className="h-4 w-4" />;
    default: return <ExternalLink className="h-4 w-4" />;
  }
}

function socialLabel(platform: string): string {
  const labels: Record<string, string> = {
    facebook: i18next.t("schoolProfile.socialFacebook"),
    instagram: i18next.t("schoolProfile.socialInstagram"),
    youtube: i18next.t("schoolProfile.socialYoutube"),
    twitter: i18next.t("schoolProfile.socialTwitter"),
    tiktok: i18next.t("schoolProfile.socialTiktok"),
    website: i18next.t("schoolProfile.socialWebsite"),
  };
  return labels[platform] || platform;
}

function socialColor(platform: string): string {
  const colors: Record<string, string> = {
    facebook: "bg-blue-600 hover:bg-blue-700",
    instagram: "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600",
    youtube: "bg-red-600 hover:bg-red-700",
    twitter: "bg-black hover:bg-gray-800",
    tiktok: "bg-black hover:bg-gray-800",
    website: "bg-green-600 hover:bg-green-700",
  };
  return colors[platform] || "bg-gray-600 hover:bg-gray-700";
}

export default function SchoolProfile() {
  const [, params] = useRoute("/school/:id");
  const schoolId = params?.id;
  const { toast } = useToast();
  const { t } = useTranslation();

  const isRTL = i18next.language === "ar";
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({});
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState("posts");
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [localLikesCount, setLocalLikesCount] = useState<Record<string, number>>({});
  const [postComments, setPostComments] = useState<Record<string, any[]>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [selectedPollOptions, setSelectedPollOptions] = useState<Record<string, string[]>>({});
  const [votedPolls, setVotedPolls] = useState<Record<string, string[]>>({});
  const [showEnrollmentForm, setShowEnrollmentForm] = useState(false);
  const [enrollChildId, setEnrollChildId] = useState("");
  const [enrollNote, setEnrollNote] = useState("");

  const token = localStorage.getItem("token") || localStorage.getItem("childToken");
  const parentToken = localStorage.getItem("token");
  const parentAuthHeaders: Record<string, string> = parentToken ? { Authorization: `Bearer ${parentToken}` } : {};
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  // Polls query
  const { data: pollsData } = useQuery({
    queryKey: ["school-polls-public", schoolId],
    queryFn: async () => {
      const res = await fetch(`/api/store/schools/${schoolId}/polls`);
      if (!res.ok) return [];
      const body = await res.json();
      return body.data || [];
    },
    enabled: !!schoolId,
  });
  const polls: any[] = pollsData || [];

  // Check which polls the parent has voted on
  useEffect(() => {
    if (!parentToken || !polls.length) return;
    const pollIds = polls.map((p: any) => p.id);
    fetch("/api/store/schools/polls/check-votes", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...parentAuthHeaders },
      body: JSON.stringify({ pollIds }),
    })
      .then(res => res.ok ? res.json() : null)
      .then(body => {
        if (body?.data) setVotedPolls(body.data);
      })
      .catch(() => {});
  }, [parentToken, polls.length]);

  // Vote mutation
  const votePoll = useMutation({
    mutationFn: async ({ pollId, selectedOptions }: { pollId: string; selectedOptions: string[] }) => {
      if (!parentToken) throw new Error(t("schoolProfile.loginToVote"));
      const res = await fetch(`/api/store/schools/polls/${pollId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...parentAuthHeaders },
        body: JSON.stringify({ selectedOptions }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || t("schoolProfile.voteFailed"));
      }
      return await res.json();
    },
    onSuccess: (_, { pollId, selectedOptions }) => {
      setVotedPolls(prev => ({ ...prev, [pollId]: selectedOptions }));
      queryClient.invalidateQueries({ queryKey: ["school-polls-public", schoolId] });
      toast({ title: t("schoolProfile.voteRecorded") });
    },
    onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
  });

  const { data: school, isLoading } = useQuery({
    queryKey: ["public-school", schoolId],
    queryFn: async () => {
      const res = await fetch(`/api/store/schools/${schoolId}`);
      if (!res.ok) throw new Error("Not found");
      return (await res.json()).data;
    },
    enabled: !!schoolId,
  });

  const submitReview = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/store/schools/${schoolId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["public-school", schoolId] });
      setReviewComment("");
      setReviewRating(5);
      toast({ title: t("schoolProfile.reviewSubmitted") });
    },
    onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
  });

  // Enrollment queries
  const { data: enrollmentStatus } = useQuery({
    queryKey: ["enrollment-status", schoolId],
    queryFn: async () => {
      const res = await fetch(`/api/store/schools/${schoolId}/enrollment-status`);
      if (!res.ok) return null;
      return (await res.json()).data;
    },
    enabled: !!schoolId,
  });

  const { data: myChildren = [] } = useQuery<any[]>({
    queryKey: ["parent-children"],
    queryFn: async () => {
      const res = await fetch("/api/family/children", { headers: parentAuthHeaders });
      if (!res.ok) return [];
      const body = await res.json();
      return body.data || body.children || [];
    },
    enabled: !!parentToken,
  });

  const { data: myEnrollments = [] } = useQuery<any[]>({
    queryKey: ["parent-enrollments"],
    queryFn: async () => {
      const res = await fetch("/api/parent/enrollments", { headers: parentAuthHeaders });
      if (!res.ok) return [];
      return (await res.json()).data || [];
    },
    enabled: !!parentToken,
  });

  const enrollChild = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/parent/enroll-child", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...parentAuthHeaders },
        body: JSON.stringify({ childId: enrollChildId, schoolId, parentNote: enrollNote || undefined }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed");
      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parent-enrollments"] });
      setShowEnrollmentForm(false);
      setEnrollChildId("");
      setEnrollNote("");
      toast({ title: t("schoolProfile.enrollmentSubmitted") });
    },
    onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
  });

  // Load liked status when school data loads
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
    if (school?.posts?.length) {
      checkLikedPosts(school.posts);
      // Initialize local likes count
      const counts: Record<string, number> = {};
      school.posts.forEach((p: any) => { counts[p.id] = p.likesCount; });
      setLocalLikesCount(counts);
    }
  }, [school?.posts]);

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
      if (!token) throw new Error(t("schoolProfile.loginRequired"));
      const res = await fetch(`/api/store/schools/posts/${postId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed");
      }
      return await res.json();
    },
    onSuccess: (data, postId) => {
      setLikedPosts(prev => ({ ...prev, [postId]: data.liked }));
      setLocalLikesCount(prev => ({ ...prev, [postId]: data.likesCount }));
    },
    onError: (err: any) => toast({ title: err.message || t("schoolProfile.likeFailed"), variant: "destructive" }),
  });

  const addComment = useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      if (!token) throw new Error(t("schoolProfile.loginRequired"));
      const res = await fetch(`/api/store/schools/posts/${postId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed");
      }
      return await res.json();
    },
    onSuccess: (data, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ["public-school", schoolId] });
      setCommentTexts(prev => ({ ...prev, [postId]: "" }));
      // Add new comment to local state
      if (data.data) {
        setPostComments(prev => ({ ...prev, [postId]: [data.data, ...(prev[postId] || [])] }));
      }
      toast({ title: t("schoolProfile.commentAdded") });
    },
    onError: (err: any) => toast({ title: err.message || t("schoolProfile.commentFailed"), variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950">
        <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!school) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-950">
        <School className="h-16 w-16 text-gray-300 mb-4" />
        <p className="text-lg text-muted-foreground">{t("schoolProfile.notFound")}</p>
      </div>
    );
  }

  const socialEntries = Object.entries(school.socialLinks || {}).filter(([, v]) => v);
  const joinDate = new Date(school.createdAt).toLocaleDateString(getDateLocale(), { year: "numeric", month: "long" });

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-br from-sky-50 via-white to-indigo-50 dark:from-slate-950 dark:via-gray-950 dark:to-slate-900" dir={isRTL ? "rtl" : "ltr"}>
      <div className={`pointer-events-none absolute -top-24 ${isRTL ? "-left-24" : "-right-24"} h-80 w-80 rounded-full blur-3xl ${isRTL ? "bg-blue-200/35 dark:bg-blue-700/20" : "bg-indigo-200/35 dark:bg-indigo-700/20"}`} />
      <div className={`pointer-events-none absolute top-[32rem] ${isRTL ? "-right-24" : "-left-24"} h-80 w-80 rounded-full blur-3xl ${isRTL ? "bg-cyan-200/35 dark:bg-cyan-700/20" : "bg-sky-200/35 dark:bg-sky-700/20"}`} />
      <div className="absolute top-4 ltr:right-4 rtl:left-4 z-50"><LanguageSelector /></div>
      {/* ===== FACEBOOK-STYLE COVER SECTION ===== */}
      <div className="bg-white/90 dark:bg-slate-900/90 shadow-sm backdrop-blur-xl border-b border-indigo-100 dark:border-slate-800 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="relative h-52 sm:h-72 md:h-80 rounded-b-3xl overflow-hidden ring-1 ring-white/70 dark:ring-slate-800">
            {school.coverImageUrl ? (
              <img src={school.coverImageUrl} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
            ) : (
              <div className="w-full h-full bg-gradient-to-l from-blue-500 via-blue-600 to-indigo-700" />
            )}
            <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-black/40 to-transparent" />
          </div>
        </div>

        {/* Profile Info Bar */}
        <div className="max-w-5xl mx-auto px-3 sm:px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 sm:gap-4 -mt-8 sm:-mt-10 relative z-10 pb-4">
            <div className="relative shrink-0">
              <div className="w-24 h-24 sm:w-36 sm:h-36 rounded-full border-4 border-white dark:border-gray-900 bg-blue-100 dark:bg-blue-900 flex items-center justify-center shadow-xl overflow-hidden relative">
                <School className="h-12 w-12 sm:h-16 sm:w-16 text-blue-600 dark:text-blue-400" />
                {school.imageUrl && (
                  <img
                    src={school.imageUrl}
                    alt={school.name}
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                )}
              </div>
              {school.isVerified && (
                <div className="absolute bottom-1 left-1 bg-blue-600 text-white rounded-full p-1 shadow-md">
                  <CheckCircle className="h-5 w-5" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 sm:pb-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white leading-tight truncate">
                {school.nameAr || school.name}
              </h1>
              {school.nameAr && school.name !== school.nameAr && (
                <p className="text-xs sm:text-sm text-muted-foreground truncate">{school.name}</p>
              )}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1 text-xs sm:text-sm text-muted-foreground">
                <span className="flex items-center gap-0.5">
                  <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  <strong className="text-foreground">{school.avgRating || 0}</strong>
                  <span>({school.reviews?.length || 0} {t("schoolProfile.reviewCount")})</span>
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="flex items-center gap-0.5">
                  <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  {school.totalStudents || 0} {t("schoolProfile.student")}
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="flex items-center gap-0.5">
                  <GraduationCap className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  {school.teachers?.length || school.totalTeachers || 0} {t("schoolProfile.teacherCount")}
                </span>
              </div>
            </div>

            <div className="flex gap-2 sm:pb-2">
              <FollowButton entityType="school" entityId={schoolId!} />
              <ShareMenu
                url={typeof window !== "undefined" ? window.location.href : ""}
                title={`${school.nameAr || school.name} — Classify`}
                description={school.description || `${t("schoolProfile.discoverSchool")} ${school.nameAr || school.name} ${t("schoolProfile.onClassifyPlatform")}`}
              />
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-t dark:border-slate-800">
            <div className="flex gap-0 overflow-x-auto scrollbar-hide -mb-px px-1">
              {[
                { key: "posts", label: t("schoolProfile.postsTab"), icon: BookOpen },
                { key: "polls", label: t("schoolProfile.pollsTab"), icon: BarChart3 },
                { key: "about", label: t("schoolProfile.aboutTab"), icon: School },
                { key: "teachers", label: t("schoolProfile.teachersTab"), icon: GraduationCap },
                { key: "reviews", label: t("schoolProfile.reviewsTab"), icon: Star },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-3 text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors ${
                    activeTab === tab.key
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-muted-foreground hover:bg-gray-50 dark:hover:bg-slate-800"
                  }`}
                  style={{ borderBottomWidth: "3px", borderBottomStyle: "solid", borderBottomColor: activeTab === tab.key ? "#2563eb" : "transparent" }}
                >
                  <tab.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ===== CONTENT ===== */}
      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 relative z-10">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* ===== LEFT SIDEBAR ===== */}
          <div className="lg:w-80 space-y-4 lg:sticky lg:top-4 lg:self-start overflow-hidden">
            <Card className="shadow-sm border-indigo-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
              <CardContent className="p-4 space-y-3">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <School className="h-5 w-5 text-blue-600" />
                  {t("schoolProfile.schoolInfo")}
                </h3>
                {school.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed break-words">{school.description}</p>
                )}
                <div className="space-y-2.5 min-w-0">
                  {(school.address || school.city || school.governorate) && (
                    <div className="flex items-start gap-2.5 text-sm min-w-0">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <span className="break-words min-w-0">{[school.address, school.city, school.governorate].filter(Boolean).join(t("schoolProfile.commaSeparator"))}</span>
                    </div>
                  )}
                  {school.phoneNumber && (
                    <div className="flex items-center gap-2.5 text-sm min-w-0">
                      <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                      <a href={`tel:${school.phoneNumber}`} className="hover:text-blue-600 truncate" dir="ltr">{school.phoneNumber}</a>
                    </div>
                  )}
                  {school.email && (
                    <div className="flex items-center gap-2.5 text-sm min-w-0">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                      <a href={`mailto:${school.email}`} className="hover:text-blue-600 text-blue-600 break-all">{school.email}</a>
                    </div>
                  )}
                  <div className="flex items-center gap-2.5 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="break-words min-w-0">{t("schoolProfile.joinedIn")} {joinDate}</span>
                  </div>
                  {school.referralCode && (
                    <div className="flex items-center gap-2.5 text-sm min-w-0">
                      <Award className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="break-words min-w-0">{t("schoolProfile.referralCode")} <strong className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-blue-600">{school.referralCode}</strong></span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {socialEntries.length > 0 && (
              <Card className="shadow-sm border-indigo-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <Globe className="h-5 w-5 text-blue-600" />
                    {t("schoolProfile.socialMedia")}
                  </h3>
                  <div className="space-y-2">
                    {socialEntries.map(([platform, url]) => (
                      <a
                        key={platform}
                        href={url as string}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-2.5 text-white text-sm px-3 py-2.5 rounded-lg transition-all ${socialColor(platform)} shadow-sm`}
                      >
                        <SocialIcon platform={platform} />
                        <span className="font-medium">{socialLabel(platform)}</span>
                        <ExternalLink className="h-3 w-3 ms-auto opacity-60" />
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Enrollment Card */}
            {enrollmentStatus?.enrollmentOpen && parentToken && (
              <Card className="shadow-sm border-green-200 bg-green-50/70 dark:bg-green-950/30 backdrop-blur">
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-bold text-lg flex items-center gap-2 text-green-700">
                    <GraduationCap className="h-5 w-5" />
                    {t("schoolProfile.enrollmentAvailable")}
                  </h3>
                  {enrollmentStatus?.conditions?.customNote && (
                    <p className="text-sm text-muted-foreground">{enrollmentStatus.conditions.customNote}</p>
                  )}

                  {(() => {
                    const childEnrollmentsForSchool = myEnrollments.filter((e: any) => e.schoolId === schoolId);
                    const hasPending = childEnrollmentsForSchool.some((e: any) => e.status === "pending");
                    if (hasPending) return (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">{t("schoolProfile.enrollmentPendingStatus")}</Badge>
                    );
                    return null;
                  })()}

                  {!showEnrollmentForm ? (
                    <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => setShowEnrollmentForm(true)}>
                      <GraduationCap className="h-4 w-4 ml-1" />
                      {t("schoolProfile.applyForEnrollment")}
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium block mb-1">{t("schoolProfile.selectChild")}</label>
                        <select
                          className="w-full border rounded-md p-2 text-sm bg-white dark:bg-gray-900"
                          value={enrollChildId}
                          onChange={(e) => setEnrollChildId(e.target.value)}
                        >
                          <option value="">{t("schoolProfile.chooseChild")}</option>
                          {myChildren.map((child: any) => (
                            <option key={child.id} value={child.id}>{child.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium block mb-1">{t("schoolProfile.enrollmentNote")}</label>
                        <Textarea
                          value={enrollNote}
                          onChange={(e) => setEnrollNote(e.target.value)}
                          placeholder={t("schoolProfile.enrollmentNotePlaceholder")}
                          maxLength={500}
                          rows={3}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          disabled={!enrollChildId || enrollChild.isPending}
                          onClick={() => enrollChild.mutate()}
                        >
                          {enrollChild.isPending ? t("schoolProfile.submitting") : t("schoolProfile.submitEnrollment")}
                        </Button>
                        <Button variant="outline" onClick={() => { setShowEnrollmentForm(false); setEnrollChildId(""); setEnrollNote(""); }}>
                          {t("schoolProfile.cancelEnrollment")}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card className="shadow-sm border-indigo-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
              <CardContent className="p-4">
                <h3 className="font-bold text-lg flex items-center gap-2 mb-3">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  {t("schoolProfile.statistics")}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <div className="text-xl font-bold text-blue-600">{school.teachers?.length || 0}</div>
                    <div className="text-xs text-muted-foreground">{t("schoolProfile.teacherCount")}</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                    <div className="text-xl font-bold text-green-600">{school.totalStudents || 0}</div>
                    <div className="text-xs text-muted-foreground">{t("schoolProfile.student")}</div>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                    <div className="text-xl font-bold text-yellow-600">{school.avgRating || 0}</div>
                    <div className="text-xs text-muted-foreground">{t("schoolProfile.reviewCount")}</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                    <div className="text-xl font-bold text-purple-600">{school.posts?.length || 0}</div>
                    <div className="text-xs text-muted-foreground">{t("schoolProfile.postCount")}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {school.teachers?.length > 0 && (
              <Card className="shadow-sm border-indigo-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-blue-600" />
                      {t("schoolProfile.teachersTab")}
                    </h3>
                    <button onClick={() => setActiveTab("teachers")} className="text-xs text-blue-600 hover:underline">
                      {t("schoolProfile.showAll")}
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {school.teachers.slice(0, 6).map((teacher: any) => (
                      <Link key={teacher.id} href={`/teacher/${teacher.id}`}>
                        <div className="text-center group cursor-pointer">
                          {teacher.avatarUrl ? (
                            <img src={teacher.avatarUrl} alt="" className="w-14 h-14 mx-auto rounded-lg object-cover group-hover:ring-2 ring-blue-400 transition-all" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                          ) : (
                            <div className="w-14 h-14 mx-auto rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center group-hover:ring-2 ring-blue-400 transition-all">
                              <GraduationCap className="h-7 w-7 text-green-600" />
                            </div>
                          )}
                          <p className="text-xs font-medium mt-1 line-clamp-1">{teacher.name}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ===== MAIN CONTENT AREA ===== */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* POSTS TAB */}
            {activeTab === "posts" && (
              <>
                {!school.posts?.length ? (
                  <Card className="shadow-sm border-indigo-100 dark:border-slate-800">
                    <CardContent className="p-12 text-center">
                      <BookOpen className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-muted-foreground">{t("schoolProfile.noPostsYet")}</p>
                    </CardContent>
                  </Card>
                ) : (
                  [...school.posts].sort((a: any, b: any) => {
                    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                  }).map((post: any) => {
                    const isLong = post.content?.length > 300;
                    const expanded = expandedPosts[post.id];
                    return (
                      <Card key={post.id} className="shadow-sm border-indigo-100/80 dark:border-slate-800 hover:shadow-md transition-all">
                        <CardContent className="p-0">
                          <div className="flex items-center gap-3 p-4 pb-2">
                            {post.authorType === "school" ? (
                              school.imageUrl ? (
                                <img src={school.imageUrl} alt="" className="w-10 h-10 rounded-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                  <School className="h-5 w-5 text-blue-600" />
                                </div>
                              )
                            ) : (
                              post.teacherAvatar ? (
                                <img src={post.teacherAvatar} alt="" className="w-10 h-10 rounded-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                  <GraduationCap className="h-5 w-5 text-green-600" />
                                </div>
                              )
                            )}
                            <div className="flex-1">
                              <p className="font-bold text-sm">
                                {post.authorType === "school" ? (school.nameAr || school.name) : (post.teacherName || t("schoolProfile.teacher"))}
                              </p>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {new Date(post.createdAt).toLocaleString(getDateLocale(), { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                {post.isPinned && <Badge variant="outline" className="ms-1 text-xs py-0 px-1">{t("schoolProfile.pinned")}</Badge>}
                              </div>
                            </div>
                          </div>

                          <div className="px-4 pb-2">
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">
                              {isLong && !expanded ? post.content.substring(0, 300) + "..." : post.content}
                            </p>
                            {isLong && (
                              <button
                                onClick={() => setExpandedPosts(p => ({ ...p, [post.id]: !expanded }))}
                                className="text-blue-600 text-sm font-medium mt-1 hover:underline"
                              >
                                {expanded ? t("schoolProfile.showLess") : t("schoolProfile.showMore")}
                              </button>
                            )}
                          </div>

                          {post.mediaUrls?.length > 0 && (
                            <div className={`${post.mediaUrls.length === 1 ? "" : "grid grid-cols-2 gap-0.5"}`}>
                              {post.mediaUrls.map((url: string, i: number) => {
                                const mediaType = post.mediaTypes?.[i];
                                if (mediaType === "video") {
                                  return <video key={i} src={url} controls className="w-full max-h-[600px] object-contain bg-black" />;
                                }
                                return (
                                  <img
                                    key={i}
                                    src={url}
                                    alt=""
                                    className={`w-full ${post.mediaUrls.length === 1 ? "max-h-[600px] object-contain bg-gray-50 dark:bg-gray-800" : "h-48 sm:h-72 object-cover"}`}
                                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                                  />
                                );
                              })}
                            </div>
                          )}

                          <div className="px-4 py-2 flex items-center justify-between text-xs text-muted-foreground border-b dark:border-gray-800">
                            <span className="flex items-center gap-1">
                              {(localLikesCount[post.id] ?? post.likesCount) > 0 && (
                                <>
                                  <span className="bg-blue-600 text-white rounded-full p-0.5 inline-flex"><Heart className="h-2.5 w-2.5 fill-white" /></span>
                                  {localLikesCount[post.id] ?? post.likesCount}
                                </>
                              )}
                            </span>
                            <button onClick={() => {
                              const next = !showComments[post.id];
                              setShowComments(p => ({ ...p, [post.id]: next }));
                              if (next && !postComments[post.id]) fetchComments(post.id);
                            }} className="hover:underline">
                              {post.commentsCount} {t("schoolProfile.comment")}
                            </button>
                          </div>

                          <div className="px-4 py-1 flex border-b dark:border-gray-800">
                            <button
                              onClick={() => {
                                if (!token) { toast({ title: t("schoolProfile.loginToLike"), variant: "destructive" }); return; }
                                likePost.mutate(post.id);
                              }}
                              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg transition-colors ${
                                likedPosts[post.id]
                                  ? "text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                                  : "text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800"
                              }`}
                            >
                              <Heart className={`h-5 w-5 ${likedPosts[post.id] ? "fill-blue-600 text-blue-600" : ""}`} />
                              {likedPosts[post.id] ? t("schoolProfile.liked") : t("schoolProfile.like")}
                            </button>
                            <button
                              onClick={() => {
                                const next = !showComments[post.id];
                                setShowComments(p => ({ ...p, [post.id]: next }));
                                if (next && !postComments[post.id]) fetchComments(post.id);
                              }}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            >
                              <MessageSquare className="h-5 w-5" />
                              {t("schoolProfile.commentAction")}
                            </button>
                            <div className="flex-1 flex items-center justify-center">
                              <ShareMenu
                                url={typeof window !== "undefined" ? `${window.location.origin}/school/${schoolId}` : ""}
                                title={post.content?.substring(0, 60) || t("schoolProfile.post")}
                                description={post.content?.substring(0, 120) || ""}
                                variant="ghost"
                                buttonLabel={t("schoolProfile.share")}
                                className="text-sm font-medium text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg w-full justify-center"
                              />
                            </div>
                          </div>

                          {showComments[post.id] && (
                            <div className="border-t dark:border-gray-800">
                              {/* Existing comments */}
                              {loadingComments[post.id] ? (
                                <div className="p-4 text-center text-xs text-muted-foreground">{t("schoolProfile.loadingComments")}</div>
                              ) : postComments[post.id]?.length > 0 ? (
                                <div className="px-4 pt-2 space-y-3 max-h-64 overflow-y-auto">
                                  {postComments[post.id].map((c: any) => (
                                    <div key={c.id} className="flex items-start gap-2">
                                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
                                        <Users className="h-4 w-4 text-gray-500" />
                                      </div>
                                      <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-2xl px-3 py-2">
                                        <p className="text-xs font-bold">{c.authorName}</p>
                                        <p className="text-sm">{c.content}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : post.commentsCount > 0 ? (
                                <div className="p-3 text-center text-xs text-muted-foreground">{t("schoolProfile.noComments")}</div>
                              ) : null}

                              {/* Comment input */}
                              <div className="p-3 flex items-center gap-2">
                                <Input
                                  placeholder={token ? t("schoolProfile.writeComment") : t("schoolProfile.loginToComment")}
                                  value={commentTexts[post.id] || ""}
                                  onChange={e => setCommentTexts(prev => ({ ...prev, [post.id]: e.target.value }))}
                                  className="text-sm rounded-full bg-gray-100 dark:bg-gray-800 border-0"
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
                                  onClick={() => {
                                    if (commentTexts[post.id]?.trim()) {
                                      addComment.mutate({ postId: post.id, content: commentTexts[post.id] });
                                    }
                                  }}
                                  disabled={!token || !commentTexts[post.id]?.trim()}
                                  className="shrink-0"
                                >
                                  <Send className="h-4 w-4 text-blue-600" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </>
            )}

            {/* POLLS TAB */}
            {activeTab === "polls" && (
              <>
                {!polls.length ? (
                  <Card className="shadow-sm">
                    <CardContent className="p-12 text-center">
                      <BarChart3 className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-muted-foreground">{t("schoolProfile.noPollsYet")}</p>
                    </CardContent>
                  </Card>
                ) : (
                  [...polls].sort((a: any, b: any) => {
                    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                  }).map((poll: any) => {
                    const hasVoted = !!votedPolls[poll.id];
                    const myVotes = votedPolls[poll.id] || [];
                    const isExpired = poll.expiresAt && new Date(poll.expiresAt) < new Date();
                    const isClosed = poll.isClosed || isExpired;
                    const showResults = hasVoted || isClosed;
                    const currentSelections = selectedPollOptions[poll.id] || [];

                    return (
                      <Card key={poll.id} className="shadow-sm">
                        <CardContent className="p-0">
                          {/* Poll Header */}
                          <div className="flex items-center gap-3 p-4 pb-2">
                            {poll.authorType === "school" ? (
                              school.imageUrl ? (
                                <img src={school.imageUrl} alt="" className="w-10 h-10 rounded-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                  <School className="h-5 w-5 text-blue-600" />
                                </div>
                              )
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                <GraduationCap className="h-5 w-5 text-green-600" />
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="font-bold text-sm">
                                {poll.authorType === "school" ? (school.nameAr || school.name) : (poll.teacherName || t("schoolProfile.teacher"))}
                              </p>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {new Date(poll.createdAt).toLocaleString(getDateLocale(), { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              {poll.isPinned && <Badge variant="outline" className="text-xs py-0 px-1.5 gap-0.5"><Pin className="h-3 w-3" /> {t("schoolProfile.pinned")}</Badge>}
                              {poll.isAnonymous && <Badge variant="outline" className="text-xs py-0 px-1.5 gap-0.5"><Lock className="h-3 w-3" /> {t("schoolProfile.anonymous")}</Badge>}
                              {isClosed && <Badge variant="destructive" className="text-xs py-0 px-1.5">{t("schoolProfile.closed")}</Badge>}
                            </div>
                          </div>

                          {/* Poll Question */}
                          <div className="px-4 py-2">
                            <div className="flex items-start gap-2">
                              <BarChart3 className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                              <p className="font-semibold text-base">{poll.question}</p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 ms-7">
                              {poll.allowMultiple ? t("schoolProfile.multipleAnswers") : t("schoolProfile.singleAnswer")}
                            </p>
                          </div>

                          {/* Poll Options */}
                          <div className="px-4 pb-3 space-y-2">
                            {poll.options?.map((opt: any) => {
                              const totalVotes = poll.votersCount || poll.totalVotes || 0;
                              const optVotes = poll.optionCounts?.[opt.id] || poll.optionVotes?.[opt.id] || 0;
                              const pct = totalVotes > 0 ? Math.round((optVotes / totalVotes) * 100) : 0;
                              const isSelected = currentSelections.includes(opt.id);
                              const wasMyVote = myVotes.includes(opt.id);

                              if (showResults) {
                                return (
                                  <div key={opt.id} className="relative">
                                    {opt.imageUrl && (
                                      <img src={opt.imageUrl} alt={opt.text} className="w-full h-36 object-cover rounded-lg mb-1" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                                    )}
                                    <div className="relative overflow-hidden rounded-lg border dark:border-gray-700 p-3">
                                      <div
                                        className={`absolute inset-0 ${wasMyVote ? "bg-blue-100 dark:bg-blue-900/30" : "bg-gray-100 dark:bg-gray-800"}`}
                                        style={{ width: `${pct}%` }}
                                      />
                                      <div className="relative flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          {wasMyVote && <Check className="h-4 w-4 text-blue-600" />}
                                          <span className={`text-sm ${wasMyVote ? "font-bold text-blue-600" : ""}`}>{opt.text}</span>
                                        </div>
                                        <span className="text-sm font-bold text-muted-foreground">{pct}%</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <button
                                  key={opt.id}
                                  onClick={() => {
                                    if (isClosed) return;
                                    setSelectedPollOptions(prev => {
                                      const curr = prev[poll.id] || [];
                                      if (poll.allowMultiple === true) {
                                        // Multi-select: toggle option in/out
                                        return { ...prev, [poll.id]: curr.includes(opt.id) ? curr.filter((x: string) => x !== opt.id) : [...curr, opt.id] };
                                      }
                                      // Single-select: replace with only this option
                                      return { ...prev, [poll.id]: [opt.id] };
                                    });
                                  }}
                                  className={`w-full text-start rounded-lg border p-3 text-sm transition-all ${
                                    isSelected
                                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 font-medium"
                                      : "border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-950/30"
                                  }`}
                                  disabled={isClosed}
                                >
                                  {opt.imageUrl && (
                                    <img src={opt.imageUrl} alt={opt.text} className="w-full h-36 object-cover rounded-lg mb-2" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                                  )}
                                  <div className="flex items-center gap-2">
                                    <div className={`w-5 h-5 ${poll.allowMultiple ? "rounded" : "rounded-full"} border-2 flex items-center justify-center shrink-0 ${
                                      isSelected ? "border-blue-500 bg-blue-500" : "border-gray-300 dark:border-gray-600"
                                    }`}>
                                      {isSelected && <Check className="h-3 w-3 text-white" />}
                                    </div>
                                    {opt.text}
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          {/* Vote Button / Stats */}
                          <div className="px-4 pb-4">
                            {!showResults && !isClosed && (
                              <Button
                                onClick={() => {
                                  if (!currentSelections.length) {
                                    toast({ title: t("schoolProfile.selectAtLeastOne"), variant: "destructive" });
                                    return;
                                  }
                                  // Enforce single-select: take only the last selected option
                                  const finalSelections = !poll.allowMultiple && currentSelections.length > 1
                                    ? [currentSelections[currentSelections.length - 1]]
                                    : currentSelections;
                                  votePoll.mutate({ pollId: poll.id, selectedOptions: finalSelections });
                                }}
                                className="w-full bg-blue-600 hover:bg-blue-700"
                                disabled={votePoll.isPending || !currentSelections.length}
                              >
                                {votePoll.isPending ? t("schoolProfile.voting") : t("schoolProfile.vote")}
                              </Button>
                            )}
                            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                              <span>{poll.votersCount || poll.totalVotes || 0} {t("schoolProfile.voteCount")}</span>
                              {poll.expiresAt && (
                                <span>
                                  {isExpired ? t("schoolProfile.voteEnded") : `${t("schoolProfile.voteEndsAt")} ${new Date(poll.expiresAt).toLocaleDateString(getDateLocale(), { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`}
                                </span>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </>
            )}

            {/* ABOUT TAB */}
            {activeTab === "about" && (
              <div className="space-y-4">
                <Card className="shadow-sm">
                  <CardContent className="p-4 sm:p-6 space-y-4">
                    <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                      <School className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                      {t("schoolProfile.aboutSchool")}
                    </h2>
                    {school.description ? (
                      <p className="text-sm leading-relaxed text-muted-foreground">{school.description}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">{t("schoolProfile.noDescriptionYet")}</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardContent className="p-4 sm:p-6 space-y-4">
                    <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                      <Phone className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                      {t("schoolProfile.contactInfo")}
                    </h2>
                    <div className="space-y-3">
                      {(school.address || school.city || school.governorate) && (
                        <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                          <MapPin className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm font-medium">{t("schoolProfile.address")}</p>
                            <p className="text-sm text-muted-foreground">{[school.address, school.city, school.governorate].filter(Boolean).join(t("schoolProfile.commaSeparator"))}</p>
                          </div>
                        </div>
                      )}
                      {school.phoneNumber && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                          <Phone className="h-5 w-5 text-green-500 shrink-0" />
                          <div>
                            <p className="text-sm font-medium">{t("schoolProfile.phoneNumber")}</p>
                            <a href={`tel:${school.phoneNumber}`} className="text-sm text-blue-600 hover:underline" dir="ltr">{school.phoneNumber}</a>
                          </div>
                        </div>
                      )}
                      {school.email && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                          <Mail className="h-5 w-5 text-blue-500 shrink-0" />
                          <div>
                            <p className="text-sm font-medium">{t("schoolProfile.email")}</p>
                            <a href={`mailto:${school.email}`} className="text-sm text-blue-600 hover:underline">{school.email}</a>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {socialEntries.length > 0 && (
                  <Card className="shadow-sm">
                    <CardContent className="p-4 sm:p-6 space-y-4">
                      <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                        <Globe className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                        {t("schoolProfile.socialMediaPages")}
                      </h2>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {socialEntries.map(([platform, url]) => (
                          <a
                            key={platform}
                            href={url as string}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-2.5 sm:gap-3 text-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl transition-all ${socialColor(platform)} shadow-md hover:shadow-lg`}
                          >
                            <SocialIcon platform={platform} />
                            <div className="flex-1">
                              <p className="font-semibold text-sm">{socialLabel(platform)}</p>
                              <p className="text-xs opacity-75 truncate" dir="ltr">{(url as string).replace(/^https?:\/\/(www\.)?/, "").substring(0, 30)}</p>
                            </div>
                            <ExternalLink className="h-4 w-4 opacity-60" />
                          </a>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card className="shadow-sm">
                  <CardContent className="p-4 sm:p-6 space-y-4">
                    <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                      <BookOpenCheck className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                      {t("schoolProfile.generalInfo")}
                    </h2>
                    <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <Calendar className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="text-xs text-muted-foreground">{t("schoolProfile.joinDate")}</p>
                          <p className="text-sm font-medium">{joinDate}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <Award className="h-5 w-5 text-yellow-500" />
                        <div>
                          <p className="text-xs text-muted-foreground">{t("schoolProfile.verificationStatus")}</p>
                          <p className="text-sm font-medium">{school.isVerified ? t("schoolProfile.verified") : t("schoolProfile.notVerified")}</p>
                        </div>
                      </div>
                      {school.referralCode && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                          <Share2 className="h-5 w-5 text-purple-500" />
                          <div>
                            <p className="text-xs text-muted-foreground">{t("schoolProfile.referralCodeLabel")}</p>
                            <p className="text-sm font-mono font-bold text-blue-600">{school.referralCode}</p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="text-xs text-muted-foreground">{t("schoolProfile.activityPoints")}</p>
                          <p className="text-sm font-medium">{school.activityScore}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* TEACHERS TAB */}
            {activeTab === "teachers" && (
              <>
                {!school.teachers?.length ? (
                  <Card className="shadow-sm">
                    <CardContent className="p-12 text-center">
                      <GraduationCap className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-muted-foreground">{t("schoolProfile.noTeachersYet")}</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {school.teachers.map((teacher: any) => {
                      const teacherSocials = Object.entries(teacher.socialLinks || {}).filter(([, v]) => v);
                      return (
                        <Card key={teacher.id} className="shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                          {teacher.coverImageUrl && (
                            <img src={teacher.coverImageUrl} alt="" className="w-full h-32 object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                          )}
                          <CardContent className="p-3 sm:p-4">
                            <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                              <Link href={`/teacher/${teacher.id}`} className="shrink-0">
                                {teacher.avatarUrl ? (
                                  <img
                                    src={teacher.avatarUrl}
                                    alt=""
                                    className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-white shadow-md ${teacher.coverImageUrl ? "-mt-12" : ""}`}
                                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                                  />
                                ) : (
                                  <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center border-2 border-white shadow-md ${teacher.coverImageUrl ? "-mt-12" : ""}`}>
                                    <GraduationCap className="h-7 w-7 sm:h-8 sm:w-8 text-green-600" />
                                  </div>
                                )}
                              </Link>
                              <div className="flex-1 min-w-0">
                                <Link href={`/teacher/${teacher.id}`}>
                                  <h3 className="font-bold text-base hover:text-blue-600 transition-colors cursor-pointer">{teacher.name}</h3>
                                </Link>
                                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                  {teacher.subject && (
                                    <Badge variant="secondary" className="text-xs">{teacher.subject}</Badge>
                                  )}
                                  {teacher.yearsExperience > 0 && (
                                    <span className="text-xs text-muted-foreground">{teacher.yearsExperience} {t("schoolProfile.yearsExperience")}</span>
                                  )}
                                </div>
                                {teacher.bio && (
                                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{teacher.bio}</p>
                                )}
                                <div className="flex flex-wrap gap-2 sm:gap-3 mt-2 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <BookOpen className="h-3 w-3" />
                                    {teacher.totalTasksSold || 0} {t("schoolProfile.tasksSold")}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {teacher.totalStudents || 0} {t("schoolProfile.student")}
                                  </span>
                                  {teacher.perTaskRate && (
                                    <span className="text-green-600 font-bold">{teacher.perTaskRate} {t("schoolProfile.currencyPerTask")}</span>
                                  )}
                                  {teacher.monthlyRate && (
                                    <span className="text-blue-600 font-bold">{teacher.monthlyRate} {t("schoolProfile.currencyPerMonth")}</span>
                                  )}
                                </div>
                                {teacherSocials.length > 0 && (
                                  <div className="flex gap-1.5 mt-2">
                                    {teacherSocials.map(([platform, url]) => (
                                      <a
                                        key={platform}
                                        href={url as string}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                                        title={socialLabel(platform)}
                                      >
                                        <SocialIcon platform={platform} />
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <Link href={`/teacher/${teacher.id}`} className="shrink-0 mt-2 sm:mt-0">
                                <Button size="sm" variant="outline" className="shrink-0 gap-1 text-xs sm:text-sm">
                                  <ExternalLink className="h-3 w-3" />
                                  {t("schoolProfile.viewProfile")}
                                </Button>
                              </Link>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* REVIEWS TAB */}
            {activeTab === "reviews" && (
              <div className="space-y-4">
                <Card className="shadow-sm">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center gap-4 sm:gap-6">
                      <div className="text-center shrink-0">
                        <div className="text-3xl sm:text-5xl font-extrabold text-foreground">{school.avgRating || 0}</div>
                        <div className="flex gap-0.5 mt-1 justify-center">
                          {[1, 2, 3, 4, 5].map(n => (
                            <Star key={n} className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${n <= Math.round(school.avgRating || 0) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{school.reviews?.length || 0} {t("schoolProfile.reviewCount")}</p>
                      </div>
                      <div className="flex-1 space-y-1.5">
                        {[5, 4, 3, 2, 1].map(n => {
                          const count = school.reviews?.filter((r: any) => r.rating === n).length || 0;
                          const pct = school.reviews?.length ? (count / school.reviews.length) * 100 : 0;
                          return (
                            <div key={n} className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                              <span className="w-3">{n}</span>
                              <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                              <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="w-6 text-xs text-muted-foreground text-start">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardContent className="p-4 sm:p-6 space-y-3">
                    <h3 className="font-bold text-base sm:text-lg">{t("schoolProfile.addYourReview")}</h3>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(n => (
                        <button key={n} onClick={() => setReviewRating(n)} className="transition-transform hover:scale-110">
                          <Star className={`h-7 w-7 sm:h-8 sm:w-8 ${n <= reviewRating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />
                        </button>
                      ))}
                    </div>
                    <Textarea
                      placeholder={t("schoolProfile.shareOpinionSchool")}
                      value={reviewComment}
                      onChange={e => setReviewComment(e.target.value)}
                      className="min-h-[80px]"
                    />
                    <Button onClick={() => submitReview.mutate()} className="bg-blue-600 hover:bg-blue-700" disabled={submitReview.isPending}>
                      {submitReview.isPending ? t("schoolProfile.submitting") : t("schoolProfile.submitReview")}
                    </Button>
                  </CardContent>
                </Card>

                {school.reviews?.length > 0 && (
                  <div className="space-y-3">
                    {school.reviews.map((review: any) => (
                      <Card key={review.id} className="shadow-sm">
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex items-start gap-2.5 sm:gap-3">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0">
                              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
                                <span className="font-bold text-sm truncate">{review.parentName || t("schoolProfile.parent")}</span>
                                <span className="text-xs text-muted-foreground shrink-0">{new Date(review.createdAt).toLocaleDateString(getDateLocale(), { year: "numeric", month: "long", day: "numeric" })}</span>
                              </div>
                              <div className="flex gap-0.5 mt-0.5">
                                {[1, 2, 3, 4, 5].map(n => (
                                  <Star key={n} className={`h-3.5 w-3.5 ${n <= review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />
                                ))}
                              </div>
                              {review.comment && <p className="text-sm mt-2 text-muted-foreground">{review.comment}</p>}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
