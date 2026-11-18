import { Link } from 'react-router-dom';
import { Clock } from '@/components/animate-ui/icons/clock';
import { getArticleImage, handleImageFallback, relativeTime } from '@/lib/utils';
import type { Article } from '@/lib/types';
import SectionLink from './SectionLink';

export default function EditorPicks({ picks }: { picks: Article[] }) {
  // Always render the section to reserve vertical space and prevent CLS.
  const skeletonCount = 3;

  return (
    <section className="border-b border-border bg-[hsl(var(--surface))] px-4 sm:px-6 lg:px-10 py-8 sm:py-12">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <span className="overline text-primary">Editor's picks</span>
          <h3 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mt-1">
            Worth your time
          </h3>
        </div>
        <SectionLink to="/trending">
          View all
        </SectionLink>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {(picks.length > 0 ? picks : Array.from({ length: skeletonCount })).map((art: any, idx: number) => (
          art ? (
            <Link
              key={art.id}
              to={`/article/${art.slug}`}
              className="group press block"
            >
              <div className="hidden sm:block aspect-[4/3] w-full shrink-0 overflow-hidden rounded-lg bg-[hsl(var(--surface-2))]">
              <img
                src={getArticleImage(art.thumbnailUrl)}
                alt={art.title}
                width={800}
                height={600}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                onError={handleImageFallback}
              />
            </div>
            <div className="flex items-center gap-2 mb-2 mt-4">
              <span className="overline text-primary">{art.category}</span>
              <span className="h-1 w-1 rounded-full bg-border" />
              <span className="text-[10px] text-muted-foreground font-medium tracking-wide">
                {relativeTime(art.publishedAt)}
              </span>
            </div>
            <h4 className="font-display text-lg sm:text-xl font-bold leading-snug tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-3">
              {art.title}
            </h4>
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
              {art.summary}
            </p>
            <div className="flex items-center gap-3 mt-3 text-[11px] text-muted-foreground font-medium">
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {art.readTime}</span>
              <span>·</span>
              <span className="truncate">{art.author}</span>
            </div>
          </Link>
          ) : (
            <div key={`skeleton-${idx}`} className="animate-pulse">
              <div className="hidden sm:block aspect-[4/3] w-full rounded-lg bg-muted" />
              <div className="h-2 w-16 bg-muted rounded mt-4 mb-2" />
              <div className="h-5 w-full bg-muted rounded mb-1" />
              <div className="h-5 w-2/3 bg-muted rounded mb-2" />
              <div className="h-3 w-full bg-muted rounded mb-1" />
              <div className="h-3 w-3/4 bg-muted rounded" />
            </div>
          )
        ))}
      </div>
    </section>
  );
}
