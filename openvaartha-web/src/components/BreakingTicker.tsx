import { articles } from '../data/mockArticles';
import { Zap } from 'lucide-react';

const BreakingTicker = () => {
  const breaking = articles.filter(a => (a as any).isBreaking);
  if (breaking.length === 0) return null;
  const dur = `${Math.max(25, breaking.length * 9)}s`;

  return (
    <div className="flex items-center bg-primary text-primary-foreground h-7 overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 h-full bg-[hsl(var(--primary-hover,0_100%_13%))] shrink-0 border-r border-white/10 z-10">
        <Zap className="h-2.5 w-2.5 fill-current text-secondary" />
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-secondary">Live</span>
      </div>
      <div className="flex-1 overflow-hidden">
        <div
          className="ticker-track flex items-center gap-8 whitespace-nowrap"
          style={{ '--ticker-duration': dur } as React.CSSProperties}
        >
          {[...breaking, ...breaking].map((item, i) => (
            <span key={`${item.id}-${i}`} className="text-[10px] font-semibold tracking-tight flex items-center gap-4 text-primary-foreground/90">
              {item.title}
              <span className="text-secondary/40">·</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BreakingTicker;
