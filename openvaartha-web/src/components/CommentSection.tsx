import { useState } from "react";
import { useComments, useCommentCount, useCreateComment, useDeleteComment, useToggleCommentLike } from "@/lib/api-hooks";
import type { Comment } from "@/lib/types";
import { MessageCircle, Heart, Trash2, Reply, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ConfirmDialog from "./ConfirmDialog";

const timeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

function ReplyForm({
  articleId,
  parentId,
  onCancel,
}: {
  articleId: string;
  parentId: string;
  onCancel: () => void;
}) {
  const [body, setBody] = useState("");
  const createComment = useCreateComment();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    createComment.mutate(
      { articleId, body: body.trim(), parentId },
      {
        onSuccess: () => {
          setBody("");
          onCancel();
          toast.success("Reply posted");
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 p-3 rounded-lg bg-[hsl(var(--surface))] border border-border">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a reply…"
        required
        rows={2}
        className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none"
      />
      <div className="flex justify-end gap-2 mt-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-8 px-3 rounded-md text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors press"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={createComment.isPending || !body.trim()}
          className="h-8 px-3 rounded-md bg-primary text-white text-xs font-semibold inline-flex items-center gap-2 disabled:opacity-50 press"
        >
          {createComment.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Reply
        </button>
      </div>
    </form>
  );
}

function CommentCard({
  comment,
  articleId,
  currentUserId,
  replies,
  isReply = false,
}: {
  comment: Comment;
  articleId: string;
  currentUserId?: string;
  replies?: Comment[];
  isReply?: boolean;
}) {
  const [showReplies, setShowReplies] = useState(true);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(false);
  const toggleLike = useToggleCommentLike();
  const deleteComment = useDeleteComment();

  const isOwner = currentUserId === comment.userId;
  const isLiked = currentUserId ? comment.likes.includes(currentUserId) : false;
  const hasReplies = replies && replies.length > 0;

  const handleLike = () => {
    if (!currentUserId) {
      toast.error("Sign in to like comments");
      return;
    }
    toggleLike.mutate({ commentId: comment.id, articleId });
  };

  const handleDelete = () => {
    deleteComment.mutate(
      { commentId: comment.id, articleId },
      {
        onSuccess: () => {
          toast.success("Comment deleted");
          setDeleteTarget(false);
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  return (
    <div className={cn("group", !isReply && "border-b border-border py-5")}>
      <div className="flex gap-3">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
          <span className="text-xs font-bold text-primary">
            {comment.authorName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-foreground">{comment.authorName}</span>
            <span className="text-[11px] text-muted-foreground">{timeAgo(comment.createdAt)}</span>
            {comment.isEdited && (
              <span className="text-[10px] text-muted-foreground italic">edited</span>
            )}
          </div>
          <p className="text-sm text-foreground/90 leading-relaxed">{comment.body}</p>
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={handleLike}
              className={cn(
                "inline-flex items-center gap-1 text-xs font-medium transition-colors press",
                isLiked ? "text-primary" : "text-muted-foreground hover:text-primary"
              )}
            >
              <Heart className={cn("h-3.5 w-3.5", isLiked && "fill-current")} />
              {comment.likes.length > 0 && comment.likes.length}
            </button>
            {currentUserId && !isReply && (
              <button
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors press"
              >
                <Reply className="h-3.5 w-3.5" />
                Reply
              </button>
            )}
            {isOwner && (
              <button
                onClick={() => setDeleteTarget(true)}
                disabled={deleteComment.isPending}
                className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-destructive transition-colors press"
              >
                {deleteComment.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Delete
              </button>
            )}
            {hasReplies && (
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors press"
              >
                {showReplies ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {comment.replyCount} {comment.replyCount === 1 ? "reply" : "replies"}
              </button>
            )}
          </div>

          {showReplyForm && (
            <ReplyForm
              articleId={articleId}
              parentId={comment.id}
              onCancel={() => setShowReplyForm(false)}
            />
          )}
        </div>
      </div>

      {hasReplies && showReplies && (
        <div className="ml-10 pl-4 border-l-2 border-border mt-3 space-y-3">
          {replies.map((reply) => (
            <CommentCard
              key={reply.id}
              comment={reply}
              articleId={articleId}
              currentUserId={currentUserId}
              isReply
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(false); }}
        title="Delete comment"
        description="Are you sure you want to delete this comment? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}

export default function CommentSection({
  articleId,
  currentUserId,
}: {
  articleId: string;
  currentUserId?: string;
}) {
  const [body, setBody] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data: comments = [], isLoading } = useComments(articleId);
  const { data: countData } = useCommentCount(articleId);
  const createComment = useCreateComment();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    createComment.mutate(
      { articleId, body: body.trim() },
      {
        onSuccess: () => {
          setBody("");
          toast.success("Comment posted");
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const topLevel = comments.filter((c) => !c.parentId);
  const repliesByParent = comments.reduce<Record<string, Comment[]>>((acc, c) => {
    if (c.parentId) {
      (acc[c.parentId] ??= []).push(c);
    }
    return acc;
  }, {});

  return (
    <section className="mt-14 pt-10 border-t border-border">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="overline text-primary mb-1 flex items-center gap-1.5">
            <MessageCircle className="h-3 w-3" /> Discussion
          </p>
          <h3 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight">
            Comments
            {countData && countData.count > 0 && (
              <span className="text-muted-foreground font-normal text-base ml-2">
                ({countData.count})
              </span>
            )}
          </h3>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="h-10 px-4 rounded-md bg-primary text-white text-xs font-semibold inline-flex items-center gap-2 hover:bg-primary/90 transition-colors press"
        >
          {showForm ? "Cancel" : "Write comment"}
        </button>
      </div>

      {showForm && (
        currentUserId ? (
          <form onSubmit={handleSubmit} className="mb-8 p-4 rounded-lg bg-[hsl(var(--surface))] border border-border">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Share your thoughts…"
              required
              rows={3}
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none"
            />
            <div className="flex justify-end mt-3">
              <button
                type="submit"
                disabled={createComment.isPending || !body.trim()}
                className="h-9 px-4 rounded-md bg-primary text-white text-xs font-semibold inline-flex items-center gap-2 disabled:opacity-50 press"
              >
                {createComment.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Post comment
              </button>
            </div>
          </form>
        ) : (
          <div className="mb-8 p-6 text-center border border-dashed border-border rounded-xl bg-muted/10 space-y-3">
            <p className="text-sm font-semibold text-muted-foreground">You must be signed in to join the discussion.</p>
            <button
              onClick={() => {
                window.location.href = `/login?from=${encodeURIComponent(window.location.pathname)}`;
              }}
              className="h-9 px-4 rounded-md bg-primary text-white text-xs font-bold uppercase tracking-wider hover:bg-primary/90 transition-all press"
            >
              Sign in to comment
            </button>
          </div>
        )
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 text-primary animate-spin" />
        </div>
      ) : comments.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-border rounded-lg">
          <MessageCircle className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-serif italic text-muted-foreground">
            No comments yet. Start the conversation.
          </p>
        </div>
      ) : (
        <div>
          {topLevel.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              articleId={articleId}
              currentUserId={currentUserId}
              replies={repliesByParent[comment.id]}
            />
          ))}
        </div>
      )}
    </section>
  );
}
