import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Production-ready Vite config with performance optimization
export default defineConfig({
  root: path.resolve(process.cwd(), "client"),
  base: "/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "client", "src"),
      "@shared": path.resolve(process.cwd(), "shared"),
      "@assets": path.resolve(process.cwd(), "attached_assets"),
    },
  },
  build: {
    outDir: path.resolve(process.cwd(), "dist", "public"),
    emptyOutDir: true,
    assetsDir: "assets",
    target: "es2020",
    minify: "esbuild",
    cssMinify: true,
    rollupOptions: {
      output: {
        assetFileNames: "assets/[name]-[hash][extname]",
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        manualChunks: {
          // Routing + state management
          "vendor-state": [
            "wouter",
            "@tanstack/react-query",
          ],
          // NOTE: vendor-radix removed from manualChunks. Previously all
          // @radix-ui packages (425KB) were forced into one chunk that got
          // modulepreloaded on every page load. Now each @radix-ui package
          // naturally code-splits into the lazy routes that use it. Only
          // @radix-ui/react-tooltip (small, ~15KB) remains in the entry
          // since TooltipProvider is eagerly rendered in the App shell.
          // i18n runtime
          "vendor-i18n": [
            "i18next",
            "react-i18next",
            "i18next-browser-languagedetector",
          ],
          // Icons — extracted to allow caching independently
          "vendor-lucide": ["lucide-react"],
          // NOTE: vendor-charts (recharts) and vendor-motion (framer-motion)
          // are intentionally NOT in manualChunks so they code-split naturally
          // into the lazy-loaded routes that import them, avoiding modulepreload
          // on the landing page critical path.
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  optimizeDeps: {
    entries: ["index.html"],
    exclude: ["memory-modules"],
  },
});
