import { Link } from 'react-router-dom';
import { Flame, Sparkles, Bookmark, BookmarkCheck } from 'lucide-react';
import { AnimatedIcon } from '@/components/ui/animated-icon';
import { Clock } from '@/components/animate-ui/icons/clock';
import { LoaderCircle } from '@/components/animate-ui/icons/loader-circle';
import { getArticleImage, handleImageFallback, relativeTime, cn } from '@/lib/utils';
import { useReadingList } from '@/hooks/use-reading-list';
import FeedSkeleton from '@/components/FeedSkeleton';
import type { Article } from '@/lib/types';

interface MainFeedProps {
  feed: Article[];
  switching: boolean;
  isFiltered: boolean;
  displayCategoryName: string;
  feedTab: 'latest' | 'forYou';
  setFeedTab: (tab: 'latest' | 'forYou') => void;
  articlesDataLength: number;
  limit: number;
  setLimit: React.Dispatch<React.SetStateAction<number>>;
  isFetching: boolean;
}

export default function MainFeed({
  feed,
  switching,
  isFiltered,
  displayCategoryName,
  feedTab,
  setFeedTab,
  articlesDataLength,
  limit,
  setLimit,
  isFetching
}: MainFeedProps) {
  const { toggleSave, isSaved } = useReadingList();

  return (
    <>
        <div className="px-4 sm:px-6 lg:px-10 py-5 border-b border-border flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight">
              {isFiltered ? `${displayCategoryName} stories` : 'The latest'}
            </h2>

          <div className="flex items-center gap-2">
            {!isFiltered && (
              <div role="group" aria-label="Feed view" className="flex items-center gap-1 bg-secondary/50 p-1 rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => setFeedTab('latest')}
                  aria-pressed={feedTab === 'latest'}
                  className={cn(
                    "h-11 px-3 rounded-md text-sm font-semibold transition-colors press",
                    feedTab === 'latest' ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Latest
                </button>
                <button
                  type="button"
                  onClick={() => setFeedTab('forYou')}
                  aria-pressed={feedTab === 'forYou'}
                  className={cn(
                    "h-11 px-3 rounded-md text-sm font-semibold transition-colors press flex items-center gap-1",
                    feedTab === 'forYou' ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Sparkles className="h-3 w-3" /> For You
                </button>
              </div>
            )}
          </div>
        </div>

      {switching ? (
        <div className="px-4 sm:px-6 lg:px-10 py-6"><FeedSkeleton /></div>
      ) : (
        <>
          {feed.length === 0 && (
            <p className="px-4 sm:px-6 lg:px-10 py-6 text-sm text-muted-foreground" role="status">
              {isFiltered ? "No more stories in this section." : feedTab === 'forYou' ? "No recommendations yet." : "No more recent stories."}
            </p>
          )}
          {feed.map((art, index) => (
            <article
              key={art.id}
              className="group flex gap-4 sm:gap-6 px-4 sm:px-6 lg:px-10 py-5 sm:py-6 border-b border-border last:border-0 hover:bg-[hsl(var(--surface))] transition-colors"
            >
              <Link to={`/article/${art.slug}`}
                className="flex min-w-0 flex-1 items-start gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:gap-5">
                <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="overline text-primary">{art.category}</span>
                  <span className="h-1 w-1 rounded-full bg-border" />
                  <span className="text-[10px] text-muted-foreground font-medium tracking-wide">
                    {relativeTime(art.publishedAt)}
                  </span>
                  {art.isTrending && (
                    <>
                      <span className="h-1 w-1 rounded-full bg-border" />
                      <span className="inline-flex items-center gap-1 text-[10px] text-primary font-semibold uppercase tracking-wide">
                        <Flame className="h-3 w-3 fill-current" /> Trending
                      </span>
                    </>
                  )}
                </div>
                {/* The first story in the feed carries slightly more weight:
                    the top of a list is where readers actually land. */}
                <h3
                  className={cn(
                    "font-display font-bold leading-snug tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-2",
                    index === 0 ? "text-lg sm:text-2xl" : "text-base sm:text-lg"
                  )}
                >
                  {art.title}
                </h3>
                <p
                  className={cn(
                    "text-sm text-muted-foreground mt-1.5 leading-relaxed",
                    index === 0 ? "line-clamp-3" : "line-clamp-2"
                  )}
                >
                  {art.summary}
                </p>
                <div className="flex items-center gap-3 mt-3 text-[11px] text-muted-foreground font-medium">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {art.readTime}</span>
                  <span>·</span>
                  <span className="truncate">{art.author}</span>
                </div>
                </div>
                    <div className="w-16 h-16 shrink-0 sm:w-32 sm:h-24 rounded-md overflow-hidden bg-[hsl(var(--surface-2))]">
                      <img
                        src={getArticleImage(art.thumbnailUrl)}
                        alt=""
                        className="w-full h-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.02]"
                        loading="lazy"
                        sizes="(max-width: 640px) 64px, 128px"
                        onError={handleImageFallback}
                      />
                    </div>
              </Link>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => toggleSave(art)}
                  className={`h-11 w-11 rounded-md flex items-center justify-center transition-colors press focus-visible:ring-2 focus-visible:ring-primary
                    ${isSaved(art.id) ? 'text-primary bg-[hsl(var(--primary-subtle))]' : 'text-muted-foreground hover:text-primary hover:bg-[hsl(var(--primary-subtle))]'}`}
                  aria-label={isSaved(art.id) ? "Remove from reading list" : "Save article"}
                  aria-pressed={isSaved(art.id)}
                >
                  <AnimatedIcon animationType="scale">
                    {isSaved(art.id) ? <BookmarkCheck className="h-4 w-4 fill-current" /> : <Bookmark className="h-4 w-4" />}
                  </AnimatedIcon>
                </button>
              </div>
            </article>
          ))}

          {/* Load More */}
          {(isFiltered || feedTab === 'latest') && articlesDataLength >= limit && (
            <div className="flex justify-center p-6 border-b border-border">
              <button
                onClick={() => setLimit(prev => prev + 10)}
                disabled={isFetching}
                className="w-full max-w-xs h-11 rounded-md border border-border bg-background text-foreground text-sm font-bold inline-flex items-center justify-center gap-2 hover:bg-[hsl(var(--surface))] transition-colors press disabled:opacity-50"
              >
                {isFetching ? (
                  <LoaderCircle className="h-4 w-4 text-muted-foreground" animate />
                ) : (
                  "Load more stories"
                )}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
