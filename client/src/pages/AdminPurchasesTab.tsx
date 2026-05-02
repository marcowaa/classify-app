import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

type RewardDraft = {
  productId: string;
  minPurchaseAmount: string;
  rewardValue: string;
};

function fetchPurchases() {
  return fetch("/api/admin/purchases", {
    headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` },
  }).then((r) => r.json());
}

export default function AdminPurchasesTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [rewardDrafts, setRewardDrafts] = React.useState<Record<string, RewardDraft>>({});

  function translateStatus(status: string) {
    const normalized = String(status || "").trim().toLowerCase();
    const key = `admin.purchasesTab.statuses.${normalized}`;
    const translated = t(key);
    return translated === key ? status : translated;
  }

  function statusBadgeClass(status: string) {
    const normalized = String(status || "").trim().toLowerCase();
    if (normalized === "approved" || normalized === "paid") {
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
    }
    if (normalized === "rejected" || normalized === "cancelled") {
      return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300";
    }
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  }

  const { data, isLoading, refetch } = useQuery<any, Error>({ queryKey: ["admin", "purchases"], queryFn: async () => {
    const res = await apiRequest("GET", "/api/admin/purchases");
    return res.json();
  } });

  const { data: productsData } = useQuery<any, Error>({
    queryKey: ["admin", "products", "reward-offer"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/products");
      return res.json();
    },
  });

  const { data: adminStatsData } = useQuery<any, Error>({
    queryKey: ["admin", "stats", "reward-offer"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/stats");
      return res.json();
    },
  });

  const products: any[] = Array.isArray(productsData?.data) ? productsData.data : [];
  const pendingRewardOffers = Number(adminStatsData?.data?.pendingRewardOffers || 0);

  async function updateStatus(id: string, status: string) {
    await apiRequest("PATCH", `/api/admin/purchases/${id}/status`, { status });
    queryClient.invalidateQueries({ queryKey: ["admin", "purchases"] });
  }

  async function sendRewardOffer(purchase: any) {
    const draft = rewardDrafts[purchase.id];
    if (!draft?.productId || !draft?.minPurchaseAmount) return;

    await apiRequest("POST", `/api/admin/purchases/${purchase.id}/reward-offer`, {
      productId: draft.productId,
      minPurchaseAmount: Number(draft.minPurchaseAmount),
      rewardValue: Number(draft.rewardValue || 0),
    });

    queryClient.invalidateQueries({ queryKey: ["admin", "purchases"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "stats", "reward-offer"] });
  }

  function updateRewardDraft(purchaseId: string, patch: Partial<RewardDraft>) {
    setRewardDrafts((prev) => {
      const current = prev[purchaseId] || {
        productId: "",
        minPurchaseAmount: "",
        rewardValue: "",
      };
      return {
        ...prev,
        [purchaseId]: {
          ...current,
          ...patch,
        },
      };
    });
  }

  if (isLoading) return <div>{t("admin.purchasesTab.loading")}</div>;

  return (
    <div className="p-4 min-h-screen dark:bg-gray-900 dark:text-gray-100">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-xl font-bold">{t("admin.purchasesTab.title")}</h2>
        <div className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-sm font-semibold text-center sm:text-start">
          {t("admin.purchasesTab.pendingRewardOffers", { count: pendingRewardOffers })}
        </div>
      </div>
      {data?.data?.length === 0 && <div className="text-gray-500 dark:text-gray-400">{t("admin.purchasesTab.noPurchases")}</div>}
      <ul className="space-y-3">
        {data?.data?.map((p: any) => (
          <li key={p.id} className="p-3 border rounded border-gray-200 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold">{t("admin.purchasesTab.order", { id: p.id })}</div>
                <div className="mt-1 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span>{t("admin.purchasesTab.status")}:</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadgeClass(p.status)}`}>
                    {translateStatus(p.status)}
                  </span>
                </div>
                <div className="text-sm">{t("admin.purchasesTab.total")}: {p.totalAmount}</div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full sm:w-auto">
                <Button onClick={() => updateStatus(p.id, "approved")} className="w-full sm:w-auto bg-green-600">{t("admin.purchasesTab.approve")}</Button>
                <Button onClick={() => updateStatus(p.id, "rejected")} className="w-full sm:w-auto bg-red-600">{t("admin.purchasesTab.reject")}</Button>
              </div>
            </div>
            <div className="mt-2">
              <strong>{t("admin.purchasesTab.items")}:</strong>
              <ul className="mt-1 space-y-1">
                {p.items?.map((it: any) => (
                  <li key={it.id} className="text-sm">{it.productName} x {it.quantity}</li>
                ))}
              </ul>
            </div>

            <div className="mt-3 p-3 rounded-lg border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-900/10 space-y-2">
              <p className="text-sm font-semibold">{t("admin.purchasesTab.rewardOfferTitle")}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {t("admin.purchasesTab.customerPurchaseAmount")}: {Number(p.totalAmount || 0).toFixed(2)}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                <select
                  value={rewardDrafts[p.id]?.productId || ""}
                  onChange={(e) => updateRewardDraft(p.id, { productId: e.target.value })}
                  className="w-full px-2 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
                >
                  <option value="">{t("admin.purchasesTab.selectGiftProduct")}</option>
                  {products.map((prod: any) => (
                    <option key={prod.id} value={prod.id}>
                      {prod.nameAr || prod.name} ({Number(prod.price || 0).toFixed(2)})
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={rewardDrafts[p.id]?.minPurchaseAmount || ""}
                  onChange={(e) => updateRewardDraft(p.id, { minPurchaseAmount: e.target.value })}
                  className="w-full px-2 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
                  placeholder={t("admin.purchasesTab.minPurchasePlaceholder")}
                />

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={rewardDrafts[p.id]?.rewardValue || ""}
                  onChange={(e) => updateRewardDraft(p.id, { rewardValue: e.target.value })}
                  className="w-full px-2 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
                  placeholder={t("admin.purchasesTab.rewardCashPlaceholder")}
                />
              </div>

              <div className="flex justify-stretch sm:justify-end">
                <Button
                  onClick={() => sendRewardOffer(p)}
                  className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700"
                  disabled={
                    !rewardDrafts[p.id]?.productId ||
                    !rewardDrafts[p.id]?.minPurchaseAmount
                  }
                >
                  {t("admin.purchasesTab.sendRewardOffer")}
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
