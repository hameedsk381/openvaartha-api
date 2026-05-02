import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { articles, Article } from "@/data/mockArticles";
import Navbar from "@/components/Navbar";
import FeedCard from "@/components/FeedCard";
import {
  Share2, Bookmark, Check, ChevronRight, ArrowLeft,
  Clock, Calendar, Sparkles, ArrowUpRight,
  User, ExternalLink, History, Info,
  Zap
} from "lucide-react";
import { cn, getArticleImage, handleImageFallback } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useReadingList } from "@/hooks/use-reading-list";
import { toast } from "sonner";
import InstagramEmbed from "@/components/InstagramEmbed";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const timeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

const TEXT_SIZES = ["text-base", "text-lg", "text-xl"] as const;
type TextSize = typeof TEXT_SIZES[number];
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

  const cycleTextSize = (dir: 1 | -1) => {
    const next = Math.max(0, Math.min(TEXT_SIZES.length - 1, textSizeIdx + dir));
    setTextSizeIdx(next);
    localStorage.setItem("article-text-size", String(next));
  };

  const article = articles.find((a) => a.slug === slug);
  
  useEffect(() => {
    window.scrollTo(0, 0);
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (window.scrollY / totalHeight) * 100;
      setScrollProgress(progress);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [slug]);

  if (!article) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="mx-auto max-w-2xl px-5 py-24 text-center">
          <p className="text-muted-foreground text-sm mb-6">Article not found.</p>
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-foreground hover:translate-x-1 transition-all">
            <ArrowLeft className="h-4 w-4" /> Back to feed
          </Link>
        </div>
      </div>
    );
  }

  const recommendations = articles.filter((a) => a.id !== article.id && a.category === article.category).slice(0, 2);

  const publishedDate = new Date(article.publishedAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  
  const lastUpdatedDate = article.lastUpdated ? new Date(article.lastUpdated).toLocaleTimeString("en-IN", {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }) : null;

  return (
    <div className="relative min-h-screen bg-background selection:bg-primary/10 selection:text-primary pb-24 sm:pb-32">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-[60] h-1 bg-black/5">
        <div className="h-full bg-primary transition-[width] duration-300 ease-out" style={{ width: `${scrollProgress}%` }} />
      </div>

      <Navbar />

      <main className="relative z-10 mx-auto max-w-[680px] px-6 sm:px-8 pt-24 sm:pt-32" role="main">
        {/* Trust Header */}
        <div className="mb-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
           {/* Category & Status */}
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 bg-primary text-white text-[11px] font-semibold rounded-full">
              {article.category}
            </span>
            {article.isBreaking && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-black text-white text-[11px] font-semibold rounded-full">
                <Zap className="h-3 w-3 fill-white" /> Breaking
              </span>
            )}
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold text-foreground tracking-tight leading-[1.1]">
            {article.title}
          </h1>

          <div className="flex flex-wrap items-center justify-between gap-y-4 pt-4 border-t border-black/5 pb-6">
            {/* Author + dates */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-black/5 flex items-center justify-center">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] text-muted-foreground">By</span>
                  <span className="text-sm font-medium text-foreground">{article.author}</span>
                </div>
              </div>

              <div className="flex flex-col">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Published
                </span>
                <span className="text-sm font-medium text-foreground tabular-nums">
                  {publishedDate} · <span className="text-muted-foreground">{timeAgo(article.publishedAt)}</span>
                </span>
              </div>

              {article.lastUpdated && (
                <div className="flex flex-col">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <History className="h-3 w-3" /> Updated
                  </span>
                  <span className="text-sm font-medium text-primary tabular-nums">
                    {timeAgo(article.lastUpdated)}
                  </span>
                </div>
              )}
            </div>

            {/* Text size control */}
            <div className="flex items-center gap-1 border border-border rounded-lg overflow-hidden">
              {TEXT_SIZE_LABELS.map((label, i) => (
                <button
                  key={label}
                  onClick={() => setTextSizeIdx(i)}
                  className={cn(
                    "h-11 w-11 text-sm font-medium transition-colors",
                    textSizeIdx === i
                      ? "bg-primary text-white"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                  aria-label={`Text size ${label}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary */}
        <section className="mb-12 p-6 sm:p-8 bg-black/[0.03] rounded-2xl border border-black/5">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary text-xs font-semibold">
              <Sparkles className="h-4 w-4" /> Summary
            </div>
            <p className="text-lg sm:text-xl font-medium text-foreground leading-snug">
              {article.content.tldr}
            </p>
          </div>
        </section>

        {/* Key points */}
        <section className="mb-12 space-y-6">
          <h2 className="text-sm font-semibold text-foreground">Key points</h2>
          <div className="grid grid-cols-1 gap-4">
            {article.content.points.map((point, i) => (
              <div key={i} className="flex gap-4">
                <div className="h-7 w-7 shrink-0 flex items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {i + 1}
                </div>
                <p className="text-base text-foreground leading-relaxed pt-0.5">{point}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Featured Image */}
        <figure className="mb-12 rounded-2xl overflow-hidden border border-black/5">
          <img
            src={getArticleImage(article.thumbnail)}
            alt={article.title}
            className="w-full aspect-[16/9] object-cover"
            onError={handleImageFallback}
          />
        </figure>

        {/* Full Article */}
        <div className="mb-20">
          <div className="space-y-6">
            {article.content.body.split("\n\n").map((para, i) => (
              <p key={i} className={cn(textSize, "text-foreground leading-relaxed transition-[font-size]")}>
                {para}
              </p>
            ))}
          </div>
        </div>

        {/* Article Timeline */}
        {article.content.timeline && (
          <section className="mb-20 p-8 bg-primary/5 rounded-2xl border border-primary/10">
            <h3 className="text-lg font-semibold text-primary mb-8">Timeline</h3>
            <div className="space-y-6">
              {article.content.timeline.map((item, i) => (
                <div key={i} className="flex gap-4 relative">
                  {i !== article.content.timeline!.length - 1 && (
                    <div className="absolute top-7 left-2.5 w-px h-10 bg-primary/20" />
                  )}
                  <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-white" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-primary">{item.date}</div>
                    <p className="text-base text-foreground">{item.event}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Instagram */}
        {article.instagramUrl && (
          <section className="mb-20">
            <h3 className="text-sm font-semibold text-foreground mb-6">From social</h3>
            <InstagramEmbed url={article.instagramUrl} />
          </section>
        )}

        {/* Sources */}
        {article.sources && (
          <section className="mb-20 py-10 border-t border-black/5">
            <div className="flex items-center gap-2 mb-6">
              <ExternalLink className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Sources</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {article.sources.map((source, i) => (
                <div key={i} className="px-3 py-1.5 bg-black/5 rounded-lg text-xs font-medium text-foreground/70 border border-black/5">
                  {source}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Related Articles */}
        <section className="pt-16 border-t border-black/5">
          <div className="flex items-end justify-between mb-8">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">Related stories</h2>
            <Link to="/" className="text-xs font-medium text-primary hover:gap-2 transition-all flex items-center gap-1">
              Back to feed <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
            {recommendations.map((a) => (
              <FeedCard key={a.id} article={a} />
            ))}
          </div>
        </section>

        {/* Newsletter — after related, contextually relevant */}
        <div className="mt-16 rounded-2xl gradient-maroon p-6 sm:p-8">
          <p className="text-xs font-medium text-white/70 mb-1">Daily newsletter</p>
          <h3 className="text-lg font-bold text-white mb-1">The morning briefing</h3>
          <p className="text-sm text-white/70 mb-4">Regional and national news, summarised. Delivered every morning at 8 AM.</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              placeholder="your@email.com"
              className="flex-1 h-10 px-4 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/40 text-sm focus:outline-none focus:border-secondary/60 transition-colors"
            />
            <button className="h-10 px-5 rounded-lg bg-secondary text-[hsl(var(--secondary-foreground))] text-sm font-semibold hover:bg-beige-200 transition-colors whitespace-nowrap">
              Subscribe
            </button>
          </div>
          <p className="text-[11px] text-white/40 mt-3">No spam. Unsubscribe any time.</p>
        </div>

      </main>
    </div>
  );
};

const ArrowRight = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="3" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

export default ArticlePage;
