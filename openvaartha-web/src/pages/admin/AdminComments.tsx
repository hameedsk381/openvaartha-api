import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AlertCircle, MessageSquare } from "lucide-react";
import { ChevronLeft } from "@/components/animate-ui/icons/chevron-left";
import { ChevronRight } from "@/components/animate-ui/icons/chevron-right";
import { ChevronDown } from "@/components/animate-ui/icons/chevron-down";
import { ChevronUp } from "@/components/animate-ui/icons/chevron-up";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { RotateCcw } from "@/components/animate-ui/icons/rotate-ccw";
import { Trash2 } from "@/components/animate-ui/icons/trash-2";
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
  article_title?: string;
  article_slug?: string;
};

export default function AdminComments() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [showInactive, setShowInactive] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Comment | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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

  const approveMutation = useMutation({
    mutationFn: (commentId: string) =>
      apiFetch(`/admin/comments/${commentId}/approve`, { method: "PUT" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "comments"] });
      toast.success("Comment approved");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const bulkModerateMutation = useMutation({
    mutationFn: ({ action }: { action: "approve" | "delete" }) =>
      apiFetch("/admin/comments/bulk-moderate", {
        method: "POST",
        body: JSON.stringify({ comment_ids: selectedIds, action }),
      }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "comments"] });
      toast.success(data.message || "Comments updated");
      setSelectedIds([]);
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
          {showInactive ? <ChevronUp className="h-3.5 w-3.5" animateOnHover /> : <ChevronDown className="h-3.5 w-3.5" animateOnHover />}
          {showInactive ? "Active only" : "Show deleted"}
        </Button>
      </div>

      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between p-3 rounded-lg border border-primary/20 bg-[hsl(var(--primary-subtle))]">
          <span className="text-xs font-bold text-primary">{selectedIds.length} comments selected</span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => bulkModerateMutation.mutate({ action: "approve" })}
              disabled={bulkModerateMutation.isPending}
            >
              Approve Selected
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => bulkModerateMutation.mutate({ action: "delete" })}
              disabled={bulkModerateMutation.isPending}
            >
              Delete Selected
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds([])}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {isError && (
        <div className="border border-destructive/30 rounded-xl p-8 text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <p className="text-sm font-semibold text-destructive">Failed to load comments</p>
          <p className="text-xs text-muted-foreground">{(error as Error)?.message}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RotateCcw className="h-3.5 w-3.5" animateOnHover /> Retry
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="h-48 flex items-center justify-center">
          <LoaderCircle className="h-7 w-7 text-primary" animate />
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
            const isChecked = selectedIds.includes(comment.id);

            const toggleSelect = () => {
              setSelectedIds((prev) =>
                isChecked ? prev.filter((id) => id !== comment.id) : [...prev, comment.id]
              );
            };

            return (
              <div key={comment.id} className={cn("p-4 flex gap-3 items-start", !isActive && "opacity-60 bg-muted/20")}>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={toggleSelect}
                  className="mt-1.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer shrink-0"
                />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold truncate">{name}</p>
                        {comment.article_title && (
                          <span className="text-xs text-muted-foreground">
                            on{" "}
                            <a
                              href={`/article/${comment.article_slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline font-semibold"
                            >
                              {comment.article_title}
                            </a>
                          </span>
                        )}
                      </div>
                      {email && <p className="text-xs text-muted-foreground truncate">{email}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!isActive && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-red-500 border border-red-200 bg-red-50/50 rounded-sm px-1.5 py-0.5">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          Deleted
                        </span>
                      )}
                      <span className="text-[11px] text-muted-foreground">{date ? new Date(date).toLocaleDateString() : ""}</span>
                      
                      {!isActive && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs font-semibold px-2 py-0"
                          onClick={() => approveMutation.mutate(comment.id)}
                          disabled={approveMutation.isPending}
                        >
                          Approve
                        </Button>
                      )}
                      {isActive && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(comment)}
                          title="Delete comment"
                        >
                          <Trash2 className="h-3.5 w-3.5" animateOnHover />
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed break-words">{comment.body}</p>
                </div>
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
              <ChevronLeft className="h-4 w-4" animateOnHover /> Previous
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
              Next <ChevronRight className="h-4 w-4" animateOnHover />
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


