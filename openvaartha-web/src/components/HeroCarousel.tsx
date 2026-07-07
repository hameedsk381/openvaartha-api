import React from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import type { Article } from '@/lib/types';
import { Link } from 'react-router-dom';
import { ChevronRight, ArrowUpRight, Clock, Sparkles, Flame } from 'lucide-react';
import { Button } from './ui/button';
import { cn, handleImageFallback, getArticleImage } from '../lib/utils';

interface HeroCarouselProps {
  articles: Article[];
}

const HeroCarousel = ({ articles }: HeroCarouselProps) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [Autoplay({ delay: 5000 })]);
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
    <section className="relative w-full overflow-hidden border-b border-border">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {articles.map((article, index) => (
            <Link
              key={article?.id ?? index}
              to={`/article/${article?.slug ?? "#"}`}
              className="relative min-h-[440px] flex-[0_0_100%] min-w-0 sm:min-h-0 sm:aspect-[21/9] group"
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
                    Read article <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-6 flex gap-1.5 z-10">
        {articles.slice(0, 5).map((_, i) => (
          <button
            key={i}
            className={cn(
              "h-1.5 w-6 rounded-full transition-all press",
              selectedIndex === i ? "bg-white" : "bg-white/30 hover:bg-white/60"
            )}
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
