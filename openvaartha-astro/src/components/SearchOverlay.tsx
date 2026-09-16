import { useState, useEffect, useRef } from 'react';

interface SearchResult {
  title: string;
  slug: string;
  category?: string;
  summary?: string;
  thumbnail_url?: string;
}

export default function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/search/?q=${encodeURIComponent(query)}&limit=8`, { signal: ctrl.signal });
        if (res.ok) setResults(await res.json());
      } catch {}
      setLoading(false);
    }, 300);
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [query]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); open ? onClose() : document.dispatchEvent(new Event('open-search')); }
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[10vh]" onClick={onClose}>
      <div className="w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
        <div className="bg-surface rounded-2xl shadow-2xl border border-border overflow-hidden">
          <div className="flex items-center gap-3 px-4 h-14 border-b border-border">
            <svg className="w-4 h-4 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search stories, categories, topics..."
              className="flex-1 bg-transparent text-foreground outline-none text-sm placeholder:text-muted-foreground"
            />
            <kbd className="hidden sm:inline-flex items-center h-5 px-1.5 rounded border border-border bg-background text-[10px] text-muted-foreground font-mono">ESC</kbd>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && (
              <div className="py-8 text-center text-sm text-muted-foreground">Searching...</div>
            )}
            {!loading && query.trim() && results.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">No stories found for "{query}"</div>
            )}
            {!loading && results.length > 0 && (
              <ul>
                {results.map(r => (
                  <li key={r.slug}>
                    <a href={`/article/${r.slug}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors" onClick={onClose}>
                      {r.thumbnail_url && <img src={r.thumbnail_url} alt="" className="w-12 h-9 rounded object-cover shrink-0" />}
                      <div className="flex-1 min-w-0">
                        {r.category && <span className="tag text-[8px] mb-0.5">{r.category}</span>}
                        <p className="text-sm font-medium leading-snug truncate">{r.title}</p>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {!query.trim() && (
              <div className="py-8 text-center text-xs text-muted-foreground">
                <p>Type to search. Use <kbd className="px-1 py-0.5 rounded border border-border bg-background font-mono">Ctrl+K</kbd> to toggle.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
