import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { apiFetch } from "@/lib/api";
import { Loader2 } from "lucide-react";

type AllowedRole = "admin" | "editor" | "moderator";

interface AdminRouteProps {
  children: ReactNode;
  roles?: AllowedRole[];
}

const ROLE_HIERARCHY: Record<string, number> = {
  user: 0,
  moderator: 1,
  editor: 2,
  admin: 3,
};

export default function AdminRoute({ children, roles }: AdminRouteProps) {
  const { data: user, isLoading } = useQuery({
    queryKey: ["user", "me"],
    queryFn: () => apiFetch<{ isAdmin: boolean; role: string }>("/users/me"),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 text-primary animate-spin" />
      </div>
    );
  }

  const effectiveRole = user?.isAdmin ? "admin" : (user?.role || "user");
  const userLevel = ROLE_HIERARCHY[effectiveRole] ?? 0;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (userLevel < 1) {
    return <Navigate to="/" replace />;
  }

  if (roles && roles.length > 0) {
    const maxAllowed = Math.max(...roles.map((r) => ROLE_HIERARCHY[r] ?? 0));
    if (userLevel < maxAllowed) {
      return <Navigate to="/admin" replace />;
    }
  }

  return <>{children}</>;
}
