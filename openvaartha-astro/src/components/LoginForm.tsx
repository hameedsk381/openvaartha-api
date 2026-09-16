import { useState } from 'react';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('token', data.access_token || data.token);
        window.location.href = '/portal';
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || 'Invalid email or password');
      }
    } catch { setError('Network error. Try again.'); }
    setLoading(false);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium mb-1.5">Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground text-sm outline-none focus:border-primary transition-colors" placeholder="you@example.com" />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1.5">Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground text-sm outline-none focus:border-primary transition-colors" placeholder="Your password" />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <button type="submit" disabled={loading} className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary-hover transition-colors disabled:opacity-50">
        {loading ? 'Signing in...' : 'Sign in'}
      </button>
      <p className="text-center text-xs text-muted-foreground">
        <a href="/forgot-password" className="text-primary hover:underline">Forgot password?</a>
      </p>
    </form>
  );
}
