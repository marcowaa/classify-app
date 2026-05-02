import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";
import { apiRequest, authenticatedFetch } from "@/lib/queryClient";
import { getRelativeTimeAr, getLoginRequestStatusInfo } from "@/lib/relativeTime";
import { Check, X, Copy, Loader2, ChevronRight, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type NotificationItem = {
  id: string;
  type: string;
  title?: string | null;
  message: string;
  imageUrl?: string | null;
  isRead: boolean;
  createdAt: string;
  metadata?: Record<string, any> | null;
  loginRequestStatus?: string;
};

type NotificationPage = {
  items: NotificationItem[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

type NotificationPreferences = {
  webPushEnabled: boolean;
  mutedTypes: string[];
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
};

/* ─── Icon config ─── */
const ICON_CONFIG: Record<string, { emoji: string; bg: string }> = {
  deposit_approved: { emoji: "💳", bg: "bg-emerald-500" },
  deposit_rejected: { emoji: "💳", bg: "bg-red-500" },
  deposit_request: { emoji: "💳", bg: "bg-yellow-500" },
  purchase_request: { emoji: "🛍️", bg: "bg-purple-500" },
  purchase_approved: { emoji: "🛍️", bg: "bg-emerald-500" },
  purchase_rejected: { emoji: "🛍️", bg: "bg-red-500" },
  purchase_paid: { emoji: "🛍️", bg: "bg-emerald-500" },
  task: { emoji: "📝", bg: "bg-blue-500" },
  task_assigned: { emoji: "📝", bg: "bg-blue-500" },
  task_completed: { emoji: "✅", bg: "bg-emerald-500" },
  task_reminder: { emoji: "⏰", bg: "bg-orange-500" },
  points_earned: { emoji: "⭐", bg: "bg-yellow-500" },
  points_adjustment: { emoji: "⭐", bg: "bg-yellow-500" },
  referral_reward: { emoji: "🎉", bg: "bg-pink-500" },
  order_placed: { emoji: "📦", bg: "bg-blue-500" },
  order_confirmed: { emoji: "📦", bg: "bg-emerald-500" },
  order_shipped: { emoji: "🚚", bg: "bg-indigo-500" },
  order_delivered: { emoji: "📦", bg: "bg-emerald-500" },
  order_rejected: { emoji: "📦", bg: "bg-red-500" },
  shipment_requested: { emoji: "📦", bg: "bg-indigo-500" },
  shipping_update: { emoji: "🚚", bg: "bg-indigo-500" },
  security_alert: { emoji: "🛡️", bg: "bg-red-500" },
  login_code_request: { emoji: "🔐", bg: "bg-amber-500" },
  login_rejected: { emoji: "🚫", bg: "bg-red-500" },
  gift_unlocked: { emoji: "🎁", bg: "bg-pink-500" },
  gift_activated: { emoji: "🎁", bg: "bg-pink-500" },
  product_assigned: { emoji: "🎁", bg: "bg-purple-500" },
  reward: { emoji: "🏆", bg: "bg-yellow-500" },
  reward_unlocked: { emoji: "🏆", bg: "bg-yellow-500" },
  child_linked: { emoji: "👨‍👩‍👧", bg: "bg-blue-500" },
  child_activity: { emoji: "👧", bg: "bg-cyan-500" },
  child_logout: { emoji: "👋", bg: "bg-gray-500" },
  broadcast: { emoji: "📢", bg: "bg-blue-600" },
  system_alert: { emoji: "⚙️", bg: "bg-gray-600" },
  new_referral: { emoji: "👥", bg: "bg-teal-500" },
  withdrawal_approved: { emoji: "💰", bg: "bg-emerald-500" },
  withdrawal_rejected: { emoji: "💰", bg: "bg-red-500" },
  low_points_warning: { emoji: "⚠️", bg: "bg-orange-500" },
  game_shared: { emoji: "🎮", bg: "bg-purple-500" },
};
const getIconConfig = (type: string) => ICON_CONFIG[type] || { emoji: "🔔", bg: "bg-gray-500" };

const NAV_MAP: Record<string, string> = {
  deposit_approved: "/wallet", deposit_rejected: "/wallet", deposit_request: "/wallet",
  withdrawal_approved: "/wallet", withdrawal_rejected: "/wallet",
  purchase_request: "/parent-store", purchase_approved: "/parent-store", purchase_rejected: "/parent-store",
  purchase_paid: "/parent-store", order_placed: "/parent-store", order_confirmed: "/parent-store",
  order_shipped: "/parent-store", order_delivered: "/parent-store", order_rejected: "/parent-store",
  shipment_requested: "/parent-store", shipping_update: "/parent-store",
  task: "/parent-tasks", task_assigned: "/parent-tasks", task_completed: "/parent-tasks",
  task_reminder: "/parent-tasks", task_notification_escalation: "/parent-tasks",
  scheduled_task_unlocked: "/parent-tasks",
  points_earned: "/parent-dashboard", points_adjustment: "/parent-dashboard",
  referral_reward: "/parent-dashboard", new_referral: "/parent-dashboard",
  child_linked: "/parent-dashboard", child_activity: "/parent-dashboard",
  child_logout: "/parent-dashboard", low_points_warning: "/parent-dashboard",
  gift_unlocked: "/parent-dashboard", gift_activated: "/parent-dashboard",
  product_assigned: "/parent-dashboard", reward: "/parent-dashboard",
  reward_unlocked: "/parent-dashboard", achievement: "/parent-dashboard",
  goal_progress: "/parent-dashboard",
  scheduled_session_created: "/parent-dashboard", scheduled_session_completed: "/parent-dashboard",
  scheduled_session_activated: "/parent-dashboard",
  security_alert: "/settings", login_rejected: "/settings",
  child_pin_changed: "/settings", login_code_request: "/settings",
  game_shared: "/child-profile",
  broadcast: "/notifications", system_alert: "/notifications", info: "/notifications",
};

export const Notifications = (): JSX.Element => {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark } = useTheme();
  const isRTL = i18n.dir() === "rtl";
  const token = localStorage.getItem("token");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [prefsDraft, setPrefsDraft] = useState<NotificationPreferences | null>(null);
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  const { data: notificationsPage } = useQuery<NotificationPage>({
    queryKey: ["/api/parent/notifications", page, pageSize],
    queryFn: () =>
      authenticatedFetch<NotificationPage>(
        `/api/parent/notifications?includeMeta=1&limit=${pageSize}&offset=${offset}`
      ),
    enabled: !!token,
    refetchInterval: token ? 15000 : false,
  });

  const { data: unreadCountData } = useQuery<{ count: number }>({
    queryKey: ["/api/parent/notifications/unread-count"],
    queryFn: () => authenticatedFetch<{ count: number }>("/api/parent/notifications/unread-count"),
    enabled: !!token,
    refetchInterval: token ? 15000 : false,
  });

  const { data: notificationPrefs } = useQuery<NotificationPreferences>({
    queryKey: ["/api/parent/notification-preferences"],
    queryFn: () => authenticatedFetch<NotificationPreferences>("/api/parent/notification-preferences"),
    enabled: !!token,
  });

  useEffect(() => {
    if (notificationPrefs) {
      setPrefsDraft(notificationPrefs);
    }
  }, [notificationPrefs]);

  const allNotifications = Array.isArray(notificationsPage?.items) ? notificationsPage!.items : [];
  const displayNotifications = filter === "unread"
    ? allNotifications.filter(n => !n.isRead)
    : allNotifications;
  const total = notificationsPage?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const unreadCount = unreadCountData?.count || 0;

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  // If unread notifications exist while user is on later pages, jump to page 1
  // so newly arrived items are immediately visible.
  useEffect(() => {
    if (unreadCount > 0 && page > 1) {
      setPage(1);
    }
  }, [unreadCount, page]);

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/parent/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parent/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/notifications/unread-count"] });
    },
  });

  const respondToLoginMutation = useMutation({
    mutationFn: ({ notificationId, action }: { notificationId: string; action: "approve" | "reject" }) =>
      apiRequest("POST", `/api/parent/notifications/${notificationId}/respond-login`, { action }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/parent/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/notifications/unread-count"] });
      toast({
        title: variables.action === "approve" ? t("notifications.approved") : t("notifications.rejected"),
        description: variables.action === "approve" ? t("notifications.loginApproved") : t("notifications.loginRejected"),
      });
    },
    onError: () => {
      toast({ title: t("notifications.error"), description: t("notifications.tryAgain"), variant: "destructive" });
    },
  });

  const respondToRewardMutation = useMutation({
    mutationFn: ({ notificationId, action }: { notificationId: string; action: "accept_product" | "cash_exchange" }) =>
      apiRequest("POST", `/api/parent/notifications/${notificationId}/respond-reward-offer`, { action }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parent/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/notifications/unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["parent-wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/owned-products"] });
      toast({ title: "تم تنفيذ اختيار الهدية بنجاح" });
    },
    onError: () => {
      toast({ title: t("notifications.error"), description: t("notifications.tryAgain"), variant: "destructive" });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/parent/notifications/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parent/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/notifications/unread-count"] });
      toast({ title: t("notifications.markedAllRead") });
    },
  });

  const savePrefsMutation = useMutation({
    mutationFn: async () => {
      if (!prefsDraft) return;
      await authenticatedFetch<NotificationPreferences>("/api/parent/notification-preferences", {
        method: "PUT",
        body: prefsDraft,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parent/notification-preferences"] });
      toast({ title: "تم حفظ تفضيلات الإشعارات" });
    },
    onError: () => {
      toast({ title: "فشل حفظ التفضيلات", variant: "destructive" });
    },
  });

  // Keep notifications unread until user explicitly opens/acts on each item.

  const copyCode = (code: string, notificationId: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(notificationId);
    toast({ title: t("notifications.codeCopied") });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleNotificationClick = (notification: NotificationItem) => {
    if (!notification.isRead) markReadMutation.mutate(notification.id);
    const target = NAV_MAP[notification.type];
    if (target) navigate(target);
  };

  const pageShellClass = isDark
    ? "bg-gradient-to-b from-slate-950 via-slate-900 to-gray-900"
    : "bg-gradient-to-b from-blue-50 via-cyan-50 to-gray-50";
  const surfaceClass = isDark
    ? "border border-white/10 bg-slate-900/82 backdrop-blur-xl shadow-[0_20px_34px_-24px_rgba(0,0,0,0.85)]"
    : "border border-white/70 bg-white/92 backdrop-blur-xl shadow-[0_20px_34px_-24px_rgba(15,23,42,0.55)]";
  const raisedControlClass = isDark
    ? "rounded-2xl border border-white/10 bg-slate-800/75 shadow-[0_14px_20px_-16px_rgba(0,0,0,0.85)] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-[1px]"
    : "rounded-2xl border border-white/45 bg-white/20 shadow-[0_14px_20px_-16px_rgba(15,23,42,0.65)] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-[1px]";
  const primaryButtonClass = "bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 hover:from-blue-600 hover:via-indigo-600 hover:to-purple-600 text-white shadow-[0_14px_24px_-14px_rgba(59,130,246,0.95)]";

  return (
    <div className={`relative min-h-screen overflow-x-clip ${pageShellClass}`} dir={isRTL ? "rtl" : "ltr"}>
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className={`absolute -top-24 ${isRTL ? "-left-24" : "-right-24"} h-72 w-72 rounded-full ${isDark ? "bg-cyan-500/18" : "bg-cyan-300/40"} blur-3xl`} />
        <div className={`absolute top-1/3 ${isRTL ? "-right-24" : "-left-24"} h-80 w-80 rounded-full ${isDark ? "bg-indigo-500/12" : "bg-indigo-200/55"} blur-3xl`} />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-3 sm:px-4 py-5 sm:py-6">
        {/* Header */}
        <div className={`mb-4 rounded-2xl p-3 sm:p-4 ${surfaceClass}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.history.length > 1 ? window.history.back() : navigate("/parent-dashboard")}
                className={`h-11 w-11 flex items-center justify-center ${raisedControlClass}`}
              >
                <ArrowRight className={`h-5 w-5 ${isRTL ? "" : "rotate-180"}`} />
              </button>
              <h1 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                {t("notifications.title")}
              </h1>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className={`text-sm font-semibold px-4 py-2 rounded-xl transition-colors ${isDark ? "text-blue-300 bg-slate-800 hover:bg-slate-700" : "text-blue-700 bg-blue-50 hover:bg-blue-100"}`}
              >
                {markAllReadMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("notifications.markAllAsRead")}
              </button>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        <div className={`mb-4 rounded-2xl p-2.5 ${surfaceClass}`}>
          <div className="flex gap-2">
            <button
              onClick={() => { setFilter("all"); setPage(1); }}
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${filter === "all"
                  ? primaryButtonClass
                  : isDark ? "bg-slate-800 text-gray-300 hover:bg-slate-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
            >
              {t("notifications.all")}
            </button>
            <button
              onClick={() => { setFilter("unread"); setPage(1); }}
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${filter === "unread"
                  ? primaryButtonClass
                  : isDark ? "bg-slate-800 text-gray-300 hover:bg-slate-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
            >
              {t("notifications.unread")} {unreadCount > 0 && `(${unreadCount})`}
            </button>
          </div>
        </div>

        {prefsDraft && (
          <div className={`mb-4 rounded-2xl p-4 ${surfaceClass}`}>
            <h2 className={`text-sm font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>تفضيلات Web Push</h2>

            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={prefsDraft.webPushEnabled}
                  onChange={(e) => setPrefsDraft({ ...prefsDraft, webPushEnabled: e.target.checked })}
                />
                <span>تفعيل إشعارات Web Push</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-xs">
                  <span className={isDark ? "text-gray-300" : "text-gray-600"}>بداية الوقت الهادئ (HH:mm)</span>
                  <input
                    type="time"
                    value={prefsDraft.quietHoursStart || ""}
                    onChange={(e) => setPrefsDraft({ ...prefsDraft, quietHoursStart: e.target.value || null })}
                    className={`mt-1 w-full px-2 py-1.5 rounded border ${isDark ? "bg-[#18191a] border-gray-700 text-gray-100" : "bg-white border-gray-300 text-gray-900"}`}
                  />
                </label>

                <label className="text-xs">
                  <span className={isDark ? "text-gray-300" : "text-gray-600"}>نهاية الوقت الهادئ (HH:mm)</span>
                  <input
                    type="time"
                    value={prefsDraft.quietHoursEnd || ""}
                    onChange={(e) => setPrefsDraft({ ...prefsDraft, quietHoursEnd: e.target.value || null })}
                    className={`mt-1 w-full px-2 py-1.5 rounded border ${isDark ? "bg-[#18191a] border-gray-700 text-gray-100" : "bg-white border-gray-300 text-gray-900"}`}
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!prefsDraft.mutedTypes.includes("broadcast")}
                    onChange={(e) => {
                      const muted = new Set(prefsDraft.mutedTypes);
                      if (e.target.checked) muted.delete("broadcast");
                      else muted.add("broadcast");
                      setPrefsDraft({ ...prefsDraft, mutedTypes: Array.from(muted) });
                    }}
                  />
                  <span>استقبال broadcast</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!prefsDraft.mutedTypes.includes("login_code_request")}
                    onChange={(e) => {
                      const muted = new Set(prefsDraft.mutedTypes);
                      if (e.target.checked) muted.delete("login_code_request");
                      else muted.add("login_code_request");
                      setPrefsDraft({ ...prefsDraft, mutedTypes: Array.from(muted) });
                    }}
                  />
                  <span>استقبال طلبات تسجيل الدخول</span>
                </label>
              </div>

              <div>
                <button
                  onClick={() => savePrefsMutation.mutate()}
                  disabled={savePrefsMutation.isPending}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold ${primaryButtonClass} disabled:opacity-60`}
                >
                  {savePrefsMutation.isPending ? "جاري الحفظ..." : "حفظ التفضيلات"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notifications list */}
        <div className={`rounded-2xl overflow-hidden ${surfaceClass}`}>
          {displayNotifications.length === 0 ? (
            <div className="py-20 text-center">
              <div className="text-5xl mb-4">🔔</div>
              <p className={`text-base font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                {filter === "unread" ? t("notifications.noUnreadNotifications") : t("notifications.noNotifications")}
              </p>
            </div>
          ) : (
            displayNotifications.map((notification) => {
              const isLogin = notification.type === "login_code_request";
              const loginStatus = notification.loginRequestStatus || "pending";
              const canRespond = isLogin && loginStatus === "pending";
              const rewardOffer = notification.metadata?.rewardOffer as any;
              const isRewardOffer = notification.type === "reward_unlocked" && !!rewardOffer;
              const rewardPending = isRewardOffer && String(rewardOffer?.claimStatus || "pending") === "pending";
              const parentCode = notification.metadata?.parentCode;
              const imageUrl =
                (typeof notification.imageUrl === "string" && notification.imageUrl.trim()) ||
                (typeof notification.metadata?.imageUrl === "string" && notification.metadata.imageUrl.trim()) ||
                "";
              const iconCfg = getIconConfig(notification.type);
              const navTarget = NAV_MAP[notification.type];
              const isClickable = !isLogin && !isRewardOffer && !!navTarget;

              return (
                <div
                  key={notification.id}
                  data-notif-id={notification.id}
                  data-notif-read={String(notification.isRead)}
                  className={`flex items-start gap-3 px-4 py-3 transition-colors duration-150 border-b last:border-b-0 ${isDark ? "border-gray-700/50" : "border-gray-100"
                    } ${!notification.isRead
                      ? isDark ? "bg-blue-950/25" : "bg-blue-50/70"
                      : ""
                    } ${isClickable ? "cursor-pointer" : ""} ${isDark ? "hover:bg-slate-800/70" : "hover:bg-white"
                    }`}
                  onClick={() => isClickable && handleNotificationClick(notification)}
                >
                  {/* Avatar icon */}
                  <div className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-xl ${iconCfg.bg}`}>
                    {iconCfg.emoji}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-relaxed ${!notification.isRead ? "font-semibold" : "font-normal"
                      } ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                      {notification.title && (
                        <span className={`${isDark ? "text-white" : "text-gray-900"}`}>
                          {notification.title}
                        </span>
                      )}
                      {notification.title && " — "}
                      <span className={isDark ? "text-gray-300" : "text-gray-600"}>
                        {notification.message}
                      </span>
                    </p>

                    {/* Relative time */}
                    <p className={`text-xs mt-1 ${!notification.isRead
                        ? "text-blue-500 font-semibold"
                        : isDark ? "text-gray-500" : "text-gray-400"
                      }`}>
                      {getRelativeTimeAr(notification.createdAt)}
                    </p>

                    {imageUrl && (
                      <img
                        src={imageUrl}
                        alt={notification.title || "notification image"}
                        className="mt-3 w-full max-w-md rounded-lg border object-cover"
                        loading="lazy"
                      />
                    )}

                    {/* Login request status badge */}
                    {isLogin && loginStatus !== "pending" && (
                      <div className="mt-2">
                        {(() => {
                          const statusInfo = getLoginRequestStatusInfo(loginStatus);
                          return (
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${statusInfo.color} ${statusInfo.bgColor}`}>
                              {statusInfo.icon} {statusInfo.label}
                            </span>
                          );
                        })()}
                      </div>
                    )}

                    {/* Login request: approve/reject buttons (only when pending) */}
                    {isLogin && canRespond && (
                      <div className="mt-3 space-y-2">
                        {parentCode && (
                          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isDark ? "bg-slate-800" : "bg-gray-100"
                            }`}>
                            <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t("notifications.linkCode")}</span>
                            <span className="font-mono font-bold text-lg text-orange-500">{parentCode}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); copyCode(parentCode, notification.id); }}
                              className={`p-1.5 rounded-lg transition-colors ${copiedCode === notification.id
                                  ? "bg-green-500 text-white"
                                  : isDark ? "bg-gray-600 hover:bg-gray-500 text-gray-300" : "bg-gray-200 hover:bg-gray-300"
                                }`}
                            >
                              {copiedCode === notification.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); respondToLoginMutation.mutate({ notificationId: notification.id, action: "approve" }); }}
                            disabled={respondToLoginMutation.isPending}
                            className="flex-1 py-2.5 bg-gradient-to-br from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 shadow-[0_12px_22px_-16px_rgba(16,185,129,0.9)]"
                          >
                            {respondToLoginMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> {t("notifications.approve")}</>}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); respondToLoginMutation.mutate({ notificationId: notification.id, action: "reject" }); }}
                            disabled={respondToLoginMutation.isPending}
                            className="flex-1 py-2.5 bg-gradient-to-br from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 shadow-[0_12px_22px_-16px_rgba(239,68,68,0.9)]"
                          >
                            {respondToLoginMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><X className="w-4 h-4" /> {t("notifications.reject")}</>}
                          </button>
                        </div>
                      </div>
                    )}

                    {isRewardOffer && (
                      <div className="mt-3 space-y-2">
                        <div className={`px-3 py-2 rounded-lg ${isDark ? "bg-[#3a3b3c]" : "bg-gray-100"}`}>
                          <p className="text-xs text-gray-500 mb-1">عرض هدية مشتريات</p>
                          <p className="text-sm font-semibold">
                            قيمة المشتريات: {Number(rewardOffer?.purchaseAmount || 0).toFixed(2)}
                          </p>
                          <p className="text-sm">
                            قيمة الهدية: {Number(rewardOffer?.rewardValue || 0).toFixed(2)}
                          </p>
                          {rewardOffer?.productName && (
                            <p className="text-sm">المنتج: {rewardOffer.productName}</p>
                          )}
                        </div>

                        {rewardPending ? (
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                respondToRewardMutation.mutate({ notificationId: notification.id, action: "accept_product" });
                              }}
                              disabled={respondToRewardMutation.isPending}
                              className="flex-1 py-2.5 bg-gradient-to-br from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 shadow-[0_12px_22px_-16px_rgba(16,185,129,0.9)]"
                            >
                              {respondToRewardMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> تأكيد الاستلام</>}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                respondToRewardMutation.mutate({ notificationId: notification.id, action: "cash_exchange" });
                              }}
                              disabled={respondToRewardMutation.isPending}
                              className="flex-1 py-2.5 bg-gradient-to-br from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 shadow-[0_12px_22px_-16px_rgba(249,115,22,0.95)]"
                            >
                              {respondToRewardMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ArrowRight className="w-4 h-4" /> استبدال مالي</>}
                            </button>
                          </div>
                        ) : (
                          <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            تم تنفيذ هذا العرض مسبقًا.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Navigation hint */}
                    {isClickable && (
                      <div className={`flex items-center gap-1 mt-1 text-xs ${isDark ? "text-blue-400" : "text-blue-500"}`}>
                        <ChevronRight className="w-3 h-3 rtl:rotate-180" />
                        <span>{t("notifications.clickToNavigate")}</span>
                      </div>
                    )}
                  </div>

                  {/* Unread blue dot */}
                  {!notification.isRead && (
                    <div className="shrink-0 mt-5">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {total > pageSize && (
          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
              className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors disabled:opacity-40 ${isDark
                  ? "bg-slate-800 text-white hover:bg-slate-700"
                  : "bg-white text-gray-700 hover:bg-gray-50 shadow-sm"
                }`}
            >
              {t("notifications.previous")}
            </button>

            <span className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              {page} / {totalPages}
            </span>

            <button
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
              className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors disabled:opacity-40 ${primaryButtonClass}`}
            >
              {t("notifications.next")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
