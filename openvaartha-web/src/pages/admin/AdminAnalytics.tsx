import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  AlertCircle,
  ArrowUpRight,
  Users,
  Clock,
  Layers,
  MessageSquare,
  Mail,
  FileText,
} from "lucide-react";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { RotateCcw } from "@/components/animate-ui/icons/rotate-ccw";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Bar,
  BarChart,
} from "recharts";

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

type EditorialStats = {
  days: number;
  published_series: Array<{ date: string; count: number }>;
  reactions_series: Array<{ date: string; count: number }>;
  comments_series: Array<{ date: string; count: number }>;
  subscriber_series: Array<{ date: string; count: number }>;
  reader_series: Array<{ date: string; count: number }>;
  categories: Array<{
    id: string;
    name: string;
    articles: number;
    views: number;
    reactions: number;
    comments: number;
  }>;
  authors: Array<{ name: string; articles: number; views: number }>;
  pipeline: {
    statuses: { draft: number; pending: number; scheduled: number; published: number; archived: number };
    avg_time_to_publish_hours: number;
  };
  engagement: {
    lifetime_views: number;
    published_total: number;
    avg_views_per_article: number;
    active_readers: number;
    reactions: number;
    comments: number;
    signups: number;
  };
};

const DAY_RANGES = [7, 30, 90];

const chartTooltipStyle = {
  backgroundColor: "hsl(var(--surface))",
  borderColor: "hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
  border: "1px solid hsl(var(--border))",
};
const chartLabelStyle = { color: "hsl(var(--muted-foreground))" };
const chartItemStyle = { color: "hsl(var(--foreground))" };

