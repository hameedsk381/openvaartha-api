import React from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { Article } from '../data/mockArticles';
import { Link } from 'react-router-dom';
import { ChevronRight, ArrowUpRight, Clock, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { getArticleImage, handleImageFallback } from '../lib/utils';

interface HeroCarouselProps {
  articles: Article[];
}

const HeroCarousel = ({ articles }: HeroCarouselProps) => {
  const [emblaRef] = useEmblaCarousel({ loop: true }, [Autoplay({ delay: 5000 })]);

  return (
    <section className="relative mb-10 w-full overflow-hidden rounded-[1.75rem] border border-black/5 bg-background shadow-glass-lg dark:border-white/5 sm:mb-12 sm:rounded-[2.5rem] group">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {articles.map((article, index) => (
            <div key={article.id} className="relative min-h-[520px] flex-[0_0_100%] min-w-0 sm:min-h-0 sm:aspect-[21/10] lg:aspect-[21/8.5]">
              {/* Background with subtle zoom on hover */}
              <div className="absolute inset-0 overflow-hidden">
                <img
                  src={getArticleImage(article.thumbnail)}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105"
                  loading={index === 0 ? "eager" : "lazy"}
                  onError={handleImageFallback}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
              </div>

              {/* Content Overlay */}
              <div className="absolute inset-0 flex flex-col justify-end p-6 pb-10 sm:p-10 sm:pb-14 lg:p-14 lg:pb-20">
                <div className="max-w-[95%] space-y-4 animate-in slide-in-from-bottom-8 duration-700 sm:max-w-2xl sm:space-y-4 lg:max-w-4xl lg:space-y-5">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <span className="rounded-full bg-white px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-black shadow-lg sm:px-4 sm:text-[10px]">
                      {article.category}
                    </span>
                    <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.3em] text-white/50 sm:text-[10px]">
                      <Clock className="h-3 w-3 opacity-60" /> {article.readTime}
                    </div>
                    {article.trending && (
                      <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.3em] text-primary sm:text-[10px]">
                        <Sparkles className="h-3 w-3 fill-current" /> Trending
                      </span>
                    )}
                  </div>

                  <h2 className="max-w-4xl text-balance text-[1.85rem] font-black leading-[1.05] tracking-tighter text-white sm:text-4xl md:text-5xl lg:text-6xl">
                    {article.title}
                  </h2>
                  <p className="max-w-2xl line-clamp-2 text-sm font-bold leading-relaxed text-white/40 sm:text-lg tracking-tight">
                    {article.summary}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 pt-3 sm:pt-4">
                    <Link to={`/article/${article.slug}`}>
                      <Button className="h-11 rounded-2xl bg-white px-8 text-[11px] font-black uppercase tracking-[0.2em] text-black shadow-2xl transition-all hover:scale-[1.05] hover:bg-white active:scale-95 sm:h-12 sm:px-10 sm:text-xs">
                        Explore Full Report
                      </Button>
                    </Link>
                    <Link to="/" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-white/30 transition-all hover:gap-4 hover:text-white group/link">
                      VIEW FEED <ChevronRight className="h-4 w-4 transition-transform group-hover/link:translate-x-1" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Decorative Branding */}
      <div className="absolute bottom-10 right-10 z-20 pointer-events-none hidden lg:block">
        <div className="px-5 py-2 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 text-[9px] font-black text-white/20 uppercase tracking-[0.5em] shadow-2xl">
          SOUTH SCOOP INTELLIGENCE HUB
        </div>
      </div>
    </section>
  );
};

export default HeroCarousel;
