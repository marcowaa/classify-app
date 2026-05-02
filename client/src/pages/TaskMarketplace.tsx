import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/hooks/use-toast";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ParentNotificationBell } from "@/components/NotificationBell";
import {
  Search, BookOpen, Star, Heart, ShoppingCart, ArrowRight,
  Filter, TrendingUp, Clock, DollarSign, ChevronLeft,
  Loader2, ShoppingBag, Sparkles, Users
} from "lucide-react";

interface TaskItem {
  id: string;
  title: string;
  question: string;
  subjectLabel: string | null;
  price: string;
  pointsReward: number;
  purchaseCount: number;
  likesCount: number;
  teacherId: string;
  imageUrl: string | null;
  coverImageUrl: string | null;
  createdAt: string;
  teacherName: string;
  teacherAvatar: string | null;
  isPurchased: boolean;
  isLiked: boolean;
  inCart: boolean;
}

const SORT_OPTIONS = [
  { value: "popular", labelKey: "taskMarketplace.sortPopular", icon: TrendingUp },
  { value: "newest", labelKey: "taskMarketplace.sortNewest", icon: Clock },
  { value: "likes", labelKey: "taskMarketplace.sortLikes", icon: Heart },
  { value: "price_low", labelKey: "taskMarketplace.sortPriceLow", icon: DollarSign },
  { value: "price_high", labelKey: "taskMarketplace.sortPriceHigh", icon: DollarSign },
];

