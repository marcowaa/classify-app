import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface AdminStats {
  parents: number;
  children: number;
  products: number;
  orders: number;
  deposits: number;
  totalPoints: number;
  totalWalletBalance: number;
  totalDepositsAmount: number;
  totalOrdersAmount: number;
  pendingRewardOffers?: number;
}

interface WeeklyData {
  date: string;
  parents?: number;
  children?: number;
  total?: number;
  completed?: number;
  deposits?: number;
  orders?: number;
}

export function AdminDashboardTab({ token }: { token: string }) {
  const { t } = useTranslation();
  const [chartPeriod, setChartPeriod] = useState<"registrations" | "orders" | "wallet">("registrations");

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) return null;
      return (json?.data || null) as AdminStats | null;
    },
    enabled: !!token,
  });

  const { data: weeklyRegs } = useQuery({
    queryKey: ["weekly-registrations"],
    queryFn: async () => {
      const res = await fetch("/api/admin/analytics/weekly-registrations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json() as Promise<{ data: WeeklyData[] }>;
    },
  });

  const { data: weeklyOrders } = useQuery({
    queryKey: ["weekly-orders"],
    queryFn: async () => {
      const res = await fetch("/api/admin/analytics/weekly-orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json() as Promise<{ data: WeeklyData[] }>;
    },
  });

  const { data: weeklyWallet } = useQuery({
    queryKey: ["weekly-wallet"],
    queryFn: async () => {
      const res = await fetch("/api/admin/analytics/weekly-wallet-movement", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json() as Promise<{ data: WeeklyData[] }>;
    },
  });

  const { data: runtimeHealth } = useQuery({
    queryKey: ["runtime-health-status"],
    queryFn: async () => {
      const res = await fetch("/api/health");
      return res.ok;
    },
    refetchInterval: 30000,
  });

  if (statsLoading) return <div className="p-4">{t("admin.dashboardTab.loading")}</div>;
  if (!stats) return <div className="p-4">{t("admin.dashboardTab.loadFailed")}</div>;

  const activeChartData =
    chartPeriod === "registrations"
      ? weeklyRegs?.data
      : chartPeriod === "orders"
      ? weeklyOrders?.data
      : weeklyWallet?.data;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t("admin.dashboardTab.title")}</h1>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t("admin.dashboardTab.parents")} value={stats.parents} color="bg-blue-100 dark:bg-blue-900/20" textColor="text-blue-600 dark:text-blue-400" />
        <StatCard label={t("admin.dashboardTab.children")} value={stats.children} color="bg-green-100 dark:bg-green-900/20" textColor="text-green-600 dark:text-green-400" />
        <StatCard label={t("admin.dashboardTab.products")} value={stats.products} color="bg-yellow-100 dark:bg-yellow-900/20" textColor="text-yellow-600 dark:text-yellow-400" />
        <StatCard label={t("admin.dashboardTab.totalOrders")} value={stats.orders} color="bg-purple-100 dark:bg-purple-900/20" textColor="text-purple-600 dark:text-purple-400" />
      </div>

      {/* Wallet & Financial Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t("admin.dashboardTab.walletBalance")}
          value={`$${stats.totalWalletBalance.toFixed(2)}`}
          color="bg-indigo-100 dark:bg-indigo-900/20"
          textColor="text-indigo-600 dark:text-indigo-400"
        />
        <StatCard
          label={t("admin.dashboardTab.totalDeposits")}
          value={`$${stats.totalDepositsAmount.toFixed(2)}`}
          color="bg-pink-100 dark:bg-pink-900/20"
          textColor="text-pink-600 dark:text-pink-400"
        />
        <StatCard
          label={t("admin.dashboardTab.totalPoints")}
          value={stats.totalPoints.toLocaleString()}
          color="bg-orange-100 dark:bg-orange-900/20"
          textColor="text-orange-600 dark:text-orange-400"
        />
        <StatCard
          label="Pending Reward Offers"
          value={Number(stats.pendingRewardOffers || 0)}
          color="bg-amber-100 dark:bg-amber-900/20"
          textColor="text-amber-600 dark:text-amber-400"
        />
      </div>

      {/* Charts Section */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4">
          <h2 className="text-xl font-bold">{t("admin.dashboardTab.weeklyAnalytics")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full sm:w-auto">
            <button
              onClick={() => setChartPeriod("registrations")}
              className={`px-3 py-1 rounded text-sm ${
                chartPeriod === "registrations"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300"
              }`}
            >
              {t("admin.dashboardTab.registrations")}
            </button>
            <button
              onClick={() => setChartPeriod("orders")}
              className={`px-3 py-1 rounded text-sm ${
                chartPeriod === "orders"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300"
              }`}
            >
              {t("admin.dashboardTab.ordersBtn")}
            </button>
            <button
              onClick={() => setChartPeriod("wallet")}
              className={`px-3 py-1 rounded text-sm ${
                chartPeriod === "wallet"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300"
              }`}
            >
              {t("admin.dashboardTab.walletBtn")}
            </button>
          </div>
        </div>

        {activeChartData && activeChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            {chartPeriod === "registrations" ? (
              <BarChart data={activeChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
                  labelStyle={{ color: "#f3f4f6" }}
                />
                <Legend />
                <Bar dataKey="parents" fill="#3b82f6" name={t("admin.dashboardTab.parents")} />
                <Bar dataKey="children" fill="#10b981" name={t("admin.dashboardTab.children")} />
              </BarChart>
            ) : chartPeriod === "orders" ? (
              <LineChart data={activeChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
                  labelStyle={{ color: "#f3f4f6" }}
                />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#ef4444" name={t("admin.dashboardTab.totalOrders")} strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="completed" stroke="#10b981" name={t("admin.dashboardTab.completed")} strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            ) : (
              <BarChart data={activeChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
                  labelStyle={{ color: "#f3f4f6" }}
                />
                <Legend />
                <Bar dataKey="deposits" fill="#10b981" name={t("admin.dashboardTab.depositsAmount")} />
                <Bar dataKey="orders" fill="#ef4444" name={t("admin.dashboardTab.ordersCount")} />
              </BarChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="h-300 flex items-center justify-center text-gray-500">
            {t("admin.dashboardTab.noData")}
          </div>
        )}
      </div>

      {/* Runtime & OTP operational panel */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border dark:border-gray-700">
        <h2 className="text-xl font-bold mb-4">{t("admin.dashboardTab.summary")}</h2>
        <div className="grid grid-cols-1 gap-4">
          <div className="rounded-lg border dark:border-gray-700 p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">{t("permissions.title")}</p>
            <p className="text-2xl font-bold mt-2">{runtimeHealth ? "✅" : "⚠️"}</p>
          </div>
        </div>
      </div>

      {/* Summary Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border dark:border-gray-700">
        <h2 className="text-xl font-bold mb-4">{t("admin.dashboardTab.summary")}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-600 dark:text-gray-400">{t("admin.dashboardTab.activeDeposits")}</p>
            <p className="text-2xl font-bold">{stats.deposits}</p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400">{t("admin.dashboardTab.avgOrderValue")}</p>
            <p className="text-2xl font-bold">
              {stats.orders > 0 ? `$${(stats.totalOrdersAmount / stats.orders).toFixed(2)}` : "$0"}
            </p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400">{t("admin.dashboardTab.depositsPerParent")}</p>
            <p className="text-2xl font-bold">
              {stats.parents > 0 ? (stats.deposits / stats.parents).toFixed(1) : "0"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  textColor,
}: {
  label: string;
  value: string | number;
  color: string;
  textColor: string;
}) {
  return (
    <div className={`${color} p-6 rounded-lg shadow border dark:border-gray-700`}>
      <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium">{label}</h3>
      <p className={`${textColor} text-3xl font-bold mt-2`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}
