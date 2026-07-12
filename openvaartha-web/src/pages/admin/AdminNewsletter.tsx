import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, AlertCircle } from "lucide-react";
import { ChevronLeft } from "@/components/animate-ui/icons/chevron-left";
import { ChevronRight } from "@/components/animate-ui/icons/chevron-right";
import { Download } from "@/components/animate-ui/icons/download";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { RotateCcw } from "@/components/animate-ui/icons/rotate-ccw";
import { Trash2 } from "@/components/animate-ui/icons/trash-2";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const PAGE_SIZE = 50;

type Subscriber = {
  id: string;
  email: string;
  subscribedAt?: string;
  subscribed_at?: string;
  isActive?: boolean;
  is_active?: boolean;
};

export default function AdminNewsletter() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin", "newsletter", { page }],
    queryFn: () => {
      const params = new URLSearchParams({
        skip: String(page * PAGE_SIZE),
        limit: String(PAGE_SIZE),
        include_total: "true",
      });
      return apiFetch<{ items: Subscriber[]; total: number }>(`/admin/newsletter/subscribers?${params.toString()}`);
    },
  });

  const subscribers = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const unsubscribeMutation = useMutation({
    mutationFn: (email: string) =>
      apiFetch("/newsletter/unsubscribe", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "newsletter"] });
      toast.success("Subscriber unsubscribed");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const exportCSV = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams({
        skip: "0",
        limit: "100000",
        include_total: "false",
      });
      const allSubscribers = await apiFetch<Subscriber[]>(`/admin/newsletter/subscribers?${params.toString()}`);
      const listToExport = Array.isArray(allSubscribers) ? allSubscribers : (allSubscribers as any).items || [];
      
      const csv = "Email,Subscribed At\n" + listToExport
        .map((s) => `${s.email},${s.subscribedAt ?? s.subscribed_at ?? ""}`)
        .join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "newsletter-subscribers.csv";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV export completed");
    } catch (e: any) {
      toast.error("Failed to export: " + e.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Newsletter</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage subscriber mailing list and exports.</p>
        </div>
        <Button type="button" variant="outline" onClick={exportCSV} disabled={isExporting || subscribers.length === 0}>
          {isExporting ? <LoaderCircle className="h-4 w-4" animate /> : <Download className="h-4 w-4" animateOnHover />}
          {isExporting ? "Exporting..." : "Export CSV"}
        </Button>
      </div>

      {/* Subscriber Count Widget */}
      {!isLoading && !isError && (
        <div className="border border-border rounded-lg p-5 bg-[hsl(var(--surface))] flex items-center gap-4 max-w-sm">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <span className="text-2xl font-black tracking-tight">{total}</span>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Subscribers</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="h-48 flex items-center justify-center">
          <LoaderCircle className="h-7 w-7 text-primary" animate />
        </div>
      ) : isError ? (
        <div className="h-48 flex flex-col items-center justify-center gap-3">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm font-semibold text-destructive">Failed to load subscribers</p>
          <p className="text-xs text-muted-foreground max-w-md text-center">{(error as Error)?.message}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RotateCcw className="h-3.5 w-3.5" animateOnHover /> Retry
          </Button>
        </div>
      ) : subscribers.length === 0 && page === 0 ? (
        <div className="border border-dashed border-border rounded-xl flex flex-col items-center justify-center py-16 text-center space-y-3">
          <Mail className="h-8 w-8 text-primary/40" />
          <p className="text-sm font-semibold text-foreground">No subscribers yet</p>
          <p className="text-xs text-muted-foreground">Subscribers will appear here when people sign up via the newsletter form.</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="hidden md:grid grid-cols-[1fr_180px_100px] gap-4 h-11 px-4 items-center border-b border-border bg-[hsl(var(--surface))] text-xs font-semibold text-muted-foreground">
            <span>Email</span>
            <span>Subscribed</span>
            <span className="text-right">Actions</span>
          </div>
          <div className="divide-y divide-border">
            {subscribers.map((sub) => (
              <div key={sub.id} className="block md:grid md:grid-cols-[1fr_180px_100px] md:gap-4 md:items-center p-4">
                <div className="mb-1 md:mb-0">
                  <span className="text-xs text-muted-foreground md:hidden mr-2">Email:</span>
                  <span className="text-sm font-medium">{sub.email}</span>
                </div>
                <div className="mb-2 md:mb-0">
                  <span className="text-xs text-muted-foreground md:hidden mr-2">Subscribed:</span>
                  <span className="text-sm text-muted-foreground">
                    {sub.subscribedAt || sub.subscribed_at
                      ? new Date(sub.subscribedAt ?? sub.subscribed_at ?? "").toLocaleDateString()
                      : "—"}
                  </span>
                </div>
                <div className="flex md:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs font-semibold text-destructive hover:text-destructive shrink-0"
                    onClick={() => unsubscribeMutation.mutate(sub.email)}
                    disabled={unsubscribeMutation.isPending}
                  >
                    {unsubscribeMutation.isPending ? <LoaderCircle className="h-3 w-3" animate /> : <Trash2 className="h-3 w-3 mr-1" animateOnHover />}
                    Unsubscribe
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{total} subscribers total</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" animateOnHover /> Previous
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
              Next <ChevronRight className="h-4 w-4" animateOnHover />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
