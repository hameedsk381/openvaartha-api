import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Newspaper, Bookmark, Clock, Zap, ArrowUpRight, ChevronRight, TrendingUp, Loader2 } from "lucide-react";
import { getArticleImage, handleImageFallback } from "@/lib/utils";
import { useReadingList } from "@/hooks/use-reading-list";
import { useTrendingArticles, useArticles } from "@/lib/api-hooks";
import { apiFetch } from "@/lib/api";

export default function PortalDashboard() {
  const { saved } = useReadingList();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { data: allArticles = [] } = useArticles({ limit: 10 });
  const { data: trending = [] } = useTrendingArticles(1);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await apiFetch<any>("/users/me");
        setUser(data);
      } catch (err) {
        console.error("Failed to fetch user profile", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, []);

  const recent = allArticles.slice(0, 5);
  const featured = trending[0];

  const stats = [
    { label: "Briefs Read",  value: user?.briefsRead || "124", icon: Newspaper,  suffix: "this month" },
    { label: "Saved",        value: String(saved.length), icon: Bookmark, suffix: "articles" },
    { label: "Reading Time", value: user?.readingTime || "42h", icon: Clock,       suffix: "this month" },
    { label: "Day Streak",   value: user?.streak || "12",  icon: Zap,         suffix: "days" },
  ];

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="rounded-2xl gradient-maroon p-5 sm:p-6 shadow-maroon-lg">
        <p className="text-xs font-medium text-white/70 mb-1">Good morning</p>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          {user?.fullName?.split(' ')[0] || user?.fullName || "Reader"}.
        </h1>
        <p className="text-sm text-white/70 mt-1">Your feed is up to date.</p>
        <Link
          to="/"
          className="mt-4 inline-flex items-center gap-1.5 h-11 px-4 rounded-lg bg-secondary text-[hsl(var(--secondary-foreground))] text-sm font-semibold hover:bg-beige-200 transition-colors press"
        >
          Browse feed <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-px rounded-xl overflow-hidden border border-border bg-border">
        {stats.map(({ label, value, icon: Icon, suffix }) => (
          <div key={label} className="bg-background p-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-[hsl(var(--primary-subtle))] flex items-center justify-center">
                <Icon className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="overline text-muted-foreground">{label}</span>
            </div>
            <div>
              <span className="text-2xl font-black tabular-nums tracking-tight">{value}</span>
              <p className="text-2xs text-muted-foreground mt-0.5">{suffix}</p>
            </div>
          </div>
        ))}
      </div>

      {featured && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            <span className="overline text-primary">Trending Now</span>
          </div>
          <Link to={`/article/${featured.slug}`} className="block rounded-xl overflow-hidden border border-border hover:border-primary/40 transition-colors press group">
            <div className="relative aspect-[16/7] overflow-hidden">
              <img src={getArticleImage(featured.thumbnailUrl)} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" onError={handleImageFallback} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <span className="tag bg-primary text-white mb-2">{featured.category}</span>
                <p className="text-white text-sm font-bold leading-snug">{featured.title}</p>
              </div>
            </div>
          </Link>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="overline">Recent</span>
          <Link to="/portal/history" className="text-xs text-primary font-semibold flex items-center gap-0.5 hover:underline underline-offset-2 press">
            View all <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
          {recent.map(art => (
            <Link key={art.id} to={`/article/${art.slug}`} className="flex items-center gap-3 p-3 hover:bg-[hsl(var(--surface))] transition-colors press">
              <div className="h-12 w-16 rounded-lg overflow-hidden bg-secondary/30 shrink-0">
                <img src={getArticleImage(art.thumbnailUrl)} alt="" className="w-full h-full object-cover" onError={handleImageFallback} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="tag mb-1.5">{art.category}</span>
                <p className="text-xs font-semibold text-foreground leading-snug line-clamp-2">{art.title}</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </Link>
          ))}
        </div>
      </div>

      <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
        {[
          { label: "Saved Articles",  sub: `${saved.length || 0} saved`,   to: "/portal/saved" },
          { label: "Reading History", sub: "Browse history",               to: "/portal/history" },
          { label: "Settings",        sub: "Manage preferences",             to: "/portal/settings" },
        ].map(({ label, sub, to }) => (
          <Link key={to} to={to} className="flex items-center justify-between p-4 hover:bg-[hsl(var(--surface))] transition-colors press">
            <div>
              <p className="text-sm font-semibold">{label}</p>
              <p className="text-xs text-muted-foreground">{sub}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
}
