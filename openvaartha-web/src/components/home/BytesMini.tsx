import { Link } from 'react-router-dom';
import { ChevronRight } from '@/components/animate-ui/icons/chevron-right';
import { useDispatches } from '@/lib/api-hooks';

export default function BytesMini() {
  const { data: dispatches = [] } = useDispatches(5);

  if (dispatches.length === 0) return null;

  return (
    <div className="border-t border-border">
      <div className="px-4 sm:px-6 lg:px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>
          <h3 className="font-display text-sm font-bold uppercase tracking-wide">Bytes</h3>
        </div>
        <Link to="/bytes" className="text-[10px] font-bold uppercase tracking-wider text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
          See all <ChevronRight className="h-3 w-3" animateOnHover />
        </Link>
      </div>
      <ul className="divide-y divide-border">
        {dispatches.map((u) => {
          const time = (
            <span className="text-[10px] text-muted-foreground font-medium">
              {new Date(u.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          );
          const text = (
            <p className="text-xs font-semibold leading-snug text-foreground group-hover:text-primary transition-colors mt-0.5 line-clamp-2">
              {u.text}
            </p>
          );
          return (
            <li key={u.id} className="px-4 sm:px-6 lg:px-6 py-3">
              {u.articleSlug ? (
                <Link to={`/article/${u.articleSlug}`} className="group">
                  {time}{text}
                </Link>
              ) : (
                <div>{time}{text}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
