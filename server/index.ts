import "dotenv/config";

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "production";
}

import express, { type Request, Response, NextFunction } from "express";
import cluster from "node:cluster";
import os from "node:os";
import { registerRoutes } from "./routes/index";
import { serveStatic, log } from "./static";
import { initializeGiftNotificationHandlers } from "./notificationHandlers";
import { startMediaWorker } from "./services/mediaWorker";
import { startTaskNotificationWorker } from "./services/taskNotificationWorker";
import { startMonthlySubscriptionWorker } from "./services/monthlySubscriptionWorker";
import compression from "compression";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import prerender from "prerender-node";
import { errorResponse, ErrorCode } from "./utils/apiResponse";
import { getOAuthMetricSnapshot } from "./utils/oauthMonitoring";
import { globalApiLimiter } from "./utils/rateLimiters";

// ✅ تحسين التشخيص - 2025-12-08
// عرض حالة البيئة والإعدادات المهمة عند بدء الخادم
console.log("\n╔════════════════════════════════════════════╗");
console.log("║  🚀 Classify Server Initialization        ║");
console.log("╚════════════════════════════════════════════╝\n");

console.log("📋 Environment Configuration:");
console.log(`  NODE_ENV: ${process.env.NODE_ENV || "NOT SET"}`);
console.log(`  PORT: ${process.env.PORT || "5000"}`);
console.log(`  DATABASE_URL: ${process.env.DATABASE_URL ? "✅ SET" : "❌ NOT SET"}`);
console.log(`  JWT_SECRET: ${process.env.JWT_SECRET ? "✅ SET" : "❌ NOT SET"}`);
console.log("");

const redactDatabaseUrl = (value?: string): string => {
  if (!value) return "NOT SET";
  try {
    const url = new URL(value);
    const user = url.username ? `${url.username}:***` : "";
    const auth = user ? `${user}@` : "";
    const host = url.hostname || "unknown-host";
    const port = url.port ? `:${url.port}` : "";
    return `${url.protocol}//${auth}${host}${port}${url.pathname}`;
  } catch {
    return "INVALID_URL";
  }
};

console.log(`ACTIVE_DATABASE_URL: ${redactDatabaseUrl(process.env.DATABASE_URL)}`);

const requiredEnvVars = [
  "JWT_SECRET",
  "SESSION_SECRET",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
  "DATABASE_URL",
];

const missingEnv = requiredEnvVars.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  console.error("❌ Missing required environment variables:", missingEnv.join(", "));
  process.exit(1);
}

const adminPassword = String(process.env.ADMIN_PASSWORD || "").trim().toLowerCase();
if (adminPassword === "change_me" || adminPassword === "admin") {
  const red = "\x1b[31m";
  const bold = "\x1b[1m";
  const reset = "\x1b[0m";
  console.log(`${red}${bold}\n==============================================================`);
  console.log("SECURITY WARNING: Default password is in use. Please change ADMIN_PASSWORD in .env immediately.");
  console.log(`==============================================================${reset}\n`);
}

const app = express();
app.disable("x-powered-by");

function buildPrometheusMetricsPayload(): string {
  const oauth = getOAuthMetricSnapshot();
  const lines = [
    "# HELP oauth_start_total Total OAuth start requests",
    "# TYPE oauth_start_total counter",
    `oauth_start_total ${oauth.oauth_start_total}`,
    "",
    "# HELP oauth_callback_success_total Total successful OAuth callbacks",
    "# TYPE oauth_callback_success_total counter",
    `oauth_callback_success_total ${oauth.oauth_callback_success_total}`,
    "",
    "# HELP oauth_invalid_state_total Total invalid OAuth state events",
    "# TYPE oauth_invalid_state_total counter",
    `oauth_invalid_state_total ${oauth.oauth_invalid_state_total}`,
    "",
    "# HELP oauth_pkce_missing_total Total OAuth callbacks missing PKCE verifier",
    "# TYPE oauth_pkce_missing_total counter",
    `oauth_pkce_missing_total ${oauth.oauth_pkce_missing_total}`,
    "",
    "# HELP oauth_lock_conflict_total Total OAuth lock conflicts and start throttles",
    "# TYPE oauth_lock_conflict_total counter",
    `oauth_lock_conflict_total ${oauth.oauth_lock_conflict_total}`,
  ];
  return lines.join("\n");
}

