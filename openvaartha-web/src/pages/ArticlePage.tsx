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
  const [activeIndex, setActiveIndex] = useState(0);
  
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
      const data = await apiFetch<Article[]>(`/articles/${currentSlug}/related`);
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

  const [hasSwipedHint, setHasSwipedHint] = useState(() => {
    return localStorage.getItem("has-seen-swipe-hint") === "true";
  });

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    
    const currentIndex = emblaApi.selectedScrollSnap();
    setActiveIndex(currentIndex);
    
    // Hide hint if they swiped past the first slide
    if (currentIndex > 0 && !hasSwipedHint) {
      setHasSwipedHint(true);
      localStorage.setItem("has-seen-swipe-hint", "true");
    }

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
  }, [emblaApi, streamIds, loadNextArticle, hasSwipedHint]);

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
        <Navbar isInsideStack={true} hideBottomNav={true} />
      </div>

      <div className="flex-1 overflow-hidden relative" ref={emblaRef}>
        {/* Swipe Hint Overlay */}
        {!hasSwipedHint && (
          <div className="absolute top-1/2 right-4 -translate-y-1/2 z-50 pointer-events-none animate-pulse flex flex-col items-center gap-2 drop-shadow-xl">
            <div className="bg-background/90 backdrop-blur text-foreground text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border border-border shadow-lg">
              Swipe
            </div>
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center animate-bounce-horizontal">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary translate-x-0.5">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </div>
          </div>
        )}

        <div className="flex h-full touch-pan-y">
          {streamIds.map((id, index) => (
            <div 
              key={`${id}-${index}`} 
              className="relative flex-[0_0_100%] min-w-0 h-full overflow-y-auto overflow-x-hidden pb-safe"
            >
              <SingleArticle articleId={id} onInView={handleInView} isActive={index === activeIndex} />
              
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
