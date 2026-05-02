import { useLocation } from "wouter";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/hooks/use-toast";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ParentNotificationBell } from "@/components/NotificationBell";
import {
  ArrowRight, ShoppingCart, Trash2, Loader2, Wallet,
  BookOpen, Star, CheckCircle, ShoppingBag, AlertCircle, RotateCcw, Infinity
} from "lucide-react";

interface CartItem {
  id: number;
  teacherTaskId: number;
  taskTitle: string;
  taskQuestion: string;
  taskPrice: string;
  taskPointsReward: number;
  taskSubjectLabel: string | null;
  taskCoverImageUrl: string | null;
  teacherName: string;
}

interface CartData {
  items: CartItem[];
  totalPrice: string;
  walletBalance: string;
  itemCount: number;
}

export default function TaskCart() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const token = localStorage.getItem("token");
  const [purchaseType, setPurchaseType] = useState<"one_time" | "limited" | "permanent">("permanent");
  const [maxUsageCount, setMaxUsageCount] = useState<number>(3);

  const { data: cartData, isLoading } = useQuery<CartData>({
    queryKey: ["task-cart"],
    queryFn: async () => {
      const res = await fetch("/api/parent/cart", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load cart");
      const json = await res.json();
      return json.data;
    },
    enabled: !!token,
  });

  const removeItem = useMutation({
    mutationFn: async (itemId: number) => {
      const res = await fetch(`/api/parent/cart/${itemId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to remove");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-cart"] });
      queryClient.invalidateQueries({ queryKey: ["task-cart-count"] });
      queryClient.invalidateQueries({ queryKey: ["browse-tasks"] });
      toast({ title: t('taskCart.removedFromCart') });
    },
  });

  const checkout = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/parent/cart/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          purchaseType,
          ...(purchaseType === "limited" ? { maxUsageCount } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Checkout failed");
      return json.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["task-cart"] });
      queryClient.invalidateQueries({ queryKey: ["task-cart-count"] });
      queryClient.invalidateQueries({ queryKey: ["browse-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["parent-wallet"] });
      toast({
        title: t('taskCart.purchaseSuccess'),
        description: t('taskCart.purchasedCount', { count: data.ordersCount }),
      });
    },
    onError: (err: Error) => {
      toast({ title: t('taskCart.purchaseFailed'), description: err.message, variant: "destructive" });
    },
  });

  const items = cartData?.items || [];
  const totalPrice = parseFloat(cartData?.totalPrice || "0");
  const walletBalance = parseFloat(cartData?.walletBalance || "0");
  const canAfford = walletBalance >= totalPrice;

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-950" : "bg-gray-50"}`}>
      {/* Header */}
      <div className={`sticky top-0 z-40 ${isDark ? "bg-gray-900/95 border-gray-800" : "bg-white/95 border-gray-200"} border-b backdrop-blur-sm`}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => window.history.length > 1 ? window.history.back() : navigate("/task-marketplace")} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
              <ArrowRight className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-bold">{t('taskCart.title')}</h1>
              {items.length > 0 && (
                <Badge variant="secondary" className="text-xs">{items.length}</Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <ParentNotificationBell />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Wallet Balance Card */}
        <Card className={`${isDark ? "bg-gradient-to-r from-purple-900/50 to-blue-900/50 border-purple-800" : "bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200"}`}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-full">
                <Wallet className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <span className="text-sm text-muted-foreground">{t('taskCart.walletBalance')}</span>
                <p className="text-xl font-bold">{walletBalance.toFixed(2)} {t('taskCart.currency')}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate("/wallet")}>
              {t('taskCart.topUp')}
            </Button>
          </CardContent>
        </Card>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && items.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <ShoppingBag className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-bold mb-2">{t('taskCart.cartEmpty')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('taskCart.emptyDescription')}
              </p>
              <Button onClick={() => navigate("/task-marketplace")} className="gap-2">
                <BookOpen className="h-4 w-4" />
                {t('taskCart.browseTasks')}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Cart Items */}
        {items.map((item) => (
          <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow">
            <div className="flex">
              {item.taskCoverImageUrl && (
                <img
                  src={item.taskCoverImageUrl}
                  alt=""
                  className="w-24 h-full object-cover shrink-0"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              )}
              <CardContent className="p-3 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm line-clamp-1">{item.taskTitle || item.taskQuestion}</h3>
                    {item.taskTitle && item.taskQuestion !== item.taskTitle && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.taskQuestion}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{t('taskCart.by')} {item.teacherName}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      {item.taskSubjectLabel && (
                        <Badge variant="outline" className="text-[10px] py-0">{item.taskSubjectLabel}</Badge>
                      )}
                      {item.taskPointsReward > 0 && (
                        <Badge variant="secondary" className="text-[10px] py-0 gap-0.5">
                          <Star className="h-2.5 w-2.5" />
                          {item.taskPointsReward}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="text-base font-bold text-green-600">{item.taskPrice} {t('taskCart.currency')}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                      onClick={() => removeItem.mutate(item.id)}
                      disabled={removeItem.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>
        ))}

        {/* Checkout Section */}
        {items.length > 0 && (
          <Card className={`sticky bottom-4 ${isDark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"} shadow-lg`}>
            <CardContent className="p-4 space-y-3">
              {/* Purchase Type Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('taskCart.purchaseType')}</Label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setPurchaseType("one_time")}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border-2 transition-all text-center ${
                      purchaseType === "one_time"
                        ? "border-primary bg-primary/10 text-primary"
                        : isDark ? "border-gray-700 hover:border-gray-600" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span className="text-xs font-medium">{t('taskCart.purchaseOnce')}</span>
                    <span className="text-[10px] text-muted-foreground">{t('taskCart.purchaseOnceDesc')}</span>
                  </button>
                  <button
                    onClick={() => setPurchaseType("limited")}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border-2 transition-all text-center ${
                      purchaseType === "limited"
                        ? "border-primary bg-primary/10 text-primary"
                        : isDark ? "border-gray-700 hover:border-gray-600" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span className="text-xs font-medium">{t('taskCart.purchaseLimited')}</span>
                    <span className="text-[10px] text-muted-foreground">{t('taskCart.purchaseLimitedDesc')}</span>
                  </button>
                  <button
                    onClick={() => setPurchaseType("permanent")}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border-2 transition-all text-center ${
                      purchaseType === "permanent"
                        ? "border-primary bg-primary/10 text-primary"
                        : isDark ? "border-gray-700 hover:border-gray-600" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Infinity className="h-4 w-4" />
                    <span className="text-xs font-medium">{t('taskCart.purchasePermanent')}</span>
                    <span className="text-[10px] text-muted-foreground">{t('taskCart.purchasePermanentDesc')}</span>
                  </button>
                </div>

                {purchaseType === "limited" && (
                  <div className="mt-2">
                    <Label className="text-xs">{t('taskCart.howManyTimes')}</Label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={maxUsageCount}
                      onChange={(e) => setMaxUsageCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="h-9 mt-1"
                    />
                  </div>
                )}
              </div>

              <div className="border-t pt-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('taskCart.taskCount')}</span>
                  <span className="font-medium">{items.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-lg">{t('taskCart.total')}</span>
                  <span className="font-bold text-lg text-green-600">{totalPrice.toFixed(2)} {t('taskCart.currency')}</span>
                </div>
              </div>

              {!canAfford && (
                <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-950 rounded-lg text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{t('taskCart.insufficientBalance', { amount: (totalPrice - walletBalance).toFixed(2) })}</span>
                </div>
              )}

              <Button
                className="w-full gap-2 h-12 text-base"
                disabled={!canAfford || checkout.isPending || items.length === 0}
                onClick={() => checkout.mutate()}
              >
                {checkout.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {t('taskCart.purchasing')}
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    {t('taskCart.buyAll', { amount: totalPrice.toFixed(2) })}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
