import { ReactNode, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Bookmark, History, Settings, ArrowLeft, LogOut } from "lucide-react";
import Navbar from "./Navbar";

const NAV_ITEMS = [
  { label: "Dashboard",  icon: LayoutDashboard, path: "/portal/dashboard" },
  { label: "Saved",      icon: Bookmark,         path: "/portal/saved" },
  { label: "History",    icon: History,           path: "/portal/history" },
  { label: "Settings",   icon: Settings,          path: "/portal/settings" },
];

export function PortalLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const current  = NAV_ITEMS.find(n => location.pathname === n.path);

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login');
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
        <Navbar isInsideStack />
      </div>

      <div className="pt-14 flex min-h-screen">
        {/* ── Desktop Sidebar ─ maroon branded ─────────────── */}
        <aside className="hidden sm:flex flex-col w-52 shrink-0 border-r border-border sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto portal-scroll">
          {/* Sidebar header */}
          <div className="px-4 py-5 border-b border-border">
            <p className="text-xs font-semibold text-primary mb-0.5">My Portal</p>
            <p className="text-xs text-muted-foreground">Saved articles & settings</p>
          </div>

          {/* Nav items */}
          <nav className="py-3 flex-1">
            {NAV_ITEMS.map(({ label, icon: Icon, path }) => {
              const active = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  className={cn(
                    "flex items-center gap-3 mx-2 px-3 h-10 rounded-lg text-sm font-medium transition-all press",
                    active
                      ? "bg-primary text-primary-foreground shadow-maroon"
                      : "text-muted-foreground hover:bg-[hsl(var(--surface))] hover:text-foreground"
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", active ? "text-secondary" : "")} />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Sidebar footer */}
          <div className="p-3 border-t border-border space-y-2">
            <div className="rounded-xl gradient-beige p-3 border border-secondary">
              <p className="text-[10px] font-black text-[#550000] uppercase tracking-wider mb-1">Pro Plan</p>
              <p className="text-xs text-[#550000]/70 leading-snug font-medium">Unlimited access to all intelligence sectors</p>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user_email');
                navigate('/');
                window.location.reload();
              }}
              className="flex items-center gap-3 w-full px-3 h-10 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-all press"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* ── Main Content ──────────────────────────────────── */}
        <main className="flex-1 min-w-0 h-[calc(100vh-3.5rem)] overflow-y-auto portal-scroll pb-safe">
          {/* Mobile breadcrumb */}
          <div className="sm:hidden flex items-center justify-between h-11 px-4 border-b border-border bg-[hsl(var(--surface))]">
            <Link to="/" className="flex items-center gap-1.5 text-muted-foreground press">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-xs font-medium">Feed</span>
            </Link>
            <span className="text-xs font-black uppercase tracking-widest text-primary">{current?.label ?? "Portal"}</span>
            <div className="w-14" />
          </div>

          {/* Mobile pill nav */}
          <div className="sm:hidden flex overflow-x-auto no-scrollbar gap-1.5 px-4 py-2 border-b border-border">
            {NAV_ITEMS.map(({ label, icon: Icon, path }) => {
              const active = location.pathname === path;
              return (
                <Link key={path} to={path} className={cn(
                  "shrink-0 flex items-center gap-1.5 h-7 px-3 rounded-full text-[11px] font-bold transition-colors press",
                  active ? "bg-primary text-primary-foreground" : "bg-secondary/40 text-[hsl(var(--secondary-foreground))] hover:bg-secondary"
                )}>
                  <Icon className="h-3 w-3" /> {label}
                </Link>
              );
            })}
          </div>

          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
