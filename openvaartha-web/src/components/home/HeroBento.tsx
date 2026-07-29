import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Bookmark, BookmarkCheck, Zap, Flame } from 'lucide-react';
import { AnimatedIcon } from '@/components/ui/animated-icon';
import { getArticleImage, handleImageFallback, relativeTime, cn } from '@/lib/utils';
import { useReadingList } from '@/hooks/use-reading-list';
import type { Article } from '@/lib/types';
import HeroCarousel from '@/components/HeroCarousel';

const MotionLink = motion.create(Link);



const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  }
};

const item = {
  hidden: { opacity: 0, scale: 0.95, y: 15 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 200, damping: 20 } }
};

export default function HeroBento({ articles }: { articles: Article[] }) {
  const { toggleSave, isSaved } = useReadingList();

  if (!articles || articles.length === 0) return null;

  const hero = articles[0];

  return (
    <>
      <div className="lg:hidden">
        <HeroCarousel articles={articles.slice(0, 5)} />
      </div>

      <motion.section 
        className="hidden lg:block border-b border-border p-4 sm:p-6 lg:p-10 bg-[hsl(var(--surface))]"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <div className="grid grid-cols-12 gap-4 lg:gap-6 auto-rows-[250px]">
          {/* Main Hero - Spans 8 cols and 2 rows */}
          {hero && (
            <motion.div variants={item} className="col-span-12 lg:col-span-8 row-span-2">
              <MotionLink
                to={`/article/${hero.slug}`}
                className="block group press relative h-full w-full rounded-2xl overflow-hidden border border-border bg-neutral-950"
                initial="initial"
                whileHover="hover"
              >
                <div className="absolute inset-0 bg-neutral-900">
                  <img
                    src={getArticleImage(hero.thumbnailUrl)}
                    alt={hero.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                    loading="eager"
                    sizes="(max-width: 1024px) 100vw, 66vw"
                    onError={handleImageFallback}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
                </div>

                <button
                  onClick={(e) => { e.preventDefault(); toggleSave(hero); }}
                  className="absolute top-4 right-4 h-10 w-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-primary transition-colors z-10"
                  aria-label="Save article"
                >
                  <AnimatedIcon animationType="scale">
                    {isSaved(hero.id) ? <BookmarkCheck className="h-4 w-4 fill-current" /> : <Bookmark className="h-4 w-4" />}
                  </AnimatedIcon>
                </button>

                <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-10">
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="chip">{hero.category}</span>
                    <span className="chip-primary">
                      <Zap className="h-3 w-3 fill-current" /> {hero.readTime}
                    </span>
                    <span className="font-display text-xs font-bold uppercase tracking-wide text-white/80">{relativeTime(hero.publishedAt)}</span>
                    {hero.isTrending && (
                      <span className="chip-primary">
                        <Flame className="h-3 w-3 fill-current" /> Trending
                      </span>
                    )}
                  </div>
                  <h2 className="font-display text-white text-4xl lg:text-5xl font-bold tracking-tight line-clamp-3 mb-3">
                    {hero.title}
                  </h2>
                  <p className="text-white/80 text-base max-w-2xl line-clamp-2 leading-relaxed">
                    {hero.summary}
                  </p>
                </div>
              </MotionLink>
            </motion.div>
          )}

          {/* Secondary Articles */}
          {articles.slice(1, 5).map((art) => (
            <motion.div key={art.id} variants={item} className="col-span-12 lg:col-span-4 row-span-1">
              <MotionLink
                to={`/article/${art.slug}`}
                className="block group press relative h-full w-full rounded-2xl overflow-hidden border border-border bg-neutral-950"
                initial="initial"
                whileHover="hover"
              >
                <div className="absolute inset-0 bg-neutral-900">
                  <img
                    src={getArticleImage(art.thumbnailUrl)}
                    alt={art.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                    loading="lazy"
                    sizes="(max-width: 1024px) 100vw, 33vw"
                    onError={handleImageFallback}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-black/10" />
                </div>
                
                <button
                  onClick={(e) => { e.preventDefault(); toggleSave(art); }}
                  className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-primary transition-colors z-10"
                >
                  <AnimatedIcon animationType="scale">
                    {isSaved(art.id) ? <BookmarkCheck className="h-3.5 w-3.5 fill-current" /> : <Bookmark className="h-3.5 w-3.5" />}
                  </AnimatedIcon>
                </button>

                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/20 px-2 py-0.5 rounded-full backdrop-blur-md">{art.category}</span>
                    <span className="text-[10px] font-medium text-white/80">{relativeTime(art.publishedAt)}</span>
                  </div>
                  <h3 className="font-display text-white text-lg font-bold leading-snug line-clamp-3">
                    {art.title}
                  </h3>
                </div>
              </MotionLink>
            </motion.div>
          ))}
        </div>
      </motion.section>
    </>
  );
}
