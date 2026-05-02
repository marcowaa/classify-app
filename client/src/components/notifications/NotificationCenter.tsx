// client/src/components/notifications/NotificationCenter.tsx
// Central hub for displaying child notifications (Phase 1.4)

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { NotificationToast } from "./NotificationToast";
import { NotificationModal } from "./NotificationModal";
import { emitNotificationSync } from "@/lib/notificationRealtime";
import { saveCampaignAttribution } from "@/lib/campaignAttribution";

interface Notification {
  id: string;
  childId: string;
  type: string;
  title: string;
  message: string;
  style: "toast" | "modal" | "banner" | "fullscreen";
  priority: string;
  soundAlert?: boolean;
  isRead: boolean;
  createdAt: string;
  ctaAction?: string | null;
  ctaTarget?: string | null;
  metadata?: Record<string, any> | null;
}

interface NotificationCenterProps {
  silentWindowActive?: boolean;
}

export function NotificationCenter({ silentWindowActive = false }: NotificationCenterProps) {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [displayedNotifications, setDisplayedNotifications] = useState<
    Notification[]
  >([]);

  const childToken = localStorage.getItem("childToken");
  
  // Initial fetch only (real-time updates arrive through SSE)
  const { data, isLoading } = useQuery({
    queryKey: ["childNotifications"],
    queryFn: async () => {
      const token = localStorage.getItem("childToken");
      if (!token) return { data: [] };
      const response = await fetch("/api/child/notifications?limit=50", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401) {
        localStorage.removeItem("childToken");
        return { data: [] };
      }
      if (!response.ok) throw new Error("Failed to fetch notifications");
      return response.json();
    },
    enabled: !!childToken, // Only poll when token exists
    refetchInterval: false,
    staleTime: 30 * 1000,
    retry: false,
  });

  // Track which notifications we've shown (to avoid duplicates)
  const [shownNotificationIds, setShownNotificationIds] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    if (!childToken) return;

    let eventSource: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let reconnectDelay = 1000;
    const MAX_DELAY = 30000;
    let disposed = false;

    const connect = () => {
      if (disposed) return;
      const streamUrl = `/api/child/notifications/stream?token=${encodeURIComponent(childToken)}`;
      eventSource = new EventSource(streamUrl);

      eventSource.addEventListener("ready", () => {
        reconnectDelay = 1000; // reset on successful connection
      });

      const onNotification = (event: MessageEvent) => {
        try {
          const notification = JSON.parse(event.data) as Notification;
          if (!notification?.id) return;

          if (silentWindowActive) {
            queryClient.invalidateQueries({ queryKey: ["childNotifications"] });
            return;
          }

          setDisplayedNotifications((prev) => {
            if (prev.some((item) => item.id === notification.id)) {
              return prev;
            }
            return [...prev, notification];
          });

          setShownNotificationIds((prev) => {
            const next = new Set(prev);
            next.add(notification.id);
            return next;
          });

          emitNotificationSync({
            source: "sse",
            title: notification.title || "إشعار جديد (الطفل)",
            body: notification.message || "لديك تحديث جديد",
            url: "/child-notifications",
          });

          queryClient.setQueryData(["childNotifications"], (old: any) => {
            const current = Array.isArray(old?.data) ? old.data : [];
            if (current.some((item: Notification) => item.id === notification.id)) {
              return old;
            }
            return { success: true, data: [notification, ...current] };
          });
        } catch {
          // ignore malformed stream payload
        }
      };

      eventSource.addEventListener("notification", onNotification);

      eventSource.onerror = () => {
        eventSource?.close();
        eventSource = null;
        if (!disposed) {
          reconnectTimer = setTimeout(connect, reconnectDelay);
          reconnectDelay = Math.min(reconnectDelay * 2, MAX_DELAY);
        }
      };
    };

    connect();

    return () => {
      disposed = true;
      clearTimeout(reconnectTimer);
      eventSource?.close();
    };
  }, [childToken, queryClient, silentWindowActive]);

  // When new unread notifications arrive, add them to display queue
  useEffect(() => {
    if (data?.data && Array.isArray(data.data)) {
      const unreadNotifications = data.data.filter(
        (notif: Notification) =>
          !notif.isRead && !shownNotificationIds.has(notif.id)
      );

      if (silentWindowActive) {
        return;
      }

      if (unreadNotifications.length > 0) {
        // Add new unread notifications to display
        setDisplayedNotifications((prev) => [
          ...prev,
          ...unreadNotifications,
        ]);

        // Mark these as shown (so we don't re-display them)
        setShownNotificationIds((prev) => {
          const newIds = new Set(prev);
          unreadNotifications.forEach((n: Notification) => {
            newIds.add(n.id);
          });
          return newIds;
        });
      }
    }
  }, [data?.data, shownNotificationIds, silentWindowActive]);

  useEffect(() => {
    if (!silentWindowActive) return;
    setDisplayedNotifications([]);
  }, [silentWindowActive]);

  // Handle dismissing notification (remove from display)
  const handleDismiss = async (notificationId: string) => {
    // Remove from displayed list
    setDisplayedNotifications((prev) =>
      prev.filter((n) => n.id !== notificationId)
    );

    // Mark as read on backend
    const token = localStorage.getItem("childToken");
    try {
      await fetch(`/api/child/notifications/${notificationId}/read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  // Separate toasts and modals
  const toastNotifications = displayedNotifications.filter(
    (n) => n.style === "toast" || n.style === "banner"
  );
  const modalNotifications = displayedNotifications.filter(
    (n) => n.style === "modal" || n.style === "fullscreen"
  );

  // Show only one modal at a time (queue the rest)
  const activeModal = modalNotifications[0];

  const getActionLabel = (notification: Notification) => {
    const action = String(notification.ctaAction || "").trim();
    if (action === "open_campaign") return "عرض العرض";
    if (notification.ctaTarget) return "فتح";
    return null;
  };

  const handleNotificationAction = (notification: Notification) => {
    const target = String(notification.ctaTarget || "").trim();
    if (!target) {
      handleDismiss(notification.id);
      return;
    }

    try {
      const action = String(notification.ctaAction || "").trim();
      if (action === "open_campaign") {
        const parsed = target.startsWith("/")
          ? new URL(target, window.location.origin)
          : new URL(target);
        const promoProductId = String(parsed.searchParams.get("promoProductId") || "").trim();
        const promoAdId = String(parsed.searchParams.get("promoAdId") || "").trim();
        if (promoProductId || promoAdId) {
          saveCampaignAttribution({
            promoProductId: promoProductId || undefined,
            sourceAdId: promoAdId || undefined,
          });
        }
      }

      handleDismiss(notification.id);

      if (target.startsWith("/")) {
        navigate(target);
        return;
      }

      if (/^https?:\/\//i.test(target)) {
        window.location.assign(target);
      }
    } catch {
      handleDismiss(notification.id);
      if (target.startsWith("/")) {
        navigate(target);
      }
    }
  };

  return (
    <>
      {/* Toast Container (bottom-right corner) */}
      <div className="fixed bottom-4 right-4 space-y-3 z-30" data-testid="notification-center">
        {toastNotifications.map((notif) => (
          <NotificationToast
            key={notif.id}
            id={notif.id}
            title={notif.title}
            message={notif.message}
            soundAlert={notif.soundAlert}
            type={
              notif.type === "gift_unlocked"
                ? "gift_unlocked"
                : "gift_activated"
            }
            actionLabel={getActionLabel(notif) || undefined}
            onAction={getActionLabel(notif) ? () => handleNotificationAction(notif) : undefined}
            onDismiss={handleDismiss}
          />
        ))}
      </div>

      {/* Modal Container (one at a time) */}
      {activeModal && (
        <NotificationModal
          key={activeModal.id}
          id={activeModal.id}
          title={activeModal.title}
          message={activeModal.message}
          type={activeModal.type as "gift_unlocked"}
          actionLabel={getActionLabel(activeModal) || undefined}
          onAction={getActionLabel(activeModal) ? () => handleNotificationAction(activeModal) : undefined}
          onConfirm={handleDismiss}
        />
      )}

      {/* Loading indicator (optional) */}
      {isLoading && (
        <div className="fixed bottom-4 left-4 text-xs text-gray-500">
          ⟳ Syncing...
        </div>
      )}
    </>
  );
}
