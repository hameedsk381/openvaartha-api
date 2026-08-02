import { useEffect, useMemo, useRef, useState } from 'react';
import Navbar from '../components/Navbar';
import { ChevronUp } from '@/components/animate-ui/icons/chevron-up';
import { ChevronDown } from '@/components/animate-ui/icons/chevron-down';
import { useNavigate } from 'react-router-dom';
import { useDispatches } from '@/lib/api-hooks';
import ByteCard from '@/components/ByteCard';
import { BytesPageSkeleton } from '@/components/PageSkeletons';
import { cn } from '@/lib/utils';

const TRANSITION_MS = 420;

/**
 * Bytes: a full-screen, Instagram-Reels-style stack of TODAY's dispatches —
 * each byte fills the frame with its photo (or a brand gradient) and a dark
 * scrim under the caption, an action rail on the right for Share, and a
 * segmented progress bar up top. Every swipe, wheel notch, or arrow press
 * advances exactly one card with a quick, decisive transition — never a
 * partial native scroll — and input is locked for the duration of that
 * transition so a fast flick can't skip two cards at once. Scoped to the
 * current day server-side (see useDispatches(todayOnly)).
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
    <div className="h-screen flex flex-col overflow-hidden bg-black text-white">
      <Navbar />

      <main ref={viewportRef} className="flex-1 min-h-0 relative overflow-hidden touch-none bg-black">
        {filteredBytes.length > 0 && (
          <>
            {/* Segmented progress bars */}
            <div className="absolute top-2 inset-x-0 z-30 px-2 sm:px-3 flex gap-1 pointer-events-none">
              {filteredBytes.map((byte, index) => (
                <div
                  key={byte.id}
                  className={cn(
                    'h-[3px] flex-1 rounded-full overflow-hidden bg-white/25',
                    index < activeIndex && 'bg-white/60',
                    index === activeIndex && 'bg-white'
                  )}
                >
                  <div className="h-full w-full" />
                </div>
              ))}
            </div>

            {/* Title + category chips */}
            <div className="absolute top-3 inset-x-0 z-30 px-2 sm:px-3 flex justify-center">
              <div className="flex items-center gap-2 max-w-full overflow-x-auto no-scrollbar px-2 py-1 rounded-full bg-black/45 backdrop-blur border border-white/15 shadow-lg">
                <span className="shrink-0 flex items-center gap-1.5 pl-1 pr-2 text-[11px] font-black uppercase tracking-widest">
                  <span className="relative inline-flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-70 animate-ping" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                  </span>
                  Bytes · {today}
                </span>

                {categories.length > 0 && (
                  <>
                    <span className="shrink-0 h-4 w-px bg-white/20" />
                    {['All', ...categories].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={cn(
                          'shrink-0 h-6 px-3 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors press border',
                          activeCategory === cat
                            ? 'bg-white text-black border-white'
                            : 'text-white/80 border-white/20 hover:bg-white/10 hover:text-white'
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {filteredBytes.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center px-4">
            <p className="font-serif italic text-white/70">
              {bytes.length === 0
                ? "No bytes filed today yet. Check back soon — a fresh set starts every morning."
                : 'No bytes in this section today.'}
            </p>
          </div>
        ) : (
          <div
            className="flex flex-col h-full w-full"
            style={{
              transform: `translateY(-${activeIndex * 100}%)`,
              transition: `transform ${TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
            }}
          >
            {filteredBytes.map((byte, index) => (
              <div key={byte.id} className="h-full w-full shrink-0">
                <ByteCard
                  byte={byte}
                  toneIndex={index}
                  shareUrl={`${window.location.origin}/bytes/${byte.id}`}
                  onReadStory={byte.articleSlug ? () => navigate(`/article/${byte.articleSlug}`) : undefined}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Reserves room for Navbar's fixed mobile bottom-nav (.bottom-nav,
          sm:hidden) so it never covers the card's action rail. */}
      <div className="sm:hidden shrink-0 h-[calc(4rem+env(safe-area-inset-bottom))]" />

      {filteredBytes.length > 1 && (
        <div className="hidden sm:flex fixed right-6 top-1/2 -translate-y-1/2 z-20 flex-col items-center gap-3">
          <button
            onClick={() => goBy(-1)}
            disabled={activeIndex === 0}
            aria-label="Previous byte"
            className="h-10 w-10 rounded-full bg-black/45 backdrop-blur border border-white/20 flex items-center justify-center text-white disabled:opacity-30 press shadow-lg"
          >
            <ChevronUp className="h-4 w-4" animateOnHover />
          </button>
          <button
            onClick={() => goBy(1)}
            disabled={activeIndex === filteredBytes.length - 1}
            aria-label="Next byte"
            className="h-10 w-10 rounded-full bg-black/45 backdrop-blur border border-white/20 flex items-center justify-center text-white disabled:opacity-30 press shadow-lg"
          >
            <ChevronDown className="h-4 w-4" animateOnHover />
          </button>
        </div>
      )}
    </div>
  );
};

export default BytesPage;
