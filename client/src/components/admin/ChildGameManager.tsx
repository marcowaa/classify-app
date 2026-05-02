import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Gamepad2, X, Check, Loader2, Star } from "lucide-react";

interface Game {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  category: string;
  pointsPerPlay: number;
  isActive: boolean;
}

interface Assignment {
  id: string;
  gameId: string;
  gameTitle: string;
  gameThumbnail: string | null;
  gameCategory: string;
  gamePointsPerPlay: number;
  maxPlaysPerDay: number;
  isActive: boolean;
}

interface ChildGameManagerProps {
  childId: string;
  childName: string;
  token: string;
  onClose: () => void;
}

export function ChildGameManager({ childId, childName, token, onClose }: ChildGameManagerProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedGameIds, setSelectedGameIds] = useState<Set<string>>(new Set());

  // Fetch all games
  const { data: allGames, isLoading: loadingGames } = useQuery<Game[]>({
    queryKey: ["admin-games"],
    queryFn: async () => {
      const res = await fetch("/api/admin/games", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return (json?.data || []).filter((g: Game) => g.isActive);
    },
    enabled: !!token,
  });

  // Fetch child's current assignments
  const { data: assignments, isLoading: loadingAssignments } = useQuery<Assignment[]>({
    queryKey: ["child-game-assignments", childId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/children/${childId}/games`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return json?.data || [];
    },
    enabled: !!token && !!childId,
  });

  // Initialize selected from current assignments
  useEffect(() => {
    if (assignments) {
      setSelectedGameIds(new Set(assignments.map(a => a.gameId)));
    }
  }, [assignments]);

  // Bulk replace mutation
  const saveMutation = useMutation({
    mutationFn: async (gameIds: string[]) => {
      const res = await fetch(`/api/admin/children/${childId}/games`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ gameIds }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["child-game-assignments", childId] });
      queryClient.invalidateQueries({ queryKey: ["admin-children"] });
      onClose();
    },
  });

  const toggleGame = (gameId: string) => {
    setSelectedGameIds(prev => {
      const next = new Set(prev);
      if (next.has(gameId)) {
        next.delete(gameId);
      } else {
        next.add(gameId);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (allGames) {
      setSelectedGameIds(new Set(allGames.map(g => g.id)));
    }
  };

  const deselectAll = () => {
    setSelectedGameIds(new Set());
  };

  const handleSave = () => {
    saveMutation.mutate(Array.from(selectedGameIds));
  };

  const isLoading = loadingGames || loadingAssignments;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b bg-gradient-to-l from-purple-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Gamepad2 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{t("admin.childGameManager.title")}</h2>
              <p className="text-sm text-gray-500">{childName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50">
          <div className="text-sm text-gray-600">
            {selectedGameIds.size} من {allGames?.length || 0} لعبة محددة
          </div>
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
            >
              تحديد الكل
            </button>
            <button
              onClick={deselectAll}
              className="text-xs px-3 py-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              إلغاء الكل
            </button>
          </div>
        </div>

        {/* Games List */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {allGames?.map((game) => {
                const isSelected = selectedGameIds.has(game.id);
                return (
                  <div
                    key={game.id}
                    onClick={() => toggleGame(game.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? "border-purple-500 bg-purple-50 shadow-sm"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {/* Checkbox */}
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition ${
                      isSelected ? "bg-purple-500 border-purple-500" : "border-gray-300"
                    }`}>
                      {isSelected && <Check className="w-4 h-4 text-white" />}
                    </div>

                    {/* Thumbnail */}
                    {game.thumbnailUrl ? (
                      <img src={game.thumbnailUrl} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <Gamepad2 className="w-6 h-6 text-purple-400" />
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate">{game.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full">
                          {game.category}
                        </span>
                        <span className="text-xs text-yellow-600 flex items-center gap-1">
                          <Star className="w-3 h-3" />+{game.pointsPerPlay}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!isLoading && (!allGames || allGames.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              <Gamepad2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>لا توجد ألعاب متاحة. قم بإضافة ألعاب من تاب "الألعاب" أولاً.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <p className="text-xs text-gray-400">
            إذا لم يتم تعيين أي لعبة، سيرى الطفل جميع الألعاب المفعّلة
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-100 transition text-sm"
            >
              إلغاء
            </button>
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="flex items-center gap-2 bg-purple-600 text-white px-5 py-2 rounded-lg hover:bg-purple-700 transition text-sm disabled:opacity-50"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              حفظ التعيينات
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
