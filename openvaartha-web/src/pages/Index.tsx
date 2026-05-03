import { useEffect, useState, useRef, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import BreakingTicker from '../components/BreakingTicker';
import FeedSkeleton from '../components/FeedSkeleton';
import { articles, Category } from '../data/mockArticles';
import { getArticleImage, handleImageFallback } from '@/lib/utils';
import { Clock, Zap, Bookmark, BookmarkCheck, ArrowUpRight, Flame } from 'lucide-react';
import { useReadingList } from '@/hooks/use-reading-list';

const CATEGORIES: Category[] = ["Politics", "Tech", "Business", "Cinema", "Local News", "Sports"];

const formatDateline = (d = new Date()) =>
  d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

const relativeTime = (iso: string) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const h = Math.round(diffMs / 3_600_000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

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

  const filtered  = selectedCat === 'All' ? articles : articles.filter(a => a.category === selectedCat);
  const isFiltered = selectedCat !== 'All';

  const hero      = filtered[0];
  const topRail   = filtered.slice(1, 4);     // right rail beside hero
  const editor    = filtered.slice(4, 7);     // 3-up "Top Stories"
  const feed      = filtered.slice(7);        // long list
  const trending  = useMemo(() => articles.filter(a => a.trending).slice(0, 5), []);
  const dateline  = useMemo(() => formatDateline(), []);

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ═══ FIXED HEADER ════════════════════════════════════════ */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
        <Navbar isInsideStack />

        <div
          className="overflow-hidden transition-[max-height,opacity] duration-300"
          style={{ maxHeight: collapsed ? 0 : 120, opacity: collapsed ? 0 : 1 }}
        >
          <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 py-2.5 max-w-screen-2xl mx-auto">
            {(['All', ...CATEGORIES] as (Category | 'All')[]).map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`shrink-0 h-9 px-4 rounded-full text-sm font-medium transition-colors press whitespace-nowrap
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
      <main
        className="pb-safe"
        style={{ paddingTop: collapsed ? '56px' : '130px', transition: 'padding-top 300ms' }}
      >
        <div className="max-w-screen-2xl mx-auto">

          {/* ── Dateline / masthead strip ─────────────────────── */}
          <div className="px-4 sm:px-6 lg:px-10 py-3 sm:py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <span className="hidden sm:inline-flex h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              <span className="font-serif italic text-xs sm:text-sm text-muted-foreground truncate">
                {dateline}
              </span>
            </div>
            <div className="flex items-center gap-3 sm:gap-5 text-[10px] sm:text-xs uppercase tracking-[0.18em] text-muted-foreground/80 font-semibold">
              <span className="hidden sm:inline">South India Edition</span>
              <span className="hidden sm:inline-block h-3 w-px bg-border" />
              <span className="text-primary">Vol. 02 · No. 47</span>
            </div>
          </div>

          {/* ── Filtered header ──────────────────────────────── */}
          {isFiltered && (
            <div className="px-4 sm:px-6 lg:px-10 py-6 border-b border-border">
              <span className="overline text-primary">Section</span>
              <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight mt-1">
                {selectedCat}
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                {filtered.length} article{filtered.length !== 1 ? 's' : ''} in this section
              </p>
            </div>
          )}

          {/* ── Lead spread: hero + right rail ───────────────── */}
          {hero && (
            <section className="border-b border-border">
              <div className="grid grid-cols-1 lg:grid-cols-12">

                {/* Lead story — large */}
                <div className="lg:col-span-8 lg:border-r lg:border-border">
                  <Link
                    to={`/article/${hero.slug}`}
                    className="block group press relative"
                  >
                    <div className="relative overflow-hidden aspect-[16/10] sm:aspect-[16/9] lg:aspect-[16/10] bg-[hsl(var(--surface-2))]">
                      <img
                        src={getArticleImage(hero.thumbnail)}
                        alt={hero.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                        loading="eager"
                        onError={handleImageFallback}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                      <button
                        onClick={(e) => { e.preventDefault(); toggleSave(hero); }}
                        className="absolute top-4 right-4 h-10 w-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-primary transition-colors press"
                        aria-label="Save article"
                      >
                        {isSaved(hero.id)
                          ? <BookmarkCheck className="h-4 w-4 fill-current" />
                          : <Bookmark className="h-4 w-4" />}
                      </button>

                      <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8 lg:p-10">
                        <div className="flex items-center gap-3 mb-3 text-white/90">
                          <span className="overline text-secondary !text-[10px]">{hero.category}</span>
                          <span className="h-1 w-1 rounded-full bg-white/40" />
                          <span className="text-[11px] font-medium tracking-wide">{relativeTime(hero.publishedAt)}</span>
                          {hero.trending && (
                            <>
                              <span className="h-1 w-1 rounded-full bg-white/40" />
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-secondary">
                                <Flame className="h-3 w-3 fill-current" /> Trending
                              </span>
                            </>
                          )}
                        </div>
                        <h2 className="font-serif text-white font-bold text-2xl sm:text-4xl lg:text-5xl leading-[1.05] tracking-tight max-w-3xl">
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
                            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>

                {/* Right rail — 3 stacked top stories */}
                <aside className="lg:col-span-4 flex flex-col">
                  <div className="px-4 sm:px-6 lg:px-6 py-4 lg:py-5 border-b border-border flex items-baseline justify-between">
                    <h3 className="font-serif italic text-sm tracking-tight text-foreground">
                      Top stories
                    </h3>
                    <span className="overline">Now</span>
                  </div>
                  {topRail.map((art, i) => (
                    <Link
                      key={art.id}
                      to={`/article/${art.slug}`}
                      className={`group press flex gap-4 px-4 sm:px-6 lg:px-6 py-4 hover:bg-[hsl(var(--surface))] transition-colors ${
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
                        <h4 className="font-serif text-[15px] sm:text-base font-bold leading-snug tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-3">
                          {art.title}
                        </h4>
                        <span className="flex items-center gap-1 mt-2 text-[11px] text-muted-foreground font-medium">
                          <Clock className="h-3 w-3" /> {art.readTime}
                        </span>
                      </div>
                      <div className="w-24 h-20 sm:w-28 sm:h-24 shrink-0 overflow-hidden rounded-md bg-[hsl(var(--surface-2))]">
                        <img
                          src={getArticleImage(art.thumbnail)}
                          alt=""
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                          onError={handleImageFallback}
                        />
                      </div>
                    </Link>
                  ))}
                </aside>
              </div>
            </section>
          )}

          {/* ── Editor's picks: 3-up image grid ──────────────── */}
          {editor.length > 0 && !switching && (
            <section className="border-b border-border px-4 sm:px-6 lg:px-10 py-8 sm:py-12">
              <div className="flex items-baseline justify-between mb-6 sm:mb-8">
                <div>
                  <span className="overline text-primary">Editor's picks</span>
                  <h3 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight mt-1">
                    Worth your time
                  </h3>
                </div>
                <Link
                  to="/trending"
                  className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground hover:text-primary transition-colors"
                >
                  View all <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {editor.map(art => (
                  <Link
                    key={art.id}
                    to={`/article/${art.slug}`}
                    className="group press block"
                  >
                    <div className="aspect-[4/3] overflow-hidden rounded-lg bg-[hsl(var(--surface-2))] mb-4">
                      <img
                        src={getArticleImage(art.thumbnail)}
                        alt=""
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                        loading="lazy"
                        onError={handleImageFallback}
                      />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="overline text-primary">{art.category}</span>
                      <span className="h-1 w-1 rounded-full bg-border" />
                      <span className="text-[10px] text-muted-foreground font-medium tracking-wide">
                        {relativeTime(art.publishedAt)}
                      </span>
                    </div>
                    <h4 className="font-serif text-lg sm:text-xl font-bold leading-snug tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-3">
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

          {/* ── Latest + sidebar ────────────────────────────── */}
          <section className="grid grid-cols-1 lg:grid-cols-12">
            {/* Latest list */}
            <div className="lg:col-span-8 lg:border-r lg:border-border">
              <div className="px-4 sm:px-6 lg:px-10 py-5 border-b border-border flex items-baseline justify-between">
                <div>
                  <span className="overline text-primary">{isFiltered ? selectedCat : 'Latest'}</span>
                  <h3 className="font-serif text-xl sm:text-2xl font-bold tracking-tight mt-0.5">
                    {isFiltered ? `${selectedCat} stories` : 'The latest'}
                  </h3>
                </div>
                <span className="text-xs text-muted-foreground font-medium">{feed.length} stories</span>
              </div>

              {switching ? (
                <div className="px-4 sm:px-6 lg:px-10 py-6"><FeedSkeleton /></div>
              ) : feed.length === 0 ? (
                <div className="px-4 sm:px-6 lg:px-10 py-16 text-center">
                  <p className="font-serif italic text-muted-foreground">No more stories in this section.</p>
                </div>
              ) : (
                feed.map((art) => (
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
                        {art.trending && (
                          <>
                            <span className="h-1 w-1 rounded-full bg-border" />
                            <span className="inline-flex items-center gap-1 text-[10px] text-primary font-semibold uppercase tracking-wide">
                              <Flame className="h-3 w-3 fill-current" /> Trending
                            </span>
                          </>
                        )}
                      </div>
                      <h3 className="font-serif text-base sm:text-lg font-bold leading-snug tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-2">
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
                            src={getArticleImage(art.thumbnail)}
                            alt=""
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                            onError={handleImageFallback}
                          />
                        </div>
                      </Link>
                      <button
                        onClick={() => toggleSave(art)}
                        className={`h-9 w-9 rounded-md flex items-center justify-center transition-colors press
                          ${isSaved(art.id) ? 'text-primary bg-[hsl(var(--primary-subtle))]' : 'text-muted-foreground hover:text-primary hover:bg-[hsl(var(--primary-subtle))]'}`}
                        aria-label="Save"
                      >
                        {isSaved(art.id) ? <BookmarkCheck className="h-4 w-4 fill-current" /> : <Bookmark className="h-4 w-4" />}
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>

            {/* Sidebar — Most read / Trending */}
            <aside className="lg:col-span-4">
              <div className="lg:sticky lg:top-[140px]">
                <div className="px-4 sm:px-6 lg:px-6 py-5 border-b border-border flex items-baseline justify-between">
                  <div>
                    <span className="overline text-primary">Most read</span>
                    <h3 className="font-serif text-xl font-bold tracking-tight mt-0.5">Trending now</h3>
                  </div>
                  <Zap className="h-4 w-4 text-primary fill-current" />
                </div>
                <ol className="px-4 sm:px-6 lg:px-6 py-2">
                  {trending.map((art, i) => (
                    <li key={art.id} className="border-b border-border last:border-0 py-4">
                      <Link to={`/article/${art.slug}`} className="group flex gap-4 press">
                        <span className="font-serif text-3xl font-bold text-primary/30 group-hover:text-primary transition-colors leading-none w-8 shrink-0">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="overline text-primary">{art.category}</span>
                          <h4 className="font-serif text-sm font-bold leading-snug tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-3 mt-1">
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

                {/* Newsletter card */}
                <div className="mx-4 sm:mx-6 lg:mx-6 my-6 p-6 rounded-xl gradient-maroon text-white relative overflow-hidden">
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,white,transparent_60%)]" />
                  <span className="relative overline !text-secondary">The Briefing</span>
                  <h4 className="relative font-serif text-xl font-bold mt-2 leading-snug">
                    South India, in your inbox by sunrise.
                  </h4>
                  <p className="relative text-sm text-white/80 mt-2 leading-relaxed">
                    A free morning digest of the stories that matter — curated, never automated.
                  </p>
                  <button className="relative mt-4 h-11 px-5 rounded-md bg-white text-primary text-sm font-bold inline-flex items-center gap-2 hover:bg-secondary transition-colors press">
                    Subscribe free <ArrowUpRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </aside>
          </section>

          {/* ── Footer ───────────────────────────────────────── */}
          <footer className="border-t border-border bg-[hsl(var(--surface))]">
            <div className="px-4 sm:px-6 lg:px-10 py-10 sm:py-14">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-10">
                <div className="md:col-span-5">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg gradient-maroon flex items-center justify-center shrink-0 shadow-sm">
                      <span className="text-xs font-black text-white">OV</span>
                    </div>
                    <div>
                      <div className="font-serif text-2xl font-bold tracking-tight">
                        Open<span className="text-primary">vaartha</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-xs">
                        Independent journalism from South India. Five languages. One signal, no noise.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-3">
                  <p className="overline mb-4">Sections</p>
                  <ul className="space-y-2.5">
                    {CATEGORIES.map(c => (
                      <li key={c}>
                        <button
                          onClick={() => setCategory(c)}
                          className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors press"
                        >
                          {c}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="md:col-span-2">
                  <p className="overline mb-4">Read</p>
                  <ul className="space-y-2.5 text-sm">
                    <li><Link to="/trending" className="text-muted-foreground hover:text-primary transition-colors">Trending</Link></li>
                    <li><Link to="/live" className="text-muted-foreground hover:text-primary transition-colors">Live updates</Link></li>
                    <li><Link to="/explainers" className="text-muted-foreground hover:text-primary transition-colors">Explainers</Link></li>
                  </ul>
                </div>

                <div className="md:col-span-2">
                  <p className="overline mb-4">Account</p>
                  <ul className="space-y-2.5 text-sm">
                    <li><Link to="/login" className="text-muted-foreground hover:text-primary transition-colors">Sign in</Link></li>
                    <li><Link to="/portal/saved" className="text-muted-foreground hover:text-primary transition-colors">Saved</Link></li>
                    <li><Link to="/portal/dashboard" className="text-muted-foreground hover:text-primary transition-colors">Portal</Link></li>
                  </ul>
                </div>
              </div>

              <div className="divider pt-5 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center text-xs text-muted-foreground">
                <span className="font-serif italic">© {new Date().getFullYear()} Open Vaartha — All rights reserved.</span>
                <div className="flex gap-5">
                  <span className="cursor-pointer hover:text-primary transition-colors font-medium">Privacy</span>
                  <span className="cursor-pointer hover:text-primary transition-colors font-medium">Terms</span>
                  <span className="cursor-pointer hover:text-primary transition-colors font-medium">Ethics</span>
                  <span className="cursor-pointer hover:text-primary transition-colors font-medium">Contact</span>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
