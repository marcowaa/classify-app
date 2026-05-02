import pino from "pino";
import { v4 as uuidv4 } from "uuid";

const isProduction = process.env.NODE_ENV === "production";

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
  transport: isProduction
    ? undefined
    : {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss",
          ignore: "pid,hostname",
        },
      },
  formatters: {
    level: (label) => ({ level: label }),
    bindings: () => ({}),
  },
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
  base: {
    env: process.env.NODE_ENV,
  },
});

export function generateRequestId(): string {
  return uuidv4().substring(0, 8);
}

export function createChildLogger(context: Record<string, any>) {
  return logger.child(context);
}

export function logRequest(reqId: string, method: string, path: string, userId?: string) {
  logger.info({
    requestId: reqId,
    method,
    path,
    userId,
    type: "request",
  });
}

export function logResponse(
  reqId: string,
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  userId?: string
) {
  const logData = {
    requestId: reqId,
    method,
    path,
    statusCode,
    duration,
    userId,
    type: "response",
  };

  if (statusCode >= 500) {
    logger.error(logData);
  } else if (statusCode >= 400) {
    logger.warn(logData);
  } else {
    logger.info(logData);
  }
}

export function logAuth(event: "login" | "logout" | "login_failed" | "register", userId?: string, email?: string, ip?: string) {
  logger.info({
    type: "auth",
    event,
    userId,
    email,
    ip,
    timestamp: new Date().toISOString(),
  });
}

export function logError(error: Error, context?: Record<string, any>) {
  logger.error({
    type: "error",
    message: error.message,
    stack: isProduction ? undefined : error.stack,
    ...context,
  });
}

export function logCritical(message: string, context?: Record<string, any>) {
  logger.fatal({
    type: "critical",
    message,
    ...context,
    timestamp: new Date().toISOString(),
  });
}
