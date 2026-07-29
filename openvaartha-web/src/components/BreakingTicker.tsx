import { useDispatches } from '@/lib/api-hooks';
import { Clock } from '@/components/animate-ui/icons/clock';
import { Link } from 'react-router-dom';
import { Marquee } from '@/components/ui/marquee';

const BreakingTicker = () => {
  // Editor-authored breaking-news blurbs (see AdminDispatches) — a distinct
  // stream from the article feed, not a repeat of the latest published articles.
  const { data: dispatches = [] } = useDispatches(15);
  if (dispatches.length === 0) return null;

  return (
    <div className="flex items-center h-10 border-b border-border bg-primary overflow-hidden">
      <div className="flex items-center gap-1.5 px-4 h-full bg-red-600 shrink-0 border-r border-border z-20 shadow-[4px_0_12px_rgba(220,38,38,0.2)]">
        <Clock className="h-3.5 w-3.5 text-white" />
        <span className="font-display text-xs font-bold uppercase tracking-[0.18em] text-white relative pl-4">
          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-white animate-pulse" />
          JUST IN
        </span>
      </div>
      <div className="flex-1 relative overflow-hidden flex items-center h-full">
        <Marquee pauseOnHover className="[--duration:120s] [--gap:0px]" style={{ padding: 0 }}>
          {dispatches.map((item) => {
            const content = (
              <>
                {item.text}
                <span className="text-muted-foreground/30 text-xs ml-1">|</span>
              </>
            );
            const className = "font-display text-xs sm:text-[13px] font-semibold tracking-tight flex items-center gap-5 text-[#FFF8E7] hover:text-white transition-colors mx-4 h-full";
            return item.articleSlug ? (
              <Link key={item.id} to={`/article/${item.articleSlug}`} className={className}>
                {content}
              </Link>
            ) : (
              <span key={item.id} className={className}>
                {content}
              </span>
            );
          })}
        </Marquee>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1/12 bg-gradient-to-r from-primary z-10"></div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/12 bg-gradient-to-l from-primary z-10"></div>
      </div>
    </div>
  );
};

export default BreakingTicker;
