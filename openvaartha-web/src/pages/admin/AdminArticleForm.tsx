import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, Loader2, Plus, Save, Trash2, X, AlertCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { ARTICLE_STATUSES, type Article, type ArticleStatus, type Category } from "./types";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";
import MDXBodyEditor from "@/components/LazyMDXBodyEditor";
import AIGenerateDialog from "@/components/AIGenerateDialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type TimelineEntry = { date: string; event: string };
type ExplainerEntry = { question: string; answer: string };

const SLUG_CHARS = /[^a-z0-9-]+/g;

type FormState = {
  title: string;
  slug: string;
  summary: string;
  categoryId: string;
  readTime: string;
  language: string;
  author: string;
  thumbnailUrl: string;
  publishedAt: string;
  status: ArticleStatus;
  isTrending: boolean;
  isBreaking: boolean;
  isEditorPick: boolean;
  tldr: string;
  points: string;
  body: string;
  timeline: TimelineEntry[];
  explainer: ExplainerEntry[];
};

const emptyForm: FormState = {
  title: "",
  slug: "",
  summary: "",
  categoryId: "",
  readTime: "3 min",
  language: "en",
  author: `${BRAND.name} Desk`,
  thumbnailUrl: "",
  publishedAt: new Date().toISOString().slice(0, 16),
  status: "draft",
  isTrending: false,
  isBreaking: false,
  isEditorPick: false,
  tldr: "",
  points: "",
  body: "",
  timeline: [],
  explainer: [],
};

const toDateInput = (value?: string) => {
  if (!value) return new Date().toISOString().slice(0, 16);
  return new Date(value).toISOString().slice(0, 16);
};

