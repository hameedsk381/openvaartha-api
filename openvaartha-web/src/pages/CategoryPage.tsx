import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { Clock, Flame, ArrowUpRight, Bookmark, BookmarkCheck } from 'lucide-react';
import { handleImageFallback } from '../lib/utils';
import { useReadingList } from '@/hooks/use-reading-list';
import { useArticles, useCategories } from '@/lib/api-hooks';

const relativeTime = (iso: string) => {
  const h = Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
};

const CategoryPage = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const [filter, setFilter] = useState<'Latest' | 'Popular' | 'Trending'>('Latest');
  const { toggleSave, isSaved } = useReadingList();

  const { data: categories = [] } = useCategories();
  const { data: allArticles = [] } = useArticles({ limit: 50 });

  const currentCategory = useMemo(() => {
    const cat = categories.find(
      (c) => c.name.toLowerCase().replace(/\s+/g, '-') === categoryId,
    );
    return cat?.name || categoryId?.replace(/-/g, ' ') || 'Politics';
  }, [categoryId, categories]);

  const list = useMemo(() => {
    const base = allArticles.filter((a) => a.category?.toLowerCase() === currentCategory.toLowerCase());
    if (filter === 'Popular') return [...base].sort((a, b) => Number(!!b.isTrending) - Number(!!a.isTrending));
    if (filter === 'Trending') return base.filter((a) => a.isTrending);
    return [...base].sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));
  }, [currentCategory, filter, allArticles]);

  const featured = list[0];
  const secondary = list.slice(1, 3);
  const rest = list.slice(3);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="pt-20 sm:pt-24 pb-16">
        <div className="max-w-screen-2xl mx-auto">
          <header className="px-4 sm:px-6 lg:px-10 py-10 sm:py-14 border-b border-border bg-[hsl(var(--surface))]">
            <div className="flex items-center gap-2 mb-3">
              <Link to="/" className="overline text-muted-foreground hover:text-primary transition-colors">
                Open Vaartha
              </Link>
              <span className="text-muted-foreground/50">/</span>
              <span className="overline text-primary">Section</span>
            </div>
            <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.02]">
              {currentCategory}
            </h1>
            <p className="font-serif italic text-base sm:text-lg text-muted-foreground mt-4 max-w-2xl leading-relaxed">
              Independent reporting on {currentCategory.toLowerCase()} across South India — verified by regional desks.
            </p>
          </header>

          {featured && (
            <section className="border-b border-border">
              <div className="grid grid-cols-1 lg:grid-cols-12">
                <Link
                  to={`/article/${featured.slug}`}
                  className="lg:col-span-8 lg:border-r lg:border-border block group press"
                >
                  <div className="relative aspect-[16/10] sm:aspect-[16/9] overflow-hidden bg-[hsl(var(--surface-2))] bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900">
                    {featured.thumbnailUrl && (
                      <img
                        src={featured.thumbnailUrl}
                        alt={featured.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                        onError={handleImageFallback}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8 lg:p-10 text-white">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="overline text-secondary">Featured</span>
                      <span className="h-1 w-1 rounded-full bg-white/40" />
                      <span className="text-[11px] font-medium tracking-wide">{relativeTime(featured.publishedAt)}</span>
                      {featured.isTrending && (
                        <>
                          <span className="h-1 w-1 rounded-full bg-white/40" />
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-secondary">
                            <Flame className="h-3 w-3 fill-current" /> Trending
                          </span>
                        </>
                      )}
                    </div>
                    <h2 className="font-serif text-2xl sm:text-4xl lg:text-5xl font-bold leading-[1.05] tracking-tight max-w-3xl">
                      {featured.title}
                    </h2>
                    <p className="text-white/80 text-sm sm:text-base mt-3 line-clamp-2 max-w-2xl leading-relaxed">
                      {featured.summary}
                    </p>
                    <span className="inline-flex items-center gap-1.5 mt-5 text-xs font-semibold uppercase tracking-[0.18em] group-hover:text-secondary transition-colors">
                      Read article <ArrowUpRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>

                <aside className="lg:col-span-4 flex flex-col">
                  <div className="px-4 sm:px-6 py-4 lg:py-5 border-b border-border">
                    <span className="overline text-primary">Also in {currentCategory}</span>
                  </div>
                  {secondary.map((art, i) => (
                    <Link
                      key={art.id}
                      to={`/article/${art.slug}`}
                      className={`group press flex gap-4 px-4 sm:px-6 py-4 hover:bg-[hsl(var(--surface))] transition-colors ${
                        i !== secondary.length - 1 ? 'border-b border-border' : ''
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <span className="overline text-primary">{relativeTime(art.publishedAt)}</span>
                        <h4 className="font-serif text-base font-bold leading-snug tracking-tight mt-1 group-hover:text-primary transition-colors line-clamp-3">
                          {art.title}
                        </h4>
                        <span className="flex items-center gap-1 mt-2 text-[11px] text-muted-foreground font-medium">
                          <Clock className="h-3 w-3" /> {art.readTime}
                        </span>
                      </div>
                      {art.thumbnailUrl && (
                        <div className="w-24 h-20 sm:w-28 sm:h-24 shrink-0 overflow-hidden rounded-md bg-[hsl(var(--surface-2))]">
                          <img
                            src={art.thumbnailUrl}
                            alt=""
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            onError={handleImageFallback}
                            loading="lazy"
                          />
                        </div>
                      )}
                    </Link>
                  ))}
                </aside>
              </div>
            </section>
          )}

          <section className="px-4 sm:px-6 lg:px-10 py-8 sm:py-12">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 pb-5 border-b border-border">
              <div>
                <span className="overline text-primary">Sort</span>
                <div className="mt-2 flex items-center gap-1 border border-border rounded-md overflow-hidden w-fit">
                  {(['Latest', 'Popular', 'Trending'] as const).map(opt => (
                    <button
                      key={opt}
                      onClick={() => setFilter(opt)}
                      className={`h-10 px-4 text-xs font-semibold uppercase tracking-wider transition-colors ${
                        filter === opt ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div className="font-serif italic text-sm text-muted-foreground">
                {list.length} {list.length === 1 ? 'story' : 'stories'} in this section
              </div>
            </div>

            {rest.length === 0 ? (
              <div className="py-16 text-center">
                <p className="font-serif italic text-muted-foreground">No more stories to show.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
                {rest.map(art => (
                  <article key={art.id} className="group">
                    <Link to={`/article/${art.slug}`} className="block press">
                      {art.thumbnailUrl && (
                        <div className="aspect-[4/3] overflow-hidden rounded-lg bg-[hsl(var(--surface-2))] mb-4">
                          <img
                            src={art.thumbnailUrl}
                            alt=""
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                            onError={handleImageFallback}
                            loading="lazy"
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="overline text-primary">{art.category}</span>
                        <span className="h-1 w-1 rounded-full bg-border" />
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {relativeTime(art.publishedAt)}
                        </span>
                      </div>
                      <h3 className="font-serif text-lg sm:text-xl font-bold leading-snug tracking-tight group-hover:text-primary transition-colors line-clamp-3">
                        {art.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                        {art.summary}
                      </p>
                    </Link>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-medium">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {art.readTime}</span>
                        <span>·</span>
                        <span className="truncate">{art.author}</span>
                      </div>
                      <button
                        onClick={() => toggleSave(art as any)}
                        className={`h-9 w-9 rounded-md flex items-center justify-center transition-colors press
                          ${isSaved(art.id) ? 'text-primary bg-[hsl(var(--primary-subtle))]' : 'text-muted-foreground hover:text-primary hover:bg-[hsl(var(--primary-subtle))]'}`}
                        aria-label="Save"
                      >
                        {isSaved(art.id)
                          ? <BookmarkCheck className="h-4 w-4 fill-current" />
                          : <Bookmark className="h-4 w-4" />}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default CategoryPage;
