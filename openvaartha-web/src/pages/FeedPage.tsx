import React, { useRef, useEffect, useMemo } from 'react';
import { useFeed, useLikeDispatch } from '@/lib/api-hooks';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import FeedCard from '@/components/FeedCard';
import { BytesPageSkeleton } from '@/components/PageSkeletons';
import { Radio } from 'lucide-react';
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
    <div className="flex items-center my-8">
      <div className="flex-1 border-t border-border/60"></div>
      <div className="px-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">
        {label}
      </div>
      <div className="flex-1 border-t border-border/60"></div>
    </div>
  );
}

export default function FeedPage() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useFeed(20);
  const { mutate: likeDispatch } = useLikeDispatch();
  const sentinelRef = useRef<HTMLDivElement>(null);

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
    return data?.pages.flatMap(p => p.items) || [];
  }, [data]);

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
        <div className="max-w-2xl mx-auto w-full">
          {/* Header */}
          <header className="px-4 py-8 sm:py-10 text-center border-b border-border/40">
            <h1 className="font-display font-extrabold text-4xl sm:text-5xl tracking-tight mb-3">
              Feed
              <span className="inline-flex relative ml-3 -top-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base font-medium max-w-md mx-auto flex items-center justify-center gap-2">
              <Radio className="h-4 w-4" />
              Short dispatches from the newsroom
            </p>
          </header>

          {/* Feed Content */}
          {dispatches.length === 0 ? (
            <div className="text-center py-20 px-4">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted/50 flex items-center justify-center">
                <Radio className="h-10 w-10 text-muted-foreground opacity-50" />
              </div>
              <h2 className="text-xl font-bold mb-2">No dispatches yet</h2>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Check back later for live updates, short bursts of news, and behind-the-scenes content.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/20">
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
