// Standard API response utilities
// Ensures all API endpoints return consistent format

export interface ApiSuccessResponse<T = any> {
  success: true;
  data?: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  message: string;
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

// Success response helper
export function successResponse<T = any>(
  data?: T,
  message?: string
): ApiSuccessResponse<T> {
  return {
    success: true,
    ...(data !== undefined && { data }),
    ...(message && { message }),
  };
}

// Error response helper
export function errorResponse(
  error: string,
  message: string
): ApiErrorResponse {
  return {
    success: false,
    error,
    message,
  };
}

// Standard error codes (matching copilot-instructions.md)
export enum ErrorCode {
  NOT_FOUND = "NOT_FOUND",
  UNAUTHORIZED = "UNAUTHORIZED",
  BAD_REQUEST = "BAD_REQUEST",
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
  PARENT_CHILD_MISMATCH = "PARENT_CHILD_MISMATCH",
  OTP_EXPIRED = "OTP_EXPIRED",
  RATE_LIMITED = "RATE_LIMITED",
  FORBIDDEN = "FORBIDDEN",
  CONFLICT = "CONFLICT",
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  SMS_NOT_ENABLED = "SMS_NOT_ENABLED",
  PAYMENT_FAILED = "PAYMENT_FAILED",
}

// HTTP status code mapping
export function getHttpStatus(errorCode: ErrorCode): number {
  const statusMap: Record<ErrorCode, number> = {
    [ErrorCode.NOT_FOUND]: 404,
    [ErrorCode.UNAUTHORIZED]: 401,
    [ErrorCode.BAD_REQUEST]: 400,
    [ErrorCode.INTERNAL_SERVER_ERROR]: 500,
    [ErrorCode.PARENT_CHILD_MISMATCH]: 403,
    [ErrorCode.OTP_EXPIRED]: 400,
    [ErrorCode.RATE_LIMITED]: 429,
    [ErrorCode.FORBIDDEN]: 403,
    [ErrorCode.CONFLICT]: 409,
    [ErrorCode.INVALID_CREDENTIALS]: 401,
    [ErrorCode.SMS_NOT_ENABLED]: 400,
    [ErrorCode.PAYMENT_FAILED]: 400,
  };
  return statusMap[errorCode] || 500;
}
