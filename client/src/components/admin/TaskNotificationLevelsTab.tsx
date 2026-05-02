import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import i18next from "i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, ShieldAlert, Smartphone, Globe, Save, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChildItem {
  id: string;
  name: string;
}

interface Channels {
  inApp: boolean;
  webPush: boolean;
  mobilePush: boolean;
  parentEscalation: boolean;
}

interface GlobalPolicy {
  id: string;
  levelDefault: number;
  repeatIntervalMinutes: number;
  maxRetries: number;
  escalationEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  channelsJson: Channels;
  updatedAt: string;
}

interface ChildPolicyResponse {
  childId: string;
  childName: string;
  isOverride: boolean;
  policy: {
    level: number;
    repeatIntervalMinutes: number;
    maxRetries: number;
    escalationEnabled: boolean;
    quietHoursStart: string | null;
    quietHoursEnd: string | null;
    channelsJson: Channels;
  };
}

interface StatsResponse {
  totalChildren: number;
  withOverrides: number;
  usingGlobalDefault: number;
  globalLevel: number;
  byLevel: { level1: number; level2: number; level3: number; level4: number };
}

const LEVELS = [
  { value: 1, title: "L1", descAr: i18next.t("admin.taskNotificationLevels.inAppOnly"), descEn: "In-app only" },
  { value: 2, title: "L2", descAr: "داخل التطبيق + تذكير", descEn: "In-app + reminders" },
  { value: 3, title: "L3", descAr: "تصعيد أعلى + إعادة محاولات", descEn: "High urgency + retries" },
  { value: 4, title: "L4", descAr: "أقوى مستوى (Push خارج التطبيق)", descEn: "Strongest (Push outside app)" },
];

function defaultChannels(): Channels {
  return { inApp: true, webPush: false, mobilePush: false, parentEscalation: false };
}

