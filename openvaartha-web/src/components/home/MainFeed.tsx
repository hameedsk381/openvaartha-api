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
      {(switching || feed.length > 0) && (
        <div className="px-4 sm:px-6 lg:px-10 py-5 border-b border-border flex items-baseline justify-between">
          <div>
            <span className="overline text-primary">{isFiltered ? displayCategoryName : 'Latest'}</span>
            <h3 className="font-display text-xl sm:text-2xl font-bold tracking-tight mt-0.5">
              {isFiltered ? `${displayCategoryName} stories` : 'The latest'}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {!isFiltered && (
              <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => setFeedTab('latest')}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-semibold transition-colors",
                    feedTab === 'latest' ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Latest
                </button>
                <button
                  type="button"
                  onClick={() => setFeedTab('forYou')}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1",
                    feedTab === 'forYou' ? "bg-primary text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Sparkles className="h-3 w-3" /> For You
                </button>
              </div>
            )}
            <span className="text-xs text-muted-foreground font-medium hidden sm:inline">{feed.length} stories</span>
          </div>
        </div>
      )}

      {switching ? (
        <div className="px-4 sm:px-6 lg:px-10 py-6"><FeedSkeleton /></div>
      ) : (
        <>
          {feed.map((art) => (
            <article
              key={art.id}
              className="group flex gap-4 sm:gap-6 px-4 sm:px-6 lg:px-10 py-5 sm:py-6 border-b border-border last:border-0 hover:bg-[hsl(var(--surface))] transition-colors"
            >
              <Link to={`/article/${art.slug}`} className="flex-1 min-w-0 press">
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
                <h3 className="font-display text-base sm:text-lg font-bold leading-snug tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-2">
                  {art.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                  {art.summary}
                </p>
                <div className="flex items-center gap-3 mt-3 text-[11px] text-muted-foreground font-medium">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {art.readTime}</span>
                  <span>·</span>
                  <span className="truncate">{art.author}</span>
                </div>
              </Link>

              <div className="flex flex-col items-end gap-2 shrink-0">
                <Link to={`/article/${art.slug}`} className="press block">
                    <div className="w-24 h-20 sm:w-32 sm:h-24 rounded-md overflow-hidden bg-[hsl(var(--surface-2))]">
                      <img
                        src={getArticleImage(art.thumbnailUrl)}
                        alt={art.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                        sizes="(max-width: 640px) 96px, 128px"
                        onError={handleImageFallback}
                      />
                    </div>
                </Link>
                <button
                  onClick={() => toggleSave(art)}
                  className={`h-9 w-9 rounded-md flex items-center justify-center transition-colors press
                    ${isSaved(art.id) ? 'text-primary bg-[hsl(var(--primary-subtle))]' : 'text-muted-foreground hover:text-primary hover:bg-[hsl(var(--primary-subtle))]'}`}
                  aria-label="Save"
                >
                  <AnimatedIcon animationType="scale">
                    {isSaved(art.id) ? <BookmarkCheck className="h-4 w-4 fill-current" /> : <Bookmark className="h-4 w-4" />}
                  </AnimatedIcon>
                </button>
              </div>
            </article>
          ))}

          {/* Load More */}
          {articlesDataLength >= limit && (
            <div className="flex justify-center p-6 border-b border-border">
              <button
                onClick={() => setLimit(prev => prev + 20)}
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
