import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { BlurFade } from '@/components/ui/blur-fade';
import { MagicCard } from '@/components/ui/magic-card';
import { ChevronRight } from '@/components/animate-ui/icons/chevron-right';
import { CategoryIcon } from '@/components/CategoryIcon';
import { getArticleImage, handleImageFallback, relativeTime, categorySlug } from '@/lib/utils';
import { useArticlesByCategory } from '@/lib/api-hooks';
import type { Category } from '@/lib/types';

export default function CategoryStrip({ category }: { category: Category }) {
  const { data: articles = [] } = useArticlesByCategory(category.id, 4);

  if (articles.length === 0) return null;

  return (
    <div className="py-6 sm:py-8">
      <div className="flex items-baseline justify-between mb-4">
        <div className="flex items-center gap-2 text-primary">
          <CategoryIcon name={category.name} className="h-5 w-5" />
          <h3 className="font-display text-lg sm:text-xl font-bold tracking-tight text-foreground">{category.name}</h3>
        </div>
        <Link
          to={`/category/${categorySlug(category.name)}`}
          className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
        >
          View all <ChevronRight className="h-3 w-3" animateOnHover />
        </Link>
      </div>

      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-hide no-scrollbar sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible sm:pb-0">
        {articles.map((art, idx) => (
          <BlurFade key={art.id} delay={0.1 * idx} inView>
            <Link
              to={`/article/${art.slug}`}
              className="group flex-shrink-0 w-[85vw] sm:w-auto h-full flex block snap-start"
            >
              <MagicCard className="w-full flex flex-col p-0 border-none bg-transparent shadow-none" gradientColor="hsl(var(--primary) / 0.1)">
                <div className="aspect-[16/10] overflow-hidden rounded-lg bg-[hsl(var(--surface-2))] mb-3">
                  <img
                    src={getArticleImage(art.thumbnailUrl)}
                    alt={art.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                    sizes="(max-width: 640px) 85vw, (max-width: 1024px) 50vw, 25vw"
                    onError={handleImageFallback}
                  />
                </div>
                <div className="flex items-center gap-2 mb-1.5 px-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">{art.category}</span>
                  <span className="h-1 w-1 rounded-full bg-border" />
                  <span className="text-[10px] text-muted-foreground">{relativeTime(art.publishedAt)}</span>
                </div>
                <h4 className="font-display text-sm sm:text-[15px] font-bold leading-snug tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-3 px-1">
                  {art.title}
                </h4>
              </MagicCard>
            </Link>
          </BlurFade>
        ))}
      </div>
    </div>
  );
}
