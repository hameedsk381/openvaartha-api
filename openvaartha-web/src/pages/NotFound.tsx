import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { useArticles } from "@/lib/api-hooks";
import { BRAND } from "@/lib/brand";

const NotFound = () => {
  const location = useLocation();
  const { data: articles = [] } = useArticles({ limit: 3 });

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const suggestions = articles.slice(0, 3);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="border-b border-border bg-[hsl(var(--surface))]">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-10 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 flex items-center justify-center">
              <img src={BRAND.iconMaroonPath} alt="Open Vaartha" className="h-full w-full object-contain dark:hidden" />
              <img src={BRAND.iconWhitePath} alt="Open Vaartha" className="h-full w-full object-contain hidden dark:block" />
            </div>
            <span className="font-serif text-lg font-bold tracking-tight">
              Open<span className="text-primary">vaartha</span>
            </span>
          </Link>
          <span className="overline text-muted-foreground hidden sm:inline">Error · 404</span>
        </div>
      </div>

      <main className="flex-1 flex items-center">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-10 py-16 sm:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start w-full">
          <div className="lg:col-span-7">
            <span className="overline text-primary">Editorial note</span>
            <div className="font-serif text-[160px] sm:text-[220px] font-bold text-primary/15 leading-[0.85] tracking-tighter mt-2 select-none">
              404
            </div>
            <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight leading-tight mt-2">
              This page is no longer in print.
            </h1>
            <p className="font-serif italic text-base sm:text-lg text-muted-foreground mt-5 max-w-xl leading-relaxed">
              The story you were looking for may have moved, been rewritten, or never made it past our editors.
              The archive remains open — try one of the suggestions to the right.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/"
                className="inline-flex items-center gap-2 h-12 px-5 rounded-md bg-primary text-white text-xs font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors press"
              >
                <ArrowLeft className="h-4 w-4" /> Back to today's feed
              </Link>
              <Link
                to="/"
                className="inline-flex items-center gap-2 h-12 px-5 rounded-md border border-border text-xs font-semibold uppercase tracking-wider hover:border-primary hover:text-primary transition-colors press"
              >
                Search the archive <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>

            <p className="mt-10 pt-6 border-t border-border text-[11px] text-muted-foreground font-mono break-all">
              Tried URL: {location.pathname}
            </p>
          </div>

          <aside className="lg:col-span-5">
            <div className="px-6 py-5 border-b border-border">
              <p className="overline text-primary">While you're here</p>
              <h3 className="font-serif text-xl font-bold tracking-tight mt-1">
                Worth reading instead
              </h3>
            </div>
            <ol className="border-l border-r border-b border-border">
              {suggestions.map((a, i) => (
                <li key={a.id} className="border-b border-border last:border-0">
                  <Link
                    to={`/article/${a.slug}`}
                    className="group flex gap-4 px-6 py-5 hover:bg-[hsl(var(--surface))] transition-colors press"
                  >
                    <span className="font-serif text-3xl font-bold text-primary/30 group-hover:text-primary transition-colors leading-none w-9 shrink-0 pt-0.5">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="overline text-primary">{a.category}</span>
                      <h4 className="font-serif text-base font-bold leading-snug tracking-tight mt-1 group-hover:text-primary transition-colors line-clamp-3">
                        {a.title}
                      </h4>
                      <span className="text-[11px] text-muted-foreground font-medium mt-2 inline-block">
                        {a.readTime} read
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default NotFound;
