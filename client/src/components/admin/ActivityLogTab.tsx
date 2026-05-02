import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ActivityLogEntry {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  entity: string;
  entityId: string | null;
  meta: Record<string, any> | null;
  createdAt: string;
}

interface ActivityResponse {
  success: boolean;
  data: ActivityLogEntry[];
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalItems: number;
  };
}

interface StatsResponse {
  success: boolean;
  data: {
    byAction: { action: string; count: number }[];
    byEntity: { entity: string; count: number }[];
    topAdmins: { adminId: string; adminEmail: string; count: number }[];
    period: string;
  };
}

export function ActivityLogTab({ token }: { token: string }) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [filterAction, setFilterAction] = useState("");
  const [filterEntity, setFilterEntity] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  const { data: activityData, isLoading: activityLoading } = useQuery<ActivityResponse>({
    queryKey: ["activity-log", page, limit, filterAction, filterEntity, days],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        days: days.toString(),
      });
      if (filterAction) params.append("action", filterAction);
      if (filterEntity) params.append("entity", filterEntity);

      const res = await fetch(`/api/admin/activity?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
  });

  const { data: statsData } = useQuery<StatsResponse>({
    queryKey: ["activity-stats", days],
    queryFn: async () => {
      const res = await fetch(`/api/admin/activity/stats?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
  });

  const logs = activityData?.data || [];
  const pagination = activityData?.pagination || { page: 1, limit: 20, totalPages: 0, totalItems: 0 };
  const stats = statsData?.data;

  const actionColors: Record<string, string> = {
    create: "bg-green-100 text-green-800",
    update: "bg-blue-100 text-blue-800",
    delete: "bg-red-100 text-red-800",
    read: "bg-gray-100 text-gray-800",
  };

  const entityColors: Record<string, string> = {
    product: "bg-purple-100 text-purple-800",
    order: "bg-indigo-100 text-indigo-800",
    deposit: "bg-pink-100 text-pink-800",
    user: "bg-yellow-100 text-yellow-800",
    wallet: "bg-teal-100 text-teal-800",
  };

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-300">Total Actions</div>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {stats.byAction.reduce((sum, s) => sum + s.count, 0)}
            </div>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-300">Unique Actions</div>
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {stats.byAction.length}
            </div>
          </div>

          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-300">Active Admins</div>
            <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
              {stats.topAdmins.length}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div>
          <label className="text-sm font-medium">Days</label>
          <select
            value={days}
            onChange={(e) => {
              setDays(parseInt(e.target.value));
              setPage(1);
            }}
            className="mt-1 px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Action</label>
          <select
            value={filterAction}
            onChange={(e) => {
              setFilterAction(e.target.value);
              setPage(1);
            }}
            className="mt-1 px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
          >
            <option value="">All Actions</option>
            {stats?.byAction.map((item) => (
              <option key={item.action} value={item.action}>
                {item.action} ({item.count})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Entity</label>
          <select
            value={filterEntity}
            onChange={(e) => {
              setFilterEntity(e.target.value);
              setPage(1);
            }}
            className="mt-1 px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
          >
            <option value="">All Entities</option>
            {stats?.byEntity.map((item) => (
              <option key={item.entity} value={item.entity}>
                {item.entity} ({item.count})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Activity Log Table */}
      <div className="overflow-x-auto border rounded-lg dark:border-gray-700">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Admin</th>
              <th className="px-4 py-3 text-left font-semibold">Action</th>
              <th className="px-4 py-3 text-left font-semibold">Entity</th>
              <th className="px-4 py-3 text-left font-semibold">Date</th>
              <th className="px-4 py-3 text-left font-semibold">Details</th>
            </tr>
          </thead>
          <tbody>
            {activityLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-3 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-3 text-center text-gray-500">
                  No activity found
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <React.Fragment key={log.id}>
                  <tr className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium">{log.adminEmail}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${actionColors[log.action] || actionColors.read}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${entityColors[log.entity] || entityColors.user}`}>
                        {log.entity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                      >
                        {expandedId === log.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </td>
                  </tr>
                  {expandedId === log.id && log.meta && (
                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-b dark:border-gray-700">
                      <td colSpan={5} className="px-4 py-3">
                        <div className="bg-white dark:bg-gray-900 p-3 rounded border dark:border-gray-700">
                          <p className="text-xs font-mono whitespace-pre-wrap break-words">
                            {JSON.stringify(log.meta, null, 2)}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing {(page - 1) * limit + 1} to {Math.min(page * limit, pagination.totalItems)} of{" "}
          {pagination.totalItems} entries
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-2 border rounded disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700"
          >
            Previous
          </button>
          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const pageNum = Math.max(1, page - 2) + i;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`px-3 py-2 rounded ${
                    pageNum === page
                      ? "bg-blue-500 text-white"
                      : "border dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
            disabled={page === pagination.totalPages}
            className="px-3 py-2 border rounded disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
