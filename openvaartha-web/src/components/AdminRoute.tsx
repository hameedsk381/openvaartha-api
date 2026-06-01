import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { apiFetch } from "@/lib/api";
import { Loader2 } from "lucide-react";

interface AdminRouteProps {
  children: ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
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

  if (!user || (!user.isAdmin && user.role !== "admin")) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
