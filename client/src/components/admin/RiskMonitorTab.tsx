import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface RiskAlertItem {
  id: string;
  parentId: string | null;
  childId: string | null;
  targetType: string;
  targetId: string;
  riskType: string;
  severity: "low" | "medium" | "high";
  riskScore: number;
  title: string;
  summary: string;
  details: string;
  evidence?: Record<string, any> | null;
  status: "open" | "reviewed" | "resolved";
  detectionCount: number;
  firstDetectedAt: string;
  lastDetectedAt: string;
  parentName?: string | null;
  parentEmail?: string | null;
  childName?: string | null;
}

interface RiskAlertsResponse {
  items: RiskAlertItem[];
  summary: {
    total: number;
    open: number;
    reviewed: number;
    resolved: number;
    highSeverity: number;
    mediumSeverity: number;
  };
}

const severityBadge: Record<string, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
};

const statusBadge: Record<string, string> = {
  open: "bg-red-100 text-red-700",
  reviewed: "bg-blue-100 text-blue-700",
  resolved: "bg-emerald-100 text-emerald-700",
};

export function RiskMonitorTab({ token }: { token: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "reviewed" | "resolved">("all");
  const [selectedAlert, setSelectedAlert] = useState<RiskAlertItem | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");

  const { data, isLoading } = useQuery<RiskAlertsResponse>({
    queryKey: ["admin-risk-alerts", statusFilter],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/risk-alerts?status=${statusFilter}&limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return json?.data || { items: [], summary: { total: 0, open: 0, reviewed: 0, resolved: 0, highSeverity: 0, mediumSeverity: 0 } };
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: "open" | "reviewed" | "resolved"; notes?: string }) => {
      const res = await fetch(`/api/admin/analytics/risk-alerts/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status, resolutionNotes: notes || null }),
      });
      if (!res.ok) throw new Error("Failed to update risk alert");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-risk-alerts"] });
      setResolutionNotes("");
    },
  });

  const items = data?.items || [];
  const summary = data?.summary;

  const sortedItems = useMemo(() => {
    const severityRank: Record<RiskAlertItem["severity"], number> = {
      high: 3,
      medium: 2,
      low: 1,
    };

    return [...items].sort((a, b) => {
      const severityDelta = severityRank[b.severity] - severityRank[a.severity];
      if (severityDelta !== 0) return severityDelta;

      const scoreDelta = Number(b.riskScore || 0) - Number(a.riskScore || 0);
      if (scoreDelta !== 0) return scoreDelta;

      return new Date(b.lastDetectedAt).getTime() - new Date(a.lastDetectedAt).getTime();
    });
  }, [items]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="rounded-lg border p-3 bg-white dark:bg-gray-800 dark:border-gray-700">
          <p className="text-xs text-gray-500">{t("admin.riskMonitor.filters.all")}</p>
          <p className="text-xl font-bold text-slate-700 dark:text-slate-100">{summary?.total || 0}</p>
        </div>
        <div className="rounded-lg border p-3 bg-white dark:bg-gray-800 dark:border-gray-700">
          <p className="text-xs text-gray-500">{t("admin.riskMonitor.open")}</p>
          <p className="text-xl font-bold text-red-600">{summary?.open || 0}</p>
        </div>
        <div className="rounded-lg border p-3 bg-white dark:bg-gray-800 dark:border-gray-700">
          <p className="text-xs text-gray-500">{t("admin.riskMonitor.reviewed")}</p>
          <p className="text-xl font-bold text-blue-600">{summary?.reviewed || 0}</p>
        </div>
        <div className="rounded-lg border p-3 bg-white dark:bg-gray-800 dark:border-gray-700">
          <p className="text-xs text-gray-500">{t("admin.riskMonitor.resolved")}</p>
          <p className="text-xl font-bold text-emerald-600">{summary?.resolved || 0}</p>
        </div>
        <div className="rounded-lg border p-3 bg-white dark:bg-gray-800 dark:border-gray-700">
          <p className="text-xs text-gray-500">{t("admin.riskMonitor.highSeverity")}</p>
          <p className="text-xl font-bold text-red-700">{summary?.highSeverity || 0}</p>
        </div>
        <div className="rounded-lg border p-3 bg-white dark:bg-gray-800 dark:border-gray-700">
          <p className="text-xs text-gray-500">{t("admin.riskMonitor.mediumSeverity")}</p>
          <p className="text-xl font-bold text-amber-700">{summary?.mediumSeverity || 0}</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(["all", "open", "reviewed", "resolved"] as const).map((status) => (
          <button
            key={status}
            className={`px-3 py-1.5 rounded-lg text-sm border ${statusFilter === status ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-gray-800 dark:border-gray-700"}`}
            onClick={() => setStatusFilter(status)}
          >
            {t(`admin.riskMonitor.filters.${status}`)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-8">{t("admin.riskMonitor.loading")}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-10 rounded-xl border bg-white dark:bg-gray-800 dark:border-gray-700">
          {t("admin.riskMonitor.noAlerts")}
        </div>
      ) : (
        <div className="space-y-4">
          {sortedItems.map((alert) => (
            <div key={alert.id} className="rounded-xl border p-4 bg-white dark:bg-gray-800 dark:border-gray-700">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-base">{alert.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{alert.summary}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {t("admin.riskMonitor.suspectedUser")}:{" "}
                    <span className="font-medium">{alert.parentName || alert.childName || alert.targetId}</span>
                    {alert.parentEmail ? ` (${alert.parentEmail})` : ""}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{t("admin.riskMonitor.how")} {alert.details}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {t("admin.riskMonitor.lastDetected")}: {new Date(alert.lastDetectedAt).toLocaleString()} | {t("admin.riskMonitor.repeated")}: {alert.detectionCount}
                  </p>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${severityBadge[alert.severity] || severityBadge.medium}`}>
                    {t(`admin.riskMonitor.severity.${alert.severity}`)}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${statusBadge[alert.status] || statusBadge.open}`}>
                    {t(`admin.riskMonitor.status.${alert.status}`)}
                  </span>
                  <span className="text-xs text-gray-500">{t("admin.riskMonitor.riskScore")}: {alert.riskScore}</span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm"
                  onClick={() => updateMutation.mutate({ id: alert.id, status: "reviewed" })}
                  disabled={updateMutation.isPending}
                >
                  {t("admin.riskMonitor.markReviewed")}
                </button>
                <button
                  className="px-3 py-1.5 rounded bg-emerald-600 text-white text-sm"
                  onClick={() => setSelectedAlert(alert)}
                >
                  {t("admin.riskMonitor.resolve")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedAlert && (
        <div className="rounded-xl border p-4 bg-white dark:bg-gray-800 dark:border-gray-700">
          <h4 className="font-semibold mb-2">{t("admin.riskMonitor.resolveTitle")}</h4>
          <textarea
            className="w-full min-h-[96px] rounded border p-2 text-sm bg-transparent"
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            placeholder={t("admin.riskMonitor.resolvePlaceholder")}
          />
          <div className="mt-2 flex gap-2">
            <button
              className="px-3 py-1.5 rounded bg-emerald-600 text-white text-sm"
              onClick={() => {
                updateMutation.mutate({ id: selectedAlert.id, status: "resolved", notes: resolutionNotes });
                setSelectedAlert(null);
              }}
              disabled={updateMutation.isPending}
            >
              {t("admin.riskMonitor.confirmResolve")}
            </button>
            <button className="px-3 py-1.5 rounded border text-sm" onClick={() => setSelectedAlert(null)}>
              {t("admin.riskMonitor.cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
