import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

interface OrderData {
  id: string;
  parentId: string;
  childId: string;
  productId: string;
  quantity: number;
  pointsPrice: number;
  status: string;
  shippingAddress?: string;
  createdAt: string;
}

export function OrdersTab({ token }: { token: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const res = await fetch("/api/admin/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) return [];
      return (json?.data || []) as OrderData[];
    },
    enabled: !!token,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(t("admin.ordersTab.errors.updateFailed"));
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
  });

  const filteredOrders = orders?.filter(
    (order) => filterStatus === "all" || order.status === filterStatus
  ) || [];

  if (isLoading) return <div className="p-4">{t("admin.ordersTab.loading")}</div>;

  const statuses = ["pending", "completed", "cancelled"];
  const statusColors: { [key: string]: string } = {
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    cancelled: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  };

  const translateStatus = (status: string) => {
    const normalized = String(status || "").toLowerCase();
    const key = `admin.ordersTab.statuses.${normalized}`;
    const translated = t(key);
    return translated === key ? status : translated;
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3 mb-4">
        <h2 className="text-2xl font-bold">{t("admin.ordersTab.title")}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full lg:w-auto">
          <button
            onClick={() => setFilterStatus("all")}
            className={`px-3 py-2 rounded-lg text-sm ${
              filterStatus === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
            }`}
          >
            {t("admin.ordersTab.filters.all")} ({orders?.length || 0})
          </button>
          {statuses.map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-2 rounded-lg text-sm ${
                filterStatus === status
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
              }`}
            >
              {translateStatus(status)} ({orders?.filter((o) => o.status === status).length || 0})
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-700 border-b dark:border-gray-600">
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-100">{t("admin.ordersTab.columns.orderId")}</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-100">{t("admin.ordersTab.columns.points")}</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-100">{t("admin.ordersTab.columns.status")}</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-100">{t("admin.ordersTab.columns.date")}</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-100">{t("admin.ordersTab.columns.action")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders?.map((order) => (
              <tr key={order.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-6 py-4 text-sm font-mono text-gray-900 dark:text-gray-100">
                  {order.id.substring(0, 8)}...
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 font-semibold">
                  {order.pointsPrice}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[order.status] || statusColors.pending}`}>
                    {translateStatus(order.status)}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                  {new Date(order.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm">
                  <select
                    value={order.status}
                    onChange={(e) =>
                      updateStatusMutation.mutate({ id: order.id, status: e.target.value })
                    }
                    disabled={updateStatusMutation.isPending}
                    className="px-3 py-1 border rounded-lg text-sm focus:outline-none focus:border-blue-600 disabled:opacity-50"
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {translateStatus(status)}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredOrders?.length === 0 && (
          <div className="p-6 text-center text-gray-500 dark:text-gray-300">
            {t("admin.ordersTab.empty")}
          </div>
        )}
      </div>
    </div>
  );
}
