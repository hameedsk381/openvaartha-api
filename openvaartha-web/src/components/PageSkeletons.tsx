import { Skeleton } from "@/components/ui/skeleton";

/* ─── ArticlePage Skeleton ───────────────────────────── */

export const ArticleSkeleton = () => (
  <div className="min-h-screen bg-background animate-fade-in">
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-10 py-24 space-y-8">
      {/* Back button link */}
      <Skeleton className="h-4 w-28" />

      {/* Headline */}
      <div className="space-y-3">
        <Skeleton className="h-10 sm:h-12 w-full" />
        <Skeleton className="h-10 sm:h-12 w-5/6" />
      </div>

      {/* Metadata (Author, date, category) */}
      <div className="flex items-center gap-4 py-2 border-y border-border">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-3.5 w-48" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>

      {/* Main Image */}
      <Skeleton className="h-[250px] sm:h-[450px] w-full rounded-xl" />

      {/* TL;DR Box */}
      <div className="p-6 rounded-2xl border border-border bg-muted/30 space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-11/12" />
        </div>
      </div>

      {/* Article Body Paragraphs */}
      <div className="space-y-6 pt-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        <div className="space-y-2 pt-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    </div>
  </div>
);

/* ─── CategoryPage Skeleton ─────────────────────────── */

export const CategoryPageSkeleton = () => (
  <div className="min-h-screen bg-background animate-fade-in">
    <div className="max-w-screen-2xl mx-auto pt-24 pb-16">
      {/* Header */}
      <header className="px-4 sm:px-6 lg:px-10 py-10 sm:py-14 border-b border-border bg-muted/10 space-y-4">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-10 sm:h-12 w-48" />
        <Skeleton className="h-4 w-72" />
      </header>

      {/* Content Layout */}
      <div className="px-4 sm:px-6 lg:px-10 py-8 space-y-12">
        {/* Featured Big Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 border border-border/60 rounded-2xl overflow-hidden">
          <Skeleton className="lg:col-span-7 h-[250px] sm:h-[400px] rounded-none" />
          <div className="lg:col-span-5 p-6 sm:p-10 flex flex-col justify-center space-y-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>

        {/* Secondary Grid (2 column) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="aspect-[16/10] w-full rounded-xl" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-4/5" />
            </div>
          ))}
        </div>

        {/* List Grid (3 column) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-8 border-t border-border">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4 items-start">
              <Skeleton className="w-24 h-20 shrink-0 rounded-lg" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

/* ─── TrendingPage Skeleton ─────────────────────────── */

export const TrendingPageSkeleton = () => (
  <div className="min-h-screen bg-background animate-fade-in">
    <div className="max-w-screen-2xl mx-auto pt-24 pb-16">
      {/* Header */}
      <header className="px-4 sm:px-6 lg:px-10 py-10 sm:py-14 border-b border-border bg-muted/10 space-y-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 sm:h-12 w-64" />
        <Skeleton className="h-4 w-96" />
      </header>

      {/* Grid structure */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-4 sm:px-6 lg:px-10 py-8">
        {/* Left main feed */}
        <div className="lg:col-span-8 space-y-8">
          {/* Lead item */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-b border-border pb-8">
            <Skeleton className="aspect-[4/3] rounded-xl" />
            <div className="flex flex-col justify-center space-y-4">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-7 w-full" />
              <Skeleton className="h-7 w-2/3" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>

          {/* Ranked items list */}
          <div className="space-y-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-6 items-start pb-6 border-b border-border/40 last:border-0">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3.5 w-16" />
                  <Skeleton className="h-5 w-5/6" />
                  <Skeleton className="h-3.5 w-24" />
                </div>
                <Skeleton className="h-20 w-24 rounded-lg shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="lg:col-span-4 space-y-8">
          <Skeleton className="h-[250px] w-full rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-5 w-28" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

/* ─── ExplainersPage Skeleton ───────────────────────── */

export const ExplainersPageSkeleton = () => (
  <div className="min-h-screen bg-background animate-fade-in">
    <div className="max-w-screen-2xl mx-auto pt-24 pb-16">
      {/* Header */}
      <header className="px-4 sm:px-6 lg:px-10 py-10 sm:py-14 border-b border-border bg-muted/10 space-y-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-10 sm:h-12 w-56" />
        <Skeleton className="h-4 w-96" />
      </header>

      {/* Grid contents */}
      <div className="px-4 sm:px-6 lg:px-10 py-8 space-y-12">
        {/* Large lead explainer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 border border-border/50 rounded-2xl overflow-hidden">
          <Skeleton className="lg:col-span-7 h-[250px] sm:h-[350px] rounded-none" />
          <div className="lg:col-span-5 p-8 flex flex-col justify-center space-y-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-4/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>

        {/* Regular explainer grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="aspect-[16/10] w-full rounded-xl" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-5/6" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

/* ─── LiveUpdatesPage Skeleton ───────────────────────── */

export const LiveUpdatesPageSkeleton = () => (
  <div className="min-h-screen bg-background animate-fade-in">
    <div className="max-w-screen-2xl mx-auto pt-24 pb-16">
      {/* Header */}
      <header className="px-4 sm:px-6 lg:px-10 py-10 sm:py-14 border-b border-border bg-muted/10 space-y-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 sm:h-12 w-64" />
        <Skeleton className="h-4 w-96" />
      </header>

      {/* Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 px-4 sm:px-6 lg:px-10 py-10">
        {/* Left Live feed */}
        <div className="lg:col-span-8 space-y-8">
          <Skeleton className="h-6 w-32" />

          {/* Timeline skeleton */}
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border/60" />
            <div className="space-y-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="relative pl-12">
                  {/* Timeline dot */}
                  <div className="absolute left-2.5 top-1.5 h-3.5 w-3.5 rounded-full bg-border ring-4 ring-background" />
                  <div className="space-y-2.5">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-11/12" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <Skeleton className="h-5 w-36" />
          {[1, 2].map((i) => (
            <div key={i} className="space-y-2 border border-border/40 p-4 rounded-xl">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);
