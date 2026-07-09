import React from 'react';
import { motion, type Transition } from 'motion/react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import type { Article } from '@/lib/types';
import { Link } from 'react-router-dom';
import { ChevronRight, ArrowUpRight, Clock, Sparkles, Flame } from 'lucide-react';
import { AnimatedIcon } from '@/components/ui/animated-icon';
import { Meteors } from '@/components/ui/meteors';
import { Button } from './ui/button';
import { cn, handleImageFallback, getArticleImage } from '../lib/utils';

interface HeroCarouselProps {
  articles: Article[];
}

const transition: Transition = {
  type: 'spring',
  stiffness: 240,
  damping: 24,
  mass: 1,
};

const MotionLink = motion.create(Link);

const HeroCarousel = ({ articles }: HeroCarouselProps) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'center' }, [Autoplay({ delay: 5000 })]);
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  React.useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    };
    emblaApi.on('select', onSelect);
    onSelect();
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi]);

  if (!articles || articles.length === 0) return null;

  return (
    <section className="relative w-full overflow-hidden border-b border-border py-4 sm:py-8 bg-black">
      <div className="overflow-hidden [--slide-spacing:1rem] sm:[--slide-spacing:2rem] [--slide-size:85%] sm:[--slide-size:75%] lg:[--slide-size:65%]" ref={emblaRef}>
        <div className="flex touch-pan-y touch-pinch-zoom">
          {articles.map((article, index) => {
            const isActive = selectedIndex === index;
            
            return (
              <motion.div
                key={article?.id ?? index}
                className="mr-[var(--slide-spacing)] basis-[var(--slide-size)] flex-none min-w-0 group"
                initial={false}
                animate={{ scale: isActive ? 1 : 0.9, opacity: isActive ? 1 : 0.5 }}
                transition={transition}
              >
                <MotionLink
                  to={`/article/${article?.slug ?? "#"}`}
                  className="relative block w-full aspect-[4/5] sm:aspect-[21/9] overflow-hidden rounded-xl border border-white/10"
                  initial="initial"
                  whileHover="hover"
                >
                  <div className="absolute inset-0 overflow-hidden bg-[hsl(var(--surface-2))]">
                <img
                  src={getArticleImage(article?.thumbnailUrl)}
                  alt={article?.title || ""}
                  className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-[1.02]"
                  loading={index === 0 ? "eager" : "lazy"}
                  onError={handleImageFallback}
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              
              {/* Meteors Effect Layer */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden mix-blend-screen opacity-70">
                <Meteors number={15} />
              </div>

              <div className="absolute inset-0 flex flex-col justify-end p-6 pb-8 sm:p-10 sm:pb-12 lg:p-14 lg:pb-16">
                <div className="max-w-3xl space-y-3 sm:space-y-4">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <span className="rounded-full bg-secondary px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-secondary-foreground shadow-sm">
                      {article?.category}
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] font-medium text-white/60">
                      <Clock className="h-3 w-3" /> {article?.readTime}
                    </span>
                    {article?.isTrending && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-secondary">
                        <Flame className="h-3 w-3 fill-current" /> Trending
                      </span>
                    )}
                  </div>

                  <h2 className="text-balance text-[1.75rem] font-bold leading-[1.05] tracking-tight text-white sm:text-4xl lg:text-5xl line-clamp-2">
                    {article?.title}
                  </h2>
                  <p className="max-w-2xl line-clamp-2 text-sm leading-relaxed text-white/70">
                    {article?.summary}
                  </p>

                  <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-secondary group-hover:text-white transition-colors">
                    Read article
                    <AnimatedIcon animationType="arrowUpRight" triggerOnHover={false}>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </AnimatedIcon>
                  </div>
                </div>
              </div>
            </MotionLink>
          </motion.div>
        );
      })}
    </div>
  </div>

      <div className="absolute bottom-6 sm:bottom-12 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {articles.slice(0, 5).map((_, i) => (
          <motion.button
            key={i}
            layout
            initial={false}
            className="rounded-full bg-white press"
            animate={{
              width: selectedIndex === i ? 40 : 8,
              height: 8,
              opacity: selectedIndex === i ? 1 : 0.3,
            }}
            transition={transition}
            onClick={(e) => {
              e.preventDefault();
              emblaApi?.scrollTo(i);
            }}
            aria-label={`Go to slide ${i + 1}`}
            aria-current={selectedIndex === i ? "true" : "false"}
          />
        ))}
      </div>
    </section>
  );
};

export default HeroCarousel;
