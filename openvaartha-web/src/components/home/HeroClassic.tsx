import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Bookmark, BookmarkCheck, Zap, Flame, ArrowUpRight } from 'lucide-react';
import { AnimatedIcon } from '@/components/ui/animated-icon';
import { Clock } from '@/components/animate-ui/icons/clock';
import { getArticleImage, handleImageFallback, relativeTime } from '@/lib/utils';
import { useReadingList } from '@/hooks/use-reading-list';
import type { Article } from '@/lib/types';
import HeroCarousel from '@/components/HeroCarousel';

const MotionLink = motion.create(Link);

export default function HeroClassic({ articles }: { articles: Article[] }) {
  const { toggleSave, isSaved } = useReadingList();

  if (!articles || articles.length === 0) return null;

  const hero = articles[0];
  const topRail = articles.slice(1, 5);

  return (
    <>
      {/* Mobile: Swipeable carousel */}
      <div className="lg:hidden">
        <HeroCarousel articles={articles.slice(0, 5)} />
      </div>

      {/* Desktop: Hero + Top Stories sidebar */}
      <section className="hidden lg:block border-b border-border">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          <div className="lg:col-span-8 lg:border-r lg:border-border">
            <MotionLink
              to={`/article/${hero.slug}`}
              className="block group press relative"
              initial="initial"
              whileHover="hover"
            >
              <div className="relative overflow-hidden aspect-[16/10] bg-[hsl(var(--surface-2))] bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 border-b border-border">
                <img
                  src={getArticleImage(hero.thumbnailUrl)}
                  alt={hero.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                  loading="eager"
                  onError={handleImageFallback}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
              </div>

              <button
                onClick={(e) => { e.preventDefault(); toggleSave(hero); }}
                className="absolute top-4 right-4 h-10 w-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-primary transition-colors press"
                aria-label="Save article"
              >
                <AnimatedIcon animationType="scale">
                  {isSaved(hero.id)
                    ? <BookmarkCheck className="h-4 w-4 fill-current" />
                    : <Bookmark className="h-4 w-4" />}
                </AnimatedIcon>
              </button>

              <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8 lg:p-10">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="chip">{hero.category}</span>
                  <span className="chip-primary">
                    <Zap className="h-3 w-3 fill-current" /> {hero.readTime}
                  </span>
                  <span className="font-display text-[11px] font-bold uppercase tracking-wide text-white/80">{relativeTime(hero.publishedAt)}</span>
                  {hero.isTrending && (
                    <span className="chip-primary">
                      <Flame className="h-3 w-3 fill-current" /> Trending
                    </span>
                  )}
                </div>
                <h2 className="poster text-white text-3xl sm:text-5xl lg:text-6xl max-w-3xl line-clamp-3">
                  {hero.title}
                </h2>
                <p className="text-white/80 text-sm sm:text-base mt-3 line-clamp-2 max-w-2xl leading-relaxed">
                  {hero.summary}
                </p>
                <div className="flex items-center gap-4 mt-5">
                  <span className="flex items-center gap-1.5 text-white/70 text-xs font-medium">
                    <Clock className="h-3 w-3" /> {hero.readTime} read
                  </span>
                  <span className="text-white text-xs font-semibold uppercase tracking-[0.18em] flex items-center gap-1.5 group-hover:text-secondary transition-colors">
                    Continue reading
                    <AnimatedIcon animationType="arrowUpRight">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </AnimatedIcon>
                  </span>
                </div>
              </div>
            </MotionLink>
          </div>

          <aside className="lg:col-span-4 flex flex-col">
            <div className="px-6 py-4 lg:py-5 border-b border-border flex items-baseline justify-between">
              <h3 className="font-display text-sm font-bold uppercase tracking-wide text-foreground">
                Top stories
              </h3>
              <span className="overline">Now</span>
            </div>
            {topRail.map((art, i) => (
              <Link
                key={art.id}
                to={`/article/${art.slug}`}
                className={`group press flex gap-4 px-6 py-4 hover:bg-[hsl(var(--surface))] transition-colors ${
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
          </aside>
        </div>
      </section>
    </>
  );
}
