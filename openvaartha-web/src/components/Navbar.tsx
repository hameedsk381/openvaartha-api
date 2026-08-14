import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Bookmark, Home } from "lucide-react";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { Search } from "@/components/animate-ui/icons/search";
import { Sun } from "@/components/animate-ui/icons/sun";
import { Moon } from "@/components/animate-ui/icons/moon";
import { X } from "@/components/animate-ui/icons/x";
import { ChevronRight } from "@/components/animate-ui/icons/chevron-right";
import { LogOut } from "@/components/animate-ui/icons/log-out";
import { MessageSquare } from "@/components/animate-ui/icons/message-square";
import { User } from "@/components/animate-ui/icons/user";
import { Flame } from "lucide-react";
import { useReadingList } from "@/hooks/use-reading-list";
import { useStreak } from "@/hooks/use-streak";
import { useSearch, useCategories, useBreakingArticles } from "@/lib/api-hooks";
import SignOutButton from "@/components/SignOutButton";
import { BRAND } from "@/lib/brand";
import { Heart } from "lucide-react";

interface NavbarProps { 
  isInsideStack?: boolean;
  hideBottomNav?: boolean;
}

const isTouchDevice = () =>
  typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);

const initDark = (): boolean => {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem("theme");
  if (stored) {
    if (stored === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return stored === "dark";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
};

const Navbar = ({ isInsideStack, hideBottomNav }: NavbarProps) => {
  const [isDark, setIsDark]       = useState(initDark);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery]         = useState("");
  const { saved }                 = useReadingList();
  const { streak }                = useStreak();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedCat = searchParams.get('category') || 'All';
  const searchOverlayRef = useRef<HTMLDivElement | null>(null);

  const setCategory = (cat: string) => {
    if (cat.toLowerCase() === 'all') {
      navigate('/');
    } else {
      navigate(`/?category=${cat}`);
    }
  };

  const { data: searchResults = [] } = useSearch(query, 0, 7);
  const { data: categories = [] } = useCategories();
  const { data: breakingArticles = [] } = useBreakingArticles(5);

  const hasBreaking = breakingArticles.length > 0;
  const isMac = typeof navigator !== "undefined" && /mac/i.test(navigator.userAgent);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setSearchOpen(o => !o); }
      if (e.key === "Escape") { setSearchOpen(false); setQuery(""); }
      if (e.key === "Tab" && searchOpen) {
        if (!searchOverlayRef.current) return;
        const focusable = searchOverlayRef.current.querySelectorAll<HTMLElement>(
          'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex="0"], [contenteditable]'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            last.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [searchOpen]);

  const toggleDark = () => {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    setIsDark(next);
    window.dispatchEvent(new Event("appearance-change"));
  };

  const filtered = query.trim().length > 1 ? searchResults : [];

  const categoryNames = useMemo(() => categories.map((c) => c.name), [categories]);

  return (
    <>
      <header className={cn(
        "bg-background w-full",
        isInsideStack ? "" : "border-b border-border"
      )}>
        <div className="h-14 flex items-center justify-between px-4 sm:px-6 max-w-screen-2xl mx-auto">
          <Link to="/" className="press shrink-0 flex items-center gap-2.5">
            <img src={BRAND.iconMaroonPath} alt="Open Vaartha" className="h-9 w-9 dark:hidden" />
            <img src={BRAND.iconWhitePath} alt="Open Vaartha" className="h-9 w-9 hidden dark:block" />
            <span className="hidden sm:inline font-display text-lg font-extrabold tracking-tight">
              Open<span className="text-primary">vaartha</span>
            </span>
          </Link>

          {/* Desktop category pills in the center */}
          <nav className="hidden md:flex items-center gap-2 mx-4 overflow-x-auto no-scrollbar max-w-2xl">
            <Link
              to="/digest"
              className="shrink-0 h-9 px-4 rounded-full font-display text-xs font-bold uppercase tracking-wide transition-colors press whitespace-nowrap border-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 text-foreground border-orange-500/30 hover:border-orange-500 flex items-center justify-center gap-1.5"
            >
              <Flame className="w-4 h-4 fill-orange-500" />
              Digest
            </Link>

            {(["All", ...categoryNames] as string[]).map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={cn(
                  "shrink-0 h-9 px-4 rounded-full font-display text-xs font-bold uppercase tracking-wide transition-colors press whitespace-nowrap border-2",
                  selectedCat.toLowerCase() === cat.toLowerCase()
                    ? "bg-primary text-primary-foreground border-foreground"
                    : "bg-secondary/50 text-[hsl(var(--secondary-foreground))] border-transparent hover:border-foreground hover:bg-secondary"
                )}
              >
                {cat}
              </button>
            ))}
          </nav>

        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setSearchOpen(true)}
            className="group h-11 w-11 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors press"
            aria-label="Search"
          >
            <Search className="h-5 w-5" animateOnHover />
          </button>

          {!isTouchDevice() && (
            <span className="hidden sm:inline text-xs text-muted-foreground/50 select-none">{isMac ? "⌘K" : "Ctrl+K"}</span>
          )}

          {streak > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 h-10 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 font-bold text-sm">
              <Flame className="w-4 h-4 fill-orange-500 animate-pulse" />
              <span>{streak}</span>
            </div>
          )}

          <Link
            to="/support"
            className="hidden sm:flex items-center gap-1.5 h-10 px-3 rounded-full bg-primary/10 border border-primary/20 text-primary hover:bg-primary/15 transition-colors press text-sm font-semibold"
            aria-label="Support independent journalism"
            title="Support us"
          >
            <Heart className="w-4 h-4 fill-current" />
            Support
          </Link>
          
          <button
            onClick={toggleDark}
            className="group h-11 w-11 rounded-lg flex items-center justify-center bg-transparent hover:bg-muted transition-colors press"
            aria-label="Toggle theme"
            title="Toggle theme"
          >  {isDark ? <Sun className="h-5 w-5" animateOnTap /> : <Moon className="h-5 w-5" animateOnTap />}
          </button>

          <Link
            to="/portal/saved"
            className="hidden sm:flex h-11 w-11 rounded-lg items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors press relative"
            aria-label="Saved articles"
          >
            <AnimatedIcon animationType="scale">
              <Bookmark className="h-5 w-5" />
            </AnimatedIcon>
            {saved.length > 0 && (
              <span className="absolute top-2 right-2 h-2 w-2 bg-primary rounded-full" />
            )}
          </Link>

          {localStorage.getItem('token') ? (
            <div className="flex items-center gap-1 ml-1">
              <Link
                to="/portal/dashboard"
                className="hidden sm:flex h-11 w-11 rounded-full gradient-maroon items-center justify-center press shadow-sm shadow-primary/20 hover:shadow-maroon transition-shadow"
                aria-label="Portal"
              >
                <User className="h-5 w-5 text-white" animateOnHover />
              </Link>
              <SignOutButton>
                {(onClick) => (
                  <button
                    onClick={onClick}
                    className="h-11 w-11 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors press"
                    aria-label="Log out"
                    title="Log out"
                  >
                    <LogOut className="h-5 w-5" animateOnHover />
                  </button>
                )}
              </SignOutButton>
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
        </div>
        {/* Mobile scrollable category pills row */}
        <div className="md:hidden relative border-t border-border/50 bg-background">
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none z-10" />
          <div className="py-2 px-6 flex gap-2 overflow-x-auto no-scrollbar relative z-0">
            <Link
              to="/digest"
              className="shrink-0 h-8 px-4 rounded-full text-xs font-bold transition-colors press whitespace-nowrap bg-gradient-to-r from-orange-500/20 to-red-500/20 text-foreground border border-orange-500/30 flex items-center justify-center gap-1"
            >
              <Flame className="w-3.5 h-3.5 fill-orange-500" />
              Digest
            </Link>
            
            {(["All", ...categoryNames] as string[]).map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={cn(
                  "shrink-0 h-8 px-4.5 rounded-full text-xs font-bold transition-colors press whitespace-nowrap",
                  selectedCat.toLowerCase() === cat.toLowerCase()
                    ? "bg-primary text-primary-foreground font-bold"
                    : "bg-secondary/50 text-[hsl(var(--secondary-foreground))] hover:bg-secondary"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none z-10" />
        </div>
      </header>

      {!hideBottomNav && (
        <nav className="bottom-nav sm:hidden">
          <div className="flex items-center justify-around h-16 px-1">
            <BottomNavItem icon={<AnimatedIcon animationType="scale"><Home className="h-5 w-5" /></AnimatedIcon>} label="Home" to="/" active={location.pathname === "/"} />
            <BottomNavItem icon={<Search className="h-5 w-5" animateOnHover />} label="Search" onClick={() => setSearchOpen(true)} active={false} />
            <BottomNavItem
              icon={
                <div className="relative">
                  <MessageSquare className="h-5 w-5" animateOnHover />
                  {hasBreaking && <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-red-500 rounded-full" />}
                </div>
              }
              label="Feed" to="/feed" active={location.pathname === "/feed"} />
            <BottomNavItem
              icon={
                <div className="relative">
                  <AnimatedIcon animationType="scale">
                    <Bookmark className="h-5 w-5" />
                  </AnimatedIcon>
                  {saved.length > 0 && <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-primary text-white text-[7px] font-semibold rounded-full flex items-center justify-center">{saved.length > 9 ? "9+" : saved.length}</span>}
                </div>
              }
              label="Saved" to="/portal/saved" active={location.pathname === "/portal/saved"} />
            <BottomNavItem icon={<User className="h-5 w-5" animateOnHover />} label="Portal" to="/portal/dashboard" active={location.pathname.startsWith("/portal")} />
          </div>
        </nav>
      )}

      {searchOpen && (
        <div ref={searchOverlayRef} className="fixed inset-0 z-[100] bg-background flex flex-col">
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
              className="group h-11 w-11 rounded-lg flex items-center justify-center hover:bg-muted transition-colors press text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" animateOnHover />
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
                    <p className="text-xs text-muted-foreground">Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">{isMac ? "⌘K" : "Ctrl+K"}</kbd> to open search from anywhere</p>
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
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" animateOnHover />
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
