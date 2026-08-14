import { Skeleton } from "@/components/ui/Skeletons";

/**
 * Route-transition fallback. Deliberately generic — each page renders its
 * own shape-matched skeletons once its data starts loading.
 */
export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading page"
      className="mx-auto w-full max-w-[104rem] px-3 pb-[var(--shell-pad-bottom)] pt-4 sm:px-5"
    >
      <span className="sr-only">Loading</span>

      <Skeleton className="mb-6 aspect-[16/7] w-full rounded-3xl sm:aspect-[21/7]" />

      <div className="mb-6 flex gap-3 overflow-hidden">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 w-[6.5rem] shrink-0 rounded-2xl sm:w-28" />
        ))}
      </div>

      <Skeleton className="mb-3 h-5 w-40" />
      <div className="space-y-2.5">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
