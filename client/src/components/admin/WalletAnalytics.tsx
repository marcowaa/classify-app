import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface WalletAnalyticsData {
  totalDeposits: number;
  totalBalance: number;
  averageBalance: number;
  topParentsByBalance: Array<{
    parentId: string;
    parentEmail: string;
    parentName: string;
    balance: string;
    totalDeposited: string;
    totalSpent: string;
  }>;
}

interface WeeklyMovementData {
  date: string;
  deposits: number;
  orders: number;
}

interface AnalyticsResponse {
  success: boolean;
  data: WalletAnalyticsData | WeeklyMovementData[] | any;
  period?: string;
}

export function WalletAnalytics({ token }: { token: string }) {
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);

  const { data: walletAnalytics, isLoading: walletLoading } = useQuery<AnalyticsResponse>({
    queryKey: ["wallet-analytics"],
    queryFn: async () => {
      const res = await fetch("/api/admin/analytics/wallet", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
  });

  const { data: weeklyMovement, isLoading: movementLoading } = useQuery<AnalyticsResponse>({
    queryKey: ["weekly-wallet-movement"],
    queryFn: async () => {
      const res = await fetch("/api/admin/analytics/weekly-wallet-movement", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
  });

  const analytics = walletAnalytics?.data as WalletAnalyticsData | undefined;
  const movement = weeklyMovement?.data as WeeklyMovementData[] | undefined;

  if (walletLoading || movementLoading) {
    return <div className="text-center py-8">Loading wallet analytics...</div>;
  }

  const selectedParent = analytics?.topParentsByBalance.find((p) => p.parentId === selectedParentId);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border dark:border-green-800">
          <div className="text-sm text-gray-600 dark:text-gray-300">Total Deposits (Completed)</div>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
            ${parseFloat(analytics?.totalDeposits.toString() || "0").toFixed(2)}
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border dark:border-blue-800">
          <div className="text-sm text-gray-600 dark:text-gray-300">Total Wallet Balance</div>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            ${parseFloat(analytics?.totalBalance.toString() || "0").toFixed(2)}
          </div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border dark:border-purple-800">
          <div className="text-sm text-gray-600 dark:text-gray-300">Average Balance per Parent</div>
          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
            ${parseFloat(analytics?.averageBalance.toString() || "0").toFixed(2)}
          </div>
        </div>
      </div>

      {/* Weekly Wallet Movement Chart */}
      {movement && movement.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
          <h3 className="font-bold text-lg mb-4">Weekly Wallet Movement</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={movement}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
                labelStyle={{ color: "#f3f4f6" }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="deposits"
                stroke="#10b981"
                name="Deposits"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="orders"
                stroke="#ef4444"
                name="Orders (Count)"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Parents by Balance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Parents List */}
        <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
          <h3 className="font-bold text-lg mb-4">Top 5 Parents by Balance</h3>
          <div className="space-y-2">
            {analytics?.topParentsByBalance.map((parent) => (
              <button
                key={parent.parentId}
                onClick={() => setSelectedParentId(selectedParentId === parent.parentId ? null : parent.parentId)}
                className={`w-full text-left p-3 rounded border transition-colors ${
                  selectedParentId === parent.parentId
                    ? "bg-blue-100 dark:bg-blue-900 border-blue-500 dark:border-blue-400"
                    : "hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700"
                }`}
              >
                <div className="font-semibold text-sm">{parent.parentName}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">{parent.parentEmail}</div>
                <div className="text-sm font-bold text-green-600 dark:text-green-400 mt-1">
                  ${parseFloat(parent.balance).toFixed(2)}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Parent Details */}
        {selectedParent && (
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
            <h3 className="font-bold text-lg mb-4">{selectedParent.parentName} - Wallet Details</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded border dark:border-green-800">
                  <div className="text-xs text-gray-600 dark:text-gray-400">Current Balance</div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    ${parseFloat(selectedParent.balance).toFixed(2)}
                  </div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border dark:border-blue-800">
                  <div className="text-xs text-gray-600 dark:text-gray-400">Total Deposited</div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    ${parseFloat(selectedParent.totalDeposited).toFixed(2)}
                  </div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded border dark:border-red-800">
                  <div className="text-xs text-gray-600 dark:text-gray-400">Total Spent</div>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    ${parseFloat(selectedParent.totalSpent).toFixed(2)}
                  </div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded border dark:border-purple-800">
                  <div className="text-xs text-gray-600 dark:text-gray-400">Net Transactions</div>
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    ${(
                      parseFloat(selectedParent.totalDeposited) - parseFloat(selectedParent.totalSpent)
                    ).toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded border dark:border-gray-600">
                <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">Email</div>
                <div className="text-sm font-mono">{selectedParent.parentEmail}</div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded border dark:border-gray-600">
                <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">Parent ID</div>
                <div className="text-sm font-mono">{selectedParent.parentId}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Balance Distribution */}
      {analytics?.topParentsByBalance && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
          <h3 className="font-bold text-lg mb-4">Top Parents Balance Comparison</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={analytics.topParentsByBalance.map((p) => ({
                name: p.parentName,
                balance: parseFloat(p.balance),
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
                labelStyle={{ color: "#f3f4f6" }}
              />
              <Bar dataKey="balance" fill="#3b82f6" name="Balance ($)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
