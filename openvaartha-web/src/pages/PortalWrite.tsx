import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { PenSquare, ArrowLeft, Loader2, Save, X, ExternalLink, AlertCircle, Plus, BookOpen, Clock, FileText, ChevronRight, CheckCircle2, AlertTriangle, Eye } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MDXBodyEditor from "@/components/MDXBodyEditor";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Contribution = {
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
  content?: {
    tldr: string;
    points: string[];
    body: string;
  };
};

type Category = {
  id: string;
  name: string;
  emoji?: string;
};

const emptyForm = {
  title: "",
  summary: "",
  categoryId: "",
  readTime: "5 min read",
  thumbnailUrl: "",
  tldr: "",
  points: "",
  body: "",
};

export default function PortalWrite() {
  const queryClient = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const categoriesQuery = useQuery({
    queryKey: ["portal", "categories"],
    queryFn: () => apiFetch<Category[]>("/categories/"),
  });

  const contributionsQuery = useQuery({
    queryKey: ["portal", "contributions"],
    queryFn: () => apiFetch<Contribution[]>("/articles/mine"),
  });

  const update = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const wordCount = useMemo(() => {
    const text = form.body.trim();
    if (!text) return 0;
    return text.split(/\s+/).length;
  }, [form.body]);

  const charCount = useMemo(() => form.body.length, [form.body]);

  const createMutation = useMutation({
    mutationFn: (payload: any) =>
      apiFetch<Contribution>("/articles/contributions", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal", "contributions"] });
      toast.success("Column submitted for editor review");
      closeEditor();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      apiFetch<Contribution>(`/articles/contributions/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal", "contributions"] });
      toast.success("Changes saved successfully");
      closeEditor();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const withdrawMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/articles/contributions/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal", "contributions"] });
      toast.success("Contribution withdrawn successfully");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const closeEditor = () => {
    setEditorOpen(false);
    setActiveId(null);
    setForm(emptyForm);
  };

  const handleEdit = (c: Contribution) => {
    setActiveId(c.id);
    setForm({
      title: c.title,
      summary: c.summary,
      categoryId: c.categoryId,
      readTime: c.readTime,
      thumbnailUrl: c.thumbnailUrl || "",
      tldr: c.content?.tldr || "",
      points: c.content?.points?.join("\n") || "",
      body: c.content?.body || "",
    });
    setEditorOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.summary.trim() || !form.body.trim()) {
      toast.error("Please fill in all required fields (Title, Summary, and Body)");
      return;
    }

    const payload = {
      title: form.title,
      summary: form.summary,
      categoryId: form.categoryId || categoriesQuery.data?.[0]?.id || "",
      readTime: form.readTime,
      thumbnailUrl: form.thumbnailUrl || null,
      content: {
        tldr: form.tldr,
        points: form.points.split("\n").map(p => p.trim()).filter(Boolean),
        body: form.body,
      },
    };

    if (activeId) {
      updateMutation.mutate({ id: activeId, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const contributions = contributionsQuery.data ?? [];
  const pendingCount = contributions.filter(c => c.status === "pending").length;
  const publishedCount = contributions.filter(c => c.status === "published").length;

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="overline mb-1">Contributor Portal</p>
          <h1 className="text-2xl font-black tracking-tight">Opinion Columns</h1>
        </div>
        <Button onClick={() => setEditorOpen(true)} className="gap-2 self-start sm:self-auto shadow-maroon">
          <Plus className="h-4 w-4" />
          Write Column
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border border-border rounded-xl p-5 bg-card">
          <p className="text-xs text-muted-foreground overline">Total Submissions</p>
          <p className="text-3xl font-black mt-2 text-foreground">{contributions.length}</p>
        </div>
        <div className="border border-border rounded-xl p-5 bg-card">
          <p className="text-xs text-muted-foreground overline">Pending Review</p>
          <p className="text-3xl font-black mt-2 text-yellow-600 dark:text-yellow-400">{pendingCount}</p>
        </div>
        <div className="border border-border rounded-xl p-5 bg-card">
          <p className="text-xs text-muted-foreground overline">Published Columns</p>
          <p className="text-3xl font-black mt-2 text-green-600 dark:text-green-400">{publishedCount}</p>
        </div>
      </div>

      {/* Column Submissions List */}
      <div className="border border-border rounded-xl bg-card overflow-hidden">
        <div className="p-4 border-b border-border bg-[hsl(var(--surface))]">
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">My Submissions</h2>
        </div>
        
        {contributionsQuery.isLoading ? (
          <div className="p-8 text-center">
            <Loader2 className="h-6 w-6 text-primary animate-spin mx-auto" />
          </div>
        ) : contributions.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground space-y-2">
            <BookOpen className="h-8 w-8 mx-auto opacity-40 text-primary" />
            <p className="text-sm font-semibold">No columns written yet</p>
            <p className="text-xs max-w-sm mx-auto">Click "Write Column" at the top to draft your first column piece!</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {contributions.map((c) => (
              <div key={c.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      {categoriesQuery.data?.find(cat => cat.id === c.categoryId)?.name || "General"}
                    </span>
                    <span className="text-muted-foreground text-xs font-serif">·</span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                      c.status === "published" ? "bg-green-500/10 text-green-600 border border-green-500/20" :
                      c.status === "pending" ? "bg-yellow-500/10 text-yellow-600 border border-yellow-500/20" :
                      "bg-muted text-muted-foreground border border-border"
                    }`}>
                      {c.status}
                    </span>
                  </div>
                  <h3 className="font-serif font-bold text-base text-foreground line-clamp-1">{c.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{c.summary}</p>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                  {c.status === "published" ? (
                    <Button variant="outline" size="sm" asChild className="h-8">
                      <Link to={`/article/${c.slug}`}>
                        <Eye className="h-3.5 w-3.5 mr-1" /> View Live
                      </Link>
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(c)} className="h-8">
                        Edit Draft
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm("Are you sure you want to withdraw this contribution?")) {
                            withdrawMutation.mutate(c.id);
                          }
                        }}
                        disabled={withdrawMutation.isPending}
                        className="h-8 text-destructive border-destructive/20 hover:bg-destructive/5 hover:text-destructive"
                      >
                        {withdrawMutation.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                        Withdraw
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Editor Drawer / Modal */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-4xl bg-background border-l border-border h-full flex flex-col shadow-xl">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-[hsl(var(--surface))]">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                  {activeId ? "Edit Column Submission" : "Submit New Column"}
                </h2>
                <p className="text-[10px] text-muted-foreground">Draft your column piece for editorial approval.</p>
              </div>
              <button onClick={closeEditor} className="h-8 w-8 hover:bg-muted rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Form body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
                {/* Main section */}
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="col-title">Column Title *</Label>
                    <Input
                      id="col-title"
                      value={form.title}
                      onChange={(e) => update("title", e.target.value)}
                      placeholder="Give your column a punchy headline"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="col-summary">Brief Summary / Subtitle *</Label>
                    <Textarea
                      id="col-summary"
                      value={form.summary}
                      onChange={(e) => update("summary", e.target.value)}
                      placeholder="Write a brief subtitle or hook for the grid thumbnail..."
                      rows={2}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Column body *</Label>
                    <MDXBodyEditor value={form.body} onChange={(value) => update("body", value)} />
                    <div className="text-xs text-muted-foreground text-right mt-1.5">
                      {wordCount} words · {charCount} characters
                    </div>
                  </div>
                </div>

                {/* Side panel parameters */}
                <div className="space-y-6">
                  <div className="border border-border rounded-xl p-4 bg-muted/30 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Parameters</h3>
                    
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={form.categoryId} onValueChange={(value) => update("categoryId", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categoriesQuery.data?.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Read Time</Label>
                      <Input value={form.readTime} onChange={(e) => update("readTime", e.target.value)} placeholder="e.g. 5 min read" />
                    </div>

                    <div className="space-y-2">
                      <Label>TL;DR Summary (Optional)</Label>
                      <Textarea
                        value={form.tldr}
                        onChange={(e) => update("tldr", e.target.value)}
                        placeholder="One-line takeaway..."
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Key Points (One per line)</Label>
                      <Textarea
                        value={form.points}
                        onChange={(e) => update("points", e.target.value)}
                        placeholder="Highlights..."
                        rows={3}
                      />
                    </div>
                  </div>

                  {/* Thumbnail drop zone */}
                  <div className="border border-border rounded-xl p-4 bg-muted/30 space-y-2">
                    <Label>Column Thumbnail Image</Label>
                    <div
                      onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                      onDrop={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        const file = e.dataTransfer.files?.[0];
                        if (file && file.type.startsWith("image/")) {
                          const reader = new FileReader();
                          reader.onload = ev => {
                            if (ev.target?.result) {
                              update("thumbnailUrl", ev.target.result as string);
                              toast.success("Image drop loaded");
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      onClick={() => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.accept = "image/*";
                        input.onchange = ev => {
                          const file = (ev.target as HTMLInputElement).files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = e => {
                              if (e.target?.result) update("thumbnailUrl", e.target.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        };
                        input.click();
                      }}
                      className="border border-dashed border-border hover:border-primary/40 rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      {form.thumbnailUrl ? (
                        <img src={form.thumbnailUrl} alt="Thumbnail" className="w-full h-24 object-cover rounded" />
                      ) : (
                        <div className="text-muted-foreground space-y-1">
                          <p className="text-[10px] font-bold text-foreground">Click to upload photo</p>
                          <p className="text-[9px]">Drag image files here</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Editorial Guidelines */}
                  <div className="border border-primary/10 bg-primary/5 rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center gap-1.5 text-primary text-[10px] font-bold uppercase tracking-wider">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Column Guidelines
                    </div>
                    <ul className="text-[10px] text-muted-foreground list-disc pl-4 space-y-1 leading-relaxed">
                      <li>Maintain an analytical, opinionated but fair perspective.</li>
                      <li>Highlight key points clearly.</li>
                      <li>Double-check grammar and readability metrics.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-4 border-t border-border flex items-center justify-between gap-4">
                <Button type="button" variant="outline" onClick={() => setPreviewOpen(true)} className="gap-1.5 h-11 px-4">
                  <Eye className="h-4 w-4" /> Live Preview
                </Button>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={closeEditor} className="h-11 px-4">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="gap-2 h-11 px-5 shadow-maroon">
                    {(createMutation.isPending || updateMutation.isPending) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Submit for Approval
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Preview Submitting Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="space-y-2 border-b border-border pb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                {categoriesQuery.data?.find(c => c.id === form.categoryId)?.name || "General"} · Opinion Column
              </span>
              <h1 className="text-2xl font-black leading-tight text-foreground">{form.title || "Untitled Column"}</h1>
              <p className="text-xs text-muted-foreground">{form.readTime}</p>
            </div>

            {form.thumbnailUrl && (
              <div className="rounded-xl overflow-hidden max-h-60 border border-border">
                <img src={form.thumbnailUrl} alt="Thumbnail preview" className="w-full h-full object-cover" />
              </div>
            )}

            {form.tldr && (
              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5">
                <p className="text-sm font-semibold text-foreground leading-relaxed">
                  <span className="text-primary mr-1">TL;DR:</span> {form.tldr}
                </p>
              </div>
            )}

            {form.points && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Highlights</h3>
                <ul className="list-disc pl-5 text-sm text-foreground space-y-1">
                  {form.points.split("\n").filter(Boolean).map((pt, i) => (
                    <li key={i}>{pt}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-2 border-t border-border pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Column Body</h3>
              <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed text-foreground whitespace-pre-wrap font-sans">
                {form.body || "No body content written."}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
