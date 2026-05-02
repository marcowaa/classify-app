import { useEffect, useRef } from "react";

const HEARTBEAT_INTERVAL = 60000; // 1 minute

export function useScreenTimeHeartbeat() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const childToken = localStorage.getItem("childToken");
    if (!childToken) return;

    const sendHeartbeat = async () => {
      try {
        const res = await fetch("/api/child/screen-time-heartbeat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${childToken}`,
          },
          body: JSON.stringify({ minutes: 1 }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.data?.isLimitReached) {
            window.dispatchEvent(new CustomEvent("screen-time-limit-reached"));
          }
        }
      } catch {
        // Silent fail
      }
    };

    // Send first heartbeat after a short delay
    const startTimeout = setTimeout(() => {
      sendHeartbeat();
      intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
    }, 5000);

    return () => {
      clearTimeout(startTimeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);
}

export default useScreenTimeHeartbeat;
