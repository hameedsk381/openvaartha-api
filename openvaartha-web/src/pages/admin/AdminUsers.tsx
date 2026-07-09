import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Check, ChevronLeft, ChevronRight, Loader2, RotateCcw, Shield, ShieldOff, Trash2, X, Search } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PAGE_SIZE = 50;

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
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin", "users", { page, search, roleFilter }],
    queryFn: () => {
      const params = new URLSearchParams({
        skip: String(page * PAGE_SIZE),
        limit: String(PAGE_SIZE),
        include_total: "true",
      });
      if (search) params.set("search", search);
      if (roleFilter !== "all") params.set("role", roleFilter);
      return apiFetch<{ items: AdminUser[]; total: number }>(`/admin/users?${params.toString()}`);
    },
  });

  const users = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => apiFetch(`/admin/users/${userId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("User deleted");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      apiFetch(`/admin/users/${userId}`, {
        method: "PUT",
        body: JSON.stringify({ role }),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success(`User role updated to ${variables.role}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const activeMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      apiFetch(`/admin/users/${userId}`, {
        method: "PUT",
        body: JSON.stringify({ is_active: isActive }),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success(variables.isActive ? "User activated" : "User deactivated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const requestsQuery = useQuery({
    queryKey: ["admin", "contributor-requests"],
    queryFn: () => apiFetch<AdminUser[]>("/admin/contributor-requests"),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ userId, action }: { userId: string; action: "approve" | "reject" }) =>
      apiFetch(`/admin/contributor-requests/${userId}/review`, {
        method: "POST",
        body: JSON.stringify({ action }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "contributor-requests"] });
      toast.success("Contributor request processed");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage registered users and admin access.</p>
      </div>

      {requestsQuery.data && requestsQuery.data.length > 0 && (
        <div className="border border-yellow-500/20 bg-yellow-500/5 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
            <Shield className="h-4 w-4" />
            <h2 className="text-sm font-semibold uppercase tracking-wider">Pending Contributor Requests</h2>
          </div>
          <div className="divide-y divide-border/40">
            {requestsQuery.data.map((req) => (
              <div key={req.id} className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{req.fullName ?? req.full_name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{req.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold h-8"
                    onClick={() => reviewMutation.mutate({ userId: req.id, action: "approve" })}
                    disabled={reviewMutation.isPending}
                  >
                    Approve
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:bg-red-50 border-red-200 h-8"
                    onClick={() => reviewMutation.mutate({ userId: req.id, action: "reject" })}
                    disabled={reviewMutation.isPending}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search and Filter row */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users by name/email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9 h-9"
          />
        </div>

        {/* Role select dropdown */}
        <div className="w-full sm:max-w-[180px]">
          <Select value={roleFilter} onValueChange={(value) => { setRoleFilter(value); setPage(0); }}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Filter by Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="editor">Editor</SelectItem>
              <SelectItem value="moderator">Moderator</SelectItem>
              <SelectItem value="contributor">Contributor</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="hidden md:grid grid-cols-[1fr_120px_100px_200px] gap-4 h-11 px-4 items-center border-b border-border bg-[hsl(var(--surface))] text-xs font-semibold text-muted-foreground">
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
                <div key={user.id} className="block md:grid md:grid-cols-[1fr_120px_100px_200px] md:gap-4 md:items-center p-4">
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
                        {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : (isAdmin ? "Admin" : "User")}
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
                    <Select
                      value={user.role || (isAdmin ? "admin" : "user")}
                      onValueChange={(value) => roleMutation.mutate({ userId: user.id, role: value })}
                      disabled={roleMutation.isPending}
                    >
                      <SelectTrigger className="h-8 w-[110px] text-xs">
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="contributor">Contributor</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="moderator">Moderator</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => activeMutation.mutate({ userId: user.id, isActive: !isActive })}
                      disabled={activeMutation.isPending}
                      title={isActive ? "Deactivate" : "Activate"}
                    >
                      {activeMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isActive ? "Disable" : "Enable"}
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{total} users total</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            {Array.from({ length: totalPages }, (_, i) => (
              <Button
                key={i}
                variant={i === page ? "default" : "outline"}
                size="sm"
                className="w-8"
                onClick={() => setPage(i)}
              >
                {i + 1}
              </Button>
            ))}
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

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


