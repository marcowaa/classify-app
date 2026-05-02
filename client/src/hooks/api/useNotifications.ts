import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, authenticatedFetch } from "@/lib/queryClient";

type UserType = "parent" | "child";

type AppNotification = {
  id: string;
  isRead?: boolean;
};

type ParentNotificationPage = {
  items: AppNotification[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

export function useNotifications(userType: UserType = "parent", options?: { limit?: number; offset?: number }) {
  const apiBase = userType === "parent" ? "/api/parent" : "/api/child";
  const limit = Math.max(1, Math.min(200, options?.limit ?? 50));
  const offset = Math.max(0, options?.offset ?? 0);
  
  return useQuery({
    queryKey: [userType, "notifications", limit, offset],
    queryFn: async () => {
      if (userType === "parent") {
        const result = await authenticatedFetch<ParentNotificationPage>(
          `${apiBase}/notifications?limit=${limit}&offset=${offset}&includeMeta=1`
        );
        return result.items || [];
      }

      return authenticatedFetch<AppNotification[]>(`${apiBase}/notifications`);
    },
    refetchInterval: 30000,
  });
}

export function useUnreadCount(userType: UserType = "parent") {
  const apiBase = userType === "parent" ? "/api/parent" : "/api/child";
  
  return useQuery({
    queryKey: [userType, "notifications", "unread-count"],
    queryFn: async () => {
      const notifications = await authenticatedFetch<AppNotification[]>(`${apiBase}/notifications`);
      return notifications.filter((notification) => !notification.isRead).length;
    },
    refetchInterval: 30000,
  });
}

export function useMarkAsRead(userType: UserType = "parent") {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const endpoint = userType === "parent"
        ? `/api/parent/notifications/${notificationId}/read`
        : `/api/child/notifications/${notificationId}/read`;
      const method = userType === "parent" ? "POST" : "PUT";
      const res = await apiRequest(method, endpoint);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [userType, "notifications"] });
      qc.invalidateQueries({ queryKey: [userType, "notifications", "unread-count"] });
    },
  });
}

export function useMarkAllAsRead(userType: UserType = "parent") {
  const qc = useQueryClient();
  const apiBase = userType === "parent" ? "/api/parent" : "/api/child";
  
  return useMutation({
    mutationFn: async () => {
      if (userType === "parent") {
        const res = await apiRequest("POST", "/api/parent/notifications/read-all");
        return res.json();
      }

      const notifications = await authenticatedFetch<AppNotification[]>(`${apiBase}/notifications`);
      const unread = notifications.filter((notification) => !notification.isRead);

      await Promise.all(
        unread.map((notification) => {
          return apiRequest("PUT", `/api/child/notifications/${notification.id}/read`);
        })
      );

      return { success: true, data: { updated: unread.length } };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [userType, "notifications"] });
      qc.invalidateQueries({ queryKey: [userType, "notifications", "unread-count"] });
    },
  });
}

export function useDeleteNotification(userType: UserType = "parent") {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const res = userType === "parent"
        ? await apiRequest("DELETE", `/api/parent/notifications/${notificationId}`)
        : await apiRequest("POST", `/api/child/notifications/${notificationId}/resolve`);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [userType, "notifications"] });
      qc.invalidateQueries({ queryKey: [userType, "notifications", "unread-count"] });
    },
  });
}
