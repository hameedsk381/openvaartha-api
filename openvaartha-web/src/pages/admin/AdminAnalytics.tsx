import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { TrendingUp, AlertCircle, ArrowUpRight } from "lucide-react";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { RotateCcw } from "@/components/animate-ui/icons/rotate-ccw";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Area, AreaChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis, CartesianGrid } from "recharts";

type DashboardStats = {
  views: { total: number };
  reactions?: Record<string, number>;
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

export default function AdminAnalytics() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: () => apiFetch<DashboardStats>("/admin/stats/dashboard"),
  });

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <LoaderCircle className="h-8 w-8 text-primary" animate />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-3">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm font-semibold text-destructive">Failed to load analytics</p>
        <p className="text-xs text-muted-foreground max-w-md text-center">{(error as Error)?.message}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RotateCcw className="h-3.5 w-3.5" animateOnHover /> Retry
        </Button>
      </div>
    );
  }

  const chartData = data?.sparkline?.map((val, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { name: d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }), value: val };
  }) || [];

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black tracking-tight">Analytics & Performance</h1>
        <p className="text-sm text-muted-foreground">Deep dive into your content's engagement and growth.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border border-border rounded-lg p-6 bg-[hsl(var(--surface))] flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <TrendingUp className="h-32 w-32 text-blue-600" />
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center mb-4 border border-blue-100 dark:border-blue-900/50 relative z-10">
            <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-4xl font-black tracking-tighter relative z-10">{data?.views?.total?.toLocaleString() ?? 0}</p>
          <p className="text-sm font-semibold text-muted-foreground mt-1 relative z-10">Total Lifetime Views</p>
        </div>

        <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { type: "fire", label: "🔥 Hot", count: data?.reactions?.fire || 0 },
            { type: "applause", label: "👏 Bravo", count: data?.reactions?.applause || 0 },
            { type: "idea", label: "💡 Insightful", count: data?.reactions?.idea || 0 },
            { type: "sad", label: "😢 Sad", count: data?.reactions?.sad || 0 },
            { type: "mindblown", label: "🤯 Mindblown", count: data?.reactions?.mindblown || 0 },
          ].map(({ type, label, count }) => (
            <div key={type} className="border border-border rounded-lg p-3.5 bg-[hsl(var(--surface))]">
              <span className="text-xs font-semibold">{label}</span>
              <p className="text-xl font-bold tracking-tight text-foreground mt-1">{count}</p>
            </div>
          ))}
        </div>

        <div className="md:col-span-3 border border-border rounded-lg p-6 bg-[hsl(var(--surface))]">
          <div className="flex items-center justify-between mb-6">
             <div>
               <h3 className="text-base font-bold tracking-tight">7-Day Publishing Trend</h3>
               <p className="text-xs text-muted-foreground">Number of articles published per day</p>
             </div>
             <div className="text-right">
                <span className="text-2xl font-black tracking-tight text-primary">{data?.sparkline?.reduce((a, b) => a + b, 0)}</span>
             </div>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValueAnalytics" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: "hsl(var(--surface))", borderColor: "hsl(var(--border))", borderRadius: "8px", fontSize: "12px", border: "1px solid hsl(var(--border))" }} 
                  itemStyle={{ color: "hsl(var(--foreground))" }} 
                  labelStyle={{ color: "hsl(var(--muted-foreground))" }} 
                  cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1, strokeDasharray: '3 3' }}
                />
                <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorValueAnalytics)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden bg-[hsl(var(--surface))]">
        <div className="flex items-center justify-between h-14 px-6 border-b border-border">
          <span className="text-sm font-bold tracking-tight">Top Performing Articles</span>
        </div>
        <div className="divide-y divide-border">
          {data?.top_articles?.length ? (
            data.top_articles.map((article, index) => (
              <Link
                key={article.id}
                to={`/admin/articles/${article.id}/edit`}
                className="flex items-center gap-4 p-4 hover:bg-[hsl(var(--surface-3))] transition-colors press group"
              >
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted text-muted-foreground font-black text-xs shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  #{index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold line-clamp-1 group-hover:text-primary transition-colors">{article.title}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-sm group-hover:bg-[hsl(var(--surface))] transition-colors">{article.category}</span>
                    <span className="text-[11px] text-muted-foreground">{new Date(article.published_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <AnimatedIcon animationType="arrowUpRight">
                  <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-primary shrink-0 opacity-50 group-hover:opacity-100 transition-all" />
                </AnimatedIcon>
              </Link>
            ))
          ) : (
            <div className="p-8 text-sm text-muted-foreground text-center">No trending articles yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
