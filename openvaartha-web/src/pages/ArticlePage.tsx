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

const ArticlePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [scrollProgress, setScrollProgress] = useState(0);
  const { toggleSave, isSaved } = useReadingList();

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
          <p className="text-muted-foreground font-black uppercase tracking-[0.2em] mb-6 opacity-40">Intelligence Missing</p>
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-black text-foreground hover:translate-x-1 transition-all">
            <ArrowLeft className="h-4 w-4" /> Return to feed
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

      <main className="relative z-10 mx-auto max-w-[800px] px-6 sm:px-12 pt-24 sm:pt-40" role="main">
        {/* Trust Header */}
        <div className="mb-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
           {/* Category & Status */}
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-full">
              {article.category}
            </span>
            {article.isBreaking && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-full animate-pulse">
                <Zap className="h-3 w-3 fill-white" /> Breaking
              </span>
            )}
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-foreground tracking-tighter leading-[0.95] sm:leading-[0.85]">
            {article.title}
          </h1>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-4 pt-4 border-t border-black/5 pb-8">
            <div className="flex items-center gap-2 group cursor-pointer">
              <div className="h-8 w-8 rounded-full bg-black/5 flex items-center justify-center border border-black/5 group-hover:bg-primary/5 transition-colors">
                <User className="h-4 w-4 opacity-40 group-hover:opacity-100 group-hover:text-primary transition-all" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40">By Intelligence Desk</span>
                <span className="text-xs font-bold text-foreground">{article.author}</span>
              </div>
            </div>
            
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40 flex items-center gap-1.5">
                <Clock className="h-3 w-3" /> Released
              </span>
              <span className="text-xs font-bold text-foreground tabular-nums">{publishedDate}</span>
            </div>

            {lastUpdatedDate && (
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40 flex items-center gap-1.5">
                  <History className="h-3 w-3" /> Updated
                </span>
                <span className="text-xs font-bold text-primary tabular-nums">{lastUpdatedDate} IST</span>
              </div>
            )}
          </div>
        </div>

        {/* TL;DR Section - High Clarity */}
        <section className="mb-16 p-8 sm:p-12 bg-black/[0.03] rounded-[2.5rem] border border-black/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-20 transition-opacity">
            <Info className="h-24 w-24 text-primary" />
          </div>
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-2.5 text-primary text-[10px] font-black uppercase tracking-[0.4em]">
              <Sparkles className="h-4 w-4" /> The Intelligence Brief
            </div>
            <p className="text-xl sm:text-3xl font-black text-foreground tracking-tight leading-tight">
              {article.content.tldr}
            </p>
          </div>
        </section>

        {/* Highlights - Fast Scanning (Bullet Format) */}
        <section className="mb-16 space-y-10">
          <div className="inline-flex flex-col">
            <h2 className="text-sm font-black uppercase tracking-[0.4em] text-foreground mb-1.5 opacity-30">Critical Insights</h2>
            <div className="h-1 w-12 bg-primary" />
          </div>
          <div className="grid grid-cols-1 gap-6">
            {article.content.points.map((point, i) => (
              <div key={i} className="flex gap-6 group hover:translate-x-2 transition-transform">
                <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-2xl bg-black/5 border border-black/5 text-[11px] font-black text-primary group-hover:bg-primary group-hover:text-white transition-all transform group-hover:rotate-6">
                  {i + 1}
                </div>
                <p className="text-lg font-bold text-foreground/80 leading-snug pt-1.5">{point}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Featured Image */}
        <figure className="mb-16 rounded-[3rem] overflow-hidden border border-black/5 shadow-glass-lg group">
          <img 
            src={getArticleImage(article.thumbnail)} 
            alt={article.title} 
            className="w-full aspect-[16/9] object-cover grayscale brightness-90 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-1000"
            onError={handleImageFallback}
          />
        </figure>

        {/* Full Article - Standard Formatting */}
        <div className="prose prose-lg max-w-none mb-24">
          <div className="space-y-8">
            {article.content.body.split("\n\n").map((para, i) => (
              <p key={i} className="text-lg sm:text-xl font-medium text-foreground/75 leading-relaxed tracking-tight">
                {para}
              </p>
            ))}
          </div>
        </div>

        {/* Article Timeline - Optional Differentiator */}
        {article.content.timeline && (
          <section className="mb-24 p-10 bg-primary/5 rounded-[3rem] border border-primary/10">
            <h3 className="text-2xl font-black text-primary tracking-tighter uppercase mb-10">Event Timeline</h3>
            <div className="space-y-8">
              {article.content.timeline.map((item, i) => (
                <div key={i} className="flex gap-6 relative">
                  {i !== article.content.timeline!.length - 1 && (
                    <div className="absolute top-10 left-3 w-px h-12 bg-primary/20" />
                  )}
                  <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <div className="h-2 w-2 rounded-full bg-white" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] font-black text-primary/40 uppercase tracking-widest">{item.date}</div>
                    <p className="text-base font-bold text-foreground/80">{item.event}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Instagram Social Evidence */}
        {article.instagramUrl && (
          <section className="mb-24">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground opacity-40 mb-8">Social Dispatch</h3>
            <InstagramEmbed url={article.instagramUrl} />
          </section>
        )}

        {/* References / Trust Layer */}
        {article.sources && (
          <section className="mb-24 py-12 border-t border-black/5">
            <div className="flex items-center gap-3 mb-8">
              <ExternalLink className="h-4 w-4 text-primary opacity-40" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground opacity-40">Verifiable Dispatches</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {article.sources.map((source, i) => (
                <div key={i} className="px-4 py-2 bg-black/5 rounded-xl text-xs font-black text-foreground/60 border border-black/5 hover:bg-black/10 transition-all cursor-default">
                  {source}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Related Articles - Engagement Loop */}
        <section className="pt-24 border-t-2 border-black/5">
          <div className="flex items-end justify-between mb-12">
            <h2 className="text-3xl font-black text-foreground tracking-tighter uppercase">Related Dossiers</h2>
            <Link to="/" className="text-[10px] font-black text-primary uppercase tracking-[0.3em] hover:gap-2 transition-all flex items-center gap-1.5">
              Back to Feed <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-12">
            {recommendations.map((a) => (
              <FeedCard key={a.id} article={a} />
            ))}
          </div>
        </section>

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
