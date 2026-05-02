import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

interface RewardOfferItem {
  id: string;
  parentId: string;
  parentName: string;
  parentEmail?: string | null;
  purchaseId?: string | null;
  createdAt: string;
  message: string;
  rewardOffer?: {
    productName?: string;
    rewardValue?: number;
    purchaseAmount?: number;
    minPurchaseAmount?: number;
    claimStatus?: "pending" | "accepted_product" | "cash_exchanged" | string;
    claimedAt?: string;
  };
}

interface RewardOffersResponse {
  items: RewardOfferItem[];
  summary: {
    total: number;
    pending: number;
    acceptedProduct: number;
    cashExchanged: number;
    cancelled: number;
  };
}

interface AdminOwnNotificationItem {
  id: string;
  type: string;
  title?: string | null;
  message: string;
  createdAt: string;
  metadata?: {
    parentName?: string;
    action?: "accept_product" | "cash_exchange" | string;
    rewardOffer?: {
      purchaseId?: string;
      rewardValue?: number;
      claimStatus?: string;
    };
  } | null;
}

interface AdminOwnNotificationsResponse {
  items: AdminOwnNotificationItem[];
}

export function RewardOffersTab({ token }: { token: string }) {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "accepted_product" | "cash_exchanged" | "cancelled_by_admin" | "replaced_by_resend">("all");
  const [parentFilter, setParentFilter] = useState("");
  const [busyOfferId, setBusyOfferId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-reward-offers", statusFilter, parentFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (parentFilter.trim()) params.set("parentId", parentFilter.trim());

      const res = await fetch(`/api/admin/reward-offers?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return (json?.data || { items: [], summary: { total: 0, pending: 0, acceptedProduct: 0, cashExchanged: 0, cancelled: 0 } }) as RewardOffersResponse;
    },
    enabled: !!token,
  });

  const { data: adminUpdatesData, isLoading: adminUpdatesLoading } = useQuery({
    queryKey: ["admin-reward-offer-updates-feed"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/own-notifications?limit=30&offset=0`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return (json?.data || { items: [] }) as AdminOwnNotificationsResponse;
    },
    enabled: !!token,
  });

  const items = data?.items || [];
  const summary = data?.summary || { total: 0, pending: 0, acceptedProduct: 0, cashExchanged: 0, cancelled: 0 };
  const adminRewardUpdates = (adminUpdatesData?.items || []).filter((n) => n.type === "reward_offer_updated");

  const statusLabel = useMemo(() => ({
    pending: t("admin.rewardOffers.status.pending"),
    accepted_product: t("admin.rewardOffers.status.acceptedProduct"),
    cash_exchanged: t("admin.rewardOffers.status.cashExchanged"),
    cancelled_by_admin: t("admin.rewardOffers.status.cancelledByAdmin"),
    replaced_by_resend: t("admin.rewardOffers.status.replacedByResend"),
  }), [t]);

  const statusTone = (status: string) => {
    if (status === "accepted_product") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
    if (status === "cash_exchanged") return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
    if (status === "cancelled_by_admin" || status === "replaced_by_resend") return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300";
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  };

  const runAdminAction = async (id: string, action: "resend" | "cancel") => {
    setBusyOfferId(id);
    try {
      const endpoint = action === "resend"
        ? `/api/admin/reward-offers/${id}/resend`
        : `/api/admin/reward-offers/${id}/cancel`;

      const method = action === "resend" ? "POST" : "PATCH";
      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || t("admin.rewardOffers.errors.actionFailed"));
      }

      await refetch();
    } catch (error: any) {
      // Keep UX simple in this admin tool tab.
      alert(error?.message || t("admin.rewardOffers.errors.applyActionFailed"));
    } finally {
      setBusyOfferId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="rounded-lg border p-3 bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
          <p className="text-xs text-gray-500">{t("admin.rewardOffers.summary.totalOffers")}</p>
          <p className="text-xl font-bold">{summary.total}</p>
        </div>
        <div className="rounded-lg border p-3 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700">
          <p className="text-xs text-amber-600">{t("admin.rewardOffers.summary.pending")}</p>
          <p className="text-xl font-bold text-amber-700 dark:text-amber-300">{summary.pending}</p>
        </div>
        <div className="rounded-lg border p-3 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700">
          <p className="text-xs text-emerald-600">{t("admin.rewardOffers.summary.acceptedProduct")}</p>
          <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{summary.acceptedProduct}</p>
        </div>
        <div className="rounded-lg border p-3 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700">
          <p className="text-xs text-blue-600">{t("admin.rewardOffers.summary.cashExchanged")}</p>
          <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{summary.cashExchanged}</p>
        </div>
        <div className="rounded-lg border p-3 bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-700">
          <p className="text-xs text-rose-600">{t("admin.rewardOffers.summary.cancelled")}</p>
          <p className="text-xl font-bold text-rose-700 dark:text-rose-300">{summary.cancelled || 0}</p>
        </div>
      </div>

      <div className="rounded-lg border p-3 bg-white dark:bg-gray-800 dark:border-gray-700">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full px-2 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
          >
            <option value="all">{t("admin.rewardOffers.filters.allStatuses")}</option>
            <option value="pending">{t("admin.rewardOffers.status.pending")}</option>
            <option value="accepted_product">{t("admin.rewardOffers.status.acceptedProduct")}</option>
            <option value="cash_exchanged">{t("admin.rewardOffers.status.cashExchanged")}</option>
            <option value="cancelled_by_admin">{t("admin.rewardOffers.status.cancelledByAdmin")}</option>
            <option value="replaced_by_resend">{t("admin.rewardOffers.status.replacedByResend")}</option>
          </select>
          <input
            type="text"
            value={parentFilter}
            onChange={(e) => setParentFilter(e.target.value)}
            placeholder={t("admin.rewardOffers.filters.parentIdPlaceholder")}
            className="w-full px-2 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
          />
          <button
            onClick={() => refetch()}
            className="w-full px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            {t("admin.rewardOffers.actions.refresh")}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-10">{t("admin.rewardOffers.states.loading")}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-10 text-gray-500">{t("admin.rewardOffers.states.empty")}</div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const offer = item.rewardOffer || {};
            const claimStatus = String(offer.claimStatus || "pending");
            return (
              <div key={item.id} className="rounded-lg border p-4 bg-white dark:bg-gray-800 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold break-words">{item.parentName} ({item.parentId.slice(0, 8)}...)</p>
                    <p className="text-xs text-gray-500 mt-1 break-words">{t("admin.rewardOffers.fields.purchase")}: {String(item.purchaseId || "-").slice(0, 8)}...</p>
                    <p className="text-xs text-gray-500">{new Date(item.createdAt).toLocaleString()}</p>
                  </div>
                  <span className={`self-start px-2 py-1 rounded-full text-xs font-semibold ${statusTone(claimStatus)}`}>
                    {statusLabel[claimStatus as keyof typeof statusLabel] || claimStatus}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <p>{t("admin.rewardOffers.fields.product")}: <span className="font-semibold">{offer.productName || "-"}</span></p>
                  <p>{t("admin.rewardOffers.fields.purchaseAmount")}: <span className="font-semibold">{Number(offer.purchaseAmount || 0).toFixed(2)}</span></p>
                  <p>{t("admin.rewardOffers.fields.minAmount")}: <span className="font-semibold">{Number(offer.minPurchaseAmount || 0).toFixed(2)}</span></p>
                  <p>{t("admin.rewardOffers.fields.rewardValue")}: <span className="font-semibold">{Number(offer.rewardValue || 0).toFixed(2)}</span></p>
                </div>

                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{item.message}</p>
                {offer.claimedAt && (
                  <p className="mt-1 text-xs text-gray-500">{t("admin.rewardOffers.fields.claimedAt")}: {new Date(offer.claimedAt).toLocaleString()}</p>
                )}

                {claimStatus === "pending" && (
                  <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
                    <button
                      onClick={() => runAdminAction(item.id, "resend")}
                      disabled={busyOfferId === item.id}
                      className="w-full sm:w-auto px-3 py-1.5 rounded bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60 text-xs font-semibold"
                    >
                      {busyOfferId === item.id ? "..." : t("admin.rewardOffers.actions.resend")}
                    </button>
                    <button
                      onClick={() => runAdminAction(item.id, "cancel")}
                      disabled={busyOfferId === item.id}
                      className="w-full sm:w-auto px-3 py-1.5 rounded bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60 text-xs font-semibold"
                    >
                      {busyOfferId === item.id ? "..." : t("admin.rewardOffers.actions.cancel")}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-lg border p-3 bg-white dark:bg-gray-800 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <h3 className="text-sm font-semibold">{t("admin.rewardOffers.updates.title")}</h3>
          <span className="text-xs text-gray-500">{t("admin.rewardOffers.updates.subtitle")}</span>
        </div>

        {adminUpdatesLoading ? (
          <div className="text-sm text-gray-500 py-3">{t("admin.rewardOffers.updates.loading")}</div>
        ) : adminRewardUpdates.length === 0 ? (
          <div className="text-sm text-gray-500 py-3">{t("admin.rewardOffers.updates.empty")}</div>
        ) : (
          <div className="space-y-2">
            {adminRewardUpdates.slice(0, 10).map((n) => {
              const action = String(n.metadata?.action || "");
              const purchaseId = String(n.metadata?.rewardOffer?.purchaseId || "-");
              const rewardValue = Number(n.metadata?.rewardOffer?.rewardValue || 0);
              const actionText = action === "accept_product"
                ? t("admin.rewardOffers.status.acceptedProduct")
                : action === "cash_exchange"
                ? t("admin.rewardOffers.status.cashExchanged")
                : t("admin.rewardOffers.status.updated");

              return (
                <div key={n.id} className="rounded border p-3 bg-gray-50 dark:bg-gray-900/40 dark:border-gray-700">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold break-words">{n.metadata?.parentName || t("admin.rewardOffers.fields.parent")} · {actionText}</p>
                      <p className="text-xs text-gray-500 break-words">{t("admin.rewardOffers.fields.purchase")}: {purchaseId}</p>
                      <p className="text-xs text-gray-500">{new Date(n.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="text-xs font-semibold text-blue-600 dark:text-blue-300 self-start">
                      {rewardValue > 0 ? rewardValue.toFixed(2) : "-"}
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-300 break-words">{n.message}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default RewardOffersTab;
