import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { Bell, ArrowUpRight, Radio, RefreshCw, Loader2 } from 'lucide-react';
import { cn, handleImageFallback } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { useArticles, useLiveUpdates } from '@/lib/api-hooks';
import { BRAND } from '@/lib/brand';
import { LiveUpdatesPageSkeleton } from '@/components/PageSkeletons';

type LiveUpdate = {
  id: string;
  time: string;
  text: string;
  type: string;
  title: string;
  slug: string;
};

const LiveUpdatesPage = () => {
  const [now, setNow] = useState(new Date());
  const { data: articles = [] } = useArticles({ limit: 3 });
  const { data: liveUpdates = [], isLoading } = useLiveUpdates(100);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const lastUpdated = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const today = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const related = articles.slice(0, 3);

  if (isLoading && liveUpdates.length === 0) {
    return <LiveUpdatesPageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="pt-20 sm:pt-24 pb-16">
        <div className="max-w-screen-2xl mx-auto">
          <header className="px-4 sm:px-6 lg:px-10 py-10 sm:py-14 border-b border-border bg-[hsl(var(--surface))] relative overflow-hidden">
            <div className="flex items-center gap-2 mb-3">
              <span className="relative inline-flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60 animate-ping" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
              <span className="overline text-red-600">Live · {today}</span>
            </div>
            <h1 className="poster text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.02]">
              Live updates
            </h1>
            <p className="font-serif italic text-base sm:text-lg text-muted-foreground mt-4 max-w-2xl leading-relaxed">
              Real-time dispatches from our desk — verified, timestamped, no rumours.
            </p>

            <div className="flex flex-wrap items-center gap-3 mt-6">
              <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <RefreshCw className="h-3 w-3" /> Last refreshed {lastUpdated} IST
              </span>
              <span className="hidden sm:inline-block h-4 w-px bg-border" />
              <button className="inline-flex items-center gap-2 h-10 px-4 rounded-md border border-border text-xs font-semibold uppercase tracking-wider hover:bg-primary hover:text-white hover:border-primary transition-colors press">
                <Bell className="h-3.5 w-3.5" /> Get alerts
              </button>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12">
            <section className="lg:col-span-8 lg:border-r lg:border-border px-4 sm:px-6 lg:px-10 py-8 sm:py-12">
              <div className="flex items-baseline justify-between mb-8 pb-5 border-b border-border">
                <div>
                  <span className="overline text-primary">Timeline</span>
                  <h2 className="font-serif text-xl sm:text-2xl font-bold tracking-tight mt-1">
                    As it happens
                  </h2>
                </div>
              </div>

              {liveUpdates.length === 0 ? (
                <p className="font-serif italic text-muted-foreground text-center py-16">
                  Live updates from our desk. Check back soon.
                </p>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                  <div className="space-y-0">
                    {liveUpdates.map((update: LiveUpdate) => (
                      <div key={update.id} className="relative pl-12 pb-6 last:pb-0">
                        <div className="absolute left-2.5 top-1.5 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                        <div className="text-xs text-muted-foreground font-medium mb-1">
                          {new Date(update.time).toLocaleTimeString('en-IN', {
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </div>
                        {update.slug ? (
                          <Link
                            to={`/article/${update.slug}`}
                            className="group block press"
                          >
                            <h4 className="font-serif text-sm font-bold leading-snug tracking-tight group-hover:text-primary transition-colors">
                              {update.title}
                            </h4>
                            <p className="font-serif text-sm text-muted-foreground mt-1 leading-relaxed">
                              {update.text}
                            </p>
                          </Link>
                        ) : (
                          <p className="font-serif text-sm text-foreground leading-relaxed">
                            {update.text}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <aside className="lg:col-span-4">
              <div className="lg:sticky lg:top-28">
                <div className="px-4 sm:px-6 lg:px-6 py-5 border-b border-border">
                  <p className="overline text-primary">Related coverage</p>
                  <h3 className="font-serif text-xl font-bold tracking-tight mt-1">In context</h3>
                </div>
                <div>
                  {related.map((a, i) => (
                    <Link
                      key={a.id}
                      to={`/article/${a.slug}`}
                      className={`group press flex gap-4 px-4 sm:px-6 lg:px-6 py-4 hover:bg-[hsl(var(--surface))] transition-colors ${
                        i !== related.length - 1 ? 'border-b border-border' : ''
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <span className="overline text-primary">{a.category}</span>
                        <h4 className="font-serif text-sm font-bold leading-snug tracking-tight mt-1 group-hover:text-primary transition-colors line-clamp-3">
                          {a.title}
                        </h4>
                      </div>
                      {a.thumbnailUrl && (
                        <div className="w-20 h-16 shrink-0 overflow-hidden rounded-md bg-[hsl(var(--surface-2))]">
                          <img
                            src={a.thumbnailUrl}
                            alt=""
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            onError={handleImageFallback}
                            loading="lazy"
                          />
                        </div>
                      )}
                    </Link>
                  ))}
                </div>

                <div className="mx-4 sm:mx-6 lg:mx-6 my-6 p-5 rounded-lg border border-border bg-[hsl(var(--surface))]">
                  <p className="overline text-primary mb-2 flex items-center gap-1.5">
                    <Radio className="h-3 w-3" /> Editorial standards
                  </p>
                  <p className="font-serif text-sm text-muted-foreground leading-relaxed">
                    Every dispatch on this page is filed by a verified {BRAND.name} reporter and timestamped at source.
                  </p>
                  <Link
                    to="/"
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-primary hover:underline underline-offset-4"
                  >
                    Read our standards <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LiveUpdatesPage;
