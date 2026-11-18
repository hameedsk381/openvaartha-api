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
          <div className="relative lg:col-span-8 lg:border-r lg:border-border">
            <MotionLink
              to={`/article/${hero.slug}`}
              className="block group press relative"
              initial="initial"
              whileHover="hover"
            >
              <div className="relative overflow-hidden aspect-[16/9] lg:aspect-[16/10] bg-[hsl(var(--surface-2))] border-b border-border">
                <img
                  src={getArticleImage(hero.thumbnailUrl)}
                  alt=""
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                  loading="eager"
                  onError={handleImageFallback}
                />
                <div className="absolute inset-0 hidden bg-gradient-to-t from-black/90 via-black/35 to-transparent lg:block" />
              </div>

              <div className="border-l-4 border-primary bg-card p-4 sm:p-6 lg:absolute lg:inset-x-0 lg:bottom-0 lg:border-0 lg:bg-transparent lg:p-10">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-4">
                  <span className="chip-primary">{hero.category}</span>
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground lg:text-white/80">
                    <Clock className="h-3 w-3" /> {hero.readTime}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground lg:text-white/70">
                    {relativeTime(hero.publishedAt)}
                  </span>
                  {hero.isTrending && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-primary lg:text-white">
                      <Flame className="h-3 w-3 fill-current" /> Trending
                    </span>
                  )}
                </div>
                <h2 className="poster text-foreground text-3xl sm:text-4xl lg:text-5xl lg:text-white max-w-3xl">
                  {hero.title}
                </h2>
                <p className="text-muted-foreground lg:text-white/85 text-sm sm:text-base mt-3 line-clamp-2 max-w-2xl leading-relaxed">
                  {hero.summary}
                </p>
                <div className="flex flex-wrap items-center justify-between gap-2 mt-4">
                  <span className="text-muted-foreground lg:text-white/75 text-xs font-medium">{hero.author}</span>
                  <span className="text-primary lg:text-white text-xs font-semibold flex items-center gap-1.5 group-hover:underline transition-colors">
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
            <div className="px-4 sm:px-6 py-4 border-b border-border">
              <h3 className="font-display text-sm font-bold tracking-wide text-foreground">
                More top stories
              </h3>
            </div>
            {topRail.map((art, i) => (
              <Link
                key={art.id}
                to={`/article/${art.slug}`}
                className={`group press flex gap-4 px-4 sm:px-6 py-3.5 hover:bg-muted/60 transition-colors ${
                  i !== topRail.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="overline text-primary">{art.category}</span>
                    <span className="h-1 w-1 rounded-full bg-border" />
                    <span className="text-[10px] text-muted-foreground font-medium tracking-wide">
                      {relativeTime(art.publishedAt)}
                    </span>
                  </div>
                  <h4 className="font-display text-[15px] font-bold leading-snug tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-3">
                    {art.title}
                  </h4>
                  <span className="flex items-center gap-1 mt-2 text-[11px] text-muted-foreground font-medium">
                    <Clock className="h-3 w-3" /> {art.readTime}
                  </span>
                </div>
                <div className="aspect-square w-20 sm:w-24 shrink-0 overflow-hidden rounded-md bg-[hsl(var(--surface-2))]">
                  <img
                    src={getArticleImage(art.thumbnailUrl)}
                    alt={art.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
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
