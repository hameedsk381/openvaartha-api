import React, { useRef, useEffect, useMemo, useState } from 'react';
import { useFeed, useLikeDispatch } from '@/lib/api-hooks';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import FeedCard from '@/components/FeedCard';
import { StoriesBar } from '@/components/StoriesBar';
import { BytesPageSkeleton } from '@/components/PageSkeletons';
import { Radio, Zap, Image as ImageIcon } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import type { Dispatch } from '@/lib/types';
import { cn } from '@/lib/utils';

function DateSeparator({ dateStr }: { dateStr: string }) {
  let label = dateStr;
  const d = new Date(dateStr);
  if (isToday(d)) {
    label = 'Today';
  } else if (isYesterday(d)) {
    label = 'Yesterday';
  } else {
    label = format(d, 'MMMM d, yyyy');
  }

  return (
    <div className="flex items-center my-6 max-w-xl mx-auto px-4">
      <div className="flex-1 border-t border-border/40"></div>
      <div className="px-3 py-1 text-[11px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/40 rounded-full border border-border/40">
        {label}
      </div>
      <div className="flex-1 border-t border-border/40"></div>
    </div>
  );
}

export default function FeedPage() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useFeed(20);
  const { mutate: likeDispatch } = useLikeDispatch();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<'all' | 'media' | 'breaking'>('all');

  useEffect(() => {
    if (!sentinelRef.current || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { rootMargin: '400px' }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, fetchNextPage]);

  const dispatches = useMemo(() => {
    const raw = data?.pages.flatMap(p => p.items) || [];
    if (filter === 'media') {
      return raw.filter(d => !!(d.imageUrl || d.videoUrl || (d as any).image_url || (d as any).video_url));
    }
    if (filter === 'breaking') {
      return raw.filter(d => d.category?.toLowerCase() === 'national' || d.category?.toLowerCase() === 'politics' || d.category?.toLowerCase() === 'breaking');
    }
    return raw;
  }, [data, filter]);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, Dispatch[]> = {};
    dispatches.forEach(d => {
      if (!d) return;
      const rawDate = d.createdAt || (d as any).created_at;
      if (!rawDate) return;
      let dateStr = '';
      if (typeof rawDate === 'string') {
        dateStr = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate.substring(0, 10);
      } else {
        try {
          dateStr = new Date(rawDate).toISOString().split('T')[0];
        } catch {
          dateStr = new Date().toISOString().split('T')[0];
        }
      }
      if (!dateStr) return;
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(d);
    });
    return Object.entries(groups).map(([date, items]) => ({ date, items })).sort((a, b) => b.date.localeCompare(a.date));
  }, [dispatches]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Navbar />
        <BytesPageSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans antialiased">
      <div className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
        <Navbar />
      </div>
      
      <main className="flex-1 pb-16">
        {/* Top Stories Bar (Instagram-style Category Stories) */}
        <div className="border-b border-border/40 bg-card/50">
          <div className="max-w-2xl mx-auto">
            <StoriesBar />
          </div>
        </div>

        {/* Filter Pills Bar */}
        <div className="max-w-xl mx-auto px-4 pt-4 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-full border border-border/40">
            <button
              onClick={() => setFilter('all')}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold transition-all press flex items-center gap-1",
                filter === 'all' 
                  ? "bg-background text-foreground shadow-xs font-bold" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Zap className="h-3 w-3" />
              All
            </button>
            <button
              onClick={() => setFilter('media')}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold transition-all press flex items-center gap-1",
                filter === 'media' 
                  ? "bg-background text-foreground shadow-xs font-bold" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ImageIcon className="h-3 w-3" />
              Media
            </button>
            <button
              onClick={() => setFilter('breaking')}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold transition-all press flex items-center gap-1",
                filter === 'breaking' 
                  ? "bg-background text-foreground shadow-xs font-bold" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Radio className="h-3 w-3 text-red-500" />
              Breaking
            </button>
          </div>

          <span className="text-[11px] font-semibold text-muted-foreground">
            {dispatches.length} posts
          </span>
        </div>

        <div className="max-w-2xl mx-auto w-full px-2 sm:px-4 pt-2">
          {/* Feed Content */}
          {dispatches.length === 0 ? (
            <div className="text-center py-20 px-4 max-w-sm mx-auto">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                <Radio className="h-8 w-8 text-muted-foreground opacity-50" />
              </div>
              <h2 className="text-lg font-bold mb-1">No posts found</h2>
              <p className="text-sm text-muted-foreground">
                Check back soon for live updates and short dispatches from the newsroom.
              </p>
            </div>
          ) : (
            <div>
              {groupedByDate.map(group => (
                <div key={group.date}>
                  <DateSeparator dateStr={group.date} />
                  {group.items.map(dispatch => (
                    <FeedCard 
                      key={dispatch.id} 
                      dispatch={dispatch} 
                      onLike={likeDispatch} 
                    />
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Infinite Scroll Sentinel */}
          <div ref={sentinelRef} className="h-10" />
          {isFetchingNextPage && (
            <div className="py-6 flex justify-center">
              <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

