import { useState, useEffect } from 'react';

export default function Settings() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    fetch('/api/v1/auth/me', { headers: { Authorization: 'Bearer ' + token } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setName(d.name || ''); setEmail(d.email || ''); } setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
    if (saved) setTheme(saved);
  }, []);

  const applyTheme = (t: 'light' | 'dark' | 'system') => {
    setTheme(t);
    localStorage.setItem('theme', t);
    const root = document.documentElement;
    if (t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return;
    setError('');
    try {
      const res = await fetch('/api/v1/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ name }),
      });
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
      else setError('Failed to save');
    } catch { setError('Network error'); }
  };

  if (loading) return <p className="text-sm text-muted-foreground py-8">Loading...</p>;

  return (
    <div className="space-y-8">
      <form onSubmit={save} className="space-y-4 max-w-md">
        <h3 className="font-display font-bold text-sm">Profile</h3>
        <div>
          <label className="block text-xs font-medium mb-1.5">Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground text-sm outline-none focus:border-primary transition-colors" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5">Email</label>
          <input type="email" value={email} disabled className="w-full h-10 px-3 rounded-lg border border-border bg-muted text-muted-foreground text-sm cursor-not-allowed" />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <button type="submit" className="h-9 px-5 rounded-full bg-primary text-primary-foreground text-sm font-bold hover:bg-primary-hover transition-colors">
          {saved ? 'Saved!' : 'Save changes'}
        </button>
      </form>

      <div className="max-w-md">
        <h3 className="font-display font-bold text-sm mb-4">Appearance</h3>
        <div className="flex gap-2">
          {(['light', 'dark', 'system'] as const).map(t => (
            <button key={t} onClick={() => applyTheme(t)} className={`h-9 px-4 rounded-full text-xs font-bold capitalize border transition-all ${theme === t ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/50'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-md">
        <h3 className="font-display font-bold text-sm mb-4">Push notifications</h3>
        <button className="h-9 px-4 rounded-full border border-border text-xs font-bold hover:bg-muted transition-colors">
          Enable push notifications
        </button>
        <p className="text-[10px] text-muted-foreground mt-2">Get notified about breaking stories.</p>
      </div>

      <div className="max-w-md">
        <h3 className="font-display font-bold text-sm mb-4 text-destructive">Danger zone</h3>
        <button className="h-9 px-4 rounded-full border border-destructive/30 text-destructive text-xs font-bold hover:bg-destructive/5 transition-colors">
          Delete account
        </button>
      </div>
    </div>
  );
}
