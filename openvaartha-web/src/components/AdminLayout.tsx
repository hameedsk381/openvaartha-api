import { ReactNode, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LayoutDashboard, FileText, FolderTree, Users, MessageSquare, Mail, ArrowLeft, LogOut } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface NavItem {
  label: string;
  icon: typeof LayoutDashboard;
  path: string;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/admin", roles: ["admin"] },
  { label: "Articles", icon: FileText, path: "/admin/articles", roles: ["admin", "editor"] },
  { label: "Categories", icon: FolderTree, path: "/admin/categories", roles: ["admin", "editor"] },
  { label: "Users", icon: Users, path: "/admin/users", roles: ["admin"] },
  { label: "Comments", icon: MessageSquare, path: "/admin/comments", roles: ["admin", "moderator"] },
  { label: "Newsletter", icon: Mail, path: "/admin/newsletter", roles: ["admin"] },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<{ fullName?: string; email?: string; role?: string; isAdmin?: boolean } | null>(null);

  useEffect(() => {
    apiFetch<{ fullName?: string; email?: string; role?: string; isAdmin?: boolean }>("/users/me")
      .then(setUser)
      .catch(() => {});
  }, []);

  const effectiveRole = user?.isAdmin ? "admin" : (user?.role || "user");
  const visibleNavItems = useMemo(
    () => NAV_ITEMS.filter((item) => item.roles.includes(effectiveRole)),
    [effectiveRole]
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden sm:flex flex-col w-56 shrink-0 border-r border-border bg-[hsl(var(--surface))] min-h-screen">
          <div className="px-4 py-5 border-b border-border">
            <Link to="/">
              <img src="/logo.jpg" alt="Open Vaartha" className="h-9 w-9 rounded-md object-cover" />
            </Link>
            <p className="text-[11px] text-muted-foreground mt-1 font-medium">{user?.fullName || user?.email || "Loading..."}</p>
          </div>

          <nav className="py-3 flex-1">
            {visibleNavItems.map(({ label, icon: Icon, path }) => {
              const active = location.pathname === path || (path !== "/admin" && location.pathname.startsWith(path));
              return (
                <Link
                  key={path}
                  to={path}
                  className={cn(
                    "flex items-center gap-3 mx-2 px-3 h-10 rounded-lg text-sm font-medium transition-all press",
                    active
                      ? "bg-primary text-primary-foreground shadow-maroon"
                      : "text-muted-foreground hover:bg-[hsl(var(--surface-3))] hover:text-foreground"
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", active ? "text-secondary" : "")} />
                  <span className="flex-1">{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-3 border-t border-border space-y-1">
            <Link
              to="/"
              className="flex items-center gap-3 w-full px-3 h-10 rounded-lg text-sm font-medium text-muted-foreground hover:bg-[hsl(var(--surface-3))] hover:text-foreground transition-all press"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              Back to site
            </Link>
            <button
              onClick={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("user_email");
                navigate("/");
                window.location.reload();
              }}
              className="flex items-center gap-3 w-full px-3 h-10 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-all press"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Sign out
            </button>
          </div>
        </aside>

        {/* Mobile top bar */}
        <div className="sm:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-12 px-4 border-b border-border bg-background">
          <Link to="/admin" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md gradient-maroon flex items-center justify-center">
              <span className="text-[9px] font-black text-white">OV</span>
            </div>
            <span className="text-xs font-bold">Admin</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/" className="text-[11px] text-muted-foreground hover:text-foreground press">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Mobile bottom nav */}
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around h-14 border-t border-border bg-background px-1 safe-bottom">
          {visibleNavItems.map(({ label, icon: Icon, path }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 h-full px-2 rounded-md transition-colors press",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="text-[9px] font-semibold">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-y-auto pb-16 sm:pb-0">
          <div className="p-4 sm:p-6 lg:p-8 pt-16 sm:pt-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
