import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { Bell, X, CheckCheck } from "lucide-react";
import { getDateLocale } from "@/i18n/config";
import { emitNotificationSync, notificationSyncEventName } from "@/lib/notificationRealtime";
import { fetchAuthMe, wipeAllClientAuthState } from "@/lib/authOracle";

type ChildNotification = {
  id: string;
  type: string;
  title?: string | null;
  message: string;
  isRead: boolean;
  ctaAction?: string | null;
  ctaTarget?: string | null;
  relatedId?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
};

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "points_earned":
    case "points_adjustment":
      return "⭐";
    case "reward_unlocked":
    case "achievement":
      return "🏆";
    case "product_assigned":
    case "gift_assigned":
    case "gift_unlocked":
    case "gift_activated":
      return "🎁";
    case "task_reminder":
    case "task_assigned":
      return "📝";
    case "task_completed":
      return "✅";
    case "daily_challenge":
      return "🎯";
    case "goal_progress":
      return "📈";
    case "broadcast":
    case "system_alert":
      return "📢";
    case "game_shared":
      return "🎮";
    default:
      return "🔔";
  }
};

const getNavigationTarget = (notification: ChildNotification): string | null => {
  if (notification.ctaTarget) return notification.ctaTarget;

  switch (notification.type) {
    case "product_assigned":
    case "gift_assigned":
    case "gift_unlocked":
    case "gift_activated":
      return "/child-gifts";
    case "task_reminder":
    case "task_assigned":
    case "task_completed":
    case "scheduled_task_unlocked":
    case "scheduled_session_activated":
    case "task":
    case "task_notification_escalation":
      return "/child-tasks";
    case "daily_challenge":
    case "game_shared":
      return "/child-games";
    case "points_earned":
    case "points_adjustment":
    case "reward_unlocked":
    case "achievement":
    case "reward":
      return "/child-rewards";
    case "goal_progress":
      return "/child-progress";
    case "child_pin_changed":
      return "/child-settings";
    case "broadcast":
    case "system_alert":
    case "info":
      return "/child-notifications";
    default:
      return null;
  }
};

