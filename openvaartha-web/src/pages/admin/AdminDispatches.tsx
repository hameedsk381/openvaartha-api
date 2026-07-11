import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Radio, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ConfirmDialog from "@/components/ConfirmDialog";
import type { Dispatch, Article } from "@/lib/types";

const NONE = "__none__";

export default function AdminDispatches() {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [articleId, setArticleId] = useState(NONE);
  const [deleteTarget, setDeleteTarget] = useState<Dispatch | null>(null);

  const { data: dispatches = [], isLoading } = useQuery({
    queryKey: ["admin", "dispatches"],
    queryFn: () => apiFetch<Dispatch[]>("/dispatches/?limit=100"),
  });

  // Recent articles for the optional "link to a full article" picker.
  const { data: articles = [] } = useQuery({
    queryKey: ["admin", "dispatches", "articles"],
    queryFn: () => apiFetch<Article[]>("/articles/?limit=50"),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<Dispatch>("/dispatches/", {
        method: "POST",
        body: JSON.stringify({
          text: text.trim(),
          articleId: articleId === NONE ? null : articleId,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "dispatches"] });
      queryClient.invalidateQueries({ queryKey: ["dispatches"] });
      setText("");
      setArticleId(NONE);
      toast.success("Dispatch posted");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch<{ message: string }>(`/dispatches/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "dispatches"] });
      queryClient.invalidateQueries({ queryKey: ["dispatches"] });
      toast.success("Dispatch deleted");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim()) return;
    createMutation.mutate();
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Radio className="h-5 w-5 text-primary" /> Dispatches
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Short breaking-news blurbs — not full articles. These power the homepage
          "JUST IN" scrolling ticker and the Live Updates timeline. Optionally link
          one to a full article once you've published it.
        </p>
      </div>

      <form onSubmit={onSubmit} className="border border-border rounded-xl p-5 space-y-4">
        <div className="space-y-2">
          <Label>Headline</Label>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
            maxLength={280}
            rows={2}
            placeholder="e.g. Police launch investigation after viral video shows assault in Barabanki"
          />
          <p className="text-xs text-muted-foreground text-right">{text.length}/280</p>
        </div>
        <div className="space-y-2">
          <Label>Link to article (optional)</Label>
          <Select value={articleId} onValueChange={setArticleId}>
            <SelectTrigger>
              <SelectValue placeholder="No linked article" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>No linked article</SelectItem>
              {articles.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={createMutation.isPending || !text.trim()}>
          {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Post dispatch
        </Button>
      </form>

      <div className="border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="h-32 flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {dispatches.map((d) => (
              <div key={d.id} className="flex items-start justify-between gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug">{d.text}</p>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                    <span>{new Date(d.createdAt).toLocaleString()}</span>
                    {d.articleTitle && (
                      <>
                        <span>·</span>
                        <span className="truncate">Linked: {d.articleTitle}</span>
                      </>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                  onClick={() => setDeleteTarget(d)}
                  disabled={deleteMutation.isPending && deleteMutation.variables === d.id}
                >
                  {deleteMutation.isPending && deleteMutation.variables === d.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
            {!isLoading && dispatches.length === 0 && (
              <div className="p-8 text-sm text-muted-foreground text-center">No dispatches yet.</div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete dispatch"
        description="This removes it from the JUST IN ticker and Live Updates immediately."
        confirmLabel="Delete"
        onConfirm={() => { if (deleteTarget) { deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null); } }}
      />
    </div>
  );
}
