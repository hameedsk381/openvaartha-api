import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Edit, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import type { Article } from "./types";

export default function AdminArticles() {
  const queryClient = useQueryClient();
  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["admin", "articles"],
    queryFn: () => apiFetch<Article[]>("/articles/?limit=100&include_unpublished=true"),
  });

  const statusBadge = (status: Article["status"]) => {
    const map: Record<Article["status"], string> = {
      draft: "bg-muted text-muted-foreground border-border",
      published: "bg-[hsl(var(--primary-subtle))] text-primary border-primary/20",
      archived: "bg-destructive/10 text-destructive border-destructive/30",
    };
    return (
      <span
        className={`inline-flex items-center h-5 px-2 rounded-sm text-[10px] font-bold uppercase tracking-wider border ${map[status] ?? map.draft}`}
      >
        {status ?? "draft"}
      </span>
    );
  };

  const deleteMutation = useMutation({
    mutationFn: (articleId: string) => apiFetch<{ message: string }>(`/articles/${articleId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "articles"] });
      toast.success("Article deleted");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Articles</h1>
          <p className="text-sm text-muted-foreground mt-1">Create, edit, and remove published stories.</p>
        </div>
        <Link to="/admin/articles/new" className="h-10 px-4 rounded-md bg-primary text-white text-sm font-semibold inline-flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New article
        </Link>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="hidden md:grid grid-cols-[1fr_110px_160px_120px_110px] gap-4 h-11 px-4 items-center border-b border-border bg-[hsl(var(--surface))] text-xs font-semibold text-muted-foreground">
          <span>Title</span>
          <span>Status</span>
          <span>Category</span>
          <span>Published</span>
          <span className="text-right">Actions</span>
        </div>
        <div className="divide-y divide-border">
          {articles.map((article) => (
            <div key={article.id} className="grid md:grid-cols-[1fr_110px_160px_120px_110px] gap-3 md:gap-4 p-4 md:items-center">
              <div className="min-w-0">
                <p className="text-sm font-semibold line-clamp-1">{article.title}</p>
                <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                  {article.isBreaking ? <span>Breaking</span> : null}
                  {article.isTrending ? <span>Trending</span> : null}
                  {article.isEditorPick ? <span>Editor pick</span> : null}
                </div>
              </div>
              <div>{statusBadge(article.status)}</div>
              <span className="text-sm text-muted-foreground">{article.category || "General"}</span>
              <span className="text-sm text-muted-foreground">{new Date(article.publishedAt).toLocaleDateString()}</span>
              <div className="flex md:justify-end gap-2">
                <Link to={`/admin/articles/${article.id}/edit`} className="h-9 w-9 rounded-md border border-border inline-flex items-center justify-center hover:bg-[hsl(var(--surface))]" aria-label="Edit article">
                  <Edit className="h-4 w-4" />
                </Link>
                <button
                  onClick={() => {
                    if (window.confirm("Delete this article?")) deleteMutation.mutate(article.id);
                  }}
                  className="h-9 w-9 rounded-md border border-border inline-flex items-center justify-center text-red-600 hover:bg-red-50"
                  aria-label="Delete article"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {!isLoading && articles.length === 0 ? (
            <div className="p-8 text-sm text-muted-foreground">No articles found.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
