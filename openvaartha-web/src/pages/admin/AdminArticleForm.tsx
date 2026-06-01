import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { ARTICLE_STATUSES, type Article, type ArticleStatus, type Category } from "./types";
import { cn } from "@/lib/utils";
import MDXBodyEditor from "@/components/MDXBodyEditor";
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
  instagramUrl: string;
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
  author: "Open Vaartha Desk",
  thumbnailUrl: "",
  instagramUrl: "",
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
      instagramUrl: article.instagramUrl || "",
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
  }, [articleQuery.data]);

  useEffect(() => {
    if (!form.categoryId && categoriesQuery.data?.[0]) {
      setForm((current) => ({ ...current, categoryId: categoriesQuery.data[0].id }));
    }
  }, [categoriesQuery.data, form.categoryId]);

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
    instagram_url: form.instagramUrl || null,
    published_at: new Date(form.publishedAt).toISOString(),
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
      toast.success(isEditing ? "Article updated" : "Article created");
      navigate("/admin/articles");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const update = (field: keyof FormState, value: string | boolean) => {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === "title" && !current.slug && !articleId) {
        next.slug = current.title.toLowerCase().replace(SLUG_CHARS, "-").replace(/^-+|-+$/g, "") || "article";
      }
      return next;
    });
  };

  const addTimelineEntry = () => {
    setForm((current) => ({ ...current, timeline: [...current.timeline, { date: "", event: "" }] }));
  };

  const removeTimelineEntry = (index: number) => {
    setForm((current) => ({ ...current, timeline: current.timeline.filter((_, i) => i !== index) }));
  };

  const updateTimelineEntry = (index: number, field: keyof TimelineEntry, value: string) => {
    setForm((current) => {
      const timeline = [...current.timeline];
      timeline[index] = { ...timeline[index], [field]: value };
      return { ...current, timeline };
    });
  };

  const addExplainerEntry = () => {
    setForm((current) => ({ ...current, explainer: [...current.explainer, { question: "", answer: "" }] }));
  };

  const removeExplainerEntry = (index: number) => {
    setForm((current) => ({ ...current, explainer: current.explainer.filter((_, i) => i !== index) }));
  };

  const updateExplainerEntry = (index: number, field: keyof ExplainerEntry, value: string) => {
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

  return (
    <form onSubmit={onSubmit} className="max-w-6xl space-y-8">
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
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-white/20 px-1.5 text-[10px] font-mono opacity-60">⌘S</kbd>
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
              <Input value={form.thumbnailUrl} onChange={(e) => update("thumbnailUrl", e.target.value)} placeholder="https://..." />
              {form.thumbnailUrl && (
                <div className="mt-2 rounded-md overflow-hidden border border-border bg-muted">
                  <img
                    src={form.thumbnailUrl}
                    alt="Thumbnail preview"
                    className="w-full h-36 object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              )}
            </Field>
            <Field label="Instagram URL">
              <Input value={form.instagramUrl} onChange={(e) => update("instagramUrl", e.target.value)} placeholder="https://instagram.com/p/..." />
            </Field>
          </CardSection>

          {/* Flags */}
          <CardSection title="Flags">
            <div className="space-y-3">
              <FlagRow label="Trending" checked={form.isTrending} onCheckedChange={(checked) => update("isTrending", checked)} />
              <FlagRow label="Breaking" checked={form.isBreaking} onCheckedChange={(checked) => update("isBreaking", checked)} />
              <FlagRow label="Editor pick" checked={form.isEditorPick} onCheckedChange={(checked) => update("isEditorPick", checked)} />
            </div>
          </CardSection>
        </aside>
      </div>
    </form>
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
