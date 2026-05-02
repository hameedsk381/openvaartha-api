import { cn } from "@/lib/utils";

const FeedSkeleton = () => (
  <div className="animate-pulse space-y-6">
    {/* Hero skeleton */}
    <div className="rounded-2xl border border-border/40 bg-muted/30 overflow-hidden">
      <div className="h-[280px] sm:h-[360px] bg-muted/50" />
      <div className="p-5 sm:p-8 space-y-4">
        <div className="h-3 w-20 rounded bg-muted/60" />
        <div className="h-7 w-3/4 rounded bg-muted/50" />
        <div className="h-7 w-1/2 rounded bg-muted/50" />
        <div className="h-4 w-full rounded bg-muted/30 mt-4" />
      </div>
    </div>

    {/* Grid skeletons */}
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl border border-border/40 bg-muted/30 overflow-hidden">
          <div className="h-44 bg-muted/50" />
          <div className="p-4 space-y-3">
            <div className="h-3 w-16 rounded bg-muted/60" />
            <div className="h-5 w-full rounded bg-muted/50" />
            <div className="h-5 w-2/3 rounded bg-muted/50" />
            <div className="h-3 w-full rounded bg-muted/30 mt-3" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default FeedSkeleton;
