import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Inbox, CheckCircle2, XCircle, FileEdit, AlertCircle, User } from "lucide-react";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { RotateCcw } from "@/components/animate-ui/icons/rotate-ccw";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";

type PendingArticle = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  categoryId: string;
  readTime: string;
  status: string;
  isOpinion: boolean;
  thumbnailUrl?: string;
  publishedAt: string;
  author: string;
  createdAt: string;
  content?: {
    tldr: string;
    points: string[];
    body: string;
  };
};

type Category = {
  id: string;
  name: string;
};

export default function AdminContributions() {
  const queryClient = useQueryClient();
  const [selectedArticle, setSelectedArticle] = useState<PendingArticle | null>(null);

  const categoriesQuery = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: () => apiFetch<Category[]>("/categories/"),
  });

  const pendingQuery = useQuery({
    queryKey: ["admin", "contributions", "pending"],
    queryFn: () => apiFetch<PendingArticle[]>("/articles/?status=pending&include_unpublished=true"),
  });

  const publishMutation = useMutation({
    mutationFn: (articleId: string) =>
      apiFetch(`/articles/${articleId}`, {
        method: "PUT",
        body: JSON.stringify({
          status: "published",
          published_at: new Date().toISOString(),
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "contributions", "pending"] });
      toast.success("Column published successfully!");
      setSelectedArticle(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: (articleId: string) =>
      apiFetch(`/articles/${articleId}`, {
        method: "PUT",
        body: JSON.stringify({ status: "archived" }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "contributions", "pending"] });
      toast.success("Column rejected and archived");
      setSelectedArticle(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const pendingArticles = pendingQuery.data ?? [];

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Review Queue</h1>
        <p className="text-sm text-muted-foreground mt-1">Approve and publish contributor opinion columns.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
        {/* Left Side: Pending Columns List */}
        <div className="border border-border rounded-xl bg-card overflow-hidden">
          <div className="p-4 border-b border-border bg-[hsl(var(--surface))]">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Pending Submissions ({pendingArticles.length})</h2>
          </div>

          {pendingQuery.isLoading ? (
            <div className="p-12 text-center">
              <LoaderCircle className="h-6 w-6 text-primary mx-auto" animate />
            </div>
          ) : pendingQuery.isError ? (
            <div className="p-8 text-center space-y-3">
              <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
              <p className="text-sm font-semibold text-destructive">Failed to load review queue</p>
              <Button variant="outline" size="sm" onClick={() => pendingQuery.refetch()}>
                <RotateCcw className="h-3.5 w-3.5 mr-1" animateOnHover /> Retry
              </Button>
            </div>
          ) : pendingArticles.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground space-y-2">
              <Inbox className="h-8 w-8 mx-auto opacity-40 text-primary" />
              <p className="text-sm font-semibold">Review queue is empty</p>
              <p className="text-xs">No pending columnist submissions require approval right now.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {pendingArticles.map((article) => {
                const isSelected = selectedArticle?.id === article.id;
                return (
                  <div
                    key={article.id}
                    onClick={() => setSelectedArticle(article)}
                    className={`p-5 cursor-pointer transition-colors hover:bg-muted/40 ${
                      isSelected ? "bg-muted/70 hover:bg-muted/70 border-l-2 border-primary" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                        {categoriesQuery.data?.find(c => c.id === article.categoryId)?.name || "General"}
                      </span>
                      <span className="text-muted-foreground text-xs font-serif">·</span>
                      <span className="text-[10px] text-muted-foreground font-semibold">
                        Submitted {new Date(article.createdAt || article.publishedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="font-serif font-bold text-base text-foreground line-clamp-1">{article.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">{article.summary}</p>
                    
                    <div className="flex items-center gap-1.5 mt-2.5 text-xs text-muted-foreground font-semibold">
                      <User className="h-3.5 w-3.5 text-primary" />
                      <span>{article.author}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Detailed Review & Moderation Panel */}
        <div className="space-y-6">
          {selectedArticle ? (
            <div className="border border-border rounded-xl bg-card p-5 space-y-6">
              <div className="space-y-2 border-b border-border pb-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Reviewing Submission</p>
                <h3 className="font-serif font-bold text-lg text-foreground leading-tight">{selectedArticle.title}</h3>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                  <span>Author: {selectedArticle.author}</span>
                </div>
              </div>

              {selectedArticle.thumbnailUrl && (
                <div className="rounded-lg overflow-hidden border border-border bg-muted max-h-40">
                  <img src={selectedArticle.thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">TL;DR Summary</h4>
                  <p className="text-xs text-foreground bg-muted/30 border border-border p-3 rounded-lg leading-relaxed">
                    {selectedArticle.content?.tldr || "No TL;DR provided."}
                  </p>
                </div>

                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Highlights</h4>
                  <ul className="list-disc pl-4 text-xs text-foreground space-y-1">
                    {selectedArticle.content?.points?.map((pt, i) => (
                      <li key={i}>{pt}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Column Body</h4>
                  <div className="max-h-60 overflow-y-auto text-xs text-foreground bg-muted/20 border border-border p-3 rounded-lg whitespace-pre-wrap leading-relaxed">
                    {selectedArticle.content?.body || "No body content."}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-border space-y-2.5">
                <Link to={`/admin/articles/${selectedArticle.id}/edit`}>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full font-semibold gap-1.5 mb-2.5"
                  >
                    <AnimatedIcon animationType="scale"><FileEdit className="h-4 w-4" /></AnimatedIcon> Edit & Review
                  </Button>
                </Link>

                <Button
                  onClick={() => publishMutation.mutate(selectedArticle.id)}
                  disabled={publishMutation.isPending}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold gap-1.5 shadow-sm"
                >
                  {publishMutation.isPending ? (
                    <LoaderCircle className="h-4 w-4" animate />
                  ) : (
                    <AnimatedIcon animationType="scale"><CheckCircle2 className="h-4 w-4" /></AnimatedIcon>
                  )}
                  Publish Column
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    asChild
                    className="gap-1.5 font-semibold text-xs"
                  >
                    <Link to={`/admin/articles/${selectedArticle.id}/edit`}>
                      <AnimatedIcon animationType="scale"><FileEdit className="h-3.5 w-3.5" /></AnimatedIcon> Full Editor
                    </Link>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      if (confirm("Are you sure you want to reject and archive this column?")) {
                        rejectMutation.mutate(selectedArticle.id);
                      }
                    }}
                    disabled={rejectMutation.isPending}
                    className="gap-1.5 font-semibold text-xs text-red-600 hover:bg-red-50 border-red-100"
                  >
                    {rejectMutation.isPending ? (
                      <LoaderCircle className="h-3.5 w-3.5" animate />
                    ) : (
                      <AnimatedIcon animationType="scale"><XCircle className="h-3.5 w-3.5" /></AnimatedIcon>
                    )}
                    Reject & Archive
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-border border-dashed rounded-xl p-8 text-center text-muted-foreground bg-muted/10">
              <p className="text-xs font-semibold">Select a columnist submission on the left to review its content and take editorial action.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
