import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { ChevronUp } from '@/components/animate-ui/icons/chevron-up';
import { ChevronDown } from '@/components/animate-ui/icons/chevron-down';
import ByteCard from '@/components/ByteCard';
import type { Dispatch } from '@/lib/types';

const TRANSITION_MS = 420;

/**
 * Full-screen immersive view for today's bytes — a vertical Reels-style
 * carousel opened by tapping a card in the feed grid. Each swipe / wheel notch
 * / arrow key advances exactly one card with a decisive transition, input is
 * locked while it runs, and only the on-screen reel plays. Esc closes.
 */
export default function BytesViewer({
  bytes,
  initialIndex,
  onClose,
}: {
  bytes: Dispatch[];
  initialIndex: number;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const viewportRef = useRef<HTMLDivElement>(null);
  const lockedRef = useRef(false);
  const touchStartY = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  const goBy = (delta: number) => {
    if (lockedRef.current) return;
    setActiveIndex((prev) => {
      const next = Math.max(0, Math.min(bytes.length - 1, prev + delta));
      if (next !== prev) {
        lockedRef.current = true;
        window.setTimeout(() => { lockedRef.current = false; }, TRANSITION_MS);
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
      if (Math.abs(delta) < 40) return;
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
  }, [bytes.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') goBy(1);
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') goBy(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [bytes.length]);

  return (
    <div className="fixed inset-0 z-[90] bg-black flex flex-col" role="dialog" aria-modal="true" aria-label="Bytes viewer">
      <div className="shrink-0 z-30 px-4 pt-4 flex items-center gap-3">
        <button
          onClick={onClose}
          aria-label="Close bytes viewer"
          className="h-10 w-10 rounded-full bg-white/10 border border-white/25 flex items-center justify-center text-white press"
        >
          <X className="h-5 w-5" />
        </button>
        <span className="text-xs font-bold uppercase tracking-widest text-white/70">
          {activeIndex + 1} of {bytes.length}
        </span>
      </div>

      {/* Progress segments — tap to jump */}
      <div className="shrink-0 z-30 px-4 pt-3 pb-1 flex gap-1">
        {bytes.map((b, i) => (
          <button
            key={b.id}
            onClick={() => setActiveIndex(i)}
            aria-label={`Go to byte ${i + 1}`}
            className={`h-[3px] flex-1 rounded-full transition-colors ${i === activeIndex ? 'bg-white' : 'bg-white/25 hover:bg-white/50'}`}
          />
        ))}
      </div>

      <main ref={viewportRef} className="flex-1 min-h-0 relative overflow-hidden touch-none bg-black">
        <div
          className="flex flex-col h-full w-full"
          style={{
            transform: `translateY(-${activeIndex * 100}%)`,
            transition: `transform ${TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
          }}
        >
          {bytes.map((byte, index) => (
            <div key={byte.id} className="h-full w-full shrink-0">
              <ByteCard
                byte={byte}
                toneIndex={index}
                isActive={index === activeIndex}
                shareUrl={`${window.location.origin}/bytes/${byte.id}`}
                onReadStory={byte.articleSlug ? () => { onClose(); navigate(`/article/${byte.articleSlug}`); } : undefined}
              />
            </div>
          ))}
        </div>
      </main>

      {/* Reserves room for Navbar's fixed mobile bottom-nav so the action
          rail isn't covered on small screens. */}
      <div className="sm:hidden shrink-0 h-[calc(4rem+env(safe-area-inset-bottom))]" />

      {bytes.length > 1 && (
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
            disabled={activeIndex === bytes.length - 1}
            aria-label="Next byte"
            className="h-10 w-10 rounded-full bg-black/45 backdrop-blur border border-white/20 flex items-center justify-center text-white disabled:opacity-30 press shadow-lg"
          >
            <ChevronDown className="h-4 w-4" animateOnHover />
          </button>
        </div>
      )}
    </div>
  );
}