import { useQuery } from "@tanstack/react-query";
import { Loader2, Mail, Download } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";

type Subscriber = {
  id: string;
  email: string;
  subscribedAt?: string;
  subscribed_at?: string;
  isActive?: boolean;
  is_active?: boolean;
};

export default function AdminNewsletter() {
  const { data: subscribers = [], isLoading } = useQuery({
    queryKey: ["admin", "newsletter"],
    queryFn: () => apiFetch<Subscriber[]>("/admin/newsletter/subscribers"),
  });

  const exportCSV = () => {
    const csv = "Email,Subscribed At\n" + subscribers
      .map((s) => `${s.email},${s.subscribedAt ?? s.subscribed_at ?? ""}`)
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "newsletter-subscribers.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Newsletter</h1>
          <p className="text-sm text-muted-foreground mt-1">{subscribers.length} active subscribers</p>
        </div>
        <Button type="button" variant="outline" onClick={exportCSV} disabled={subscribers.length === 0}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {isLoading ? (
        <div className="h-48 flex items-center justify-center">
          <Loader2 className="h-7 w-7 text-primary animate-spin" />
        </div>
      ) : subscribers.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl flex flex-col items-center justify-center py-16 text-center space-y-3">
          <Mail className="h-8 w-8 text-primary/40" />
          <p className="text-sm font-semibold text-foreground">No subscribers yet</p>
          <p className="text-xs text-muted-foreground">Subscribers will appear here when people sign up via the newsletter form.</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="hidden md:grid grid-cols-[1fr_180px] gap-4 h-11 px-4 items-center border-b border-border bg-[hsl(var(--surface))] text-xs font-semibold text-muted-foreground">
            <span>Email</span>
            <span>Subscribed</span>
          </div>
          <div className="divide-y divide-border">
            {subscribers.map((sub) => (
              <div key={sub.id} className="block md:grid md:grid-cols-[1fr_180px] md:gap-4 md:items-center p-4">
                <div className="mb-1 md:mb-0">
                  <span className="text-xs text-muted-foreground md:hidden mr-2">Email:</span>
                  <span className="text-sm font-medium">{sub.email}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground md:hidden mr-2">Subscribed:</span>
                  <span className="text-sm text-muted-foreground">
                    {sub.subscribedAt || sub.subscribed_at
                      ? new Date(sub.subscribedAt ?? sub.subscribed_at ?? "").toLocaleDateString()
                      : "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
