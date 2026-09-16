import { useState, useEffect } from 'react';

interface Comment {
  _id: string;
  body: string;
  author_name: string;
  created_at: string;
  upvotes: number;
}

interface CommentsProps {
  articleSlug: string;
}

export default function Comments({ articleSlug }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetch(`/api/v1/articles/${articleSlug}/comments/?limit=${limit}&skip=${(page - 1) * limit}`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { setComments(Array.isArray(d) ? d : d.comments || []); setTotal(d.total || 0); setLoading(false); })
      .catch(() => setLoading(false));
  }, [articleSlug, page]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() || !name.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/articles/${articleSlug}/comments/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: body.trim(), author_name: name.trim() }),
      });
      if (res.ok) {
        const c = await res.json();
        setComments(prev => [c, ...prev]);
        setBody('');
        setTotal(prev => prev + 1);
      }
    } catch {}
    setSubmitting(false);
  };

  const upvote = async (commentId: string) => {
    try {
      const res = await fetch(`/api/v1/articles/${articleSlug}/comments/${commentId}/upvote`, { method: 'POST' });
      if (res.ok) setComments(prev => prev.map(c => c._id === commentId ? { ...c, upvotes: (c.upvotes || 0) + 1 } : c));
    } catch {}
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <h3 className="font-display text-lg font-bold">Discussion</h3>
        {total > 0 && <span className="tag text-[9px]">{total} comment{total !== 1 ? 's' : ''}</span>}
      </div>

      <form onSubmit={submit} className="mb-8 space-y-3">
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground text-sm outline-none focus:border-primary transition-colors" />
        <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Add to the discussion..." required rows={3} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm outline-none focus:border-primary transition-colors resize-none" />
        <button type="submit" disabled={submitting || !body.trim() || !name.trim()} className="h-9 px-5 rounded-full bg-primary text-primary-foreground text-sm font-bold hover:bg-primary-hover transition-colors disabled:opacity-50">
          {submitting ? 'Posting...' : 'Post comment'}
        </button>
      </form>

      {loading && <p className="text-sm text-muted-foreground py-4">Loading comments...</p>}
      {!loading && comments.length === 0 && <p className="text-sm text-muted-foreground italic py-4">No comments yet. Start the discussion.</p>}

      <div className="space-y-4">
        {comments.map(c => (
          <div key={c._id} className="p-4 rounded-xl border border-border bg-muted/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{c.author_name?.[0]?.toUpperCase() || '?'}</div>
              <span className="text-sm font-medium">{c.author_name}</span>
              <time className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString('en-IN')}</time>
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed">{c.body}</p>
            <button onClick={() => upvote(c._id)} className="mt-2 text-[11px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
              {c.upvotes || 0}
            </button>
          </div>
        ))}
      </div>

      {total > limit && (
        <div className="flex justify-center gap-3 mt-6">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-8 px-4 rounded-full border border-border text-xs font-medium hover:bg-muted disabled:opacity-40">Prev</button>
          <button onClick={() => setPage(p => p + 1)} disabled={comments.length < limit} className="h-8 px-4 rounded-full border border-border text-xs font-medium hover:bg-muted disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
