import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { handleImageFallback } from "@/lib/utils";
import { Clock, CalendarDays, ArrowUpRight, History, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";

type HistoryArticle = {
  id: string;
  slug: string;
  title: string;
  category?: string;
  readTime: string;
  thumbnailUrl?: string | null;
  publishedAt?: string;
};

const fetchReadingHistory = async (): Promise<HistoryArticle[]> => {
  return apiFetch<HistoryArticle[]>("/users/me/history");
};

const groupLabel = (publishedAt?: string) => {
  if (!publishedAt) return "Earlier";

  const articleDate = new Date(publishedAt);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (articleDate.toDateString() === today.toDateString()) return "Today";
  if (articleDate.toDateString() === yesterday.toDateString()) return "Yesterday";
  return "Earlier";
};

export default function PortalHistory() {
  const { data: history = [], isLoading, isError } = useQuery({
    queryKey: ["reading-history"],
    queryFn: fetchReadingHistory,
  });

  const grouped = history.reduce<Record<string, HistoryArticle[]>>((groups, article) => {
    const label = groupLabel(article.publishedAt);
    groups[label] = [...(groups[label] || []), article];
    return groups;
  }, {});

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p className="overline text-primary mb-1">Timeline</p>
        <h1 className="text-2xl font-black tracking-tight">Reading History</h1>
        <p className="text-sm font-semibold text-muted-foreground mt-1">{history.length} articles read</p>
      </div>

      {isLoading ? (
        <div className="h-48 flex items-center justify-center">
          <Loader2 className="h-7 w-7 text-primary animate-spin" />
        </div>
      ) : isError || history.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl bg-[hsl(var(--surface))] flex flex-col items-center justify-center py-16 px-8 text-center space-y-3">
          <History className="h-8 w-8 text-primary/40" />
          <div>
            <p className="text-sm font-black text-foreground">
              {isError ? "History unavailable" : "No reading history yet"}
            </p>
            <p className="text-xs font-medium text-muted-foreground mt-1">
              {isError ? "Try again after signing in." : "Read articles to build your timeline."}
            </p>
          </div>
          <Link to="/" className="text-xs font-black text-primary hover:underline underline-offset-4 transition-all">
            Browse Feed
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {["Today", "Yesterday", "Earlier"].filter((group) => grouped[group]?.length).map((group) => (
            <div key={group}>
              <div className="section-header mb-0">
                <span className="overline text-primary flex items-center gap-1.5">
                  <CalendarDays className="h-3 w-3" /> {group}
                </span>
              </div>
              <div className="border border-border rounded-xl overflow-hidden divide-y divide-border mt-2 bg-card">
                {grouped[group].map((article) => (
                  <Link
                    key={article.id}
                    to={`/article/${article.slug}`}
                    className="flex items-center gap-3 p-3 hover:bg-[hsl(var(--surface))] transition-colors press group/row"
                  >
                    {article.thumbnailUrl && (
                      <div className="h-12 w-16 rounded-lg overflow-hidden bg-secondary/30 shrink-0">
                        <img
                          src={article.thumbnailUrl}
                          alt=""
                          className="w-full h-full object-cover transition-transform group-hover/row:scale-[1.03]"
                          onError={handleImageFallback}
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      {article.category ? <span className="tag mb-1.5">{article.category}</span> : null}
                      <p className="text-xs font-bold text-foreground group-hover/row:text-primary transition-colors leading-snug line-clamp-2">{article.title}</p>
                      <div className="flex items-center gap-1 mt-1 text-[10px] font-medium text-muted-foreground">
                        <Clock className="h-2.5 w-2.5" /> {article.readTime}
                      </div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
