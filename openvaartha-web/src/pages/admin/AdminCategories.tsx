import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import type { Category } from "./types";

type DraftCategory = {
  name: string;
  emoji: string;
  colorCode: string;
};

const emptyDraft: DraftCategory = { name: "", emoji: "", colorCode: "#641313" };

export default function AdminCategories() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<DraftCategory>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<DraftCategory>(emptyDraft);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: () => apiFetch<Category[]>("/categories/"),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<Category>("/categories/", {
        method: "POST",
        body: JSON.stringify({ name: draft.name, emoji: draft.emoji, color_code: draft.colorCode }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
      setDraft(emptyDraft);
      toast.success("Category created");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<Category>(`/categories/${id}`, {
        method: "PUT",
        body: JSON.stringify({ name: edit.name, emoji: edit.emoji, color_code: edit.colorCode }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
      setEditingId(null);
      toast.success("Category updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ message: string }>(`/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
      toast.success("Category deleted");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim() || !draft.emoji.trim()) return;
    createMutation.mutate();
  };

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setEdit({ name: category.name, emoji: category.emoji, colorCode: category.colorCode });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEdit(emptyDraft);
  };

  const confirmDelete = (category: Category) => {
    if (!confirm(`Delete category "${category.name}"? Articles using it must be reassigned first.`)) {
      return;
    }
    deleteMutation.mutate(category.id);
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Categories</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage sections used by articles.</p>
      </div>

      <form
        onSubmit={onSubmit}
        className="border border-border rounded-lg p-4 grid md:grid-cols-[1fr_120px_140px_auto] gap-3 items-end"
      >
        <label className="space-y-1.5">
          <span className="text-xs font-semibold text-muted-foreground">Name</span>
          <input
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            required
            className="input-admin"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-semibold text-muted-foreground">Emoji</span>
          <input
            value={draft.emoji}
            onChange={(event) => setDraft({ ...draft, emoji: event.target.value })}
            required
            className="input-admin"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-semibold text-muted-foreground">Color</span>
          <input
            type="color"
            value={draft.colorCode}
            onChange={(event) => setDraft({ ...draft, colorCode: event.target.value })}
            className="h-10 w-full rounded-md border border-border bg-background"
          />
        </label>
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="h-10 px-4 rounded-md bg-primary text-white text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add
        </button>
      </form>

        <div className="border border-border rounded-lg overflow-hidden">
        <div className="hidden md:grid grid-cols-[80px_1fr_180px_160px] gap-4 h-11 px-4 items-center border-b border-border bg-[hsl(var(--surface))] text-xs font-semibold text-muted-foreground">
          <span>Icon</span>
          <span>Name</span>
          <span>Color</span>
          <span className="text-right">Actions</span>
        </div>
        <div className="divide-y divide-border">
          {categories.map((category) => {
            const isEditing = editingId === category.id;
            const isMutating =
              (updateMutation.isPending && updateMutation.variables === category.id) ||
              (deleteMutation.isPending && deleteMutation.variables === category.id);
            return (
              <div
                key={category.id}
                className="block md:grid md:grid-cols-[80px_1fr_180px_160px] md:gap-4 md:items-center p-4"
              >
                <div className="mb-1 md:mb-0 flex md:block items-center gap-2">
                  <span className="text-xs text-muted-foreground md:hidden">Icon:</span>
                  {isEditing ? (
                    <input
                      value={edit.emoji}
                      onChange={(event) => setEdit({ ...edit, emoji: event.target.value })}
                      className="input-admin"
                    />
                  ) : (
                    <span className="text-xl">{category.emoji}</span>
                  )}
                </div>
                <div className="mb-1 md:mb-0 flex md:block items-center gap-2">
                  <span className="text-xs text-muted-foreground md:hidden">Name:</span>
                  {isEditing ? (
                    <input
                      value={edit.name}
                      onChange={(event) => setEdit({ ...edit, name: event.target.value })}
                      className="input-admin"
                    />
                  ) : (
                    <span className="text-sm font-semibold">{category.name}</span>
                  )}
                </div>
                <div className="mb-2 md:mb-0 flex md:block items-center gap-2">
                  <span className="text-xs text-muted-foreground md:hidden">Color:</span>
                  {isEditing ? (
                    <input
                      type="color"
                      value={edit.colorCode}
                      onChange={(event) => setEdit({ ...edit, colorCode: event.target.value })}
                      className="h-10 w-full max-w-[100px] rounded-md border border-border bg-background"
                    />
                  ) : (
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <span
                        className="h-4 w-4 rounded-sm border border-border"
                        style={{ backgroundColor: category.colorCode }}
                      />
                      {category.colorCode}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-end md:justify-end gap-2">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => updateMutation.mutate(category.id)}
                        disabled={isMutating || !edit.name.trim()}
                        className="h-10 w-10 rounded-md bg-primary text-white inline-flex items-center justify-center disabled:opacity-50"
                        aria-label="Save"
                      >
                        {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="h-10 w-10 rounded-md border border-border inline-flex items-center justify-center text-muted-foreground hover:bg-muted"
                        aria-label="Cancel"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => startEdit(category)}
                        className="h-10 w-10 rounded-md border border-border inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
                        aria-label="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => confirmDelete(category)}
                        disabled={isMutating}
                        className="h-10 w-10 rounded-md border border-border inline-flex items-center justify-center text-destructive hover:bg-destructive/10 disabled:opacity-50"
                        aria-label="Delete"
                      >
                        {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {!isLoading && categories.length === 0 ? (
            <div className="p-8 text-sm text-muted-foreground">No categories found.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
