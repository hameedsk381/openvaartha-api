import { useState } from 'react';

export default function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    setError('');
    const token = new URLSearchParams(window.location.search).get('token');
    try {
      const res = await fetch('/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      if (res.ok) setSuccess(true);
      else { const data = await res.json().catch(() => ({})); setError(data.detail || 'Reset failed'); }
    } catch { setError('Network error.'); }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="text-center py-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <p className="text-sm text-foreground font-medium">Password reset!</p>
        <p className="text-xs text-muted-foreground mt-1"><a href="/login" className="text-primary hover:underline">Sign in with your new password</a></p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium mb-1.5">New password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground text-sm outline-none focus:border-primary transition-colors" />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1.5">Confirm password</label>
        <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground text-sm outline-none focus:border-primary transition-colors" />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <button type="submit" disabled={loading} className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary-hover transition-colors disabled:opacity-50">
        {loading ? 'Resetting...' : 'Reset password'}
      </button>
    </form>
  );
}
