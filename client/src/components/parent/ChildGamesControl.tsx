import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { getDateLocale } from "@/i18n/config";
import { 
  Gamepad2, X, Check, Star, BarChart3, Clock, 
  ToggleLeft, ToggleRight, Shield, Trophy, Loader2, ChevronDown, ChevronUp 
} from "lucide-react";

interface GameWithStatus {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  category: string;
  pointsPerPlay: number;
  maxPlaysPerDay: number;
  isAssigned: boolean;
  assignmentActive: boolean;
  todayPlays: number;
  todayPoints: number;
  totalPlays: number;
  totalPoints: number;
}

interface GameStats {
  today: { gamesPlayed: number; pointsEarned: number };
  allTime: { gamesPlayed: number; pointsEarned: number };
  assignedGames: number;
  gamesPlayedInTree: number;
  recentPlays: Array<{
    id: string;
    gameId: string;
    pointsEarned: number;
    playedAt: string;
    gameTitle: string;
    gameThumbnail: string | null;
  }>;
}

interface Props {
  childId: string;
  childName: string;
  token: string;
  onClose: () => void;
}

export function ChildGamesControl({ childId, childName, token, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const isRTL = i18n.language === "ar";
  const [activeTab, setActiveTab] = useState<"control" | "stats">("control");
  const [selectedGames, setSelectedGames] = useState<Set<string>>(new Set());
  const [initialized, setInitialized] = useState(false);
  const [expandedGame, setExpandedGame] = useState<string | null>(null);
  const [dailyLimits, setDailyLimits] = useState<Record<string, number>>({});

  // Fetch games with assignment status
  const { data: games, isLoading: loadingGames } = useQuery<GameWithStatus[]>({
    queryKey: ["parent-child-games", childId],
    queryFn: async () => {
      const res = await fetch(`/api/parent/children/${childId}/games`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return json?.data || [];
    },
    enabled: !!token && !!childId,
  });

  // Fetch game stats
  const { data: stats, isLoading: loadingStats } = useQuery<GameStats>({
    queryKey: ["parent-child-game-stats", childId],
    queryFn: async () => {
      const res = await fetch(`/api/parent/children/${childId}/game-stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return json?.data;
    },
    enabled: !!token && !!childId && activeTab === "stats",
  });

  // Initialize selections from server data
  if (games && !initialized) {
    const assigned = new Set(games.filter(g => g.isAssigned).map(g => g.id));
    setSelectedGames(assigned);
    const limits: Record<string, number> = {};
    games.forEach(g => {
      if (g.isAssigned) limits[g.id] = g.maxPlaysPerDay;
    });
    setDailyLimits(limits);
    setInitialized(true);
  }

  // Save assignments
  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/parent/children/${childId}/games`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ gameIds: Array.from(selectedGames) }),
      });
      if (!res.ok) throw new Error("Failed");

      // Update daily limits for each assigned game  
      for (const gameId of selectedGames) {
        const limit = dailyLimits[gameId];
        if (limit !== undefined && limit > 0) {
          await fetch(`/api/parent/children/${childId}/games/${gameId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ maxPlaysPerDay: limit }),
          });
        }
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parent-child-games", childId] });
      queryClient.invalidateQueries({ queryKey: ["parent-child-game-stats", childId] });
      onClose();
    },
  });

  const toggleGame = (gameId: string) => {
    setSelectedGames(prev => {
      const next = new Set(prev);
      if (next.has(gameId)) next.delete(gameId);
      else next.add(gameId);
      return next;
    });
  };

  const hasChanges = () => {
    if (!games) return false;
    const current = new Set(games.filter(g => g.isAssigned).map(g => g.id));
    if (current.size !== selectedGames.size) return true;
    for (const id of selectedGames) if (!current.has(id)) return true;
    return false;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir={isRTL ? "rtl" : "ltr"}>
      <div className={`${isDark ? "bg-gray-900" : "bg-white"} rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-5 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${isDark ? "bg-purple-900" : "bg-purple-100"} rounded-xl flex items-center justify-center`}>
              <Gamepad2 className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h2 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                {t("childGamesControl.title")}
              </h2>
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>{childName}</p>
            </div>
          </div>
          <button onClick={onClose} className={`p-2 rounded-full ${isDark ? "hover:bg-gray-800" : "hover:bg-gray-100"} transition`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className={`flex border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
          <button
            onClick={() => setActiveTab("control")}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition ${
              activeTab === "control"
                ? `border-b-2 border-purple-500 ${isDark ? "text-purple-400" : "text-purple-600"}`
                : `${isDark ? "text-gray-400 hover:text-gray-300" : "text-gray-500 hover:text-gray-700"}`
            }`}
          >
            <Shield className="w-4 h-4" />
            {t("childGamesControl.control")}
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition ${
              activeTab === "stats"
                ? `border-b-2 border-purple-500 ${isDark ? "text-purple-400" : "text-purple-600"}`
                : `${isDark ? "text-gray-400 hover:text-gray-300" : "text-gray-500 hover:text-gray-700"}`
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            {t("childGamesControl.statistics")}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "control" && (
            <div className="p-4">
              {/* Info banner */}
              <div className={`mb-4 p-3 rounded-xl text-sm ${isDark ? "bg-blue-900/30 text-blue-300" : "bg-blue-50 text-blue-700"}`}>
                {isRTL
                  ? "حدد الألعاب المسموح بها لطفلك. إذا لم تحدد أي لعبة، سيرى الطفل جميع الألعاب."
                  : "Select allowed games for your child. If none selected, all games will be visible."}
              </div>

              {loadingGames ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                </div>
              ) : (
                <div className="space-y-2">
                  {games?.map((game) => {
                    const isSelected = selectedGames.has(game.id);
                    const isExpanded = expandedGame === game.id;
                    return (
                      <div key={game.id} className={`rounded-xl border overflow-hidden transition ${
                        isSelected
                          ? isDark ? "border-purple-600 bg-purple-900/20" : "border-purple-400 bg-purple-50"
                          : isDark ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"
                      }`}>
                        <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => toggleGame(game.id)}>
                          {/* Checkbox */}
                          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition ${
                            isSelected ? "bg-purple-500 border-purple-500" : isDark ? "border-gray-600" : "border-gray-300"
                          }`}>
                            {isSelected && <Check className="w-4 h-4 text-white" />}
                          </div>

                          {/* Thumbnail */}
                          {game.thumbnailUrl ? (
                            <img src={game.thumbnailUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                          ) : (
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isDark ? "bg-gray-700" : "bg-purple-100"}`}>
                              <Gamepad2 className="w-5 h-5 text-purple-400" />
                            </div>
                          )}

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className={`font-medium text-sm ${isDark ? "text-white" : "text-gray-900"}`}>{game.title}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-xs px-1.5 py-0.5 rounded ${isDark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"}`}>
                                {game.category}
                              </span>
                              <span className="text-xs text-yellow-500 flex items-center gap-0.5">
                                <Star className="w-3 h-3" />+{game.pointsPerPlay}
                              </span>
                              {game.todayPlays > 0 && (
                                <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                  {isRTL ? `لعب اليوم: ${game.todayPlays}` : `Today: ${game.todayPlays}`}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Expand button */}
                          {isSelected && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setExpandedGame(isExpanded ? null : game.id); }}
                              className={`p-1.5 rounded-lg ${isDark ? "hover:bg-gray-700" : "hover:bg-gray-100"} transition`}
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          )}
                        </div>

                        {/* Expanded: daily limit control */}
                        {isSelected && isExpanded && (
                          <div className={`px-4 pb-3 pt-1 border-t ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                            <div className="flex items-center justify-between">
                              <label className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                {t("childGamesControl.maxPlaysPerDay")}
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  max="99"
                                  value={dailyLimits[game.id] || 0}
                                  onChange={(e) => setDailyLimits(prev => ({ ...prev, [game.id]: parseInt(e.target.value) || 0 }))}
                                  className={`w-16 text-center border rounded-lg px-2 py-1 text-sm ${
                                    isDark ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"
                                  }`}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <span className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                                  {t("childGamesControl.unlimitedNote")}
                                </span>
                              </div>
                            </div>
                            {game.totalPlays > 0 && (
                              <div className={`mt-2 flex gap-4 text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                                <span>{isRTL ? `إجمالي اللعب: ${game.totalPlays}` : `Total plays: ${game.totalPlays}`}</span>
                                <span>{isRTL ? `إجمالي النقاط: ${game.totalPoints}` : `Total points: ${game.totalPoints}`}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {(!games || games.length === 0) && (
                    <div className={`text-center py-8 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                      <Gamepad2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>{t("childGamesControl.noGamesAvailable")}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "stats" && (
            <div className="p-4">
              {loadingStats ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                </div>
              ) : stats ? (
                <div className="space-y-4">
                  {/* Summary cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`p-4 rounded-xl ${isDark ? "bg-gray-800" : "bg-blue-50"}`}>
                      <Gamepad2 className="w-6 h-6 text-blue-500 mb-2" />
                      <p className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{stats.today.gamesPlayed}</p>
                      <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                        {t("childGamesControl.gamesToday")}
                      </p>
                    </div>
                    <div className={`p-4 rounded-xl ${isDark ? "bg-gray-800" : "bg-yellow-50"}`}>
                      <Star className="w-6 h-6 text-yellow-500 mb-2" />
                      <p className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{stats.today.pointsEarned}</p>
                      <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                        {t("childGamesControl.pointsToday")}
                      </p>
                    </div>
                    <div className={`p-4 rounded-xl ${isDark ? "bg-gray-800" : "bg-green-50"}`}>
                      <Trophy className="w-6 h-6 text-green-500 mb-2" />
                      <p className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{stats.allTime.gamesPlayed}</p>
                      <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                        {t("childGamesControl.totalGames")}
                      </p>
                    </div>
                    <div className={`p-4 rounded-xl ${isDark ? "bg-gray-800" : "bg-purple-50"}`}>
                      <Star className="w-6 h-6 text-purple-500 mb-2" />
                      <p className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{stats.allTime.pointsEarned}</p>
                      <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                        {t("childGamesControl.totalPoints")}
                      </p>
                    </div>
                  </div>

                  {/* Recent plays */}
                  {stats.recentPlays.length > 0 && (
                    <div>
                      <h3 className={`text-sm font-bold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                        {t("childGamesControl.recentPlays")}
                      </h3>
                      <div className="space-y-2">
                        {stats.recentPlays.map((play) => (
                          <div key={play.id} className={`flex items-center gap-3 p-2.5 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                            {play.gameThumbnail ? (
                              <img src={play.gameThumbnail} alt="" className="w-8 h-8 rounded-lg object-cover" />
                            ) : (
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? "bg-gray-700" : "bg-purple-100"}`}>
                                <Gamepad2 className="w-4 h-4 text-purple-400" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate ${isDark ? "text-white" : "text-gray-900"}`}>{play.gameTitle}</p>
                              <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                                {new Date(play.playedAt).toLocaleString(getDateLocale(), {
                                  month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                                })}
                              </p>
                            </div>
                            <span className="text-xs font-bold text-yellow-500">+{play.pointsEarned}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {stats.recentPlays.length === 0 && (
                    <div className={`text-center py-8 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                      <Gamepad2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>{t("childGamesControl.noGamesPlayedYet")}</p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Footer — only show on control tab */}
        {activeTab === "control" && (
          <div className={`flex items-center justify-between p-4 border-t ${isDark ? "border-gray-700 bg-gray-800/50" : "border-gray-200 bg-gray-50"}`}>
            <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
              {selectedGames.size} {t("childGamesControl.gamesSelected")}
            </p>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className={`px-4 py-2 border rounded-lg text-sm transition ${
                  isDark ? "border-gray-600 hover:bg-gray-700 text-gray-300" : "hover:bg-gray-100"
                }`}
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="flex items-center gap-2 bg-purple-600 text-white px-5 py-2 rounded-lg hover:bg-purple-700 transition text-sm disabled:opacity-50"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {t("common.save")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