app.get("/metrics", (_req, res) => {
  res.set("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
  return res.send(buildPrometheusMetricsPayload());
});

app.get("/api/metrics", (_req, res) => {
  res.set("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
  return res.send(buildPrometheusMetricsPayload());
});

const REQUEST_BODY_LIMIT = process.env.REQUEST_BODY_LIMIT || "512mb";
const TEMP_DISABLE_CLIENT_CACHE = false;

const REDACT_KEYS = ["password", "otp", "token", "jwt", "authorization", "cookie", "set-cookie"];

function redactObject(value: any) {
  if (!value || typeof value !== "object") return value;
  const clone: Record<string, any> = Array.isArray(value) ? [...value] : { ...value };
  for (const key of Object.keys(clone)) {
    if (REDACT_KEYS.some((k) => key.toLowerCase().includes(k))) {
      clone[key] = "[REDACTED]";
    }
  }
  return clone;
}

function normalizeOriginCandidate(rawValue: unknown): string {
  const value = String(rawValue || "").trim();
  if (!value) return "";

  try {
    const parsed = new URL(value);
    const protocol = parsed.protocol.toLowerCase();
    if (protocol !== "http:" && protocol !== "https:") {
      return "";
    }
    return parsed.origin.toLowerCase();
  } catch {
    return "";
  }
}

function resolveSafeRelativePath(rawValue: unknown): string {
  const value = String(rawValue || "/").trim() || "/";

  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  if (value.includes("\\") || /[\u0000-\u001F\u007F]/.test(value)) {
    return "/";
  }

  try {
    const parsed = new URL(value, "https://classi-fy.com");
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/";
  }
}

function setupPrerenderMiddleware() {
  const prerenderToken = String(process.env.PRERENDER_TOKEN || "").trim();
  const prerenderServiceUrl = String(process.env.PRERENDER_SERVICE_URL || "").trim();
  const prerenderEnabledRaw = String(process.env.PRERENDER_ENABLED || "auto").trim().toLowerCase();
  const explicitlyDisabled = prerenderEnabledRaw === "false" || prerenderEnabledRaw === "0" || prerenderEnabledRaw === "off";
  const explicitlyEnabled = prerenderEnabledRaw === "true" || prerenderEnabledRaw === "1" || prerenderEnabledRaw === "on";

  if (explicitlyDisabled) {
    console.log("ℹ️ Prerender middleware disabled by PRERENDER_ENABLED");
    return;
  }

  if (!prerenderToken) {
    if (explicitlyEnabled) {
      console.warn("⚠️ PRERENDER_ENABLED is true but PRERENDER_TOKEN is missing. Prerender middleware disabled.");
    } else {
      console.log("ℹ️ Prerender middleware not enabled (set PRERENDER_TOKEN to enable)");
    }
    return;
  }

  prerender.set("prerenderToken", prerenderToken);

  if (prerenderServiceUrl) {
    prerender.set("prerenderServiceUrl", prerenderServiceUrl);
  }

  prerender.set("crawlerUserAgents", [
    "googlebot",
    "bingbot",
    "yandex",
    "baiduspider",
    "facebookexternalhit",
    "twitterbot",
    "slackbot",
    "discordbot",
    "linkedinbot",
    "whatsapp",
    "telegrambot",
    "applebot",
    "gptbot",
    "chatgpt-user",
    "claudebot",
    "perplexitybot",
  ]);

  prerender.blacklisted([
    "^/api",
    "^/metrics$",
    "^/objects",
    "^/uploads",
    "^/sw\\.js$",
    "^/manifest\\.json$",
    "^/assets/",
    "\\.(?:js|json|css|xml|png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|eot|map|txt|mp4|webm|pdf|apk|aab)$",
  ]);

  app.use(prerender);
  console.log("✅ Prerender middleware enabled");
}

// Trust proxy for correct protocol/IP behind Nginx
app.set("trust proxy", 1);

// Prerender middleware should run early so bot HTML requests are handled before SPA/static middleware.
setupPrerenderMiddleware();

// Basic production hardening with CSP configuration
app.use(helmet({
  frameguard: { action: "sameorigin" },
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",  // For theme initialization script in index.html
        "https://www.googletagmanager.com",
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",  // For dynamic styles and Tailwind
        "https://fonts.googleapis.com",
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "data:",
      ],
      imgSrc: [
        "'self'",
        "data:",
        "blob:",
        "https://storage.googleapis.com",
        "https://www.google-analytics.com",
        "https://region1.google-analytics.com",
        "https://www.googletagmanager.com",
        "https://analytics.google.com",
        "https://www.google.com.eg",
        "https://www.google.com",
      ],
      connectSrc: [
        "'self'",
        "blob:",
        "https://fonts.googleapis.com",
        "https://storage.googleapis.com",
        "https://www.google-analytics.com",
        "https://region1.google-analytics.com",
        "https://analytics.google.com",
        "https://www.googletagmanager.com",
      ],
      manifestSrc: ["'self'", "blob:"],
      workerSrc: ["'self'", "blob:"],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      // Note: upgradeInsecureRequests removed - causes ERR_SSL_PROTOCOL_ERROR when serving over HTTP
      // Re-enable when HTTPS/SSL is configured
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  // Disable COOP/COEP — Helmet v8 defaults (same-origin / require-corp)
  // block pages from loading inside sandboxed iframes, causing
  // ERR_BLOCKED_BY_RESPONSE ("refused to connect") in game previews.
  crossOriginOpenerPolicy: false,
  crossOriginEmbedderPolicy: false,
}));



app.use(compression());
app.use(cookieParser());
app.use("/api", globalApiLimiter);

// Temporary: force-disable browser/proxy cache for all responses.
if (TEMP_DISABLE_CLIENT_CACHE) {
  app.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
    next();
  });
}

