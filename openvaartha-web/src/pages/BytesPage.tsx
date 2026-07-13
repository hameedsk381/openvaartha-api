import { useEffect, useMemo, useRef, useState } from 'react';
import Navbar from '../components/Navbar';
import { ChevronUp } from '@/components/animate-ui/icons/chevron-up';
import { ChevronDown } from '@/components/animate-ui/icons/chevron-down';
import { useNavigate } from 'react-router-dom';
import { useDispatches } from '@/lib/api-hooks';
import ByteCard from '@/components/ByteCard';
import { BytesPageSkeleton } from '@/components/PageSkeletons';

const TRANSITION_MS = 420;

/**
 * Bytes: a full-screen, swipe-through stack of TODAY's dispatches — Reels
 * style, built to be shared (see ByteCard's Share button + /bytes/:id
 * permalinks). Every swipe, wheel notch, or arrow press advances exactly one
 * card with a quick, decisive transition — never a partial native scroll —
 * and input is locked for the duration of that transition so a fast flick
 * can't skip two cards at once. Scoped to the current day server-side (see
 * useDispatches(todayOnly)) — yesterday's bytes don't carry over.
 */
const BytesPage = () => {
  const { data: bytes = [], isLoading } = useDispatches(100, { todayOnly: true });
  const navigate = useNavigate();
  const viewportRef = useRef<HTMLDivElement>(null);
  const lockedRef = useRef(false);
  const touchStartY = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = useMemo(
    () => Array.from(new Set(bytes.map((b) => b.category).filter((c): c is string => !!c))),
    [bytes]
  );

  const filteredBytes = useMemo(
    () => (activeCategory === 'All' ? bytes : bytes.filter((b) => b.category === activeCategory)),
    [bytes, activeCategory]
  );

  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  useEffect(() => {
    setActiveIndex(0);
  }, [activeCategory]);

  const goBy = (delta: number) => {
    if (lockedRef.current) return;
    setActiveIndex((prev) => {
      const next = Math.max(0, Math.min(filteredBytes.length - 1, prev + delta));
      if (next !== prev) {
        lockedRef.current = true;
        setTimeout(() => { lockedRef.current = false; }, TRANSITION_MS);
      }
      return next;
    });
  };

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 12) return;
      goBy(e.deltaY > 0 ? 1 : -1);
    };
    const onTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (touchStartY.current === null) return;
      const delta = touchStartY.current - e.changedTouches[0].clientY;
      touchStartY.current = null;
      if (Math.abs(delta) < 40) return; // too small to count as a swipe
      goBy(delta > 0 ? 1 : -1);
    };

    el.addEventListener('wheel', onWheel, { passive: true });
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [filteredBytes.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') goBy(1);
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') goBy(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [filteredBytes.length]);

  if (isLoading && bytes.length === 0) {
    return <BytesPageSkeleton />;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background text-foreground">
      <Navbar />

      <header className="shrink-0 h-14 px-4 border-b border-border bg-background flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="relative inline-flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60 animate-ping" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>
          <h1 className="font-display text-lg font-bold tracking-tight">Bytes</h1>
          <span className="tag">Today · {today}</span>
        </div>

        {categories.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {(['All', ...categories]).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 h-7 px-3 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors border press ${
                  activeCategory === cat
                    ? 'bg-primary text-white border-primary'
                    : 'bg-background text-muted-foreground border-border hover:border-primary hover:text-primary'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </header>

      {filteredBytes.length === 0 ? (
        <main className="flex-1 min-h-0 flex items-center justify-center text-center px-4">
          <p className="font-serif italic text-muted-foreground">
            {bytes.length === 0
              ? "No bytes filed today yet. Check back soon — a fresh set starts every morning."
              : 'No bytes in this section today.'}
          </p>
        </main>
      ) : (
        <main ref={viewportRef} className="flex-1 min-h-0 relative overflow-hidden touch-none">
          <div
            className="flex flex-col h-full w-full"
            style={{
              transform: `translateY(-${activeIndex * 100}%)`,
              transition: `transform ${TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
            }}
          >
            {filteredBytes.map((byte, index) => {
              const card = (
                <ByteCard
                  byte={byte}
                  toneIndex={index}
                  shareUrl={`${window.location.origin}/bytes/${byte.id}`}
                />
              );

              return (
                <div key={byte.id} className="h-full w-full shrink-0">
                  {byte.articleSlug ? (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/article/${byte.articleSlug}`)}
                      onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/article/${byte.articleSlug}`); }}
                      className="h-full cursor-pointer"
                    >
                      {card}
                    </div>
                  ) : card}
                </div>
              );
            })}
          </div>
        </main>
      )}

      {/* Reserves room for Navbar's fixed mobile bottom-nav (.bottom-nav,
          sm:hidden) so it never covers the last card's footer/Share button. */}
      <div className="sm:hidden shrink-0 h-[calc(4rem+env(safe-area-inset-bottom))]" />

      {filteredBytes.length > 1 && (
        <div className="hidden sm:flex fixed right-6 top-1/2 -translate-y-1/2 z-20 flex-col items-center gap-3">
          <button
            onClick={() => goBy(-1)}
            disabled={activeIndex === 0}
            aria-label="Previous byte"
            className="h-10 w-10 rounded-full bg-background/80 backdrop-blur border border-border flex items-center justify-center text-foreground disabled:opacity-30 press shadow-md"
          >
            <ChevronUp className="h-4 w-4" animateOnHover />
          </button>
          <button
            onClick={() => goBy(1)}
            disabled={activeIndex === filteredBytes.length - 1}
            aria-label="Next byte"
            className="h-10 w-10 rounded-full bg-background/80 backdrop-blur border border-border flex items-center justify-center text-foreground disabled:opacity-30 press shadow-md"
          >
            <ChevronDown className="h-4 w-4" animateOnHover />
          </button>
        </div>
      )}
    </div>
  );
};

export default BytesPage;
