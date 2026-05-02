import { Skeleton } from "@/components/ui/skeleton";

export function TaskCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl p-4 bg-white/10 backdrop-blur-sm border border-white/20"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded-full bg-white/20" />
                <Skeleton className="h-3 w-16 bg-white/20" />
              </div>
              <Skeleton className="h-4 w-3/4 bg-white/20" />
              <Skeleton className="h-4 w-1/2 bg-white/20" />
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <Skeleton className="h-8 w-16 rounded-xl bg-white/20" />
              <Skeleton className="h-6 w-14 rounded-lg bg-white/20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl p-4 border bg-card">
          <div className="space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ListItemSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl p-4 border bg-card">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 flex-1">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function HelpRequestSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl p-4 border bg-card">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
