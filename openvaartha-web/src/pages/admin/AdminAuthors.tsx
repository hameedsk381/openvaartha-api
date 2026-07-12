import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Pencil, Twitter } from "lucide-react";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { Check } from "@/components/animate-ui/icons/check";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { Plus } from "@/components/animate-ui/icons/plus";
import { RotateCcw } from "@/components/animate-ui/icons/rotate-ccw";
import { Trash2 } from "@/components/animate-ui/icons/trash-2";
import { X } from "@/components/animate-ui/icons/x";
import { User as UserIcon } from "@/components/animate-ui/icons/user";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ConfirmDialog from "@/components/ConfirmDialog";

type Author = {
  id: string;
  name: string;
  bio?: string;
  avatarUrl?: string;
  twitter?: string;
  createdAt: string;
};

type DraftAuthor = {
  name: string;
  bio: string;
  avatarUrl: string;
  twitter: string;
};

const emptyDraft: DraftAuthor = { name: "", bio: "", avatarUrl: "", twitter: "" };

export default function AdminAuthors() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<DraftAuthor>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<DraftAuthor>(emptyDraft);
  const [deleteTarget, setDeleteTarget] = useState<Author | null>(null);

  const { data: authors = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin", "authors"],
    queryFn: () => apiFetch<Author[]>("/authors/"),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<Author>("/authors/", {
        method: "POST",
        body: JSON.stringify({
          name: draft.name,
          bio: draft.bio || null,
          avatar_url: draft.avatarUrl || null,
          twitter: draft.twitter || null,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "authors"] });
      setDraft(emptyDraft);
      toast.success("Author created");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<Author>(`/authors/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: edit.name,
          bio: edit.bio || null,
          avatar_url: edit.avatarUrl || null,
          twitter: edit.twitter || null,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "authors"] });
      setEditingId(null);
      toast.success("Author updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ message: string }>(`/authors/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "authors"] });
      toast.success("Author deleted");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim()) return;
    createMutation.mutate();
  };

  const startEdit = (author: Author) => {
    setEditingId(author.id);
    setEdit({
      name: author.name,
      bio: author.bio || "",
      avatarUrl: author.avatarUrl || "",
      twitter: author.twitter || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEdit(emptyDraft);
  };

  const handleAvatarUpload = (isEditMode: boolean) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = ev => {
      const file = (ev.target as HTMLInputElement).files?.[0];
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        toast.loading("Uploading avatar...", { id: "upload-author-avatar" });
        apiFetch<{ url: string }>("/upload/", {
          method: "POST",
          body: formData,
        })
          .then((res) => {
            if (isEditMode) {
              setEdit(p => ({ ...p, avatarUrl: res.url }));
            } else {
              setDraft(p => ({ ...p, avatarUrl: res.url }));
            }
            toast.success("Avatar uploaded", { id: "upload-author-avatar" });
          })
          .catch(() => {
            toast.error("Upload failed", { id: "upload-author-avatar" });
          });
      }
    };
    input.click();
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Authors</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage writers and editorial profiles.</p>
      </div>

      {isError && (
        <div className="border border-destructive/30 rounded-xl p-8 text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <p className="text-sm font-semibold text-destructive">Failed to load authors</p>
          <p className="text-xs text-muted-foreground">{(error as Error)?.message}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RotateCcw className="h-3.5 w-3.5" animateOnHover /> Retry
          </Button>
        </div>
      )}

      <form onSubmit={onSubmit} className="border border-border rounded-xl p-5 space-y-4 bg-card">
        <h3 className="font-semibold text-sm">Add New Author</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required placeholder="e.g. Vignesh Kumar" />
          </div>
          <div className="space-y-2">
            <Label>Twitter / X</Label>
            <Input value={draft.twitter} onChange={(e) => setDraft({ ...draft, twitter: e.target.value })} placeholder="e.g. @vignesh_pol" />
          </div>
        </div>

        <div className="grid md:grid-cols-[120px_1fr] gap-4 items-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-16 w-16 rounded-full overflow-hidden bg-muted border border-border flex items-center justify-center">
              {draft.avatarUrl ? (
                <img src={draft.avatarUrl} alt="Avatar Preview" className="h-full w-full object-cover" />
              ) : (
                <UserIcon className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <Button type="button" variant="outline" size="xs" onClick={() => handleAvatarUpload(false)}>
              Upload
            </Button>
          </div>
          <div className="space-y-2 w-full">
            <Label>Bio</Label>
            <Textarea value={draft.bio} onChange={(e) => setDraft({ ...draft, bio: e.target.value })} placeholder="Write a short biography..." rows={2} />
          </div>
        </div>

        <Button type="submit" disabled={createMutation.isPending} className="w-full sm:w-auto">
          {createMutation.isPending ? <LoaderCircle className="h-4 w-4" animate /> : <Plus className="h-4 w-4" animateOnHover />}
          Add Author
        </Button>
      </form>

      <div className="border border-border rounded-xl overflow-hidden bg-card">
        <div className="hidden md:grid grid-cols-[80px_200px_1fr_150px_120px] gap-4 h-11 px-5 items-center border-b border-border bg-muted/50 text-xs font-semibold text-muted-foreground">
          <span>Avatar</span>
          <span>Name</span>
          <span>Bio</span>
          <span>Twitter</span>
          <span className="text-right">Actions</span>
        </div>
        {isLoading ? (
          <div className="h-32 flex items-center justify-center">
            <LoaderCircle className="h-6 w-6 text-primary" animate />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {authors.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground italic">
                No authors found. Add some authors to get started.
              </div>
            )}
            {authors.map((author) => {
              const isEditing = editingId === author.id;
              const isMutating =
                (updateMutation.isPending && updateMutation.variables === author.id) ||
                (deleteMutation.isPending && deleteMutation.variables === author.id);
              return (
                <div key={author.id} className="grid grid-cols-1 md:grid-cols-[80px_200px_1fr_150px_120px] gap-4 p-5 items-center hover:bg-secondary/5 transition-colors">
                  {/* Avatar */}
                  <div className="flex md:block justify-between items-center">
                    <span className="md:hidden text-xs font-semibold text-muted-foreground">Avatar</span>
                    <div className="h-10 w-10 rounded-full overflow-hidden bg-muted border border-border flex items-center justify-center">
                      {isEditing ? (
                        edit.avatarUrl ? (
                          <img src={edit.avatarUrl} alt={edit.name} className="h-full w-full object-cover" />
                        ) : (
                          <UserIcon className="h-4 w-4 text-muted-foreground" />
                        )
                      ) : (
                        author.avatarUrl ? (
                          <img src={author.avatarUrl} alt={author.name} className="h-full w-full object-cover" />
                        ) : (
                          <UserIcon className="h-4 w-4 text-muted-foreground" />
                        )
                      )}
                    </div>
                    {isEditing && (
                      <Button type="button" variant="ghost" size="xs" onClick={() => handleAvatarUpload(true)} className="mt-1">
                        Change
                      </Button>
                    )}
                  </div>

                  {/* Name */}
                  <div className="flex md:block justify-between items-center">
                    <span className="md:hidden text-xs font-semibold text-muted-foreground">Name</span>
                    {isEditing ? (
                      <Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className="h-9" />
                    ) : (
                      <span className="text-sm font-semibold">{author.name}</span>
                    )}
                  </div>

                  {/* Bio */}
                  <div className="flex md:block justify-between items-center">
                    <span className="md:hidden text-xs font-semibold text-muted-foreground">Bio</span>
                    {isEditing ? (
                      <Textarea value={edit.bio} onChange={(e) => setEdit({ ...edit, bio: e.target.value })} className="min-h-[50px] py-1" rows={2} />
                    ) : (
                      <span className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{author.bio || "—"}</span>
                    )}
                  </div>

                  {/* Twitter */}
                  <div className="flex md:block justify-between items-center">
                    <span className="md:hidden text-xs font-semibold text-muted-foreground">Twitter</span>
                    {isEditing ? (
                      <Input value={edit.twitter} onChange={(e) => setEdit({ ...edit, twitter: e.target.value })} className="h-9" />
                    ) : (
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        {author.twitter ? (
                          <>
                            <Twitter className="h-3.5 w-3.5 text-primary shrink-0" />
                            {author.twitter}
                          </>
                        ) : (
                          "—"
                        )}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2">
                    {isEditing ? (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => updateMutation.mutate(author.id)}
                          disabled={isMutating}
                          className="h-8 w-8 text-green-600 hover:bg-green-50"
                        >
                          <Check className="h-4 w-4" animateOnHover />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={cancelEdit}
                          disabled={isMutating}
                          className="h-8 w-8 text-red-600 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" animateOnHover />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => startEdit(author)}
                          disabled={isMutating}
                          className="h-8 w-8 hover:bg-secondary"
                        >
                          <AnimatedIcon animationType="scale"><Pencil className="h-4 w-4" /></AnimatedIcon>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => confirmDelete(author)}
                          disabled={isMutating}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" animateOnHover />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Author Profile"
        description={`Are you sure you want to delete the author profile for "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        isDestructive
      />
    </div>
  );
}
