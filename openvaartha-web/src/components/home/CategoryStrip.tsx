import { Link } from 'react-router-dom';
import { BlurFade } from '@/components/ui/blur-fade';
import { MagicCard } from '@/components/ui/magic-card';
import { CategoryIcon } from '@/components/CategoryIcon';
import SectionLink from './SectionLink';
import { getArticleImage, handleImageFallback, relativeTime, categorySlug } from '@/lib/utils';
import { useArticlesByCategory } from '@/lib/api-hooks';
import type { Category } from '@/lib/types';

export default function CategoryStrip({ category }: { category: Category }) {
  const { data: articles = [], isLoading } = useArticlesByCategory(category.id, 4);

  // Always render the section to reserve vertical space and prevent CLS.
  // Show skeleton cards while loading, real cards when data arrives.
  const skeletonCount = 4;

  return (
    <div className="py-6 sm:py-8">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 text-primary">
          <CategoryIcon name={category.name} className="h-5 w-5" />
          <h3 className="font-display text-lg sm:text-xl font-bold tracking-tight text-foreground">{category.name}</h3>
        </div>
        <SectionLink to={`/category/${categorySlug(category.name)}`}>
          View all
        </SectionLink>
      </div>

      <div className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-hide no-scrollbar sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible sm:pb-0">
        {(articles.length > 0 ? articles : Array.from({ length: skeletonCount })).map((art: any, idx: number) => (
          <BlurFade key={art?.id || `skeleton-${idx}`} delay={0.1 * idx} inView>
            {art ? (
              <Link
                to={`/article/${art.slug}`}
                className="group flex-shrink-0 w-[85vw] sm:w-auto h-full flex block snap-start"
              >
                <MagicCard className="w-full flex flex-col p-0 border-none bg-transparent shadow-none" gradientColor="hsl(var(--primary) / 0.1)">
                  <div className="aspect-[16/10] overflow-hidden rounded-lg bg-[hsl(var(--surface-2))] mb-3">
                    <img
                      src={getArticleImage(art.thumbnailUrl)}
                      alt={art.title}
                      width={640}
                      height={400}
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
            ) : (
              <div className="flex-shrink-0 w-[85vw] sm:w-auto h-full flex snap-start animate-pulse">
                <div className="w-full flex flex-col">
                  <div className="aspect-[16/10] rounded-lg bg-muted mb-3" />
                  <div className="h-2 w-16 bg-muted rounded mb-1.5" />
                  <div className="h-4 w-full bg-muted rounded mb-1" />
                  <div className="h-4 w-3/4 bg-muted rounded" />
                </div>
              </div>
            )}
          </BlurFade>
        ))}
      </div>
    </div>
  );
}
