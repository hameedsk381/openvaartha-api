import { articles } from "@/data/mockArticles";
import { Link } from "react-router-dom";
import { getArticleImage, handleImageFallback } from "@/lib/utils";
import { Clock, CalendarDays, ArrowUpRight } from "lucide-react";

export default function PortalHistory() {
  const history = articles.slice(0, 8);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p className="overline text-primary mb-1">Timeline</p>
        <h1 className="text-2xl font-black tracking-tight">Reading History</h1>
        <p className="text-sm font-semibold text-muted-foreground mt-1">{history.length} articles read</p>
      </div>

      <div className="space-y-6">
        {["Today", "Yesterday"].map((group, gi) => (
          <div key={group}>
            <div className="section-header mb-0">
              <span className="overline text-primary flex items-center gap-1.5">
                <CalendarDays className="h-3 w-3" /> {group}
              </span>
            </div>
            <div className="border border-border rounded-xl overflow-hidden divide-y divide-border mt-2 bg-white dark:bg-zinc-900">
              {history.slice(gi * 4, gi * 4 + 4).map((article) => (
                <Link
                  key={article.id}
                  to={`/article/${article.slug}`}
                  className="flex items-center gap-3 p-3 hover:bg-[hsl(var(--surface))] transition-colors press group/row"
                >
                  <div className="h-12 w-16 rounded-lg overflow-hidden bg-secondary/30 shrink-0">
                    <img
                      src={getArticleImage(article.thumbnail)}
                      alt=""
                      className="w-full h-full object-cover transition-transform group-hover/row:scale-[1.03]"
                      onError={handleImageFallback}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="tag mb-1.5">{article.category}</span>
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
    </div>
  );
}