// Serve uploaded files (task images, etc.)
import path from "path";
// Public images (SEO/OG) — long cache, no auth, crawler-friendly
app.use("/uploads/public", express.static(path.join(process.cwd(), "uploads", "public"), {
  maxAge: TEMP_DISABLE_CLIENT_CACHE ? 0 : "30d",
  immutable: !TEMP_DISABLE_CLIENT_CACHE,
  etag: !TEMP_DISABLE_CLIENT_CACHE,
  setHeaders: (res) => {
    if (TEMP_DISABLE_CLIENT_CACHE) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    }
  },
}));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Allow Stripe webhook to use raw body for signature verification
const rawBodyPaths = new Set(["/api/payments/stripe/webhook"]);
app.use((req, res, next) => {
  if (rawBodyPaths.has(req.originalUrl)) return next();
  return express.json({ limit: REQUEST_BODY_LIMIT })(req, res, next);
});
app.use((req, res, next) => {
  if (rawBodyPaths.has(req.originalUrl)) return next();
  return express.urlencoded({ extended: false, limit: REQUEST_BODY_LIMIT })(req, res, next);
});

// Fail fast on malformed JSON bodies to avoid unhandled parser errors
app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && (err as any).body) {
    console.warn("⚠️ Invalid JSON payload rejected", {
      message: err.message,
      timestamp: new Date().toISOString()
    });
    return res
      .status(400)
      .json(errorResponse(ErrorCode.BAD_REQUEST, "INVALID_JSON: Request body must be valid JSON"));
  }
  return next(err);
});

// CORS configuration with allowlist support (comma-separated origins via CORS_ORIGIN/ALLOWED_ORIGINS)
const defaultCorsOrigins = process.env.NODE_ENV === "production"
  ? "https://classi-fy.com,https://www.classi-fy.com"
  : "*";
const corsOriginsSetting = process.env.CORS_ORIGIN || process.env.ALLOWED_ORIGINS || defaultCorsOrigins;
const allowedOrigins = corsOriginsSetting
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
const allowAnyOrigin = allowedOrigins.includes("*");
const allowWildcardCorsInProduction = String(process.env.ALLOW_WILDCARD_CORS_IN_PRODUCTION || "").toLowerCase() === "true";
const csrfProtectedMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const trustedCsrfOrigins = (() => {
  const origins = new Set<string>();

  origins.add("https://classi-fy.com");
  origins.add("https://www.classi-fy.com");

  if (!allowAnyOrigin) {
    for (const origin of allowedOrigins) {
      const normalized = normalizeOriginCandidate(origin);
      if (normalized) {
        origins.add(normalized);
      }
    }
  }

  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:3000");
    origins.add("http://localhost:5000");
    origins.add("http://127.0.0.1:3000");
    origins.add("http://127.0.0.1:5000");
  }

  return origins;
})();

