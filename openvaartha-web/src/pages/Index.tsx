import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import BreakingTicker from '../components/BreakingTicker';
import FeedSkeleton from '../components/FeedSkeleton';
import { articles, Category } from '../data/mockArticles';
import { getArticleImage, handleImageFallback } from '@/lib/utils';
import { Clock, Zap, Bookmark, BookmarkCheck, ChevronRight } from 'lucide-react';
import { useReadingList } from '@/hooks/use-reading-list';

const CATEGORIES: Category[] = ["Politics", "Tech", "Business", "Cinema", "Local News", "Sports"];

export default function Index() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCat = (searchParams.get('category') as Category | 'All') || 'All';
  const { toggleSave, isSaved } = useReadingList();
  const [collapsed, setCollapsed] = useState(false);
  const [switching, setSwitching] = useState(false);
  const switchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let lastY = 0;
    const onScroll = () => {
      const y = window.scrollY;
      setCollapsed(y > 80 && y > lastY);
      lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const setCategory = (cat: Category | 'All') => {
    if (cat === selectedCat) return;
    setSwitching(true);
    if (switchTimer.current) clearTimeout(switchTimer.current);
    switchTimer.current = setTimeout(() => setSwitching(false), 400);
    if (cat === 'All') searchParams.delete('category');
    else searchParams.set('category', cat);
    setSearchParams(searchParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filtered   = selectedCat === 'All' ? articles : articles.filter(a => a.category === selectedCat);
  const hero       = filtered[0];
  const secondary  = filtered.slice(1, 4);
  const feed       = filtered.slice(4);
  const breaking   = articles.filter(a => (a as any).isBreaking).slice(0, 4);
  const isFiltered = selectedCat !== 'All';

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ═══ FIXED HEADER ════════════════════════════════════════ */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
        <Navbar isInsideStack />

        {/* Collapsible chips + ticker — hidden on scroll-down */}
        <div
          className="overflow-hidden transition-[max-height,opacity] duration-300"
          style={{ maxHeight: collapsed ? 0 : 120, opacity: collapsed ? 0 : 1 }}
        >
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar px-4 py-2.5">
            {(['All', ...CATEGORIES] as (Category | 'All')[]).map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`shrink-0 h-7 px-3 rounded-full text-xs font-medium transition-colors press whitespace-nowrap
                  ${selectedCat === cat
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary/50 text-[hsl(var(--secondary-foreground))] hover:bg-secondary'}`}
              >
                {cat}
              </button>
            ))}
          </div>

          <BreakingTicker />
        </div>
      </div>

      {/* ═══ MAIN CONTENT ═══════════════════════════════════════ */}
      <main className="pb-safe" style={{ paddingTop: collapsed ? '56px' : '130px', transition: 'padding-top 300ms' }}>

        {/* ── Filtered header ───────────────────────────────── */}
        {isFiltered && (
          <div className="px-4 py-6 border-b border-border bg-[hsl(var(--surface))]">
            <span className="text-xs font-medium text-primary">Category</span>
            <h1 className="text-3xl font-bold tracking-tight mt-1">
              {selectedCat}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {filtered.length} article{filtered.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* ── Hero Article ──────────────────────────────────── */}
        {hero && (
          <div className="relative">
            <Link to={`/article/${hero.slug}`} className="block press group">
              <div className="relative overflow-hidden aspect-[4/3] sm:aspect-[16/8]">
                <img
                  src={getArticleImage(hero.thumbnail)}
                  alt={hero.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                  loading="eager"
                  onError={handleImageFallback}
                />
                {/* Single soft scrim — let the photo breathe */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-8">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center h-5 px-2 rounded text-[10px] font-semibold bg-primary text-white">
                      {hero.category}
                    </span>
                    {(hero as any).trending && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-secondary">
                        <Zap className="h-3 w-3 fill-current" /> Trending
                      </span>
                    )}
                  </div>
                  <h2 className="text-white font-bold text-xl sm:text-3xl lg:text-4xl leading-tight tracking-tight max-w-2xl">
                    {hero.title}
                  </h2>
                  <p className="text-white/75 text-sm font-normal mt-2 line-clamp-2 hidden sm:block max-w-xl">
                    {hero.summary}
                  </p>
                  <div className="flex items-center gap-4 mt-4">
                    <span className="flex items-center gap-1.5 text-white/70 text-xs">
                      <Clock className="h-3 w-3" /> {hero.readTime}
                    </span>
                    <span className="text-white/60 text-xs font-medium group-hover:text-secondary transition-colors flex items-center gap-1">
                      Read <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>

            {/* Save button */}
            <button
              onClick={() => toggleSave(hero)}
              className="absolute top-4 right-4 h-8 w-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-primary transition-colors press"
              aria-label="Save article"
            >
              {isSaved(hero.id)
                ? <BookmarkCheck className="h-4 w-4 fill-current" />
                : <Bookmark className="h-4 w-4" />}
            </button>
          </div>
        )}

        {/* ── Secondary 3-card strip ────────────────────────── */}
        {secondary.length > 0 && (
          <div className="border-b border-border">
            <div className="flex overflow-x-auto no-scrollbar gap-0 divide-x divide-border">
              {secondary.map((art, i) => (
                <Link
                  key={art.id}
                  to={`/article/${art.slug}`}
                  className="flex-1 min-w-[200px] sm:min-w-0 p-4 hover:bg-[hsl(var(--surface))] transition-colors press block"
                >
                  <div className="aspect-video rounded-lg overflow-hidden bg-secondary/30 mb-3">
                    <img src={getArticleImage(art.thumbnail)} alt="" className="w-full h-full object-cover" onError={handleImageFallback} loading="lazy" />
                  </div>
                  <span className="tag mb-2">{art.category}</span>
                  <p className="text-xs font-bold text-foreground leading-snug line-clamp-3 tracking-tight">{art.title}</p>
                  <div className="flex items-center gap-1 mt-2 text-2xs text-muted-foreground font-medium">
                    <Clock className="h-2.5 w-2.5" /> {art.readTime}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Breaking strip ────────────────────────────────── */}
        {!isFiltered && breaking.length > 0 && (
          <div className="border-b border-border">
            <div className="section-header px-4">
              <span className="text-xs font-semibold flex items-center gap-1.5 text-primary">
                <Zap className="h-3 w-3 fill-current" /> Breaking now
              </span>
              <span className="text-xs text-muted-foreground">Live updates</span>
            </div>
            <div className="flex overflow-x-auto no-scrollbar gap-3 px-4 py-3">
              {breaking.map(art => (
                <Link
                  key={art.id}
                  to={`/article/${art.slug}`}
                  className="shrink-0 w-52 rounded-xl overflow-hidden border border-border hover:border-primary/40 transition-colors press block"
                >
                  <div className="aspect-[16/9] overflow-hidden">
                    <img src={getArticleImage(art.thumbnail)} alt="" className="w-full h-full object-cover" onError={handleImageFallback} loading="lazy" />
                  </div>
                  <div className="p-3">
                    <span className="tag mb-2">{art.category}</span>
                    <p className="text-xs font-semibold leading-snug text-foreground line-clamp-2">{art.title}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Main Vertical Feed ────────────────────────────── */}
        <div>
          <div className="section-header px-4">
            <span className="text-xs font-semibold text-foreground">{isFiltered ? `${selectedCat} stories` : 'Latest stories'}</span>
            <span className="text-xs text-muted-foreground">{feed.length} articles</span>
          </div>

          {switching ? (
            <div className="px-4 pt-4"><FeedSkeleton /></div>
          ) : feed.map((art) => (
            <div key={art.id} className="feed-item group">
              {/* Content */}
              <Link to={`/article/${art.slug}`} className="flex-1 min-w-0">
                <span className="tag mb-2">{art.category}</span>
                <h3 className="text-sm font-bold leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-3 tracking-tight">
                  {art.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 hidden sm:block">
                  {art.summary}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="flex items-center gap-1 text-2xs text-muted-foreground font-medium">
                    <Clock className="h-2.5 w-2.5" /> {art.readTime}
                  </span>
                  {(art as any).trending && (
                    <span className="flex items-center gap-1 text-2xs text-primary font-bold uppercase tracking-widest">
                      <Zap className="h-2.5 w-2.5 fill-current" /> Trending
                    </span>
                  )}
                </div>
              </Link>

              {/* Thumbnail + save */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                <Link to={`/article/${art.slug}`} className="press block">
                  <div className="w-20 h-16 sm:w-24 sm:h-18 rounded-lg overflow-hidden bg-secondary/30">
                    <img src={getArticleImage(art.thumbnail)} alt="" className="w-full h-full object-cover" loading="lazy" onError={handleImageFallback} />
                  </div>
                </Link>
                <button
                  onClick={() => toggleSave(art)}
                  className={`h-6 w-6 rounded-md flex items-center justify-center transition-colors press
                    ${isSaved(art.id) ? 'text-primary bg-[hsl(var(--primary-subtle))]' : 'text-muted-foreground hover:text-primary hover:bg-[hsl(var(--primary-subtle))]'}`}
                  aria-label="Save"
                >
                  {isSaved(art.id) ? <BookmarkCheck className="h-3.5 w-3.5 fill-current" /> : <Bookmark className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* ── Footer ───────────────────────────────────────── */}
        <footer className="border-t border-border px-4 py-8 mt-4 bg-[hsl(var(--surface))]">
          <div className="flex items-start gap-2 mb-6">
            <div className="h-7 w-7 rounded-lg gradient-maroon flex items-center justify-center shrink-0 shadow-sm">
              <span className="text-[9px] font-black text-white">OV</span>
            </div>
            <div>
              <div className="font-bold tracking-tight text-sm">Open<span className="text-primary">vaartha</span></div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed max-w-xs">
                South India's news platform.
              </p>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-xs font-semibold text-foreground mb-3">Categories</p>
            <div className="grid grid-cols-3 gap-y-2.5 gap-x-4">
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => setCategory(c)} className="text-left text-xs font-medium text-muted-foreground hover:text-primary transition-colors press">
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="divider pt-4 flex justify-between text-2xs text-muted-foreground/50 font-medium">
            <span>© 2026 Open Vaartha</span>
            <span className="flex gap-4">
              <span className="cursor-pointer hover:text-muted-foreground transition-colors">Privacy</span>
              <span className="cursor-pointer hover:text-muted-foreground transition-colors">Terms</span>
            </span>
          </div>
        </footer>
      </main>
    </div>
  );
}
