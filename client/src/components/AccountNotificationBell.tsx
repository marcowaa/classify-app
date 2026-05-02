import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { Bell, X, CheckCheck, Loader2 } from "lucide-react";
import { getRelativeTimeAr } from "@/lib/relativeTime";
import { emitNotificationSync, notificationSyncEventName } from "@/lib/notificationRealtime";

export type NotificationItem = {
  id: string;
  type: string;
  title?: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
  metadata?: Record<string, any> | null;
};

type NotificationPage = {
  items: NotificationItem[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

const NOTIFICATION_AVATARS: Record<string, { emoji: string; bg: string }> = {
  deposit_request: { emoji: "💳", bg: "bg-purple-500" },
  deposit_approved: { emoji: "✅", bg: "bg-green-500" },
  deposit_rejected: { emoji: "❌", bg: "bg-red-500" },
  purchase_paid: { emoji: "🛍️", bg: "bg-blue-500" },
  purchase_request: { emoji: "🛒", bg: "bg-blue-400" },
  purchase_approved: { emoji: "✅", bg: "bg-green-500" },
  purchase_rejected: { emoji: "❌", bg: "bg-red-500" },
  shipment_requested: { emoji: "📦", bg: "bg-orange-500" },
  shipping_update: { emoji: "🚚", bg: "bg-orange-400" },
  new_registration: { emoji: "👤", bg: "bg-teal-500" },
  new_user: { emoji: "👤", bg: "bg-teal-500" },
  security_alert: { emoji: "🔐", bg: "bg-red-600" },
  login_code_request: { emoji: "🔑", bg: "bg-yellow-500" },
  login_rejected: { emoji: "🚫", bg: "bg-red-500" },
  withdrawal_approved: { emoji: "💰", bg: "bg-emerald-500" },
  withdrawal_rejected: { emoji: "❌", bg: "bg-red-500" },
  points_earned: { emoji: "⭐", bg: "bg-yellow-400" },
  points_adjustment: { emoji: "⚖️", bg: "bg-indigo-500" },
  broadcast: { emoji: "📢", bg: "bg-blue-600" },
  system_alert: { emoji: "⚙️", bg: "bg-gray-500" },
  task_completed: { emoji: "✅", bg: "bg-green-400" },
  order_placed: { emoji: "🛒", bg: "bg-blue-500" },
  order_shipped: { emoji: "📦", bg: "bg-orange-500" },
  order_delivered: { emoji: "🎉", bg: "bg-green-500" },
  gift_unlocked: { emoji: "🎁", bg: "bg-pink-500" },
  referral_reward: { emoji: "🤝", bg: "bg-cyan-500" },
  reward_offer_updated: { emoji: "🎯", bg: "bg-amber-500" },
};

const getNotificationAvatar = (type: string) => {
  return NOTIFICATION_AVATARS[type] || { emoji: "🔔", bg: "bg-gray-400" };
};

interface AccountNotificationBellProps {
  tokenKey: string;
  apiBase: string;
  queryKeyPrefix: string;
  bellColorClass?: string;
  sseEnabled?: boolean;
  sseStreamUrl?: string;
  onNotificationClick?: (notification: NotificationItem) => void;
}

function AccountNotificationBell({ tokenKey, apiBase, queryKeyPrefix, bellColorClass, sseEnabled, sseStreamUrl, onNotificationClick }: AccountNotificationBellProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const [, navigate] = useLocation();
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const token = localStorage.getItem(tokenKey);

  const { data: notificationsPage } = useQuery<NotificationPage>({
    queryKey: [queryKeyPrefix + "-notifications"],
    queryFn: async () => {
      const res = await fetch(`${apiBase}?limit=20&offset=0`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return json?.data || { items: [], total: 0, limit: 20, offset: 0, hasMore: false };
    },
    enabled: !!token,
    refetchInterval: token ? (sseEnabled ? 30000 : 5000) : false,
  });

  const { data: unreadCountData } = useQuery<{ count: number }>({
    queryKey: [queryKeyPrefix + "-notifications-unread-count"],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return json?.data || { count: 0 };
    },
    enabled: !!token,
    refetchInterval: token ? (sseEnabled ? 30000 : 5000) : false,
  });

  // SSE real-time connection
  const handleSSENotification = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [queryKeyPrefix + "-notifications"] });
    queryClient.invalidateQueries({ queryKey: [queryKeyPrefix + "-notifications-unread-count"] });
    const roleLabel =
      queryKeyPrefix === "teacher"
        ? "المعلم"
        : queryKeyPrefix === "school"
          ? "المدرسة"
          : queryKeyPrefix === "library"
            ? "المتجر"
            : queryKeyPrefix === "admin-own"
              ? "الإدارة"
              : "الحساب";
    emitNotificationSync({
      source: "sse",
      title: `إشعار جديد (${roleLabel})`,
      body: "تم استلام إشعار جديد وتم تحديث الكارت فورًا",
      url: "/notifications",
    });
  }, [queryClient, queryKeyPrefix]);

  useEffect(() => {
    if (!sseEnabled || !sseStreamUrl || !token) return;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout>;
    let reconnectDelay = 1000;
    const MAX_DELAY = 30000;
    let disposed = false;

    const connect = () => {
      if (disposed) return;
      const url = `${sseStreamUrl}?token=${encodeURIComponent(token)}`;
      eventSource = new EventSource(url);

      eventSource.addEventListener("notification", () => {
        handleSSENotification();
      });

      eventSource.addEventListener("ready", () => {
        reconnectDelay = 1000;
      });

      eventSource.onerror = () => {
        eventSource?.close();
        eventSource = null;
        if (!disposed) {
          reconnectTimeout = setTimeout(connect, reconnectDelay);
          reconnectDelay = Math.min(reconnectDelay * 2, MAX_DELAY);
        }
      };
    };

    connect();

    return () => {
      disposed = true;
      clearTimeout(reconnectTimeout);
      eventSource?.close();
    };
  }, [sseEnabled, sseStreamUrl, token, handleSSENotification]);

  const unreadCount = unreadCountData?.count || 0;
  const notifications = notificationsPage?.items || [];

  useEffect(() => {
    const onSync = () => {
      queryClient.invalidateQueries({ queryKey: [queryKeyPrefix + "-notifications"] });
      queryClient.invalidateQueries({ queryKey: [queryKeyPrefix + "-notifications-unread-count"] });
    };
    const eventName = notificationSyncEventName();
    window.addEventListener(eventName, onSync as EventListener);
    return () => {
      window.removeEventListener(eventName, onSync as EventListener);
    };
  }, [queryClient, queryKeyPrefix]);

  const setNotificationsOptimistic = useCallback((updater: (items: NotificationItem[]) => NotificationItem[]) => {
    queryClient.setQueryData<NotificationPage | undefined>(
      [queryKeyPrefix + "-notifications"],
      (prev) => {
        if (!prev) return prev;
        return { ...prev, items: updater(prev.items || []) };
      }
    );
  }, [queryClient, queryKeyPrefix]);

  const setUnreadCountOptimistic = useCallback((updater: (count: number) => number) => {
    queryClient.setQueryData<{ count: number } | undefined>(
      [queryKeyPrefix + "-notifications-unread-count"],
      (prev) => ({ count: Math.max(0, updater(prev?.count || 0)) })
    );
  }, [queryClient, queryKeyPrefix]);

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`${apiBase}/${id}/read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onMutate: (id) => {
      let wasUnread = false;
      setNotificationsOptimistic((items) =>
        items.map((item) => {
          if (item.id !== id) return item;
          wasUnread = !item.isRead;
          return { ...item, isRead: true };
        })
      );
      if (wasUnread) setUnreadCountOptimistic((count) => count - 1);
      emitNotificationSync({ source: "action" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeyPrefix + "-notifications"] });
      queryClient.invalidateQueries({ queryKey: [queryKeyPrefix + "-notifications-unread-count"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await fetch(`${apiBase}/read-all`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onMutate: () => {
      setNotificationsOptimistic((items) => items.map((item) => ({ ...item, isRead: true })));
      queryClient.setQueryData([queryKeyPrefix + "-notifications-unread-count"], { count: 0 });
      emitNotificationSync({ source: "action" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeyPrefix + "-notifications"] });
      queryClient.invalidateQueries({ queryKey: [queryKeyPrefix + "-notifications-unread-count"] });
    },
  });

  const claimHelpRequestMutation = useMutation({
    mutationFn: async (helpRequestId: string) => {
      if (tokenKey !== "teacherToken") throw new Error("CLAIM_NOT_SUPPORTED");
      const res = await fetch(`/api/teacher/help-requests/${helpRequestId}/claim`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "فشل استلام الطلب");
      return json;
    },
    onSuccess: (_data, helpRequestId) => {
      queryClient.invalidateQueries({ queryKey: [queryKeyPrefix + "-notifications"] });
      queryClient.invalidateQueries({ queryKey: [queryKeyPrefix + "-notifications-unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-help-requests"] });
      setIsOpen(false);
      navigate(`/teacher-dashboard?tab=help-requests&helpRequestId=${encodeURIComponent(helpRequestId)}&openChat=1`);
    },
  });

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        bellRef.current && !bellRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        ref={bellRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-full transition-all duration-200 ${isDark ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
        aria-label="Notifications"
      >
        <Bell className={`h-5 w-5 ${bellColorClass || ""}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-[18px] min-w-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-sm animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Overlay Panel — Facebook-style */}
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <div className="fixed inset-0 z-[10020] bg-black/20 sm:hidden" onClick={() => setIsOpen(false)} role="presentation" />

          <div
            ref={panelRef}
            className={`fixed sm:absolute left-4 right-4 sm:ltr:left-auto sm:ltr:right-0 sm:rtl:right-auto sm:rtl:left-0 top-16 sm:top-full sm:mt-2 z-[10030] w-auto sm:w-[420px] max-h-[80vh] rounded-2xl shadow-2xl border overflow-hidden ${
              isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
            }`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? "border-gray-700" : "border-gray-100"}`}>
              <h3 className={`font-bold text-lg ${isDark ? "text-white" : "text-gray-900"}`}>
                الإشعارات
              </h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllReadMutation.mutate()}
                    disabled={markAllReadMutation.isPending}
                    className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors font-medium ${isDark ? "text-blue-400 hover:bg-gray-700" : "text-blue-600 hover:bg-blue-50"}`}
                    title="قراءة الكل"
                  >
                    <CheckCheck className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className={`p-1.5 rounded-full ${isDark ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
                  aria-label="Close notifications"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto max-h-[65vh]">
              {notifications.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="text-4xl mb-3">🔔</div>
                  <p className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>لا توجد إشعارات</p>
                </div>
              ) : (
                notifications.map((notification) => {
                  const avatar = getNotificationAvatar(notification.type);
                  const helpRequestId = String(notification.metadata?.helpRequestId || "").trim();
                  const canClaimTeacherHelp =
                    tokenKey === "teacherToken" &&
                    notification.type === "task_help_requested" &&
                    notification.metadata?.canClaim === true &&
                    !!helpRequestId;
                  return (
                    <div
                      key={notification.id}
                      className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${
                        !notification.isRead
                          ? isDark ? "bg-blue-900/20 hover:bg-blue-900/30" : "bg-blue-50/80 hover:bg-blue-50"
                          : isDark ? "hover:bg-gray-700/50" : "hover:bg-gray-50"
                      }`}
                      onClick={() => {
                        if (!notification.isRead) markReadMutation.mutate(notification.id);
                        if (onNotificationClick) {
                          setIsOpen(false);
                          onNotificationClick(notification);
                        }
                      }}
                    >
                      {/* Avatar circle — Facebook-style */}
                      <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg ${avatar.bg}`}>
                        {avatar.emoji}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-snug ${!notification.isRead ? "font-semibold" : "font-normal"} ${isDark ? "text-white" : "text-gray-900"}`}>
                          {notification.title && (
                            <span className={`${isDark ? "text-gray-200" : "text-gray-800"}`}>{notification.title} </span>
                          )}
                        </p>
                        <p className={`text-xs mt-0.5 line-clamp-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                          {notification.message}
                        </p>
                        <p className={`text-[11px] mt-1 ${!notification.isRead ? "text-blue-500 font-medium" : isDark ? "text-gray-500" : "text-gray-400"}`}>
                          {getRelativeTimeAr(notification.createdAt)}
                        </p>

                        {canClaimTeacherHelp && (
                          <div className="mt-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                claimHelpRequestMutation.mutate(helpRequestId);
                              }}
                              disabled={claimHelpRequestMutation.isPending}
                              className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                            >
                              {claimHelpRequestMutation.isPending ? (
                                <span className="inline-flex items-center gap-1">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  جاري الاستلام...
                                </span>
                              ) : (
                                "استلام المساعدة"
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Unread dot */}
                      {!notification.isRead && (
                        <div className="shrink-0 mt-3">
                          <span className="block h-3 w-3 rounded-full bg-blue-500" />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// === Exported Named Bells ===

export function LibraryNotificationBell() {
  return (
    <AccountNotificationBell
      tokenKey="libraryToken"
      apiBase="/api/library/notifications"
      queryKeyPrefix="library"
    />
  );
}

export function SchoolNotificationBell() {
  return (
    <AccountNotificationBell
      tokenKey="schoolToken"
      apiBase="/api/school/notifications"
      queryKeyPrefix="school"
    />
  );
}

export function TeacherNotificationBell() {
  return (
    <AccountNotificationBell
      tokenKey="teacherToken"
      apiBase="/api/teacher/notifications"
      queryKeyPrefix="teacher"
    />
  );
}

export function AdminNotificationBell({ onNotificationClick }: { onNotificationClick?: (notification: NotificationItem) => void } = {}) {
  return (
    <AccountNotificationBell
      tokenKey="adminToken"
      apiBase="/api/admin/own-notifications"
      queryKeyPrefix="admin-own"
      sseEnabled={true}
      sseStreamUrl="/api/admin/own-notifications/stream"
      onNotificationClick={onNotificationClick}
    />
  );
}
