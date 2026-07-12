import { useEffect, useMemo, useRef, useState } from 'react';
import Navbar from '../components/Navbar';
import { ArrowUpRight } from 'lucide-react';
import { AnimatedIcon } from '@/components/ui/animated-icon';
import { ChevronUp } from '@/components/animate-ui/icons/chevron-up';
import { ChevronDown } from '@/components/animate-ui/icons/chevron-down';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatches } from '@/lib/api-hooks';
import { BytesPageSkeleton } from '@/components/PageSkeletons';

const relativeTime = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

// Cycle through the brand's existing gradient tokens rather than inventing
// new colors — keeps every card on-brand while still reading as distinct.
const CARD_BACKGROUNDS = ['gradient-maroon', 'gradient-beige', 'gradient-maroon', 'gradient-warm'];

/**
 * Bytes: a full-screen, swipe-through stack of short dispatches — Inshorts
 * style. One headline per screen; swipe (or scroll/arrow-key) to the next.
 */
const BytesPage = () => {
  const { data: bytes = [], isLoading } = useDispatches(100);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showHint, setShowHint] = useState(true);

  const isLightTone = (index: number) => CARD_BACKGROUNDS[index % CARD_BACKGROUNDS.length] === 'gradient-beige';

  useEffect(() => {
    const container = containerRef.current;
    if (!container || bytes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            const idx = cardRefs.current.findIndex((el) => el === entry.target);
            if (idx !== -1) setActiveIndex(idx);
          }
        });
      },
      { root: container, threshold: [0.6] }
    );

    cardRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [bytes.length]);

  const scrollToIndex = (index: number) => {
    const clamped = Math.max(0, Math.min(bytes.length - 1, index));
    cardRefs.current[clamped]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setShowHint(false);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') scrollToIndex(activeIndex + 1);
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') scrollToIndex(activeIndex - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeIndex, bytes.length]);

  if (isLoading && bytes.length === 0) {
    return <BytesPageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {bytes.length === 0 ? (
        <main className="pt-20 pb-16 text-center">
          <p className="font-serif italic text-muted-foreground py-16 px-4">
            No bytes yet. Check back soon.
          </p>
        </main>
      ) : (
        <main
          ref={containerRef}
          className="h-[calc(100vh-3.5rem)] overflow-y-auto snap-y snap-mandatory scroll-smooth no-scrollbar"
          onScroll={() => setShowHint(false)}
        >
          {bytes.map((byte, index) => {
            const light = isLightTone(index);
            const card = (
              <div
                ref={(el) => (cardRefs.current[index] = el)}
                key={byte.id}
                className={`relative h-[calc(100vh-3.5rem)] snap-start snap-always flex flex-col justify-center px-6 sm:px-16 ${CARD_BACKGROUNDS[index % CARD_BACKGROUNDS.length]}`}
              >
                <div className="max-w-2xl mx-auto w-full">
                  <div className="flex items-center gap-2 mb-6">
                    <span className="relative inline-flex h-2 w-2">
                      <span className={`absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping ${light ? 'bg-primary' : 'bg-white'}`} />
                      <span className={`relative inline-flex h-2 w-2 rounded-full ${light ? 'bg-primary' : 'bg-white'}`} />
                    </span>
                    <span className={`text-[11px] font-bold uppercase tracking-[0.2em] ${light ? 'text-primary' : 'text-white/80'}`}>
                      {relativeTime(byte.createdAt)}
                    </span>
                  </div>

                  <p className={`font-serif text-2xl sm:text-4xl font-bold leading-[1.2] tracking-tight ${light ? 'text-foreground' : 'text-white'}`}>
                    {byte.text}
                  </p>

                  {byte.articleSlug && (
                    <span className={`mt-8 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] ${light ? 'text-primary' : 'text-white'}`}>
                      Read full story
                      <AnimatedIcon animationType="arrowUpRight">
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </AnimatedIcon>
                    </span>
                  )}
                </div>

                <span className={`absolute bottom-6 left-1/2 -translate-x-1/2 text-[11px] font-semibold tabular-nums ${light ? 'text-muted-foreground' : 'text-white/60'}`}>
                  {index + 1} / {bytes.length}
                </span>
              </div>
            );

            return byte.articleSlug ? (
              <div
                key={byte.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/article/${byte.articleSlug}`)}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/article/${byte.articleSlug}`); }}
                className="cursor-pointer"
              >
                {card}
              </div>
            ) : (
              card
            );
          })}
        </main>
      )}

      {bytes.length > 1 && (
        <div className="hidden sm:flex fixed right-6 top-1/2 -translate-y-1/2 z-20 flex-col items-center gap-3">
          <button
            onClick={() => scrollToIndex(activeIndex - 1)}
            disabled={activeIndex === 0}
            aria-label="Previous byte"
            className="h-10 w-10 rounded-full bg-background/80 backdrop-blur border border-border flex items-center justify-center text-foreground disabled:opacity-30 press shadow-md"
          >
            <ChevronUp className="h-4 w-4" animateOnHover />
          </button>
          <button
            onClick={() => scrollToIndex(activeIndex + 1)}
            disabled={activeIndex === bytes.length - 1}
            aria-label="Next byte"
            className="h-10 w-10 rounded-full bg-background/80 backdrop-blur border border-border flex items-center justify-center text-foreground disabled:opacity-30 press shadow-md"
          >
            <ChevronDown className="h-4 w-4" animateOnHover />
          </button>
        </div>
      )}

      {showHint && bytes.length > 1 && (
        <div className="sm:hidden fixed bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1 text-white/90 pointer-events-none animate-bounce">
          <ChevronUp className="h-5 w-5" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Swipe up</span>
        </div>
      )}
    </div>
  );
};

export default BytesPage;
