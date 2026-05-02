import { useState, useEffect } from "react";

interface AutoLoginResult {
  isChecking: boolean;
  isLoggedIn: boolean;
}

export function useAutoLogin(): AutoLoginResult {
  const [isChecking, setIsChecking] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    async function tryAutoLogin() {
      const token = localStorage.getItem("token");
      const deviceId = localStorage.getItem("deviceId");
      const deviceTrusted = localStorage.getItem("deviceTrusted");

      if (token) {
        setIsLoggedIn(true);
        setIsChecking(false);
        return;
      }

      // Only try auto-login if device is trusted and has deviceId
      if (!deviceId || !deviceTrusted) {
        setIsChecking(false);
        return;
      }

      try {
        // Cookie is httpOnly, sent automatically with credentials: "include"
        const res = await fetch("/api/auth/device/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include", // Send cookies
          body: JSON.stringify({ deviceId }),
        });

        if (!res.ok) {
          // Clear trusted flag if refresh fails
          localStorage.removeItem("deviceTrusted");
          setIsChecking(false);
          return;
        }

        const data = await res.json();
        const payload = data?.data || data;

        if (payload?.token) {
          localStorage.setItem("token", payload.token);
          setIsLoggedIn(true);
        }
        if (payload?.parentId) {
          localStorage.setItem("userId", payload.parentId);
        }
      } catch (error) {
        console.error("Auto-login failed:", error);
        localStorage.removeItem("deviceTrusted");
      } finally {
        setIsChecking(false);
      }
    }

    tryAutoLogin();
  }, []);

  return { isChecking, isLoggedIn };
}
