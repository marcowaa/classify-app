// Centralized API client for all frontend requests
// Handles authentication, error handling, and standardized response format
import { ensureTrialWriteAllowed, TrialWriteBlockedError } from "@/lib/trialWriteGuard";

export interface ApiErrorPayload {
  success: false;
  error: string;
  message: string;
}

export interface ApiSuccessPayload<T = any> {
  success: true;
  data?: T;
  message?: string;
}

export type ApiPayload<T = any> = ApiSuccessPayload<T> | ApiErrorPayload;

/**
 * API Error class for proper error handling in components
 */
export class APIError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = "APIError";
  }
}

/**
 * Get authentication token from localStorage
 * Tries both parent token and child token
 */
function getAuthToken(url?: string): string | null {
  const parentToken = localStorage.getItem("token");
  const childToken = localStorage.getItem("childToken");
  const adminToken = localStorage.getItem("adminToken");
  const isAdminRoute = typeof url === "string" && url.startsWith("/api/admin");
  const isChildRoute = typeof url === "string" && url.startsWith("/api/child");
  return isAdminRoute
    ? (adminToken || parentToken || childToken)
    : isChildRoute
      ? (childToken || parentToken || adminToken)
      : (parentToken || childToken || adminToken);
}

/**
 * Build request headers with auth token
 */
function buildHeaders(url: string, init?: RequestInit): HeadersInit {
  const token = getAuthToken(url);
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...init?.headers,
  };
}

/**
 * Handle API response and throw errors appropriately
 */
async function handleResponse<T = any>(response: Response): Promise<T> {
  const data = await response.json();

  // Check HTTP status first
  if (!response.ok) {
    throw new APIError(
      response.status,
      data.error || "UNKNOWN_ERROR",
      data.message || `HTTP ${response.status}: ${response.statusText}`,
      data
    );
  }

  // Check for API-level errors (success: false)
  if (data.success === false) {
    throw new APIError(
      response.status,
      data.error || "API_ERROR",
      data.message || "API request failed",
      data
    );
  }

  // Return data directly if wrapped, otherwise return data object
  return (data.data !== undefined ? data.data : data) as T;
}

function rethrowClientError(error: unknown): never {
  if (error instanceof TrialWriteBlockedError) {
    throw new APIError(error.status, error.code, error.message, {
      upgradePath: error.upgradePath,
    });
  }
  throw error;
}

/**
 * Centralized API client
 * - Automatically adds auth token
 * - Handles errors consistently
 * - Works with both wrapped (success/data) and unwrapped responses
 */
export const apiClient = {
  /**
   * GET request
   */
  async get<T = any>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      ...options,
      method: "GET",
      headers: buildHeaders(url, options),
    });
    return handleResponse<T>(response);
  },

  /**
   * POST request
   */
  async post<T = any>(
    url: string,
    body?: any,
    options?: RequestInit
  ): Promise<T> {
    try {
      ensureTrialWriteAllowed("POST", url);
      const response = await fetch(url, {
        ...options,
        method: "POST",
        headers: buildHeaders(url, options),
        body: body ? JSON.stringify(body) : undefined,
      });
      return handleResponse<T>(response);
    } catch (error) {
      return rethrowClientError(error);
    }
  },

  /**
   * PUT request
   */
  async put<T = any>(
    url: string,
    body?: any,
    options?: RequestInit
  ): Promise<T> {
    try {
      ensureTrialWriteAllowed("PUT", url);
      const response = await fetch(url, {
        ...options,
        method: "PUT",
        headers: buildHeaders(url, options),
        body: body ? JSON.stringify(body) : undefined,
      });
      return handleResponse<T>(response);
    } catch (error) {
      return rethrowClientError(error);
    }
  },

  /**
   * PATCH request
   */
  async patch<T = any>(
    url: string,
    body?: any,
    options?: RequestInit
  ): Promise<T> {
    try {
      ensureTrialWriteAllowed("PATCH", url);
      const response = await fetch(url, {
        ...options,
        method: "PATCH",
        headers: buildHeaders(url, options),
        body: body ? JSON.stringify(body) : undefined,
      });
      return handleResponse<T>(response);
    } catch (error) {
      return rethrowClientError(error);
    }
  },

  /**
   * DELETE request
   */
  async delete<T = any>(url: string, options?: RequestInit): Promise<T> {
    try {
      ensureTrialWriteAllowed("DELETE", url);
      const response = await fetch(url, {
        ...options,
        method: "DELETE",
        headers: buildHeaders(url, options),
      });
      return handleResponse<T>(response);
    } catch (error) {
      return rethrowClientError(error);
    }
  },
};

export default apiClient;
