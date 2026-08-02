import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Pencil, Video } from "lucide-react";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { Radio } from "@/components/animate-ui/icons/radio";
import { Check } from "@/components/animate-ui/icons/check";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { Plus } from "@/components/animate-ui/icons/plus";
import { Sparkles } from "@/components/animate-ui/icons/sparkles";
import { Trash2 } from "@/components/animate-ui/icons/trash-2";
import { X } from "@/components/animate-ui/icons/x";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ConfirmDialog from "@/components/ConfirmDialog";
import type { Dispatch, Article, Category } from "@/lib/types";

const NONE = "__none__";

type DraftDispatch = {
  text: string;
  articleId: string;
  categoryId: string;
  imageUrl: string | null;
  videoUrl: string | null;
};

const emptyDraft: DraftDispatch = { text: "", articleId: NONE, categoryId: NONE, imageUrl: null, videoUrl: null };

function ImagePicker({
  imageUrl,
  onChange,
}: {
  imageUrl: string | null;
  onChange: (url: string | null) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);

  const pickImage = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      apiFetch<{ url: string }>("/upload/", { method: "POST", body: formData })
        .then((res) => onChange(res.url))
        .catch(() => toast.error("Failed to upload image"))
        .finally(() => setIsUploading(false));
    };
    input.click();
  };

  return imageUrl ? (
    <div className="relative rounded-lg overflow-hidden border border-border w-40 h-24">
      <img src={imageUrl} alt="Byte cover" className="w-full h-full object-cover" />
      <button
        type="button"
        onClick={() => onChange(null)}
        className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center press"
        aria-label="Remove image"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  ) : (
    <Button type="button" variant="outline" size="sm" onClick={pickImage} disabled={isUploading}>
      {isUploading ? (
        <LoaderCircle className="h-4 w-4" animate />
      ) : (
        <AnimatedIcon animationType="scale"><ImagePlus className="h-4 w-4" /></AnimatedIcon>
      )}
      Upload image
    </Button>
  );
}

function VideoPicker({
  videoUrl,
  onChange,
}: {
  videoUrl: string | null;
  onChange: (url: string | null) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);

  const pickVideo = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/mp4,video/webm,video/quicktime";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      apiFetch<{ url: string }>("/upload/video", { method: "POST", body: formData })
        .then((res) => onChange(res.url))
        .catch((err) => toast.error(err?.message || "Failed to upload video"))
        .finally(() => setIsUploading(false));
    };
    input.click();
  };

  return videoUrl ? (
    <div className="relative rounded-lg overflow-hidden border border-border w-52 h-40 bg-black">
      <video src={videoUrl} className="w-full h-full object-cover" muted loop playsInline controls />
      <button
        type="button"
        onClick={() => onChange(null)}
        className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center press"
        aria-label="Remove video"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  ) : (
    <Button type="button" variant="outline" size="sm" onClick={pickVideo} disabled={isUploading}>
      {isUploading ? (
        <LoaderCircle className="h-4 w-4" animate />
      ) : (
        <AnimatedIcon animationType="scale"><Video className="h-4 w-4" /></AnimatedIcon>
      )}
      Upload video
    </Button>
  );
}

function DispatchFields({
  draft,
  onChange,
  articles,
  categories,
}: {
  draft: DraftDispatch;
  onChange: (next: DraftDispatch) => void;
  articles: Article[];
  categories: Category[];
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Headline</Label>
        <Textarea
          value={draft.text}
          onChange={(e) => onChange({ ...draft, text: e.target.value })}
          required
          maxLength={280}
          rows={2}
          placeholder="e.g. Police launch investigation after viral video shows assault in Barabanki"
        />
        <p className="text-xs text-muted-foreground text-right">{draft.text.length}/280</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={draft.categoryId} onValueChange={(v) => onChange({ ...draft, categoryId: v })}>
            <SelectTrigger>
              <SelectValue placeholder="No category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>No category</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.emoji} {c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Link to article (optional)</Label>
          <Select value={draft.articleId} onValueChange={(v) => onChange({ ...draft, articleId: v })}>
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
      </div>
      <div className="space-y-2">
        <Label>Cover image (optional)</Label>
        <p className="text-xs text-muted-foreground">
          Bytes are built for sharing — a photo makes a much stronger card. Without one, the Open Vaartha mark is used as a placeholder.
        </p>
        <ImagePicker imageUrl={draft.imageUrl} onChange={(url) => onChange({ ...draft, imageUrl: url })} />
      </div>
      <div className="space-y-2">
        <Label>Video (optional)</Label>
        <p className="text-xs text-muted-foreground">
          Played full-screen Reels-style on the Bytes page. Max 3 minutes and 100MB — MP4, WebM, or MOV. A video takes precedence over the cover image.
        </p>
        <VideoPicker videoUrl={draft.videoUrl} onChange={(url) => onChange({ ...draft, videoUrl: url })} />
      </div>
    </div>
  );
}

