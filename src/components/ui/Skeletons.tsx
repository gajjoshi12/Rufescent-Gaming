import { cn } from "@/lib/format";

/**
 * Loading placeholders. Each one mirrors the geometry of the component it
 * stands in for, so the layout does not jump when real data arrives.
 */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden="true" />;
}

/** Wrap a loading region so screen readers announce it rather than reading bars. */
export function LoadingRegion({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-live="polite" aria-label={label}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export function MatchRowSkeleton() {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="mb-3 flex items-center gap-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-12" />
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="flex gap-1.5">
          <Skeleton className="h-12 w-14 rounded-lg" />
          <Skeleton className="h-12 w-14 rounded-lg" />
          <Skeleton className="h-12 w-14 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function MatchListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <LoadingRegion label="Loading matches">
      <div className="space-y-2.5">
        {Array.from({ length: count }, (_, i) => (
          <MatchRowSkeleton key={i} />
        ))}
      </div>
    </LoadingRegion>
  );
}

export function MarketSkeleton() {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-11 flex-1" />
            <Skeleton className="h-11 w-16 rounded-lg" />
            <Skeleton className="h-11 w-16 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function MarketListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <LoadingRegion label="Loading markets">
      <div className="space-y-3">
        {Array.from({ length: count }, (_, i) => (
          <MarketSkeleton key={i} />
        ))}
      </div>
    </LoadingRegion>
  );
}

export function GameCardSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="aspect-4/5 w-full rounded-2xl" />
      <Skeleton className="h-3 w-3/4" />
      <Skeleton className="h-2.5 w-1/2" />
    </div>
  );
}

export function GameGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <LoadingRegion label="Loading games">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {Array.from({ length: count }, (_, i) => (
          <GameCardSkeleton key={i} />
        ))}
      </div>
    </LoadingRegion>
  );
}

export function ContestCardSkeleton() {
  return (
    <div className="glass space-y-3 rounded-2xl p-4">
      <div className="flex items-start justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-1.5 w-full rounded-full" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-20 rounded-xl" />
      </div>
    </div>
  );
}

export function ContestListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <LoadingRegion label="Loading contests">
      <div className="space-y-3">
        {Array.from({ length: count }, (_, i) => (
          <ContestCardSkeleton key={i} />
        ))}
      </div>
    </LoadingRegion>
  );
}

export function TransactionSkeleton({ count = 6 }: { count?: number }) {
  return (
    <LoadingRegion label="Loading transactions">
      <div className="space-y-1">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-3.5">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-2.5 w-24" />
            </div>
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

export function LeaderboardSkeleton({ count = 8 }: { count?: number }) {
  return (
    <LoadingRegion label="Loading leaderboard">
      <div className="space-y-1">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5">
            <Skeleton className="size-6 shrink-0 rounded-md" />
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-2.5 w-20" />
            </div>
            <Skeleton className="h-3.5 w-14" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

export function BannerSkeleton() {
  return (
    <LoadingRegion label="Loading promotions">
      <Skeleton className="aspect-[16/7] w-full rounded-3xl sm:aspect-[21/7]" />
    </LoadingRegion>
  );
}

export function PlayerRowSkeleton({ count = 6 }: { count?: number }) {
  return (
    <LoadingRegion label="Loading players">
      <div className="space-y-1.5">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-3">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-2.5 w-16" />
            </div>
            <Skeleton className="h-3.5 w-10" />
            <Skeleton className="size-8 shrink-0 rounded-full" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}
