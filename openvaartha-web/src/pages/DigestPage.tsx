import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { DigestWithArticles } from "@/lib/types";
import { ArrowLeft, Share2, Calendar, Layout, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ArticleCard from "@/components/ArticleCard";

export default function DigestPage() {
  const { date } = useParams<{ date?: string }>();
  const navigate = useNavigate();

  // If date is missing, fetch /latest, else fetch /date
  const queryUrl = date ? `/digests/${date}` : `/digests/latest`;

  const { data: digest, isLoading, isError } = useQuery<DigestWithArticles>({
    queryKey: ["digest", date || "latest"],
    queryFn: () => apiFetch<DigestWithArticles>(queryUrl),
    retry: false
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground animate-pulse">Curating today's briefing...</p>
      </div>
    );
  }

  if (isError || !digest) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <Layout className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Digest Not Found</h2>
          <p className="text-muted-foreground mb-6">We couldn't find a briefing for this date.</p>
          <Button onClick={() => navigate("/")} variant="default">Back to Home</Button>
        </div>
      </div>
    );
  }

  // Format the date beautifully
  const displayDate = new Date(digest.date).toLocaleDateString('en-US', {
    weekday: 'long', 
    month: 'long', 
    day: 'numeric'
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="sticky top-0 z-50 bg-background border-b border-border">
        <Navbar />
      </div>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Digest Header */}
        <header className="mb-10 text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-widest mb-4">
            <Calendar className="h-4 w-4" />
            Daily Briefing
          </div>
          <h1 className="text-4xl sm:text-6xl font-display font-black tracking-tight mb-4">
            {digest.title}
          </h1>
          <p className="text-muted-foreground font-medium text-sm sm:text-base">
            {displayDate}
          </p>
        </header>

        {/* AI Generated Overview */}
        <div className="bg-card/50 backdrop-blur-md border border-border rounded-3xl p-6 sm:p-10 mb-12 shadow-sm relative overflow-hidden animate-fade-up">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <Layout className="h-32 w-32" />
          </div>
          
          <div className="prose prose-lg dark:prose-invert max-w-none relative z-10" 
               dangerouslySetInnerHTML={{ __html: digest.overview }} 
          />
        </div>

        {/* Highlighted Stories */}
        <div>
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <span className="h-8 w-1.5 bg-primary rounded-full"></span>
            Today's Key Stories
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {digest.articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
