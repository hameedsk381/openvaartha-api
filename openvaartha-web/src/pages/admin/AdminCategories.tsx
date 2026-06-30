import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Check, Loader2, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import type { Category } from "./types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import ConfirmDialog from "@/components/ConfirmDialog";

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
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const { data: categories = [], isLoading, isError, error, refetch } = useQuery({
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
    setDeleteTarget(category);
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage sections used by articles.</p>
      </div>

      {isError && (
        <div className="border border-destructive/30 rounded-xl p-8 text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <p className="text-sm font-semibold text-destructive">Failed to load categories</p>
          <p className="text-xs text-muted-foreground">{(error as Error)?.message}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RotateCcw className="h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      )}

      <form onSubmit={onSubmit} className="border border-border rounded-xl p-5 grid md:grid-cols-[1fr_120px_140px_auto] gap-4 items-end">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required placeholder="e.g. Politics" />
        </div>
        <div className="space-y-2">
          <Label>Emoji</Label>
          <Input value={draft.emoji} onChange={(e) => setDraft({ ...draft, emoji: e.target.value })} required placeholder="e.g. 🏛️" />
        </div>
        <div className="space-y-2">
          <Label>Color</Label>
          <input
            type="color"
            value={draft.colorCode}
            onChange={(e) => setDraft({ ...draft, colorCode: e.target.value })}
            className="h-10 w-full rounded-md border border-input bg-background px-1 cursor-pointer"
          />
        </div>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add
        </Button>
      </form>

      <div className="border border-border rounded-xl overflow-hidden">
        <div className="hidden md:grid grid-cols-[80px_1fr_180px_160px] gap-4 h-11 px-5 items-center border-b border-border bg-muted/50 text-xs font-semibold text-muted-foreground">
          <span>Icon</span>
          <span>Name</span>
          <span>Color</span>
          <span className="text-right">Actions</span>
        </div>
        {isLoading ? (
          <div className="h-32 flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
          </div>
        ) : (
        <div className="divide-y divide-border">
          {categories.map((category) => {
            const isEditing = editingId === category.id;
            const isMutating =
              (updateMutation.isPending && updateMutation.variables === category.id) ||
              (deleteMutation.isPending && deleteMutation.variables === category.id);
            return (
              <div key={category.id} className="block md:grid md:grid-cols-[80px_1fr_180px_160px] md:gap-4 md:items-center p-4 md:px-5">
                <div className="mb-1 md:mb-0 flex md:block items-center gap-2">
                  <span className="text-xs text-muted-foreground md:hidden">Icon: </span>
                  {isEditing ? (
                    <Input value={edit.emoji} onChange={(e) => setEdit({ ...edit, emoji: e.target.value })} className="h-9 text-sm" />
                  ) : (
                    <span className="text-xl">{category.emoji}</span>
                  )}
                </div>
                <div className="mb-1 md:mb-0 flex md:block items-center gap-2">
                  <span className="text-xs text-muted-foreground md:hidden">Name: </span>
                  {isEditing ? (
                    <Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className="h-9 text-sm" />
                  ) : (
                    <span className="text-sm font-semibold">{category.name}</span>
                  )}
                </div>
                <div className="mb-2 md:mb-0 flex md:block items-center gap-2">
                  <span className="text-xs text-muted-foreground md:hidden">Color: </span>
                  {isEditing ? (
                    <input
                      type="color"
                      value={edit.colorCode}
                      onChange={(e) => setEdit({ ...edit, colorCode: e.target.value })}
                      className="h-9 w-full max-w-[100px] rounded-md border border-input bg-background px-1 cursor-pointer"
                    />
                  ) : (
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="h-4 w-4 rounded-sm border border-border" style={{ backgroundColor: category.colorCode }} />
                      {category.colorCode}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  {isEditing ? (
                    <>
                      <Button type="button" size="icon" onClick={() => updateMutation.mutate(category.id)} disabled={isMutating || !edit.name.trim()}>
                        {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </Button>
                      <Button type="button" variant="outline" size="icon" onClick={cancelEdit}>
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button type="button" variant="outline" size="icon" onClick={() => startEdit(category)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="outline" size="icon" onClick={() => confirmDelete(category)} disabled={isMutating} className="text-destructive hover:text-destructive">
                        {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {!isLoading && categories.length === 0 && (
            <div className="p-8 text-sm text-muted-foreground text-center">No categories found.</div>
          )}
        </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete category"
        description={`Delete category "${deleteTarget?.name}"? Articles using it must be reassigned first.`}
        confirmLabel="Delete"
        onConfirm={() => { if (deleteTarget) { deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null); } }}
      />
    </div>
  );
}
