import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Calendar, TrendingUp, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

interface MonthlyData {
  month: number;
  monthName: string;
  tasksCompleted: number;
  growthPoints: number;
}

interface AnnualReportData {
  year: number;
  monthlyData: MonthlyData[];
  yearlyTotals: {
    totalTasks: number;
    totalPoints: number;
  };
  growthTree?: {
    currentStage: number;
    totalGrowthPoints: number;
    tasksCompleted: number;
    gamesPlayed: number;
    rewardsEarned: number;
  };
}

interface AnnualReportChartProps {
  childId: string;
  isParentView?: boolean;
}

export function AnnualReportChart({ childId, isParentView = false }: AnnualReportChartProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const [year, setYear] = useState(new Date().getFullYear());
  const currentYear = new Date().getFullYear();

  const token = isParentView 
    ? localStorage.getItem("token") 
    : localStorage.getItem("childToken");

  const endpoint = isParentView 
    ? `/api/parent/children/${childId}/annual-report?year=${year}`
    : `/api/child/annual-report?year=${year}`;

  const { data, isLoading, error } = useQuery<{ success: boolean; data: AnnualReportData }>({
    queryKey: ["annual-report", childId, year, isParentView],
    queryFn: async () => {
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch annual report");
      return res.json();
    },
    enabled: !!token && !!childId,
  });

  if (isLoading) {
    return (
      <div className={`rounded-2xl p-6 ${isDark ? "bg-gray-800" : "bg-white"} shadow-lg animate-pulse`}>
        <div className="h-64 bg-gray-300 dark:bg-gray-700 rounded-xl" />
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className={`rounded-2xl p-6 ${isDark ? "bg-gray-800" : "bg-white"} shadow-lg text-center`}>
        <p className={isDark ? "text-gray-400" : "text-gray-600"}>{t("noDataForYear")}</p>
      </div>
    );
  }

  const { monthlyData, yearlyTotals, growthTree } = data.data;
  const safeTotals = yearlyTotals || { totalTasks: 0, totalPoints: 0 };

  const chartData = monthlyData.map((m) => ({
    name: m.monthName,
    [t("tasksCompleted")]: m.tasksCompleted,
    [t("growthPointsEarned")]: m.growthPoints,
  }));

  const hasData = monthlyData.some((m) => m.tasksCompleted > 0 || m.growthPoints > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-3xl p-6 ${isDark ? "bg-gray-800/90" : "bg-white/90"} backdrop-blur-sm shadow-xl`}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <Calendar className={`w-8 h-8 ${isDark ? "text-green-400" : "text-green-600"}`} />
          <div>
            <h2 className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
              {t("annualReport")}
            </h2>
            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              {t("monthlyProgress")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setYear(year - 1)}
            disabled={year <= 2020}
            className={`p-2 rounded-lg ${isDark ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-200 hover:bg-gray-300"} disabled:opacity-50 transition-colors`}
            data-testid="button-prev-year"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className={`px-4 py-2 font-bold text-lg ${isDark ? "text-white" : "text-gray-800"}`}>
            {year}
          </span>
          <button
            onClick={() => setYear(year + 1)}
            disabled={year >= currentYear}
            className={`p-2 rounded-lg ${isDark ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-200 hover:bg-gray-300"} disabled:opacity-50 transition-colors`}
            data-testid="button-next-year"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {hasData ? (
        <>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke={isDark ? "#374151" : "#e5e7eb"} 
                />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: isDark ? "#9ca3af" : "#4b5563", fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  tick={{ fill: isDark ? "#9ca3af" : "#4b5563", fontSize: 12 }} 
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: isDark ? "#1f2937" : "#fff",
                    border: `1px solid ${isDark ? "#374151" : "#e5e7eb"}`,
                    borderRadius: "8px",
                    color: isDark ? "#fff" : "#000",
                  }}
                />
                <Legend />
                <Bar 
                  dataKey={t("tasksCompleted")} 
                  fill="#10b981" 
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey={t("growthPointsEarned")} 
                  fill="#8b5cf6" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className={`p-4 rounded-xl ${isDark ? "bg-gray-700" : "bg-green-50"}`}>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                  {t("yearlyTotal")} - {t("tasksCompleted")}
                </span>
              </div>
              <p className="text-3xl font-bold text-green-600">{safeTotals.totalTasks}</p>
            </div>
            <div className={`p-4 rounded-xl ${isDark ? "bg-gray-700" : "bg-purple-50"}`}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-purple-500" />
                <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                  {t("yearlyTotal")} - {t("points")}
                </span>
              </div>
              <p className="text-3xl font-bold text-purple-600">{safeTotals.totalPoints}</p>
            </div>
          </div>

          {growthTree && (
            <div className={`mt-6 p-4 rounded-xl ${isDark ? "bg-gray-700" : "bg-yellow-50"} border ${isDark ? "border-gray-600" : "border-yellow-200"}`}>
              <h3 className={`font-bold mb-3 ${isDark ? "text-white" : "text-gray-800"}`}>
                {t("growthTree")} - {t("treeLevel")} {growthTree.currentStage}
              </h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-green-600">{growthTree.tasksCompleted}</p>
                  <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>{t("tasks")}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{growthTree.gamesPlayed}</p>
                  <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>{t("gamesAndTasks")}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">{growthTree.rewardsEarned}</p>
                  <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>{t("rewards")}</p>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="h-48 flex items-center justify-center">
          <div className="text-center">
            <Calendar className={`w-16 h-16 mx-auto mb-4 ${isDark ? "text-gray-600" : "text-gray-400"}`} />
            <p className={isDark ? "text-gray-400" : "text-gray-600"}>{t("noDataForYear")}</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}