export function ChildNotificationBell() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  const [, navigate] = useLocation();
  const { isDark } = useTheme();
  const queryClient = useQueryClient();

  const [me, setMe] = useState<Awaited<ReturnType<typeof fetchAuthMe>>>({
    authenticated: false,
    channel: "none",
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const res = await fetchAuthMe();
      if (cancelled) return;
      setMe(res);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const isChildAuthed = me.authenticated && me.channel === "child";

  // Token is legacy transport only. For cookie-only, it may be absent.
  const childToken = localStorage.getItem("childToken");

  const maybeAuthHeaders = (): Record<string, string> => {
    if (!childToken) return {};
    return { Authorization: `Bearer ${childToken}` };
  };

  const handleSSENotification = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["child-notifications"] });
    queryClient.invalidateQueries({ queryKey: ["child-notifications-unread-count"] });

    emitNotificationSync({
      source: "sse",
      title: "إشعار جديد (الطفل)",
      body: "تم تحديث إشعارات الطفل لحظيًا",
      url: "/child-notifications",
    });
  }, [queryClient]);

  useEffect(() => {
    const onSync = () => {
      queryClient.invalidateQueries({ queryKey: ["child-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["child-notifications-unread-count"] });
    };

    const eventName = notificationSyncEventName();
    window.addEventListener(eventName, onSync as EventListener);

    return () => {
      window.removeEventListener(eventName, onSync as EventListener);
    };
  }, [queryClient]);

  const { data: notifications = [] } = useQuery<ChildNotification[]>({
    queryKey: ["child-notifications"],
    enabled: isChildAuthed,
    queryFn: async () => {
      const res = await fetch("/api/child/notifications", {
        credentials: "include",
        headers: maybeAuthHeaders(),
      });
      const json = await res.json();
      return json?.data || [];
    },
    retry: 1,
    staleTime: 30_000,
  });

  const { data: unreadCountData } = useQuery<{ count: number }>({
    queryKey: ["child-notifications-unread-count"],
    enabled: isChildAuthed,
    queryFn: async () => {
      const res = await fetch("/api/child/notifications/unread-count", {
        credentials: "include",
        headers: maybeAuthHeaders(),
      });
      const json = await res.json();
      return json?.data || { count: 0 };
    },
    retry: 1,
    staleTime: 30_000,
  });

  // SSE real-time connection for child notifications (Phase 2 oracle-authoritative)
  useEffect(() => {
    if (!isChildAuthed) return;

    let disposed = false;
    let eventSource: EventSource | null = null;

    const useCookieMode = me.tokenType === "cookie";
    const legacyToken = localStorage.getItem("childToken") || "";
    const legacyUrl = `/api/child/events?token=${encodeURIComponent(legacyToken)}`;
    const cookieUrl = `/api/child/events`;
    const url = useCookieMode ? cookieUrl : legacyUrl;

    let reconciledOnce = false;
    let fallbackOpened = false;

    const closeEs = () => {
      if (!eventSource) return;
      try {
        eventSource.close();
      } catch {
        // ignore
      }
      eventSource = null;
    };

    const open = () => {
      if (disposed) return;

      eventSource = new EventSource(url);

      eventSource.addEventListener("notification", () => {
        handleSSENotification();
      });

      eventSource.onerror = async () => {
        closeEs();

        if (disposed) return;
        if (reconciledOnce) return;

        // Terminal failure rule: close immediately, reconcile ONCE via /api/auth/me.
        reconciledOnce = true;

        const after = await fetchAuthMe();
        if (disposed) return;

        if (!after.authenticated || after.channel !== "child") {
          wipeAllClientAuthState();
          return;
        }

        // If oracle says still authenticated and we started in cookie mode,
        // allow exactly one transport fallback to legacy token URL.
        if (after.tokenType === "cookie" && !fallbackOpened) {
          fallbackOpened = true;

          if (!legacyToken) return; // can't fallback without legacy token transport
          try {
            eventSource = new EventSource(legacyUrl);
          } catch {
            return;
          }

          eventSource.addEventListener("notification", () => {
            handleSSENotification();
          });

          eventSource.onerror = () => {
            // No reconnect loop: terminal stop.
            closeEs();
          };
        }
      };
    };

    open();

    return () => {
      disposed = true;
      closeEs();
    };
  }, [handleSSENotification, isChildAuthed, me.tokenType]);

  const unreadCount = unreadCountData?.count || 0;

  useEffect(() => {
    if ("setAppBadge" in navigator) {
      if (unreadCount > 0) {
        (navigator as any).setAppBadge(unreadCount).catch(() => {});
      } else {
        (navigator as any).clearAppBadge().catch(() => {});
      }
    }
  }, [unreadCount]);

  const markAsRead = async (id: string) => {
    let wasUnread = false;

    queryClient.setQueryData<ChildNotification[]>(["child-notifications"], (prev) => {
      const list = Array.isArray(prev) ? prev : [];
      return list.map((item) => {
        if (item.id !== id) return item;
        wasUnread = !item.isRead;
        return { ...item, isRead: true };
      });
    });

    if (wasUnread) {
      queryClient.setQueryData<{ count: number } | undefined>(["child-notifications-unread-count"], (prev) => ({
        count: Math.max(0, (prev?.count || 0) - 1),
      }));
    }

    emitNotificationSync({ source: "action" });

    try {
      await fetch(`/api/child/notifications/${id}/read`, {
        method: "PUT",
        credentials: "include",
        headers: maybeAuthHeaders(),
      });

      queryClient.invalidateQueries({ queryKey: ["child-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["child-notifications-unread-count"] });
    } catch {
      // ignore
    }
  };

  const markAllRead = async () => {
    queryClient.setQueryData<ChildNotification[]>(["child-notifications"], (prev) => {
      const list = Array.isArray(prev) ? prev : [];
      return list.map((item) => ({ ...item, isRead: true }));
    });

    queryClient.setQueryData(["child-notifications-unread-count"], { count: 0 });

    emitNotificationSync({ source: "action" });

    try {
      const unread = notifications.filter((n) => !n.isRead);

      await Promise.all(
        unread.map((n) =>
          fetch(`/api/child/notifications/${n.id}/read`, {
            method: "PUT",
            credentials: "include",
            headers: maybeAuthHeaders(),
          })
        )
      );

      queryClient.invalidateQueries({ queryKey: ["child-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["child-notifications-unread-count"] });
    } catch {
      // ignore
    }
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        bellRef.current &&
        !bellRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // IntersectionObserver: auto-mark-read when notification scrolls into viewport
  const observerRef = useRef<IntersectionObserver | null>(null);
  const observedIds = useRef<Set<string>>(new Set());

  const setupObserver = useCallback(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observedIds.current.clear();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = (entry.target as HTMLElement).dataset.notifId;
            const isRead = (entry.target as HTMLElement).dataset.notifRead === "true";
            if (id && !isRead && !observedIds.current.has(id)) {
              observedIds.current.add(id);
              markAsRead(id);
            }
          }
        });
      },
      { threshold: 0.6 }
    );

    return observerRef.current;
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const obs = setupObserver();
    const timer = setTimeout(() => {
      const items = panelRef.current?.querySelectorAll("[data-notif-id]");
      items?.forEach((el) => obs.observe(el));
    }, 100);

    return () => {
      clearTimeout(timer);
      obs.disconnect();
    };
  }, [isOpen, notifications, setupObserver]);

  const handleNotificationClick = (notification: ChildNotification) => {
    markAsRead(notification.id);
    const target = getNavigationTarget(notification);
    if (target) {
      setIsOpen(false);
      navigate(target);
    }
  };

  const displayNotifications = notifications.slice(0, 20);

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        ref={bellRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-lg transition-colors ${isDark ? "hover:bg-gray-700" : "hover:bg-white/20"}`}
        data-testid="button-child-notifications"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Overlay Panel */}
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <div
            className="fixed inset-0 z-[10020] bg-black/20 sm:hidden"
            onClick={() => setIsOpen(false)}
            role="presentation"
          />

          <div
            ref={panelRef}
            className={`fixed sm:absolute left-4 right-4 sm:ltr:left-auto sm:ltr:right-0 sm:rtl:right-auto sm:rtl:left-0 top-16 sm:top-full sm:mt-2 z-[10030] w-auto sm:w-[380px] max-h-[80vh] rounded-2xl shadow-2xl border overflow-hidden ${
              isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
            }`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? "border-gray-700" : "border-gray-100"}`}>
              <h3 className={`font-bold text-base flex items-center gap-2 ${isDark ? "text-white" : "text-gray-800"}`}>
                🔔 {t("childNotifications.title")}
                {unreadCount > 0 && (
                  <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">{unreadCount}</span>
                )}
              </h3>

              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllRead()}
                    className={`text-xs px-2 py-1 rounded-lg transition-colors ${isDark ? "text-blue-400 hover:bg-gray-700" : "text-blue-600 hover:bg-blue-50"}`}
                    title={t("childNotifications.markAllRead")}
                  >
                    <CheckCheck className="h-4 w-4" />
                  </button>
                )}

                <button
                  onClick={() => setIsOpen(false)}
                  className={`p-2 rounded-lg ${isDark ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
                  aria-label="Close notifications"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto max-h-[65vh] divide-y divide-gray-100 dark:divide-gray-700">
              {displayNotifications.length === 0 ? (
                <div className="py-12 text-center">
                  <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t("childNotifications.noNotificationsEmoji")}</p>
                </div>
              ) : (
                displayNotifications.map((notification) => {
                  const navTarget = getNavigationTarget(notification);

                  return (
                    <div
                      key={notification.id}
                      data-notif-id={notification.id}
                      data-notif-read={String(notification.isRead)}
                      className={`px-4 py-3 transition-colors ${
                        !notification.isRead
                        ? isDark
                          ? "bg-blue-900/20"
                          : "bg-blue-50/70"
                          : ""
                      } ${navTarget ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50" : ""}`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex gap-3">
                        <span className="text-xl shrink-0 mt-0.5">{getNotificationIcon(notification.type)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm font-semibold leading-tight ${isDark ? "text-white" : "text-gray-800"}`}>
                              {notification.title || notification.message?.split("\n")[0]}
                            </p>
                            {!notification.isRead && <span className="shrink-0 h-2 w-2 rounded-full bg-blue-500 mt-1.5" />}
                          </div>

                          <p className={`text-xs mt-0.5 line-clamp-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                            {notification.message}
                          </p>

                          <p className={`text-[10px] mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                            {new Date(notification.createdAt).toLocaleDateString(getDateLocale(), {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>

                          {navTarget && (
                            <p className={`text-[10px] mt-1 ${isDark ? "text-blue-400" : "text-blue-500"}`}>
                              {t("childNotifications.clickToNavigate")} ←
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer — View All */}
            <div className={`px-4 py-2.5 border-t text-center ${isDark ? "border-gray-700" : "border-gray-100"}`}>
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate("/child-notifications");
                }}
                className={`text-sm font-semibold ${isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"}`}
              >
                {t("childNotifications.viewAll")}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
