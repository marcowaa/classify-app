import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import i18next from "i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Package, Gift, ArrowRight, Truck, Star, Clock, CheckCircle, ArrowLeft, X } from "lucide-react";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { ParentNotificationBell } from "@/components/NotificationBell";
import { LanguageSelector } from "@/components/LanguageSelector";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending_admin_approval: { label: i18next.t("parentInventory.awaitingApproval"), color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock },
  active: { label: i18next.t("parentInventory.availableToAssign"), color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle },
  assigned_to_child: { label: i18next.t("parentInventory.assignedToChild"), color: "bg-blue-100 text-blue-800 border-blue-200", icon: Gift },
  exhausted: { label: i18next.t("parentInventory.exhausted"), color: "bg-gray-100 text-gray-500 border-gray-200", icon: Package },
};

export default function ParentInventory() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { isDark } = useTheme();
  const isRTL = i18next.dir() === "rtl";
  const token = localStorage.getItem("token");

  const [assignDialog, setAssignDialog] = useState<any>(null);
  const [selectedChild, setSelectedChild] = useState("");
  const [requiredPoints, setRequiredPoints] = useState("");
  const [dismissedInventoryHints, setDismissedInventoryHints] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem("parentInventorySectionHints");
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  });

  const { data, isLoading } = useQuery({
    queryKey: ["/api/parent/owned-products"],
    enabled: !!token,
  });

  const { data: childrenData } = useQuery({
    queryKey: ["/api/parent/children"],
    enabled: !!token,
  });

  const assignMutation = useMutation({
    mutationFn: async ({ id, childId, requiredPoints }: { id: string; childId: string; requiredPoints: number }) => {
      return await apiRequest("POST", `/api/parent/owned-products/${id}/assign-to-child`, { childId, requiredPoints });
    },
    onSuccess: () => {
      setAssignDialog(null);
      setSelectedChild("");
      setRequiredPoints("");
      queryClient.invalidateQueries({ queryKey: ["/api/parent/owned-products"] });
    },
  });

  const products: any[] = Array.isArray(data) ? data : (data as any)?.data || [];
  const children: any[] = Array.isArray(childrenData) ? childrenData : (childrenData as any)?.data || [];

  const inventoryHints = useMemo(() => ([
    {
      id: "inventory-overview",
      icon: "📦",
      title: t("parentInventory.myOwnedProducts"),
    },
    {
      id: "inventory-assign",
      icon: "🎁",
      title: t("parentInventory.assignAsGift"),
    },
    {
      id: "inventory-status",
      icon: "🚚",
      title: t("parentInventory.pendingApproval"),
    },
  ]), [t]);

  const visibleInventoryHints = useMemo(
    () => inventoryHints.filter((hint) => !dismissedInventoryHints[hint.id]),
    [inventoryHints, dismissedInventoryHints]
  );

  const dismissInventoryHint = (id: string) => {
    setDismissedInventoryHints((prev) => {
      const next = { ...prev, [id]: true };
      localStorage.setItem("parentInventorySectionHints", JSON.stringify(next));
      return next;
    });
  };

  const BackArrow = isRTL ? ArrowRight : ArrowLeft;
  const NextArrow = isRTL ? ArrowLeft : ArrowRight;
  const inventorySurfaceClass = isDark
    ? "border border-white/10 bg-slate-900/85 backdrop-blur-xl shadow-[0_22px_34px_-26px_rgba(15,23,42,0.8)]"
    : "border border-white/70 bg-white/92 backdrop-blur-xl shadow-[0_22px_34px_-26px_rgba(15,23,42,0.55)]";
  const raisedControlClass = isDark
    ? "rounded-2xl border border-white/10 bg-slate-800/70 shadow-[0_14px_22px_-18px_rgba(0,0,0,0.8)] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-[1px]"
    : "rounded-2xl border border-white/45 bg-white/20 shadow-[0_14px_22px_-18px_rgba(15,23,42,0.65)] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-[1px]";
  const productCardClass = isDark
    ? "border border-orange-900/35 bg-slate-900/88 shadow-[0_18px_30px_-24px_rgba(15,23,42,0.85)]"
    : "border border-orange-100/90 bg-white/95 shadow-[0_18px_30px_-24px_rgba(249,115,22,0.45)]";
  const dialogShellClass = isDark
    ? "border border-orange-900/35 bg-slate-900/95 shadow-[0_30px_48px_-32px_rgba(0,0,0,0.9)]"
    : "border border-orange-100 bg-white/95 shadow-[0_30px_48px_-32px_rgba(15,23,42,0.55)]";
  const primaryButtonClass = "bg-gradient-to-br from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-[0_14px_24px_-14px_rgba(249,115,22,0.95)]";

  if (isLoading) {
    return (
      <div className={`min-h-screen ${isDark ? "bg-slate-950" : "bg-amber-50"} flex items-center justify-center`}>
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className={isDark ? "text-gray-400" : "text-gray-500"}>{t("parentInventory.loadingProducts")}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative min-h-screen overflow-x-clip ${isDark ? "bg-gradient-to-b from-slate-950 via-slate-900 to-gray-900" : "bg-gradient-to-b from-amber-50 via-orange-50 to-gray-50"}`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className={`absolute -top-24 ${isRTL ? "-left-24" : "-right-24"} h-72 w-72 rounded-full ${isDark ? "bg-orange-500/16" : "bg-orange-300/35"} blur-3xl`} />
        <div className={`absolute top-1/3 ${isRTL ? "-right-24" : "-left-24"} h-80 w-80 rounded-full ${isDark ? "bg-amber-500/12" : "bg-amber-200/55"} blur-3xl`} />
      </div>

      <header className="sticky top-0 z-50 border-b border-white/20 bg-gradient-to-r from-orange-500 via-orange-600 to-red-500 text-white shadow-[0_16px_30px_-18px_rgba(249,115,22,0.9)] backdrop-blur">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-5">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex items-start sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                  <Package className="w-6 h-6 sm:w-7 sm:h-7" />
                  {t("parentInventory.myOwnedProducts")}
                </h1>
                <p className="text-white/85 text-xs sm:text-sm mt-1">
                  {t("parentInventory.productCount", { count: products.length })}
                </p>
              </div>
              <button
                onClick={() => {
                  if (window.history.length > 1) {
                    window.history.back();
                  } else {
                    navigate("/parent-dashboard");
                  }
                }}
                className={`flex items-center gap-1.5 px-3 min-h-[44px] ${raisedControlClass}`}
              >
                <BackArrow className="w-4 h-4" />
                <span className="text-sm font-semibold">{t("common.back")}</span>
              </button>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className={`px-3 py-1.5 text-xs sm:text-sm font-semibold ${raisedControlClass}`}>
                {t("parentInventory.productCount", { count: products.length })}
              </div>
              <div className="flex items-center gap-2">
                <div className={`p-1.5 ${raisedControlClass}`}>
                  <LanguageSelector />
                </div>
                <div className={`p-1.5 ${raisedControlClass}`}>
                  <ParentNotificationBell />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-5xl mx-auto px-2.5 sm:px-4 py-4 sm:py-6">
        {visibleInventoryHints.length > 0 && (
          <section className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3">
            {visibleInventoryHints.map((hint) => (
              <div key={hint.id} className={`relative rounded-2xl p-3 sm:p-4 ${inventorySurfaceClass}`}>
                <button
                  type="button"
                  className={`absolute top-2 end-2 h-7 w-7 rounded-full flex items-center justify-center ${isDark ? "hover:bg-white/10" : "hover:bg-black/5"}`}
                  onClick={() => dismissInventoryHint(hint.id)}
                  aria-label={hint.title}
                >
                  <X className="w-3.5 h-3.5 text-gray-500" />
                </button>
                <div className="flex items-start gap-2.5 sm:gap-3 pe-6">
                  <span className="text-lg sm:text-xl leading-none">{hint.icon}</span>
                  <div>
                    <p className={`text-sm font-bold ${isDark ? "text-gray-100" : "text-gray-900"}`}>{hint.title}</p>
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}

        {products.length === 0 ? (
          <Card className={`text-center py-16 rounded-3xl ${inventorySurfaceClass}`}>
            <CardContent>
              <Package className={`w-16 h-16 mx-auto mb-4 ${isDark ? "text-gray-600" : "text-gray-300"}`} />
              <h3 className={`text-xl font-bold mb-2 ${isDark ? "text-gray-300" : "text-gray-600"}`}>{t("parentInventory.noProducts")}</h3>
              <p className={`mb-6 ${isDark ? "text-gray-500" : "text-gray-400"}`}>{t("parentInventory.buyFromStore")}</p>
              <Button onClick={() => navigate("/parent-store")} className={`rounded-xl ${primaryButtonClass}`}>
                {t("parentInventory.browseStore")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {products.map((p: any) => {
              const product = p.product || {};
              const productName = product.nameAr || product.name || t("parentInventory.unknownProduct");
              const sCfg = statusConfig[p.status] || statusConfig.active;
              const StatusIcon = sCfg.icon;

              return (
                <Card key={p.id} className={`overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_32px_-24px_rgba(249,115,22,0.6)] ${productCardClass}`}>
                  <CardContent className="p-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3.5 sm:p-4">
                      <div className={`w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 shadow-sm ${isDark ? "bg-slate-800" : "bg-gradient-to-br from-gray-100 to-gray-50"}`}>
                        {product.image ? (
                          <img src={product.image} alt={productName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className={`w-8 h-8 ${isDark ? "text-gray-500" : "text-gray-300"}`} />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className={`font-bold text-base sm:text-lg truncate ${isDark ? "text-white" : "text-gray-800"}`}>{productName}</h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                          {product.price && (
                            <span className="text-orange-600 font-bold">{t("parentInventory.price", { amount: product.price })}</span>
                          )}
                          {product.pointsPrice > 0 && (
                            <span className={`text-sm flex items-center gap-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                              <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                              {t("parentInventory.pointsPrice", { count: product.pointsPrice })}
                            </span>
                          )}
                        </div>
                        <Badge className={`mt-2 text-xs border ${sCfg.color}`}>
                          <StatusIcon className="w-3 h-3 me-1" />
                          {sCfg.label}
                        </Badge>
                      </div>

                      <div className="w-full sm:w-auto sm:ms-auto">
                        {p.status === "active" ? (
                          <Button
                            onClick={() => setAssignDialog(p)}
                            className={`w-full sm:w-auto rounded-xl flex items-center justify-center gap-2 ${primaryButtonClass}`}
                          >
                            <Gift className="w-4 h-4" />
                            {t("parentInventory.assignAsGift")}
                          </Button>
                        ) : p.status === "assigned_to_child" ? (
                          <Button
                            variant="outline"
                            className={`w-full sm:w-auto rounded-xl ${isDark ? "text-blue-300 border-blue-800 bg-blue-950/20" : "text-blue-600 border-blue-200"}`}
                            disabled
                          >
                            <Truck className="w-4 h-4 me-1" />
                            {t("parentInventory.assigned")}
                          </Button>
                        ) : p.status === "pending_admin_approval" ? (
                          <Button
                            variant="outline"
                            className={`w-full sm:w-auto rounded-xl ${isDark ? "text-yellow-300 border-yellow-800 bg-yellow-950/20" : "text-yellow-600 border-yellow-200"}`}
                            disabled
                          >
                            <Clock className="w-4 h-4 me-1" />
                            {t("parentInventory.pendingApproval")}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!assignDialog} onOpenChange={(open) => { if (!open) { setAssignDialog(null); setSelectedChild(""); setRequiredPoints(""); } }}>
        <DialogContent className={`max-w-md ${dialogShellClass}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-right">
              <Gift className="w-5 h-5 text-orange-500" />
              {t("parentInventory.assignGiftToChild")}
            </DialogTitle>
          </DialogHeader>

          {assignDialog && (
            <div className="space-y-5">
              <div className={`flex items-center gap-4 p-4 rounded-xl ${isDark ? "bg-slate-800" : "bg-gradient-to-r from-orange-50 to-yellow-50"}`}>
                <div className={`w-16 h-16 rounded-lg overflow-hidden shadow-sm ${isDark ? "bg-slate-700" : "bg-white"}`}>
                  {assignDialog.product?.image ? (
                    <img src={assignDialog.product.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-50">
                      <Package className="w-6 h-6 text-gray-300" />
                    </div>
                  )}
                </div>
                <div>
                  <h4 className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                    {assignDialog.product?.nameAr || assignDialog.product?.name || t("parentInventory.product")}
                  </h4>
                  {assignDialog.product?.price && (
                    <p className="text-orange-600 font-bold">{t("parentInventory.price", { amount: assignDialog.product.price })}</p>
                  )}
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-200" : "text-gray-700"}`}>{t("parentInventory.selectChild")}</label>
                {children.length === 0 ? (
                  <p className="text-sm text-red-500">{t("parentInventory.noLinkedChildren")}</p>
                ) : (
                  <Select value={selectedChild} onValueChange={setSelectedChild}>
                    <SelectTrigger className={isDark ? "border-slate-700 bg-slate-800" : "border-orange-100 bg-white/95"}>
                      <SelectValue placeholder={t("parentInventory.selectChildPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {children.map((child: any) => (
                        <SelectItem key={child.id} value={child.id}>
                          {child.name} ({t("parentInventory.childPoints", { count: child.totalPoints || 0 })})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-200" : "text-gray-700"}`}>{t("parentInventory.requiredPointsLabel")}</label>
                <Input
                  type="number"
                  min="1"
                  value={requiredPoints}
                  onChange={(e) => setRequiredPoints(e.target.value)}
                  placeholder={t("parentInventory.pointsExample")}
                  className={isDark ? "border-slate-700 bg-slate-800" : "border-orange-100 bg-white/95"}
                />
                <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  {t("parentInventory.pointsHint")}
                </p>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => { setAssignDialog(null); setSelectedChild(""); setRequiredPoints(""); }}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  className={`w-full sm:flex-1 rounded-xl ${primaryButtonClass}`}
                  disabled={!selectedChild || !requiredPoints || assignMutation.isPending}
                  onClick={() => {
                    assignMutation.mutate({
                      id: assignDialog.id,
                      childId: selectedChild,
                      requiredPoints: parseInt(requiredPoints),
                    });
                  }}
                >
                  {assignMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {t("parentInventory.assigning")}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <NextArrow className="w-4 h-4" />
                      {t("parentInventory.assignAsGift")}
                    </span>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
