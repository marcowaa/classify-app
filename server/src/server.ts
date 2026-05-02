import express, { type Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { config } from "./config";
import { createRedisClient } from "./config/redis";
import { logger } from "./utils/logger";
import {
  requestLoggerMiddleware,
  helmetMiddleware,
  corsMiddleware,
  sanitizeMiddleware,
  securityHeadersMiddleware,
  generalRateLimiter,
  errorHandler,
  notFoundHandler,
} from "./middleware";
import { compressionMiddleware } from "./middleware/compression";

export function createApp(): express.Application {
  const app = express();
  const requestBodyLimit = process.env.REQUEST_BODY_LIMIT || "512mb";

  createRedisClient();

  app.set("trust proxy", 1);

  app.use(helmetMiddleware);
  app.use(corsMiddleware);
  app.use(securityHeadersMiddleware);

  app.use(compressionMiddleware);

  app.use(express.json({ limit: requestBodyLimit }));
  app.use(express.urlencoded({ extended: false, limit: requestBodyLimit }));

  app.use(sanitizeMiddleware);

  app.use(requestLoggerMiddleware);

  app.use("/api", generalRateLimiter);

  // Keep root URL usable for API-only deployments.
  app.get("/", (_req: Request, res: Response) => {
    return res.redirect(302, "/api/health");
  });

  app.get("/api/health", async (_req: Request, res: Response) => {
    const memoryUsage = process.memoryUsage();
    const checks: Record<string, { status: string; latency?: number; details?: any }> = {};

    // DB check
    try {
      const dbStart = Date.now();
      const { storage } = await import("../storage");
      const { sql } = await import("drizzle-orm");
      await storage.db.execute(sql`SELECT 1`);
      checks.database = { status: "healthy", latency: Date.now() - dbStart };
    } catch (err: any) {
      checks.database = { status: "unhealthy", details: err.message };
    }

    // Redis check
    try {
      const { isRedisConnected } = await import("./config/redis");
      checks.redis = { status: isRedisConnected() ? "healthy" : "degraded" };
    } catch {
      checks.redis = { status: "unavailable" };
    }

    const allHealthy = Object.values(checks).every(c => c.status === "healthy");

    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
      },
      env: config.env,
      checks,
    });
  });

  app.get("/api/ready", (_req: Request, res: Response) => {
    res.json({ ready: true });
  });

  // Prometheus-compatible metrics endpoint
  app.get("/api/metrics", (_req: Request, res: Response) => {
    const mem = process.memoryUsage();
    const cpu = process.cpuUsage();
    const uptime = process.uptime();

    const lines = [
      "# HELP process_uptime_seconds Process uptime in seconds",
      "# TYPE process_uptime_seconds gauge",
      `process_uptime_seconds ${uptime.toFixed(2)}`,
      "",
      "# HELP process_resident_memory_bytes Resident memory size in bytes",
      "# TYPE process_resident_memory_bytes gauge",
      `process_resident_memory_bytes ${mem.rss}`,
      "",
      "# HELP process_heap_bytes_used Node.js heap used in bytes",
      "# TYPE process_heap_bytes_used gauge",
      `process_heap_bytes_used ${mem.heapUsed}`,
      "",
      "# HELP process_heap_bytes_total Node.js total heap in bytes",
      "# TYPE process_heap_bytes_total gauge",
      `process_heap_bytes_total ${mem.heapTotal}`,
      "",
      "# HELP process_external_memory_bytes External memory in bytes",
      "# TYPE process_external_memory_bytes gauge",
      `process_external_memory_bytes ${mem.external}`,
      "",
      "# HELP process_cpu_user_seconds_total CPU user time in seconds",
      "# TYPE process_cpu_user_seconds_total counter",
      `process_cpu_user_seconds_total ${(cpu.user / 1e6).toFixed(4)}`,
      "",
      "# HELP process_cpu_system_seconds_total CPU system time in seconds",
      "# TYPE process_cpu_system_seconds_total counter",
      `process_cpu_system_seconds_total ${(cpu.system / 1e6).toFixed(4)}`,
      "",
      "# HELP nodejs_active_handles_total Number of active handles",
      "# TYPE nodejs_active_handles_total gauge",
      `nodejs_active_handles_total ${(process as any)._getActiveHandles?.()?.length ?? 0}`,
      "",
      "# HELP nodejs_active_requests_total Number of active requests",
      "# TYPE nodejs_active_requests_total gauge",
      `nodejs_active_requests_total ${(process as any)._getActiveRequests?.()?.length ?? 0}`,
      "",
      "# HELP nodejs_event_loop_lag_seconds Event loop lag in seconds",
      "# TYPE nodejs_event_loop_lag_seconds gauge",
      `nodejs_event_loop_lag_seconds 0`,
      "",
    ];

    res.set("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
    res.send(lines.join("\n"));
  });

  return app;
}

export function attachErrorHandlers(app: express.Application): void {
  app.use(notFoundHandler);
  app.use(errorHandler);
}

export function startServer(app: express.Application): Server {
  const server = createServer(app);

  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;

  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.syscall !== "listen") {
      throw error;
    }

    const bind = `Port ${config.port}`;

    switch (error.code) {
      case "EACCES":
        logger.fatal({ bind }, "Requires elevated privileges");
        process.exit(1);
        break;
      case "EADDRINUSE":
        logger.fatal({ bind }, "Port is already in use");
        process.exit(1);
        break;
      default:
        throw error;
    }
  });

  server.listen(config.port, "0.0.0.0", () => {
    logger.info({
      port: config.port,
      env: config.env,
      nodeVersion: process.version,
    }, `Server started on port ${config.port}`);
  });

  return server;
}

process.on("uncaughtException", (error: Error) => {
  logger.fatal({ error: error.message, stack: error.stack }, "Uncaught Exception");
  process.exit(1);
});

process.on("unhandledRejection", (reason: any) => {
  logger.fatal({ reason }, "Unhandled Rejection");
  process.exit(1);
});

let isShuttingDown = false;

export function setupGracefulShutdown(server: Server): void {
  const shutdown = (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info({ signal }, "Received shutdown signal, closing server...");

    server.close((err) => {
      if (err) {
        logger.error({ error: err.message }, "Error during server close");
        process.exit(1);
      }

      logger.info("Server closed successfully");
      process.exit(0);
    });

    setTimeout(() => {
      logger.warn("Could not close connections in time, forcefully shutting down");
      process.exit(1);
    }, 30000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
