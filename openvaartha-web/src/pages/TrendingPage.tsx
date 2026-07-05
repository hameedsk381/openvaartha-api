import { useMemo } from 'react';
import Navbar from '../components/Navbar';
import { Flame, Clock, ArrowUpRight, BarChart3, Bookmark, BookmarkCheck } from 'lucide-react';
import { cn, handleImageFallback } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { useReadingList } from '@/hooks/use-reading-list';
import { useTrendingArticles, useEditorPicks } from '@/lib/api-hooks';

const relativeTime = (iso: string) => {
  const h = Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
};

const TrendingPage = () => {
  const { toggleSave, isSaved } = useReadingList();
  const { data: trendingData = [] } = useTrendingArticles(20);
  const { data: editorPicks = [] } = useEditorPicks(5);

  const lead = trendingData[0];
  const ranks = trendingData.slice(1);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="pt-20 sm:pt-24 pb-16">
        <div className="max-w-screen-2xl mx-auto">
          <header className="px-4 sm:px-6 lg:px-10 py-10 sm:py-14 border-b border-border bg-[hsl(var(--surface))]">
            <div className="flex items-center gap-2 mb-3">
              <Flame className="h-4 w-4 text-primary fill-current" />
              <span className="overline text-primary">Most read · Real time</span>
            </div>
            <h1 className="poster text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.02]">
              Trending now
            </h1>
            <p className="font-serif italic text-base sm:text-lg text-muted-foreground mt-4 max-w-2xl leading-relaxed">
              The stories Andhra Pradesh & Telangana are reading, ranked by attention — refreshed every fifteen minutes.
            </p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12">
            <section className="lg:col-span-8 lg:border-r lg:border-border">
              {lead && (
                <Link
                  to={`/article/${lead.slug}`}
                  className="group press block border-b border-border"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2">
                    {lead.thumbnailUrl && (
                      <div className="aspect-[4/3] sm:aspect-auto overflow-hidden bg-[hsl(var(--surface-2))]">
                        <img
                          src={lead.thumbnailUrl}
                          alt=""
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                          onError={handleImageFallback}
                        />
                      </div>
                    )}
                    <div className="p-6 sm:p-8 lg:p-10 flex flex-col justify-center relative">
                      <span className="absolute top-4 right-4 sm:top-6 sm:right-6 font-serif text-7xl sm:text-8xl font-bold text-primary/15 leading-none">
                        01
                      </span>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="overline text-primary">{lead.category}</span>
                        <span className="h-1 w-1 rounded-full bg-border" />
                        <span className="text-[11px] text-muted-foreground font-medium">{relativeTime(lead.publishedAt)}</span>
                      </div>
                      <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight tracking-tight group-hover:text-primary transition-colors">
                        {lead.title}
                      </h2>
                      <p className="text-sm sm:text-base text-muted-foreground mt-3 line-clamp-3 leading-relaxed">
                        {lead.summary}
                      </p>
                      <div className="flex items-center gap-3 mt-5 text-[11px] text-muted-foreground font-medium">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {lead.readTime}</span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1 text-primary font-semibold">
                          <Flame className="h-3 w-3 fill-current" /> Most read
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              )}

              <ol>
                {ranks.map((art, i) => (
                  <li
                    key={art.id}
                    className="group flex gap-4 sm:gap-6 px-4 sm:px-6 lg:px-10 py-6 border-b border-border last:border-0 hover:bg-[hsl(var(--surface))] transition-colors"
                  >
                    <span className="font-serif text-4xl sm:text-5xl font-bold text-primary/30 group-hover:text-primary transition-colors leading-none w-12 sm:w-16 shrink-0 tabular-nums pt-1">
                      {String(i + 2).padStart(2, '0')}
                    </span>
                    <Link to={`/article/${art.slug}`} className="flex-1 min-w-0 press">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="overline text-primary">{art.category}</span>
                        <span className="h-1 w-1 rounded-full bg-border" />
                        <span className="text-[10px] text-muted-foreground font-medium">{relativeTime(art.publishedAt)}</span>
                        {art.isTrending && (
                          <>
                            <span className="h-1 w-1 rounded-full bg-border" />
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary">
                              <Flame className="h-3 w-3 fill-current" /> Trending
                            </span>
                          </>
                        )}
                      </div>
                      <h3 className="font-serif text-base sm:text-lg font-bold leading-snug tracking-tight group-hover:text-primary transition-colors line-clamp-2">
                        {art.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                        {art.summary}
                      </p>
                      <span className="flex items-center gap-1 mt-2 text-[11px] text-muted-foreground font-medium">
                        <Clock className="h-3 w-3" /> {art.readTime}
                      </span>
                    </Link>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Link to={`/article/${art.slug}`} className="press block">
                        {art.thumbnailUrl && (
                          <div className="w-24 h-20 sm:w-28 sm:h-24 rounded-md overflow-hidden bg-[hsl(var(--surface-2))]">
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
                      <button
                        onClick={() => toggleSave(art as any)}
                        className={`h-9 w-9 rounded-md flex items-center justify-center transition-colors press
                          ${isSaved(art.id) ? 'text-primary bg-[hsl(var(--primary-subtle))]' : 'text-muted-foreground hover:text-primary hover:bg-[hsl(var(--primary-subtle))]'}`}
                        aria-label="Save"
                      >
                        {isSaved(art.id) ? <BookmarkCheck className="h-4 w-4 fill-current" /> : <Bookmark className="h-4 w-4" />}
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <aside className="lg:col-span-4">
              <div className="lg:sticky lg:top-28">
                <div className="px-4 sm:px-6 lg:px-6 py-5 border-b border-border">
                  <p className="overline text-primary">Editor's picks</p>
                  <h3 className="font-serif text-xl font-bold tracking-tight mt-1">Hand-picked</h3>
                </div>
                <ol className="px-4 sm:px-6 lg:px-6 py-2">
                  {editorPicks.slice(0, 5).map((a, i) => (
                    <li key={a.id} className="border-b border-border last:border-0 py-4">
                      <Link to={`/article/${a.slug}`} className="group flex gap-3 press">
                        <span className="font-serif text-2xl font-bold text-primary/30 group-hover:text-primary transition-colors leading-none w-7 shrink-0 pt-0.5">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="overline text-primary">{a.category}</span>
                          <h4 className="font-serif text-sm font-bold leading-snug tracking-tight mt-1 group-hover:text-primary transition-colors line-clamp-3">
                            {a.title}
                          </h4>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ol>

                <div className="mx-4 sm:mx-6 lg:mx-6 my-6 p-5 rounded-lg border border-border bg-[hsl(var(--surface))]">
                  <p className="overline text-primary mb-2 flex items-center gap-1.5">
                    <BarChart3 className="h-3 w-3" /> How this works
                  </p>
                  <p className="font-serif text-sm text-muted-foreground leading-relaxed">
                    Stories are ranked by reading time, completion rate and WhatsApp shares — never by paid placement.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TrendingPage;
