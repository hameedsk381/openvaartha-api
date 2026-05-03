import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Mail, Lock, User as UserIcon, Loader2, Eye, EyeOff, ArrowLeft, Quote } from 'lucide-react';

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

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || '/';
  const initMode = new URLSearchParams(location.search).get('mode') === 'register' ? 'register' : 'login';

  const [mode, setMode] = useState<'login' | 'register'>(initMode);
  const [isLoading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showCPwd, setShowCPwd] = useState(false);

  const loginForm = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });
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
      toast.success('Welcome back.');
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

  const inputCls =
    "w-full h-12 pl-11 pr-3 bg-background border border-border rounded-md text-sm font-serif placeholder:text-muted-foreground/60 placeholder:font-sans focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all";

  return (
    <div className="min-h-screen flex bg-background text-foreground">

      {/* Left — editorial brand panel */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-primary text-white flex-col justify-between p-12 xl:p-16">
        <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(circle_at_30%_20%,white,transparent_50%)]" />
        <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(circle_at_80%_80%,white,transparent_50%)]" />

        <div className="relative">
          <Link to="/" className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/70 hover:text-white transition-colors mb-12">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to feed
          </Link>

          <Link to="/" className="flex items-center gap-3 group">
            <div className="h-11 w-11 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-sm">
              <span className="font-black text-white tracking-tight">OV</span>
            </div>
            <span className="font-serif text-2xl font-bold tracking-tight">
              Open<span className="text-secondary">vaartha</span>
            </span>
          </Link>
        </div>

        <div className="relative">
          <Quote className="h-10 w-10 text-secondary mb-6" />
          <p className="font-serif text-3xl xl:text-4xl font-bold leading-[1.15] tracking-tight max-w-xl">
            "The best journalism doesn't shout. It clarifies — patiently, accurately, in the voice of the region it covers."
          </p>
          <div className="mt-8 flex items-center gap-3">
            <div className="h-px w-10 bg-secondary" />
            <span className="font-serif italic text-sm text-white/70">The Open Vaartha editorial promise</span>
          </div>
        </div>

        <div className="relative grid grid-cols-3 gap-6 pt-8 border-t border-white/15">
          <div>
            <div className="font-serif text-3xl font-bold">5</div>
            <div className="text-[11px] uppercase tracking-wider text-white/60 font-semibold mt-1">Languages</div>
          </div>
          <div>
            <div className="font-serif text-3xl font-bold">120+</div>
            <div className="text-[11px] uppercase tracking-wider text-white/60 font-semibold mt-1">Reporters</div>
          </div>
          <div>
            <div className="font-serif text-3xl font-bold">0</div>
            <div className="text-[11px] uppercase tracking-wider text-white/60 font-semibold mt-1">Paywalls</div>
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-lg gradient-maroon flex items-center justify-center">
                <span className="text-xs font-black text-white">OV</span>
              </div>
              <span className="font-serif text-lg font-bold tracking-tight">
                Open<span className="text-primary">vaartha</span>
              </span>
            </Link>
          </div>

          <div className="mb-8">
            <span className="overline text-primary">{mode === 'login' ? 'Welcome back' : 'Join us'}</span>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight mt-2 leading-tight">
              {mode === 'login' ? 'Sign in to continue reading.' : 'Create your reader account.'}
            </h1>
            <p className="font-serif italic text-sm text-muted-foreground mt-3">
              {mode === 'login'
                ? 'Pick up where you left off — your saved stories, settings and language preferences are waiting.'
                : 'Free, forever. Save stories, follow sections, get the morning briefing.'}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex border border-border rounded-md overflow-hidden mb-8">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 h-11 text-xs font-semibold uppercase tracking-wider transition-colors ${
                mode === 'login' ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              Sign in
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 h-11 text-xs font-semibold uppercase tracking-wider transition-colors ${
                mode === 'register' ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              Create account
            </button>
          </div>

          {mode === 'login' ? (
            <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-5">
              <div className="space-y-1.5">
                <label className="overline text-muted-foreground">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    {...loginForm.register('email')}
                    type="email"
                    placeholder="name@example.com"
                    autoComplete="email"
                    className={inputCls}
                  />
                </div>
                {loginForm.formState.errors.email && (
                  <p className="text-xs text-destructive font-medium">{loginForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="overline text-muted-foreground">Password</label>
                  <button type="button" className="text-[11px] font-semibold uppercase tracking-wider text-primary hover:underline underline-offset-4">
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    {...loginForm.register('password')}
                    type={showPwd ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className={`${inputCls} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {loginForm.formState.errors.password && (
                  <p className="text-xs text-destructive font-medium">{loginForm.formState.errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-md bg-primary text-white text-sm font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 press"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign in'}
              </button>
            </form>
          ) : (
            <form onSubmit={regForm.handleSubmit(onRegister)} className="space-y-5">
              <div className="space-y-1.5">
                <label className="overline text-muted-foreground">Full name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    {...regForm.register('fullName')}
                    type="text"
                    placeholder="Your name"
                    autoComplete="name"
                    className={inputCls}
                  />
                </div>
                {regForm.formState.errors.fullName && (
                  <p className="text-xs text-destructive font-medium">{regForm.formState.errors.fullName.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="overline text-muted-foreground">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    {...regForm.register('email')}
                    type="email"
                    placeholder="name@example.com"
                    autoComplete="email"
                    className={inputCls}
                  />
                </div>
                {regForm.formState.errors.email && (
                  <p className="text-xs text-destructive font-medium">{regForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="overline text-muted-foreground">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    {...regForm.register('password')}
                    type={showPwd ? 'text' : 'password'}
                    placeholder="Min. 6 characters"
                    autoComplete="new-password"
                    className={`${inputCls} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {regForm.formState.errors.password && (
                  <p className="text-xs text-destructive font-medium">{regForm.formState.errors.password.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="overline text-muted-foreground">Confirm password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    {...regForm.register('confirmPassword')}
                    type={showCPwd ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    className={`${inputCls} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                  >
                    {showCPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {regForm.formState.errors.confirmPassword && (
                  <p className="text-xs text-destructive font-medium">{regForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-md bg-primary text-white text-sm font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 press"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create account'}
              </button>
            </form>
          )}

          <p className="text-[11px] text-muted-foreground text-center leading-relaxed mt-8 font-serif italic">
            By continuing, you agree to our{' '}
            <button className="underline underline-offset-4 hover:text-primary transition-colors not-italic font-sans">Terms</button>
            {' '}and{' '}
            <button className="underline underline-offset-4 hover:text-primary transition-colors not-italic font-sans">Privacy Policy</button>.
          </p>
        </div>
      </div>
    </div>
  );
}
