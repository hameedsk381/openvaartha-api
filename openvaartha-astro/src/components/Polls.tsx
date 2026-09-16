import { useState, useEffect } from 'react';

interface PollOption {
  id: string;
  label: string;
  count: number;
}

interface Poll {
  _id: string;
  question: string;
  options: PollOption[];
  total_votes: number;
}

interface PollsProps {
  articleSlug: string;
}

export default function Polls({ articleSlug }: PollsProps) {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [voted, setVoted] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(`poll_${articleSlug}`);
    if (saved) setVoted(saved);
    fetch(`/api/v1/articles/${articleSlug}/polls/`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setPoll(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [articleSlug]);

  const vote = async (optionId: string) => {
    if (voted) return;
    try {
      const res = await fetch(`/api/v1/articles/${articleSlug}/polls/${poll?._id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ option_id: optionId }),
      });
      if (res.ok) {
        setVoted(optionId);
        localStorage.setItem(`poll_${articleSlug}`, optionId);
        setPoll(prev => {
          if (!prev) return prev;
          const options = prev.options.map(o => o.id === optionId ? { ...o, count: o.count + 1 } : o);
          return { ...prev, options, total_votes: prev.total_votes + 1 };
        });
      }
    } catch {}
  };

  if (loading || !poll) return null;

  return (
    <div className="bg-muted/30 rounded-xl p-5 border border-border">
      <h4 className="font-display font-bold text-sm mb-4">{poll.question}</h4>
      <div className="space-y-2">
        {poll.options.map(opt => {
          const pct = poll.total_votes > 0 ? Math.round((opt.count / poll.total_votes) * 100) : 0;
          const isSelected = voted === opt.id;
          return (
            <button key={opt.id} onClick={() => vote(opt.id)} disabled={!!voted} className={`w-full text-left relative rounded-lg px-4 py-2.5 text-sm border transition-all ${voted ? 'cursor-default' : 'hover:border-primary/50'} ${isSelected ? 'border-primary bg-primary/5' : 'border-border bg-background'}`}>
              {voted && (
                <div className="absolute inset-0 rounded-lg bg-primary/5 overflow-hidden">
                  <div className="h-full bg-primary/10 rounded-lg transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
              )}
              <div className="relative flex items-center justify-between">
                <span className="font-medium">{opt.label}</span>
                {voted && <span className="text-xs font-bold text-primary">{pct}%</span>}
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground mt-3">{poll.total_votes} vote{poll.total_votes !== 1 ? 's' : ''}</p>
    </div>
  );
}
