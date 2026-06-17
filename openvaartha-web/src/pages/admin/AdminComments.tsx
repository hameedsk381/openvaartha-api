import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AlertCircle, ChevronLeft, ChevronRight, Loader2, MessageSquare, RotateCcw, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ConfirmDialog";

const PAGE_SIZE = 50;

type Comment = {
  id: string;
  articleId?: string;
  article_id?: string;
  body: string;
  authorName?: string;
  author_name?: string;
  authorEmail?: string;
  author_email?: string;
  createdAt?: string;
  created_at?: string;
  isActive?: boolean;
  is_active?: boolean;
  likes?: string[];
};

export default function AdminComments() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [showInactive, setShowInactive] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Comment | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin", "comments", { page, showInactive }],
    queryFn: () => {
      const params = new URLSearchParams({
        skip: String(page * PAGE_SIZE),
        limit: String(PAGE_SIZE),
        include_total: "true",
      });
      return apiFetch<{ items: Comment[]; total: number }>(`/admin/comments?${params.toString()}`);
    },
  });

  const comments = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const displayed = showInactive ? comments : comments.filter((c) => {
    const active = c.isActive ?? c.is_active ?? true;
    return active;
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: string) =>
      apiFetch(`/comments/${commentId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "comments"] });
      toast.success("Comment deleted");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Comments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {comments.length} total
            {!showInactive && ` (${comments.filter((c) => c.isActive ?? c.is_active ?? true).length} active)`}
          </p>
        </div>
        <Button
          type="button"
          variant={showInactive ? "default" : "outline"}
          size="sm"
          onClick={() => setShowInactive((v) => !v)}
        >
          {showInactive ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {showInactive ? "Active only" : "Show deleted"}
        </Button>
      </div>

      {isError && (
        <div className="border border-destructive/30 rounded-xl p-8 text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <p className="text-sm font-semibold text-destructive">Failed to load comments</p>
          <p className="text-xs text-muted-foreground">{(error as Error)?.message}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RotateCcw className="h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="h-48 flex items-center justify-center">
          <Loader2 className="h-7 w-7 text-primary animate-spin" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl flex flex-col items-center justify-center py-16 text-center space-y-3">
          <MessageSquare className="h-8 w-8 text-primary/40" />
          <p className="text-sm font-semibold text-foreground">No comments yet</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
          {displayed.map((comment) => {
            const isActive = comment.isActive ?? comment.is_active ?? true;
            const name = comment.authorName ?? comment.author_name ?? "Anonymous";
            const email = comment.authorEmail ?? comment.author_email ?? "";
            const date = comment.createdAt ?? comment.created_at ?? "";
            return (
              <div key={comment.id} className={cn("p-4 space-y-2", !isActive && "opacity-50")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold line-clamp-1">{name}</p>
                    {email && <p className="text-xs text-muted-foreground">{email}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!isActive && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-red-500 border border-red-200 rounded-sm px-1.5">Deleted</span>
                    )}
                    <span className="text-[11px] text-muted-foreground">{date ? new Date(date).toLocaleDateString() : ""}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setDeleteTarget(comment)}
                      title="Delete comment"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{comment.body}</p>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{total} comments total</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" /> Previous
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
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete comment"
        description={deleteTarget ? `Delete comment by "${deleteTarget.authorName ?? deleteTarget.author_name ?? "Anonymous"}"? This cannot be undone.` : ""}
        confirmLabel="Delete"
        onConfirm={() => { if (deleteTarget) { deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null); } }}
      />
    </div>
  );
}


