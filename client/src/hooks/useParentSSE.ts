import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { emitNotificationSync } from "@/lib/notificationRealtime";

/**
 * Hook that connects to the parent SSE endpoint for real-time notifications.
 * When a notification event arrives, it invalidates the notification queries
 * so React Query refetches fresh data immediately.
 */
export function useParentSSE() {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    let retryDelay = 1000;
    let unmounted = false;

    function connect() {
      if (unmounted) return;

      // Use fetch-based approach since EventSource doesn't support auth headers
      // We'll use the standard EventSource with the token as a query parameter
      const es = new EventSource(`/api/parent/events?token=${encodeURIComponent(token!)}`);
      eventSourceRef.current = es;

      es.addEventListener("notification", () => {
        // Invalidate notification queries to trigger refetch
        queryClient.invalidateQueries({ queryKey: ["/api/parent/notifications"] });
        queryClient.invalidateQueries({ queryKey: ["/api/parent/notifications", 1, 20] });
        queryClient.invalidateQueries({ queryKey: ["/api/parent/notifications/unread-count"] });
        // Keep legacy keys for compatibility with older components.
        queryClient.invalidateQueries({ queryKey: ["parent-notifications"] });
        queryClient.invalidateQueries({ queryKey: ["parent-unread-count"] });
        emitNotificationSync({ source: "sse" });
      });

      es.addEventListener("connected", () => {
        retryDelay = 1000; // Reset retry delay on successful connection
      });

      es.onerror = () => {
        es.close();
        if (!unmounted) {
          retryTimeoutRef.current = setTimeout(() => {
            retryDelay = Math.min(retryDelay * 2, 30000); // Exponential backoff, max 30s
            connect();
          }, retryDelay);
        }
      };
    }

    connect();

    return () => {
      unmounted = true;
      eventSourceRef.current?.close();
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, [queryClient]);
}
