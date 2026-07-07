import { useArticles } from '@/lib/api-hooks';
import { Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

const BreakingTicker = () => {
  // Fetch latest 10 articles for the "JUST IN" marquee
  const { data: latest = [] } = useArticles({ limit: 10 });
  if (latest.length === 0) return null;
  
  const dur = `${Math.max(25, latest.length * 9)}s`;

  return (
    <div className="marquee-strip flex items-center h-10 border-b border-border bg-primary">
      <div className="flex items-center gap-1.5 px-4 h-full bg-red-600 shrink-0 border-r border-border z-20 shadow-[4px_0_12px_rgba(220,38,38,0.2)]">
        <Clock className="h-3.5 w-3.5 text-white" />
        <span className="font-display text-xs font-bold uppercase tracking-[0.18em] text-white relative pl-4">
          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-white animate-pulse" />
          JUST IN
        </span>
      </div>
      <div className="flex-1 overflow-hidden relative before:absolute before:left-0 before:top-0 before:bottom-0 before:w-8 before:bg-gradient-to-r before:from-primary before:to-transparent before:pointer-events-none before:z-10 after:absolute after:right-0 after:top-0 after:bottom-0 after:w-8 after:bg-gradient-to-l after:from-primary after:to-transparent after:pointer-events-none after:z-10">
        <div
          className="ticker-track flex items-center gap-8 whitespace-nowrap h-full"
          style={{ '--ticker-duration': dur } as React.CSSProperties}
        >
          {[...latest, ...latest].map((item, i) => (
            <Link 
              key={`${item.id}-${i}`} 
              to={`/article/${item.slug}`}
              className="font-display text-xs sm:text-[13px] font-semibold tracking-tight flex items-center gap-5 text-[#FFF8E7] hover:text-white transition-colors press"
            >
              {item.title}
              <span className="text-muted-foreground/30 text-xs">|</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BreakingTicker;
