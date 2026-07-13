import { useEffect, useMemo, useRef, useState } from 'react';
import Navbar from '../components/Navbar';
import { ArrowUpRight } from 'lucide-react';
import { AnimatedIcon } from '@/components/ui/animated-icon';
import { ChevronUp } from '@/components/animate-ui/icons/chevron-up';
import { ChevronDown } from '@/components/animate-ui/icons/chevron-down';
import { useNavigate } from 'react-router-dom';
import { useDispatches } from '@/lib/api-hooks';
import { BRAND } from '@/lib/brand';
import { BytesPageSkeleton } from '@/components/PageSkeletons';

const relativeTime = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

// Each tone pairs a brand background with the CSS-variable foreground it was
// designed for (see index.css's documented contrast ratios), so text always
// reads clearly regardless of theme — never hardcode white/black against these.
const TONES = [
  {
    bg: 'gradient-maroon',
    text: 'text-primary-foreground',
    tagBg: 'bg-black/15',
    logo: 'white' as const,
  },
  {
    bg: 'gradient-beige',
    text: 'text-secondary-foreground',
    tagBg: 'bg-black/10',
    logo: 'maroon' as const,
  },
];

/**
 * Bytes: a full-screen, swipe-through stack of TODAY's dispatches — Inshorts
 * style. One headline per screen; swipe (or scroll/arrow-key) to the next.
 * Scoped to the current day server-side (see useDispatches(todayOnly)) —
 * yesterday's bytes don't carry over, so it always feels freshly filed.
 */
const BytesPage = () => {
  const { data: bytes = [], isLoading } = useDispatches(100, { todayOnly: true });
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState('All');
  const [showHint, setShowHint] = useState(true);

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
    const container = containerRef.current;
    if (!container || filteredBytes.length === 0) return;

    setActiveIndex(0);
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
  }, [filteredBytes]);

  const scrollToIndex = (index: number) => {
    const clamped = Math.max(0, Math.min(filteredBytes.length - 1, index));
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
  }, [activeIndex, filteredBytes.length]);

  if (isLoading && bytes.length === 0) {
    return <BytesPageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <header className="h-14 px-4 border-b border-border bg-background flex items-center justify-between gap-3">
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
        <main className="h-[calc(100vh-7rem)] flex items-center justify-center text-center px-4">
          <p className="font-serif italic text-muted-foreground">
            {bytes.length === 0
              ? "No bytes filed today yet. Check back soon — a fresh set starts every morning."
              : 'No bytes in this section today.'}
          </p>
        </main>
      ) : (
        <main
          ref={containerRef}
          className="h-[calc(100vh-7rem)] overflow-y-auto snap-y snap-mandatory scroll-smooth no-scrollbar"
          onScroll={() => setShowHint(false)}
        >
          {filteredBytes.map((byte, index) => {
            const tone = TONES[index % TONES.length];
            const card = (
              <div
                ref={(el) => (cardRefs.current[index] = el)}
                key={byte.id}
                className={`relative h-[calc(100vh-7rem)] snap-start snap-always flex flex-col justify-center px-6 sm:px-16 ${tone.bg}`}
              >
                <div className="max-w-2xl mx-auto w-full">
                  <div className={`flex items-center gap-2 mb-8 ${tone.text}`}>
                    <img
                      src={tone.logo === 'white' ? BRAND.iconWhitePath : BRAND.iconMaroonPath}
                      alt=""
                      className="h-6 w-6 object-contain opacity-90"
                    />
                    <span className="text-xs font-black uppercase tracking-[0.2em] opacity-90">
                      {BRAND.shortName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-6">
                    <span className={`relative inline-flex h-2 w-2 ${tone.text}`}>
                      <span className="absolute inline-flex h-full w-full rounded-full bg-current opacity-60 animate-ping" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
                    </span>
                    <span className={`text-[11px] font-bold uppercase tracking-[0.2em] opacity-80 ${tone.text}`}>
                      {relativeTime(byte.createdAt)}
                    </span>
                    {byte.category && (
                      <span className={`text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1 ${tone.tagBg} ${tone.text}`}>
                        {byte.category}
                      </span>
                    )}
                  </div>

                  <p className={`font-serif text-2xl sm:text-4xl font-bold leading-[1.2] tracking-tight ${tone.text}`}>
                    {byte.text}
                  </p>

                  {byte.articleSlug && (
                    <span className={`mt-8 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] ${tone.text}`}>
                      Read full story
                      <AnimatedIcon animationType="arrowUpRight">
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </AnimatedIcon>
                    </span>
                  )}
                </div>

                <span className={`absolute bottom-6 left-1/2 -translate-x-1/2 text-[11px] font-semibold tabular-nums opacity-70 ${tone.text}`}>
                  {index + 1} / {filteredBytes.length}
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

      {filteredBytes.length > 1 && (
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
            disabled={activeIndex === filteredBytes.length - 1}
            aria-label="Next byte"
            className="h-10 w-10 rounded-full bg-background/80 backdrop-blur border border-border flex items-center justify-center text-foreground disabled:opacity-30 press shadow-md"
          >
            <ChevronDown className="h-4 w-4" animateOnHover />
          </button>
        </div>
      )}

      {showHint && filteredBytes.length > 1 && (
        <div className={`sm:hidden fixed bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1 pointer-events-none animate-bounce ${TONES[0].text}`}>
          <ChevronUp className="h-5 w-5" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Swipe up</span>
        </div>
      )}
    </div>
  );
};

export default BytesPage;
