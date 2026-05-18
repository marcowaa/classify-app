import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { emitNotificationSync } from "@/lib/notificationRealtime";
import { fetchAuthMe, wipeAllClientAuthState } from "@/lib/authOracle";

type SseTransport = "cookie" | "bearer";

function buildParentEventsUrl(transport: SseTransport): string {
  const cookieUrl = `/api/parent/events`;
  if (transport === "cookie") return cookieUrl;

  const token = localStorage.getItem("token") || "";
  return `/api/parent/events?token=${encodeURIComponent(token)}`;
}

export function useParentSSE() {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);

  // Terminal-oracle semantics:
  // - no infinite reconnect loops
  // - on SSE terminal error: close, reconcile once with /api/auth/me, then either wipe or reconnect once
  const reconciledOnceRef = useRef(false);

  useEffect(() => {
    let unmounted = false;

    async function initAndConnect() {
      const me = await fetchAuthMe();
      if (unmounted) return;

      if (!me.authenticated) {
        wipeAllClientAuthState();
        return;
      }

      const transport: SseTransport = me.tokenType === "cookie" ? "cookie" : "bearer";
      const url = buildParentEventsUrl(transport);

      if (transport === "bearer" && !localStorage.getItem("token")) {
        // Oracle said bearer mode, but we have no bearer token locally => ghost-auth mismatch.
        wipeAllClientAuthState();
        return;
      }

      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.addEventListener("notification", () => {
        queryClient.invalidateQueries({ queryKey: ["/api/parent/notifications"] });
        queryClient.invalidateQueries({ queryKey: ["/api/parent/notifications", 1, 20] });
        queryClient.invalidateQueries({ queryKey: ["/api/parent/notifications/unread-count"] });

        // Legacy keys for compatibility with older components.
        queryClient.invalidateQueries({ queryKey: ["parent-notifications"] });
        queryClient.invalidateQueries({ queryKey: ["parent-unread-count"] });

        emitNotificationSync({ source: "sse" });
      });

      es.addEventListener("connected", () => {
        // Connected is transient; do not set up infinite retries.
      });

      es.onerror = async () => {
        try {
          es.close();
        } catch {
          // ignore
        }

        if (unmounted) return;
        if (reconciledOnceRef.current) return;

        reconciledOnceRef.current = true;

        const oracle = await fetchAuthMe();
        if (unmounted) return;

        if (!oracle.authenticated) {
          wipeAllClientAuthState();
          return;
        }

        const retryTransport: SseTransport = oracle.tokenType === "cookie" ? "cookie" : "bearer";
        const retryUrl = buildParentEventsUrl(retryTransport);

        if (retryTransport === "bearer" && !localStorage.getItem("token")) {
          // Oracle said bearer, but token disappeared => stop without looping.
          return;
        }

        try {
          const retryEs = new EventSource(retryUrl);
          eventSourceRef.current = retryEs;

          retryEs.addEventListener("notification", () => {
            queryClient.invalidateQueries({ queryKey: ["/api/parent/notifications"] });
            queryClient.invalidateQueries({ queryKey: ["/api/parent/notifications", 1, 20] });
            queryClient.invalidateQueries({ queryKey: ["/api/parent/notifications/unread-count"] });

            queryClient.invalidateQueries({ queryKey: ["parent-notifications"] });
            queryClient.invalidateQueries({ queryKey: ["/api/parent/notifications/unread-count", "legacy"] });
            emitNotificationSync({ source: "sse" });
          });

          retryEs.addEventListener("connected", () => {
            // no-op
          });

          retryEs.onerror = () => {
            try {
              retryEs.close();
            } catch {
              // ignore
            }
          };
        } catch {
        // stop
        }
      };
    }

    initAndConnect();

    return () => {
      unmounted = true;
      reconciledOnceRef.current = false;
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };
  }, [queryClient]);
}
