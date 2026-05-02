import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Package, TrendingUp, ShoppingCart, Users, Star, AlertTriangle,
  DollarSign, Gift, BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface StoreAnalyticsTabProps {
  token: string;
}

export function StoreAnalyticsTab({ token }: StoreAnalyticsTabProps) {
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();
  const [days, setDays] = useState("30");
  const locale = i18n.language === "ar" ? "ar-EG" : i18n.language === "pt" ? "pt-BR" : "en-US";
  const curr = t("storeAnalyticsPage.currency");
  const fmtNum = (n: number) => Number(n).toLocaleString(locale);

  const { data, isLoading, error } = useQuery({
    queryKey: ["store-analytics", days],
    queryFn: async () => {
      const res = await fetch(`/api/admin/store/analytics?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch analytics");
      const json = await res.json();
      return json.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <AlertTriangle className="w-12 h-12 mx-auto text-red-400 mb-3" />
        <p className="text-red-500">{t("storeAnalyticsPage.loadFailed")}</p>
      </div>
    );
  }

  const { overview, revenue, childPurchases: childPurchaseData, topProducts, categoryBreakdown, recentOrders, dailyRevenue, gifts, activeBuyers, lowStockProducts } = data || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-500" />
            {t("storeAnalyticsPage.title")}
          </h2>
          <p className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            {t("storeAnalyticsPage.subtitle")}
          </p>
        </div>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">{t("storeAnalyticsPage.last7Days")}</SelectItem>
            <SelectItem value="30">{t("storeAnalyticsPage.last30Days")}</SelectItem>
            <SelectItem value="90">{t("storeAnalyticsPage.last3Months")}</SelectItem>
            <SelectItem value="365">{t("storeAnalyticsPage.lastYear")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<DollarSign className="w-5 h-5 text-green-500" />}
          label={t("storeAnalyticsPage.totalRevenue")}
          value={`${fmtNum(revenue?.totalRevenue || 0)} ${curr}`}
          subtext={`${revenue?.totalOrders || 0} ${t("storeAnalyticsPage.orders")}`}
          isDark={isDark}
          color="green"
        />
        <StatCard
          icon={<ShoppingCart className="w-5 h-5 text-blue-500" />}
          label={t("storeAnalyticsPage.avgOrderValue")}
          value={`${fmtNum(revenue?.averageOrderValue || 0)} ${curr}`}
          subtext={`${activeBuyers || 0} ${t("storeAnalyticsPage.activeBuyer")}`}
          isDark={isDark}
          color="blue"
        />
        <StatCard
          icon={<Package className="w-5 h-5 text-purple-500" />}
          label={t("storeAnalyticsPage.activeProducts")}
          value={`${overview?.activeProducts || 0}`}
          subtext={`${overview?.outOfStock || 0} ${t("storeAnalyticsPage.outOfStock")}`}
          isDark={isDark}
          color="purple"
        />
        <StatCard
          icon={<Gift className="w-5 h-5 text-orange-500" />}
          label={t("storeAnalyticsPage.assignedGifts")}
          value={`${gifts?.totalAssigned || 0}`}
          subtext={`${gifts?.completed || 0} ${t("storeAnalyticsPage.completed")} • ${gifts?.active || 0} ${t("storeAnalyticsPage.active")}`}
          isDark={isDark}
          color="orange"
        />
      </div>

      {/* Revenue breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={isDark ? "bg-gray-800 border-gray-700" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-500" />
              {t("storeAnalyticsPage.parentPurchases")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {fmtNum(revenue?.parentPurchases?.total || 0)} {curr}
            </p>
            <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              {revenue?.parentPurchases?.count || 0} {t("storeAnalyticsPage.purchaseOp")}
            </p>
          </CardContent>
        </Card>
        <Card className={isDark ? "bg-gray-800 border-gray-700" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-blue-500" />
              {t("storeAnalyticsPage.storeOrdersStripe")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              {fmtNum(revenue?.storeOrders?.total || 0)} {curr}
            </p>
            <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              {revenue?.storeOrders?.count || 0} {t("storeAnalyticsPage.orders")}
            </p>
          </CardContent>
        </Card>
        <Card className={isDark ? "bg-gray-800 border-gray-700" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              {t("storeAnalyticsPage.childPurchasesPoints")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">
              {fmtNum(childPurchaseData?.totalPointsSpent || 0)} {t("storeAnalyticsPage.point")}
            </p>
            <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              {childPurchaseData?.count || 0} {t("storeAnalyticsPage.purchaseOp")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Revenue Chart */}
      {dailyRevenue && dailyRevenue.length > 0 && (
        <Card className={isDark ? "bg-gray-800 border-gray-700" : ""}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              {t("storeAnalyticsPage.dailyRevenueTrend")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {/* Simple bar chart */}
              <div className="flex items-end gap-1 h-40 overflow-x-auto pb-2">
                {dailyRevenue.map((day: any, idx: number) => {
                  const maxRev = Math.max(...dailyRevenue.map((d: any) => Number(d.revenue)));
                  const height = maxRev > 0 ? (Number(day.revenue) / maxRev) * 100 : 0;
                  return (
                    <div key={idx} className="flex flex-col items-center gap-1 min-w-[32px]" title={`${day.date}: ${fmtNum(day.revenue)} ${curr} (${day.orders} ${t("storeAnalyticsPage.orders")})`}>
                      <div
                        className="w-6 bg-gradient-to-t from-blue-500 to-blue-400 rounded-t transition-all hover:from-blue-600 hover:to-blue-500"
                        style={{ height: `${Math.max(height, 4)}%` }}
                      />
                      <span className={`text-[9px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                        {new Date(day.date).getDate()}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>{dailyRevenue[0]?.date}</span>
                <span>{dailyRevenue[dailyRevenue.length - 1]?.date}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Two columns: Top Products + Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Products */}
        <Card className={isDark ? "bg-gray-800 border-gray-700" : ""}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              {t("storeAnalyticsPage.topSellingProducts")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts && topProducts.length > 0 ? (
              <div className="space-y-3">
                {topProducts.map((p: any, idx: number) => (
                  <div key={p.productId} className={`flex items-center gap-3 p-2 rounded-lg ${isDark ? "hover:bg-gray-700" : "hover:bg-gray-50"}`}>
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx < 3 ? "bg-yellow-100 text-yellow-700" : isDark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                      {p.image ? (
                        <img src={p.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{i18n.language === "ar" ? (p.nameAr || p.name) : p.name}</p>
                      <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                        {p.totalQuantity} {t("storeAnalyticsPage.salesOp")}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-green-600">
                      {fmtNum(p.totalRevenue)} {curr}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-400 py-8">{t("storeAnalyticsPage.noSalesInPeriod")}</p>
            )}
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card className={isDark ? "bg-gray-800 border-gray-700" : ""}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-500" />
              {t("storeAnalyticsPage.categoryDistribution")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categoryBreakdown && categoryBreakdown.length > 0 ? (
              <div className="space-y-3">
                {categoryBreakdown.map((cat: any) => {
                  const totalCats = categoryBreakdown.reduce((s: number, c: any) => s + c.productCount, 0);
                  const pct = totalCats > 0 ? (cat.productCount / totalCats) * 100 : 0;
                  return (
                    <div key={cat.categoryId || "uncategorized"} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{i18n.language === "ar" ? (cat.categoryNameAr || cat.categoryName || t("storeAnalyticsPage.uncategorized")) : (cat.categoryName || cat.categoryNameAr || t("storeAnalyticsPage.uncategorized"))}</span>
                        <span className={isDark ? "text-gray-400" : "text-gray-500"}>
                          {cat.productCount} {t("storeAnalyticsPage.product")} ({pct.toFixed(0)}%)
                        </span>
                      </div>
                      <div className={`h-2 rounded-full overflow-hidden ${isDark ? "bg-gray-700" : "bg-gray-100"}`}>
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-gray-400 py-8">{t("storeAnalyticsPage.noData")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Low Stock + Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Low Stock Alert */}
        <Card className={isDark ? "bg-gray-800 border-gray-700" : ""}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              {t("storeAnalyticsPage.lowStockAlert")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockProducts && lowStockProducts.length > 0 ? (
              <div className="space-y-2">
                {lowStockProducts.map((p: any) => (
                  <div key={p.id} className={`flex items-center gap-3 p-2 rounded-lg ${isDark ? "bg-red-900/20" : "bg-red-50"}`}>
                    <div className="w-8 h-8 rounded overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                      {p.image ? (
                        <img src={p.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-3 h-3 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <span className="flex-1 text-sm truncate">{i18n.language === "ar" ? (p.nameAr || p.name) : p.name}</span>
                    <Badge variant={p.stock === 0 ? "destructive" : "outline"} className="text-xs">
                      {p.stock === 0 ? t("storeAnalyticsPage.soldOut") : `${p.stock} ${t("storeAnalyticsPage.remaining")}`}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-green-500 py-8">✅ {t("storeAnalyticsPage.allStockSufficient")}</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card className={isDark ? "bg-gray-800 border-gray-700" : ""}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-blue-500" />
              {t("storeAnalyticsPage.recentOrders")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders && recentOrders.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {recentOrders.map((order: any) => (
                  <div key={order.id} className={`flex items-center justify-between p-2 rounded-lg ${isDark ? "hover:bg-gray-700" : "hover:bg-gray-50"}`}>
                    <div>
                      <p className="text-sm font-medium">
                        {fmtNum(order.totalAmount)} {curr}
                      </p>
                      <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                        {new Date(order.createdAt).toLocaleDateString(locale)}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        order.paymentStatus === "paid"
                          ? "border-green-500 text-green-600"
                          : order.paymentStatus === "failed"
                          ? "border-red-500 text-red-600"
                          : "border-yellow-500 text-yellow-600"
                      }`}
                    >
                      {order.paymentStatus === "paid" ? t("storeAnalyticsPage.paid") : order.paymentStatus === "failed" ? t("storeAnalyticsPage.failed") : t("storeAnalyticsPage.pending")}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-400 py-8">{t("storeAnalyticsPage.noRecentOrders")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* User Behavior Insights */}
      <Card className={isDark ? "bg-gray-800 border-gray-700" : ""}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" />
              {t("storeAnalyticsPage.userBehavior")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`p-4 rounded-xl text-center ${isDark ? "bg-gray-700" : "bg-indigo-50"}`}>
              <Users className="w-6 h-6 mx-auto text-indigo-500 mb-2" />
              <p className="text-2xl font-bold text-indigo-600">{activeBuyers || 0}</p>
              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t("storeAnalyticsPage.activeBuyer")}</p>
            </div>
            <div className={`p-4 rounded-xl text-center ${isDark ? "bg-gray-700" : "bg-green-50"}`}>
              <ShoppingCart className="w-6 h-6 mx-auto text-green-500 mb-2" />
              <p className="text-2xl font-bold text-green-600">{revenue?.totalOrders || 0}</p>
              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t("storeAnalyticsPage.totalOrders")}</p>
            </div>
            <div className={`p-4 rounded-xl text-center ${isDark ? "bg-gray-700" : "bg-orange-50"}`}>
              <Gift className="w-6 h-6 mx-auto text-orange-500 mb-2" />
              <p className="text-2xl font-bold text-orange-600">{gifts?.active || 0}</p>
              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t("storeAnalyticsPage.activeGifts")}</p>
            </div>
            <div className={`p-4 rounded-xl text-center ${isDark ? "bg-gray-700" : "bg-yellow-50"}`}>
              <Star className="w-6 h-6 mx-auto text-yellow-500 mb-2" />
              <p className="text-2xl font-bold text-yellow-600">{childPurchaseData?.count || 0}</p>
              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t("storeAnalyticsPage.pointsPurchases")}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper stat card component
function StatCard({ icon, label, value, subtext, isDark, color }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
  isDark: boolean;
  color: string;
}) {
  const bgMap: Record<string, string> = {
    green: isDark ? "bg-green-900/20 border-green-800" : "bg-green-50 border-green-200",
    blue: isDark ? "bg-blue-900/20 border-blue-800" : "bg-blue-50 border-blue-200",
    purple: isDark ? "bg-purple-900/20 border-purple-800" : "bg-purple-50 border-purple-200",
    orange: isDark ? "bg-orange-900/20 border-orange-800" : "bg-orange-50 border-orange-200",
  };
  return (
    <Card className={`border ${bgMap[color] || ""}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <span className={`text-xs font-medium ${isDark ? "text-gray-300" : "text-gray-600"}`}>{label}</span>
        </div>
        <p className="text-xl font-bold">{value}</p>
        <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{subtext}</p>
      </CardContent>
    </Card>
  );
}
