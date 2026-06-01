import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Edit, Plus, Trash2, Search, AlertCircle, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import type { Article } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ConfirmDialog from "@/components/ConfirmDialog";

const PAGE_SIZE = 20;

export default function AdminArticles() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Article | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin", "articles", { page, search }],
    queryFn: () => {
      const params = new URLSearchParams({
        skip: String(page * PAGE_SIZE),
        limit: String(PAGE_SIZE),
        include_unpublished: "true",
        include_total: "true",
      });
      if (search) params.set("search", search);
      return apiFetch<{ items: Article[]; total: number }>(`/articles/?${params.toString()}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (articleId: string) => apiFetch<{ message: string }>(`/articles/${articleId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "articles"] });
      toast.success("Article deleted");
      setDeleteTarget(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const statusBadge = (status: Article["status"]) => {
    const map: Record<Article["status"], string> = {
      draft: "bg-muted text-muted-foreground border-border",
      published: "bg-primary/10 text-primary border-primary/20",
      archived: "bg-destructive/10 text-destructive border-destructive/30",
    };
    return (
      <span className={`inline-flex items-center h-5 px-2 rounded-sm text-[10px] font-bold uppercase tracking-wider border ${map[status] ?? map.draft}`}>
        {status ?? "draft"}
      </span>
    );
  };

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Articles</h1>
          <p className="text-sm text-muted-foreground mt-1">Create, edit, and remove published stories.</p>
        </div>
        <Link to="/admin/articles/new">
          <Button>
            <Plus className="h-4 w-4" />
            New article
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search articles by title..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="pl-9"
        />
      </div>

      {/* Error state */}
      {isError && (
        <div className="border border-destructive/30 rounded-xl p-8 text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <p className="text-sm font-semibold text-destructive">Failed to load articles</p>
          <p className="text-xs text-muted-foreground">{(error as Error)?.message}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RotateCcw className="h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-1/4" />
            </div>
          ))}
        </div>
      )}

      {/* Article list */}
      {!isLoading && !isError && (
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="hidden md:grid grid-cols-[1fr_110px_160px_120px_110px] gap-4 h-11 px-5 items-center border-b border-border bg-muted/50 text-xs font-semibold text-muted-foreground">
            <span>Title</span>
            <span>Status</span>
            <span>Category</span>
            <span>Published</span>
            <span className="text-right">Actions</span>
          </div>
          <div className="divide-y divide-border">
            {items.map((article) => (
              <div key={article.id} className="block md:grid md:grid-cols-[1fr_110px_160px_120px_110px] md:gap-4 md:items-center p-4 md:px-5">
                <div className="min-w-0 mb-1.5 md:mb-0">
                  <p className="text-sm font-semibold line-clamp-1">{article.title}</p>
                  <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                    {article.isBreaking ? <span className="text-red-500 font-semibold">Breaking</span> : null}
                    {article.isTrending ? <span className="text-amber-500 font-semibold">Trending</span> : null}
                    {article.isEditorPick ? <span className="text-primary font-semibold">Editor pick</span> : null}
                  </div>
                </div>
                <div className="mb-1 md:mb-0">
                  <span className="text-xs text-muted-foreground md:hidden mr-2">Status:</span>
                  {statusBadge(article.status)}
                </div>
                <div className="mb-1 md:mb-0">
                  <span className="text-xs text-muted-foreground md:hidden mr-2">Category:</span>
                  <span className="text-sm text-muted-foreground">{article.category || "General"}</span>
                </div>
                <div className="mb-2 md:mb-0">
                  <span className="text-xs text-muted-foreground md:hidden mr-2">Published:</span>
                  <span className="text-sm text-muted-foreground">{new Date(article.publishedAt).toLocaleDateString()}</span>
                </div>
                <div className="flex md:justify-end gap-2">
                  <Link to={`/admin/articles/${article.id}/edit`}>
                    <Button type="button" variant="outline" size="icon" aria-label="Edit article">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setDeleteTarget(article)}
                    aria-label="Delete article"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <div className="p-8 text-sm text-muted-foreground text-center">No articles found.</div>
            )}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{total} articles total</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            {Array.from({ length: totalPages }, (_, i) => (
              <Button
                key={i}
                variant={i === page ? "default" : "outline"}
                size="sm"
                className="w-8"
                onClick={() => setPage(i)}
              >
                {i + 1}
              </Button>
            ))}
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete article"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  );
}
