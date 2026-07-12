import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Newspaper, Bookmark, ArrowUpRight, TrendingUp } from "lucide-react";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { ChevronRight } from "@/components/animate-ui/icons/chevron-right";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { handleImageFallback } from "@/lib/utils";
import { useReadingList } from "@/hooks/use-reading-list";
import { useTrendingArticles } from "@/lib/api-hooks";
import { apiFetch } from "@/lib/api";
import type { Article } from "@/lib/types";

export default function PortalDashboard() {
  const { saved } = useReadingList();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [history, setHistory] = useState<Article[]>([]);

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

    apiFetch<Article[]>("/users/me/history")
      .then(setHistory)
      .catch(() => {});
  }, []);

  const recent = history.slice(0, 5);
  const featured = trending[0];

  const hour = new Date().getHours();
  const greeting = hour < 5 ? "Still up" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : hour < 21 ? "Good evening" : "Still up";

  // Only real, verifiable numbers here — no invented "streak"/"reading time"
  // fields the backend doesn't track.
  const stats = [
    { label: "Read", value: String(history.length), icon: Newspaper, suffix: "articles" },
    { label: "Saved", value: String(saved.length), icon: Bookmark, suffix: "articles" },
  ];

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <LoaderCircle className="h-8 w-8 text-primary" animate />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="rounded-2xl gradient-maroon p-5 sm:p-6 shadow-maroon-lg">
        <p className="text-xs font-medium text-white/70 mb-1">{greeting}</p>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          {user?.fullName?.split(' ')[0] || user?.fullName || "Reader"}.
        </h1>
        <p className="text-sm text-white/70 mt-1">Your feed is up to date.</p>
        <Link
          to="/"
          className="mt-4 inline-flex items-center gap-1.5 h-11 px-4 rounded-lg bg-secondary text-[hsl(var(--secondary-foreground))] text-sm font-semibold hover:bg-beige-200 transition-colors press"
        >
          Browse feed <AnimatedIcon animationType="arrowUpRight"><ArrowUpRight className="h-3.5 w-3.5" /></AnimatedIcon>
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
          <Link to={`/article/${featured.slug}`} className="block rounded-xl overflow-hidden border border-border hover:border-primary/40 transition-colors press group relative">
            <div className="relative aspect-[16/7] overflow-hidden bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900">
              {featured.thumbnailUrl && (
                <img src={featured.thumbnailUrl} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" decoding="async" onError={handleImageFallback} />
              )}
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
          <span className="overline">Recently read</span>
          {history.length > 0 && (
            <Link to="/portal/history" className="text-xs text-primary font-semibold flex items-center gap-0.5 hover:underline underline-offset-2 press">
              View all <ChevronRight className="h-3 w-3" animateOnHover />
            </Link>
          )}
        </div>
        {history.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-6 text-center">
            <p className="text-sm text-muted-foreground">Nothing read yet — open an article and it'll show up here.</p>
            <Link to="/" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline underline-offset-2">
              Browse feed <AnimatedIcon animationType="arrowUpRight"><ArrowUpRight className="h-3 w-3" /></AnimatedIcon>
            </Link>
          </div>
        ) : (
        <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
          {recent.map(art => (
            <Link key={art.id} to={`/article/${art.slug}`} className="flex items-center gap-3 p-3 hover:bg-[hsl(var(--surface))] transition-colors press group/row">
              {art.thumbnailUrl && (
                <div className="h-12 w-14 rounded-lg overflow-hidden bg-secondary/30 shrink-0">
                  <img src={art.thumbnailUrl} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" onError={handleImageFallback} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <span className="tag mb-1.5">{art.category}</span>
                <p className="text-xs font-semibold text-foreground leading-snug line-clamp-2">{art.title}</p>
              </div>
              <AnimatedIcon animationType="arrowUpRight"><ArrowUpRight className="h-4 w-4 text-muted-foreground shrink-0" /></AnimatedIcon>
            </Link>
          ))}
        </div>
        )}
      </div>

      <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
        {[
          { label: "Saved Articles",  sub: `${saved.length || 0} saved`,   to: "/portal/saved" },
          { label: "Reading History", sub: history.length > 0 ? `${history.length} read` : "Browse history", to: "/portal/history" },
          { label: "Settings",        sub: "Manage preferences",             to: "/portal/settings" },
        ].map(({ label, sub, to }) => (
          <Link key={to} to={to} className="flex items-center justify-between p-4 hover:bg-[hsl(var(--surface))] transition-colors press">
            <div>
              <p className="text-sm font-semibold">{label}</p>
              <p className="text-xs text-muted-foreground">{sub}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" animateOnHover />
          </Link>
        ))}
      </div>
    </div>
  );
}
