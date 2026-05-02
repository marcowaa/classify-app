import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * Legacy /privacy route — redirects to unified /privacy-policy page.
 */
export const Privacy = (): JSX.Element | null => {
  const [, navigate] = useLocation();

  useEffect(() => {
    navigate("/privacy-policy", { replace: true });
  }, [navigate]);

  return null;
};
