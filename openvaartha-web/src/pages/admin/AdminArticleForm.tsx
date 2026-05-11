import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { ARTICLE_STATUSES, type Article, type ArticleStatus, type Category } from "./types";

type FormState = {
  title: string;
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
};

const emptyForm: FormState = {
  title: "",
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
    });
  }, [articleQuery.data]);

  useEffect(() => {
    if (!form.categoryId && categoriesQuery.data?.[0]) {
      setForm((current) => ({ ...current, categoryId: categoriesQuery.data[0].id }));
    }
  }, [categoriesQuery.data, form.categoryId]);

  const payload = useMemo(() => ({
    title: form.title,
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
    setForm((current) => ({ ...current, [field]: value }));
  };

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
    <form onSubmit={onSubmit} className="max-w-5xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Link to="/admin/articles" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="h-4 w-4" />
            Articles
          </Link>
          <h1 className="text-2xl font-black tracking-tight">{isEditing ? "Edit article" : "New article"}</h1>
        </div>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="h-10 px-4 rounded-md bg-primary text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50"
        >
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </button>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <section className="space-y-4">
          <Field label="Title">
            <input value={form.title} onChange={(event) => update("title", event.target.value)} required className="input-admin" />
          </Field>
          <Field label="Summary">
            <textarea value={form.summary} onChange={(event) => update("summary", event.target.value)} required rows={3} className="input-admin" />
          </Field>
          <Field label="TLDR">
            <textarea value={form.tldr} onChange={(event) => update("tldr", event.target.value)} required rows={3} className="input-admin" />
          </Field>
          <Field label="Key points">
            <textarea value={form.points} onChange={(event) => update("points", event.target.value)} required rows={5} className="input-admin" placeholder="One point per line" />
          </Field>
          <Field label="Body">
            <textarea value={form.body} onChange={(event) => update("body", event.target.value)} required rows={12} className="input-admin" />
          </Field>
        </section>

        <aside className="space-y-4">
          <div className="border border-border rounded-lg p-4 space-y-4">
            <Field label="Status">
              <select
                value={form.status}
                onChange={(event) => update("status", event.target.value)}
                className="input-admin"
              >
                {ARTICLE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status[0].toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Drafts and archived articles are invisible to readers.
              </p>
            </Field>
            <Field label="Category">
              <select value={form.categoryId} onChange={(event) => update("categoryId", event.target.value)} className="input-admin">
                {categoriesQuery.data?.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Author">
              <input value={form.author} onChange={(event) => update("author", event.target.value)} required className="input-admin" />
            </Field>
            <Field label="Read time">
              <input value={form.readTime} onChange={(event) => update("readTime", event.target.value)} required className="input-admin" />
            </Field>
            <Field label="Published">
              <input type="datetime-local" value={form.publishedAt} onChange={(event) => update("publishedAt", event.target.value)} required className="input-admin" />
            </Field>
            <Field label="Thumbnail URL">
              <input value={form.thumbnailUrl} onChange={(event) => update("thumbnailUrl", event.target.value)} className="input-admin" />
            </Field>
            <Field label="Instagram URL">
              <input value={form.instagramUrl} onChange={(event) => update("instagramUrl", event.target.value)} className="input-admin" />
            </Field>
          </div>

          <div className="border border-border rounded-lg p-4 space-y-3">
            <Toggle label="Trending" checked={form.isTrending} onChange={(checked) => update("isTrending", checked)} />
            <Toggle label="Breaking" checked={form.isBreaking} onChange={(checked) => update("isBreaking", checked)} />
            <Toggle label="Editor pick" checked={form.isEditorPick} onChange={(checked) => update("isEditorPick", checked)} />
          </div>
        </aside>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-sm font-semibold">{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
    </label>
  );
}
