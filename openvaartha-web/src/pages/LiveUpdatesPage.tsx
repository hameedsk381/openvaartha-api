import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { Bell, ArrowUpRight, Radio, RefreshCw } from 'lucide-react';
import { cn, getArticleImage, handleImageFallback } from '@/lib/utils';
import { articles } from '../data/mockArticles';
import { Link } from 'react-router-dom';

interface LiveUpdate {
  id: number;
  time: string;
  text: string;
  type: 'major' | 'standard';
  location?: string;
}

const SEED: LiveUpdate[] = [
  { id: 1, time: '14:22', text: 'Regional Council votes in favor of the new tech corridor incentives; approval expected by evening.', type: 'major', location: 'Bengaluru' },
  { id: 2, time: '14:10', text: 'Traffic congestion reported on Hebbal-Koramangala route due to minor waterlogging.', type: 'standard', location: 'Bengaluru' },
  { id: 3, time: '13:55', text: 'Andhra Finance Minister concludes pre-budget meeting with district advisors.', type: 'standard', location: 'Amaravati' },
  { id: 4, time: '13:30', text: 'TCS confirms initial hiring pipeline of 5,000 engineers for the Vizag campus phase 1.', type: 'major', location: 'Visakhapatnam' },
  { id: 5, time: '13:15', text: 'South Western Railway announces temporary suspension of 3 trains due to track maintenance.', type: 'standard', location: 'Hubli' },
  { id: 6, time: '12:48', text: 'Kerala monsoon early-warning system issues yellow alert for Wayanad and Idukki districts.', type: 'major', location: 'Thiruvananthapuram' },
  { id: 7, time: '12:30', text: 'Hyderabad Metro Phase 4 DPR submitted; cabinet review scheduled next week.', type: 'standard', location: 'Hyderabad' },
];

const LiveUpdatesPage = () => {
  const [updates] = useState<LiveUpdate[]>(SEED);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const lastUpdated = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const today = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const related = articles.slice(0, 3);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="pt-20 sm:pt-24 pb-16">
        <div className="max-w-screen-2xl mx-auto">

          {/* Masthead */}
          <header className="px-4 sm:px-6 lg:px-10 py-10 sm:py-14 border-b border-border bg-[hsl(var(--surface))] relative overflow-hidden">
            <div className="flex items-center gap-2 mb-3">
              <span className="relative inline-flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60 animate-ping" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
              <span className="overline text-red-600">Live · {today}</span>
            </div>
            <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.02]">
              Live updates
            </h1>
            <p className="font-serif italic text-base sm:text-lg text-muted-foreground mt-4 max-w-2xl leading-relaxed">
              Real-time dispatches from our regional desks across South India — verified, timestamped, no rumours.
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

            {/* Timeline */}
            <section className="lg:col-span-8 lg:border-r lg:border-border px-4 sm:px-6 lg:px-10 py-8 sm:py-12">
              <div className="flex items-baseline justify-between mb-8 pb-5 border-b border-border">
                <div>
                  <span className="overline text-primary">Timeline</span>
                  <h2 className="font-serif text-xl sm:text-2xl font-bold tracking-tight mt-1">
                    As it happens
                  </h2>
                </div>
                <span className="font-serif italic text-xs text-muted-foreground">
                  {updates.length} updates
                </span>
              </div>

              <ol className="relative border-l-2 border-border pl-6 sm:pl-8 space-y-8">
                {updates.map((u) => (
                  <li key={u.id} className="relative">
                    <span
                      className={cn(
                        'absolute -left-[33px] sm:-left-[41px] top-1.5 h-4 w-4 rounded-full border-2',
                        u.type === 'major'
                          ? 'bg-primary border-primary'
                          : 'bg-background border-border'
                      )}
                    />
                    <div className="flex flex-wrap items-center gap-2.5 mb-2">
                      <span className="font-serif italic text-xs text-primary tabular-nums font-semibold">
                        {u.time} IST
                      </span>
                      {u.location && (
                        <>
                          <span className="h-1 w-1 rounded-full bg-border" />
                          <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                            {u.location}
                          </span>
                        </>
                      )}
                      {u.type === 'major' && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-[hsl(var(--primary-subtle))] px-2 py-0.5 rounded">
                          Major
                        </span>
                      )}
                    </div>
                    <p
                      className={cn(
                        'font-serif leading-snug',
                        u.type === 'major'
                          ? 'text-lg sm:text-xl font-bold text-foreground'
                          : 'text-base sm:text-lg text-foreground/85'
                      )}
                    >
                      {u.text}
                    </p>
                  </li>
                ))}
              </ol>

              <div className="mt-10 pt-8 border-t border-border text-center">
                <p className="overline text-muted-foreground">End of feed</p>
                <p className="font-serif italic text-sm text-muted-foreground mt-2">
                  Refreshing automatically every minute.
                </p>
              </div>
            </section>

            {/* Sidebar — related coverage */}
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
                      <div className="w-20 h-16 shrink-0 overflow-hidden rounded-md bg-[hsl(var(--surface-2))]">
                        <img
                          src={getArticleImage(a.thumbnail)}
                          alt=""
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={handleImageFallback}
                          loading="lazy"
                        />
                      </div>
                    </Link>
                  ))}
                </div>

                <div className="mx-4 sm:mx-6 lg:mx-6 my-6 p-5 rounded-lg border border-border bg-[hsl(var(--surface))]">
                  <p className="overline text-primary mb-2 flex items-center gap-1.5">
                    <Radio className="h-3 w-3" /> Editorial standards
                  </p>
                  <p className="font-serif text-sm text-muted-foreground leading-relaxed">
                    Every dispatch on this page is filed by a verified Open Vaartha reporter and timestamped at source.
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
