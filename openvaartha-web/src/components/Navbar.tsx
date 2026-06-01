import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Search, Sun, Moon, Bookmark, User, Home, X, ChevronRight, LogOut, Radio } from "lucide-react";
import { useReadingList } from "@/hooks/use-reading-list";
import { useSearch, useCategories } from "@/lib/api-hooks";

interface NavbarProps { isInsideStack?: boolean; }

const isTouchDevice = () =>
  typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);

const initDark = (): boolean => {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem("theme");
  if (stored) return stored === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
};

const LANGS = [
  { code: "en", label: "EN" },
  { code: "te", label: "తె" },
  { code: "ta", label: "த" },
  { code: "kn", label: "ಕ" },
] as const;
type LangCode = typeof LANGS[number]["code"];

const Navbar = ({ isInsideStack }: NavbarProps) => {
  const [isDark, setIsDark]       = useState(initDark);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery]         = useState("");
  const [lang, setLang]           = useState<LangCode>(() =>
    (localStorage.getItem("ui-lang") as LangCode | null) ?? "en"
  );
  const { saved }                 = useReadingList();
  const navigate                  = useNavigate();
  const location                  = useLocation();

  const { data: searchResults = [] } = useSearch(query, 0, 7);
  const { data: categories = [] } = useCategories();

  const hasBreaking = searchResults.length > 0;

  const switchLang = (code: LangCode) => {
    setLang(code);
    localStorage.setItem("ui-lang", code);
  };

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setSearchOpen(o => !o); }
      if (e.key === "Escape") { setSearchOpen(false); setQuery(""); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const toggleDark = () => {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    setIsDark(next);
  };

  const filtered = query.trim().length > 1 ? searchResults : [];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_email');
    navigate('/');
    window.location.reload();
  };

  const categoryNames = useMemo(() => categories.map((c) => c.name), [categories]);

  return (
    <>
      <header className={cn(
        "h-14 flex items-center justify-between px-4 sm:px-6",
        isInsideStack ? "" : "border-b border-border"
      )}>
        <Link to="/" className="press">
          <img src="/logo.jpg" alt="Open Vaartha" className="h-9 w-9 rounded-lg object-cover" />
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {categoryNames.slice(0, 5).map(cat => (
            <button
              key={cat}
              onClick={() => navigate(`/?category=${cat}`)}
              className="h-11 px-3 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors press"
            >
              {cat}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-0.5">
          <div className="hidden sm:flex items-center border border-border rounded-lg overflow-hidden mr-1">
            {LANGS.map(({ code, label }) => (
              <button
                key={code}
                onClick={() => switchLang(code)}
                className={cn(
                  "h-9 px-2.5 text-xs font-medium transition-colors",
                  lang === code ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"
                )}
                aria-label={`Switch to ${label}`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setSearchOpen(true)}
            className="h-11 w-11 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors press"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </button>

          {!isTouchDevice() && (
            <span className="hidden sm:inline text-xs text-muted-foreground/50 select-none">⌘K</span>
          )}

          <button
            onClick={toggleDark}
            className="h-11 w-11 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors press"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          <Link
            to="/portal/saved"
            className="hidden sm:flex h-11 w-11 rounded-lg items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors press relative"
            aria-label="Saved articles"
          >
            <Bookmark className="h-5 w-5" />
            {saved.length > 0 && (
              <span className="absolute top-2 right-2 h-2 w-2 bg-primary rounded-full" />
            )}
          </Link>

          {localStorage.getItem('token') ? (
            <div className="hidden sm:flex items-center gap-1 ml-1">
              <Link
                to="/portal/dashboard"
                className="h-11 w-11 rounded-full gradient-maroon flex items-center justify-center press shadow-sm shadow-primary/20 hover:shadow-maroon transition-shadow"
                aria-label="Portal"
              >
                <User className="h-5 w-5 text-white" />
              </Link>
              <button
                onClick={handleLogout}
                className="h-11 w-11 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors press"
                aria-label="Log out"
                title="Log out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="hidden sm:flex items-center h-11 px-4 rounded-lg bg-primary text-white text-sm font-semibold press hover:bg-primary/90 transition-all"
            >
              Sign in
            </Link>
          )}
        </div>
      </header>

      <nav className="bottom-nav sm:hidden">
        <div className="flex items-center justify-around h-16 px-1">
          <BottomNavItem icon={<Home className="h-5 w-5" />} label="Feed" to="/" active={location.pathname === "/"} />
          <BottomNavItem icon={<Search className="h-5 w-5" />} label="Search" onClick={() => setSearchOpen(true)} active={false} />
          <BottomNavItem
            icon={
              <div className="relative">
                <Radio className="h-5 w-5" />
                {hasBreaking && <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-red-500 rounded-full" />}
              </div>
            }
            label="Live" to="/live" active={location.pathname === "/live"} />
          <BottomNavItem
            icon={
              <div className="relative">
                <Bookmark className="h-5 w-5" />
                {saved.length > 0 && <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-primary text-white text-[7px] font-semibold rounded-full flex items-center justify-center">{saved.length > 9 ? "9+" : saved.length}</span>}
              </div>
            }
            label="Saved" to="/portal/saved" active={location.pathname === "/portal/saved"} />
          <BottomNavItem icon={<User className="h-5 w-5" />} label="Portal" to="/portal/dashboard" active={location.pathname.startsWith("/portal")} />
        </div>
      </nav>

      {searchOpen && (
        <div className="fixed inset-0 z-[100] bg-background flex flex-col">
          <div className="flex items-center gap-3 h-14 px-4 border-b border-border bg-background">
            <Search className="h-5 w-5 text-muted-foreground shrink-0" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search articles, categories…"
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-base outline-none"
            />
            <button
              onClick={() => { setSearchOpen(false); setQuery(""); }}
              className="h-11 w-11 rounded-lg flex items-center justify-center hover:bg-muted transition-colors press text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {query.trim().length < 2 && (
              <div className="p-4 space-y-5">
                <div>
                  <p className="text-xs font-semibold text-foreground mb-3">Browse categories</p>
                  <div className="flex flex-wrap gap-2">
                    {categoryNames.map(cat => (
                      <button
                        key={cat}
                        onClick={() => { navigate(`/?category=${cat}`); setSearchOpen(false); setQuery(""); }}
                        className="h-11 px-4 rounded-full text-sm font-medium border border-border hover:bg-primary hover:text-white hover:border-primary transition-colors press"
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                {!isTouchDevice() && (
                  <div className="p-4 rounded-xl bg-[hsl(var(--surface))] border border-border">
                    <p className="text-xs text-muted-foreground">Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">⌘K</kbd> to open search from anywhere</p>
                  </div>
                )}
              </div>
            )}

            {filtered.length > 0 && (
              <div>
                <div className="section-header px-4">
                  <span className="overline">{filtered.length} Result{filtered.length !== 1 ? 's' : ''}</span>
                </div>
                {filtered.map(article => (
                  <button
                    key={article.id}
                    onClick={() => { navigate(`/article/${article.slug}`); setSearchOpen(false); setQuery(""); }}
                    className="feed-item w-full text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="tag mb-1.5">{article.category}</span>
                      <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">{article.title}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                  </button>
                ))}
              </div>
            )}

            {query.trim().length >= 2 && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 gap-2 text-center px-4">
                <p className="text-sm font-semibold">No results for "{query}"</p>
                <p className="overline">Try different keywords</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

interface BNIProps { icon: React.ReactNode; label: string; to?: string; onClick?: () => void; active: boolean; }

const BottomNavItem = ({ icon, label, to, onClick, active }: BNIProps) => {
  const cls = cn(
    "flex flex-col items-center justify-center gap-1 flex-1 h-full min-w-0 press transition-colors",
    active ? "text-primary" : "text-muted-foreground"
  );
  if (to) return <Link to={to} className={cls}>{icon}<span className="text-[10px] font-semibold">{label}</span></Link>;
  return <button onClick={onClick} className={cls}>{icon}<span className="text-[10px] font-semibold">{label}</span></button>;
};

export default Navbar;
