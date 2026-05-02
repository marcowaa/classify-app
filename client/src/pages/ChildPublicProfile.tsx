import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useRoute } from "wouter";
import { Star, TreePine, School, MapPin, Heart, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { useTheme } from "@/contexts/ThemeContext";

interface PublicProfileData {
  name: string; avatarUrl?: string; coverImageUrl?: string; bio?: string;
  schoolName?: string; governorate?: string; hobbies?: string;
  totalPoints: number; treeStage: number; tasksCompleted: number; gamesPlayed: number;
}

export default function ChildPublicProfile() {
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();
  const isRTL = i18n.language === "ar";
  const [, params] = useRoute("/child-public-profile/:shareCode");
  const shareCode = params?.shareCode;

  const { data, isLoading, isError } = useQuery<PublicProfileData>({
    queryKey: ["child-public-profile", shareCode],
    queryFn: async () => {
      const res = await fetch(`/api/child/profile/${shareCode}`);
      if (!res.ok) throw new Error("Not found");
      return (await res.json()).data;
    },
    enabled: !!shareCode,
  });

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? "bg-gray-900" : "bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50"}`}>
        <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? "bg-gray-900" : "bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50"}`}>
        <p className={`text-lg ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t("childProfile.profileNotFound", "Profile not found")}</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-20 ${isDark ? "bg-gray-900" : "bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50"}`} dir={isRTL ? "rtl" : "ltr"}>
      {/* Cover */}
      <div className="relative">
        <div className="h-44 sm:h-56 overflow-hidden">
          {data.coverImageUrl ? (
            <img src={data.coverImageUrl} alt="cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600" />
          )}
          <div className="absolute inset-0 bg-black/20" />
        </div>
        <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 z-10">
          <Avatar className={`w-28 h-28 border-4 shadow-xl ${isDark ? "border-gray-900" : "border-white"}`}>
            <AvatarImage src={data.avatarUrl || undefined} className="object-cover" />
            <AvatarFallback className="bg-gradient-to-br from-purple-400 to-fuchsia-500 text-white text-3xl font-bold">
              {data.name?.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      <div className="pt-16 pb-4 text-center px-4">
        <h1 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-800"}`}>{data.name}</h1>
        {data.bio && (
          <p className={`text-sm mt-1 max-w-xs mx-auto ${isDark ? "text-gray-400" : "text-gray-500"}`}>{data.bio}</p>
        )}
        <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
          <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full text-xs font-bold">
            <Star className="w-3 h-3" /> {data.totalPoints}
          </span>
          <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-bold">
            <TreePine className="w-3 h-3" /> {t("childProfile.treeLevel", "Level")} {data.treeStage}
          </span>
        </div>
      </div>

      <main className="max-w-md mx-auto px-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Card className={`border-0 shadow ${isDark ? "bg-gray-800" : "bg-white"}`}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-800"}`}>{data.tasksCompleted}</p>
              <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>{t("childProfile.stats.tasks", "Tasks")}</p>
            </CardContent>
          </Card>
          <Card className={`border-0 shadow ${isDark ? "bg-gray-800" : "bg-white"}`}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-800"}`}>{data.gamesPlayed}</p>
              <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>{t("childProfile.stats.games", "Games")}</p>
            </CardContent>
          </Card>
        </div>

        {(data.schoolName || data.governorate || data.hobbies) && (
          <Card className={`border-0 shadow ${isDark ? "bg-gray-800" : "bg-white"}`}>
            <CardContent className="p-4 space-y-2">
              {data.schoolName && (
                <div className="flex items-center gap-2">
                  <School className="w-4 h-4 text-green-500" />
                  <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>{data.schoolName}</span>
                </div>
              )}
              {data.governorate && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-red-500" />
                  <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>{data.governorate}</span>
                </div>
              )}
              {data.hobbies && (
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-pink-500" />
                  <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>{data.hobbies}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <p className={`text-center text-xs pt-4 ${isDark ? "text-gray-600" : "text-gray-400"}`}>
          Classify - Kids Educational Platform
        </p>
      </main>
    </div>
  );
}
