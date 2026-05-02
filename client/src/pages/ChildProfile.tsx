import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ArrowRight, ArrowLeft, User, Camera, Calendar, School, Heart,
  Save, Loader2, Star, Trophy, Sparkles, Share2, Users, Bell, UserPlus,
  Check, X, MapPin, Award, Flame, Gamepad2, Droplets, TreePine, BookOpen,
  Copy, ImagePlus, Settings, Search, UserCheck, Send, ThumbsUp, ShoppingBag,
  MessageCircle, Trash2, Image as ImageIcon, Info, Clock, PenSquare, Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/contexts/ThemeContext";
import { ShareMenu } from "@/components/ui/ShareMenu";
import { apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import ImageCropper from "@/components/ImageCropper";
import { ChildBottomNav } from "@/components/ChildBottomNav";

// ======= INTERFACES =======
interface ShowcaseData {
  child: {
    id: string; name: string; avatarUrl?: string; coverImageUrl?: string;
    bio?: string; schoolName?: string; academicGrade?: string; hobbies?: string;
    governorate?: string; interests?: string[]; totalPoints: number;
    shareCode: string; joinedAt: string;
  };
  stats: {
    totalPoints: number; tasksCompleted: number; gamesPlayed: number;
    treeStage: number; wateringsCount: number; streak: number; friendCount: number;
  };
  achievements: { id: string; icon: string; title: string; description: string; earned: boolean }[];
  growthTree: any;
}

interface FriendData {
  id: string; name: string; avatarUrl?: string; schoolName?: string;
  governorate?: string; totalPoints: number; treeStage: number; friendshipId?: string;
}

interface FriendRequest {
  id: string; requesterId: string; status: string;
  requester: { id: string; name: string; avatarUrl?: string; schoolName?: string } | null;
}

interface Suggestion {
  id: string; name: string; avatarUrl?: string; schoolName?: string;
  governorate?: string; score: number; reasons: string[];
}

interface FriendNotification {
  id: string; fromChildId: string; type: string; title: string; message: string;
  isRead: boolean; createdAt: string; friendName?: string; friendAvatar?: string;
}

interface ChildPost {
  id: string; childId: string; content: string; mediaUrls?: string[]; mediaTypes?: string[];
  likesCount: number; commentsCount: number; isPinned: boolean; isActive: boolean;
  createdAt: string; updatedAt: string; authorName: string; authorAvatar?: string | null;
}

interface PostComment {
  id: string; postId: string; childId: string; authorName: string; authorAvatar?: string | null;
  content: string; isActive: boolean; createdAt: string;
}

type TabType = "showcase" | "posts" | "about" | "friends" | "notifications" | "edit";

const ALLOWED_AVATAR_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// ======= GAME SHARE DATA =======
interface GameShareData {
  gameId: string;
  gameName: string;
  gameEmoji: string;
  gameUrl: string;
  thumbnailUrl?: string | null;
  score: number;
  stars: number;
  level: number;
  world: number;
  previousScore: number | null;
  motivationalText: string;
}

function parseGameShare(content: string): GameShareData | null {
  if (!content?.startsWith('###GAME_SHARE###')) return null;
  try {
    const jsonStr = content.replace('###GAME_SHARE###', '').replace('###END_GAME_SHARE###', '');
    return JSON.parse(jsonStr);
  } catch { return null; }
}

// ======= GAME SHARE CARD COMPONENT =======
function GameShareCard({ data, isDark, isRTL }: { data: GameShareData; isDark: boolean; isRTL: boolean }) {
  const [, navigate] = useLocation();

  const gradientMap: Record<string, string> = {
    '🧠': 'from-purple-600 via-purple-500 to-pink-500',
    '🔢': 'from-emerald-600 via-green-500 to-teal-500',
    '🎮': 'from-blue-600 via-indigo-500 to-violet-500',
  };
  const gradient = gradientMap[data.gameEmoji] || gradientMap['🎮'];

  return (
    <div className={`rounded-2xl overflow-hidden bg-gradient-to-br ${gradient} p-[1px]`}>
      <div className="rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm p-4 text-white space-y-3">
        {/* Game Header */}
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center text-3xl shadow-lg">
            {data.gameEmoji}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg leading-tight truncate">{data.gameName}</h3>
            <div className="flex gap-0.5 mt-0.5">
              {[0, 1, 2].map(i => (
                <span key={i} className={`text-lg ${i < data.stars ? 'drop-shadow-[0_0_4px_rgba(255,215,0,0.8)]' : 'opacity-30'}`}>
                  {i < data.stars ? '⭐' : '☆'}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Score Section */}
        <div className="bg-white/15 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-white/70 text-sm font-medium">{isRTL ? 'النتيجة' : 'Score'}</span>
            <span className="font-bold text-2xl tabular-nums">{data.score}<span className="text-base text-white/60">/100</span></span>
          </div>
          {data.previousScore !== null && data.previousScore !== undefined && (
            <div className="flex items-center justify-between pt-2 border-t border-white/15">
              <span className="text-white/60 text-xs">{isRTL ? 'النتيجة السابقة' : 'Previous'}</span>
              <div className="flex items-center gap-2">
                <span className="text-white/50 text-sm line-through">{data.previousScore}</span>
                <span className="text-white/40">→</span>
                <span className="font-bold text-sm">{data.score}</span>
                {data.score > data.previousScore ? (
                  <span className="bg-green-400/30 text-green-200 text-xs px-1.5 py-0.5 rounded-full font-bold">
                    ↑{data.score - data.previousScore}
                  </span>
                ) : data.score < data.previousScore ? (
                  <span className="bg-red-400/30 text-red-200 text-xs px-1.5 py-0.5 rounded-full font-bold">
                    ↓{data.previousScore - data.score}
                  </span>
                ) : (
                  <span className="bg-white/20 text-white/70 text-xs px-1.5 py-0.5 rounded-full font-bold">=</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Motivational Text */}
        <p className="text-center text-white/90 font-semibold text-sm">{data.motivationalText}</p>

        {/* Play Button */}
        <button
          onClick={() => navigate(`/child-games?autoPlay=${encodeURIComponent(data.gameUrl)}`)}
          className="w-full py-2.5 bg-white/20 hover:bg-white/30 active:bg-white/40 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg border border-white/10"
        >
          <Play className="w-4 h-4 fill-current" />
          {isRTL ? 'العب الآن!' : 'Play Now!'}
        </button>
      </div>
    </div>
  );
}

// ======= POST CARD COMPONENT =======
function PostCard({ post, isDark, isRTL, token, t, isLiked, expanded, commentOpen, commentInput,
  onToggleExpand, onLike, onDelete, onToggleComments, onCommentChange, onSubmitComment, isSubmittingComment,
}: {
  post: ChildPost; isDark: boolean; isRTL: boolean; token: string; t: (k: string) => string;
  isLiked: boolean; expanded: boolean; commentOpen: boolean; commentInput: string;
  onToggleExpand: () => void; onLike: () => void; onDelete: () => void;
  onToggleComments: () => void; onCommentChange: (v: string) => void; onSubmitComment: () => void;
  isSubmittingComment: boolean;
}) {
  const { data: comments } = useQuery<PostComment[]>({
    queryKey: ["post-comments", post.id],
    queryFn: async () => {
      const res = await fetch(`/api/child/posts/${post.id}/comments`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
    enabled: commentOpen,
  });

  const gameShareData = parseGameShare(post.content);
  const needsTruncate = !gameShareData && post.content && post.content.length > 200;
  const displayContent = needsTruncate && !expanded ? post.content.slice(0, 200) + "..." : post.content;
  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return t("childProfile.posts.justNow");
    if (m < 60) return `${m} ${t("childProfile.posts.minutesAgo")}`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} ${t("childProfile.posts.hoursAgo")}`;
    const d = Math.floor(h / 24);
    return `${d} ${t("childProfile.posts.daysAgo")}`;
  };

  return (
    <Card className={`border-0 shadow-lg overflow-hidden ${isDark ? "bg-gray-800" : "bg-white"}`}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Avatar className="w-9 h-9">
              <AvatarImage src={post.authorAvatar || undefined} />
              <AvatarFallback className="bg-purple-100 text-purple-600 font-bold text-sm">{post.authorName?.charAt(0)}</AvatarFallback>
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

        {/* Content — Game Share Card or Regular Text */}
        {gameShareData ? (
          <GameShareCard data={gameShareData} isDark={isDark} isRTL={isRTL} />
        ) : post.content ? (
          <div>
            <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isDark ? "text-gray-300" : "text-gray-700"}`}>{displayContent}</p>
            {needsTruncate && (
              <button onClick={onToggleExpand} className="text-xs text-purple-500 font-medium mt-1">
                {expanded ? t("childProfile.posts.showLess") : t("childProfile.posts.showMore")}
              </button>
            )}
          </div>
        ) : null}

        {/* Media Gallery */}
        {post.mediaUrls && post.mediaUrls.length > 0 && (
          <div className={`grid gap-1.5 rounded-xl overflow-hidden ${post.mediaUrls.length === 1 ? "" : post.mediaUrls.length === 2 ? "grid-cols-2" : "grid-cols-2"}`}>
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${isLiked ? "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400" : isDark ? "text-gray-400 hover:bg-gray-700" : "text-gray-500 hover:bg-gray-100"}`}>
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
            url={`${typeof window !== "undefined" ? window.location.origin : ""}/child-post/${post.id}`}
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
                      <AvatarFallback className="bg-purple-100 text-purple-600 text-[10px] font-bold">{c.authorName?.charAt(0)}</AvatarFallback>
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
                placeholder={t("childProfile.posts.commentPlaceholder")}
                maxLength={500}
                className={`flex-1 h-8 text-xs rounded-xl ${isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-50 border-gray-200"}`}
                onKeyDown={(e) => { if (e.key === "Enter" && commentInput.trim()) onSubmitComment(); }}
              />
              <Button size="sm" className="h-8 px-3 rounded-xl bg-purple-500 text-white" disabled={!commentInput.trim() || isSubmittingComment}
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
export default function ChildProfile() {
  const [, navigate] = useLocation();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const token = localStorage.getItem("childToken");
  const isRTL = i18n.language === "ar";
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImage, setCropperImage] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("showcase");

  const [formData, setFormData] = useState({
    name: "", birthday: "", schoolName: "", academicGrade: "", hobbies: "",
  });
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [postContent, setPostContent] = useState("");
  const [postMediaUrls, setPostMediaUrls] = useState<string[]>([]);
  const [postMediaTypes, setPostMediaTypes] = useState<string[]>([]);
  const [isUploadingPostMedia, setIsUploadingPostMedia] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());
  const postMediaRef = useRef<HTMLInputElement>(null);

  const revokeBlobUrl = (url?: string | null) => {
    if (url && url.startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
  };

  // ======= QUERIES =======
  const { data: showcaseData, isLoading } = useQuery<ShowcaseData>({
    queryKey: ["child-showcase"],
    queryFn: async () => {
      const res = await fetch("/api/child/showcase", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      return json.data;
    },
    enabled: !!token,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const { data: profileData } = useQuery({
    queryKey: ["child-profile"],
    queryFn: async () => {
      const res = await fetch("/api/child/profile", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
    enabled: !!token && activeTab === "edit",
  });

  const { data: friendsData } = useQuery({
    queryKey: ["child-friends"],
    queryFn: async () => {
      const res = await fetch("/api/child/friends", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data as { friends: FriendData[]; pending: FriendRequest[] };
    },
    enabled: !!token && activeTab === "friends",
  });

  const { data: suggestionsData } = useQuery({
    queryKey: ["child-friend-suggestions"],
    queryFn: async () => {
      const res = await fetch("/api/child/friends/suggestions", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data as { suggestions: Suggestion[] };
    },
    enabled: !!token && activeTab === "friends",
  });

  const { data: notifData } = useQuery({
    queryKey: ["child-friend-notifications"],
    queryFn: async () => {
      const res = await fetch("/api/child/friends/notifications", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data as { notifications: FriendNotification[]; unreadCount: number };
    },
    enabled: !!token && activeTab === "notifications",
  });

  const { data: followCounts } = useQuery({
    queryKey: ["child-follow-counts"],
    queryFn: async () => {
      const res = await fetch("/api/child/follow-counts", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data as { followingCount: number; followersCount: number };
    },
    enabled: !!token,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  // Posts queries
  const { data: postsData, isLoading: postsLoading } = useQuery<ChildPost[]>({
    queryKey: ["child-my-posts"],
    queryFn: async () => {
      const res = await fetch("/api/child/posts", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
    enabled: !!token && activeTab === "posts",
  });

  // Check liked posts
  useEffect(() => {
    if (postsData && postsData.length > 0 && token) {
      const postIds = postsData.map(p => p.id);
      fetch("/api/child/posts/check-likes", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ postIds }),
      }).then(r => r.json()).then(res => {
        if (res.success) setLikedPosts(res.data);
      }).catch(() => {});
    }
  }, [postsData, token]);

  // ======= MUTATIONS =======
  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => apiRequest("PUT", "/api/child/profile", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["child-profile"] });
      queryClient.invalidateQueries({ queryKey: ["child-showcase"] });
      toast({ title: t("childProfile.updateSuccess") + " ✅", description: t("childProfile.profileUpdated") });
    },
  });

  const updateShowcaseMutation = useMutation({
    mutationFn: async (data: { bio?: string; interests?: string[] }) =>
      apiRequest("PUT", "/api/child/showcase-settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["child-showcase"] });
      toast({ title: t("childProfile.updateSuccess") + " ✅" });
    },
  });

  const friendRequestMutation = useMutation({
    mutationFn: async (friendId: string) =>
      apiRequest("POST", "/api/child/friends/request", { friendId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["child-friend-suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["child-friends"] });
      toast({ title: t("childProfile.friends.requestSent") + " ✅" });
    },
  });

  const handleFriendAction = useMutation({
    mutationFn: async ({ friendshipId, action }: { friendshipId: string; action: string }) =>
      apiRequest("PUT", `/api/child/friends/${friendshipId}`, { action }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["child-friends"] });
      queryClient.invalidateQueries({ queryKey: ["child-showcase"] });
      queryClient.invalidateQueries({ queryKey: ["child-friend-notifications"] });
    },
  });

  const removeFriend = useMutation({
    mutationFn: async (friendshipId: string) => {
      const res = await fetch(`/api/child/friends/${friendshipId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["child-friends"] });
      queryClient.invalidateQueries({ queryKey: ["child-showcase"] });
    },
  });

  // Post mutations
  const createPostMutation = useMutation({
    mutationFn: async (data: { content: string; mediaUrls: string[]; mediaTypes: string[] }) =>
      apiRequest("POST", "/api/child/posts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["child-my-posts"] });
      setPostContent("");
      setPostMediaUrls([]);
      setPostMediaTypes([]);
      toast({ title: t("childProfile.posts.created") + " ✅" });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const res = await fetch(`/api/child/posts/${postId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["child-my-posts"] });
      toast({ title: t("childProfile.posts.deleted") + " ✅" });
    },
  });

  const likePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const res = await fetch(`/api/child/posts/${postId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()) as { liked: boolean; likesCount: number };
    },
    onSuccess: (data, postId) => {
      setLikedPosts(prev => ({ ...prev, [postId]: data.liked }));
      queryClient.invalidateQueries({ queryKey: ["child-my-posts"] });
    },
  });

  const commentPostMutation = useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) =>
      apiRequest("POST", `/api/child/posts/${postId}/comment`, { content }),
    onSuccess: (_, variables) => {
      setCommentInputs(prev => ({ ...prev, [variables.postId]: "" }));
      queryClient.invalidateQueries({ queryKey: ["post-comments", variables.postId] });
      queryClient.invalidateQueries({ queryKey: ["child-my-posts"] });
    },
  });

  const handlePostMediaUpload = async (files: FileList) => {
    setIsUploadingPostMedia(true);
    try {
      const fd = new FormData();
      Array.from(files).slice(0, 5).forEach(f => fd.append("media", f));
      const res = await fetch("/api/child/posts/media", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error("Upload failed");
      const json = await res.json();
      setPostMediaUrls(prev => [...prev, ...json.data.urls].slice(0, 5));
      setPostMediaTypes(prev => [...prev, ...json.data.types].slice(0, 5));
    } catch {
      toast({ title: t("childProfile.uploadFailed"), variant: "destructive" });
    } finally {
      setIsUploadingPostMedia(false);
    }
  };

  const markNotifRead = useMutation({
    mutationFn: async (notifId: string) =>
      apiRequest("PUT", `/api/child/friends/notifications/${notifId}/read`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["child-friend-notifications"] }),
  });

  // ======= EFFECTS =======
  useEffect(() => {
    if (profileData) {
      setFormData({
        name: profileData.name || "",
        birthday: profileData.birthday ? new Date(profileData.birthday).toISOString().split("T")[0] : "",
        schoolName: profileData.schoolName || "",
        academicGrade: profileData.academicGrade || "",
        hobbies: profileData.hobbies || "",
      });
    }
  }, [profileData]);

  useEffect(() => {
    if (showcaseData) {
      setBio(showcaseData.child.bio || "");
      setInterests(showcaseData.child.interests || []);
    }
  }, [showcaseData]);

  useEffect(() => {
    return () => {
      revokeBlobUrl(cropperImage);
      revokeBlobUrl(avatarPreview);
    };
  }, [cropperImage, avatarPreview]);

  // ======= UPLOAD HANDLERS =======
  const handleSelectAvatar = (file: File) => {
    if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.type)) {
      toast({
        title: t("childProfile.uploadFailed"),
        description: "JPG, PNG, WebP, GIF only",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      toast({ title: t("childProfile.fileTooLarge"), variant: "destructive" });
      return;
    }

    revokeBlobUrl(cropperImage);
    setCropperImage(URL.createObjectURL(file));
    setCropperOpen(true);
  };

  const handleCroppedAvatar = async (blob: Blob) => {
    if (!token) {
      toast({ title: t("childProfile.uploadFailed"), variant: "destructive" });
      return;
    }

    const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
    if (file.size > 3 * 1024 * 1024) {
      toast({ title: t("childProfile.fileTooLarge"), variant: "destructive" });
      return;
    }

    const localPreviewUrl = URL.createObjectURL(file);
    revokeBlobUrl(avatarPreview);
    setAvatarPreview(localPreviewUrl);
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const res = await fetch("/api/child/avatar", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Upload failed");
      }

      const savedAvatarUrl = json?.data?.avatarUrl;
      if (savedAvatarUrl) {
        revokeBlobUrl(localPreviewUrl);
        setAvatarPreview(savedAvatarUrl);
      }

      queryClient.invalidateQueries({ queryKey: ["child-profile"] });
      queryClient.invalidateQueries({ queryKey: ["child-showcase"] });
      toast({ title: t("childProfile.photoUploaded") + " ✅" });
    } catch (error: any) {
      setAvatarPreview(null);
      toast({
        title: t("childProfile.uploadFailed"),
        description: error?.message || undefined,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCoverUpload = async (file: File) => {
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      toast({ title: t("childProfile.fileTooLarge"), variant: "destructive" });
      return;
    }
    setIsUploadingCover(true);
    try {
      const fd = new FormData();
      fd.append("cover", file);
      const res = await fetch("/api/child/cover-image", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error("Upload failed");
      queryClient.invalidateQueries({ queryKey: ["child-showcase"] });
      toast({ title: t("childProfile.coverUploaded") + " ✅" });
    } catch {
      toast({ title: t("childProfile.uploadFailed"), variant: "destructive" });
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name.trim().length < 2) {
      toast({
        title: t("childProfile.invalidName"),
        description: t("childProfile.nameMinLength"),
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate(formData);
    if (bio !== (showcaseData?.child.bio || "")) {
      updateShowcaseMutation.mutate({ bio, interests });
    }
  };

  const handleShareProfile = async () => {
    const code = showcaseData?.child.shareCode;
    if (!code) return;
    const url = `${window.location.origin}/child-public-profile/${code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: showcaseData?.child.name, text: t("childProfile.shareText"), url });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: t("childProfile.linkCopied") + " ✅" });
    }
  };

  const gradeOptions = [
    { value: "grade1", label: t("childProfile.grades.grade1") },
    { value: "grade2", label: t("childProfile.grades.grade2") },
    { value: "grade3", label: t("childProfile.grades.grade3") },
    { value: "grade4", label: t("childProfile.grades.grade4") },
    { value: "grade5", label: t("childProfile.grades.grade5") },
    { value: "grade6", label: t("childProfile.grades.grade6") },
    { value: "grade7", label: t("childProfile.grades.grade7") },
    { value: "grade8", label: t("childProfile.grades.grade8") },
    { value: "grade9", label: t("childProfile.grades.grade9") },
    { value: "grade10", label: t("childProfile.grades.grade10") },
    { value: "grade11", label: t("childProfile.grades.grade11") },
    { value: "grade12", label: t("childProfile.grades.grade12") },
  ];

  const INTEREST_OPTIONS = [
    "reading", "drawing", "coding", "sports", "music", "science",
    "math", "languages", "cooking", "photography", "nature", "robotics",
  ];

  // ======= LOADING STATE =======
  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? "bg-gray-900" : "bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50"}`}>
        <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
      </div>
    );
  }

  const sc = showcaseData;
  const currentAvatar = avatarPreview || sc?.child.avatarUrl;
  const currentCover = sc?.child.coverImageUrl;
  const earnedAchievements = sc?.achievements.filter(a => a.earned) || [];
  const unreadNotifs = notifData?.unreadCount || 0;
  const totalPoints = sc?.stats.totalPoints || 0;
  const milestoneProgressRaw = totalPoints % 100;
  const milestoneProgress = totalPoints > 0 && milestoneProgressRaw === 0 ? 100 : milestoneProgressRaw;
  const pointsToNextMilestone = milestoneProgress === 100 ? 100 : 100 - milestoneProgress;

  // ======= RENDER =======
  return (
    <div className={`relative min-h-screen pb-24 overflow-x-hidden ${isDark ? "bg-gradient-to-b from-slate-950 via-gray-950 to-slate-900" : "bg-gradient-to-br from-fuchsia-50 via-white to-violet-50"}`} dir={isRTL ? "rtl" : "ltr"}>
      <div className={`pointer-events-none absolute -top-20 ${isRTL ? "-left-20" : "-right-20"} h-72 w-72 rounded-full blur-3xl ${isDark ? "bg-fuchsia-700/20" : "bg-fuchsia-200/40"}`} />
      <div className={`pointer-events-none absolute top-[26rem] ${isRTL ? "-right-20" : "-left-20"} h-80 w-80 rounded-full blur-3xl ${isDark ? "bg-violet-700/20" : "bg-violet-200/40"}`} />
      {/* ===== COVER & AVATAR HERO ===== */}
      <div className="relative max-w-4xl mx-auto z-10">
        {/* Cover Image */}
        <div className="h-44 sm:h-56 relative overflow-hidden rounded-b-3xl ring-1 ring-white/60 dark:ring-slate-800 shadow-xl">
          {currentCover ? (
            <img src={currentCover} alt="cover" className="w-full h-full object-cover" />
          ) : (
              <div className="w-full h-full bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/20 to-transparent" />

          {/* Cover upload button */}
          <label
            htmlFor="child-cover-upload-input"
            className={`absolute top-3 end-3 p-2 bg-black/40 hover:bg-black/60 text-white rounded-xl backdrop-blur-sm transition-all shadow-lg cursor-pointer ${isUploadingCover ? "pointer-events-none opacity-70" : ""}`}
          >
            {isUploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
          </label>
          <input id="child-cover-upload-input" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f); e.target.value = ""; }} />

          {/* Back button */}
          <button
            onClick={() => navigate("/child-games")}
            className="absolute top-3 start-3 p-2 bg-black/40 hover:bg-black/60 text-white rounded-xl backdrop-blur-sm shadow-lg"
          >
            {isRTL ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
          </button>

          {/* Share button */}
          <button
            onClick={handleShareProfile}
            className="absolute top-3 end-14 p-2 bg-black/40 hover:bg-black/60 text-white rounded-xl backdrop-blur-sm shadow-lg"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Top utilities */}
        </div>

        {/* Avatar */}
        <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 z-10">
          <div className="relative group">
            <Avatar className={`w-28 h-28 border-4 shadow-xl ${isDark ? "border-gray-900" : "border-white"}`}>
              <AvatarImage src={currentAvatar || undefined} className="object-cover" />
              <AvatarFallback className="bg-gradient-to-br from-purple-400 to-fuchsia-500 text-white text-3xl font-bold">
                {sc?.child.name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <div
              className={`absolute z-20 bottom-0 end-0 w-10 h-10 bg-purple-600 hover:bg-purple-700 text-white rounded-full flex items-center justify-center shadow-lg transition-all group-hover:scale-110 ${isUploading ? "opacity-70" : ""}`}
              aria-label={t("childProfile.uploadPhoto")}
              role="button"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                disabled={isUploading}
                aria-label={t("childProfile.uploadPhoto")}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleSelectAvatar(f);
                  e.target.value = "";
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Name & quick stats */}
      <div className="pt-16 pb-3 text-center px-4 relative z-10">
        <h1 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
          {sc?.child.name}
        </h1>
        {sc?.child.bio && (
          <p className={`text-sm mt-1 max-w-xs mx-auto ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            {sc.child.bio}
          </p>
        )}
        <div className="flex items-center justify-center gap-2 mt-2 flex-wrap max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full text-xs font-bold">
            <Star className="w-3 h-3" /> {sc?.stats.totalPoints || 0}
          </span>
          <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-bold">
            <TreePine className="w-3 h-3" /> {t("childProfile.treeLevel")} {sc?.stats.treeStage || 1}
          </span>
          {(sc?.stats.streak || 0) > 0 && (
            <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full text-xs font-bold">
              <Flame className="w-3 h-3" /> {sc?.stats.streak} {t("childProfile.dayStreak")}
            </span>
          )}
          <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full text-xs font-bold">
            <Users className="w-3 h-3" /> {sc?.stats.friendCount || 0} {t("childProfile.friends.title")}
          </span>
          <span className="inline-flex items-center gap-1 bg-cyan-100 text-cyan-700 px-2.5 py-1 rounded-full text-xs font-bold">
            <UserCheck className="w-3 h-3" /> {followCounts?.followersCount || 0} {t("childProfile.followers")}
          </span>
          <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full text-xs font-bold">
            <UserPlus className="w-3 h-3" /> {followCounts?.followingCount || 0} {t("childProfile.followingCount")}
          </span>
        </div>
        {/* Discover + Store Buttons */}
        <div className="mt-3 flex items-center justify-center gap-2">
          <button
            onClick={() => navigate("/child-discover")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all"
          >
            <Search className="w-3.5 h-3.5" /> {t("childProfile.discoverButton")}
          </button>
          <button
            onClick={() => navigate("/child-store")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all"
            data-testid="button-open-store-from-child-profile"
          >
            <ShoppingBag className="w-3.5 h-3.5" /> {t("store.title", "المتجر")}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 max-w-3xl mx-auto">
          {[
            { icon: BookOpen, label: t("childNav.tasks", "Tasks"), action: () => navigate("/child-tasks"), color: "from-blue-500 to-cyan-500" },
            { icon: Gamepad2, label: t("childNav.games", "Games"), action: () => navigate("/child-games"), color: "from-indigo-500 to-violet-500" },
            { icon: Trophy, label: t("childNav.progress", "Progress"), action: () => navigate("/child-progress"), color: "from-amber-500 to-orange-500" },
            { icon: Bell, label: t("childProfile.tabs.notifications"), action: () => setActiveTab("notifications"), color: "from-fuchsia-500 to-pink-500", badge: unreadNotifs },
          ].map((actionItem) => (
            <button
              key={actionItem.label}
              onClick={actionItem.action}
              className={`relative rounded-2xl p-3 text-white bg-gradient-to-br ${actionItem.color} shadow-lg hover:shadow-xl transition-all text-start`}
            >
              <div className="flex items-center gap-2">
                <actionItem.icon className="w-4 h-4" />
                <span className="text-xs font-bold truncate">{actionItem.label}</span>
              </div>
              {actionItem.badge && actionItem.badge > 0 && (
                <span className="absolute -top-1 -end-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white/70">
                  {actionItem.badge > 9 ? "9+" : actionItem.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ===== TAB BAR ===== */}
      <div className={`sticky top-0 z-40 px-4 py-2 ${isDark ? "bg-slate-900/90" : "bg-white/90"} backdrop-blur-xl border-b ${isDark ? "border-slate-800" : "border-violet-100"} shadow-sm`}>
        <div className={`max-w-3xl mx-auto p-1 rounded-2xl border ${isDark ? "border-slate-800 bg-slate-900/80" : "border-violet-100 bg-white/80"}`}>
          <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {([
            { key: "showcase" as TabType, icon: Trophy, label: t("childProfile.tabs.showcase") },
            { key: "posts" as TabType, icon: PenSquare, label: t("childProfile.tabs.posts") },
            { key: "about" as TabType, icon: Info, label: t("childProfile.tabs.about") },
            { key: "friends" as TabType, icon: Users, label: t("childProfile.tabs.friends") },
            { key: "notifications" as TabType, icon: Bell, label: t("childProfile.tabs.notifications"), badge: unreadNotifs },
            { key: "edit" as TabType, icon: Settings, label: t("childProfile.tabs.edit") },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative min-w-[88px] flex flex-col items-center gap-0.5 py-2 px-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === tab.key
                  ? isDark ? "bg-purple-900/40 text-purple-300 ring-1 ring-purple-700/40" : "bg-purple-100 text-purple-700 ring-1 ring-purple-200"
                  : isDark ? "text-gray-500 hover:text-gray-300" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.badge && tab.badge > 0 && (
                <span className="absolute -top-0.5 end-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {tab.badge > 9 ? "9+" : tab.badge}
                </span>
              )}
            </button>
          ))}
          </div>
        </div>
      </div>

      {/* ===== TAB CONTENT ===== */}
      <main className="max-w-4xl mx-auto px-4 py-4 space-y-4 relative z-10">
        <AnimatePresence mode="wait">
          {/* ========== SHOWCASE TAB ========== */}
          {activeTab === "showcase" && (
            <motion.div key="showcase" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <Card className={`border-0 shadow-xl overflow-hidden ${isDark ? "bg-slate-800/95" : "bg-white/95"} backdrop-blur`}>
                <CardContent className="p-0">
                  <div className={`p-4 sm:p-5 bg-gradient-to-r ${isDark ? "from-purple-900/40 via-fuchsia-900/30 to-indigo-900/40" : "from-purple-100 via-fuchsia-50 to-indigo-100"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className={`text-xs font-semibold ${isDark ? "text-purple-300" : "text-purple-700"}`}>{t("childProfile.about.totalPoints")}</p>
                        <p className={`text-3xl font-black tracking-tight ${isDark ? "text-white" : "text-gray-900"}`}>{totalPoints}</p>
                        <p className={`text-xs mt-1 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                          {t("childProfile.treeLevel")} {sc?.stats.treeStage || 1} • {t("childProfile.about.streak")} {sc?.stats.streak || 0}
                        </p>
                      </div>
                      <div className={`px-3 py-2 rounded-xl ${isDark ? "bg-white/10" : "bg-white/70"}`}>
                        <p className={`text-[11px] ${isDark ? "text-gray-300" : "text-gray-500"}`}>{t("childProfile.stats.tasks")}</p>
                        <p className={`text-lg font-extrabold ${isDark ? "text-white" : "text-gray-900"}`}>{sc?.stats.tasksCompleted || 0}</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className={`text-[11px] ${isDark ? "text-gray-300" : "text-gray-600"}`}>{t("childProfile.tabs.showcase")}</p>
                        <p className={`text-[11px] font-semibold ${isDark ? "text-gray-200" : "text-gray-700"}`}>+{pointsToNextMilestone} {t("childProfile.pts")}</p>
                      </div>
                      <div className={`h-2 rounded-full overflow-hidden ${isDark ? "bg-slate-700" : "bg-white/80"}`}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(4, milestoneProgress)}%` }}
                          transition={{ duration: 0.7, ease: "easeOut" }}
                          className="h-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="p-3 grid grid-cols-3 gap-2">
                    {[
                      { icon: Sparkles, value: sc?.stats.tasksCompleted || 0, label: t("childProfile.stats.tasks"), color: "text-yellow-500", bg: "bg-yellow-50 dark:bg-yellow-900/20" },
                      { icon: Gamepad2, value: sc?.stats.gamesPlayed || 0, label: t("childProfile.stats.games"), color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
                      { icon: Droplets, value: sc?.stats.wateringsCount || 0, label: t("childProfile.stats.waterings"), color: "text-cyan-500", bg: "bg-cyan-50 dark:bg-cyan-900/20" },
                    ].map((stat, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className={`text-center p-2.5 rounded-xl shadow-sm ${stat.bg} ${isDark ? "border border-gray-700" : "border border-gray-100"}`}
                      >
                        <stat.icon className={`w-4 h-4 mx-auto mb-1 ${stat.color}`} />
                        <p className={`text-lg font-bold leading-tight ${isDark ? "text-white" : "text-gray-800"}`}>{stat.value}</p>
                        <p className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>{stat.label}</p>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { icon: Users, label: t("childProfile.tabs.friends"), value: sc?.stats.friendCount || 0, color: "from-sky-500 to-cyan-500", action: () => setActiveTab("friends") },
                  { icon: Bell, label: t("childProfile.tabs.notifications"), value: unreadNotifs, color: "from-fuchsia-500 to-pink-500", action: () => setActiveTab("notifications") },
                  { icon: UserCheck, label: t("childProfile.followers"), value: followCounts?.followersCount || 0, color: "from-violet-500 to-purple-500", action: () => setActiveTab("friends") },
                  { icon: UserPlus, label: t("childProfile.followingCount"), value: followCounts?.followingCount || 0, color: "from-emerald-500 to-teal-500", action: () => setActiveTab("friends") },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={item.action}
                    className={`rounded-2xl p-3 text-white bg-gradient-to-br ${item.color} shadow-md hover:shadow-lg transition-all text-start`}
                  >
                    <item.icon className="w-4 h-4 mb-2" />
                    <p className="text-lg font-extrabold leading-none">{item.value}</p>
                    <p className="text-[11px] mt-1 opacity-95 truncate">{item.label}</p>
                  </button>
                ))}
              </div>

              {/* Achievements Section */}
              <Card className={`border-0 shadow-lg overflow-hidden ${isDark ? "bg-gray-800/95" : "bg-white/95"} backdrop-blur`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Award className="w-5 h-5 text-yellow-500" />
                    <h3 className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                      {t("childProfile.achievements.title")}
                    </h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? "bg-yellow-900/30 text-yellow-400" : "bg-yellow-100 text-yellow-700"}`}>
                      {earnedAchievements.length}/{sc?.achievements.length || 0}
                    </span>
                  </div>

                  {/* Earned */}
                  {earnedAchievements.length > 0 && (
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mb-3">
                      {earnedAchievements.map((a, i) => (
                        <motion.div
                          key={a.id}
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.05, type: "spring" }}
                          className={`text-center p-2 rounded-xl ${isDark ? "bg-gradient-to-br from-yellow-900/30 to-orange-900/20 border border-yellow-800/30" : "bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200"}`}
                        >
                          <span className="text-2xl">{a.icon}</span>
                          <p className={`text-[9px] mt-0.5 leading-tight font-medium ${isDark ? "text-yellow-300" : "text-yellow-800"}`}>
                            {a.title}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* Locked */}
                  {(sc?.achievements.filter(a => !a.earned).length || 0) > 0 && (
                    <div className="grid grid-cols-5 gap-1.5">
                      {sc?.achievements.filter(a => !a.earned).map((a) => (
                        <div key={a.id} className={`text-center p-1.5 rounded-lg opacity-40 ${isDark ? "bg-gray-700" : "bg-gray-100"}`}>
                          <span className="text-lg grayscale">{a.icon}</span>
                          <p className={`text-[8px] mt-0.5 ${isDark ? "text-gray-500" : "text-gray-400"}`}>🔒</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Info Cards */}
              {(sc?.child.schoolName || sc?.child.governorate) && (
                <Card className={`border-0 shadow-lg ${isDark ? "bg-gray-800/95" : "bg-white/95"} backdrop-blur`}>
                  <CardContent className="p-4 space-y-2">
                    {sc?.child.schoolName && (
                      <div className="flex items-center gap-2">
                        <School className="w-4 h-4 text-green-500" />
                        <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>{sc.child.schoolName}</span>
                      </div>
                    )}
                    {sc?.child.governorate && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-red-500" />
                        <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>{sc.child.governorate}</span>
                      </div>
                    )}
                    {sc?.child.hobbies && (
                      <div className="flex items-center gap-2">
                        <Heart className="w-4 h-4 text-pink-500" />
                        <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>{sc.child.hobbies}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Interests */}
              {sc?.child.interests && sc.child.interests.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {sc.child.interests.map((interest) => (
                    <span key={interest} className={`px-3 py-1 rounded-full text-xs font-medium ${isDark ? "bg-purple-900/30 text-purple-300 border border-purple-800/30" : "bg-purple-100 text-purple-700"}`}>
                      #{t(`childProfile.interest.${interest}`)}
                    </span>
                  ))}
                </div>
              )}

              {/* Share Card */}
              <Card className={`border-0 shadow-lg ${isDark ? "bg-gray-800/95" : "bg-white/95"} backdrop-blur`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Share2 className="w-4 h-4 text-blue-500" />
                      <span className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-800"}`}>
                        {t("childProfile.shareProfile")}
                      </span>
                    </div>
                    <ShareMenu
                      url={`${typeof window !== "undefined" ? window.location.origin : ""}/child-public-profile/${sc?.child.shareCode || ""}`}
                      title={sc?.child.name || ""}
                      description={sc?.child.bio || t("childProfile.shareText")}
                      size="sm"
                      variant="outline"
                      buttonLabel={t("childProfile.copyLink")}
                    />
                  </div>
                  <p className={`text-xs mt-2 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                    {t("childProfile.shareDescription")}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ========== POSTS TAB ========== */}
          {activeTab === "posts" && (
            <motion.div key="posts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              {/* Create Post */}
              <Card className={`border-0 shadow-lg ${isDark ? "bg-gray-800" : "bg-white"}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      <AvatarImage src={currentAvatar || undefined} />
                      <AvatarFallback className="bg-purple-100 text-purple-600 font-bold">{sc?.child.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <Textarea
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      placeholder={t("childProfile.posts.placeholder")}
                      maxLength={2000}
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
                        {t("childProfile.posts.addMedia")}
                      </button>
                      <input ref={postMediaRef} type="file" accept="image/*,video/*" multiple className="hidden"
                        onChange={(e) => { if (e.target.files) handlePostMediaUpload(e.target.files); e.target.value = ""; }} />
                      <span className={`text-[10px] ${isDark ? "text-gray-600" : "text-gray-400"}`}>{postContent.length}/2000</span>
                    </div>
                    <Button
                      size="sm"
                      className="rounded-xl bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white"
                      disabled={createPostMutation.isPending || (!postContent.trim() && postMediaUrls.length === 0)}
                      onClick={() => createPostMutation.mutate({ content: postContent.trim(), mediaUrls: postMediaUrls, mediaTypes: postMediaTypes })}
                    >
                      {createPostMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-3.5 h-3.5 me-1" /> {t("childProfile.posts.publish")}</>}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Posts Feed */}
              {postsLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>
              ) : (!postsData || postsData.length === 0) ? (
                <div className="text-center py-10">
                  <PenSquare className={`w-10 h-10 mx-auto mb-3 ${isDark ? "text-gray-600" : "text-gray-300"}`} />
                  <p className={`text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>{t("childProfile.posts.empty")}</p>
                </div>
              ) : (
                postsData.map((post) => (
                  <PostCard
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
              {/* About Me */}
              {sc?.child.bio && (
                <Card className={`border-0 shadow-lg ${isDark ? "bg-gray-800" : "bg-white"}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <User className="w-5 h-5 text-purple-500" />
                      <h3 className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>{t("childProfile.about.bio")}</h3>
                    </div>
                    <p className={`text-sm leading-relaxed ${isDark ? "text-gray-300" : "text-gray-600"}`}>{sc.child.bio}</p>
                  </CardContent>
                </Card>
              )}

              {/* Personal Info */}
              <Card className={`border-0 shadow-lg ${isDark ? "bg-gray-800" : "bg-white"}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="w-5 h-5 text-blue-500" />
                    <h3 className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>{t("childProfile.about.info")}</h3>
                  </div>
                  {sc?.child.schoolName && (
                    <div className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? "bg-gray-700/50" : "bg-gray-50"}`}>
                      <School className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <div>
                        <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>{t("childProfile.about.school")}</p>
                        <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-800"}`}>{sc.child.schoolName}</p>
                      </div>
                    </div>
                  )}
                  {sc?.child.academicGrade && (
                    <div className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? "bg-gray-700/50" : "bg-gray-50"}`}>
                      <Award className="w-5 h-5 text-blue-500 flex-shrink-0" />
                      <div>
                        <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>{t("childProfile.about.grade")}</p>
                        <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-800"}`}>{t(`childProfile.grades.${sc.child.academicGrade}`)}</p>
                      </div>
                    </div>
                  )}
                  {sc?.child.governorate && (
                    <div className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? "bg-gray-700/50" : "bg-gray-50"}`}>
                      <MapPin className="w-5 h-5 text-red-500 flex-shrink-0" />
                      <div>
                        <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>{t("childProfile.about.location")}</p>
                        <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-800"}`}>{sc.child.governorate}</p>
                      </div>
                    </div>
                  )}
                  {sc?.child.hobbies && (
                    <div className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? "bg-gray-700/50" : "bg-gray-50"}`}>
                      <Heart className="w-5 h-5 text-pink-500 flex-shrink-0" />
                      <div>
                        <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>{t("childProfile.about.hobbies")}</p>
                        <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-800"}`}>{sc.child.hobbies}</p>
                      </div>
                    </div>
                  )}
                  {sc?.child.joinedAt && (
                    <div className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? "bg-gray-700/50" : "bg-gray-50"}`}>
                      <Clock className="w-5 h-5 text-gray-500 flex-shrink-0" />
                      <div>
                        <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>{t("childProfile.about.joined")}</p>
                        <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-800"}`}>
                          {new Date(sc.child.joinedAt).toLocaleDateString(isRTL ? "ar-EG" : "en-US", { year: "numeric", month: "long", day: "numeric" })}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Interests */}
              {sc?.child.interests && sc.child.interests.length > 0 && (
                <Card className={`border-0 shadow-lg ${isDark ? "bg-gray-800" : "bg-white"}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-5 h-5 text-yellow-500" />
                      <h3 className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>{t("childProfile.about.interests")}</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {sc.child.interests.map((interest) => (
                        <span key={interest} className={`px-3 py-1.5 rounded-full text-xs font-medium ${isDark ? "bg-purple-900/30 text-purple-300 border border-purple-800/30" : "bg-purple-100 text-purple-700"}`}>
                          #{t(`childProfile.interest.${interest}`)}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Stats Summary */}
              <Card className={`border-0 shadow-lg ${isDark ? "bg-gray-800" : "bg-white"}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <h3 className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>{t("childProfile.about.stats")}</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: Star, value: sc?.stats.totalPoints || 0, label: t("childProfile.about.totalPoints"), color: "text-yellow-500", bg: isDark ? "bg-yellow-900/20" : "bg-yellow-50" },
                      { icon: Sparkles, value: sc?.stats.tasksCompleted || 0, label: t("childProfile.stats.tasks"), color: "text-green-500", bg: isDark ? "bg-green-900/20" : "bg-green-50" },
                      { icon: Gamepad2, value: sc?.stats.gamesPlayed || 0, label: t("childProfile.stats.games"), color: "text-blue-500", bg: isDark ? "bg-blue-900/20" : "bg-blue-50" },
                      { icon: TreePine, value: sc?.stats.treeStage || 1, label: t("childProfile.treeLevel"), color: "text-emerald-500", bg: isDark ? "bg-emerald-900/20" : "bg-emerald-50" },
                      { icon: Flame, value: sc?.stats.streak || 0, label: t("childProfile.about.streak"), color: "text-orange-500", bg: isDark ? "bg-orange-900/20" : "bg-orange-50" },
                      { icon: Droplets, value: sc?.stats.wateringsCount || 0, label: t("childProfile.stats.waterings"), color: "text-cyan-500", bg: isDark ? "bg-cyan-900/20" : "bg-cyan-50" },
                    ].map((s, i) => (
                      <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${s.bg} ${isDark ? "border border-gray-700" : "border border-gray-100"}`}>
                        <s.icon className={`w-5 h-5 ${s.color}`} />
                        <div>
                          <p className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-800"}`}>{s.value}</p>
                          <p className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>{s.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Share Profile */}
              <Card className={`border-0 shadow-lg ${isDark ? "bg-gray-800" : "bg-white"}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Share2 className="w-5 h-5 text-blue-500" />
                    <h3 className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>{t("childProfile.shareProfile")}</h3>
                  </div>
                  <div className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? "bg-gray-700/50" : "bg-gray-50"}`}>
                    <div className="flex-1">
                      <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t("childProfile.about.shareCode")}</p>
                      <p className={`text-sm font-mono font-bold ${isDark ? "text-white" : "text-gray-800"}`}>{sc?.child.shareCode}</p>
                    </div>
                    <ShareMenu
                      url={`${typeof window !== "undefined" ? window.location.origin : ""}/child-public-profile/${sc?.child.shareCode || ""}`}
                      title={sc?.child.name || ""}
                      description={sc?.child.bio || t("childProfile.shareText")}
                      size="sm"
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ========== FRIENDS TAB ========== */}
          {activeTab === "friends" && (
            <motion.div key="friends" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              {/* Pending Requests */}
              {friendsData?.pending && friendsData.pending.length > 0 && (
                <Card className={`border-0 shadow-lg ${isDark ? "bg-gray-800" : "bg-white"}`}>
                  <CardContent className="p-4">
                    <h3 className={`font-bold text-sm mb-3 flex items-center gap-2 ${isDark ? "text-white" : "text-gray-800"}`}>
                      <UserPlus className="w-4 h-4 text-blue-500" />
                      {t("childProfile.friends.pendingRequests")} ({friendsData.pending.length})
                    </h3>
                    <div className="space-y-2">
                      {friendsData.pending.map((req) => (
                        <div key={req.id} className={`flex items-center justify-between p-2 rounded-xl ${isDark ? "bg-gray-700/50" : "bg-gray-50"}`}>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-9 h-9">
                              <AvatarImage src={req.requester?.avatarUrl || undefined} />
                              <AvatarFallback className="bg-blue-100 text-blue-600 text-xs font-bold">{req.requester?.name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-800"}`}>{req.requester?.name}</p>
                              {req.requester?.schoolName && (
                                <p className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>{req.requester.schoolName}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleFriendAction.mutate({ friendshipId: req.id, action: "accept" })}
                              className="w-8 h-8 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleFriendAction.mutate({ friendshipId: req.id, action: "reject" })}
                              className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* My Friends */}
              <Card className={`border-0 shadow-lg ${isDark ? "bg-gray-800" : "bg-white"}`}>
                <CardContent className="p-4">
                  <h3 className={`font-bold text-sm mb-3 flex items-center gap-2 ${isDark ? "text-white" : "text-gray-800"}`}>
                    <Users className="w-4 h-4 text-purple-500" />
                    {t("childProfile.friends.myFriends")} ({friendsData?.friends.length || 0})
                  </h3>
                  {(!friendsData?.friends || friendsData.friends.length === 0) ? (
                    <div className="text-center py-6">
                      <Users className={`w-10 h-10 mx-auto mb-2 ${isDark ? "text-gray-600" : "text-gray-300"}`} />
                      <p className={`text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                        {t("childProfile.friends.noFriendsYet")}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {friendsData.friends.map((f) => (
                        <div key={f.id} className={`flex items-center justify-between p-2 rounded-xl ${isDark ? "bg-gray-700/50" : "bg-gray-50"}`}>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={f.avatarUrl || undefined} />
                              <AvatarFallback className="bg-purple-100 text-purple-600 text-sm font-bold">{f.name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-800"}`}>{f.name}</p>
                              <div className="flex items-center gap-2 text-[10px]">
                                <span className={isDark ? "text-yellow-400" : "text-yellow-600"}>⭐ {f.totalPoints}</span>
                                <span className={isDark ? "text-green-400" : "text-green-600"}>🌱 L{f.treeStage}</span>
                                {f.schoolName && <span className={isDark ? "text-gray-500" : "text-gray-400"}>{f.schoolName}</span>}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => f.friendshipId && removeFriend.mutate(f.friendshipId)}
                            className={`p-1.5 rounded-lg text-xs ${isDark ? "hover:bg-gray-600 text-gray-400" : "hover:bg-gray-200 text-gray-400"}`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Friend Suggestions */}
              {suggestionsData?.suggestions && suggestionsData.suggestions.length > 0 && (
                <Card className={`border-0 shadow-lg ${isDark ? "bg-gray-800" : "bg-white"}`}>
                  <CardContent className="p-4">
                    <h3 className={`font-bold text-sm mb-3 flex items-center gap-2 ${isDark ? "text-white" : "text-gray-800"}`}>
                      <Sparkles className="w-4 h-4 text-yellow-500" />
                      {t("childProfile.friends.suggestions")}
                    </h3>
                    <div className="space-y-2">
                      {suggestionsData.suggestions.map((s) => (
                        <div key={s.id} className={`flex items-center justify-between p-2 rounded-xl ${isDark ? "bg-gray-700/50" : "bg-gray-50"}`}>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-9 h-9">
                              <AvatarImage src={s.avatarUrl || undefined} />
                              <AvatarFallback className="bg-yellow-100 text-yellow-600 text-xs font-bold">{s.name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-800"}`}>{s.name}</p>
                              <div className="flex items-center gap-1 flex-wrap">
                                {s.reasons.map((r) => (
                                  <span key={r} className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                                    r === "school" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                    r === "location" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                                    r === "grade" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                                    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                                  }`}>
                                    {t(`childProfile.friends.reason.${r}`)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            className="rounded-xl bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white text-xs h-8"
                            onClick={() => friendRequestMutation.mutate(s.id)}
                            disabled={friendRequestMutation.isPending}
                          >
                            <UserPlus className="w-3 h-3 me-1" /> {t("childProfile.friends.add")}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}

          {/* ========== NOTIFICATIONS TAB ========== */}
          {activeTab === "notifications" && (
            <motion.div key="notifications" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
              {(!notifData?.notifications || notifData.notifications.length === 0) ? (
                <div className="text-center py-10">
                  <Bell className={`w-10 h-10 mx-auto mb-3 ${isDark ? "text-gray-600" : "text-gray-300"}`} />
                  <p className={`text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                    {t("childProfile.notifications.empty")}
                  </p>
                </div>
              ) : (
                notifData.notifications.map((n) => (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => !n.isRead && markNotifRead.mutate(n.id)}
                    className={`p-3 rounded-xl cursor-pointer transition-all ${
                      n.isRead
                        ? isDark ? "bg-gray-800/50" : "bg-gray-50"
                        : isDark ? "bg-purple-900/20 border border-purple-800/30" : "bg-purple-50 border border-purple-200"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <Avatar className="w-9 h-9 flex-shrink-0">
                        <AvatarImage src={n.friendAvatar || undefined} />
                        <AvatarFallback className="bg-purple-100 text-purple-600 text-xs font-bold">{n.friendName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-800"}`}>
                          {n.title}
                        </p>
                        <p className={`text-xs mt-0.5 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                          {n.message}
                        </p>
                        <p className={`text-[10px] mt-1 ${isDark ? "text-gray-600" : "text-gray-300"}`}>
                          {new Date(n.createdAt).toLocaleDateString(isRTL ? "ar-EG" : "en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      {!n.isRead && <div className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0 mt-2" />}
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}

          {/* ========== EDIT TAB ========== */}
          {activeTab === "edit" && (
            <motion.div key="edit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Bio */}
                <Card className={`border-0 shadow-lg ${isDark ? "bg-gray-800" : "bg-white"}`}>
                  <CardContent className="pt-5 pb-5 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                      </div>
                      <h3 className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                        {t("childProfile.bioSection")}
                      </h3>
                    </div>
                    <Textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder={t("childProfile.bioPlaceholder")}
                      maxLength={300}
                      className={`min-h-[80px] resize-none rounded-xl ${isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-50 border-gray-200"}`}
                    />
                    <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>{bio.length}/300</p>
                  </CardContent>
                </Card>

                {/* Interests */}
                <Card className={`border-0 shadow-lg ${isDark ? "bg-gray-800" : "bg-white"}`}>
                  <CardContent className="pt-5 pb-5 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center">
                        <Heart className="w-4 h-4 text-pink-600" />
                      </div>
                      <h3 className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                        {t("childProfile.interestsSection")}
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {INTEREST_OPTIONS.map((opt) => {
                        const selected = interests.includes(opt);
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              if (selected) setInterests(interests.filter(i => i !== opt));
                              else if (interests.length < 10) setInterests([...interests, opt]);
                            }}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                              selected
                                ? "bg-purple-500 text-white shadow-md"
                                : isDark ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            {t(`childProfile.interest.${opt}`)}
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Personal Info */}
                <Card className={`border-0 shadow-lg ${isDark ? "bg-gray-800" : "bg-white"}`}>
                  <CardContent className="pt-5 pb-5 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      <h3 className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                        {t("childProfile.personalInfo")}
                      </h3>
                    </div>
                    <div className="space-y-1.5">
                      <Label className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                        {t("childProfile.name")} <span className="text-red-400">*</span>
                      </Label>
                      <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className={`min-h-[48px] rounded-xl ${isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-50 border-gray-200"}`} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className={`text-sm flex items-center gap-1.5 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                        <Calendar className="w-3.5 h-3.5" /> {t("childProfile.birthday")}
                      </Label>
                      <Input type="date" value={formData.birthday} onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                        className={`min-h-[48px] rounded-xl ${isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-50 border-gray-200"}`} />
                    </div>
                  </CardContent>
                </Card>

                {/* School Info */}
                <Card className={`border-0 shadow-lg ${isDark ? "bg-gray-800" : "bg-white"}`}>
                  <CardContent className="pt-5 pb-5 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                        <School className="w-4 h-4 text-green-600" />
                      </div>
                      <h3 className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                        {t("childProfile.schoolInfo")}
                      </h3>
                    </div>
                    <div className="space-y-1.5">
                      <Label className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>{t("childProfile.schoolName")}</Label>
                      <Input value={formData.schoolName} onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                        className={`min-h-[48px] rounded-xl ${isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-50 border-gray-200"}`} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>{t("childProfile.grade")}</Label>
                      <select value={formData.academicGrade} onChange={(e) => setFormData({ ...formData, academicGrade: e.target.value })}
                        className={`w-full min-h-[48px] px-3 py-2 rounded-xl border ${isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-50 border-gray-200"}`}>
                        <option value="">{t("childProfile.selectGrade")}</option>
                        {gradeOptions.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                      </select>
                    </div>
                  </CardContent>
                </Card>

                {/* Hobbies */}
                <Card className={`border-0 shadow-lg ${isDark ? "bg-gray-800" : "bg-white"}`}>
                  <CardContent className="pt-5 pb-5 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center">
                        <Heart className="w-4 h-4 text-pink-600" />
                      </div>
                      <h3 className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>{t("childProfile.hobbies")}</h3>
                    </div>
                    <Textarea value={formData.hobbies} onChange={(e) => setFormData({ ...formData, hobbies: e.target.value })}
                      placeholder={t("childProfile.hobbiesPlaceholder")} maxLength={500}
                      className={`min-h-[80px] resize-none rounded-xl ${isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-50 border-gray-200"}`} />
                  </CardContent>
                </Card>

                <div className="pt-1 pb-8">
                  <Button type="submit" disabled={updateMutation.isPending}
                    className="w-full min-h-[52px] text-base font-bold rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 shadow-lg shadow-purple-200 dark:shadow-none">
                    {updateMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                      <span className="flex items-center gap-2"><Save className="w-5 h-5" /> {t("childProfile.save")}</span>
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Image Cropper */}
      <ImageCropper
        open={cropperOpen}
        onClose={() => {
          setCropperOpen(false);
          revokeBlobUrl(cropperImage);
          setCropperImage("");
        }}
        imageSrc={cropperImage}
        onCropComplete={handleCroppedAvatar}
        onError={(message) =>
          toast({
            title: t("childProfile.uploadFailed"),
            description: message,
            variant: "destructive",
          })
        }
        mode="avatar"
      />

      <ChildBottomNav activeTab="profile" />
    </div>
  );
}
