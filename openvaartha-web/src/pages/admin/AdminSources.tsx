import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, AlertCircle, Check, Loader2, Pencil, Plus, RotateCcw, Rss, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ConfirmDialog from "@/components/ConfirmDialog";

type RssSource = {
  id: string;
  name: string;
  feedUrl: string;
  feed_url?: string;
  categoryId: string;
  category_id?: string;
  language: string;
  active: boolean;
  lastFetchedAt?: string;
  last_fetched_at?: string;
  createdAt?: string;
  created_at?: string;
  articleCount?: number;
  article_count?: number;
};

type Category = {
  id: string;
  name: string;
};

type DraftSource = {
  name: string;
  feed_url: string;
  category_id: string;
  language: string;
  active: boolean;
};

const emptyDraft: DraftSource = { name: "", feed_url: "", category_id: "", language: "en", active: true };
// English-only portal — sources are not tagged by language beyond this.
const LANGUAGES = [{ value: "en", label: "English" }];

export default function AdminSources() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<DraftSource>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<DraftSource>(emptyDraft);
  const [deleteTarget, setDeleteTarget] = useState<RssSource | null>(null);

  const { data: sources = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin", "sources"],
    queryFn: () => apiFetch<RssSource[]>("/admin/sources"),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: () => apiFetch<Category[]>("/categories/"),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<RssSource>("/admin/sources", {
        method: "POST",
        body: JSON.stringify(draft),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "sources"] });
      setDraft(emptyDraft);
      toast.success("Source created");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<RssSource>(`/admin/sources/${id}`, {
        method: "PUT",
        body: JSON.stringify(edit),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "sources"] });
      setEditingId(null);
      toast.success("Source updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ message: string }>(`/admin/sources/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "sources"] });
      toast.success("Source deleted");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const processMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ processed: number }>("/admin/sources/process", { method: "POST" }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "sources"] });
      toast.success(`Processed sources: ${data.processed} new articles`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const processSingleMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ processed: number }>(`/admin/sources/${id}/process`, { method: "POST" }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "sources"] });
      toast.success(`Source processed: ${data.processed} new articles`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim() || !draft.feed_url.trim() || !draft.category_id) return;
    createMutation.mutate();
  };

  const startEdit = (source: RssSource) => {
    setEditingId(source.id);
    setEdit({
      name: source.name,
      feed_url: source.feedUrl || source.feed_url || "",
      category_id: source.categoryId || source.category_id || "",
      language: source.language,
      active: source.active ?? true,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEdit(emptyDraft);
  };

  const confirmDelete = (source: RssSource) => {
    setDeleteTarget(source);
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">RSS Sources</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage RSS/Atom feeds for automatic article generation.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => processMutation.mutate()}
          disabled={processMutation.isPending}
        >
          {processMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Activity className="h-4 w-4" />
          )}
          Process All
        </Button>
      </div>

      {isError && (
        <div className="border border-destructive/30 rounded-xl p-8 text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <p className="text-sm font-semibold text-destructive">Failed to load sources</p>
          <p className="text-xs text-muted-foreground">{(error as Error)?.message}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RotateCcw className="h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      )}

      <form onSubmit={onSubmit} className="border border-border rounded-xl p-5 grid md:grid-cols-[1fr_1fr_160px_120px_auto] gap-4 items-end">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            required
            placeholder="e.g. The Hindu — Tech"
          />
        </div>
        <div className="space-y-2">
          <Label>Feed URL</Label>
          <Input
            value={draft.feed_url}
            onChange={(e) => setDraft({ ...draft, feed_url: e.target.value })}
            required
            placeholder="https://example.com/rss"
          />
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select
            value={draft.category_id}
            onValueChange={(v) => setDraft({ ...draft, category_id: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Language</Label>
          <Select
            value={draft.language}
            onValueChange={(v) => setDraft({ ...draft, language: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add
        </Button>
      </form>

      <div className="border border-border rounded-xl overflow-hidden">
        <div className="hidden md:grid grid-cols-[1fr_200px_120px_80px_80px_160px] gap-4 h-11 px-5 items-center border-b border-border bg-muted/50 text-xs font-semibold text-muted-foreground">
          <span>Name</span>
          <span>Feed URL</span>
          <span>Category</span>
          <span>Articles</span>
          <span>Active</span>
          <span className="text-right">Actions</span>
        </div>
        {isLoading ? (
          <div className="h-32 flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
          </div>
        ) : (
        <div className="divide-y divide-border">
          {sources.map((source) => {
            const isEditing = editingId === source.id;
            const isMutating =
              (updateMutation.isPending && updateMutation.variables === source.id) ||
              (deleteMutation.isPending && deleteMutation.variables === source.id) ||
              (processSingleMutation.isPending && processSingleMutation.variables === source.id);
            const catName = categories.find((c) => c.id === (source.categoryId || source.category_id))?.name || "—";
            const lastFetched = source.lastFetchedAt || source.last_fetched_at;
            const feedUrl = source.feedUrl || source.feed_url || "";
            const articleCount = source.articleCount ?? source.article_count ?? 0;
            return (
              <div key={source.id} className="block md:grid md:grid-cols-[1fr_200px_120px_80px_80px_160px] md:gap-4 md:items-center p-4 md:px-5">
                <div className="mb-1 md:mb-0 flex md:block items-center gap-2">
                  <span className="text-xs text-muted-foreground md:hidden">Name: </span>
                  {isEditing ? (
                    <Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className="h-9 text-sm" />
                  ) : (
                    <span className="text-sm font-semibold flex items-center gap-1.5">
                      <Rss className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                      {source.name}
                    </span>
                  )}
                </div>
                <div className="mb-1 md:mb-0 flex md:block items-center gap-2 min-w-0">
                  <span className="text-xs text-muted-foreground md:hidden">Feed: </span>
                  {isEditing ? (
                    <Input value={edit.feed_url} onChange={(e) => setEdit({ ...edit, feed_url: e.target.value })} className="h-9 text-sm" />
                  ) : (
                    <span className="text-xs text-muted-foreground truncate block" title={feedUrl}>
                      {feedUrl}
                    </span>
                  )}
                </div>
                <div className="mb-1 md:mb-0 flex md:block items-center gap-2">
                  <span className="text-xs text-muted-foreground md:hidden">Category: </span>
                  {isEditing ? (
                    <Select value={edit.category_id} onValueChange={(v) => setEdit({ ...edit, category_id: v })}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-sm text-muted-foreground">{catName}</span>
                  )}
                </div>
                <div className="mb-1 md:mb-0 flex md:block items-center gap-2">
                  <span className="text-xs text-muted-foreground md:hidden">Articles: </span>
                  <span className="text-sm font-medium text-muted-foreground">{articleCount}</span>
                </div>
                <div className="mb-2 md:mb-0 flex md:block items-center gap-2">
                  <span className="text-xs text-muted-foreground md:hidden">Active: </span>
                  {isEditing ? (
                    <Select value={edit.active ? "true" : "false"} onValueChange={(v) => setEdit({ ...edit, active: v === "true" })}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Active</SelectItem>
                        <SelectItem value="false">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className={`text-xs font-medium ${source.active ? "text-green-600" : "text-muted-foreground"}`}>
                      {source.active ? "Active" : "Inactive"}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  {isEditing ? (
                    <>
                      <Button type="button" size="icon" onClick={() => updateMutation.mutate(source.id)} disabled={isMutating || !edit.name.trim() || !edit.feed_url.trim()}>
                        {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </Button>
                      <Button type="button" variant="outline" size="icon" onClick={cancelEdit}>
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-semibold px-2 py-0 shrink-0"
                        onClick={() => processSingleMutation.mutate(source.id)}
                        disabled={isMutating}
                      >
                        {isMutating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Activity className="h-3 w-3 mr-1 text-orange-500" />}
                        Process
                      </Button>
                      <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => startEdit(source)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="outline" size="icon" className="h-8 w-8 text-destructive hover:text-destructive shrink-0" onClick={() => confirmDelete(source)} disabled={isMutating}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
                {!isEditing && lastFetched && (
                  <div className="md:col-span-6 text-[10px] text-muted-foreground mt-1">
                    Last fetched: {new Date(lastFetched).toLocaleString()}
                  </div>
                )}
              </div>
            );
          })}
          {!isLoading && sources.length === 0 && (
            <div className="p-8 text-sm text-muted-foreground text-center">No RSS sources configured.</div>
          )}
        </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete source"
        description={`Delete source "${deleteTarget?.name}"? This will not remove previously generated articles.`}
        confirmLabel="Delete"
        onConfirm={() => { if (deleteTarget) { deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null); } }}
      />
    </div>
  );
}
