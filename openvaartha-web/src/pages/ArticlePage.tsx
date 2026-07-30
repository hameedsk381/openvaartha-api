import { useParams } from "react-router-dom";
import { useState, useCallback, useEffect, useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";
import SingleArticle from "@/components/SingleArticle";
import Navbar from "@/components/Navbar";
import { apiFetch } from "@/lib/api";

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  // We maintain an array of article IDs that have been loaded into the stream.
  const [streamIds, setStreamIds] = useState<string[]>([]);
  const [isFetchingNext, setIsFetchingNext] = useState(false);
  const [hasReachedEnd, setHasReachedEnd] = useState(false);
  
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    align: "start",
    skipSnaps: false,
    dragFree: false,
  });

  // When the primary slug changes (e.g. user clicked a link to a new article directly),
  // reset the stream.
  useEffect(() => {
    if (slug) {
      setStreamIds([slug]);
      setHasReachedEnd(false);
      // If Embla is already initialized, scroll to start when slug changes from outside
      if (emblaApi) emblaApi.scrollTo(0, true);
    }
  }, [slug, emblaApi]);

  const loadNextArticle = useCallback(async (currentSlug: string) => {
    if (isFetchingNext || hasReachedEnd) return;
    
    setIsFetchingNext(true);
    try {
      // Fetch related articles to find the next one
      const data = await apiFetch<any[]>(`/articles/${currentSlug}/related`);
      if (data && data.length > 0) {
        // Find the first related article that isn't already in our stream
        const nextArticle = data.find(a => !streamIds.includes(a.slug));
        if (nextArticle) {
          setStreamIds(prev => [...prev, nextArticle.slug]);
        } else {
          setHasReachedEnd(true);
        }
      } else {
        setHasReachedEnd(true);
      }
    } catch (err) {
      console.error("Failed to fetch next article for stream", err);
      setHasReachedEnd(true); // Stop trying if we hit an error
    } finally {
      setIsFetchingNext(false);
    }
  }, [streamIds, isFetchingNext, hasReachedEnd]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    
    const currentIndex = emblaApi.selectedScrollSnap();
    const currentSlug = streamIds[currentIndex];
    
    if (currentSlug) {
      // Update URL silently
      if (window.location.pathname !== `/article/${currentSlug}`) {
        window.history.replaceState(null, "", `/article/${currentSlug}`);
      }
      
      // If we are at the second-to-last or last slide, fetch more
      if (currentIndex >= streamIds.length - 2) {
        loadNextArticle(currentSlug);
      }
    }
  }, [emblaApi, streamIds, loadNextArticle]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    // Trigger once on init
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  const handleInView = useCallback((articleSlug: string, articleTitle: string) => {
    // Only update title if it's the active article URL
    if (window.location.pathname === `/article/${articleSlug}`) {
      document.title = `${articleTitle} | Open Vaartha`;
    }
  }, []);

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-background selection:bg-primary/15 selection:text-primary flex flex-col">
      <div className="shrink-0 z-50">
        <Navbar isInsideStack={true} />
      </div>

      <div className="flex-1 overflow-hidden" ref={emblaRef}>
        <div className="flex h-full touch-pan-y">
          {streamIds.map((id, index) => (
            <div 
              key={`${id}-${index}`} 
              className="relative flex-[0_0_100%] min-w-0 h-full overflow-y-auto overflow-x-hidden pb-safe"
            >
              <SingleArticle articleId={id} onInView={handleInView} />
              
              {/* Show loading spinner at bottom of the last article if fetching next */}
              {index === streamIds.length - 1 && isFetchingNext && (
                <div className="py-24 flex justify-center items-center">
                  <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
