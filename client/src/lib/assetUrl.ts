/**
 * Resolve asset URLs for Capacitor native builds.
 * 
 * When running as a native app with bundled assets, relative paths like
 * /uploads/... need to be prepended with the production server URL.
 * In web mode, these resolve normally against the same origin.
 * 
 * Usage: <img src={resolveAssetUrl(product.image)} />
 */
export function resolveAssetUrl(url: string | null | undefined): string {
  if (!url) return "";
  
  // Already an absolute URL — return as-is
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  
  // Get the API base from the global set in main.tsx
  const apiBase = (window as any).__API_BASE__ || "";
  
  // Prepend API base for server-relative paths
  if (apiBase && (url.startsWith("/uploads") || url.startsWith("/api"))) {
    return apiBase.replace(/\/$/, "") + url;
  }
  
  return url;
}

/**
 * Check if running inside a Capacitor native app
 */
export function isNativeApp(): boolean {
  return !!(window as any).Capacitor?.isNativePlatform?.();
}
