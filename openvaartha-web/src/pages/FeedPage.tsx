import React, { useRef, useEffect, useMemo } from 'react';
import { useFeed, useLikeDispatch, useRepostDispatch } from '@/lib/api-hooks';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import FeedCard from '@/components/FeedCard';
import { StoriesBar } from '@/components/StoriesBar';
import { BytesPageSkeleton } from '@/components/PageSkeletons';
import { Radio } from 'lucide-react';

export default function FeedPage() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useFeed(20);
  const { mutate: likeDispatch } = useLikeDispatch();
  const { mutate: repostDispatch } = useRepostDispatch();
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Navbar hideHeader />
        <BytesPageSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans antialiased">
      {/* Bottom Nav rendered via Navbar with hideHeader */}
      <Navbar hideHeader />

      <main className="flex-1 pb-20 pt-2">
        {/* Top Stories Bar (Instagram-style Category Stories) */}
        <div className="border-b border-border/40 bg-card/30">
          <div className="max-w-xl mx-auto">
            <StoriesBar />
          </div>
        </div>

        {/* Continuous Social Media Timeline (No card borders, no date banners) */}
        <div className="max-w-xl mx-auto w-full pt-2">
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
            <div className="divide-y divide-border/40">
              {dispatches.map(dispatch => (
                <FeedCard 
                  key={dispatch.id} 
                  dispatch={dispatch} 
                  onLike={likeDispatch} 
                  onRepost={repostDispatch}
                />
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

