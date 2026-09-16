import { useState, useEffect } from 'react';

interface HistoryEntry {
  slug: string;
  title: string;
  readAt: number;
}

export default function ReadingHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw: Record<string, number> = JSON.parse(localStorage.getItem('reading_history') || '{}');
    const entries: HistoryEntry[] = Object.entries(raw)
      .map(([slug, readAt]) => ({ slug, title: slug.replace(/-/g, ' '), readAt }))
      .sort((a, b) => b.readAt - a.readAt)
      .slice(0, 50);
    setHistory(entries);
    setLoading(false);
  }, []);

  const clear = () => {
    localStorage.removeItem('reading_history');
    setHistory([]);
  };

  if (loading) return <p className="text-sm text-muted-foreground py-8">Loading...</p>;
  if (history.length === 0) return <p className="text-sm text-muted-foreground italic py-8">No reading history yet.</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-xs text-muted-foreground">{history.length} article{history.length !== 1 ? 's' : ''}</p>
        <button onClick={clear} className="text-xs text-muted-foreground hover:text-destructive transition-colors">Clear history</button>
      </div>
      <div className="space-y-0">
        {history.map((e, i) => (
          <a key={e.slug + i} href={'/article/' + e.slug} className="flex items-center gap-3 py-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors px-2 rounded">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-[10px] text-muted-foreground font-medium">
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate capitalize">{e.title}</p>
              <time className="text-[10px] text-muted-foreground">{new Date(e.readAt).toLocaleDateString('en-IN')}</time>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
