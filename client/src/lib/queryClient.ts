import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { ensureTrialWriteAllowed } from "@/lib/trialWriteGuard";

function getAuthHeaders(url?: string): Record<string, string> {
  const parentToken = localStorage.getItem("token");
  const childToken = localStorage.getItem("childToken");
  const adminToken = localStorage.getItem("adminToken");
  const isAdminRoute = typeof url === "string" && url.startsWith("/api/admin");
  const isChildRoute = typeof url === "string" && url.startsWith("/api/child");
  const token = isAdminRoute
    ? (adminToken || parentToken || childToken)
    : isChildRoute
      ? (childToken || parentToken || adminToken)
      : (parentToken || childToken || adminToken);
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: {
    headers?: Record<string, string>;
  },
): Promise<Response> {
  ensureTrialWriteAllowed(method, url);

  const headers: Record<string, string> = {
    ...getAuthHeaders(url),
    ...(options?.headers || {}),
  };

  if (data) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

export async function authenticatedFetch<T = unknown>(
  url: string,
  options?: {
    method?: string;
    body?: unknown;
    extractData?: boolean;
  }
): Promise<T> {
  const { method = "GET", body, extractData = true } = options || {};
  ensureTrialWriteAllowed(method, url);

  const headers: Record<string, string> = {
    ...getAuthHeaders(url),
  };

  if (body) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }

  const json = await res.json();

  if (extractData && json && typeof json === "object" && "data" in json) {
    return json.data as T;
  }

  return json as T;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
    async ({ queryKey }) => {
      const url = queryKey[0] as string;

      const res = await fetch(url, {
        headers: getAuthHeaders(url),
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      const json = await res.json();

      if (json && typeof json === "object" && "data" in json) {
        return json.data;
      }

      return json;
    };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      networkMode: "offlineFirst",
      staleTime: 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
    mutations: {
      retry: false,
      networkMode: "offlineFirst",
    },
  },
});
