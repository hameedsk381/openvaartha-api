import { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import { ArrowUpRight } from 'lucide-react';
import { AnimatedIcon } from '@/components/ui/animated-icon';
import { Link } from 'react-router-dom';
import { useDispatches } from '@/lib/api-hooks';
import { BytesPageSkeleton } from '@/components/PageSkeletons';

const relativeTime = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

/**
 * Bytes: a dense, SMS-inbox-style scrolling feed of short dispatches —
 * headline-length updates, not full articles. Deliberately plain (no hero
 * images, no multi-column layout) so it reads fast on a phone, one message
 * at a time.
 */
const BytesPage = () => {
  const { data: bytes = [], isLoading } = useDispatches(100);
  const [now, setNow] = useState(new Date());
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(bytes.map((b) => b.category).filter((c): c is string => !!c))),
    [bytes]
  );

  const filteredBytes = useMemo(
    () => (activeCategory === 'All' ? bytes : bytes.filter((b) => b.category === activeCategory)),
    [bytes, activeCategory]
  );

  if (isLoading && bytes.length === 0) {
    return <BytesPageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="pt-20 sm:pt-24 pb-16">
        <div className="max-w-2xl mx-auto">
          <header className="sticky top-14 z-10 px-4 py-4 border-b border-border bg-background/95 backdrop-blur-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative inline-flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60 animate-ping" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
              <h1 className="font-display text-xl font-bold tracking-tight">Bytes</h1>
            </div>
            <span className="text-[11px] text-muted-foreground font-medium">
              {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST
            </span>
          </header>

          <p className="px-4 pt-4 pb-2 font-serif italic text-sm text-muted-foreground">
            Quick hits from the desk — scroll for the latest, tap for the full story.
          </p>

          {categories.length > 0 && (
            <div className="px-4 pb-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
              {(['All', ...categories]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`shrink-0 h-8 px-3.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-colors border press ${
                    activeCategory === cat
                      ? 'bg-primary text-white border-primary'
                      : 'bg-background text-muted-foreground border-border hover:border-primary hover:text-primary'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {filteredBytes.length === 0 ? (
            <p className="font-serif italic text-muted-foreground text-center py-16 px-4">
              {bytes.length === 0 ? 'No bytes yet. Check back soon.' : 'No bytes in this section yet.'}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {filteredBytes.map((byte) => {
                const row = (
                  <div className="px-4 py-4">
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground font-medium tabular-nums">
                          {relativeTime(byte.createdAt)}
                        </span>
                        {byte.category && <span className="tag">{byte.category}</span>}
                      </div>
                      {byte.articleSlug && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-primary shrink-0">
                          Full story <AnimatedIcon animationType="arrowUpRight"><ArrowUpRight className="h-3 w-3" /></AnimatedIcon>
                        </span>
                      )}
                    </div>
                    <p className="font-serif text-[15px] sm:text-base font-bold text-foreground leading-snug">
                      {byte.text}
                    </p>
                  </div>
                );

                return byte.articleSlug ? (
                  <li key={byte.id}>
                    <Link to={`/article/${byte.articleSlug}`} className="block press hover:bg-[hsl(var(--surface))] transition-colors">
                      {row}
                    </Link>
                  </li>
                ) : (
                  <li key={byte.id}>{row}</li>
                );
              })}
            </ul>
          )}

          <p className="px-4 py-8 text-center font-serif italic text-xs text-muted-foreground">
            Every byte is filed by a verified Open Vaartha reporter and timestamped at source.
          </p>
        </div>
      </main>
    </div>
  );
};

export default BytesPage;