if (process.env.NODE_ENV === "production" && allowAnyOrigin && !allowWildcardCorsInProduction) {
  throw new Error(
    "Unsafe CORS configuration: wildcard (*) is blocked in production. " +
    "Set CORS_ORIGIN/ALLOWED_ORIGINS to explicit origins, or set ALLOW_WILDCARD_CORS_IN_PRODUCTION=true only as an emergency override."
  );
}

if (process.env.NODE_ENV === "production" && allowAnyOrigin && allowWildcardCorsInProduction) {
  console.warn("⚠️ ALLOW_WILDCARD_CORS_IN_PRODUCTION=true is enabled. This weakens CORS protection and should be temporary.");
}

app.use((req, res, next) => {
  const path = String(req.path || "");
  const shouldApplyCors = path.startsWith("/api") || path.startsWith("/uploads");
  if (!shouldApplyCors) {
    return next();
  }

  res.removeHeader("X-Frame-Options");
  const origin = req.headers.origin as string | undefined;
  const isAllowed = allowAnyOrigin || !origin || allowedOrigins.includes(origin);

  if (isAllowed) {
    res.header("Access-Control-Allow-Origin", allowAnyOrigin ? "*" : origin || "*");
  }

  res.header("Vary", "Origin");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("X-Content-Type-Options", "nosniff");
  res.header("X-Frame-Options", "SAMEORIGIN");
  res.header("X-XSS-Protection", "1; mode=block");
  res.header(
    "Permissions-Policy",
    "camera=(self), microphone=(self), geolocation=(), payment=(), usb=(), accelerometer=(), gyroscope=()"
  );

  if (req.method === "OPTIONS") {
    if (!isAllowed) {
      return res
        .status(403)
        .json(errorResponse(ErrorCode.FORBIDDEN, "CORS origin not allowed"));
    }
    return res.sendStatus(200);
  }

  if (!isAllowed && origin) {
    return res
      .status(403)
      .json(errorResponse(ErrorCode.FORBIDDEN, "CORS origin not allowed"));
  }

  next();
});

