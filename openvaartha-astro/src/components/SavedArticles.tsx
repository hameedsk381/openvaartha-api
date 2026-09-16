import { useState, useEffect } from 'react';

interface Article {
  _id: string;
  title: string;
  slug: string;
  category?: string;
  thumbnail_url?: string;
  summary?: string;
  published_at?: string;
}

export default function SavedArticles() {
  const [saved, setSaved] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ids: string[] = JSON.parse(localStorage.getItem('saved_articles') || '[]');
    if (ids.length === 0) { setLoading(false); return; }
    Promise.all(ids.map(id =>
      fetch('/api/v1/articles/' + id).then(r => r.ok ? r.json() : null).catch(() => null)
    )).then(results => {
      setSaved(results.filter(Boolean));
      setLoading(false);
    });
  }, []);

  const unsave = (id: string) => {
    const next = saved.filter(a => a._id !== id);
    setSaved(next);
    localStorage.setItem('saved_articles', JSON.stringify(next.map(a => a._id)));
  };

  if (loading) return <p className="text-sm text-muted-foreground py-8">Loading saved articles...</p>;
  if (saved.length === 0) return <p className="text-sm text-muted-foreground italic py-8">No saved articles yet. Tap the bookmark icon on any story to save it.</p>;

  return (
    <div className="space-y-4">
      {saved.map(a => (
        <div key={a._id} className="flex gap-4 items-start p-4 rounded-xl border border-border hover:bg-muted/30 transition-colors">
          {a.thumbnail_url && <img src={a.thumbnail_url} alt="" className="w-20 h-14 rounded-lg object-cover shrink-0" />}
          <div className="flex-1 min-w-0">
            <a href={'/article/' + a.slug} className="font-serif text-sm font-bold leading-snug hover:text-primary transition-colors line-clamp-2 block">{a.title}</a>
            {a.category && <span className="tag text-[8px] mt-1 inline-block">{a.category}</span>}
          </div>
          <button onClick={() => unsave(a._id)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0 p-1" aria-label="Remove">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      ))}
    </div>
  );
}
