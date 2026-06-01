import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FileText, Users, MessageSquare, Mail, TrendingUp, Zap, Plus, FolderTree, Loader2, ArrowUpRight } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

type DashboardStats = {
  articles: { total: number; published: number; drafts: number; archived: number; breaking: number; trending: number };
  users: { total: number };
  comments: { total: number };
  subscribers: { total: number };
  recent_articles: Array<{
    id: string;
    slug: string;
    title: string;
    status: string;
    category: string;
    published_at: string;
    thumbnail_url?: string;
  }>;
};

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: () => apiFetch<DashboardStats>("/admin/stats/dashboard"),
  });

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  const s = data?.articles;
  const cards = [
    { label: "Published", value: s?.published ?? 0, icon: FileText, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/20" },
    { label: "Drafts", value: s?.drafts ?? 0, icon: FileText, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/20" },
    { label: "Breaking", value: s?.breaking ?? 0, icon: Zap, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/20" },
    { label: "Trending", value: s?.trending ?? 0, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/20" },
    { label: "Users", value: data?.users?.total ?? 0, icon: Users, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/20" },
    { label: "Comments", value: data?.comments?.total ?? 0, icon: MessageSquare, color: "text-cyan-600", bg: "bg-cyan-50 dark:bg-cyan-950/20" },
    { label: "Subscribers", value: data?.subscribers?.total ?? 0, icon: Mail, color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-950/20" },
    { label: "Archived", value: s?.archived ?? 0, icon: FileText, color: "text-gray-600", bg: "bg-gray-50 dark:bg-gray-800/20" },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Overview of your content and audience.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/articles/new" className="h-10 px-4 rounded-md bg-primary text-white text-sm font-semibold inline-flex items-center gap-2 press">
            <Plus className="h-4 w-4" />
            New article
          </Link>
          <Link to="/admin/categories" className="h-10 px-4 rounded-md border border-border text-sm font-semibold inline-flex items-center gap-2 text-muted-foreground hover:text-foreground press">
            <FolderTree className="h-4 w-4" />
            Categories
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {cards.map((card) => (
          <div key={card.label} className="border border-border rounded-lg p-4 space-y-2">
            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", card.bg)}>
              <card.icon className={cn("h-4 w-4", card.color)} />
            </div>
            <p className="text-2xl font-black tracking-tight">{card.value}</p>
            <p className="text-xs font-semibold text-muted-foreground">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between h-11 px-4 border-b border-border bg-[hsl(var(--surface))]">
          <span className="text-xs font-semibold text-muted-foreground">Recent articles</span>
          <Link to="/admin/articles" className="text-[11px] font-semibold text-primary hover:underline">View all</Link>
        </div>
        <div className="divide-y divide-border">
          {data?.recent_articles?.length ? (
            data.recent_articles.map((article) => (
              <Link
                key={article.id}
                to={`/admin/articles/${article.id}/edit`}
                className="flex items-center gap-3 p-3 hover:bg-[hsl(var(--surface))] transition-colors press group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold line-clamp-1 group-hover:text-primary transition-colors">{article.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{article.category}</span>
                    <span className="text-muted-foreground/30">·</span>
                    <span className="text-[11px] text-muted-foreground">{new Date(article.published_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <span className={cn(
                  "inline-flex items-center h-5 px-2 rounded-sm text-[10px] font-bold uppercase tracking-wider border",
                  article.status === "published" ? "bg-[hsl(var(--primary-subtle))] text-primary border-primary/20" :
                  article.status === "draft" ? "bg-muted text-muted-foreground border-border" :
                  "bg-destructive/10 text-destructive border-destructive/30"
                )}>
                  {article.status}
                </span>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </Link>
            ))
          ) : (
            <div className="p-6 text-sm text-muted-foreground text-center">No articles yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}