export function TaskNotificationLevelsTab({ token }: { token: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedChildId, setSelectedChildId] = useState<string>("");

  const [globalForm, setGlobalForm] = useState<GlobalPolicy | null>(null);
  const [childForm, setChildForm] = useState<ChildPolicyResponse | null>(null);

  const commonHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const { data: globalData, isLoading: loadingGlobal } = useQuery<GlobalPolicy>({
    queryKey: ["task-notify-global"],
    queryFn: async () => {
      const res = await fetch("/api/admin/task-notification-policy/global", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to fetch global policy");
      return json.data;
    },
    enabled: !!token,
  });

  const { data: statsData } = useQuery<StatsResponse>({
    queryKey: ["task-notify-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/task-notification-policy-stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to fetch stats");
      return json.data;
    },
    enabled: !!token,
  });

  const { data: children = [], isLoading: loadingChildren } = useQuery<ChildItem[]>({
    queryKey: ["task-notify-children"],
    queryFn: async () => {
      const res = await fetch("/api/admin/children", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) return [];
      return (json?.data || []).map((child: any) => ({ id: child.id, name: child.name }));
    },
    enabled: !!token,
  });

  const { data: childPolicy, isLoading: loadingChildPolicy } = useQuery<ChildPolicyResponse>({
    queryKey: ["task-notify-child", selectedChildId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/task-notification-policy/${selectedChildId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to fetch child policy");
      return json.data;
    },
    enabled: !!selectedChildId && !!token,
  });

  React.useEffect(() => {
    if (globalData) setGlobalForm(globalData);
  }, [globalData]);

  React.useEffect(() => {
    if (childPolicy) setChildForm(childPolicy);
  }, [childPolicy]);

  const saveGlobalMutation = useMutation({
    mutationFn: async () => {
      if (!globalForm) return null;
      const payload = {
        level: globalForm.levelDefault,
        repeatIntervalMinutes: Number(globalForm.repeatIntervalMinutes),
        maxRetries: Number(globalForm.maxRetries),
        escalationEnabled: !!globalForm.escalationEnabled,
        quietHoursStart: globalForm.quietHoursStart || null,
        quietHoursEnd: globalForm.quietHoursEnd || null,
        channelsJson: globalForm.channelsJson || defaultChannels(),
      };
      const res = await fetch("/api/admin/task-notification-policy/global", {
        method: "PUT",
        headers: commonHeaders,
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to save global policy");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-notify-global"] });
      queryClient.invalidateQueries({ queryKey: ["task-notify-stats"] });
      toast({
        title: "✅ تم الحفظ بنجاح",
        description: "تم حفظ السياسة العامة لإشعارات المهام",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "❌ فشل الحفظ",
        description: error.message || "حدث خطأ أثناء حفظ السياسة العامة",
        variant: "destructive",
      });
    },
  });

  const saveChildMutation = useMutation({
    mutationFn: async () => {
      if (!childForm || !selectedChildId) return null;
      const payload = {
        level: Number(childForm.policy.level),
        repeatIntervalMinutes: Number(childForm.policy.repeatIntervalMinutes),
        maxRetries: Number(childForm.policy.maxRetries),
        escalationEnabled: !!childForm.policy.escalationEnabled,
        quietHoursStart: childForm.policy.quietHoursStart || null,
        quietHoursEnd: childForm.policy.quietHoursEnd || null,
        channelsJson: childForm.policy.channelsJson || defaultChannels(),
      };
      const res = await fetch(`/api/admin/task-notification-policy/${selectedChildId}`, {
        method: "PUT",
        headers: commonHeaders,
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to save child policy");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-notify-child", selectedChildId] });
      queryClient.invalidateQueries({ queryKey: ["task-notify-stats"] });
      toast({
        title: "✅ تم الحفظ بنجاح",
        description: `تم حفظ إعدادات الإشعارات للطفل: ${childForm?.childName || ""}`
      });
    },
    onError: (error: Error) => {
      toast({
        title: "❌ فشل الحفظ",
        description: error.message || "حدث خطأ أثناء حفظ إعدادات الطفل",
        variant: "destructive",
      });
    },
  });

  const filteredChildren = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return children;
    return children.filter((c) => c.name.toLowerCase().includes(q));
  }, [children, search]);

  if (loadingGlobal || loadingChildren) {
    return <div className="p-6">Loading task notification levels...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BellRing className="h-6 w-6 text-indigo-500" />
        <div>
          <h2 className="text-2xl font-bold">Task Notification Levels (L1-L4)</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">تحكم منفصل لإشعارات المهام - المستوى الرابع مخصص للإشعار خارج التطبيق</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-3 rounded-lg border bg-white dark:bg-gray-800">
          <p className="text-xs text-gray-500">Children</p>
          <p className="text-xl font-bold">{statsData?.totalChildren ?? 0}</p>
        </div>
        <div className="p-3 rounded-lg border bg-white dark:bg-gray-800">
          <p className="text-xs text-gray-500">Overrides</p>
          <p className="text-xl font-bold">{statsData?.withOverrides ?? 0}</p>
        </div>
        <div className="p-3 rounded-lg border bg-white dark:bg-gray-800">
          <p className="text-xs text-gray-500">L1</p>
          <p className="text-xl font-bold">{statsData?.byLevel?.level1 ?? 0}</p>
        </div>
        <div className="p-3 rounded-lg border bg-white dark:bg-gray-800">
          <p className="text-xs text-gray-500">L2/L3</p>
          <p className="text-xl font-bold">{(statsData?.byLevel?.level2 ?? 0) + (statsData?.byLevel?.level3 ?? 0)}</p>
        </div>
        <div className="p-3 rounded-lg border bg-white dark:bg-gray-800">
          <p className="text-xs text-gray-500">L4</p>
          <p className="text-xl font-bold text-red-500">{statsData?.byLevel?.level4 ?? 0}</p>
        </div>
      </div>

      <div className="p-4 rounded-xl border bg-white dark:bg-gray-800 space-y-4">
        <h3 className="font-bold text-lg">Global Default Policy</h3>
        {globalForm && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {LEVELS.map((level) => (
                <button
                  key={level.value}
                  onClick={() => setGlobalForm((p) => (p ? { ...p, levelDefault: level.value } : p))}
                  className={`p-3 rounded-lg border text-left ${globalForm.levelDefault === level.value ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" : "border-gray-300 dark:border-gray-600"}`}
                >
                  <p className="font-bold">{level.title}</p>
                  <p className="text-xs text-gray-500">{level.descAr}</p>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="text-sm">
                <span>Repeat (minutes)</span>
                <input
                  type="number"
                  min={1}
                  max={1440}
                  value={globalForm.repeatIntervalMinutes}
                  onChange={(e) => setGlobalForm((p) => (p ? { ...p, repeatIntervalMinutes: parseInt(e.target.value || "5", 10) } : p))}
                  className="w-full mt-1 px-3 py-2 border rounded-lg dark:bg-gray-700"
                />
              </label>
              <label className="text-sm">
                <span>Max Retries</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={globalForm.maxRetries}
                  onChange={(e) => setGlobalForm((p) => (p ? { ...p, maxRetries: parseInt(e.target.value || "0", 10) } : p))}
                  className="w-full mt-1 px-3 py-2 border rounded-lg dark:bg-gray-700"
                />
              </label>
              <label className="text-sm flex items-end gap-2">
                <input
                  type="checkbox"
                  checked={globalForm.escalationEnabled}
                  onChange={(e) => setGlobalForm((p) => (p ? { ...p, escalationEnabled: e.target.checked } : p))}
                />
                <span>Escalation Enabled</span>
              </label>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {[
                { key: "inApp", icon: BellRing, label: "In-App" },
                { key: "webPush", icon: Globe, label: "Web Push" },
                { key: "mobilePush", icon: Smartphone, label: "Mobile Push" },
                { key: "parentEscalation", icon: ShieldAlert, label: "Parent Escalation" },
              ].map((item) => {
                const Icon = item.icon;
                const checked = (globalForm.channelsJson as any)?.[item.key] ?? false;
                return (
                  <label key={item.key} className="flex items-center gap-2 border rounded-lg px-3 py-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setGlobalForm((p) =>
                          p
                            ? {
                                ...p,
                                channelsJson: {
                                  ...(p.channelsJson || defaultChannels()),
                                  [item.key]: e.target.checked,
                                },
                              }
                            : p
                        )
                      }
                    />
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </label>
                );
              })}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => saveGlobalMutation.mutate()}
                disabled={saveGlobalMutation.isPending}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors ${
                  saveGlobalMutation.isSuccess ? "bg-green-600 hover:bg-green-700" :
                  saveGlobalMutation.isError ? "bg-red-600 hover:bg-red-700" :
                  "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {saveGlobalMutation.isPending ? (
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : saveGlobalMutation.isSuccess ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : saveGlobalMutation.isError ? (
                  <XCircle className="h-4 w-4" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saveGlobalMutation.isPending ? "جاري الحفظ..." : saveGlobalMutation.isSuccess ? "تم الحفظ" : saveGlobalMutation.isError ? "فشل الحفظ" : "Save Global"}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="p-4 rounded-xl border bg-white dark:bg-gray-800 space-y-4">
        <h3 className="font-bold text-lg">Per Child Override</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Search child..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 border rounded-lg dark:bg-gray-700"
          />
          <select
            value={selectedChildId}
            onChange={(e) => setSelectedChildId(e.target.value)}
            className="px-3 py-2 border rounded-lg dark:bg-gray-700"
          >
            <option value="">Select child</option>
            {filteredChildren.map((child) => (
              <option key={child.id} value={child.id}>{child.name}</option>
            ))}
          </select>
        </div>

        {!selectedChildId ? null : loadingChildPolicy ? (
          <p className="text-sm text-gray-500">Loading child policy...</p>
        ) : childForm ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {LEVELS.map((level) => (
                <button
                  key={level.value}
                  onClick={() =>
                    setChildForm((p) =>
                      p
                        ? {
                            ...p,
                            policy: { ...p.policy, level: level.value },
                          }
                        : p
                    )
                  }
                  className={`p-3 rounded-lg border text-left ${childForm.policy.level === level.value ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" : "border-gray-300 dark:border-gray-600"}`}
                >
                  <p className="font-bold">{level.title}</p>
                  <p className="text-xs text-gray-500">{level.descEn}</p>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="text-sm">
                <span>Repeat (minutes)</span>
                <input
                  type="number"
                  min={1}
                  max={1440}
                  value={childForm.policy.repeatIntervalMinutes}
                  onChange={(e) =>
                    setChildForm((p) =>
                      p
                        ? { ...p, policy: { ...p.policy, repeatIntervalMinutes: parseInt(e.target.value || "5", 10) } }
                        : p
                    )
                  }
                  className="w-full mt-1 px-3 py-2 border rounded-lg dark:bg-gray-700"
                />
              </label>
              <label className="text-sm">
                <span>Max Retries</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={childForm.policy.maxRetries}
                  onChange={(e) =>
                    setChildForm((p) =>
                      p
                        ? { ...p, policy: { ...p.policy, maxRetries: parseInt(e.target.value || "0", 10) } }
                        : p
                    )
                  }
                  className="w-full mt-1 px-3 py-2 border rounded-lg dark:bg-gray-700"
                />
              </label>
              <label className="text-sm flex items-end gap-2">
                <input
                  type="checkbox"
                  checked={childForm.policy.escalationEnabled}
                  onChange={(e) =>
                    setChildForm((p) =>
                      p ? { ...p, policy: { ...p.policy, escalationEnabled: e.target.checked } } : p
                    )
                  }
                />
                <span>Escalation Enabled</span>
              </label>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {[
                { key: "inApp", icon: BellRing, label: "In-App" },
                { key: "webPush", icon: Globe, label: "Web Push" },
                { key: "mobilePush", icon: Smartphone, label: "Mobile Push" },
                { key: "parentEscalation", icon: ShieldAlert, label: "Parent Escalation" },
              ].map((item) => {
                const Icon = item.icon;
                const checked = (childForm.policy.channelsJson as any)?.[item.key] ?? false;
                return (
                  <label key={item.key} className="flex items-center gap-2 border rounded-lg px-3 py-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setChildForm((p) =>
                          p
                            ? {
                                ...p,
                                policy: {
                                  ...p.policy,
                                  channelsJson: {
                                    ...(p.policy.channelsJson || defaultChannels()),
                                    [item.key]: e.target.checked,
                                  },
                                },
                              }
                            : p
                        )
                      }
                    />
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </label>
                );
              })}
            </div>

            <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-3 text-sm">
              <strong>Important:</strong> Level 4 depends on system permissions (web/mobile push). It can notify when browser/app is closed only if push is configured and allowed by device.
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => saveChildMutation.mutate()}
                disabled={saveChildMutation.isPending}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors ${
                  saveChildMutation.isSuccess ? "bg-green-600 hover:bg-green-700" :
                  saveChildMutation.isError ? "bg-red-600 hover:bg-red-700" :
                  "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {saveChildMutation.isPending ? (
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : saveChildMutation.isSuccess ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : saveChildMutation.isError ? (
                  <XCircle className="h-4 w-4" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saveChildMutation.isPending ? "جاري الحفظ..." : saveChildMutation.isSuccess ? "تم الحفظ" : saveChildMutation.isError ? "فشل الحفظ" : "Save Child Override"}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default TaskNotificationLevelsTab;
