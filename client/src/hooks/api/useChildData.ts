import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, authenticatedFetch } from "@/lib/queryClient";

export function useChildInfo() {
  return useQuery({
    queryKey: ["child", "info"],
    queryFn: () => authenticatedFetch("/api/child/info"),
  });
}

export function useChildTasks() {
  return useQuery({
    queryKey: ["child", "tasks"],
    queryFn: () => authenticatedFetch("/api/child/tasks"),
  });
}

export function useChildGames() {
  return useQuery({
    queryKey: ["child", "games"],
    queryFn: () => authenticatedFetch("/api/child/games"),
  });
}

export function useChildProgress() {
  return useQuery({
    queryKey: ["child", "progress"],
    queryFn: () => authenticatedFetch("/api/child/progress"),
  });
}

export function useGrowthTree() {
  return useQuery({
    queryKey: ["child", "growth-tree"],
    queryFn: () => authenticatedFetch("/api/child/growth-tree"),
  });
}

export function useSubmitTaskAnswer() {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ taskId, answerId }: { taskId: string; answerId: string }) => {
      const res = await apiRequest("POST", "/api/child/submit-task", {
        taskId,
        selectedAnswerId: answerId,
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["child", "tasks"] });
      qc.invalidateQueries({ queryKey: ["child", "info"] });
      qc.invalidateQueries({ queryKey: ["child", "growth-tree"] });
    },
  });
}

export function usePlayGame() {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ gameId, score }: { gameId: string; score: number }) => {
      const res = await apiRequest("POST", `/api/child/games/${gameId}/play`, { score });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["child", "games"] });
      qc.invalidateQueries({ queryKey: ["child", "info"] });
      qc.invalidateQueries({ queryKey: ["child", "growth-tree"] });
    },
  });
}

export function useChildNotifications() {
  return useQuery({
    queryKey: ["child", "notifications"],
    queryFn: () => authenticatedFetch("/api/child/notifications"),
  });
}
