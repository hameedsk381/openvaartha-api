import { Link } from 'react-router-dom';
import { CategoryIcon } from '@/components/CategoryIcon';
import SectionLink from './SectionLink';
import { getArticleImage, handleImageFallback, relativeTime, categorySlug } from '@/lib/utils';
import { useArticlesByCategory } from '@/lib/api-hooks';
import type { Category } from '@/lib/types';

export default function CategoryStrip({ category }: { category: Category }) {
  const { data: articles = [], isLoading, isPlaceholderData } = useArticlesByCategory(category.id, 4);

  if (!isLoading && !isPlaceholderData && articles.length === 0) return null;
  const skeletonCount = 4;

  return (
    <section aria-label={category.name} className="py-6 sm:py-8">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 text-primary">
          <CategoryIcon name={category.name} className="h-5 w-5" />
          <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-foreground">{category.name}</h2>
        </div>
        <SectionLink to={`/category/${categorySlug(category.name)}`}>
          View all
        </SectionLink>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted/20 p-3 sm:gap-4 lg:grid-cols-4">
        {(articles.length > 0 ? articles : Array.from({ length: skeletonCount }, () => null)).map((art, idx) =>
            art ? (
              <Link
                key={art.id}
                to={`/article/${art.slug}`}
                className="group min-w-0 rounded-md bg-card p-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                  <div className="aspect-[16/10] overflow-hidden rounded-md bg-[hsl(var(--surface-2))] mb-2">
                    <img
                      src={getArticleImage(art.thumbnailUrl)}
                      alt=""
                      width={640}
                      height={400}
                      className="w-full h-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.02]"
                      loading="lazy"
                      decoding="async"
                      sizes="(max-width: 1024px) 50vw, 25vw"
                      onError={handleImageFallback}
                    />
                  </div>
                  <h3 className="font-display text-sm sm:text-[15px] font-bold leading-snug tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-3">
                    {art.title}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">{relativeTime(art.publishedAt)}</p>
              </Link>
            ) : (
              <div key={`skeleton-${idx}`} aria-hidden="true" className="min-w-0 p-2 motion-safe:animate-pulse">
                <div className="w-full flex flex-col">
                  <div className="aspect-[16/10] rounded-lg bg-muted mb-3" />
                  <div className="h-2 w-16 bg-muted rounded mb-1.5" />
                  <div className="h-4 w-full bg-muted rounded mb-1" />
                  <div className="h-4 w-3/4 bg-muted rounded" />
                </div>
              </div>
            )
        )}
      </div>
    </section>
  );
}
