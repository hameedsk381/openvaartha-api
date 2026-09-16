import { useState, useEffect } from 'react';

const EMOJIS = ['👏', '🔥', '❤️', '😮', '😢', '🤔', '💯', '🙏'];

interface ReactionsProps {
  articleSlug: string;
}

export default function Reactions({ articleSlug }: ReactionsProps) {
  const [reactions, setReactions] = useState<Record<string, number>>({});
  const [userReactions, setUserReactions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(`reactions_${articleSlug}`);
    if (saved) setUserReactions(new Set(JSON.parse(saved)));
    fetch(`/api/v1/articles/${articleSlug}/reactions/`)
      .then(r => r.ok ? r.json() : {})
      .then(d => { setReactions(d.reactions || {}); setLoading(false); })
      .catch(() => setLoading(false));
  }, [articleSlug]);

  const toggleReaction = async (emoji: string) => {
    const next = new Set(userReactions);
    const method = next.has(emoji) ? 'DELETE' : 'POST';
    if (next.has(emoji)) next.delete(emoji); else next.add(emoji);
    setUserReactions(next);
    localStorage.setItem(`reactions_${articleSlug}`, JSON.stringify([...next]));
    setReactions(prev => ({ ...prev, [emoji]: (prev[emoji] || 0) + (method === 'POST' ? 1 : -1) }));
    try { await fetch(`/api/v1/articles/${articleSlug}/reactions/`, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emoji }) }); } catch {}
  };

  return (
    <div className="flex flex-wrap gap-2">
      {EMOJIS.map(emoji => {
        const count = reactions[emoji] || 0;
        const active = userReactions.has(emoji);
        return (
          <button key={emoji} onClick={() => toggleReaction(emoji)} disabled={loading} className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-sm border transition-all ${active ? 'bg-primary/10 border-primary text-primary' : 'bg-muted/50 border-border text-foreground hover:border-primary/50'}`}>
            <span>{emoji}</span>
            {count > 0 && <span className="text-xs font-medium">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