app.use((req, res, next) => {
  if (!String(req.path || "").startsWith("/api")) {
    return next();
  }

  if (!csrfProtectedMethods.has(String(req.method || "GET").toUpperCase())) {
    return next();
  }

  // CSRF primarily affects browser-initiated cookie auth requests.
  if (!req.headers.cookie) {
    return next();
  }

  const hasBrowserSignals = Boolean(req.headers.origin || req.headers.referer || req.headers["sec-fetch-site"]);
  if (!hasBrowserSignals) {
    return next();
  }

  const originHeader = Array.isArray(req.headers.origin)
    ? req.headers.origin[0]
    : req.headers.origin;
  const refererHeader = Array.isArray(req.headers.referer)
    ? req.headers.referer[0]
    : req.headers.referer;

  const requestOrigin = normalizeOriginCandidate(originHeader) || normalizeOriginCandidate(refererHeader);
  if (!requestOrigin || !trustedCsrfOrigins.has(requestOrigin)) {
    return res
      .status(403)
      .json(errorResponse(ErrorCode.FORBIDDEN, "CSRF validation failed"));
  }

  return next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

// Canonical host redirect: consolidate www/non-www signals for search engines.
app.use((req, res, next) => {
  const method = String(req.method || "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    return next();
  }

  const forwardedHost = String(req.headers["x-forwarded-host"] || "").split(",")[0].trim();
  const hostHeader = String(forwardedHost || req.headers.host || "").trim().toLowerCase();
  const host = hostHeader.split(":")[0] || "";
  const managedHost = host === "classi-fy.com" || host === "www.classi-fy.com";

  if (!managedHost) {
    return next();
  }

  const safePath = resolveSafeRelativePath(req.originalUrl || "/");

  const legacyPathRedirects = new Map<string, string>([
    ["/parent-login", "/parent-auth"],
    ["/parent-signin", "/parent-auth"],
    ["/login", "/parent-auth"],
    ["/signin", "/parent-auth"],
    ["/child-login", "/child-link"],
    ["/child-signin", "/child-link"],
  ]);

  try {
    const currentUrl = new URL(safePath, "https://classi-fy.com");
    let shouldRedirect = false;

    if (host === "classi-fy.com" && currentUrl.pathname === "/" && currentUrl.searchParams.has("lang")) {
      currentUrl.searchParams.delete("lang");
      shouldRedirect = true;
    }

    const normalizedPath = currentUrl.pathname.replace(/\/+$/, "") || "/";
    const aliasTarget = legacyPathRedirects.get(normalizedPath.toLowerCase());
    if (aliasTarget && currentUrl.pathname !== aliasTarget) {
      currentUrl.pathname = aliasTarget;
      shouldRedirect = true;
    }

    const targetHost = host === "www.classi-fy.com" ? "classi-fy.com" : host;
    if (host !== targetHost) {
      shouldRedirect = true;
    }

    if (shouldRedirect) {
      const qs = currentUrl.searchParams.toString();
      const targetPath = `${currentUrl.pathname}${qs ? `?${qs}` : ""}${currentUrl.hash || ""}`;
      return res.redirect(301, `https://${targetHost}${targetPath}`);
    }
  } catch {
  }

  return next();
});

// API response cache headers for stable/semi-stable endpoints
// Reduces server load by allowing browsers to reuse recent responses
const apiCacheRules: Array<{ pattern: RegExp; maxAge: number }> = [
  { pattern: /^\/api\/games$/, maxAge: 60 },                // 1 min (game list)
  { pattern: /^\/api\/subjects$/, maxAge: 300 },           // 5 min
  { pattern: /^\/api\/parent\/ads$/, maxAge: 300 },         // 5 min
  { pattern: /^\/api\/parent\/referral-stats$/, maxAge: 120 }, // 2 min
  { pattern: /^\/api\/parent\/children\/status$/, maxAge: 120 }, // 2 min
  { pattern: /^\/api\/parent\/info$/, maxAge: 60 },         // 1 min
  { pattern: /^\/api\/parent\/notifications$/, maxAge: 5 },
  { pattern: /^\/api\/parent\/notifications\/unread-count$/, maxAge: 5 },
];

app.use((req, res, next) => {
  if (req.method === "GET") {
    for (const rule of apiCacheRules) {
      if (rule.pattern.test(req.path)) {
        res.set("Cache-Control", `private, max-age=${rule.maxAge}`);
        break;
      }
    }
  }
  next();
});

const CLUSTER_ENABLED = process.env["NODE_CLUSTER_ENABLED"] === "true";
const DEFAULT_WORKERS = process.env["NODE_ENV"] === "production" ? Math.min(os.cpus().length, 4) : 1;
const WORKER_COUNT = Math.max(1, Number(process.env["WEB_CONCURRENCY"] || String(DEFAULT_WORKERS)));
const STARTUP_RETRY_BASE_MS = Math.max(1000, Number(process.env["STARTUP_RETRY_BASE_MS"] || "3000"));
const STARTUP_RETRY_MAX_MS = Math.max(STARTUP_RETRY_BASE_MS, Number(process.env["STARTUP_RETRY_MAX_MS"] || "30000"));

let startupRetryAttempt = 0;

function isTransientDbError(error: any): boolean {
  const code = String(error?.code || "").toUpperCase();
  const message = String(error?.message || "").toLowerCase();

  if (["57P01", "57P02", "57P03", "ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "EPIPE"].includes(code)) {
    return true;
  }

  return (
    message.includes("connection terminated") ||
    message.includes("terminating connection") ||
    message.includes("connection refused") ||
    message.includes("server closed the connection") ||
    message.includes("database system is starting up")
  );
}

function scheduleStartupRetry(error: any) {
  startupRetryAttempt += 1;
  const delayMs = Math.min(
    STARTUP_RETRY_BASE_MS * Math.pow(2, Math.max(0, startupRetryAttempt - 1)),
    STARTUP_RETRY_MAX_MS,
  );

  console.warn(
    `⚠️ Server startup failed (attempt ${startupRetryAttempt}). Retrying in ${delayMs}ms...`,
    error?.message || error,
  );

  setTimeout(() => {
    void startHttpServer();
  }, delayMs);
}

async function startHttpServer() {
  try {
    startupRetryAttempt = 0;
    const server = await registerRoutes(app);
    const runningFromDist = import.meta.url.includes("/dist/index.js") || import.meta.url.includes("\\dist\\index.js");

    // Initialize Phase 1.4: Gift event → notification handlers
    await initializeGiftNotificationHandlers();

    // Background worker: media cleanup / purge
    startMediaWorker();
    startTaskNotificationWorker();
    startMonthlySubscriptionWorker();

    // Explicit API 404 guard to enforce JSON contract for unknown API routes
    app.use("/api", (req, res) => {
      res
        .status(404)
        .json(errorResponse(ErrorCode.NOT_FOUND, "API endpoint not found"));
    });

    // 🔴 GLOBAL ERROR HANDLER (must be AFTER all routes)
    app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      console.error("❌ Unhandled Error:", {
        message: err.message,
        code: err.code,
        timestamp: new Date().toISOString(),
        request: {
          method: req.method,
          path: req.originalUrl,
          headers: redactObject(req.headers),
          body: redactObject(req.body),
        },
      });

      res.status(status).json({
        success: false,
        error: err.code || "INTERNAL_SERVER_ERROR",
        message: message
      });
    });

    // Setup static files and SPA fallback
    // Only setup vite in development and after setting up all the other routes
    // so the catch-all route doesn't interfere with the other routes
    if (app.get("env") === "development" && !runningFromDist) {
      try {
        // Dynamic import vite only in development to avoid bundling in production
        const { setupVite } = await import("./vite");
        await setupVite(app, server);
      } catch (error: any) {
        console.error("⚠️ Vite dev middleware failed; continuing in API-only mode.", {
          message: error?.message || String(error),
        });
      }
    } else {
      try {
        serveStatic(app);
        console.log("✅ Static file serving configured successfully");
      } catch (error: any) {
        console.error("❌ Failed to setup static file serving:", error.message);
        process.exit(1);
      }
    }
    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || '5000', 10);
    const host = process.env.HOST || "0.0.0.0";

    const reusePort = process.platform !== "win32";
    server.listen({
      port,
      host,
      ...(reusePort ? { reusePort: true } : {}),
    }, () => {
      log(`✓ Server running on http://${host}:${port}`);
      if (app.get("env") === "production") {
        log(`✓ Static assets: dist/public | SPA fallback: index.html`);
      }

      // Recover any pending scheduled session unlocks lost due to server restart
      import("./services/scheduledSessionService").then(({ recoverPendingSessionUnlocks }) => {
        recoverPendingSessionUnlocks().catch(err => console.error("Session recovery error:", err));
      }).catch(() => { });
    });

    // Graceful shutdown
    process.on("SIGTERM", () => {
      log("📭 SIGTERM received, shutting down gracefully...");
      server.close(() => {
        log("✓ Server closed");
        process.exit(0);
      });
    });

    process.on("SIGINT", () => {
      log("📭 SIGINT received, shutting down gracefully...");
      server.close(() => {
        log("✓ Server closed");
        process.exit(0);
      });
    });

    // Catch unhandled rejections
    process.on("unhandledRejection", (reason: any) => {
      if (isTransientDbError(reason)) {
        console.warn("⚠️ Unhandled Promise Rejection (transient DB issue):", reason?.message || reason);
        return;
      }

      console.error("❌ Unhandled Promise Rejection:", reason);
      process.exit(1);
    });

  } catch (error: any) {
    if (isTransientDbError(error)) {
      scheduleStartupRetry(error);
      return;
    }

    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
}

if (CLUSTER_ENABLED && cluster.isPrimary) {
  log(`✓ Cluster mode enabled | workers=${WORKER_COUNT}`);

  for (let i = 0; i < WORKER_COUNT; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    console.error(`❌ Worker ${worker.process.pid} exited (code=${code}, signal=${signal || "none"}). Restarting...`);
    cluster.fork();
  });
} else {
  startHttpServer();
}
