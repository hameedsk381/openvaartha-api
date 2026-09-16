import { useState } from 'react';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch {}
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="text-center py-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <p className="text-sm text-foreground font-medium">Check your email</p>
        <p className="text-xs text-muted-foreground mt-1">We sent a password reset link to {email}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium mb-1.5">Email address</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground text-sm outline-none focus:border-primary transition-colors" placeholder="you@example.com" />
      </div>
      <button type="submit" disabled={loading} className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary-hover transition-colors disabled:opacity-50">
        {loading ? 'Sending...' : 'Send reset link'}
      </button>
    </form>
  );
}