export default function AdminAnalytics() {
  const [days, setDays] = useState(30);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: () => apiFetch<DashboardStats>("/admin/stats/dashboard"),
  });

  const {
    data: editorial,
    isLoading: editorialLoading,
    isError: editorialError,
    refetch: refetchEditorial,
  } = useQuery({
    queryKey: ["admin", "editorial", days],
    queryFn: () => apiFetch<EditorialStats>(`/admin/stats/editorial?days=${days}`),
  });

  if (isLoading || editorialLoading) {
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

  // Merge editorial series into one engagement chart dataset.
  const engagementData = editorial?.published_series?.map((p, i) => ({
    date: p.date,
    published: p.count,
    readers: editorial.reader_series?.[i]?.count ?? 0,
    reactions: editorial.reactions_series?.[i]?.count ?? 0,
    comments: editorial.comments_series?.[i]?.count ?? 0,
  })) || [];

  const statuses = editorial?.pipeline?.statuses;
  const pipelineBars = statuses
    ? [
        { name: "Draft", value: statuses.draft },
        { name: "Pending", value: statuses.pending },
        { name: "Scheduled", value: statuses.scheduled },
        { name: "Published", value: statuses.published },
        { name: "Archived", value: statuses.archived },
      ]
    : [];

  const eng = editorial?.engagement;
  const headline = [
    {
      label: "Active Readers",
      value: eng?.active_readers ?? 0,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      label: "Avg Views / Article",
      value: eng?.avg_views_per_article ?? 0,
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50 dark:bg-green-950/30",
    },
    {
      label: "Reactions",
      value: eng?.reactions ?? 0,
      icon: Layers,
      color: "text-purple-600",
      bg: "bg-purple-50 dark:bg-purple-950/30",
    },
    {
      label: "Comments",
      value: eng?.comments ?? 0,
      icon: MessageSquare,
      color: "text-cyan-600",
      bg: "bg-cyan-50 dark:bg-cyan-950/30",
    },
    {
      label: "New Subscribers",
      value: eng?.signups ?? 0,
      icon: Mail,
      color: "text-indigo-600",
      bg: "bg-indigo-50 dark:bg-indigo-950/30",
    },
  ];

  const fmtHours = (h: number) => {
    if (!h) return "—";
    if (h < 48) return `${Math.round(h)}h`;
    if (h < 24 * 60) return `${(h / 24).toFixed(1)}d`;
    return `${(h / (24 * 30)).toFixed(1)}mo`;
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Analytics & Performance</h1>
          <p className="text-sm text-muted-foreground">Editorial metrics, engagement trends, and content performance.</p>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg border border-border bg-[hsl(var(--surface))]">
          {DAY_RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setDays(r)}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-md transition-colors",
                days === r
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {r}D
            </button>
          ))}
        </div>
      </div>

      {editorialError && (
        <div className="flex items-center justify-between gap-3 border border-destructive/40 rounded-lg p-3 bg-destructive/5">
          <p className="text-xs font-semibold text-destructive">Editorial metrics failed to load.</p>
          <Button variant="outline" size="sm" onClick={() => refetchEditorial()}>
            <RotateCcw className="h-3.5 w-3.5" animateOnHover /> Retry
          </Button>
        </div>
      )}

      {/* Headline engagement cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {headline.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="border border-border rounded-lg p-4 bg-[hsl(var(--surface))] flex flex-col gap-1">
            <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center border", bg)}>
              <Icon className={cn("h-4.5 w-4.5", color)} />
            </div>
            <p className="text-2xl font-black tracking-tight mt-1">{value.toLocaleString()}</p>
            <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Legacy: total views + reaction breakdown */}
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

        <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-5 gap-3">
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
      </div>

      {/* 7-day publishing trend (legacy) */}
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
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <RechartsTooltip contentStyle={chartTooltipStyle} itemStyle={chartItemStyle} labelStyle={chartLabelStyle} cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1, strokeDasharray: '3 3' }} />
              <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorValueAnalytics)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Engagement time-series */}
      <div className="border border-border rounded-lg p-6 bg-[hsl(var(--surface))]">
        <div className="flex flex-col gap-1 mb-6">
          <h3 className="text-base font-bold tracking-tight">Engagement Trend ({days} days)</h3>
          <p className="text-xs text-muted-foreground">Daily publishing vs unique readers vs reactions</p>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={engagementData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="pubGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="readerGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} dy={10} minTickGap={24} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <RechartsTooltip contentStyle={chartTooltipStyle} itemStyle={chartItemStyle} labelStyle={chartLabelStyle} cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1, strokeDasharray: '3 3' }} />
              <Legend wrapperStyle={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }} />
              <Area type="monotone" dataKey="published" name="Published" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#pubGrad)" />
              <Area type="monotone" dataKey="readers" name="Unique readers" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#readerGrad)" />
              <Area type="monotone" dataKey="reactions" name="Reactions" stroke="#a855f7" strokeWidth={2} fillOpacity={0.05} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pipeline health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 border border-border rounded-lg p-6 bg-[hsl(var(--surface))]">
          <div className="flex items-center gap-2 mb-5">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-base font-bold tracking-tight">Editorial Pipeline</h3>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineBars} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                <RechartsTooltip contentStyle={chartTooltipStyle} itemStyle={chartItemStyle} labelStyle={chartLabelStyle} cursor={{ fill: 'hsl(var(--surface-3))' }} />
                <Bar dataKey="value" name="Articles" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>Avg time-to-publish: <span className="font-bold text-foreground">{fmtHours(editorial?.pipeline?.avg_time_to_publish_hours ?? 0)}</span></span>
          </div>
        </div>

        {/* Category breakdown */}
        <div className="lg:col-span-2 border border-border rounded-lg overflow-hidden bg-[hsl(var(--surface))]">
          <div className="flex items-center justify-between h-14 px-6 border-b border-border">
            <span className="text-sm font-bold tracking-tight">Top Categories ({days} days)</span>
          </div>
          <div className="divide-y divide-border">
            {editorial?.categories?.length ? (
              editorial.categories.slice(0, 8).map((cat, index) => (
                <div key={cat.id || index} className="flex items-center gap-4 p-4">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted text-muted-foreground font-black text-xs shrink-0">
                    #{index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold line-clamp-1">{cat.name}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
                      <span>{cat.articles} articles</span>
                      <span>·</span>
                      <span>{cat.reactions} reactions</span>
                      <span>·</span>
                      <span>{cat.comments} comments</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-black tracking-tight">{cat.views.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground font-semibold">views</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-sm text-muted-foreground text-center">No published articles in this window.</div>
            )}
          </div>
        </div>
      </div>

      {/* Author breakdown + top articles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border border-border rounded-lg overflow-hidden bg-[hsl(var(--surface))]">
          <div className="flex items-center justify-between h-14 px-6 border-b border-border">
            <span className="text-sm font-bold tracking-tight">Top Authors ({days} days)</span>
          </div>
          <div className="divide-y divide-border">
            {editorial?.authors?.length ? (
              editorial.authors.slice(0, 8).map((author, index) => (
                <div key={author.name || index} className="flex items-center gap-4 p-4">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted text-muted-foreground font-black text-xs shrink-0">
                    #{index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold line-clamp-1">{author.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{author.articles} articles</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-black tracking-tight">{author.views.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground font-semibold">views</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-sm text-muted-foreground text-center">No author data in this window.</div>
            )}
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
    </div>
  );
}
