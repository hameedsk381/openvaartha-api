import { useState } from 'react';

export default function NewsletterCapture() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/v1/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      setStatus(res.ok ? 'success' : 'error');
      if (res.ok) setEmail('');
    } catch { setStatus('error'); }
  };

  if (status === 'success') {
    return (
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 sm:p-8 text-center">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h3 className="font-display font-bold">You're subscribed!</h3>
        <p className="text-sm text-muted-foreground mt-1">Check your inbox for a welcome email.</p>
      </div>
    );
  }

  return (
    <div className="bg-muted/30 border border-border rounded-2xl p-6 sm:p-8">
      <div className="max-w-md mx-auto text-center">
        <h3 className="font-display text-lg font-bold">Stay in the loop</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-5">Get the day's top stories delivered to your inbox every morning.</p>
        <form onSubmit={subscribe} className="flex gap-2">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required className="flex-1 h-10 px-3 rounded-lg border border-border bg-background text-foreground text-sm outline-none focus:border-primary transition-colors" />
          <button type="submit" disabled={status === 'loading'} className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary-hover transition-colors disabled:opacity-50 shrink-0">
            {status === 'loading' ? '...' : 'Subscribe'}
          </button>
        </form>
        {status === 'error' && <p className="text-xs text-destructive mt-2">Something went wrong. Try again.</p>}
        <p className="text-[10px] text-muted-foreground mt-3">No spam. Unsubscribe anytime.</p>
      </div>
    </div>
  );
}
