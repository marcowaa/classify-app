// Custom hooks for authentication and data fetching
// Reduces code duplication across components

import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

/**
 * Hook: Get parent profile information
 */
export function useParentInfo() {
  const token = localStorage.getItem("token");

  return useQuery({
    queryKey: ["parent-info"],
    queryFn: () => apiClient.get("/api/parent/info"),
    enabled: !!token,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook: Get child profile information
 */
export function useChildInfo() {
  const token = localStorage.getItem("childToken");

  return useQuery({
    queryKey: ["child-info"],
    queryFn: () => apiClient.get("/api/child/info"),
    enabled: !!token,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook: Get parent's children list
 */
export function useParentChildren() {
  const token = localStorage.getItem("token");

  return useQuery({
    queryKey: ["parent-children"],
    queryFn: () => apiClient.get("/api/parent/children"),
    enabled: !!token,
    retry: 1,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook: Get wallet information
 */
export function useWallet() {
  const token = localStorage.getItem("token");

  return useQuery({
    queryKey: ["wallet"],
    queryFn: () => apiClient.get("/api/parent/wallet"),
    enabled: !!token,
    retry: 1,
    staleTime: 1 * 60 * 1000,
  });
}

/**
 * Hook: Get notifications
 */
export function useNotifications() {
  const parentToken = localStorage.getItem("token");
  const childToken = localStorage.getItem("childToken");
  const token = parentToken || childToken;
  const endpoint = childToken && !parentToken ? "/api/child/notifications" : "/api/parent/notifications";

  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiClient.get(endpoint),
    enabled: !!token,
    retry: 1,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook: Parent login mutation
 */
export function useParentLogin() {
  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await apiClient.post("/api/auth/login", credentials);
      // Store token
      if (response?.token) {
        localStorage.setItem("token", response.token);
      }
      return response;
    },
  });
}

/**
 * Hook: Request OTP code (for login or password reset)
 */
export function useRequestOTP() {
  return useMutation({
    mutationFn: (email: string) =>
      apiClient.post("/api/auth/send-otp", { email, method: "email", purpose: "login" }),
  });
}

/**
 * Hook: Verify OTP code
 */
export function useVerifyOTP() {
  return useMutation({
    mutationFn: async (data: { email: string; code: string; method?: string }) => {
      const response = await apiClient.post("/api/auth/verify-otp", data);
      // Store token if returned
      if (response?.token) {
        localStorage.setItem("token", response.token);
      }
      return response;
    },
  });
}

/**
 * Hook: Admin login mutation
 */
export function useAdminLogin() {
  return useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const response = await apiClient.post("/api/admin/login", credentials);
      if (response?.token) {
        localStorage.setItem("adminToken", response.token);
      }
      return response;
    },
  });
}

/**
 * Hook: Logout
 */
export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      await apiClient.post("/api/auth/logout", {});
      // Clear tokens
      localStorage.removeItem("token");
      localStorage.removeItem("childToken");
      return true;
    },
  });
}

/**
 * Hook: Link child to parent (QR code or code)
 */
export function useLinkChild() {
  return useMutation({
    mutationFn: (data: { childCode?: string; qrData?: string }) =>
      apiClient.post("/api/parent/link-child", data),
  });
}

/**
 * Hook: Create new child
 */
export function useCreateChild() {
  return useMutation({
    mutationFn: (data: { name: string; [key: string]: any }) =>
      apiClient.post("/api/parent/children", data),
  });
}

/**
 * Hook: Update child information
 */
export function useUpdateChild() {
  return useMutation({
    mutationFn: (data: { childId: string; [key: string]: any }) =>
      apiClient.put(`/api/parent/children/${data.childId}`, data),
  });
}

/**
 * Hook: Delete child
 */
export function useDeleteChild() {
  return useMutation({
    mutationFn: (childId: string) =>
      apiClient.delete(`/api/parent/children/${childId}`),
  });
}
