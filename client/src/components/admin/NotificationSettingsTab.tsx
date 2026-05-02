import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import i18next from "i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

interface NotificationSetting {
  id: string;
  childId: string;
  childName: string;
  mode: "popup_strict" | "popup_soft" | "floating_bubble";
  repeatDelayMinutes: number;
  requireOverlayPermission: boolean;
  createdAt: string;
  updatedAt: string;
  hasCustomSettings?: boolean;
}

export const NotificationSettingsTab: React.FC<{ token: string }> = ({ token }) => {
  const queryClient = useQueryClient();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [editingSettings, setEditingSettings] = useState<Partial<NotificationSetting> | null>(null);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [modeFilter, setModeFilter] = useState<"all" | "popup_strict" | "popup_soft" | "floating_bubble">("all");

  useEffect(() => {
    setPage(1);
  }, [searchTerm, modeFilter]);

  // Fetch all settings
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ["notificationSettings", page, searchTerm, modeFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      });

      if (searchTerm.trim()) {
        params.set("search", searchTerm.trim());
      }

      if (modeFilter !== "all") {
        params.set("mode", modeFilter);
      }

      const res = await fetch(`/api/admin/notification-settings?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
  });

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ["notificationSettingsStats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/notification-settings-stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: {
      childId: string;
      mode?: string;
      repeatDelayMinutes?: number;
      requireOverlayPermission?: boolean;
    }) => {
      const { childId, ...data } = updates;
      const res = await fetch(`/api/admin/notification-settings/${childId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificationSettings"] });
      queryClient.invalidateQueries({ queryKey: ["notificationSettingsStats"] });
      setEditingSettings(null);
    },
  });

  const settings = settingsData?.data?.items || [];
  const stats = statsData?.data || {};
  const pagination = settingsData?.data?.pagination || {};

  const modeLabels: Record<string, string> = {
    popup_strict: i18next.t("admin.notificationSettings.strictPopup"),
    popup_soft: i18next.t("admin.notificationSettings.softAnnouncement"),
    floating_bubble: i18next.t("admin.notificationSettings.floatingCircle"),
  };

  const modeDescriptions: Record<string, string> = {
    popup_strict: "نافذة لا يمكن إغلاقها إلا بعد الاعتراف",
    popup_soft: "إعلان يمكن إغلاقه، يعود بعد الفاصل الزمني",
    floating_bubble: "دائرة عائمة قابلة للتحريك",
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
          <p className="text-sm text-blue-600 dark:text-blue-400 font-semibold">الإجمالي</p>
          <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{stats.total || 0}</p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-4 rounded-lg border border-red-200 dark:border-red-700">
          <p className="text-sm text-red-600 dark:text-red-400 font-semibold">نافذة صارمة</p>
          <p className="text-3xl font-bold text-red-900 dark:text-red-100">
            {stats.byMode?.popup_strict || 0}
          </p>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-700">
          <p className="text-sm text-yellow-600 dark:text-yellow-400 font-semibold">إعلان ناعم</p>
          <p className="text-3xl font-bold text-yellow-900 dark:text-yellow-100">
            {stats.byMode?.popup_soft || 0}
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
          <p className="text-sm text-purple-600 dark:text-purple-400 font-semibold">دائرة عائمة</p>
          <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
            {stats.byMode?.floating_bubble || 0}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              البحث باسم الطفل
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="اكتب اسم الطفل..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              فلتر الوضع
            </label>
            <select
              value={modeFilter}
              onChange={(e) =>
                setModeFilter(
                  e.target.value as "all" | "popup_strict" | "popup_soft" | "floating_bubble"
                )
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              <option value="all">كل الأوضاع</option>
              <option value="popup_strict">نافذة منبثقة صارمة</option>
              <option value="popup_soft">إعلان ناعم</option>
              <option value="floating_bubble">دائرة عائمة</option>
            </select>
          </div>
        </div>
      </div>

      {/* Settings List */}
      {isLoading ? (
        <div className="text-center py-8">جاري التحميل...</div>
      ) : settings.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          لم تتم تعيين أي إعدادات بعد
        </div>
      ) : (
        <div className="space-y-3">
          {settings.map((setting: NotificationSetting) => (
            <div
              key={setting.id}
              className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white mb-1">
                    {setting.childName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {setting.hasCustomSettings ? "إعدادات مخصصة" : "إعدادات افتراضية"}
                  </p>

                  <div className="space-y-2 mb-3">
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">نمط الإشعار</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {modeLabels[setting.mode]}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {modeDescriptions[setting.mode]}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          الفاصل الزمني للتكرار
                        </p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {setting.repeatDelayMinutes} دقائق
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          إذن Overlay
                        </p>
                        <p
                          className={`text-sm font-medium ${
                            setting.requireOverlayPermission
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-gray-600 dark:text-gray-400"
                          }`}
                        >
                          {setting.requireOverlayPermission ? "✓ مفعل" : "✗ معطل"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    آخر تحديث: {new Date(setting.updatedAt).toLocaleString("ar-SA")}
                  </p>
                </div>

                <button
                  onClick={() => {
                    if (selectedChildId === setting.childId) {
                      setSelectedChildId(null);
                      setEditingSettings(null);
                    } else {
                      setSelectedChildId(setting.childId);
                      setEditingSettings(setting);
                    }
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {selectedChildId === setting.childId ? "▼" : "▶"}
                </button>
              </div>

              {/* Expanded Edit Form */}
              {selectedChildId === setting.childId && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="space-y-3">
                    {/* Mode Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                        نمط الإشعار
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {Object.entries(modeLabels).map(([modeKey, modeLabel]) => (
                          <button
                            key={modeKey}
                            onClick={() =>
                              setEditingSettings((prev) =>
                                prev ? { ...prev, mode: modeKey as any } : null
                              )
                            }
                            className={`p-3 border-2 rounded-lg transition-all text-left ${
                              editingSettings?.mode === modeKey
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                : "border-gray-300 dark:border-gray-600 hover:border-blue-300"
                            }`}
                          >
                            <p className="font-medium text-sm">{modeLabel}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {modeDescriptions[modeKey]}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Repeat Delay */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                        الفاصل الزمني للتكرار (دقائق)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={editingSettings?.repeatDelayMinutes || 5}
                        onChange={(e) =>
                          setEditingSettings((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  repeatDelayMinutes: parseInt(e.target.value),
                                }
                              : null
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    {/* Overlay Permission */}
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`overlay-${setting.childId}`}
                        checked={editingSettings?.requireOverlayPermission || false}
                        onChange={(e) =>
                          setEditingSettings((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  requireOverlayPermission: e.target.checked,
                                }
                              : null
                          )
                        }
                        className="rounded dark:bg-gray-700"
                      />
                      <label
                        htmlFor={`overlay-${setting.childId}`}
                        className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
                      >
                        طلب إذن عرض الإشعارات على الشاشة
                      </label>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-3">
                      <Button
                        onClick={() => {
                          if (editingSettings) {
                            updateSettingsMutation.mutate({
                              childId: setting.childId,
                              mode: editingSettings.mode,
                              repeatDelayMinutes: editingSettings.repeatDelayMinutes,
                              requireOverlayPermission:
                                editingSettings.requireOverlayPermission,
                            });
                          }
                        }}
                        disabled={updateSettingsMutation.isPending}
                        className="bg-emerald-500 hover:bg-emerald-600"
                      >
                        حفظ التغييرات
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedChildId(null);
                          setEditingSettings(null);
                        }}
                      >
                        إلغاء
                      </Button>
                    </div>
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

      {/* Information Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 p-4 rounded-lg">
        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">ℹ️ معلومات</h4>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• <strong>نافذة منبثقة صارمة:</strong> للإشعارات الهامة جداً - لا يمكن إغلاقها</li>
          <li>• <strong>إعلان ناعم:</strong> للإشعارات العادية - يمكن الإغلاق مع العودة</li>
          <li>• <strong>دائرة عائمة:</strong> للإشعارات غير العاجلة - دائرة صغيرة قابلة للتحريك</li>
        </ul>
      </div>
    </div>
  );
};

export default NotificationSettingsTab;
