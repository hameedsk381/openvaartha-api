import { useParams } from "react-router-dom";
import { useState, useCallback, useEffect } from "react";
import SingleArticle from "@/components/SingleArticle";
import Navbar from "@/components/Navbar";
import { ScrollProgress } from "@/components/ui/scroll-progress";
import { apiFetch } from "@/lib/api";

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  // We maintain an array of article IDs that have been loaded into the stream.
  const [streamIds, setStreamIds] = useState<string[]>([]);
  const [isFetchingNext, setIsFetchingNext] = useState(false);

  // When the primary slug changes (e.g. user clicked a link to a new article directly),
  // reset the stream.
  useEffect(() => {
    if (slug) {
      setStreamIds([slug]);
    }
  }, [slug]);

  // Handle URL swapping when an article scrolls into view
  const handleInView = useCallback((articleSlug: string, articleTitle: string) => {
    if (window.location.pathname !== `/article/${articleSlug}`) {
      window.history.replaceState(null, "", `/article/${articleSlug}`);
      document.title = `${articleTitle} | Open Vaartha`;
    }

    // Attempt to load the next article if we are viewing the last one in the stream
    const isLastInStream = streamIds[streamIds.length - 1] === articleSlug;
    if (isLastInStream && !isFetchingNext) {
      loadNextArticle(articleSlug);
    }
  }, [streamIds, isFetchingNext]);

  const loadNextArticle = async (currentSlug: string) => {
    setIsFetchingNext(true);
    try {
      // Fetch related articles to find the next one
      const data = await apiFetch<any[]>(`/articles/${currentSlug}/related`);
      if (data && data.length > 0) {
        // Find the first related article that isn't already in our stream
        const nextArticle = data.find(a => !streamIds.includes(a.slug));
        if (nextArticle) {
          setStreamIds(prev => [...prev, nextArticle.slug]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch next article for stream", err);
    } finally {
      setIsFetchingNext(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-background selection:bg-primary/15 selection:text-primary">
      <ScrollProgress className="top-[60px] md:top-[72px]" />
      <Navbar />

      <main className="flex flex-col">
        {streamIds.map((id, index) => (
          <div key={`${id}-${index}`} className="relative">
            <SingleArticle articleId={id} onInView={handleInView} />
            
            {/* Visual separator between stream articles */}
            {index < streamIds.length - 1 && (
              <div className="flex items-center justify-center py-20 px-4 bg-background border-t-8 border-muted mt-10">
                <div className="w-full max-w-2xl flex items-center gap-6">
                  <div className="h-px bg-border flex-1" />
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                    Keep Reading
                  </span>
                  <div className="h-px bg-border flex-1" />
                </div>
              </div>
            )}
          </div>
        ))}

        {isFetchingNext && (
          <div className="py-24 flex justify-center items-center">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        )}
      </main>
    </div>
  );
}
