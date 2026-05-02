import React from "react";

// PWA install gate disabled — simply render children without modal
export function PWAInstallGate({ children }: any) {
  return children || null;
}
