import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { ApiError, apiFetch } from "@/lib/api";
import { Sparkles } from "@/components/animate-ui/icons/sparkles";
import { Button } from "@/components/ui/button";

interface ExplainModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  articleId: string;
  articleVersion?: string | null;
  restoreFocus?: () => void;
}

type Explanation = { explanation: string; source: "ai" | "article_summary" };

export default function ExplainModal({ open, onOpenChange, articleId, articleVersion, restoreFocus }: ExplainModalProps) {
  const { data, isLoading, isFetching, error, refetch } = useQuery<Explanation>({
    queryKey: ["article", articleId, "explain", articleVersion],
    queryFn: () => apiFetch(`/articles/${articleId}/explain`),
    enabled: open && !!articleId,
    staleTime: (query) => query.state.data?.source === "ai" ? 15 * 60 * 1000 : 0,
    retry: false,
  });
  const fallback = data?.source === "article_summary";
  const rateLimited = error instanceof ApiError && error.status === 429;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-5 text-foreground sm:p-7 [&>button]:h-11 [&>button]:w-11"
        onCloseAutoFocus={(event) => {
          if (!restoreFocus) return;
          event.preventDefault();
          restoreFocus();
        }}
      >
        <DialogHeader className="pr-12 text-left">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Sparkles className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            Explain it to me
          </DialogTitle>
          <DialogDescription>
            A plain-language explanation based on this article.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-24 rounded-lg border border-border bg-muted/30 p-4 sm:p-5" aria-live="polite">
          {(isLoading || (isFetching && !data)) ? (
            <p className="text-sm text-muted-foreground" role="status">Preparing the explanation…</p>
          ) : data ? (
            <>
              <p className="mb-2 text-xs font-bold text-muted-foreground">{fallback ? "From the article" : "AI-generated explanation"}</p>
              <p className="whitespace-pre-wrap break-words text-base leading-relaxed">{data.explanation}</p>
              {fallback && (
                <p className="mt-3 text-sm text-muted-foreground">The AI explanation is temporarily unavailable.</p>
              )}
            </>
          ) : error && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {rateLimited ? "Too many requests. Wait a moment and try again." : "The explanation is unavailable right now."}
              </p>
            </div>
          )}
        </div>
        {(fallback || error) && !rateLimited && (
          <Button type="button" variant="outline" className="min-h-11 justify-self-start" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? "Trying again…" : "Try again"}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
