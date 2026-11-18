import { Link } from 'react-router-dom';
import { useDispatches } from '@/lib/api-hooks';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import SectionLink from './SectionLink';

export default function FeedMini() {
  const { data: dispatches = [] } = useDispatches(5);

  if (dispatches.length === 0) return null;

  return (
    <div className="border-t border-border">
      <div className="px-4 sm:px-6 lg:px-6 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>
          <h3 className="font-display text-sm font-bold uppercase tracking-wide">Feed</h3>
        </div>
        <SectionLink to="/feed">See all</SectionLink>
      </div>
      <ul className="divide-y divide-border">
        {dispatches.map((u) => {
          const rawDate = u.createdAt || (u as any).created_at;
          const dateObj = rawDate ? new Date(rawDate) : new Date();
          const time = (
            <span className="text-[10px] text-muted-foreground font-medium">
              {isNaN(dateObj.getTime()) ? '' : dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          );

          const text = (
            <p className="text-xs font-semibold leading-snug text-foreground group-hover:text-primary transition-colors mt-0.5 line-clamp-2">
              {u.text}
            </p>
          );
          const likes = (
            <div className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground">
              <Heart size={10} className={cn(u.hasLiked && "fill-red-500 text-red-500")} />
              <span>{u.likeCount || 0}</span>
            </div>
          );

          return (
            <li key={u.id} className="px-4 sm:px-6 lg:px-6 py-3">
              {u.articleSlug ? (
                <Link to={`/article/${u.articleSlug}`} className="group">
                  {time}{text}{likes}
                </Link>
              ) : (
                <Link to={`/feed/${u.id}`} className="group block">
                  {time}{text}{likes}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
