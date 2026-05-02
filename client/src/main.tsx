import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n/config";
import "./hardwareEvents";

const TEMP_DISABLE_CLIENT_CACHE = false;

if (typeof window !== "undefined") {
  (window as any).__TEMP_DISABLE_CLIENT_CACHE__ = TEMP_DISABLE_CLIENT_CACHE;

  if (TEMP_DISABLE_CLIENT_CACHE) {
    // Clear browser Cache Storage and unregister SWs to stop stale client caches.
    if ("caches" in window) {
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
        .catch(() => undefined);
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => Promise.all(regs.map((reg) => reg.unregister())))
        .catch(() => undefined);
    }
  }
}

// Environment-based API base (set VITE_API_BASE to override, defaults to relative)
const API_BASE = (import.meta.env as any).VITE_API_BASE ?? "";

// Export for use in image/upload URLs that need the server base
// When running in Capacitor with bundled assets, static resources like
// /uploads/... need to point to the production server
(window as any).__API_BASE__ = API_BASE;

// Monkey-patch fetch to prepend API_BASE for requests starting with /api or /uploads
const _originalFetch = window.fetch.bind(window);
(window as any).fetch = (input: any, init?: any) => {
  try {
    if (typeof input === "string") {
      if ((input.startsWith("/api") || input.startsWith("/uploads")) && API_BASE) {
        input = API_BASE.replace(/\/$/, "") + input;
      }
    } else if (input instanceof Request) {
      const url = new URL(input.url);
      if ((url.pathname.startsWith("/api") || url.pathname.startsWith("/uploads")) && API_BASE) {
        const newUrl = API_BASE.replace(/\/$/, "") + url.pathname + url.search;
        input = new Request(newUrl, input);
      }
    }
  } catch (e) {
    // ignore and continue with original input
  }
  return _originalFetch(input, init);
};

// ── Capacitor Asset URL Rewriter ────────────────────────────────
// When running in Capacitor with bundled assets, <img src="/uploads/...">
// won't resolve because those files live on the production server.
// This MutationObserver auto-rewrites /uploads/ paths to the production URL.
if (API_BASE) {
  const baseUrl = API_BASE.replace(/\/$/, "");

  function rewriteSrc(el: Element) {
    const src = el.getAttribute("src");
    if (src && src.startsWith("/uploads/")) {
      el.setAttribute("src", baseUrl + src);
    }
  }

  function processNode(node: Node) {
    if (node instanceof HTMLElement) {
      if (node.tagName === "IMG" || node.tagName === "SOURCE") {
        rewriteSrc(node);
      }
      node.querySelectorAll("img[src^='/uploads/'], source[src^='/uploads/']")
        .forEach(rewriteSrc);
    }
  }

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) processNode(node);
      if (m.type === "attributes" && m.target instanceof Element) {
        const src = m.target.getAttribute("src");
        if (src && src.startsWith("/uploads/")) rewriteSrc(m.target);
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src"],
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
