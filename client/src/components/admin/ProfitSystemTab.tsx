import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Wallet, Users, ArrowRightLeft, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getDateLocale } from "@/i18n/config";

interface ProfitSummary {
  totalAppCommission: number;
  totalSellerEarnings: number;
  totalPoints: number;
  transactionsCount: number;
  topSellers: Array<{
    id: string;
    name: string;
    email: string;
    earnings: number;
    transactions: number;
  }>;
  recentTransactions: Array<{
    id: string;
    sellerId: string;
    buyerId: string;
    totalPoints: number;
    sellerEarnings: number;
    appCommission: number;
    commissionRate: number;
    createdAt: string;
  }>;
}

interface TransactionDetails {
  id: string;
  sellerId: string;
  buyerId: string;
  templateTaskId: string | null;
  totalPoints: number;
  sellerEarnings: number;
  appCommission: number;
  commissionRate: number;
  createdAt: string;
  seller: { id: string; name: string; email: string } | null;
  buyer: { id: string; name: string; email: string } | null;
  task: { id: string; title: string } | null;
}

export function ProfitSystemTab({
  token }: { token: string }) {
  const { t } = useTranslation();
  const [expandedTransaction, setExpandedTransaction] = useState<string | null>(null);

  const { data: summary, isLoading: loadingSummary } = useQuery<ProfitSummary>({
    queryKey: ["admin-profits-summary"],
    queryFn: async () => {
      const res = await fetch("/api/admin/profits/summary", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.data;
    },
  });

  const { data: transactions, isLoading: loadingTransactions } = useQuery<TransactionDetails[]>({
    queryKey: ["admin-profits-transactions"],
    queryFn: async () => {
      const res = await fetch("/api/admin/profits/transactions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.data || [];
    },
  });

  if (loadingSummary) {
    return <div className="p-4">{t("admin.profitSystem.loading")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="h-6 w-6" />
          نظام الأرباح والعمولات
        </h2>
        <Badge variant="secondary" className="text-lg px-4 py-1">
          العمولة: 10%
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{t("admin.profitSystem.appCommission")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{summary?.totalAppCommission || 0}</div>
            <div className="text-sm text-muted-foreground">نقطة</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">أرباح البائعين</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{summary?.totalSellerEarnings || 0}</div>
            <div className="text-sm text-muted-foreground">نقطة</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">إجمالي النقاط المتداولة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary?.totalPoints || 0}</div>
            <div className="text-sm text-muted-foreground">نقطة</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">عدد المعاملات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary?.transactionsCount || 0}</div>
            <div className="text-sm text-muted-foreground">معاملة</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sellers" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sellers" className="flex items-center gap-2" data-testid="tab-top-sellers">
            <Users className="h-4 w-4" />
            أفضل البائعين
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2" data-testid="tab-transactions">
            <ArrowRightLeft className="h-4 w-4" />
            المعاملات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sellers" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                أفضل 10 بائعين
              </CardTitle>
            </CardHeader>
            <CardContent>
              {summary?.topSellers && summary.topSellers.length > 0 ? (
                <div className="space-y-3">
                  {summary.topSellers.map((seller, index) => (
                    <div
                      key={seller.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                      data-testid={`seller-${seller.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          index === 0 ? "bg-yellow-500 text-white" :
                          index === 1 ? "bg-gray-400 text-white" :
                          index === 2 ? "bg-amber-600 text-white" :
                          "bg-muted"
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{seller.name}</div>
                          <div className="text-sm text-muted-foreground">{seller.email}</div>
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-green-600">{seller.earnings} نقطة</div>
                        <div className="text-sm text-muted-foreground">{seller.transactions} معاملة</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>لا توجد معاملات بعد</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5" />
                سجل المعاملات
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingTransactions ? (
                <div className="text-center py-8 text-muted-foreground">{t("admin.profitSystem.loading")}</div>
              ) : transactions && transactions.length > 0 ? (
                <div className="space-y-2">
                  {transactions.map((t) => (
                    <div
                      key={t.id}
                      className="border rounded-lg overflow-hidden"
                      data-testid={`transaction-${t.id}`}
                    >
                      <div
                        className="flex items-center justify-between p-3 cursor-pointer hover-elevate"
                        onClick={() => setExpandedTransaction(expandedTransaction === t.id ? null : t.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col">
                            <span className="font-medium">{t.seller?.name || "غير معروف"}</span>
                            <span className="text-xs text-muted-foreground">البائع</span>
                          </div>
                          <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                          <div className="flex flex-col">
                            <span className="font-medium">{t.buyer?.name || "غير معروف"}</span>
                            <span className="text-xs text-muted-foreground">المشتري</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-left">
                            <div className="font-bold">{t.totalPoints} نقطة</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(t.createdAt).toLocaleDateString(getDateLocale())}
                            </div>
                          </div>
                          {expandedTransaction === t.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                      {expandedTransaction === t.id && (
                        <div className="p-3 bg-muted/50 border-t">
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">أرباح البائع: </span>
                              <span className="font-medium text-green-600">{t.sellerEarnings} نقطة</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">عمولة التطبيق: </span>
                              <span className="font-medium text-primary">{t.appCommission} نقطة</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">نسبة العمولة: </span>
                              <span className="font-medium">{t.commissionRate}%</span>
                            </div>
                          </div>
                          {t.task && (
                            <div className="mt-2 text-sm">
                              <span className="text-muted-foreground">المهمة: </span>
                              <span className="font-medium">{t.task.title}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ArrowRightLeft className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>لا توجد معاملات بعد</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
