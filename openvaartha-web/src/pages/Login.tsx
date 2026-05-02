import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Mail, Lock, User as UserIcon, Loader2, Eye, EyeOff } from 'lucide-react';
import { articles } from '@/data/mockArticles';
import { getArticleImage, handleImageFallback } from '@/lib/utils';

/* ── Schemas ─────────────────────────────────────────────── */

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const registerSchema = z.object({
  fullName: z.string().min(2, 'Enter your full name'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

/* ── Teasers (left panel) ────────────────────────────────── */
const teasers = articles.filter(a => a.thumbnail).slice(0, 3);

/* ── Component ───────────────────────────────────────────── */
export default function Login() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const from       = (location.state as any)?.from?.pathname || '/';
  const initMode   = new URLSearchParams(location.search).get('mode') === 'register'
    ? 'register' : 'login';

  const [mode, setMode]         = useState<'login' | 'register'>(initMode);
  const [isLoading, setLoading] = useState(false);
  const [showPwd, setShowPwd]   = useState(false);
  const [showCPwd, setShowCPwd] = useState(false);

  /* login form */
  const loginForm = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });
  /* register form */
  const regForm = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  const onLogin = async (data: LoginValues) => {
    setLoading(true);
    try {
      const body = new URLSearchParams();
      body.append('username', data.email);
      body.append('password', data.password);
      const res = await fetch('http://localhost:8000/api/v1/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Invalid email or password');
      }
      const result = await res.json();
      localStorage.setItem('token', result.access_token);
      localStorage.setItem('user_email', data.email);
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const onRegister = async (data: RegisterValues) => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/v1/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          full_name: data.fullName,
          role: 'user',
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Registration failed');
      }
      toast.success('Account created. Please sign in.');
      setMode('login');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left: Brand panel ───────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden bg-[hsl(var(--primary))] flex-col justify-between p-12">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center">
            <span className="text-xs font-bold text-white tracking-tight">OV</span>
          </div>
          <span className="text-lg font-bold text-white tracking-tight">
            Open<span className="text-white/50">vaartha</span>
          </span>
        </Link>

        {/* Headline */}
        <div className="space-y-4">
          <p className="text-white/50 text-sm font-medium">South India's news platform</p>
          <h2 className="text-4xl font-bold text-white leading-tight tracking-tight max-w-sm">
            Stay informed on what matters in your region
          </h2>
        </div>

        {/* Article teasers */}
        <div className="space-y-3">
          {teasers.map(art => (
            <div key={art.id} className="flex gap-3 items-start p-3 rounded-xl bg-white/[0.06]">
              <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-white/10">
                <img
                  src={getArticleImage(art.thumbnail)}
                  alt=""
                  className="w-full h-full object-cover opacity-80"
                  onError={handleImageFallback}
                />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">{art.category}</span>
                <p className="text-sm font-medium text-white/80 leading-snug line-clamp-2 mt-0.5">{art.title}</p>
              </div>
            </div>
          ))}
          <p className="text-xs text-white/30 text-center pt-1">Sign in to read these stories and more</p>
        </div>
      </div>

      {/* ── Right: Auth form ─────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-background">
        <div className="w-full max-w-sm space-y-8">

          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl gradient-maroon flex items-center justify-center">
                <span className="text-xs font-bold text-white">OV</span>
              </div>
              <span className="text-base font-bold tracking-tight">Open<span className="text-primary">vaartha</span></span>
            </Link>
          </div>

          {/* Tab toggle */}
          <div className="flex bg-muted rounded-xl p-1">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 h-9 rounded-lg text-sm font-semibold transition-all ${
                mode === 'login'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign in
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 h-9 rounded-lg text-sm font-semibold transition-all ${
                mode === 'register'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Create account
            </button>
          </div>

          {/* ── Login form ── */}
          {mode === 'login' && (
            <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    {...loginForm.register('email')}
                    type="email"
                    placeholder="name@example.com"
                    autoComplete="email"
                    className="w-full pl-9 pr-3 py-2.5 bg-background border border-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
                {loginForm.formState.errors.email && (
                  <p className="text-xs text-red-600">{loginForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">Password</label>
                  <button type="button" className="text-xs text-primary hover:underline">Forgot password?</button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    {...loginForm.register('password')}
                    type={showPwd ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full pl-9 pr-10 py-2.5 bg-background border border-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {loginForm.formState.errors.password && (
                  <p className="text-xs text-red-600">{loginForm.formState.errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign in'}
              </button>
            </form>
          )}

          {/* ── Register form ── */}
          {mode === 'register' && (
            <form onSubmit={regForm.handleSubmit(onRegister)} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Full name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    {...regForm.register('fullName')}
                    type="text"
                    placeholder="Your name"
                    autoComplete="name"
                    className="w-full pl-9 pr-3 py-2.5 bg-background border border-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
                {regForm.formState.errors.fullName && (
                  <p className="text-xs text-red-600">{regForm.formState.errors.fullName.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    {...regForm.register('email')}
                    type="email"
                    placeholder="name@example.com"
                    autoComplete="email"
                    className="w-full pl-9 pr-3 py-2.5 bg-background border border-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
                {regForm.formState.errors.email && (
                  <p className="text-xs text-red-600">{regForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    {...regForm.register('password')}
                    type={showPwd ? 'text' : 'password'}
                    placeholder="Min. 6 characters"
                    autoComplete="new-password"
                    className="w-full pl-9 pr-10 py-2.5 bg-background border border-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {regForm.formState.errors.password && (
                  <p className="text-xs text-red-600">{regForm.formState.errors.password.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Confirm password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    {...regForm.register('confirmPassword')}
                    type={showCPwd ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    className="w-full pl-9 pr-10 py-2.5 bg-background border border-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showCPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {regForm.formState.errors.confirmPassword && (
                  <p className="text-xs text-red-600">{regForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create account'}
              </button>
            </form>
          )}

          {/* Terms */}
          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            By continuing, you agree to our{' '}
            <button className="underline hover:text-foreground transition-colors">Terms of Service</button>
            {' '}and{' '}
            <button className="underline hover:text-foreground transition-colors">Privacy Policy</button>.
          </p>
        </div>
      </div>
    </div>
  );
}
