import { useBreakingArticles } from '@/lib/api-hooks';
import { Zap } from 'lucide-react';

const BreakingTicker = () => {
  const { data: breaking = [] } = useBreakingArticles(10);
  if (breaking.length === 0) return null;
  const dur = `${Math.max(25, breaking.length * 9)}s`;

  return (
    <div className="marquee-strip flex items-center h-10">
      <div className="flex items-center gap-1.5 px-4 h-full bg-[hsl(var(--primary-hover,0_100%_13%))] shrink-0 border-r-2 border-foreground z-20">
        <Zap className="h-3.5 w-3.5 fill-current text-secondary" />
        <span className="font-display text-xs font-bold uppercase tracking-[0.18em] text-secondary relative pl-4">
          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-secondary animate-pulse" />
          Live
        </span>
      </div>
      <div className="flex-1 overflow-hidden relative before:absolute before:left-0 before:top-0 before:bottom-0 before:w-6 before:bg-gradient-to-r before:from-primary before:to-transparent before:pointer-events-none before:z-10 after:absolute after:right-0 after:top-0 after:bottom-0 after:w-6 after:bg-gradient-to-l after:from-primary after:to-transparent after:pointer-events-none after:z-10">
        <div
          className="ticker-track flex items-center gap-10 whitespace-nowrap h-full cursor-pointer"
          style={{ '--ticker-duration': dur } as React.CSSProperties}
        >
          {[...breaking, ...breaking].map((item, i) => (
            <span key={`${item.id}-${i}`} className="font-display text-xs sm:text-sm font-semibold tracking-tight flex items-center gap-5 text-primary-foreground">
              {item.title}
              <span className="text-secondary">⚡</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BreakingTicker;