export default function AdminArticleForm() {
  const { articleId } = useParams();
  const isEditing = !!articleId;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(emptyForm);
  const dirty = useRef(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [revisions, setRevisions] = useState<Array<{ date: string; title: string; body: string }>>([]);
  const isMac = typeof navigator !== "undefined" && /mac/i.test(navigator.userAgent);

  const wordCount = useMemo(() => {
    const text = form.body.trim();
    if (!text) return 0;
    return text.split(/\s+/).length;
  }, [form.body]);

  const charCount = useMemo(() => form.body.length, [form.body]);

  useEffect(() => {
    const key = `openvaartha_revs_${articleId || "new"}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        setRevisions(JSON.parse(stored));
      } catch (e) {
        setRevisions([]);
      }
    } else {
      setRevisions([]);
    }
  }, [articleId]);

  const saveRevision = (title: string, body: string) => {
    if (!body.trim()) return;
    const key = `openvaartha_revs_${articleId || "new"}`;
    const newRev = { date: new Date().toLocaleString(), title, body };
    setRevisions((prev) => {
      if (prev.length > 0 && prev[0].body === body && prev[0].title === title) {
        return prev;
      }
      const next = [newRev, ...prev].slice(0, 5);
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  };

  // Guard against losing unsaved changes (tab close / browser back)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty.current) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const markDirty = () => { dirty.current = true; };

  const resetDirty = () => { dirty.current = false; };

  const categoriesQuery = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: () => apiFetch<Category[]>("/categories/"),
  });

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: "", emoji: "📰", colorCode: "#641313" });

  const createCategoryMutation = useMutation({
    mutationFn: () =>
      apiFetch<Category>("/categories/", {
        method: "POST",
        body: JSON.stringify(newCategory),
      }),
    onSuccess: (cat) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
      setCategoryDialogOpen(false);
      setNewCategory({ name: "", emoji: "📰", colorCode: "#641313" });
      update("categoryId", cat.id);
      toast.success("Category created");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const articleQuery = useQuery({
    queryKey: ["admin", "article", articleId],
    queryFn: () => apiFetch<Article>(`/articles/${articleId}`),
    enabled: isEditing,
    retry: 1,
  });

  useEffect(() => {
    const article = articleQuery.data;
    if (!article) return;

    setForm({
      title: article.title,
      slug: article.slug || "",
      summary: article.summary,
      categoryId: article.categoryId,
      readTime: article.readTime,
      language: article.language,
      author: article.author,
      thumbnailUrl: article.thumbnailUrl || "",
      publishedAt: toDateInput(article.publishedAt),
      status: (article.status ?? "draft") as ArticleStatus,
      isTrending: article.isTrending,
      isBreaking: article.isBreaking,
      isEditorPick: article.isEditorPick,
      tldr: article.content?.tldr || "",
      points: article.content?.points?.join("\n") || "",
      body: article.content?.body || "",
      timeline: article.content?.timeline?.filter((t): t is TimelineEntry => !!t) || [],
      explainer: article.content?.explainer?.filter((e): e is ExplainerEntry => !!e) || [],
    });
    resetDirty();
  }, [articleQuery.data]);

  useEffect(() => {
    if (!form.categoryId && categoriesQuery.data?.[0]) {
      setForm((current) => ({ ...current, categoryId: categoriesQuery.data[0].id }));
    }
  }, [categoriesQuery.data, form.categoryId]);

  const safeDate = (d: string) => {
    if (!d) return new Date().toISOString();
    const parsed = new Date(d);
    if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
    return parsed.toISOString();
  };

  const payload = useMemo(() => ({
    title: form.title,
    slug: form.slug || undefined,
    summary: form.summary,
    category_id: form.categoryId,
    read_time: form.readTime,
    language: form.language,
    status: form.status,
    author: form.author,
    thumbnail_url: form.thumbnailUrl || null,
    published_at: safeDate(form.publishedAt),
    is_trending: form.isTrending,
    is_breaking: form.isBreaking,
    is_editor_pick: form.isEditorPick,
    content: {
      tldr: form.tldr,
      points: form.points.split("\n").map((point) => point.trim()).filter(Boolean),
      body: form.body,
      timeline: form.timeline.length > 0 ? form.timeline : null,
      explainer: form.explainer.length > 0 ? form.explainer : null,
    },
  }), [form]);

  const mutation = useMutation({
    mutationFn: () => {
      saveRevision(form.title, form.body);
      if (isEditing) {
        return apiFetch<Article>(`/articles/${articleId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      }
      return apiFetch<Article>("/articles/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "articles"] });
      resetDirty();
      toast.success(isEditing ? "Article updated" : "Article created");
      navigate("/admin/articles");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const update = (field: keyof FormState, value: string | boolean) => {
    markDirty();
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === "title" && !current.slug && !articleId) {
        next.slug = current.title.toLowerCase().replace(SLUG_CHARS, "-").replace(/^-+|-+$/g, "") || "article";
      }
      return next;
    });
  };

  const addTimelineEntry = () => {
    markDirty();
    setForm((current) => ({ ...current, timeline: [...current.timeline, { date: "", event: "" }] }));
  };

  const removeTimelineEntry = (index: number) => {
    markDirty();
    setForm((current) => ({ ...current, timeline: current.timeline.filter((_, i) => i !== index) }));
  };

  const updateTimelineEntry = (index: number, field: keyof TimelineEntry, value: string) => {
    markDirty();
    setForm((current) => {
      const timeline = [...current.timeline];
      timeline[index] = { ...timeline[index], [field]: value };
      return { ...current, timeline };
    });
  };

  const addExplainerEntry = () => {
    markDirty();
    setForm((current) => ({ ...current, explainer: [...current.explainer, { question: "", answer: "" }] }));
  };

  const removeExplainerEntry = (index: number) => {
    markDirty();
    setForm((current) => ({ ...current, explainer: current.explainer.filter((_, i) => i !== index) }));
  };

  const updateExplainerEntry = (index: number, field: keyof ExplainerEntry, value: string) => {
    markDirty();
    setForm((current) => {
      const explainer = [...current.explainer];
      explainer[index] = { ...explainer[index], [field]: value };
      return { ...current, explainer };
    });
  };

  // Ctrl+S to save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (!form.categoryId) {
          toast.error("Create a category before publishing articles");
          return;
        }
        mutation.mutate();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [form.categoryId, mutation.mutate]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.categoryId) {
      toast.error("Create a category before publishing articles");
      return;
    }
    mutation.mutate();
  };

  if (articleQuery.isLoading) {
    return (
      <div className="h-80 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (articleQuery.isError) {
    return (
      <div className="h-80 flex flex-col items-center justify-center gap-3">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm font-semibold text-destructive">Failed to load article</p>
        <p className="text-xs text-muted-foreground max-w-md text-center">{(articleQuery.error as Error)?.message}</p>
        <Button variant="outline" size="sm" onClick={() => articleQuery.refetch()}>
          <RotateCcw className="h-3.5 w-3.5" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <>
    <form onSubmit={onSubmit} className="max-w-6xl space-y-8 pb-20 lg:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            to="/admin/articles"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Articles
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{isEditing ? "Edit article" : "New article"}</h1>
        </div>
        <div className="flex items-center gap-2">
          <AIGenerateDialog onApply={(data) => {
            update("title", data.title);
            update("summary", data.summary);
            update("body", data.body);
            update("tldr", data.tldr);
            update("points", data.points.join("\n"));
            if (data.category_id) update("categoryId", data.category_id);
          }} />
          <Button type="submit" disabled={mutation.isPending} className="gap-2">
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-white/20 px-1.5 text-[10px] font-mono opacity-60">{isMac ? "⌘S" : "Ctrl+S"}</kbd>
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setPreviewOpen(true)} className="gap-1.5">
            <ExternalLink className="h-4 w-4" /> Preview
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-8">
        {/* Main content */}
        <section className="space-y-8">
          {/* Title & Summary */}
          <CardSection title="Headline">
            <Field label="Title">
              <Input value={form.title} onChange={(e) => update("title", e.target.value)} required placeholder="Article headline" />
            </Field>
            <Field label="Slug">
              <div className="flex gap-2">
                <Input
                  value={form.slug}
                  onChange={(e) => update("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, ""))}
                  placeholder="url-friendly-slug"
                  className="font-mono text-xs"
                />
                {(form.slug || articleQuery.data?.slug) && (
                  <Button type="button" variant="outline" size="icon" asChild>
                    <a href={`/${form.slug || articleQuery.data?.slug}`} target="_blank" rel="noopener noreferrer" title="Preview article">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">Auto-generated from title. Edit for SEO-friendly URLs.</p>
            </Field>
            <Field label="Summary">
              <Textarea value={form.summary} onChange={(e) => update("summary", e.target.value)} required rows={3} placeholder="Brief summary for cards and meta descriptions" />
            </Field>
          </CardSection>

          {/* Content */}
          <CardSection title="Content">
            <Field label="TL;DR">
              <Textarea value={form.tldr} onChange={(e) => update("tldr", e.target.value)} required rows={3} placeholder="One-line takeaway for busy readers" />
            </Field>
            <Field label="Key points">
              <Textarea value={form.points} onChange={(e) => update("points", e.target.value)} required rows={5} placeholder="One point per line" />
            </Field>
            <Field label="Body">
              <MDXBodyEditor value={form.body} onChange={(value) => update("body", value)} />
              <div className="text-xs text-muted-foreground text-right mt-1.5 font-semibold">
                {wordCount} words · {charCount} characters
              </div>
            </Field>
          </CardSection>

          {/* Timeline */}
          <CardSection
            title="Timeline"
            action={
              <Button type="button" variant="outline" size="sm" onClick={addTimelineEntry}>
                <Plus className="h-3.5 w-3.5" /> Add entry
              </Button>
            }
          >
            {form.timeline.length === 0 && (
              <p className="text-sm text-muted-foreground italic">No timeline entries. Add key events and their timestamps.</p>
            )}
            <div className="space-y-3">
              {form.timeline.map((entry, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Input
                    value={entry.date}
                    onChange={(e) => updateTimelineEntry(i, "date", e.target.value)}
                    placeholder="e.g. 10:00 AM"
                    className="w-36 shrink-0"
                  />
                  <Input
                    value={entry.event}
                    onChange={(e) => updateTimelineEntry(i, "event", e.target.value)}
                    placeholder="Event description"
                  />
                  <Button type="button" variant="outline" size="icon" onClick={() => removeTimelineEntry(i)} className="shrink-0 text-destructive hover:text-destructive">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardSection>

          {/* Explainer Q&A */}
          <CardSection
            title="Explainer Q&A"
            action={
              <Button type="button" variant="outline" size="sm" onClick={addExplainerEntry}>
                <Plus className="h-3.5 w-3.5" /> Add Q&A
              </Button>
            }
          >
            {form.explainer.length === 0 && (
              <p className="text-sm text-muted-foreground italic">No explainer entries. Add questions and answers for in-depth context.</p>
            )}
            <div className="space-y-4">
              {form.explainer.map((entry, i) => (
                <div key={i} className="border border-border rounded-lg p-4 space-y-3 relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeExplainerEntry(i)}
                    className="absolute top-3 right-3 h-7 w-7 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                  <Input
                    value={entry.question}
                    onChange={(e) => updateExplainerEntry(i, "question", e.target.value)}
                    placeholder="Question"
                    className="pr-8"
                  />
                  <Textarea
                    value={entry.answer}
                    onChange={(e) => updateExplainerEntry(i, "answer", e.target.value)}
                    placeholder="Answer"
                    rows={3}
                  />
                </div>
              ))}
            </div>
          </CardSection>
        </section>

        {/* Sidebar */}
        <aside className="space-y-6">
          {/* Publishing */}
          <CardSection title="Publishing">
            <Field label="Status">
              <Select value={form.status} onValueChange={(value) => update("status", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {ARTICLE_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Drafts and archived articles are invisible to readers.</p>
            </Field>
            <Field label="Category">
              <Select value={form.categoryId} onValueChange={(value) => update("categoryId", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categoriesQuery.data?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                  <div className="border-t border-border mt-1 pt-1">
                    <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                      <DialogTrigger asChild>
                        <button
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); setCategoryDialogOpen(true); }}
                          className="relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                        >
                          <Plus className="h-4 w-4" />
                          Create new category
                        </button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create category</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Field label="Name">
                            <Input
                              value={newCategory.name}
                              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                              placeholder="e.g. Technology"
                            />
                          </Field>
                          <Field label="Emoji">
                            <Input
                              value={newCategory.emoji}
                              onChange={(e) => setNewCategory({ ...newCategory, emoji: e.target.value })}
                              placeholder="📰"
                            />
                          </Field>
                          <Field label="Color">
                            <div className="flex gap-2 items-center">
                              <input
                                type="color"
                                value={newCategory.colorCode}
                                onChange={(e) => setNewCategory({ ...newCategory, colorCode: e.target.value })}
                                className="h-9 w-9 rounded cursor-pointer border border-border"
                              />
                              <Input
                                value={newCategory.colorCode}
                                onChange={(e) => setNewCategory({ ...newCategory, colorCode: e.target.value })}
                                placeholder="#641313"
                              />
                            </div>
                          </Field>
                          <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setCategoryDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              onClick={() => createCategoryMutation.mutate()}
                              disabled={!newCategory.name.trim() || createCategoryMutation.isPending}
                            >
                              {createCategoryMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                              Create
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Author">
              <Input value={form.author} onChange={(e) => update("author", e.target.value)} required />
            </Field>
            <Field label="Read time">
              <Input value={form.readTime} onChange={(e) => update("readTime", e.target.value)} required placeholder="e.g. 5 min read" />
            </Field>
            <Field label="Published">
              <Input type="datetime-local" value={form.publishedAt} onChange={(e) => update("publishedAt", e.target.value)} required className="[&::-webkit-calendar-picker-indicator]:opacity-50" />
            </Field>
          </CardSection>

          {/* Media */}
          <CardSection title="Media">
            <Field label="Thumbnail URL">
              <div className="flex gap-2">
                <Input value={form.thumbnailUrl} onChange={(e) => update("thumbnailUrl", e.target.value)} placeholder="https://..." className="flex-1" />
              </div>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files?.[0];
                  if (file && file.type.startsWith("image/")) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      if (event.target?.result) {
                        update("thumbnailUrl", event.target.result as string);
                        toast.success("Image uploaded successfully (Base64)");
                      }
                    };
                    reader.readAsDataURL(file);
                  } else {
                    toast.error("Only image files are supported");
                  }
                }}
                className="mt-2 border-2 border-dashed border-border rounded-lg p-4 text-center hover:bg-muted/50 hover:border-primary/40 transition-colors cursor-pointer"
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "image/*";
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        if (event.target?.result) {
                          update("thumbnailUrl", event.target.result as string);
                          toast.success("Image uploaded successfully (Base64)");
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  };
                  input.click();
                }}
              >
                {form.thumbnailUrl ? (
                  <div className="relative rounded overflow-hidden">
                    <img
                      src={form.thumbnailUrl}
                      alt="Thumbnail preview"
                      className="w-full h-32 object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <span className="text-white text-xs font-semibold">Change Image</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 text-muted-foreground">
                    <p className="text-xs font-bold text-foreground">Click to upload or drag & drop</p>
                    <p className="text-[10px]">PNG, JPG, WEBP up to 5MB</p>
                  </div>
                )}
              </div>
            </Field>
          </CardSection>
          <CardSection title="Flags">
            <div className="space-y-3">
              <FlagRow label="Trending" checked={form.isTrending} onCheckedChange={(checked) => update("isTrending", checked)} />
              <FlagRow label="Breaking" checked={form.isBreaking} onCheckedChange={(checked) => update("isBreaking", checked)} />
              <FlagRow label="Editor pick" checked={form.isEditorPick} onCheckedChange={(checked) => update("isEditorPick", checked)} />
            </div>
          </CardSection>

          {/* Local Revisions */}
          <CardSection title="Local Revisions">
            {revisions.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No local revisions saved yet.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto divide-y divide-border">
                {revisions.map((rev, idx) => (
                  <div key={idx} className="pt-2 first:pt-0 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold text-muted-foreground">{rev.date}</p>
                      <p className="text-xs font-semibold truncate text-foreground">{rev.title || "Untitled"}</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] px-1.5 shrink-0"
                      onClick={() => {
                        update("title", rev.title);
                        update("body", rev.body);
                        toast.success("Revision restored");
                      }}
                    >
                      Restore
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardSection>
        </aside>
      </div>

      {/* Sticky Bottom Action Bar on Mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border p-3 z-50 flex items-center justify-between gap-3 shadow-lg safe-bottom">
        <div className="flex-1 max-w-[140px]">
          <Select value={form.status} onValueChange={(value) => update("status", value)}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {ARTICLE_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 flex-1 justify-end">
          <Button type="button" variant="outline" className="h-10 px-3 shrink-0" onClick={() => setPreviewOpen(true)}>
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button type="submit" disabled={mutation.isPending} className="h-10 gap-2 flex-1 justify-center">
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>
        </div>
      </div>
    </form>

    {/* Live Preview Modal */}
    <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Live Preview</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 pt-4">
          <div className="space-y-2 border-b border-border pb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              {categoriesQuery.data?.find(c => c.id === form.categoryId)?.name || "General"}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black leading-tight tracking-tight text-foreground">{form.title || "Untitled Headline"}</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{form.author}</span>
              <span>·</span>
              <span>{form.readTime}</span>
              <span>·</span>
              <span>{new Date(form.publishedAt).toLocaleDateString()}</span>
            </div>
          </div>

          {form.thumbnailUrl && (
            <div className="rounded-xl overflow-hidden border border-border bg-muted max-h-80">
              <img src={form.thumbnailUrl} alt="Thumbnail preview" className="w-full h-full object-cover" />
            </div>
          )}

          {form.tldr && (
            <div className="p-4 rounded-xl border border-primary/20 bg-[hsl(var(--primary-subtle))]">
              <p className="text-sm font-bold text-foreground leading-relaxed">
                <span className="text-primary mr-1">TL;DR:</span> {form.tldr}
              </p>
            </div>
          )}

          {form.points && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Key Highlights</h3>
              <ul className="list-disc pl-5 text-sm text-foreground space-y-1 leading-relaxed">
                {form.points.split("\n").filter(Boolean).map((pt, i) => (
                  <li key={i}>{pt}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-2 border-t border-border pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Body</h3>
            <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed text-foreground whitespace-pre-wrap font-sans">
              {form.body || "No body content written yet."}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}

/* ── Sub-components ──────────────────────────────────── */

function CardSection({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function FlagRow({ label, checked, onCheckedChange }: { label: string; checked: boolean; onCheckedChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="cursor-pointer">{label}</Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
