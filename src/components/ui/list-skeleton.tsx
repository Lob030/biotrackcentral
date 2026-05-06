import { cn } from "@/lib/utils";

interface ListSkeletonProps {
  rows?: number;
  className?: string;
  rowClassName?: string;
}

/**
 * Lightweight skeleton list for loading states on cards/rows.
 * Uses shimmer overlay for a more premium feel.
 */
export function ListSkeleton({
  rows = 4,
  className,
  rowClassName,
}: ListSkeletonProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "glass-card p-5 flex items-center gap-4",
            rowClassName,
          )}
        >
          <div className="flex-1 space-y-2">
            <div className="skeleton-shimmer h-4 w-1/3" />
            <div className="skeleton-shimmer h-3 w-1/2" />
          </div>
          <div className="skeleton-shimmer h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

interface CardGridSkeletonProps {
  count?: number;
  className?: string;
}

export function CardGridSkeleton({ count = 6, className }: CardGridSkeletonProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4",
        className,
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-card p-5 space-y-3">
          <div className="skeleton-shimmer h-5 w-1/2" />
          <div className="skeleton-shimmer h-3 w-2/3" />
          <div className="skeleton-shimmer h-3 w-1/3" />
          <div className="skeleton-shimmer h-8 w-full mt-3" />
        </div>
      ))}
    </div>
  );
}

interface StatGridSkeletonProps {
  count?: number;
}

export function StatGridSkeleton({ count = 4 }: StatGridSkeletonProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="stat-card space-y-3">
          <div className="skeleton-shimmer h-11 w-11 rounded-xl" />
          <div className="skeleton-shimmer h-3 w-2/3" />
          <div className="skeleton-shimmer h-8 w-1/2" />
          <div className="skeleton-shimmer h-3 w-3/4" />
        </div>
      ))}
    </div>
  );
}