export default function TaskMarketplace() {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const token = localStorage.getItem("token");

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("popular");
  const [subjectFilter, setSubjectFilter] = useState("");

  // Fetch tasks
  const { data, isLoading } = useQuery({
    queryKey: ["browse-tasks", searchQuery, sortBy, subjectFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ sort: sortBy, limit: "30" });
      if (searchQuery.trim().length >= 2) params.set("q", searchQuery.trim());
      if (subjectFilter) params.set("subject", subjectFilter);
      const res = await fetch(`/api/parent/browse-tasks?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      return json.data;
    },
    enabled: !!token,
  });

  // Cart count
  const { data: cartData } = useQuery({
    queryKey: ["cart-count"],
    queryFn: async () => {
      const res = await fetch("/api/parent/cart/count", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return { count: 0 };
      const json = await res.json();
      return json.data;
    },
    enabled: !!token,
  });

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await fetch(`/api/parent/tasks/${taskId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["browse-tasks"] });
    },
    onError: () => toast({ title: t('taskMarketplace.errorOccurred'), variant: "destructive" }),
  });

  // Add to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: async (teacherTaskId: string) => {
      const res = await fetch("/api/parent/cart/add", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ teacherTaskId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart-count"] });
      queryClient.invalidateQueries({ queryKey: ["browse-tasks"] });
      toast({ title: t('taskMarketplace.addedToCart') });
    },
    onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
  });

  const tasks: TaskItem[] = data?.tasks || [];

  // Extract unique subjects
  const subjects = [...new Set(tasks.map(t => t.subjectLabel).filter(Boolean))] as string[];

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-950" : "bg-gray-50"}`} dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className={`sticky top-0 z-40 ${isDark ? "bg-gray-900/95 border-gray-800" : "bg-white/95 border-gray-200"} border-b backdrop-blur-sm`}>
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button onClick={() => window.history.length > 1 ? window.history.back() : navigate("/parent-dashboard")} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <ArrowRight className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-lg font-bold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  {t('taskMarketplace.title')}
                </h1>
                <p className="text-xs text-muted-foreground">{t('taskMarketplace.subtitle')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSelector />
              <button
                onClick={() => navigate("/task-cart")}
                className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <ShoppingCart className="h-5 w-5" />
                {(cartData?.count || 0) > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                    {cartData.count}
                  </span>
                )}
              </button>
              <ParentNotificationBell />
            </div>
          </div>

          {/* Search */}
          <div className="mt-3 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('taskMarketplace.searchPlaceholder')}
              className="pr-10 rounded-xl"
            />
          </div>

          {/* Sort & Filter */}
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setSortBy(opt.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  sortBy === opt.value
                    ? "bg-purple-600 text-white"
                    : isDark ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <opt.icon className="h-3.5 w-3.5" />
                {t(opt.labelKey)}
              </button>
            ))}
          </div>

          {/* Subject pills */}
          {subjects.length > 0 && (
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <button
                onClick={() => setSubjectFilter("")}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                  !subjectFilter
                    ? "bg-blue-600 text-white"
                    : isDark ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-600"
                }`}
              >
                {t('taskMarketplace.all')}
              </button>
              {subjects.map(s => (
                <button
                  key={s}
                  onClick={() => setSubjectFilter(s === subjectFilter ? "" : s)}
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                    subjectFilter === s
                      ? "bg-blue-600 text-white"
                      : isDark ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <p className="text-lg font-semibold text-muted-foreground">{t('taskMarketplace.noTasks')}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('taskMarketplace.tryDifferentCriteria')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onLike={() => likeMutation.mutate(task.id)}
                onAddToCart={() => addToCartMutation.mutate(task.id)}
                onTeacherClick={() => navigate(`/teacher/${task.teacherId}`)}
                isDark={isDark}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function TaskCard({
  task,
  onLike,
  onAddToCart,
  onTeacherClick,
  isDark,
}: {
  task: TaskItem;
  onLike: () => void;
  onAddToCart: () => void;
  onTeacherClick: () => void;
  isDark: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all group">
      {/* Cover image */}
      {task.coverImageUrl && (
        <div className="relative h-36 overflow-hidden">
          <img
            src={task.coverImageUrl}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          {task.isPurchased && (
            <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold">
              {t('taskMarketplace.purchased')}
            </div>
          )}
        </div>
      )}
      <CardContent className="p-4">
        {/* Teacher info */}
        <button onClick={onTeacherClick} className="flex items-center gap-2 mb-2 hover:opacity-80 transition-opacity">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
            {task.teacherAvatar ? (
              <img src={task.teacherAvatar} alt="" className="w-full h-full object-cover" />
            ) : (
              task.teacherName.charAt(0)
            )}
          </div>
          <span className="text-xs text-muted-foreground font-medium">{task.teacherName}</span>
        </button>

        {/* Task info */}
        <h3 className="font-bold text-sm line-clamp-2 mb-1">{task.title || task.question}</h3>
        {task.title && task.question !== task.title && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{task.question}</p>
        )}

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {task.subjectLabel && (
            <Badge variant="outline" className="text-[10px] py-0">{task.subjectLabel}</Badge>
          )}
          {task.pointsReward > 0 && (
            <Badge variant="secondary" className="text-[10px] py-0 gap-0.5">
              <Star className="h-2.5 w-2.5" /> {task.pointsReward}
            </Badge>
          )}
          {task.purchaseCount > 0 && (
            <Badge variant="outline" className="text-[10px] py-0 gap-0.5 text-green-600">
              <Users className="h-2.5 w-2.5" /> {task.purchaseCount}
            </Badge>
          )}
        </div>

        {/* Price + Actions */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t">
          <div className="flex items-center gap-3">
            {/* Like button */}
            <button
              onClick={(e) => { e.stopPropagation(); onLike(); }}
              className={`flex items-center gap-1 text-xs transition-colors ${
                task.isLiked ? "text-red-500" : "text-muted-foreground hover:text-red-500"
              }`}
            >
              <Heart className={`h-4 w-4 ${task.isLiked ? "fill-red-500" : ""}`} />
              <span>{task.likesCount}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Price */}
            <span className="text-sm font-bold text-green-600">{task.price} {t('taskMarketplace.currency')}</span>

            {/* Cart / Purchased button */}
            {task.isPurchased ? (
              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                {t('taskMarketplace.purchasedBadge')}
              </Badge>
            ) : task.inCart ? (
              <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                {t('taskMarketplace.inCart')}
              </Badge>
            ) : (
              <Button
                size="sm"
                variant="default"
                className="h-7 text-xs px-3 bg-purple-600 hover:bg-purple-700 gap-1"
                onClick={(e) => { e.stopPropagation(); onAddToCart(); }}
              >
                <ShoppingCart className="h-3 w-3" />
                {t('taskMarketplace.addBtn')}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
