import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ArrowRight, ArrowLeft, Search, Users, School, GraduationCap,
  UserPlus, UserMinus, Loader2, MapPin, Star, Sparkles, BookOpen,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/contexts/ThemeContext";
import { apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import { ChildBottomNav } from "@/components/ChildBottomNav";

type FilterType = "all" | "children" | "schools" | "teachers";

interface ChildResult {
  id: string; name: string; avatarUrl?: string; schoolName?: string;
  governorate?: string; totalPoints: number; bio?: string; isFollowing: boolean;
}

interface SchoolResult {
  id: string; name: string; nameAr?: string; imageUrl?: string;
  governorate?: string; totalStudents: number; totalTeachers: number;
  description?: string; isFollowing: boolean;
}

interface TeacherResult {
  id: string; name: string; avatarUrl?: string; subject?: string;
  bio?: string; schoolName?: string; schoolNameAr?: string; isFollowing: boolean;
}

export default function ChildDiscover() {
  const [, navigate] = useLocation();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const token = localStorage.getItem("childToken");
  const isRTL = i18n.language === "ar";

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(timer);
  }, [query]);

  // Search results
  const { data: searchData, isLoading: searchLoading } = useQuery({
    queryKey: ["child-search", debouncedQuery, activeFilter],
    queryFn: async () => {
      const res = await fetch(`/api/child/search?q=${encodeURIComponent(debouncedQuery)}&type=${activeFilter}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Search failed");
      return (await res.json()).data as {
        children?: ChildResult[];
        schools?: SchoolResult[];
        teachers?: TeacherResult[];
      };
    },
    enabled: !!token && debouncedQuery.length >= 2,
  });

  // Discover data (when no search)
  const { data: discoverData, isLoading: discoverLoading } = useQuery({
    queryKey: ["child-discover"],
    queryFn: async () => {
      const res = await fetch("/api/child/discover", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Discover failed");
      return (await res.json()).data as {
        children: ChildResult[];
        schools: SchoolResult[];
        teachers: TeacherResult[];
      };
    },
    enabled: !!token && debouncedQuery.length < 2,
  });

  // Follow/unfollow mutation
  const followMutation = useMutation({
    mutationFn: async ({ followingId, followingType, action }: { followingId: string; followingType: string; action: "follow" | "unfollow" }) => {
      if (action === "follow") {
        return apiRequest("POST", "/api/child/follow", { followingId, followingType });
      } else {
        return apiRequest("DELETE", "/api/child/follow", { followingId, followingType });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["child-search"] });
      queryClient.invalidateQueries({ queryKey: ["child-discover"] });
      queryClient.invalidateQueries({ queryKey: ["child-following"] });
      queryClient.invalidateQueries({ queryKey: ["child-follow-counts"] });
      queryClient.invalidateQueries({ queryKey: ["child-showcase"] });
    },
  });

  const handleFollow = (id: string, type: string, isFollowing: boolean) => {
    followMutation.mutate({
      followingId: id,
      followingType: type,
      action: isFollowing ? "unfollow" : "follow",
    });
    toast({
      title: isFollowing
        ? t("discover.unfollowed") + " ✅"
        : t("discover.followed") + " ✅",
    });
  };

  const isSearching = debouncedQuery.length >= 2;
  const data = isSearching ? searchData : discoverData;
  const loading = isSearching ? searchLoading : discoverLoading;

  const filters: { key: FilterType; icon: any; label: string }[] = [
    { key: "all", icon: TrendingUp, label: t("discover.filters.all") },
    { key: "children", icon: Users, label: t("discover.filters.children") },
    { key: "schools", icon: School, label: t("discover.filters.schools") },
    { key: "teachers", icon: GraduationCap, label: t("discover.filters.teachers") },
  ];

  const hasResults = (data?.children?.length || 0) + (data?.schools?.length || 0) + (data?.teachers?.length || 0) > 0;

  return (
    <div className={`relative min-h-screen pb-24 overflow-x-hidden ${isDark ? "bg-gray-900" : "bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50"}`} dir={isRTL ? "rtl" : "ltr"}>
      <div className={`pointer-events-none absolute -top-20 ${isRTL ? "-left-20" : "-right-20"} h-72 w-72 rounded-full blur-3xl ${isDark ? "bg-violet-700/20" : "bg-violet-200/45"}`} />
      <div className={`pointer-events-none absolute top-[24rem] ${isRTL ? "-right-20" : "-left-20"} h-80 w-80 rounded-full blur-3xl ${isDark ? "bg-fuchsia-700/20" : "bg-fuchsia-200/40"}`} />
      {/* Header */}
      <div className={`sticky top-0 z-50 px-4 pt-4 pb-3 ${isDark ? "bg-gray-900/95" : "bg-white/95"} backdrop-blur-sm border-b ${isDark ? "border-gray-800" : "border-violet-100"}`}>
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => window.history.length > 1 ? window.history.back() : navigate("/child-games")}
            className={`p-2 rounded-xl ${isDark ? "hover:bg-gray-800 text-gray-300" : "hover:bg-gray-100 text-gray-600"}`}>
            {isRTL ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
          </button>
          <h1 className={`text-lg font-bold flex-1 ${isDark ? "text-white" : "text-gray-800"}`}>
            {t("discover.title")}
          </h1>
        </div>

        {/* Search Bar */}
        <div className="relative mb-3">
          <Search className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? "text-gray-500" : "text-gray-400"}`} />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("discover.searchPlaceholder")}
            className={`${isRTL ? "pr-10 pl-4" : "pl-10 pr-4"} h-11 rounded-xl ${isDark ? "bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" : "bg-gray-50 border-gray-200 placeholder:text-gray-400"}`}
          />
        </div>

        {/* Filter Tabs */}
        <div className={`flex gap-1.5 overflow-x-auto p-1 rounded-2xl border ${isDark ? "bg-gray-800/70 border-gray-700" : "bg-white/90 border-violet-100"}`}>
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                activeFilter === f.key
                  ? "bg-purple-500 text-white shadow-md"
                  : isDark ? "bg-gray-800 text-gray-400 hover:bg-gray-700" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              <f.icon className="w-3.5 h-3.5" />
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-4 space-y-5 relative z-10">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        ) : !hasResults ? (
          <div className="text-center py-16">
            <Search className={`w-12 h-12 mx-auto mb-3 ${isDark ? "text-gray-600" : "text-gray-300"}`} />
            <p className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              {isSearching ? t("discover.noResults") : t("discover.startSearching")}
            </p>
            {isSearching && (
              <p className={`text-xs mt-1 ${isDark ? "text-gray-600" : "text-gray-400"}`}>
                {t("discover.tryDifferentSearch")}
              </p>
            )}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* Children Results */}
            {(activeFilter === "all" || activeFilter === "children") && data?.children && data.children.length > 0 && (
              <motion.div key="children" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-500" />
                  <h2 className={`font-bold text-sm ${isDark ? "text-white" : "text-gray-800"}`}>
                    {isSearching ? t("discover.childrenResults") : t("discover.popularChildren")}
                  </h2>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? "bg-purple-900/30 text-purple-400" : "bg-purple-100 text-purple-700"}`}>
                    {data.children.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {data.children.map((c, i) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Card className={`border-0 shadow-sm hover:shadow-md transition-all ${isDark ? "bg-gray-800/95" : "bg-white/95"} backdrop-blur`}>
                        <CardContent className="p-3 flex items-center gap-3">
                          <Avatar className="w-11 h-11">
                            <AvatarImage src={c.avatarUrl || undefined} />
                            <AvatarFallback className="bg-purple-100 text-purple-600 font-bold text-sm">
                              {c.name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold truncate ${isDark ? "text-white" : "text-gray-800"}`}>
                              {c.name}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] mt-0.5">
                              {c.totalPoints > 0 && (
                                <span className={isDark ? "text-yellow-400" : "text-yellow-600"}>
                                  <Star className="w-2.5 h-2.5 inline" /> {c.totalPoints}
                                </span>
                              )}
                              {c.schoolName && (
                                <span className={isDark ? "text-gray-500" : "text-gray-400"}>
                                  <School className="w-2.5 h-2.5 inline" /> {c.schoolName}
                                </span>
                              )}
                              {c.governorate && (
                                <span className={isDark ? "text-gray-500" : "text-gray-400"}>
                                  <MapPin className="w-2.5 h-2.5 inline" /> {c.governorate}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant={c.isFollowing ? "outline" : "default"}
                            className={`rounded-xl text-xs h-8 min-w-[80px] ${
                              c.isFollowing
                                ? isDark ? "border-gray-600 text-gray-300" : ""
                                : "bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white"
                            }`}
                            onClick={() => handleFollow(c.id, "child", c.isFollowing)}
                            disabled={followMutation.isPending}
                          >
                            {c.isFollowing ? (
                              <><UserMinus className="w-3 h-3 me-1" /> {t("discover.following")}</>
                            ) : (
                              <><UserPlus className="w-3 h-3 me-1" /> {t("discover.follow")}</>
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Schools Results */}
            {(activeFilter === "all" || activeFilter === "schools") && data?.schools && data.schools.length > 0 && (
              <motion.div key="schools" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <div className="flex items-center gap-2">
                  <School className="w-4 h-4 text-green-500" />
                  <h2 className={`font-bold text-sm ${isDark ? "text-white" : "text-gray-800"}`}>
                    {isSearching ? t("discover.schoolsResults") : t("discover.activeSchools")}
                  </h2>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? "bg-green-900/30 text-green-400" : "bg-green-100 text-green-700"}`}>
                    {data.schools.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {data.schools.map((s, i) => (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Card className={`border-0 shadow-sm hover:shadow-md transition-all ${isDark ? "bg-gray-800/95" : "bg-white/95"} backdrop-blur`}>
                        <CardContent className="p-3 flex items-center gap-3">
                          <Avatar className="w-11 h-11 rounded-xl">
                            <AvatarImage src={s.imageUrl || undefined} className="rounded-xl" />
                            <AvatarFallback className="bg-green-100 text-green-600 font-bold text-sm rounded-xl">
                              <School className="w-5 h-5" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold truncate ${isDark ? "text-white" : "text-gray-800"}`}>
                              {isRTL && s.nameAr ? s.nameAr : s.name}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] mt-0.5">
                              {s.totalStudents > 0 && (
                                <span className={isDark ? "text-blue-400" : "text-blue-600"}>
                                  <Users className="w-2.5 h-2.5 inline" /> {s.totalStudents} {t("discover.students")}
                                </span>
                              )}
                              {s.totalTeachers > 0 && (
                                <span className={isDark ? "text-green-400" : "text-green-600"}>
                                  <GraduationCap className="w-2.5 h-2.5 inline" /> {s.totalTeachers}
                                </span>
                              )}
                              {s.governorate && (
                                <span className={isDark ? "text-gray-500" : "text-gray-400"}>
                                  <MapPin className="w-2.5 h-2.5 inline" /> {s.governorate}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant={s.isFollowing ? "outline" : "default"}
                            className={`rounded-xl text-xs h-8 min-w-[80px] ${
                              s.isFollowing
                                ? isDark ? "border-gray-600 text-gray-300" : ""
                                : "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                            }`}
                            onClick={() => handleFollow(s.id, "school", s.isFollowing)}
                            disabled={followMutation.isPending}
                          >
                            {s.isFollowing ? (
                              <><UserMinus className="w-3 h-3 me-1" /> {t("discover.following")}</>
                            ) : (
                              <><UserPlus className="w-3 h-3 me-1" /> {t("discover.follow")}</>
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Teachers Results */}
            {(activeFilter === "all" || activeFilter === "teachers") && data?.teachers && data.teachers.length > 0 && (
              <motion.div key="teachers" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-blue-500" />
                  <h2 className={`font-bold text-sm ${isDark ? "text-white" : "text-gray-800"}`}>
                    {isSearching ? t("discover.teachersResults") : t("discover.activeTeachers")}
                  </h2>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? "bg-blue-900/30 text-blue-400" : "bg-blue-100 text-blue-700"}`}>
                    {data.teachers.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {data.teachers.map((teacher, i) => (
                    <motion.div
                      key={teacher.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Card className={`border-0 shadow-sm hover:shadow-md transition-all ${isDark ? "bg-gray-800/95" : "bg-white/95"} backdrop-blur`}>
                        <CardContent className="p-3 flex items-center gap-3">
                          <Avatar className="w-11 h-11">
                            <AvatarImage src={teacher.avatarUrl || undefined} />
                            <AvatarFallback className="bg-blue-100 text-blue-600 font-bold text-sm">
                              <GraduationCap className="w-5 h-5" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold truncate ${isDark ? "text-white" : "text-gray-800"}`}>
                              {teacher.name}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] mt-0.5">
                              {teacher.subject && (
                                <span className={isDark ? "text-blue-400" : "text-blue-600"}>
                                  <BookOpen className="w-2.5 h-2.5 inline" /> {teacher.subject}
                                </span>
                              )}
                              {teacher.schoolName && (
                                <span className={isDark ? "text-gray-500" : "text-gray-400"}>
                                  <School className="w-2.5 h-2.5 inline" /> {isRTL && teacher.schoolNameAr ? teacher.schoolNameAr : teacher.schoolName}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant={teacher.isFollowing ? "outline" : "default"}
                            className={`rounded-xl text-xs h-8 min-w-[80px] ${
                              teacher.isFollowing
                                ? isDark ? "border-gray-600 text-gray-300" : ""
                                : "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
                            }`}
                            onClick={() => handleFollow(teacher.id, "teacher", teacher.isFollowing)}
                            disabled={followMutation.isPending}
                          >
                            {teacher.isFollowing ? (
                              <><UserMinus className="w-3 h-3 me-1" /> {t("discover.following")}</>
                            ) : (
                              <><UserPlus className="w-3 h-3 me-1" /> {t("discover.follow")}</>
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>

      <ChildBottomNav activeTab="games" />
    </div>
  );
}
