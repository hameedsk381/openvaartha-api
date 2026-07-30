import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Sparkles } from "@/components/animate-ui/icons/sparkles";

interface ExplainModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  articleId: string;
}

export default function ExplainModal({ open, onOpenChange, articleId }: ExplainModalProps) {
  const { data, isLoading, error } = useQuery<{ explanation: string }>({
    queryKey: ["article", articleId, "explain"],
    queryFn: () => apiFetch(`/articles/${articleId}/explain`),
    enabled: open,
    staleTime: Infinity,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 backdrop-blur-xl rounded-3xl p-6 shadow-[0_8px_32px_rgba(85,0,0,0.15)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/80">
            <Sparkles className="w-5 h-5 text-primary" />
            Explain it to me
          </DialogTitle>
          <DialogDescription className="sr-only">
            A simplified summary of the news article.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 min-h-[100px] flex items-center justify-center text-center">
          {isLoading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-sm font-medium text-muted-foreground animate-pulse">AI is reading...</p>
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">Failed to load explanation. Try again later.</p>
          ) : (
            <p className="text-base md:text-lg font-medium leading-relaxed text-foreground text-left whitespace-pre-wrap">
              {data?.explanation}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
