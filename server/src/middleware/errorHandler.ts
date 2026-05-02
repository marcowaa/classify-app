import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { config } from "../config";
import { logError } from "../utils/logger";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    code?: string
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  public readonly errors: any[];

  constructor(message: string, errors: any[] = []) {
    super(message, 400, true, "VALIDATION_ERROR");
    this.errors = errors;
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, 401, true, "AUTHENTICATION_ERROR");
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "Access denied") {
    super(message, 403, true, "AUTHORIZATION_ERROR");
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, 404, true, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message: string = "Resource already exists") {
    super(message, 409, true, "CONFLICT");
  }
}

function formatZodError(error: ZodError): string {
  return error.errors
    .map((e) => `${e.path.join(".")}: ${e.message}`)
    .join(", ");
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  logError(err, {
    requestId: req.requestId,
    path: req.path,
    method: req.method,
    userId: req.userId,
  });

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: "Validation failed",
      message: formatZodError(err),
      code: "VALIDATION_ERROR",
      ...(config.isDevelopment && { details: err.errors }),
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
      ...(err instanceof ValidationError && { validationErrors: err.errors }),
    });
  }

  const statusCode = (err as any).statusCode || (err as any).status || 500;
  
  if (statusCode === 500) {
    return res.status(500).json({
      success: false,
      error: config.isProduction
        ? "An unexpected error occurred"
        : err.message,
      code: "INTERNAL_ERROR",
      ...(config.isDevelopment && { stack: err.stack }),
    });
  }

  return res.status(statusCode).json({
    success: false,
    error: err.message || "An error occurred",
    code: "ERROR",
  });
}

export function notFoundHandler(req: Request, res: Response, _next: NextFunction) {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
    code: "NOT_FOUND",
  });
}

export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
