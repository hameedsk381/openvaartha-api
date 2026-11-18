import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Bookmark, BookmarkCheck, Flame, ArrowUpRight } from 'lucide-react';
import { AnimatedIcon } from '@/components/ui/animated-icon';
import { Clock } from '@/components/animate-ui/icons/clock';
import { getArticleImage, handleImageFallback, relativeTime } from '@/lib/utils';
import { useReadingList } from '@/hooks/use-reading-list';
import type { Article } from '@/lib/types';

const MotionLink = motion.create(Link);

export default function HeroClassic({ articles }: { articles: Article[] }) {
  const { toggleSave, isSaved } = useReadingList();

  if (!articles || articles.length === 0) return null;

  const hero = articles[0];
  const topRail = articles.slice(1, 5);

  return (
      <section aria-label="Top stories" className="border-b border-border">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          <div className="relative bg-card lg:col-span-8 lg:flex lg:border-r lg:border-border">
            <MotionLink
              to={`/article/${hero.slug}`}
              className="group relative block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary lg:grid lg:w-full lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]"
              initial="initial"
              whileHover="hover"
            >
              <div className="relative aspect-[16/9] overflow-hidden border-b border-border bg-muted lg:order-last lg:aspect-auto lg:min-h-[340px] lg:border-b-0">
                <img
                  src={getArticleImage(hero.thumbnailUrl)}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.02]"
                  loading="eager"
                  onError={handleImageFallback}
                />
              </div>

              <div className="min-w-0 border-l-4 border-primary p-4 sm:p-6 lg:flex lg:flex-col lg:justify-center lg:border-0 lg:px-8 lg:py-7 xl:px-10">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-4">
                  <span className="chip-primary">{hero.category}</span>
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <Clock className="h-3 w-3" /> {hero.readTime}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {relativeTime(hero.publishedAt)}
                  </span>
                  {hero.isTrending && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-primary">
                      <Flame className="h-3 w-3 fill-current" /> Trending
                    </span>
                  )}
                </div>
                <h2 className="poster break-words text-3xl leading-[1.07] text-foreground sm:text-4xl lg:text-[clamp(1.75rem,2.9vw,2.75rem)]">
                  {hero.title}
                </h2>
                <p className="mt-3 line-clamp-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {hero.summary}
                </p>
                <div className="flex flex-wrap items-center justify-between gap-2 mt-4">
                  <span className="text-xs font-medium text-muted-foreground">{hero.author}</span>
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground group-hover:text-primary group-hover:underline">
                    Read article
                    <AnimatedIcon animationType="arrowUpRight">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </AnimatedIcon>
                  </span>
                </div>
              </div>
            </MotionLink>
            <button type="button"
              onClick={() => toggleSave(hero)}
              className="absolute top-3 right-3 flex h-12 w-12 items-center justify-center rounded-full bg-black/65 text-white hover:bg-primary focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={isSaved(hero.id) ? "Remove from reading list" : "Save article"}
              aria-pressed={isSaved(hero.id)}
            >
              {isSaved(hero.id)
                ? <BookmarkCheck className="h-5 w-5 fill-current" />
                : <Bookmark className="h-5 w-5" />}
            </button>
          </div>

          {topRail.length > 0 && <aside className="lg:col-span-4 flex flex-col bg-muted/20 border-t lg:border-t-0 border-border">
            <div className="border-b border-border px-4 py-3 sm:px-6">
              <h3 className="font-display text-sm font-bold tracking-wide text-foreground">
                More top stories
              </h3>
            </div>
            {topRail.map((art, i) => (
              <Link
                key={art.id}
                to={`/article/${art.slug}`}
                className={`group press flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60 sm:px-6 lg:flex-1 lg:py-2.5 ${
                  i !== topRail.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="overline text-primary">{art.category}</span>
                    <span className="h-1 w-1 rounded-full bg-border" />
                    <span className="text-[10px] text-muted-foreground font-medium tracking-wide">
                      {relativeTime(art.publishedAt)}
                    </span>
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {art.readTime}
                    </span>
                  </div>
                  <h4 className="line-clamp-3 font-display text-[15px] font-bold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary lg:line-clamp-2">
                    {art.title}
                  </h4>
                </div>
                <div className="size-16 shrink-0 overflow-hidden rounded-md bg-muted">
                  <img
                    src={getArticleImage(art.thumbnailUrl)}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.02]"
                    loading="lazy"
                    onError={handleImageFallback}
                  />
                </div>
              </Link>
            ))}
          </aside>}
        </div>
      </section>
  );
}
