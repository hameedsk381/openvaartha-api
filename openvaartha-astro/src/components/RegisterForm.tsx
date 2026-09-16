import { useState } from 'react';

export default function RegisterForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      if (res.ok) {
        window.location.href = '/login?registered=1';
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || 'Registration failed');
      }
    } catch { setError('Network error. Try again.'); }
    setLoading(false);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium mb-1.5">Name</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground text-sm outline-none focus:border-primary transition-colors" />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1.5">Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground text-sm outline-none focus:border-primary transition-colors" placeholder="you@example.com" />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1.5">Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground text-sm outline-none focus:border-primary transition-colors" />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1.5">Confirm password</label>
        <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground text-sm outline-none focus:border-primary transition-colors" />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <button type="submit" disabled={loading} className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary-hover transition-colors disabled:opacity-50">
        {loading ? 'Creating account...' : 'Create account'}
      </button>
    </form>
  );
}