export default function AdminDispatches() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<DraftDispatch>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<DraftDispatch>(emptyDraft);
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

  const { data: categories = [] } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: () => apiFetch<Category[]>("/categories/"),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<Dispatch>("/dispatches/", {
        method: "POST",
        body: JSON.stringify({
          text: draft.text.trim(),
          articleId: draft.articleId === NONE ? null : draft.articleId,
          categoryId: draft.categoryId === NONE ? null : draft.categoryId,
          imageUrl: draft.imageUrl || null,
          videoUrl: draft.videoUrl || null,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "dispatches"] });
      queryClient.invalidateQueries({ queryKey: ["dispatches"] });
      setDraft(emptyDraft);
      toast.success("Dispatch posted");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<Dispatch>(`/dispatches/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          text: edit.text.trim(),
          articleId: edit.articleId === NONE ? null : edit.articleId,
          categoryId: edit.categoryId === NONE ? null : edit.categoryId,
          imageUrl: edit.imageUrl || null,
          videoUrl: edit.videoUrl || null,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "dispatches"] });
      queryClient.invalidateQueries({ queryKey: ["dispatches"] });
      setEditingId(null);
      toast.success("Dispatch updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const backfillMutation = useMutation({
    mutationFn: () => apiFetch<{ message: string; updated: number }>("/dispatches/backfill-categories", { method: "POST" }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "dispatches"] });
      queryClient.invalidateQueries({ queryKey: ["dispatches"] });
      toast.success(data.message);
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
    if (!draft.text.trim()) return;
    createMutation.mutate();
  };

  const startEdit = (d: Dispatch) => {
    setEditingId(d.id);
    setEdit({
      text: d.text,
      articleId: d.articleId || NONE,
      categoryId: d.categoryId || NONE,
      imageUrl: d.imageUrl || null,
      videoUrl: d.videoUrl || null,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEdit(emptyDraft);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Radio className="h-5 w-5 text-primary" /> Dispatches
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Short breaking-news blurbs — not full articles. These power the homepage
            "JUST IN" scrolling ticker and the Bytes page. Optionally link
            one to a full article once you've published it.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="shrink-0"
          onClick={() => backfillMutation.mutate()}
          disabled={backfillMutation.isPending}
          title="AI-classify a category for every standalone dispatch that still has no category"
        >
          {backfillMutation.isPending ? (
            <LoaderCircle className="h-4 w-4" animate />
          ) : (
            <Sparkles className="h-4 w-4" animateOnHover />
          )}
          Auto-categorize
        </Button>
      </div>

      <form onSubmit={onSubmit} className="border border-border rounded-xl p-5 space-y-4">
        <DispatchFields draft={draft} onChange={setDraft} articles={articles} categories={categories} />
        <Button type="submit" disabled={createMutation.isPending || !draft.text.trim()}>
          {createMutation.isPending ? <LoaderCircle className="h-4 w-4" animate /> : <Plus className="h-4 w-4" animateOnHover />}
          Post dispatch
        </Button>
      </form>

      <div className="border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="h-32 flex items-center justify-center">
            <LoaderCircle className="h-6 w-6 text-primary" animate />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {dispatches.map((d) => {
              const isEditing = editingId === d.id;
              const isMutating = updateMutation.isPending && updateMutation.variables === d.id;

              if (isEditing) {
                return (
                  <div key={d.id} className="p-4 space-y-4 bg-muted/30">
                    <DispatchFields draft={edit} onChange={setEdit} articles={articles} categories={categories} />
                    <div className="flex items-center gap-2">
                      <Button type="button" size="sm" onClick={() => updateMutation.mutate(d.id)} disabled={isMutating || !edit.text.trim()}>
                        {isMutating ? <LoaderCircle className="h-4 w-4" animate /> : <Check className="h-4 w-4" animateOnHover />}
                        Save
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={cancelEdit} disabled={isMutating}>
                        <X className="h-4 w-4" animateOnHover /> Cancel
                      </Button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={d.id} className="flex items-start justify-between gap-4 p-4">
                  {d.videoUrl ? (
                    <span className="h-12 w-16 rounded-md shrink-0 border border-border bg-black flex items-center justify-center text-muted-foreground">
                      <Video className="h-4 w-4" />
                    </span>
                  ) : d.imageUrl ? (
                    <img src={d.imageUrl} alt="" className="h-12 w-16 rounded-md object-cover shrink-0 border border-border" />
                  ) : null}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug">{d.text}</p>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                      <span>{new Date(d.createdAt).toLocaleString()}</span>
                      {d.category && (
                        <>
                          <span>·</span>
                          <span className="tag">{d.category}</span>
                        </>
                      )}
                      {d.articleTitle && (
                        <>
                          <span>·</span>
                          <span className="truncate">Linked: {d.articleTitle}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => startEdit(d)}
                    >
                      <AnimatedIcon animationType="scale"><Pencil className="h-4 w-4" /></AnimatedIcon>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(d)}
                      disabled={deleteMutation.isPending && deleteMutation.variables === d.id}
                    >
                      {deleteMutation.isPending && deleteMutation.variables === d.id ? (
                        <LoaderCircle className="h-4 w-4" animate />
                      ) : (
                        <Trash2 className="h-4 w-4" animateOnHover />
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
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
        description="This removes it from the JUST IN ticker and Bytes immediately."
        confirmLabel="Delete"
        onConfirm={() => { if (deleteTarget) { deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null); } }}
      />
    </div>
  );
}
