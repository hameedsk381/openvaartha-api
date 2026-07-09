import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FileText, Users, MessageSquare, Mail, TrendingUp, Zap, Plus, FolderTree, Loader2, ArrowUpRight, AlertCircle, RotateCcw } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SlidingNumber } from "@/components/animate-ui/primitives/texts/sliding-number";

type DashboardStats = {
  articles: { total: number; published: number; drafts: number; archived: number; breaking: number; trending: number };
  users: { total: number };
  comments: { total: number };
  subscribers: { total: number };
  views: { total: number };
  recent_articles: Array<{
    id: string;
    slug: string;
    title: string;
    status: string;
    category: string;
    published_at: string;
    thumbnail_url?: string;
  }>;
  top_articles: Array<{
    id: string;
    slug: string;
    title: string;
    status: string;
    category: string;
    published_at: string;
    thumbnail_url?: string;
  }>;
  sparkline?: number[];
};

import { Area, AreaChart, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";

export default function AdminDashboard() {
  const { data, isLoading, isError, error, refetch } = useQuery({
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

  if (isError) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-3">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm font-semibold text-destructive">Failed to load dashboard</p>
        <p className="text-xs text-muted-foreground max-w-md text-center">{(error as Error)?.message}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RotateCcw className="h-3.5 w-3.5" /> Retry
        </Button>
      </div>
    );
  }

  const s = data?.articles;
  const cards = [
    { label: "Total Views", value: data?.views?.total ?? 0, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/20" },
    { label: "Published", value: s?.published ?? 0, icon: FileText, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/20" },
    { label: "Drafts", value: s?.drafts ?? 0, icon: FileText, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/20" },
    { label: "Breaking", value: s?.breaking ?? 0, icon: Zap, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/20" },
    { label: "Users", value: data?.users?.total ?? 0, icon: Users, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/20" },
    { label: "Comments", value: data?.comments?.total ?? 0, icon: MessageSquare, color: "text-cyan-600", bg: "bg-cyan-50 dark:bg-cyan-950/20" },
    { label: "Subscribers", value: data?.subscribers?.total ?? 0, icon: Mail, color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-950/20" },
    { label: "Archived", value: s?.archived ?? 0, icon: FileText, color: "text-gray-600", bg: "bg-gray-50 dark:bg-gray-800/20" },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const chartData = data?.sparkline?.map((val, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { name: d.toLocaleDateString(undefined, { weekday: 'short' }), value: val };
  }) || [];

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">{getGreeting()}, Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">Overview of your content and audience.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/articles/new">
            <Button size="sm"><Plus className="h-4 w-4" /> New article</Button>
          </Link>
          <Link to="/admin/categories">
            <Button variant="outline" size="sm"><FolderTree className="h-4 w-4" /> Categories</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {cards.map((card) => (
          <div key={card.label} className="border border-border rounded-lg p-4 space-y-2 bg-card text-card-foreground">
            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", card.bg)}>
              <card.icon className={cn("h-4 w-4", card.color)} />
            </div>
            <p className="text-2xl font-black tracking-tight flex items-center">
              <SlidingNumber value={card.value} />
            </p>
            <p className="text-xs font-semibold text-muted-foreground">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Sparkline Trend Section */}
      {data?.sparkline && (
        <div className="border border-border rounded-lg p-5 bg-[hsl(var(--surface))] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="overline text-primary">Activity</span>
            <h3 className="text-base font-bold tracking-tight mt-0.5">Publishing activity</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Articles published daily over the last 7 days.</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <span className="text-2xl font-black tracking-tight">{data.sparkline.reduce((a, b) => a + b, 0)}</span>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Total this week</p>
            </div>
            <div className="w-64 h-24 flex items-end -mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: "hsl(var(--surface))", borderColor: "hsl(var(--border))", borderRadius: "8px", fontSize: "12px", border: "1px solid hsl(var(--border))" }} 
                    itemStyle={{ color: "hsl(var(--foreground))" }} 
                    labelStyle={{ color: "hsl(var(--muted-foreground))" }} 
                    cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1, strokeDasharray: '3 3' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Quick Action Shortcuts */}
      <div className="border border-border rounded-lg p-5">
        <h3 className="text-xs font-semibold text-muted-foreground mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link to="/admin/articles/new" className="flex flex-col items-center justify-center p-4 border border-border rounded-lg bg-[hsl(var(--surface))] hover:border-primary/40 hover:bg-background transition-all text-center press group">
            <Plus className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-xs font-bold mt-2">Write Article</span>
          </Link>
          <Link to="/admin/comments" className="flex flex-col items-center justify-center p-4 border border-border rounded-lg bg-[hsl(var(--surface))] hover:border-primary/40 hover:bg-background transition-all text-center press group">
            <MessageSquare className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-xs font-bold mt-2">Moderate Comments</span>
          </Link>
          <Link to="/admin/sources" className="flex flex-col items-center justify-center p-4 border border-border rounded-lg bg-[hsl(var(--surface))] hover:border-primary/40 hover:bg-background transition-all text-center press group">
            <Plus className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-xs font-bold mt-2">RSS Sources</span>
          </Link>
          <Link to="/admin/newsletter" className="flex flex-col items-center justify-center p-4 border border-border rounded-lg bg-[hsl(var(--surface))] hover:border-primary/40 hover:bg-background transition-all text-center press group">
            <Mail className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-xs font-bold mt-2">Subscribers</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

        <div className="border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between h-11 px-4 border-b border-border bg-[hsl(var(--surface))]">
            <span className="text-xs font-semibold text-muted-foreground">Top Articles by Views</span>
            <Link to="/admin/articles" className="text-[11px] font-semibold text-primary hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-border">
            {data?.top_articles?.length ? (
              data.top_articles.map((article) => (
                <Link
                  key={article.id}
                  to={`/admin/articles/${article.id}/edit`}
                  className="flex items-center gap-3 p-3 hover:bg-[hsl(var(--surface))] transition-colors press group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold line-clamp-1 group-hover:text-primary transition-colors">{article.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{article.category}</span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 h-6 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 text-xs font-bold border border-blue-200 dark:border-blue-800/50">
                    <TrendingUp className="h-3 w-3" />
                    Top
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </Link>
              ))
            ) : (
              <div className="p-6 text-sm text-muted-foreground text-center">No trending articles yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


