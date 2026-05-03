import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { articles } from "@/data/mockArticles";
import Navbar from "@/components/Navbar";
import {
  Share2, Bookmark, BookmarkCheck, ArrowLeft, ArrowUpRight,
  Clock, Sparkles, User, ExternalLink, History, Type, Flame,
} from "lucide-react";
import { cn, getArticleImage, handleImageFallback } from "@/lib/utils";
import { useReadingList } from "@/hooks/use-reading-list";
import { toast } from "sonner";
import InstagramEmbed from "@/components/InstagramEmbed";

const timeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const TEXT_SIZES = ["text-base", "text-lg", "text-xl"] as const;
const TEXT_SIZE_LABELS = ["A−", "A", "A+"];

const ArticlePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [scrollProgress, setScrollProgress] = useState(0);
  const { toggleSave, isSaved } = useReadingList();
  const [textSizeIdx, setTextSizeIdx] = useState<number>(() => {
    const stored = localStorage.getItem("article-text-size");
    return stored ? parseInt(stored) : 1;
  });
  const textSize = TEXT_SIZES[textSizeIdx];

  const cycleTextSize = (i: number) => {
    setTextSizeIdx(i);
    localStorage.setItem("article-text-size", String(i));
  };

  const article = articles.find((a) => a.slug === slug);

  useEffect(() => {
    window.scrollTo(0, 0);
    const onScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(total > 0 ? (window.scrollY / total) * 100 : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [slug]);

  if (!article) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="mx-auto max-w-2xl px-5 py-24 text-center">
          <p className="font-serif italic text-muted-foreground mb-6">Article not found.</p>
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold hover:translate-x-1 transition-all">
            <ArrowLeft className="h-4 w-4" /> Back to feed
          </Link>
        </div>
      </div>
    );
  }

  const recommendations = articles
    .filter((a) => a.id !== article.id && a.category === article.category)
    .slice(0, 3);

  const moreFromOV = articles.filter((a) => a.id !== article.id).slice(0, 4);

  const publishedDate = new Date(article.publishedAt).toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: article.title, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard");
    }
  };

  const bodyParas = article.content.body.split("\n\n");

  return (
    <div className="relative min-h-screen bg-background selection:bg-primary/15 selection:text-primary pb-20">
      {/* Reading progress */}
      <div className="fixed top-0 left-0 right-0 z-[60] h-0.5 bg-black/5 dark:bg-white/5">
        <div
          className="h-full bg-primary transition-[width] duration-150 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      <Navbar />

      <main className="relative z-10 pt-20 sm:pt-24" role="main">

        {/* ── Breadcrumb / back ─────────────────────────────── */}
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to feed
          </Link>
        </div>

        {/* ── Editorial header ─────────────────────────────── */}
        <header className="border-y border-border bg-[hsl(var(--surface))]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-10 py-10 sm:py-16">
            <div className="flex items-center gap-3 mb-5">
              <Link
                to={`/?category=${article.category}`}
                className="overline text-primary hover:underline underline-offset-4"
              >
                {article.category}
              </Link>
              <span className="h-1 w-1 rounded-full bg-border" />
              <span className="text-[11px] text-muted-foreground font-medium tracking-wide">
                {timeAgo(article.publishedAt)}
              </span>
              {article.isBreaking && (
                <>
                  <span className="h-1 w-1 rounded-full bg-border" />
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-primary">
                    Breaking
                  </span>
                </>
              )}
              {article.trending && (
                <>
                  <span className="h-1 w-1 rounded-full bg-border" />
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                    <Flame className="h-3 w-3 fill-current" /> Trending
                  </span>
                </>
              )}
            </div>

            <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] text-foreground">
              {article.title}
            </h1>

            <p className="font-serif text-lg sm:text-xl text-muted-foreground mt-5 sm:mt-6 leading-relaxed max-w-3xl">
              {article.summary}
            </p>

            {/* Byline */}
            <div className="flex flex-wrap items-center justify-between gap-4 mt-8 sm:mt-10 pt-6 border-t border-border">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full gradient-maroon flex items-center justify-center shadow-sm">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div className="leading-tight">
                  <div className="overline">By</div>
                  <div className="text-sm font-bold text-foreground">{article.author}</div>
                  <div className="text-[11px] text-muted-foreground font-serif italic mt-0.5">
                    {publishedDate}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {article.lastUpdated && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-primary font-semibold mr-2">
                    <History className="h-3 w-3" /> Updated {timeAgo(article.lastUpdated)}
                  </span>
                )}
                <button
                  onClick={handleShare}
                  className="h-10 w-10 sm:h-10 sm:w-auto sm:px-4 rounded-full border border-border flex items-center justify-center sm:gap-2 hover:bg-primary hover:text-white hover:border-primary transition-colors press"
                  aria-label="Share"
                >
                  <Share2 className="h-4 w-4" />
                  <span className="hidden sm:inline text-xs font-semibold uppercase tracking-wider">Share</span>
                </button>
                <button
                  onClick={() => toggleSave(article)}
                  className={cn(
                    "h-10 w-10 sm:h-10 sm:w-auto sm:px-4 rounded-full border flex items-center justify-center sm:gap-2 transition-colors press",
                    isSaved(article.id)
                      ? "bg-primary text-white border-primary"
                      : "border-border hover:bg-primary hover:text-white hover:border-primary"
                  )}
                  aria-label="Save"
                >
                  {isSaved(article.id)
                    ? <BookmarkCheck className="h-4 w-4 fill-current" />
                    : <Bookmark className="h-4 w-4" />}
                  <span className="hidden sm:inline text-xs font-semibold uppercase tracking-wider">
                    {isSaved(article.id) ? "Saved" : "Save"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* ── Featured image ───────────────────────────────── */}
        <figure className="border-b border-border bg-[hsl(var(--surface-2))]">
          <div className="max-w-6xl mx-auto">
            <img
              src={getArticleImage(article.thumbnail)}
              alt={article.title}
              className="w-full aspect-[16/9] sm:aspect-[21/9] object-cover"
              onError={handleImageFallback}
            />
            <figcaption className="px-4 sm:px-6 lg:px-10 py-3 text-[11px] font-serif italic text-muted-foreground border-t border-border bg-background">
              {article.title} · {article.category}
            </figcaption>
          </div>
        </figure>

        {/* ── Article body + sticky aside ──────────────────── */}
        <div className="max-w-screen-2xl mx-auto grid grid-cols-1 lg:grid-cols-12 px-4 sm:px-6 lg:px-10 py-10 sm:py-16 gap-x-12">

          {/* Sticky aside (desktop) */}
          <aside className="hidden lg:block lg:col-span-3">
            <div className="sticky top-28 space-y-6">
              <div>
                <p className="overline mb-3">In this article</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" /> {article.readTime} read
                </div>
              </div>

              <div className="border-t border-border pt-5">
                <p className="overline mb-3 flex items-center gap-1.5"><Type className="h-3 w-3" /> Text size</p>
                <div className="flex border border-border rounded-md overflow-hidden">
                  {TEXT_SIZE_LABELS.map((label, i) => (
                    <button
                      key={label}
                      onClick={() => cycleTextSize(i)}
                      className={cn(
                        "flex-1 h-10 text-sm font-medium transition-colors",
                        textSizeIdx === i ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"
                      )}
                      aria-label={`Text size ${label}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-border pt-5">
                <p className="overline mb-3">Share this story</p>
                <button
                  onClick={handleShare}
                  className="w-full h-10 px-4 rounded-md border border-border flex items-center justify-center gap-2 hover:bg-primary hover:text-white hover:border-primary transition-colors press"
                >
                  <Share2 className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Share</span>
                </button>
              </div>
            </div>
          </aside>

          {/* Main column */}
          <article className="lg:col-span-7 lg:col-start-4 max-w-2xl">

            {/* Mobile text-size control */}
            <div className="lg:hidden mb-6 flex items-center justify-between border-b border-border pb-4">
              <span className="overline flex items-center gap-1.5"><Type className="h-3 w-3" /> Text size</span>
              <div className="flex border border-border rounded-md overflow-hidden">
                {TEXT_SIZE_LABELS.map((label, i) => (
                  <button
                    key={label}
                    onClick={() => cycleTextSize(i)}
                    className={cn(
                      "h-9 w-10 text-sm font-medium transition-colors",
                      textSizeIdx === i ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* TLDR */}
            <div className="border-l-4 border-primary pl-5 sm:pl-6 mb-10">
              <p className="overline text-primary flex items-center gap-1.5 mb-3">
                <Sparkles className="h-3 w-3" /> The takeaway
              </p>
              <p className="font-serif text-xl sm:text-2xl font-medium text-foreground leading-snug">
                {article.content.tldr}
              </p>
            </div>

            {/* Key points */}
            <section className="mb-12 p-6 sm:p-8 rounded-lg bg-[hsl(var(--surface))] border border-border">
              <p className="overline text-primary mb-5">Key points</p>
              <ol className="space-y-4">
                {article.content.points.map((point, i) => (
                  <li key={i} className="flex gap-4">
                    <span className="font-serif text-xl font-bold text-primary tabular-nums leading-none w-7 shrink-0 pt-0.5">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className="text-base text-foreground leading-relaxed">{point}</p>
                  </li>
                ))}
              </ol>
            </section>

            {/* Body */}
            <div className="space-y-6 sm:space-y-7">
              {bodyParas.map((para, i) => (
                <p
                  key={i}
                  className={cn(
                    textSize,
                    "font-serif text-foreground leading-[1.7] transition-[font-size]",
                    i === 0 &&
                      "first-letter:font-serif first-letter:text-6xl sm:first-letter:text-7xl first-letter:font-bold first-letter:text-primary first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:leading-[0.85]"
                  )}
                >
                  {para}
                </p>
              ))}
            </div>

            {/* Timeline */}
            {article.content.timeline && article.content.timeline.length > 0 && (
              <section className="mt-14 pt-10 border-t border-border">
                <p className="overline text-primary mb-2">How this unfolded</p>
                <h3 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight mb-8">Timeline</h3>
                <ol className="relative border-l-2 border-border pl-6 space-y-7">
                  {article.content.timeline.map((item, i) => (
                    <li key={i} className="relative">
                      <span className="absolute -left-[31px] top-1 h-4 w-4 rounded-full bg-background border-2 border-primary" />
                      <div className="font-serif italic text-xs text-primary uppercase tracking-wider mb-1">
                        {item.date}
                      </div>
                      <p className="font-serif text-base sm:text-lg text-foreground leading-snug">
                        {item.event}
                      </p>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/* Explainer */}
            {article.content.explainer && article.content.explainer.length > 0 && (
              <section className="mt-14 pt-10 border-t border-border">
                <p className="overline text-primary mb-2">Questions answered</p>
                <h3 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight mb-8">In plain English</h3>
                <dl className="space-y-7">
                  {article.content.explainer.map((qa, i) => (
                    <div key={i}>
                      <dt className="font-serif text-lg font-bold text-foreground mb-2">{qa.question}</dt>
                      <dd className="text-base text-muted-foreground leading-relaxed">{qa.answer}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {/* Instagram */}
            {article.instagramUrl && (
              <section className="mt-14 pt-10 border-t border-border">
                <p className="overline text-primary mb-5">From social</p>
                <InstagramEmbed url={article.instagramUrl} />
              </section>
            )}

            {/* Sources */}
            {article.sources && article.sources.length > 0 && (
              <section className="mt-14 pt-10 border-t border-border">
                <p className="overline text-primary mb-2 flex items-center gap-1.5">
                  <ExternalLink className="h-3 w-3" /> Sources & references
                </p>
                <h3 className="font-serif italic text-sm text-muted-foreground mb-5">
                  This story drew on the following primary sources.
                </h3>
                <ul className="flex flex-wrap gap-2">
                  {article.sources.map((source, i) => (
                    <li
                      key={i}
                      className="px-3 py-2 bg-[hsl(var(--surface))] rounded-md text-xs font-medium text-foreground border border-border"
                    >
                      {source}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* End mark */}
            <div className="mt-12 pt-8 border-t border-border flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span className="overline">End of article</span>
            </div>
          </article>

          {/* Right sticky rail (desktop) — Read next */}
          <aside className="hidden lg:block lg:col-span-2">
            <div className="sticky top-28">
              <p className="overline mb-4">Read next</p>
              <ol className="space-y-5">
                {moreFromOV.slice(0, 3).map((a, i) => (
                  <li key={a.id}>
                    <Link to={`/article/${a.slug}`} className="group block press">
                      <div className="font-serif text-2xl font-bold text-primary/30 group-hover:text-primary transition-colors leading-none mb-2">
                        {String(i + 1).padStart(2, "0")}
                      </div>
                      <p className="font-serif text-sm font-bold leading-snug tracking-tight group-hover:text-primary transition-colors line-clamp-3">
                        {a.title}
                      </p>
                      <span className="text-[10px] text-muted-foreground font-medium mt-1.5 inline-block">
                        {a.readTime}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </div>

        {/* ── Related stories ──────────────────────────────── */}
        {recommendations.length > 0 && (
          <section className="border-t border-border bg-[hsl(var(--surface))]">
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 py-12 sm:py-16">
              <div className="flex items-end justify-between mb-8">
                <div>
                  <p className="overline text-primary">More on {article.category}</p>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight mt-1">
                    Continue reading
                  </h2>
                </div>
                <Link
                  to={`/?category=${article.category}`}
                  className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground hover:text-primary transition-colors"
                >
                  All {article.category} <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {recommendations.map((a) => (
                  <Link key={a.id} to={`/article/${a.slug}`} className="group press block">
                    <div className="aspect-[4/3] overflow-hidden rounded-lg bg-[hsl(var(--surface-2))] mb-4">
                      <img
                        src={getArticleImage(a.thumbnail)}
                        alt=""
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                        loading="lazy"
                        onError={handleImageFallback}
                      />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="overline text-primary">{a.category}</span>
                      <span className="h-1 w-1 rounded-full bg-border" />
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {timeAgo(a.publishedAt)}
                      </span>
                    </div>
                    <h3 className="font-serif text-lg font-bold leading-snug tracking-tight group-hover:text-primary transition-colors line-clamp-3">
                      {a.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                      {a.summary}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Newsletter ───────────────────────────────────── */}
        <section className="border-t border-border">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-10 py-14 sm:py-20 text-center">
            <p className="overline text-primary mb-3">The Briefing</p>
            <h3 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight">
              South India, in your inbox by sunrise.
            </h3>
            <p className="font-serif italic text-muted-foreground mt-4 leading-relaxed max-w-xl mx-auto">
              A free morning digest of the stories that matter — curated, never automated.
            </p>
            <form
              onSubmit={(e) => { e.preventDefault(); toast.success("Subscribed (demo)"); }}
              className="mt-8 flex flex-col sm:flex-row gap-2 max-w-md mx-auto"
            >
              <input
                type="email"
                required
                placeholder="your@email.com"
                className="flex-1 h-12 px-4 rounded-md bg-[hsl(var(--surface))] border border-border text-foreground placeholder:text-muted-foreground/60 text-sm focus:outline-none focus:border-primary transition-colors"
              />
              <button
                type="submit"
                className="h-12 px-6 rounded-md bg-primary text-white text-sm font-bold inline-flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors press"
              >
                Subscribe <ArrowUpRight className="h-4 w-4" />
              </button>
            </form>
            <p className="text-[11px] text-muted-foreground/60 mt-4 font-serif italic">
              No spam. Unsubscribe any time.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ArticlePage;
