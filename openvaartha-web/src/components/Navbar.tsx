import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { cn, categorySlug } from "@/lib/utils";
import { Bookmark, ChevronDown, Flame, Heart, Home } from "lucide-react";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { Search } from "@/components/animate-ui/icons/search";
import { Sun } from "@/components/animate-ui/icons/sun";
import { Moon } from "@/components/animate-ui/icons/moon";
import { X } from "@/components/animate-ui/icons/x";
import { ChevronRight } from "@/components/animate-ui/icons/chevron-right";
import { LogOut } from "@/components/animate-ui/icons/log-out";
import { MessageSquare } from "@/components/animate-ui/icons/message-square";
import { User } from "@/components/animate-ui/icons/user";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { useReadingList } from "@/hooks/use-reading-list";
import { useStreak } from "@/hooks/use-streak";
import { useSearch, useCategories, useBreakingArticles } from "@/lib/api-hooks";
import { looksLikeQuestion, useAiSearch } from "@/lib/ai-search";
import AnswerText from "@/components/search/AnswerText";
import SignOutButton from "@/components/SignOutButton";
import { BRAND } from "@/lib/brand";
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface NavbarProps { 
  isInsideStack?: boolean;
  hideBottomNav?: boolean;
  hideHeader?: boolean;
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

const Navbar = ({ isInsideStack, hideBottomNav, hideHeader }: NavbarProps) => {
  const [isDark, setIsDark]       = useState(initDark);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery]         = useState("");
  const { saved }                 = useReadingList();
  const { streak }                = useStreak();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const selectedCat = location.pathname.startsWith('/category/')
    ? location.pathname.split('/category/')[1].replace(/-/g, ' ')
    : (searchParams.get('category') || 'All');
  const searchOverlayRef = useRef<HTMLDivElement | null>(null);

  const { data: searchResults = [] } = useSearch(query, 0, 7);
  const { data: categories = [] } = useCategories();
  const { data: breakingArticles = [] } = useBreakingArticles(5);

  // Only questions are worth a model round-trip in the overlay; the archive
  // page has the full Ask experience with citations.
  const askable = looksLikeQuestion(query) && query.trim().length >= 8;
  const { data: aiAnswer, isFetching: aiLoading } = useAiSearch(askable ? query : "", undefined, 3);

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
  // When the keyword index returns nothing but the model answered, the answer's
  // own stories are the useful list for the overlay.
  const shownResults = filtered.length > 0 ? filtered : (aiAnswer?.answer ? aiAnswer.results : []);

  const categoryNames = useMemo(() => categories.map((c) => c.name), [categories]);

  const MAX_INLINE_CATEGORIES = 3;
  const navCategories = categoryNames.slice(0, MAX_INLINE_CATEGORIES);
  const categoryIsCurrent = (category: string) =>
    (location.pathname === "/" || location.pathname.startsWith("/category/"))
    && categorySlug(selectedCat) === categorySlug(category);
  const mastheadControl = "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-[#fff4e5] transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#f7d3a5]";
  const topicLink = "inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 px-2 text-[13px] font-semibold whitespace-nowrap transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#7b272b] dark:hover:bg-white/10 dark:focus-visible:ring-[#ffb8b1] sm:px-3.5 sm:text-sm";
  const currentTopic = "bg-[#f1e2dc] text-[#692129] shadow-[inset_0_-2px_#8b3036] dark:bg-[#3a2527] dark:text-[#ffd1ca] dark:shadow-[inset_0_-2px_#e38d85]";

  return (
    <>
      {!hideHeader && (
        <header className={cn(
          "w-full",
          isInsideStack ? "" : "border-b border-border"
        )}>
          <div className="border-b border-[#7a3c3d] bg-[#46151c] text-[#fff4e5] dark:border-[#713c40] dark:bg-[#321419]">
            <div className="mx-auto grid min-h-[64px] max-w-screen-2xl grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 px-3 sm:min-h-[74px] sm:px-6 lg:min-h-[92px] lg:grid-cols-[1fr_auto_1fr] lg:px-10">
              <Link to="/support" className={cn(mastheadControl, "hidden justify-self-start gap-2 px-3 text-sm font-semibold lg:inline-flex")}>
                <Heart className="h-4 w-4 text-[#f4bd97]" aria-hidden="true" />
                Support
              </Link>
              <Link to="/" className="flex min-h-11 min-w-0 items-center gap-2 rounded-sm justify-self-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f7d3a5] sm:gap-3 lg:justify-self-center">
                <img src={BRAND.iconWhitePath} alt="" className="size-8 shrink-0 sm:size-10 lg:size-12" width={48} height={48} />
                <span className="whitespace-nowrap font-serif text-[clamp(1.35rem,6vw,1.9rem)] font-bold leading-none tracking-[-0.045em] lg:text-[2.85rem]">
                  Open <span className="text-[#f4bd97]">Vaartha</span>
                </span>
              </Link>
              <div className="flex items-center justify-end gap-0.5 sm:gap-1">
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  className={cn(mastheadControl, "gap-2 sm:border sm:border-[#a66d6f] sm:px-3")}
                  aria-label="Search"
                >
                  <Search className="h-5 w-5" animateOnHover />
                  <span className="hidden text-sm font-semibold md:inline">Search</span>
                  {!isTouchDevice() && (
                    <kbd aria-hidden="true" className="hidden rounded border border-[#a66d6f] px-1.5 py-0.5 font-sans text-[10px] text-[#ffddbb] xl:inline">
                      {isMac ? "⌘K" : "Ctrl+K"}
                    </kbd>
                  )}
                </button>

                {streak > 0 && (
                  <div className="hidden items-center gap-1 px-2 text-sm font-semibold text-[#f4bd97] xl:flex" aria-label={`${streak}-day reading streak`}>
                    <Flame className="h-4 w-4" aria-hidden="true" />
                    <span>{streak}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={toggleDark}
                  className={mastheadControl}
                  aria-label="Toggle theme"
                  aria-pressed={isDark}
                  title="Toggle theme"
                >  {isDark ? <Sun className="h-5 w-5" animateOnTap /> : <Moon className="h-5 w-5" animateOnTap />}
                </button>

                <Link
                  to="/portal/saved"
                  className={cn(mastheadControl, "relative hidden lg:inline-flex")}
                  aria-label="Saved articles"
                >
                  <AnimatedIcon animationType="scale">
                    <Bookmark className="h-5 w-5" />
                  </AnimatedIcon>
                  {saved.length > 0 && (
                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#f4bd97]" />
                  )}
                </Link>

                {localStorage.getItem('token') ? (
                  <div className="hidden items-center gap-0.5 sm:flex">
                    <Link
                      to="/portal/dashboard"
                      className={mastheadControl}
                      aria-label="Portal"
                    >
                      <User className="h-5 w-5 text-white" animateOnHover />
                    </Link>
                    <SignOutButton>
                      {(onClick) => (
                        <button
                          onClick={onClick}
                          className={mastheadControl}
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
                    className={cn(mastheadControl, "ml-1 hidden border border-[#e2ad8a] px-3 text-sm font-semibold sm:inline-flex")}
                  >
                    Sign in
                  </Link>
                )}
              </div>
            </div>
          </div>
          <div className="bg-[#f8f0e5] text-[#382729] dark:bg-[#241a1b] dark:text-[#f5e6de]">
            <nav aria-label="News sections" className={cn(
              "mx-auto grid max-w-screen-2xl items-stretch px-3 sm:flex sm:px-6 lg:px-10",
              categoryNames.length > 0 ? "grid-cols-3" : "grid-cols-2",
            )}>
              <Link to="/" aria-current={categoryIsCurrent("All") ? "page" : undefined}
                className={cn(topicLink, categoryIsCurrent("All") && currentTopic)}>
                Top stories
              </Link>
              <div className="hidden min-w-0 flex-1 items-stretch overflow-x-auto no-scrollbar sm:flex">
                {navCategories.map((category) => (
                  <Link key={category} to={`/category/${categorySlug(category)}`}
                    aria-current={categoryIsCurrent(category) ? "page" : undefined}
                    className={cn(topicLink, "uppercase tracking-wide", categoryIsCurrent(category) && currentTopic)}>
                    {category}
                  </Link>
                ))}
              </div>
              <Link to="/feed" aria-current={location.pathname === "/feed" ? "page" : undefined}
                className={cn(topicLink, "hidden border-l border-[#ddc8bb] dark:border-[#573e40] lg:inline-flex", location.pathname === "/feed" && currentTopic)}>
                Feed
              </Link>
              <Link to="/digest" aria-current={location.pathname === "/digest" ? "page" : undefined}
                className={cn(topicLink, "border-l border-[#ddc8bb] dark:border-[#573e40]", location.pathname === "/digest" && currentTopic)}>
                Digest
              </Link>
              {categoryNames.length > 0 && (
                <Dialog>
                  <DialogTrigger asChild>
                    <button type="button" className={cn(topicLink, "border-l border-[#ddc8bb] dark:border-[#573e40]")}>
                      All topics <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="w-[calc(100%-2rem)] max-h-[75dvh] overflow-y-auto [&>button]:h-11 [&>button]:w-11" aria-describedby={undefined}>
                    <DialogTitle className="pr-12">All topics</DialogTitle>
                    <ul className="grid grid-cols-1 gap-1 rounded-lg border border-border bg-muted/30 p-2 sm:grid-cols-2">
                      {categoryNames.map((category) => (
                        <li key={category}>
                          <DialogClose asChild>
                            <Link to={`/category/${categorySlug(category)}`}
                              aria-current={categoryIsCurrent(category) ? "page" : undefined}
                              className={cn(topicLink, "flex w-full justify-start rounded-md whitespace-normal uppercase tracking-wide", categoryIsCurrent(category) && currentTopic)}>
                              {category}
                            </Link>
                          </DialogClose>
                        </li>
                      ))}
                    </ul>
                  </DialogContent>
                </Dialog>
              )}
            </nav>
          </div>
        </header>
      )}

      {!hideBottomNav && (
        <nav aria-label={hideHeader ? "Primary navigation" : "Mobile navigation"} className={cn("bottom-nav", !hideHeader && "lg:hidden")}>
          <div className="flex items-center justify-around h-16 max-w-xl mx-auto px-1">

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
              placeholder="Ask a question, or search articles…"
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
                        onClick={() => { navigate(`/category/${categorySlug(cat)}`); setSearchOpen(false); setQuery(""); }}
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

            {askable && aiLoading && !aiAnswer?.answer && (
              <div className="flex items-center gap-2 border-b border-border bg-[hsl(var(--surface))] px-4 py-3 text-xs text-muted-foreground">
                <LoaderCircle className="h-3.5 w-3.5" animate />
                Reading the archive…
              </div>
            )}

            {aiAnswer?.answer && (
              <div className="border-b border-border bg-[hsl(var(--surface))] px-4 py-4">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="overline text-primary">AI answer</span>
                  <Link
                    to={`/search?q=${encodeURIComponent(query.trim())}&mode=ask`}
                    onClick={() => { setSearchOpen(false); setQuery(""); }}
                    className="inline-flex min-h-11 items-center text-[11px] font-bold uppercase tracking-wider text-primary hover:underline"
                  >
                    Full answer
                  </Link>
                </div>
                <p className="mt-1 font-serif text-sm leading-relaxed text-foreground line-clamp-4">
                  <AnswerText answer={aiAnswer.answer} results={aiAnswer.results} />
                </p>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Written from {aiAnswer.sources.length} published{" "}
                  {aiAnswer.sources.length === 1 ? "story" : "stories"} · AI can misread a story
                </p>
              </div>
            )}

            {shownResults.length > 0 && (
              <div>
                <div className="section-header px-4">
                  <span className="overline">{shownResults.length} Result{shownResults.length !== 1 ? 's' : ''}</span>
                </div>
                {shownResults.map(article => (
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

            {query.trim().length >= 2 && shownResults.length === 0 && !(askable && (aiLoading || aiAnswer?.answer)) && (
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
