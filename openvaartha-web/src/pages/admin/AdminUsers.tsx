import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Check, ChevronDown, Loader2, RotateCcw, Shield, ShieldOff, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ConfirmDialog";

type AdminUser = {
  id: string;
  email: string;
  fullName?: string;
  full_name?: string;
  role: string;
  isAdmin?: boolean;
  is_admin?: boolean;
  isActive?: boolean;
  is_active?: boolean;
  createdAt?: string;
  created_at?: string;
};

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const { data: users = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => apiFetch<AdminUser[]>("/admin/users"),
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => apiFetch(`/admin/users/${userId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("User deleted");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleAdmin = (user: AdminUser) => {
    const isAdmin = user.isAdmin ?? user.is_admin ?? false;
    apiFetch(`/admin/users/${user.id}`, {
      method: "PUT",
      body: JSON.stringify({ is_admin: !isAdmin }),
    })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
        toast.success(isAdmin ? "Admin rights removed" : "User promoted to admin");
      })
      .catch((e) => toast.error(e.message));
  };

  const toggleActive = (user: AdminUser) => {
    const isActive = user.isActive ?? user.is_active ?? true;
    apiFetch(`/admin/users/${user.id}`, {
      method: "PUT",
      body: JSON.stringify({ is_active: !isActive }),
    })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
        toast.success(isActive ? "User deactivated" : "User activated");
      })
      .catch((e) => toast.error(e.message));
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage registered users and admin access.</p>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="hidden md:grid grid-cols-[1fr_120px_100px_100px] gap-4 h-11 px-4 items-center border-b border-border bg-[hsl(var(--surface))] text-xs font-semibold text-muted-foreground">
          <span>User</span>
          <span>Role</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>
        {isError && (
          <div className="p-8 text-center space-y-3">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
            <p className="text-sm font-semibold text-destructive">Failed to load users</p>
            <p className="text-xs text-muted-foreground">{(error as Error)?.message}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RotateCcw className="h-3.5 w-3.5" /> Retry
            </Button>
          </div>
        )}
        {isLoading ? (
          <div className="h-32 flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {users.map((user) => {
              const isAdmin = user.isAdmin ?? user.is_admin ?? false;
              const isActive = user.isActive ?? user.is_active ?? true;
              const name = user.fullName ?? user.full_name ?? "—";
              return (
                <div key={user.id} className="block md:grid md:grid-cols-[1fr_120px_100px_100px] md:gap-4 md:items-center p-4">
                  <div className="mb-1 md:mb-0 min-w-0">
                    <p className="text-sm font-semibold line-clamp-1">{name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="mb-1 md:mb-0">
                    <span className="text-xs text-muted-foreground md:hidden mr-2">Role:</span>
                    <span className={cn(
                      "text-xs font-semibold",
                      isAdmin ? "text-primary" : "text-muted-foreground"
                    )}>
                      <span className="inline-flex items-center gap-1">
                        {isAdmin ? <Shield className="h-3 w-3" /> : <ShieldOff className="h-3 w-3" />}
                        {isAdmin ? "Admin" : "User"}
                      </span>
                    </span>
                  </div>
                  <div className="mb-2 md:mb-0">
                    <span className="text-xs text-muted-foreground md:hidden mr-2">Status:</span>
                    <span className={cn(
                      "text-xs font-semibold",
                      isActive ? "text-green-600" : "text-red-600"
                    )}>
                      {isActive ? "Active" : "Disabled"}
                    </span>
                  </div>
                  <div className="flex items-center justify-end md:justify-end gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => toggleAdmin(user)}
                      title={isAdmin ? "Remove admin" : "Make admin"}
                    >
                      {isAdmin ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                      <span className="hidden sm:inline">{isAdmin ? "Demote" : "Promote"}</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActive(user)}
                      title={isActive ? "Deactivate" : "Activate"}
                    >
                      {isActive ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setDeleteTarget(user)}
                      title="Delete user"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
            {users.length === 0 && (
              <div className="p-8 text-sm text-muted-foreground text-center">No users found.</div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete user"
        description={deleteTarget ? `Delete user "${deleteTarget.fullName ?? deleteTarget.full_name ?? deleteTarget.email}"? This cannot be undone.` : ""}
        confirmLabel="Delete"
        onConfirm={() => { if (deleteTarget) { deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null); } }}
      />
    </div>
  );
}


