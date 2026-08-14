import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { Article } from "@/lib/types";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ArticleCard from "@/components/ArticleCard";
import { ArticleSkeleton } from "@/components/PageSkeletons";
import { ArrowLeft } from "@/components/animate-ui/icons/arrow-left";
import { Layers } from "lucide-react";
import { BRAND, pageTitle } from "@/lib/brand";
import { useEffect } from "react";

interface SeriesDetail {
  id: string;
  slug: string;
  title: string;
  description: string;
  cover_image_url?: string;
  articles: Article[];
}

export default function SeriesPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: series, isLoading, isError } = useQuery<SeriesDetail>({
    queryKey: ["series", slug],
    queryFn: () => apiFetch<SeriesDetail>(`/series/${slug}`),
    enabled: !!slug,
  });

  useEffect(() => {
    if (series?.title) {
      document.title = pageTitle(`Series: ${series.title}`);
    }
  }, [series?.title]);

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans antialiased text-foreground">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors mb-4"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
          </Link>

          {isLoading ? (
            <div className="h-40 rounded-xl bg-muted animate-pulse" />
          ) : isError || !series ? (
            <div className="text-center py-16 rounded-xl border border-destructive/20 bg-destructive/5 p-6">
              <p className="text-sm font-semibold text-destructive">Failed to load series</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background p-6 sm:p-10 shadow-sm">
              <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-2">
                <Layers className="h-4 w-4" /> Coverage Series
              </div>
              <h1 className="text-3xl sm:text-5xl font-serif font-bold tracking-tight text-foreground">
                {series.title}
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground mt-3 max-w-3xl leading-relaxed">
                {series.description}
              </p>
              <div className="mt-4 text-xs font-semibold text-primary">
                {series.articles.length} Parts in this series
              </div>
            </div>
          )}
        </div>

        {series && series.articles.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold font-serif">Articles in this series</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {series.articles.map((article, index) => (
                <div key={article.id} className="relative">
                  <span className="absolute top-3 left-3 z-20 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                    Part {index + 1}
                  </span>
                  <ArticleCard article={article} />
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
