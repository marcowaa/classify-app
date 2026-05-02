import express, { type Express, type Request } from "express";
import fs from "fs";
import path from "path";
import { publicPageLimiter } from "./utils/rateLimiters";

function isSynthetic404CheckPath(req: Request): boolean {
  const candidates = [req.path, req.url, req.originalUrl];
  return candidates.some((value) => String(value || "").toLowerCase().includes("404check"));
}

function sendNotFoundHtml(res: express.Response) {
  return res
    .status(404)
    .set({
      "Cache-Control": "no-store, max-age=0",
      "X-Robots-Tag": "noindex, nofollow",
      "Content-Type": "text/html; charset=utf-8",
    })
    .send("<!doctype html><html><head><title>404 Not Found</title></head><body><h1>404 Not Found</h1></body></html>");
}

function isStaticNamespacePath(req: Request): boolean {
  const candidates = [req.originalUrl, req.url, req.path].map((value) => {
    const asString = String(value || "");
    const pathname = asString.split("?")[0] || "";
    return pathname;
  });

  return candidates.some((pathname) => (
    pathname.startsWith("/apps/") ||
    pathname.startsWith("/uploads/") ||
    pathname.startsWith("/assets/")
  ));
}

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist", "public");
  const TEMP_DISABLE_CLIENT_CACHE = false;

  if (!fs.existsSync(distPath)) {
    const error = new Error(
      `Build output not found at: ${distPath}\n` +
      `Current working directory: ${process.cwd()}\n` +
      `Make sure to run 'npm run build' before starting production server.`
    );
    console.error(error.message);
    throw error;
  }

  console.log(`Serving static assets from: ${distPath}`);

  try {
    const files = fs.readdirSync(distPath);
    console.log(`Files found: ${files.join(", ")}`);
  } catch (err) {
    console.error(`Warning: Could not list files:`, err);
  }

  app.use(express.static(distPath, {
    etag: !TEMP_DISABLE_CLIENT_CACHE,
    index: false,
    setHeaders: (res, filePath) => {
      if (TEMP_DISABLE_CLIENT_CACHE) {
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        return;
      }

      const basename = path.basename(filePath);
      // Android artifacts — force download
      if (basename.endsWith('.apk') || basename.endsWith('.aab')) {
        res.setHeader(
          "Content-Type",
          basename.endsWith('.apk')
            ? "application/vnd.android.package-archive"
            : "application/octet-stream"
        );
        res.setHeader("Content-Disposition", `attachment; filename="${basename}"`);
        res.setHeader("Cache-Control", "no-cache");
        return;
      }
      // Never cache sw.js, manifest.json, or index.html
      if (basename === 'sw.js' || basename === 'manifest.json' || basename === 'index.html') {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
      } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        // Hashed assets are immutable
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else {
        // Icons and other static files: 1 day
        res.setHeader("Cache-Control", "public, max-age=86400");
      }
    }
  }));

  app.use("*", publicPageLimiter, (req, res) => {
    if (req.path.startsWith("/api/") || req.path.startsWith("/objects/")) {
      return res.status(404).json({
        success: false,
        error: "NOT_FOUND",
        message: "API endpoint not found"
      });
    }

    // Do not route binary/static namespace misses to SPA fallback.
    if (isStaticNamespacePath(req)) {
      return res.status(404).type("text/plain").send("File not found");
    }

    // Return true 404 for synthetic soft-404 probes from render/CDN checks.
    if (isSynthetic404CheckPath(req)) {
      return sendNotFoundHtml(res);
    }

    if (req.path === "/sw.js") {
      const swPath = path.resolve(distPath, "sw.js");
      if (fs.existsSync(swPath)) {
        return res.sendFile(swPath);
      }
      return res.status(404).send("File not found");
    }

    if (req.path === "/manifest.json") {
      const manifestPath = path.resolve(distPath, "manifest.json");
      if (fs.existsSync(manifestPath)) {
        return res.sendFile(manifestPath);
      }
      return res.status(404).send("File not found");
    }

    const indexPath = path.resolve(distPath, "index.html");
    if (!fs.existsSync(indexPath)) {
      return res.status(500).send(
        "Application not built correctly - index.html not found"
      );
    }

    return res.sendFile(indexPath);
  });
}
