import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Bookmark, History, Settings, ArrowLeft, LogOut, Lock, ArrowUpRight } from "lucide-react";
import Navbar from "./Navbar";

interface NavItem {
  label: string;
  icon: typeof LayoutDashboard;
  path: string;
  requiresAuth: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/portal/dashboard", requiresAuth: true  },
  { label: "Saved",     icon: Bookmark,        path: "/portal/saved",     requiresAuth: false },
  { label: "History",   icon: History,         path: "/portal/history",   requiresAuth: true  },
  { label: "Settings",  icon: Settings,        path: "/portal/settings",  requiresAuth: true  },
];

function SignInRequired({ label }: { label: string }) {
  return (
    <div className="max-w-xl mx-auto py-12 sm:py-20">
      <div className="rounded-lg border border-border bg-[hsl(var(--surface))] p-8 sm:p-12 text-center">
        <div className="h-12 w-12 mx-auto rounded-full gradient-maroon flex items-center justify-center mb-5 shadow-sm">
          <Lock className="h-5 w-5 text-white" />
        </div>
        <p className="overline text-primary mb-2">Account required</p>
        <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight">
          Sign in to use {label.toLowerCase()}
        </h2>
        <p className="font-serif italic text-sm sm:text-base text-muted-foreground mt-3 leading-relaxed max-w-md mx-auto">
          Reading the news is always free and never gated. {label} is part of your personal account — sign in to enable it.
        </p>
        <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/login"
            className="h-12 px-6 inline-flex items-center justify-center gap-2 rounded-md bg-primary text-white text-xs font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors press"
          >
            Sign in <ArrowUpRight className="h-4 w-4" />
          </Link>
          <Link
            to="/login?mode=register"
            className="h-12 px-6 inline-flex items-center justify-center gap-2 rounded-md border border-border text-xs font-semibold uppercase tracking-wider hover:border-primary hover:text-primary transition-colors press"
          >
            Create account
          </Link>
        </div>
        <Link
          to="/"
          className="mt-8 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Continue reading instead
        </Link>
      </div>
    </div>
  );
}

export function PortalLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthed = !!localStorage.getItem('token');
  const current  = NAV_ITEMS.find(n => location.pathname === n.path);
  const gated    = !!current?.requiresAuth && !isAuthed;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
        <Navbar isInsideStack />
      </div>

      <div className="pt-14 flex min-h-screen">
        {/* Desktop sidebar */}
        <aside className="hidden sm:flex flex-col w-52 shrink-0 border-r border-border sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto portal-scroll">
          <div className="px-4 py-5 border-b border-border">
            <p className="overline text-primary mb-1">My Portal</p>
            <p className="text-xs text-muted-foreground font-serif italic">Saved articles &amp; settings</p>
          </div>

          <nav className="py-3 flex-1">
            {NAV_ITEMS.map(({ label, icon: Icon, path, requiresAuth }) => {
              const active = location.pathname === path;
              const locked = requiresAuth && !isAuthed;
              return (
                <Link
                  key={path}
                  to={path}
                  className={cn(
                    "flex items-center gap-3 mx-2 px-3 h-11 rounded-lg text-sm font-medium transition-all press",
                    active
                      ? "bg-primary text-primary-foreground shadow-maroon"
                      : "text-muted-foreground hover:bg-[hsl(var(--surface))] hover:text-foreground"
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", active ? "text-secondary" : "")} />
                  <span className="flex-1">{label}</span>
                  {locked && <Lock className="h-3 w-3 opacity-50" />}
                </Link>
              );
            })}
          </nav>

          <div className="p-3 border-t border-border space-y-2">
            {isAuthed ? (
              <button
                onClick={() => {
                  localStorage.removeItem('token');
                  localStorage.removeItem('user_email');
                  navigate('/');
                  window.location.reload();
                }}
                className="flex items-center gap-3 w-full px-3 h-11 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-all press"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                Sign out
              </button>
            ) : (
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 w-full px-3 h-11 rounded-lg text-xs font-bold uppercase tracking-wider bg-primary text-white hover:bg-primary/90 transition-all press"
              >
                Sign in
              </Link>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 h-[calc(100vh-3.5rem)] overflow-y-auto portal-scroll pb-safe">
          {/* Mobile breadcrumb */}
          <div className="sm:hidden flex items-center justify-between h-11 px-4 border-b border-border bg-[hsl(var(--surface))]">
            <Link to="/" className="flex items-center gap-1.5 text-muted-foreground press">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-xs font-medium">Feed</span>
            </Link>
            <span className="overline text-primary">{current?.label ?? "Portal"}</span>
            <div className="w-14" />
          </div>

          {/* Mobile pill nav */}
          <div className="sm:hidden flex overflow-x-auto no-scrollbar gap-1.5 px-4 py-2 border-b border-border">
            {NAV_ITEMS.map(({ label, icon: Icon, path, requiresAuth }) => {
              const active = location.pathname === path;
              const locked = requiresAuth && !isAuthed;
              return (
                <Link key={path} to={path} className={cn(
                  "shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[11px] font-bold uppercase tracking-wider transition-colors press",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/40 text-[hsl(var(--secondary-foreground))] hover:bg-secondary"
                )}>
                  <Icon className="h-3 w-3" /> {label}
                  {locked && <Lock className="h-2.5 w-2.5 opacity-60" />}
                </Link>
              );
            })}
          </div>

          <div className="p-4 sm:p-6 lg:p-8">
            {gated ? <SignInRequired label={current!.label} /> : children}
          </div>
        </main>
      </div>
    </div>
  );
}
