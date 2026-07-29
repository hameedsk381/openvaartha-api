import { useState, useRef, useMemo, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { BlurFade } from '@/components/ui/blur-fade';
import { MagicCard } from '@/components/ui/magic-card';
import { motion } from 'motion/react';
import { AnimatedIcon } from '@/components/ui/animated-icon';
import Navbar from '../components/Navbar';
import BreakingTicker from '../components/BreakingTicker';
import HeroCarousel from '../components/HeroCarousel';
import FeedSkeleton from '../components/FeedSkeleton';
import Footer from '@/components/Footer';
import { handleImageFallback, getArticleImage } from '@/lib/utils';
import { CategoryIcon } from '@/components/CategoryIcon';
import { Zap, Bookmark, BookmarkCheck, ArrowUpRight, Flame, Sparkles } from 'lucide-react';
import { Clock } from '@/components/animate-ui/icons/clock';
import { LoaderCircle } from '@/components/animate-ui/icons/loader-circle';
import { ChevronRight } from '@/components/animate-ui/icons/chevron-right';
import { toast } from 'sonner';
import { useReadingList } from '@/hooks/use-reading-list';
import {
  useArticles,
  useTrendingArticles,
  useForYouArticles,
  useEditorPicks,
  useCategories,
  useNewsletterSubscribe,
  useArticlesByCategory,
  useDispatches,
} from '@/lib/api-hooks';
import type { Article, Category } from '@/lib/types';

/* ─── helpers ────────────────────────────────────────── */

const relativeTime = (iso: string | null | undefined) => {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diffMs)) return '';
  const h = Math.round(diffMs / 3_600_000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

/* ─── Category Strip Component ───────────────────────── */

const MotionLink = motion.create(Link);

function CategoryStrip({ category }: { category: Category }) {
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
          to={`/?category=${category.name}`}
          className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
        >
          View all <ChevronRight className="h-3 w-3" animateOnHover />
        </Link>
      </div>

      {/* Mobile: horizontal scroll, Desktop: 4-col grid */}
      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-hide no-scrollbar sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible sm:pb-0">
        {articles.map((art, idx) => (
          <BlurFade key={art.id} delay={0.1 * idx} inView>
            <Link
              to={`/article/${art.slug}`}
              className="group flex-shrink-0 w-[260px] sm:w-auto h-full flex block snap-start"
            >
              <MagicCard className="w-full flex flex-col p-0 border-none bg-transparent shadow-none" gradientColor="hsl(var(--primary) / 0.1)">
                <div className="aspect-[16/10] overflow-hidden rounded-lg bg-[hsl(var(--surface-2))] mb-3">
                  <img
                    src={getArticleImage(art.thumbnailUrl)}
                    alt={art.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
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

/* ─── Bytes Mini-Feed ────────────────────────────────── */

function BytesMini() {
  const { data: dispatches = [] } = useDispatches(5);

  if (dispatches.length === 0) return null;

  return (
    <div className="border-t border-border">
      <div className="px-4 sm:px-6 lg:px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>
          <h3 className="font-display text-sm font-bold uppercase tracking-wide">Bytes</h3>
        </div>
        <Link to="/bytes" className="text-[10px] font-bold uppercase tracking-wider text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
          See all <ChevronRight className="h-3 w-3" animateOnHover />
        </Link>
      </div>
      <ul className="divide-y divide-border">
        {dispatches.map((u) => {
          const time = (
            <span className="text-[10px] text-muted-foreground font-medium">
              {new Date(u.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          );
          const text = (
            <p className="text-xs font-semibold leading-snug text-foreground group-hover:text-primary transition-colors mt-0.5 line-clamp-2">
              {u.text}
            </p>
          );
          return (
            <li key={u.id} className="px-4 sm:px-6 lg:px-6 py-3">
              {u.articleSlug ? (
                <Link to={`/article/${u.articleSlug}`} className="group">
                  {time}{text}
                </Link>
              ) : (
                <div>{time}{text}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────── */

export default function Index() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCat = searchParams.get('category') || 'All';
  const { toggleSave, isSaved } = useReadingList();
  const [switching, setSwitching] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [showNewsletter, setShowNewsletter] = useState(false);
  const switchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const subscribeMutation = useNewsletterSubscribe();

  const { data: categories = [] } = useCategories();

  const selectedCategoryObj = useMemo(() => {
    return categories.find(
      c => c.name.toLowerCase() === selectedCat.toLowerCase()
    );
  }, [categories, selectedCat]);

  const [limit, setLimit] = useState(40);

  useEffect(() => {
    setLimit(40);
  }, [selectedCat]);

  const [feedTab, setFeedTab] = useState<'latest' | 'forYou'>('latest');
  const { data: articlesData = [], isFetching } = useArticles({
    category: selectedCategoryObj?.id,
    limit
  });

  const { data: trendingData = [] } = useTrendingArticles(8);
  const { data: forYouData = [] } = useForYouArticles(25);
  const { data: editorPicks = [] } = useEditorPicks(6);

  const setCategory = (cat: string) => {
    if (cat === selectedCat) return;
    setSwitching(true);
    if (switchTimer.current) clearTimeout(switchTimer.current);
    switchTimer.current = setTimeout(() => setSwitching(false), 400);
    if (cat === 'All') searchParams.delete('category');
    else searchParams.set('category', cat);
    setSearchParams(searchParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const displayCategoryName = selectedCategoryObj ? selectedCategoryObj.name : selectedCat;

  const filtered = articlesData;
  const isFiltered = selectedCat.toLowerCase() !== 'all';

  const hero = filtered[0];
  const topRail = filtered.slice(1, 5);
  const feed = feedTab === 'forYou' && !isFiltered ? forYouData : filtered.slice(5);
  const trending = useMemo(() => trendingData.slice(0, 8), [trendingData]);
  const picks = useMemo(() => editorPicks.slice(0, 6), [editorPicks]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-50 bg-background border-b border-border">
        <Navbar isInsideStack />
        <BreakingTicker />
      </div>

      <main id="main-content" className="pb-safe pt-0">
        <div className="max-w-screen-2xl mx-auto">

          {isFiltered && (
            <div className="px-4 sm:px-6 lg:px-10 py-6 border-b border-border">
              <span className="overline text-primary">Section</span>
              <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight mt-1">
                {displayCategoryName}
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                {filtered.length} article{filtered.length !== 1 ? 's' : ''} in this section
              </p>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* HERO BLOCK                                                 */}
          {/* ═══════════════════════════════════════════════════════════ */}

          {hero && (
            <>
              {/* Mobile: Swipeable carousel */}
              <div className="lg:hidden">
                <HeroCarousel articles={filtered.slice(0, 5)} />
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
                        onClick={(e) => { e.preventDefault(); toggleSave(hero as any); }}
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
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* CATEGORY QUICK STRIPS (only on "All" view)                */}
          {/* ═══════════════════════════════════════════════════════════ */}

          {!isFiltered && categories.length > 0 && (
            <section className="border-b border-border px-4 sm:px-6 lg:px-10 divide-y divide-border">
              {categories.slice(0, 6).map((cat) => (
                <CategoryStrip key={cat.id} category={cat} />
              ))}
            </section>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* EDITOR'S PICKS                                            */}
          {/* ═══════════════════════════════════════════════════════════ */}

          {picks.length > 0 && !switching && !isFiltered && (
            <section className="border-b border-border px-4 sm:px-6 lg:px-10 py-8 sm:py-12">
              <div className="flex items-baseline justify-between mb-6 sm:mb-8">
                <div>
                  <span className="overline text-primary">Editor's picks</span>
                  <h3 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mt-1">
                    Worth your time
                  </h3>
                </div>
                <MotionLink
                  to="/trending"
                  className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground hover:text-primary transition-colors group"
                  initial="initial"
                  whileHover="hover"
                >
                  View all 
                  <AnimatedIcon animationType="arrowUpRight">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </AnimatedIcon>
                </MotionLink>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {picks.map(art => (
                  <Link
                    key={art.id}
                    to={`/article/${art.slug}`}
                    className="group press block"
                  >
                    <div className="hidden sm:block aspect-[4/3] w-full shrink-0 overflow-hidden rounded-lg bg-[hsl(var(--surface-2))]">
                    <img
                      src={getArticleImage(art.thumbnailUrl)}
                      alt={art.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                      onError={handleImageFallback}
                    />
                  </div>
                    <div className="flex items-center gap-2 mb-2 mt-4">
                      <span className="overline text-primary">{art.category}</span>
                      <span className="h-1 w-1 rounded-full bg-border" />
                      <span className="text-[10px] text-muted-foreground font-medium tracking-wide">
                        {relativeTime(art.publishedAt)}
                      </span>
                    </div>
                    <h4 className="font-display text-lg sm:text-xl font-bold leading-snug tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-3">
                      {art.title}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                      {art.summary}
                    </p>
                    <div className="flex items-center gap-3 mt-3 text-[11px] text-muted-foreground font-medium">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {art.readTime}</span>
                      <span>·</span>
                      <span className="truncate">{art.author}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* MAIN FEED + TRENDING SIDEBAR                              */}
          {/* ═══════════════════════════════════════════════════════════ */}

          <section className="grid grid-cols-1 lg:grid-cols-12">
            <div className="lg:col-span-8 lg:border-r lg:border-border">
              {(switching || feed.length > 0) && (
                <div className="px-4 sm:px-6 lg:px-10 py-5 border-b border-border flex items-baseline justify-between">
                  <div>
                    <span className="overline text-primary">{isFiltered ? displayCategoryName : 'Latest'}</span>
                    <h3 className="font-display text-xl sm:text-2xl font-bold tracking-tight mt-0.5">
                      {isFiltered ? `${displayCategoryName} stories` : 'The latest'}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isFiltered && (
                      <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-lg border border-border">
                        <button
                          type="button"
                          onClick={() => setFeedTab('latest')}
                          className={cn(
                            "px-3 py-1 rounded-md text-xs font-semibold transition-colors",
                            feedTab === 'latest' ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          Latest
                        </button>
                        <button
                          type="button"
                          onClick={() => setFeedTab('forYou')}
                          className={cn(
                            "px-3 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1",
                            feedTab === 'forYou' ? "bg-primary text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <Sparkles className="h-3 w-3" /> For You
                        </button>
                      </div>
                    )}
                    <span className="text-xs text-muted-foreground font-medium hidden sm:inline">{feed.length} stories</span>
                  </div>
                </div>
              )}

              {switching ? (
                <div className="px-4 sm:px-6 lg:px-10 py-6"><FeedSkeleton /></div>
              ) : (
                <>
                  {feed.map((art) => (
                    <article
                      key={art.id}
                      className="group flex gap-4 sm:gap-6 px-4 sm:px-6 lg:px-10 py-5 sm:py-6 border-b border-border last:border-0 hover:bg-[hsl(var(--surface))] transition-colors"
                    >
                      <Link to={`/article/${art.slug}`} className="flex-1 min-w-0 press">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="overline text-primary">{art.category}</span>
                          <span className="h-1 w-1 rounded-full bg-border" />
                          <span className="text-[10px] text-muted-foreground font-medium tracking-wide">
                            {relativeTime(art.publishedAt)}
                          </span>
                          {art.isTrending && (
                            <>
                              <span className="h-1 w-1 rounded-full bg-border" />
                              <span className="inline-flex items-center gap-1 text-[10px] text-primary font-semibold uppercase tracking-wide">
                                <Flame className="h-3 w-3 fill-current" /> Trending
                              </span>
                            </>
                          )}
                        </div>
                        <h3 className="font-display text-base sm:text-lg font-bold leading-snug tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-2">
                          {art.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                          {art.summary}
                        </p>
                        <div className="flex items-center gap-3 mt-3 text-[11px] text-muted-foreground font-medium">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {art.readTime}</span>
                          <span>·</span>
                          <span className="truncate">{art.author}</span>
                        </div>
                      </Link>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <Link to={`/article/${art.slug}`} className="press block">
                            <div className="w-24 h-20 sm:w-32 sm:h-24 rounded-md overflow-hidden bg-[hsl(var(--surface-2))]">
                              <img
                                src={getArticleImage(art.thumbnailUrl)}
                                alt={art.title}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                loading="lazy"
                                onError={handleImageFallback}
                              />
                            </div>
                        </Link>
                        <button
                          onClick={() => toggleSave(art as any)}
                          className={`h-9 w-9 rounded-md flex items-center justify-center transition-colors press
                            ${isSaved(art.id) ? 'text-primary bg-[hsl(var(--primary-subtle))]' : 'text-muted-foreground hover:text-primary hover:bg-[hsl(var(--primary-subtle))]'}`}
                          aria-label="Save"
                        >
                          <AnimatedIcon animationType="scale">
                            {isSaved(art.id) ? <BookmarkCheck className="h-4 w-4 fill-current" /> : <Bookmark className="h-4 w-4" />}
                          </AnimatedIcon>
                        </button>
                      </div>
                    </article>
                  ))}

                  {/* Load More */}
                  {articlesData.length >= limit && (
                    <div className="flex justify-center p-6 border-b border-border">
                      <button
                        onClick={() => setLimit(prev => prev + 20)}
                        disabled={isFetching}
                        className="w-full max-w-xs h-11 rounded-md border border-border bg-background text-foreground text-sm font-bold inline-flex items-center justify-center gap-2 hover:bg-[hsl(var(--surface))] transition-colors press disabled:opacity-50"
                      >
                        {isFetching ? (
                          <LoaderCircle className="h-4 w-4 text-muted-foreground" animate />
                        ) : (
                          "Load more stories"
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ── Sticky Sidebar ──────────────────────────────────── */}
            <aside className="lg:col-span-4">
              <div className="lg:sticky lg:top-[140px]">
                {/* Trending */}
                <div className="px-4 sm:px-6 lg:px-6 py-5 border-b border-border flex items-baseline justify-between">
                  <div>
                    <span className="overline text-primary">Most read</span>
                    <h3 className="font-display text-xl font-bold tracking-tight mt-0.5">Trending now</h3>
                  </div>
                  <Zap className="h-4 w-4 text-primary fill-current" />
                </div>
                <ol className="px-4 sm:px-6 lg:px-6 py-2">
                  {trending.map((art, i) => (
                    <li key={art.id} className="border-b border-border last:border-0 py-4">
                      <Link to={`/article/${art.slug}`} className="group flex gap-4 press">
                        <span className="font-display text-3xl font-bold text-primary/30 group-hover:text-primary transition-colors leading-none w-8 shrink-0">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="overline text-primary">{art.category}</span>
                          <h4 className="font-display text-sm font-bold leading-snug tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-3 mt-1">
                            {art.title}
                          </h4>
                          <span className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground font-medium">
                            <Clock className="h-2.5 w-2.5" /> {art.readTime}
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ol>

                {/* Newsletter CTA */}
                <div className="mx-4 sm:mx-6 lg:mx-6 my-6 p-6 rounded-2xl gradient-maroon text-white relative overflow-hidden border-2 border-foreground shadow-sticker min-h-[300px] flex flex-col justify-between">
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,white,transparent_60%)]" />
                  <div>
                    <span className="relative chip">The Briefing</span>
                    <h4 className="relative font-display text-2xl font-bold mt-3 leading-tight">
                      The stories that matter, in your inbox by sunrise.
                    </h4>
                    <p className="relative text-sm text-white/80 mt-2 leading-relaxed">
                      A free morning digest of the stories that matter — curated, never automated.
                    </p>
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (newsletterEmail.trim()) {
                        subscribeMutation.mutate(newsletterEmail.trim(), {
                          onSuccess: () => {
                            toast.success("Subscribed! Check your inbox.");
                            setNewsletterEmail('');
                          },
                          onError: (err) => toast.error(err.message),
                        });
                      }
                    }}
                    className="relative mt-4 flex gap-2"
                  >
                    <input
                      type="email"
                      value={newsletterEmail}
                      onChange={(e) => setNewsletterEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="flex-1 h-11 px-4 rounded-md bg-white/20 text-white placeholder:text-white/60 text-sm border border-white/30 focus:outline-none focus:border-white"
                    />
                    <button
                      type="submit"
                      disabled={subscribeMutation.isPending}
                      className="h-11 px-4 rounded-md bg-white text-primary text-sm font-bold inline-flex items-center gap-2 hover:bg-secondary transition-colors press disabled:opacity-50 shrink-0"
                    >
                      {subscribeMutation.isPending ? <><LoaderCircle className="h-4 w-4" animate /> Sending</> : 'Subscribe'}
                    </button>
                  </form>
                </div>

                {/* Bytes Mini */}
                <BytesMini />
              </div>
            </aside>
          </section>

          <Footer />
        </div>
      </main>
    </div>
  );
}
