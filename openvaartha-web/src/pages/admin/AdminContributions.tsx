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
import { Input } from "@/components/ui/input";

type PendingArticle = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  categoryId: string;
  author: string;
  createdAt: string | null;
  origin: "submission" | "rss" | "news-agent";
  owner?: string;
  ownedByMe: boolean;
};

type ReviewDetail = {
  thumbnailUrl?: string;
  citations?: { url: string; publisher?: string }[];
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

function queueAge(createdAt: string | null) {
  if (!createdAt) return "Age unavailable";
  const hours = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 3_600_000));
  if (hours === 0) return "Less than 1h waiting";
  return hours < 24 ? `${hours}h waiting` : `${Math.floor(hours / 24)}d waiting`;
}

export default function AdminContributions() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [reason, setReason] = useState("");
  const [sourcePublisher, setSourcePublisher] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");

  const categoriesQuery = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: () => apiFetch<Category[]>("/categories/"),
  });

  const pendingQuery = useQuery({
    queryKey: ["admin", "review-queue", page],
    queryFn: () => apiFetch<{ items: PendingArticle[]; total: number }>(`/articles/review/queue?skip=${page * 20}`),
  });
  const pendingArticles = pendingQuery.data?.items ?? [];
  const selectedArticle = pendingArticles.find((article) => article.id === selectedId);
  const detailQuery = useQuery({
    queryKey: ["admin", "review-detail", selectedId],
    queryFn: () => apiFetch<ReviewDetail>(`/articles/${selectedId}`),
    enabled: !!selectedId,
  });
  const detail = detailQuery.data;
  const hasSource = detail?.citations?.some(
    ({ url, publisher }) => Boolean(publisher?.trim()) && /^https?:\/\/[^/\s]+(?:\/\S*)?$/i.test(url),
  );
  const needsSource = detail && selectedArticle?.origin !== "submission" && !hasSource;

  const citationMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/articles/review/${id}/citation`, {
      method: "PUT",
      body: JSON.stringify({ publisher: sourcePublisher.trim(), url: sourceUrl.trim() }),
    }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "review-detail", id] });
      setSourcePublisher("");
      setSourceUrl("");
      toast.success("Source attribution added");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const publishMutation = useMutation({
    mutationFn: (articleId: string) =>
      apiFetch(`/articles/review/${articleId}`, {
        method: "POST",
        body: JSON.stringify({ action: "publish" }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "review-queue"] });
      toast.success("Story published");
      setSelectedId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "claim" | "release" | "archive" }) =>
      apiFetch(`/articles/review/${id}`, {
        method: "POST",
        body: JSON.stringify({ action, reason: action === "archive" ? reason.trim() : "" }),
      }),
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "review-queue"] });
      if (action === "archive") {
        toast.success("Story archived");
        setSelectedId(null);
        setReason("");
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Review Queue</h1>
        <p className="text-sm text-muted-foreground mt-1">Review contributor submissions and automated drafts.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
        {/* Left Side: Pending Columns List */}
        <div className="border border-border rounded-xl bg-card overflow-hidden">
          <div className="p-4 border-b border-border bg-[hsl(var(--surface))]">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Awaiting review ({pendingQuery.data?.total ?? 0})</h2>
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
            </div>
          ) : (
            <div className="divide-y divide-border">
              {pendingArticles.map((article) => {
                const isSelected = selectedArticle?.id === article.id;
                return (
                  <button
                    type="button"
                    key={article.id}
                    onClick={() => {
                      setSelectedId(article.id);
                      setReason("");
                      setSourcePublisher("");
                      setSourceUrl("");
                    }}
                    className={`block w-full text-left p-5 transition-colors hover:bg-muted/40 ${
                      isSelected ? "bg-muted/70 hover:bg-muted/70 border-l-2 border-primary" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                        {categoriesQuery.data?.find(c => c.id === article.categoryId)?.name || "General"}
                      </span>
                      <span className="text-muted-foreground text-xs font-serif">·</span>
                      <span className="text-[10px] text-muted-foreground font-semibold">
                        {queueAge(article.createdAt)}
                      </span>
                    </div>
                    <h3 className="font-serif font-bold text-base text-foreground line-clamp-1">{article.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">{article.summary}</p>
                    
                    <div className="flex items-center gap-1.5 mt-2.5 text-xs text-muted-foreground font-semibold">
                      <User className="h-3.5 w-3.5 text-primary" />
                      <span>{article.origin === "submission" ? "Contributor" : article.origin === "rss" ? "RSS" : "News agent"} · {article.owner || "Unassigned"}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {(page > 0 || (pendingQuery.data?.total ?? 0) > (page + 1) * 20) && (
            <div className="flex justify-between border-t p-3">
              <Button variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
              <Button variant="outline" disabled={(pendingQuery.data?.total ?? 0) <= (page + 1) * 20} onClick={() => setPage(page + 1)}>Next</Button>
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

              {detailQuery.isError && <p role="alert">Could not load story details.</p>}
              {detailQuery.isLoading && <p role="status">Loading story details…</p>}
              {detail?.thumbnailUrl && (
                <div className="rounded-lg overflow-hidden border border-border bg-muted max-h-40">
                  <img src={detail.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">TL;DR Summary</h4>
                  <p className="text-xs text-foreground bg-muted/30 border border-border p-3 rounded-lg leading-relaxed">
                    {detail?.content?.tldr || "No TL;DR provided."}
                  </p>
                </div>

                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Highlights</h4>
                  <ul className="list-disc pl-4 text-xs text-foreground space-y-1">
                    {detail?.content?.points?.map((pt, i) => (
                      <li key={i}>{pt}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Column Body</h4>
                  <div className="max-h-60 overflow-y-auto text-xs text-foreground bg-muted/20 border border-border p-3 rounded-lg whitespace-pre-wrap leading-relaxed">
                    {detail?.content?.body || "No body content."}
                  </div>
                </div>
                {!!detail?.citations?.length && (
                  <ul className="space-y-1 text-sm">
                    {detail.citations.filter(({ url }) => /^https?:\/\//i.test(url)).map(({ url, publisher }, index) => (
                      <li key={`${url}-${index}`}><a className="underline" href={url} target="_blank" rel="noreferrer">{publisher || url}</a></li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-border space-y-2.5">
                <p className="text-sm">Reviewer {selectedArticle.owner || "unassigned"}</p>
                {(!selectedArticle.owner || selectedArticle.ownedByMe) && (
                  <Button variant="outline" disabled={reviewMutation.isPending}
                    onClick={() => reviewMutation.mutate({
                      id: selectedArticle.id, action: selectedArticle.ownedByMe ? "release" : "claim",
                    })}>
                    {selectedArticle.ownedByMe ? "Release review" : "Claim review"}
                  </Button>
                )}
                {needsSource && selectedArticle.ownedByMe && (
                  <form className="space-y-2" onSubmit={(event) => {
                    event.preventDefault();
                    citationMutation.mutate(selectedArticle.id);
                  }}>
                    <label className="block text-sm" htmlFor="review-publisher">Source publisher</label>
                    <Input id="review-publisher" value={sourcePublisher} maxLength={200} required
                      onChange={(event) => setSourcePublisher(event.target.value)} />
                    <label className="block text-sm" htmlFor="review-source-url">Source URL</label>
                    <Input id="review-source-url" type="url" value={sourceUrl} required
                      onChange={(event) => setSourceUrl(event.target.value)} />
                    <Button variant="outline" disabled={citationMutation.isPending} type="submit">
                      Add source attribution
                    </Button>
                  </form>
                )}
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
                  disabled={publishMutation.isPending || reviewMutation.isPending || !selectedArticle.ownedByMe || !detail || !!needsSource}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold gap-1.5 shadow-sm"
                >
                  {publishMutation.isPending ? (
                    <LoaderCircle className="h-4 w-4" animate />
                  ) : (
                    <AnimatedIcon animationType="scale"><CheckCircle2 className="h-4 w-4" /></AnimatedIcon>
                  )}
                  Publish story
                </Button>

                {selectedArticle.ownedByMe && (
                  <div className="space-y-2">
                  <label className="block text-sm" htmlFor="archive-reason">Reason for archiving</label>
                  <textarea id="archive-reason" className="w-full rounded border bg-background p-2 text-sm"
                    value={reason} maxLength={1000} onChange={(event) => setReason(event.target.value)} />
                  <Button
                    variant="outline"
                    onClick={() => reviewMutation.mutate({ id: selectedArticle.id, action: "archive" })}
                    disabled={reviewMutation.isPending || publishMutation.isPending || !reason.trim()}
                    className="gap-1.5 font-semibold text-xs text-red-600 hover:bg-red-50 border-red-100"
                  >
                    {reviewMutation.isPending ? (
                      <LoaderCircle className="h-3.5 w-3.5" animate />
                    ) : (
                      <AnimatedIcon animationType="scale"><XCircle className="h-3.5 w-3.5" /></AnimatedIcon>
                    )}
                    Reject & Archive
                  </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="border border-border border-dashed rounded-xl p-8 text-center text-muted-foreground bg-muted/10">
              <p className="text-xs font-semibold">Select a story to review.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
