import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { UserPlus, UserCheck, Loader2 } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface FollowButtonProps {
  entityType: "school" | "teacher" | "library";
  entityId: string;
  className?: string;
  size?: "sm" | "default" | "lg";
}

export function FollowButton({ entityType, entityId, className = "", size = "default" }: FollowButtonProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const { data: followStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["follow-status", entityType, entityId],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      if (!token) return { isFollowing: false };
      const res = await fetch(`/api/follow/status/${entityType}/${entityId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return { isFollowing: false };
      const json = await res.json();
      return json.data || { isFollowing: false };
    },
  });

  const { data: followCount } = useQuery({
    queryKey: ["follow-count", entityType, entityId],
    queryFn: async () => {
      const res = await fetch(`/api/follow/count/${entityType}/${entityId}`);
      if (!res.ok) return { count: 0 };
      const json = await res.json();
      return json.data || { count: 0 };
    },
  });

  const toggleFollow = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("token");
      if (!token) throw new Error(t("followButton.mustLogin"));

      const method = followStatus?.isFollowing ? "DELETE" : "POST";
      const res = await fetch("/api/follow", {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ entityType, entityId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "فشلت العملية");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follow-status", entityType, entityId] });
      queryClient.invalidateQueries({ queryKey: ["follow-count", entityType, entityId] });
      toast({
        title: followStatus?.isFollowing ? "تم إلغاء المتابعة" : "تمت المتابعة بنجاح",
      });
    },
    onError: (err: any) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const isFollowing = followStatus?.isFollowing;
  const count = followCount?.count || 0;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Button
        variant={isFollowing ? "secondary" : "default"}
        size={size}
        onClick={() => toggleFollow.mutate()}
        disabled={toggleFollow.isPending || statusLoading}
        className={`gap-2 transition-all ${
          isFollowing
            ? "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
            : "bg-blue-600 hover:bg-blue-700 text-white"
        }`}
      >
        {toggleFollow.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isFollowing ? (
          <UserCheck className="h-4 w-4" />
        ) : (
          <UserPlus className="h-4 w-4" />
        )}
        {isFollowing ? t("followButton.following") : t("followButton.follow")}
      </Button>
      {count > 0 && (
        <span className="text-sm text-muted-foreground">
          {count} متابع
        </span>
      )}
    </div>
  );
}
