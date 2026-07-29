import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { Article } from "@/lib/types";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FeedCard from "@/components/FeedCard";
import { ArticleSkeleton } from "@/components/PageSkeletons";
import { ArrowLeft } from "@/components/animate-ui/icons/arrow-left";
import { Tag } from "lucide-react";
import { BRAND, pageTitle } from "@/lib/brand";
import { useEffect } from "react";

export default function TopicPage() {
  const { tag } = useParams<{ tag: string }>();
  const decodedTag = tag ? decodeURIComponent(tag).toLowerCase() : "";

  useEffect(() => {
    document.title = pageTitle(`Topic: #${decodedTag}`);
  }, [decodedTag]);

  const { data: articles, isLoading, isError } = useQuery<Article[]>({
    queryKey: ["articles", "topic", decodedTag],
    queryFn: () => apiFetch<Article[]>(`/articles?tag=${encodeURIComponent(decodedTag)}`),
    enabled: !!decodedTag,
  });

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

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold tracking-tight font-serif capitalize">
                #{decodedTag}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {articles?.length ?? 0} story{articles?.length === 1 ? "" : "ies"} tagged with #{decodedTag}
              </p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <ArticleSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-16 rounded-xl border border-destructive/20 bg-destructive/5 p-6">
            <p className="text-sm font-semibold text-destructive">Failed to load articles for this topic</p>
          </div>
        ) : articles && articles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <FeedCard key={article.id} article={article} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 rounded-xl border border-border bg-card p-8">
            <Tag className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <h3 className="text-lg font-bold">No articles found</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              There are currently no published articles tagged with #{decodedTag}.
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
