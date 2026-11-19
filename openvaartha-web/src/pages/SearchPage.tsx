import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { Hash, ArrowUpRight } from 'lucide-react';
import { AnimatedIcon } from '@/components/ui/animated-icon';
import { Search } from '@/components/animate-ui/icons/search';
import { X } from '@/components/animate-ui/icons/x';
import { Clock } from '@/components/animate-ui/icons/clock';
import { LoaderCircle } from '@/components/animate-ui/icons/loader-circle';
import { handleImageFallback, cn } from '@/lib/utils';
import { BRAND, pageTitle, SITE_DESCRIPTION, SITE_TITLE } from '@/lib/brand';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useSearch, useCategories, useArticles } from '@/lib/api-hooks';
import { useAiSearch } from '@/lib/ai-search';
import AiAnswer from '@/components/search/AiAnswer';

const relativeTime = (iso: string) => {
  const h = Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (h < 24) return `${Math.max(h, 1)}h ago`;
  return `${Math.round(h / 24)}d ago`;
};

const SUGGESTED = ['Andhra Budget', 'IIT Madras AI', 'Bengaluru Metro', 'MS Dhoni', 'Tamil Nadu EV'];

const Highlight = ({ text, q }: { text: string; q: string }) => {
  if (!q) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-[hsl(var(--primary-subtle))] text-primary px-0.5 rounded-sm">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
};

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  // Supports deep links (e.g. Google's sitelinks search box via the
  // WebSite/SearchAction schema on the homepage: /search?q=...).
  const [query, setQuery] = useState(() => searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  // Ask is the default because someone who types a question expects an
  // answer. /search?mode=search pins the plain archive list.
  const [mode, setMode] = useState<'ask' | 'search'>(() =>
    searchParams.get('mode') === 'search' ? 'search' : 'ask'
  );
  const [focused, setFocused] = useState(false);

  const { data: categories = [] } = useCategories();

  const selectedCategoryObj = useMemo(() => {
    return categories.find(c => c.name.toLowerCase() === selectedCategory.toLowerCase());
  }, [categories, selectedCategory]);

  const [limit, setLimit] = useState(15);

  useEffect(() => {
    setLimit(15);
  }, [query, selectedCategory]);

  // Client-side title/description for in-app navigation; a first load gets the
  // same values from meta_service._STATIC_ROUTE_META["search"].
  useEffect(() => {
    document.title = pageTitle('Search');
    const metaDesc = document.querySelector('meta[name="description"]');
    const prevDesc = metaDesc?.getAttribute('content') ?? null;
    if (metaDesc) metaDesc.setAttribute('content', SITE_DESCRIPTION);
    return () => {
      document.title = SITE_TITLE;
      if (metaDesc && prevDesc !== null) metaDesc.setAttribute('content', prevDesc);
    };
  }, []);

  const { data: allArticles = [], isFetching: allFetching } = useArticles({
    category: selectedCategoryObj?.id,
    limit
  });

  const { data: searchResults = [], isFetching: searchFetching } = useSearch(query, 0, limit);

  const asking = mode === 'ask' && query.trim().length >= 3;
  const ai = useAiSearch(
    asking ? query : '',
    selectedCategory === 'All' ? undefined : selectedCategory,
    12
  );

  const { data: suggestionsData } = useQuery({
    queryKey: ["search", "suggestions", query],
    queryFn: () => apiFetch<{ titles: Array<{ title: string; slug: string }>; tags: string[]; categories: string[] }>(`/search/suggestions?q=${encodeURIComponent(query)}`),
    enabled: query.trim().length >= 2,
  });

  const isFetching = allFetching || searchFetching || (asking && ai.isFetching);

  const results = useMemo(() => {
    if (asking) {
      // While the answer is still being written, ordinary matches keep the page
      // useful; the answer card fills in above them once the model replies.
      return ai.data?.results ?? searchResults;
    }
    const source = query.trim() ? searchResults : allArticles;
    if (selectedCategory.toLowerCase() === 'all') return source;
    if (query.trim()) {
      return source.filter((a) => a.category?.toLowerCase() === selectedCategory.toLowerCase());
    }
    return source;
  }, [asking, ai.data, query, selectedCategory, searchResults, allArticles]);

  const isEmpty = !query && selectedCategory === 'All';

  const changeMode = (next: 'ask' | 'search') => {
    setMode(next);
    const params = new URLSearchParams(searchParams);
    if (next === 'search') params.set('mode', 'search');
    else params.delete('mode');
    setSearchParams(params, { replace: true });
  };

  const categoryNames = useMemo(
    () => categories.map((c) => c.name),
    [categories],
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="pt-20 sm:pt-24 pb-16">
        <div className="max-w-screen-2xl mx-auto">
          <header className="px-4 sm:px-6 lg:px-10 py-10 sm:py-14 border-b border-border bg-[hsl(var(--surface))]">
            <span className="overline text-primary">Archive · Search</span>
            <h1 className="poster text-4xl sm:text-6xl font-bold tracking-tight leading-[1.02] mt-3">
              The archive
            </h1>
            <p className="font-serif italic text-base sm:text-lg text-muted-foreground mt-3 max-w-2xl leading-relaxed">
              Every story {BRAND.name} has filed, searchable by headline and summary. Ask a
              question and an answer is written from the reporting itself.
            </p>

            <div className="relative mt-7 max-w-3xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Ask a question, or search headlines…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                className="w-full h-14 pl-12 pr-14 font-serif text-base sm:text-lg text-foreground placeholder:text-muted-foreground/60 bg-background border border-border rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                autoFocus
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
                  aria-label="Clear"
                >
                  <X className="h-4 w-4 text-muted-foreground" animateOnHover />
                </button>
              )}

              {focused && query.trim().length >= 2 && suggestionsData && (suggestionsData.titles?.length > 0 || suggestionsData.tags?.length > 0) && (
                <div
                  className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-border"
                  onMouseDown={(event) => event.preventDefault()}
                >
                  {suggestionsData.titles.length > 0 && (
                    <div className="p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2">Matching Stories</span>
                      <div className="mt-1 space-y-1">
                        {suggestionsData.titles.map((t) => (
                          <Link
                            key={t.slug}
                            to={`/article/${t.slug}`}
                            className="block px-2 py-1.5 rounded-md text-sm font-semibold text-foreground hover:bg-primary/10 hover:text-primary transition-colors line-clamp-1"
                          >
                            {t.title}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {suggestionsData.tags.length > 0 && (
                    <div className="p-3 flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Topics:</span>
                      {suggestionsData.tags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setQuery(tag)}
                          className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium hover:bg-primary hover:text-white transition-colors"
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
              <div
                role="group"
                aria-label="Search mode"
                className="inline-flex items-center gap-1 rounded-full border border-border bg-background p-1"
              >
                {([
                  { id: 'ask', label: 'Ask AI' },
                  { id: 'search', label: 'Search archive' },
                ] as const).map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={mode === option.id}
                    onClick={() => changeMode(option.id)}
                    className={cn(
                      'h-11 px-4 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors press',
                      mode === option.id
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {mode === 'ask'
                  ? 'A written answer, sourced from published stories.'
                  : 'Headline and summary matches, newest first.'}
              </p>
            </div>

            <div className="mt-5 flex items-center gap-2 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-1">
              <span className="overline text-muted-foreground shrink-0 pr-1">Section</span>
              {(['All', ...categoryNames] as string[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`shrink-0 h-9 px-4 snap-start rounded-full text-xs font-semibold uppercase tracking-wider transition-colors border ${
                    selectedCategory === cat
                      ? 'bg-primary text-white border-primary'
                      : 'bg-background text-muted-foreground border-border hover:border-primary hover:text-primary'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </header>

          <section className="px-4 sm:px-6 lg:px-10 py-10 sm:py-14 min-h-[400px]">
            {asking && ai.data?.answer && (
              <AiAnswer
                answer={ai.data.answer}
                results={ai.data.results}
                sources={ai.data.sources}
                keywords={ai.data.keywords}
              />
            )}

            {asking && ai.isFetching && !ai.data?.answer && (
              <div
                aria-hidden="true"
                className="mb-8 max-w-4xl rounded-2xl border border-border bg-[hsl(var(--surface))] p-5 sm:p-7"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="overline text-primary">Ask Open Vaartha</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <LoaderCircle className="h-3 w-3" animate /> Reading the archive
                  </span>
                </div>
                <div className="mt-4 space-y-2.5 animate-pulse">
                  <div className="h-4 w-full rounded bg-muted" />
                  <div className="h-4 w-11/12 rounded bg-muted" />
                  <div className="h-4 w-8/12 rounded bg-muted" />
                </div>
              </div>
            )}

            {isEmpty ? (
              <div className="max-w-3xl">
                <p className="overline text-primary mb-3">Try a topic</p>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight">
                  Suggested searches
                </h2>
                <div className="mt-6 flex flex-wrap gap-2">
                  {SUGGESTED.map(s => (
                    <button
                      key={s}
                      onClick={() => setQuery(s)}
                      className="group inline-flex items-center gap-2 h-10 px-4 rounded-full border border-border bg-background text-sm font-medium hover:border-primary hover:text-primary transition-colors"
                    >
                      <Hash className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100" />
                      {s}
                    </button>
                  ))}
                </div>

                <div className="mt-12 pt-8 border-t border-border">
                  <p className="overline text-muted-foreground mb-4">Browse by section</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {categoryNames.map(c => (
                      <button
                        key={c}
                        onClick={() => setSelectedCategory(c)}
                        className="group text-left p-5 rounded-lg border border-border bg-background hover:border-primary hover:bg-[hsl(var(--surface))] transition-colors press"
                      >
                        <div className="font-serif text-lg font-bold tracking-tight group-hover:text-primary transition-colors">
                          {c}
                        </div>
                        <span className="text-[11px] text-muted-foreground font-medium mt-1 inline-flex items-center gap-1">
                          {allArticles.filter(a => a.category === c).length} stories
                          <AnimatedIcon animationType="arrowUpRight"><ArrowUpRight className="h-3 w-3" /></AnimatedIcon>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : asking && ai.isFetching && results.length === 0 ? null : results.length === 0 ? (
              <div className="max-w-2xl py-12 text-center mx-auto">
                <p className="overline text-muted-foreground mb-3">No matches</p>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight">
                  {asking
                    ? `Nothing in the archive answers "${query}".`
                    : `Nothing in the archive for "${query || selectedCategory}".`}
                </h2>
                <p className="font-serif italic text-muted-foreground mt-3">
                  {asking
                    ? 'Try a broader question, or switch to Search archive for keyword matches.'
                    : 'Try different keywords or remove the section filter.'}
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-end justify-between mb-8 pb-5 border-b border-border">
                  <div>
                    <span className="overline text-primary">
                      {asking && ai.data?.answer ? 'The reporting' : 'Results'}
                    </span>
                    <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight mt-1">
                      {asking && ai.data?.answer
                        ? `${results.length} related ${results.length === 1 ? 'story' : 'stories'}`
                        : `${results.length} ${results.length === 1 ? 'story' : 'stories'} for "${query || selectedCategory}"`}
                    </h2>
                  </div>
                </div>

                <ol className="divide-y divide-border">
                  {results.map((art) => (
                    <li
                      key={art.id}
                      id={`story-${art.slug}`}
                      className="group flex gap-4 sm:gap-6 py-5 sm:py-6 hover:bg-[hsl(var(--surface))] transition-colors scroll-mt-24"
                    >
                      <Link to={`/article/${art.slug}`} className="flex-1 min-w-0 press">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="overline text-primary">{art.category}</span>
                          <span className="h-1 w-1 rounded-full bg-border" />
                          <span className="text-[10px] text-muted-foreground font-medium">{relativeTime(art.publishedAt)}</span>
                        </div>
                        <h3 className="font-serif text-lg sm:text-xl font-bold leading-snug tracking-tight group-hover:text-primary transition-colors line-clamp-2">
                          <Highlight text={art.title} q={query} />
                        </h3>
                        <p className="font-serif text-sm sm:text-base text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                          <Highlight text={art.summary} q={query} />
                        </p>
                        <div className="flex items-center gap-3 mt-3 text-[11px] text-muted-foreground font-medium">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {art.readTime}</span>
                          <span>·</span>
                          <span className="truncate">{art.author}</span>
                        </div>
                      </Link>
                      <Link to={`/article/${art.slug}`} className="press hidden sm:block shrink-0">
                        {art.thumbnailUrl && (
                          <div className="w-32 h-24 rounded-md overflow-hidden bg-[hsl(var(--surface-2))]">
                            <img
                              src={art.thumbnailUrl}
                              alt=""
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              onError={handleImageFallback}
                              loading="lazy"
                              decoding="async"
                            />
                          </div>
                        )}
                      </Link>
                    </li>
                  ))}
                </ol>

                {/* Load More Button — only for the plain archive list. In ask
                    mode the cited stories are the whole result set. */}
                {!asking && results.length >= limit && (
                  <div className="flex justify-center mt-12 p-6 border-t border-border">
                    <button
                      onClick={() => setLimit(prev => prev + 15)}
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

                {asking && (
                  <div className="flex justify-center mt-10">
                    <button
                      type="button"
                      onClick={() => changeMode('search')}
                      className="min-h-11 px-3 text-sm font-semibold text-primary underline-offset-4 hover:underline transition-colors"
                    >
                      Search the whole archive instead
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default SearchPage;
