import { useReadingList } from "@/hooks/use-reading-list";
import { Link } from "react-router-dom";
import { handleImageFallback } from "@/lib/utils";
import { Clock, Trash2, ArrowUpRight, BookmarkX } from "lucide-react";

export default function PortalSaved() {
  const { saved, remove } = useReadingList();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p className="overline text-primary mb-1">Library</p>
        <h1 className="text-2xl font-black tracking-tight">Saved Articles</h1>
        <p className="text-sm font-semibold text-muted-foreground mt-1">{saved.length} article{saved.length !== 1 ? 's' : ''} saved</p>
      </div>

      {saved.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl bg-[hsl(var(--surface))] flex flex-col items-center justify-center py-16 px-8 text-center space-y-3">
          <BookmarkX className="h-8 w-8 text-primary/40" />
          <div>
            <p className="text-sm font-black text-foreground">Nothing saved yet</p>
            <p className="text-xs font-medium text-muted-foreground mt-1">Bookmark articles while reading to build your library</p>
          </div>
          <Link to="/" className="text-xs font-black text-primary hover:underline underline-offset-4 transition-all">
            Browse Feed
          </Link>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
          {saved.map((article) => (
            <div key={article.id} className="flex items-start gap-3 p-3 hover:bg-[hsl(var(--surface))] transition-colors group/row">
              <Link to={`/article/${article.slug}`} className="shrink-0 press">
                {article.thumbnailUrl && (
                  <div className="h-14 w-20 rounded-lg overflow-hidden bg-secondary/30">
                    <img
                      src={article.thumbnailUrl}
                      alt=""
                      className="w-full h-full object-cover transition-transform group-hover/row:scale-[1.03]"
                      onError={handleImageFallback}
                    />
                  </div>
                )}
              </Link>

              <Link to={`/article/${article.slug}`} className="flex-1 min-w-0 press">
                <span className="tag mb-1.5">{article.category}</span>
                <p className="text-sm font-bold leading-snug text-foreground group-hover/row:text-primary transition-colors line-clamp-2">{article.title}</p>
                <div className="flex items-center gap-1 mt-1.5 text-[10px] font-medium text-muted-foreground">
                  <Clock className="h-2.5 w-2.5" /> {article.readTime}
                </div>
              </Link>

              <button
                onClick={() => remove(article.id)}
                className="h-10 w-10 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors press shrink-0 mt-0.5"
                aria-label="Remove"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
