import { Skeleton } from "@/components/ui/skeleton";

const FeedSkeleton = () => (
  <div className="space-y-6">
    {/* Hero skeleton */}
    <div className="rounded-xl border border-border/40 overflow-hidden">
      <Skeleton className="h-[280px] sm:h-[360px] rounded-none" />
      <div className="p-5 sm:p-8 space-y-4">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-7 w-1/2" />
        <Skeleton className="h-4 w-full mt-4" />
      </div>
    </div>

    {/* Grid skeletons */}
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-border/40 overflow-hidden">
          <Skeleton className="h-44 rounded-none" />
          <div className="p-4 space-y-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-3 w-full mt-3" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default FeedSkeleton;