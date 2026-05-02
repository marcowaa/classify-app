import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import i18next from "i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

interface Gift {
  id: string;
  parentId: string;
  childId: string;
  productName: string;
  productImage: string | null;
  pointsCost: number;
  status: "pending" | "delivered" | "acknowledged";
  parentName: string;
  childName: string;
  createdAt: string;
  deliveredAt: string | null;
  acknowledgedAt: string | null;
}

export const GiftsTab: React.FC<{ token: string }> = ({ token }) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    parentId: "",
    childId: "",
    status: "",
  });
  const [expandedGiftId, setExpandedGiftId] = useState<string | null>(null);

  // Fetch gifts
  const { data: giftsData, isLoading } = useQuery({
    queryKey: ["gifts", page, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(filters.parentId && { parentId: filters.parentId }),
        ...(filters.childId && { childId: filters.childId }),
        ...(filters.status && { status: filters.status }),
      });

      const res = await fetch(`/api/admin/gifts?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch gifts");
      return res.json();
    },
  });

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ["giftsStats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/gifts/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  // Update gift status mutation
  const updateGiftMutation = useMutation({
    mutationFn: async (updates: { giftId: string; status: string }) => {
      const res = await fetch(`/api/admin/gifts/${updates.giftId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: updates.status }),
      });
      if (!res.ok) throw new Error("Failed to update gift");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gifts"] });
      queryClient.invalidateQueries({ queryKey: ["giftsStats"] });
    },
  });

  // Delete gift mutation
  const deleteGiftMutation = useMutation({
    mutationFn: async (giftId: string) => {
      const res = await fetch(`/api/admin/gifts/${giftId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete gift");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gifts"] });
      queryClient.invalidateQueries({ queryKey: ["giftsStats"] });
    },
  });

  const gifts = giftsData?.data?.items || [];
  const stats = statsData?.data || {};
  const pagination = giftsData?.data?.pagination || {};

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
          <p className="text-sm text-blue-600 dark:text-blue-400 font-semibold">{i18next.t("admin.gifts.totalGifts")}</p>
          <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{stats.total || 0}</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-700">
          <p className="text-sm text-yellow-600 dark:text-yellow-400 font-semibold">{i18next.t("admin.gifts.pendingGifts")}</p>
          <p className="text-3xl font-bold text-yellow-900 dark:text-yellow-100">{stats.pending || 0}</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 p-4 rounded-lg border border-emerald-200 dark:border-emerald-700">
          <p className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold">{i18next.t("admin.gifts.deliveredGifts")}</p>
          <p className="text-3xl font-bold text-emerald-900 dark:text-emerald-100">
            {stats.delivered || 0}
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
          <p className="text-sm text-purple-600 dark:text-purple-400 font-semibold">الإجمالي بالنقاط</p>
          <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">{stats.totalValue || 0}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
        <h3 className="font-semibold text-gray-900 dark:text-white">{i18next.t("admin.gifts.filter")}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="معرف الأب"
            value={filters.parentId}
            onChange={(e) => {
              setFilters((prev) => ({ ...prev, parentId: e.target.value }));
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          />

          <input
            type="text"
            placeholder="معرف الطفل"
            value={filters.childId}
            onChange={(e) => {
              setFilters((prev) => ({ ...prev, childId: e.target.value }));
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          />

          <select
            value={filters.status}
            onChange={(e) => {
              setFilters((prev) => ({ ...prev, status: e.target.value }));
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          >
            <option value="">كل الحالات</option>
            <option value="pending">{i18next.t("admin.gifts.pendingGifts")}</option>
            <option value="delivered">{i18next.t("admin.gifts.deliveredGifts")}</option>
            <option value="acknowledged">مؤكدة</option>
          </select>
        </div>
      </div>

      {/* Gifts List */}
      {isLoading ? (
        <div className="text-center py-8">جاري التحميل...</div>
      ) : gifts.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          لا توجد هدايا تطابق المعايير
        </div>
      ) : (
        <div className="space-y-3">
          {gifts.map((gift: Gift) => (
            <div
              key={gift.id}
              className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🎁</span>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {gift.productName}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        من {gift.parentName} إلى {gift.childName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-semibold ${
                        gift.status === "pending"
                          ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400"
                          : gift.status === "delivered"
                          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400"
                          : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400"
                      }`}
                    >
                      {gift.status === "pending"
                        ? "معلقة"
                        : gift.status === "delivered"
                        ? "مسلمة"
                        : "مؤكدة"}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {gift.pointsCost} نقطة
                    </span>
                  </div>
                </div>

                {gift.productImage && (
                  <img
                    src={gift.productImage}
                    alt={gift.productName}
                    className="w-20 h-20 object-cover rounded-lg ml-4"
                  />
                )}

                <button
                  onClick={() =>
                    setExpandedGiftId(expandedGiftId === gift.id ? null : gift.id)
                  }
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-2"
                >
                  {expandedGiftId === gift.id ? "▼" : "▶"}
                </button>
              </div>

              {/* Expanded Details */}
              {expandedGiftId === gift.id && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">معرف الهدية</p>
                      <p className="font-mono text-xs break-all">{gift.id}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">تاريخ الإنشاء</p>
                      <p className="text-xs">
                        {new Date(gift.createdAt).toLocaleString("ar-SA")}
                      </p>
                    </div>
                  </div>

                  {gift.deliveredAt && (
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">تاريخ التسليم</p>
                      <p className="text-xs">
                        {new Date(gift.deliveredAt).toLocaleString("ar-SA")}
                      </p>
                    </div>
                  )}

                  {gift.acknowledgedAt && (
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">تاريخ الاعتراف</p>
                      <p className="text-xs">
                        {new Date(gift.acknowledgedAt).toLocaleString("ar-SA")}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 mt-3">
                    {gift.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() =>
                            updateGiftMutation.mutate({
                              giftId: gift.id,
                              status: "delivered",
                            })
                          }
                          disabled={updateGiftMutation.isPending}
                          className="bg-blue-500 hover:bg-blue-600"
                        >
                          تحديث إلى مسلمة
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteGiftMutation.mutate(gift.id)}
                          disabled={deleteGiftMutation.isPending}
                        >
                          حذف
                        </Button>
                      </>
                    )}

                    {gift.status === "delivered" && (
                      <Button
                        size="sm"
                        onClick={() =>
                          updateGiftMutation.mutate({
                            giftId: gift.id,
                            status: "acknowledged",
                          })
                        }
                        disabled={updateGiftMutation.isPending}
                        className="bg-emerald-500 hover:bg-emerald-600"
                      >
                        تحديث إلى مؤكدة
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            السابق
          </Button>

          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
            <Button
              key={p}
              variant={p === page ? "default" : "outline"}
              onClick={() => setPage(p)}
              size="sm"
            >
              {p}
            </Button>
          ))}

          <Button
            variant="outline"
            onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
            disabled={page === pagination.totalPages}
          >
            التالي
          </Button>
        </div>
      )}
    </div>
  );
};

export default GiftsTab;
