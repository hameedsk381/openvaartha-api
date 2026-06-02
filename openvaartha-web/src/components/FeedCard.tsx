import { Link } from "react-router-dom";
import { cn, handleImageFallback } from "@/lib/utils";
import type { Article } from "@/lib/types";
import { ChevronRight, ArrowUpRight } from "lucide-react";

interface FeedCardProps {
  article: Article;
  index?: number;
  variant?: "hero" | "grid" | "list" | "compact" | "minimal";
}

const FeedCard = ({ article, index = 0, variant = "grid" }: FeedCardProps) => {
  const delay = Math.min(index * 50, 250);

  return (
    <Link
      to={`/article/${article.slug}`}
      className="block group animate-fade-in relative z-10 w-full h-full"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      <article
        className={cn(
          "relative overflow-hidden transition-all duration-700 h-full flex flex-col group",
          "rounded-2xl sm:rounded-3xl border border-black/5 dark:border-white/5 bg-card shadow-glass-sm hover-lift",
          variant === "list" ? "sm:flex-row" : "",
        )}
      >
        {/* Instagram Look: Top Category Bar (Cream) */}
        {variant !== "minimal" && variant !== "compact" && (
          <div className="flex items-center justify-between border-b border-black/5 bg-secondary/50 px-4 py-3 dark:border-white/5 sm:px-5">
            <span className="text-[9px] font-black uppercase tracking-[0.22em] text-primary dark:text-primary-foreground sm:tracking-[0.3em]">
              {article.category}
            </span>
            <div className="h-1.5 w-1.5 rounded-full bg-primary/20 animate-pulse" />
          </div>

        )}

        {/* Thumbnail Section */}
        {variant !== "minimal" && article.thumbnail && (
          <div className={cn(
            "relative overflow-hidden flex-shrink-0",
            variant === "hero" ? "w-full aspect-[16/9] sm:aspect-[21/9]" :
              variant === "list" ? "w-full sm:w-80 h-full" :
                "w-full aspect-square"
          )} >
            <img
              src={article.thumbnail}
              alt=""
              className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105"
              loading="lazy"
              onError={handleImageFallback}
            />
            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            {article.trending && (
              <div className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full glass bg-white/20 text-white backdrop-blur-md">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            )}
          </div>
        )}

        {/* Content Area */}
        <div className={cn(
          "relative flex-1 flex flex-col justify-between transition-colors",
          "p-4 sm:p-6 lg:p-7",
          variant === "grid" || variant === "hero" 
            ? "bg-primary text-primary-foreground" 
            : "bg-card text-foreground"
        )}>

          <div className="space-y-3.5 sm:space-y-4">
            <h2
              className={cn(
                "font-black text-balance leading-[1.12] tracking-tight transition-transform duration-500 group-hover:translate-x-1",
                variant === "hero" ? "text-2xl sm:text-4xl lg:text-5xl" : "text-lg sm:text-2xl"
              )}
            >
              {article.title}
            </h2>

            {variant !== "compact" && (
              <p className={cn(
                "leading-relaxed opacity-80 font-medium line-clamp-3",
                variant === "hero" ? "text-base sm:text-lg" : "text-sm"
              )}>
                {article.summary}
              </p>
            )}
          </div>

          {/* Footer Card Section */}
          <div className={cn(
            "mt-5 flex items-center justify-between gap-3 border-t border-current/10 pt-4 sm:mt-8 sm:pt-6",
          )}>
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] text-muted-foreground">Read time</span>
              <span className="text-xs font-medium tabular-nums">{article.readTime}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium group/link">
              Read more <ChevronRight className="h-3 w-3 group-hover/link:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
};

export default FeedCard;
