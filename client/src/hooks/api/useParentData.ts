import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn, authenticatedFetch } from "@/lib/queryClient";

export function useParentInfo() {
  return useQuery({
    queryKey: ["parent", "info"],
    queryFn: () => authenticatedFetch("/api/parent/info"),
  });
}

export function useParentChildren() {
  return useQuery({
    queryKey: ["parent", "children"],
    queryFn: () => authenticatedFetch("/api/parent/children"),
  });
}

export function useParentNotifications() {
  return useQuery({
    queryKey: ["parent", "notifications"],
    queryFn: () => authenticatedFetch("/api/parent/notifications"),
  });
}

export function useParentTasks(childId?: string) {
  return useQuery({
    queryKey: ["parent", "tasks", childId],
    queryFn: () => authenticatedFetch(childId ? `/api/parent/tasks?childId=${childId}` : "/api/parent/tasks"),
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: async (taskData: {
      childId: string;
      question: string;
      answers: { text: string; isCorrect: boolean }[];
      pointsReward: number;
      imageUrl?: string;
      subjectId?: string;
    }) => {
      const res = await apiRequest("POST", "/api/parent/tasks", taskData);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parent", "tasks"] });
    },
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await apiRequest("POST", `/api/parent/notifications/${notificationId}/read`);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parent", "notifications"] });
    },
  });
}

export function useParentWallet() {
  return useQuery({
    queryKey: ["parent", "wallet"],
    queryFn: () => authenticatedFetch("/api/parent/wallet"),
  });
}

export function useParentStats() {
  return useQuery({
    queryKey: ["parent", "dashboard-stats"],
    queryFn: () => authenticatedFetch("/api/parent/dashboard-stats"),
  });
}
