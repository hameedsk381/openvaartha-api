import { useParams, Link } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { useArticle, useRelatedArticles } from "@/lib/api-hooks";
import type { Article } from "@/lib/types";
import Navbar from "@/components/Navbar";
import ReactMarkdown from 'react-markdown';
import { ArticleSkeleton } from "@/components/PageSkeletons";
import {
  Share2, Bookmark, BookmarkCheck, ArrowLeft, ArrowUpRight,
  Clock, Sparkles, User, ExternalLink, History, Type, Flame, Facebook, Eye
} from "lucide-react";
import { cn, getArticleImage, handleImageFallback } from "@/lib/utils";
import { categoryColors } from "@/lib/types";
import { BRAND, pageTitle, SITE_TITLE } from "@/lib/brand";
import { apiFetch } from "@/lib/api";
import CommentSection from "@/components/CommentSection";
import { useReadingList } from "@/hooks/use-reading-list";
import { toast } from "sonner";
import InstagramEmbed from "@/components/InstagramEmbed";

const timeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const isHtml = (str: string): boolean => /<[a-z][\s\S]*>/i.test(str);

const TEXT_SIZES = ["text-base", "text-lg", "text-xl"] as const;
const TEXT_SIZE_LABELS = ["A−", "A", "A+"];

function useSEOMeta(article: Article | undefined) {
  useEffect(() => {
    if (!article) return;
    const url = window.location.href;
    const image = getArticleImage(article.thumbnailUrl);
    const desc = article.summary || article.content?.tldr || "";
    const published = new Date(article.publishedAt).toISOString();

    document.title = pageTitle(article.title);

    const setMeta = (name: string, content: string, prop = false) => {
      const attr = prop ? "property" : "name";
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("description", desc);
    setMeta("og:title", article.title, true);
    setMeta("og:description", desc, true);
    setMeta("og:url", url, true);
    setMeta("og:image", image, true);
    setMeta("og:image:alt", article.title, true);
    setMeta("og:site_name", BRAND.name, true);
    setMeta("og:type", "article", true);
    setMeta("article:published_time", published, true);
    setMeta("article:section", article.category, true);
    if (article.lastUpdated) {
      setMeta("article:modified_time", new Date(article.lastUpdated).toISOString(), true);
    }
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", article.title);
    setMeta("twitter:description", desc);
    setMeta("twitter:image", image);

    let link = document.querySelector("link[rel='canonical']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", url);

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      headline: article.title,
      description: desc,
      image: image,
      datePublished: published,
      dateModified: article.lastUpdated ? new Date(article.lastUpdated).toISOString() : published,
      author: {
        "@type": "Person",
        name: article.author,
      },
      publisher: {
        "@type": "Organization",
        name: BRAND.name,
        logo: {
          "@type": "ImageObject",
          url: `${window.location.origin}/icon.svg`,
        },
      },
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": url,
      },
      articleSection: article.category,
      url,
    };

    const breadcrumbLd = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: window.location.origin },
        { "@type": "ListItem", position: 2, name: article.category, item: `${window.location.origin}/?category=${article.category}` },
        { "@type": "ListItem", position: 3, name: article.title, item: url },
      ],
    };

    let script = document.querySelector("#json-ld-article") as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = "json-ld-article";
      script.setAttribute("type", "application/ld+json");
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(jsonLd);

    let breadcrumbScript = document.querySelector("#json-ld-breadcrumb") as HTMLScriptElement | null;
    if (!breadcrumbScript) {
      breadcrumbScript = document.createElement("script");
      breadcrumbScript.id = "json-ld-breadcrumb";
      breadcrumbScript.setAttribute("type", "application/ld+json");
      document.head.appendChild(breadcrumbScript);
    }
    breadcrumbScript.textContent = JSON.stringify(breadcrumbLd);

    return () => {
      document.title = SITE_TITLE;
    };
  }, [article]);
}

const ArticlePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [scrollProgress, setScrollProgress] = useState(0);
  const { toggleSave, isSaved } = useReadingList();
  const [textSizeIdx, setTextSizeIdx] = useState<number>(() => {
    const stored = localStorage.getItem("article-text-size");
    return stored ? parseInt(stored) : 1;
  });
  const textSize = TEXT_SIZES[textSizeIdx];

  const cycleTextSize = (i: number) => {
    setTextSizeIdx(i);
    localStorage.setItem("article-text-size", String(i));
  };

  const { data: article, isLoading } = useArticle(slug || "");
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!localStorage.getItem("token")) return;
    apiFetch<{ id: string }>("/users/me")
      .then((u) => setCurrentUserId(u.id))
      .catch(() => {});
  }, []);
  useSEOMeta(article);

  // Record this view in the signed-in reader's history. Fire-and-forget:
  // history is a convenience, not something a failed request should surface
  // to the reader as an error.
  useEffect(() => {
    if (!article || !localStorage.getItem("token")) return;
    apiFetch(`/users/me/history/${article.id}`, { method: "POST" }).catch(() => {});
  }, [article?.id]);

  useEffect(() => {
    window.scrollTo(0, 0);
    const onScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(total > 0 ? (window.scrollY / total) * 100 : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [slug]);

  const handleShare = useCallback(() => {
    // Record the share in the backend
    if (article?.slug) {
      apiFetch(`/articles/${article.slug}/share`, { method: "POST" }).catch(() => {});
    }

    if (navigator.share) {
      navigator.share({ title: article?.title, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard");
    }
  }, [article?.title, article?.slug]);

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareTitle = article?.title || "";

  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(shareTitle);

  if (isLoading) {
    return <ArticleSkeleton />;
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="mx-auto max-w-2xl px-5 py-24 text-center">
          <p className="font-serif italic text-muted-foreground mb-6">Article not found.</p>
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold hover:translate-x-1 transition-all">
            <ArrowLeft className="h-4 w-4" /> Back to feed
          </Link>
        </div>
      </div>
    );
  }

  const publishedDate = new Date(article.publishedAt).toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const publishedISO = new Date(article.publishedAt).toISOString();
  const updatedISO = article.lastUpdated ? new Date(article.lastUpdated).toISOString() : undefined;

  const bodyParas = (article.content?.body || "").split("\n\n");

  return (
    <div className="relative min-h-screen bg-background selection:bg-primary/15 selection:text-primary pb-20">
      <div className="fixed top-0 left-0 right-0 z-[60] h-0.5 bg-black/5 dark:bg-white/5">
        <div
          className="h-full bg-primary transition-[width] duration-150 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      <Navbar />

      {/* Breadcrumb (visible, with JSON-LD from useSEOMeta) */}
      <nav aria-label="Breadcrumb" className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 pt-4 pb-0">
        <ol className="flex items-center gap-2 text-xs text-muted-foreground">
          <li><Link to="/" className="hover:text-primary transition-colors">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link to={`/?category=${article.category}`} className="hover:text-primary transition-colors">{article.category}</Link></li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground font-medium truncate max-w-[200px]" aria-current="page">{article.title}</li>
        </ol>
      </nav>

      <article>
        <header className="border-y border-border bg-[hsl(var(--surface))] mt-4 relative">
          <div
            aria-hidden="true"
            className="absolute top-0 left-0 right-0 h-1"
            style={{ backgroundColor: categoryColors[article.category] || 'hsl(var(--primary))' }}
          />
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-10 py-10 sm:py-16">
            <div className="flex items-center gap-3 mb-5">
              <Link
                to={`/?category=${article.category}`}
                className="overline text-primary hover:underline underline-offset-4"
              >
                {article.category}
              </Link>
              <span className="h-1 w-1 rounded-full bg-border" />
              <time dateTime={publishedISO} className="text-[11px] text-muted-foreground font-medium tracking-wide">
                {timeAgo(article.publishedAt)}
              </time>
              {article.isBreaking && (
                <>
                  <span className="h-1 w-1 rounded-full bg-border" />
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-primary">
                    Breaking
                  </span>
                </>
              )}
              {article.isTrending && (
                <>
                  <span className="h-1 w-1 rounded-full bg-border" />
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                    <Flame className="h-3 w-3 fill-current" /> Trending
                  </span>
                </>
              )}
            </div>

            <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] text-foreground">
              {article.title}
            </h1>

            <p className="font-serif text-lg sm:text-xl text-muted-foreground mt-5 sm:mt-6 leading-relaxed max-w-3xl">
              {article.summary}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-4 mt-8 sm:mt-10 pt-6 border-t border-border">
              <address className="flex items-center gap-3 not-italic">
                <div className="h-10 w-10 rounded-full gradient-maroon flex items-center justify-center shadow-sm">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div className="leading-tight">
                  <div className="overline">By</div>
                  <div className="text-sm font-bold text-foreground" rel="author">{article.author}</div>
                  <div className="text-[11px] text-muted-foreground font-serif italic mt-0.5">
                    <time dateTime={publishedISO}>{publishedDate}</time>
                  </div>
                </div>
              </address>

              <div className="flex items-center gap-2">
                {article.lastUpdated && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-primary font-semibold mr-2">
                    <History className="h-3 w-3" /> Updated <time dateTime={updatedISO}>{timeAgo(article.lastUpdated)}</time>
                  </span>
                )}
                <button
                  onClick={handleShare}
                  className="h-10 w-10 sm:h-10 sm:w-auto sm:px-4 rounded-full border border-border flex items-center justify-center sm:gap-2 hover:bg-primary hover:text-white hover:border-primary transition-colors press"
                  aria-label="Share this article"
                >
                  <Share2 className="h-4 w-4" />
                  <span className="hidden sm:inline text-xs font-semibold uppercase tracking-wider">Share</span>
                </button>
                <button
                  onClick={() => toggleSave(article)}
                  className={cn(
                    "h-10 w-10 sm:h-10 sm:w-auto sm:px-4 rounded-full border flex items-center justify-center sm:gap-2 transition-colors press",
                    isSaved(article.id)
                      ? "bg-primary text-white border-primary"
                      : "border-border hover:bg-primary hover:text-white hover:border-primary"
                  )}
                  aria-label={isSaved(article.id) ? "Remove from bookmarks" : "Bookmark this article"}
                >
                  {isSaved(article.id)
                    ? <BookmarkCheck className="h-4 w-4 fill-current" />
                    : <Bookmark className="h-4 w-4" />}
                  <span className="hidden sm:inline text-xs font-semibold uppercase tracking-wider">
                    {isSaved(article.id) ? "Saved" : "Save"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {article.thumbnailUrl && (
          <figure className="border-b border-border bg-[hsl(var(--surface-2))]">
            <div className="max-w-6xl mx-auto">
              <img
                src={article.thumbnailUrl}
                alt={`${article.title} — ${article.category}`}
                className="w-full aspect-[16/9] sm:aspect-[21/9] object-cover"
                onError={handleImageFallback}
                loading="eager"
                fetchPriority="high"
              />
              <figcaption className="px-4 sm:px-6 lg:px-10 py-3 text-[11px] font-serif italic text-muted-foreground border-t border-border bg-background">
                {article.title} · {article.category}
              </figcaption>
            </div>
          </figure>
        )}

        <div className="max-w-screen-2xl mx-auto grid grid-cols-1 lg:grid-cols-12 px-4 sm:px-6 lg:px-10 py-10 sm:py-16 gap-x-12">
          <aside className="hidden lg:block lg:col-span-3" aria-label="Article tools">
            <div className="sticky top-28 space-y-6">
              <div>
                <p className="overline mb-3">In this article</p>
                <div className="flex flex-col gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    <meta property="wordCount" content={article.content?.body?.split(/\s+/).length.toString()} />
                    {article.readTime} read
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye className="h-3 w-3" />
                    {article.viewCount?.toLocaleString() || 0} views
                  </div>
                  <div className="flex items-center gap-2">
                    <Share2 className="h-3 w-3" />
                    {article.shareCount?.toLocaleString() || 0} shares
                  </div>
                </div>
              </div>

              <nav aria-label="Table of contents" className="border-t border-border pt-5">
                <p className="overline mb-2">Contents</p>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  {article.content?.tldr && <li><a href="#takeaway" className="hover:text-primary transition-colors">The takeaway</a></li>}
                  {article.content?.points?.length ? <li><a href="#key-points" className="hover:text-primary transition-colors">Key points</a></li> : null}
                  <li><a href="#article-body" className="hover:text-primary transition-colors">Full story</a></li>
                  {article.content?.timeline?.length ? <li><a href="#timeline" className="hover:text-primary transition-colors">Timeline</a></li> : null}
                  {article.content?.explainer?.length ? <li><a href="#explainer" className="hover:text-primary transition-colors">Explainer</a></li> : null}
                </ul>
              </nav>

              <div className="border-t border-border pt-5">
                <p className="overline mb-3 flex items-center gap-1.5"><Type className="h-3 w-3" /> Text size</p>
                <div className="flex border border-border rounded-md overflow-hidden">
                  {TEXT_SIZE_LABELS.map((label, i) => (
                    <button
                      key={label}
                      onClick={() => cycleTextSize(i)}
                      className={cn(
                        "flex-1 h-10 text-sm font-medium transition-colors",
                        textSizeIdx === i ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"
                      )}
                      aria-label={`Text size ${label}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-border pt-5">
                <p className="overline mb-3">Share this story</p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleShare}
                    className="w-full h-10 px-4 rounded-md border border-border flex items-center justify-center gap-2 hover:bg-primary hover:text-white hover:border-primary transition-colors press"
                  >
                    <Share2 className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Share</span>
                  </button>
                  <div className="flex gap-2">
                    <a
                      href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 h-9 rounded-md border border-border flex items-center justify-center gap-1.5 text-muted-foreground hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2] transition-colors press"
                      aria-label="Share on Facebook"
                    >
                      <Facebook className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider">Facebook</span>
                    </a>
                    <a
                      href={`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 h-9 rounded-md border border-border flex items-center justify-center gap-1.5 text-muted-foreground hover:bg-[#25D366] hover:text-white hover:border-[#25D366] transition-colors press"
                      aria-label="Share on WhatsApp"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      <span className="text-[10px] font-semibold uppercase tracking-wider">WhatsApp</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <div className="lg:col-span-7 lg:col-start-4 max-w-2xl">
            <div className="lg:hidden mb-6 flex items-center justify-between border-b border-border pb-4">
              <span className="overline flex items-center gap-1.5"><Type className="h-3 w-3" /> Text size</span>
              <div className="flex border border-border rounded-md overflow-hidden">
                {TEXT_SIZE_LABELS.map((label, i) => (
                  <button
                    key={label}
                    onClick={() => cycleTextSize(i)}
                    className={cn(
                      "h-9 w-10 text-sm font-medium transition-colors",
                      textSizeIdx === i ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {article.content?.tldr && (
              <section id="takeaway" className="tldr-block mb-10">
                <h2 className="chip-primary mb-4">
                  <Sparkles className="h-3 w-3 fill-current" /> TL;DR
                </h2>
                <p className="font-display text-xl sm:text-2xl font-bold text-foreground leading-snug text-balance">
                  {article.content.tldr}
                </p>
                <p className="mt-3 font-display text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Read in 20 seconds — or get the full story below
                </p>
              </section>
            )}

            {article.content?.points && article.content.points.length > 0 && (
              <section id="key-points" className="mb-12 p-6 sm:p-8 rounded-2xl bg-[hsl(var(--surface))] border-2 border-border">
                <h2 className="chip mb-5">Key points</h2>
                <ol className="space-y-4">
                  {article.content.points.map((point, i) => (
                    <li key={i} className="flex gap-4">
                      <span className="font-display text-2xl font-bold text-primary tabular-nums leading-none w-8 shrink-0">
                        {i + 1}
                      </span>
                      <p className="text-base text-foreground leading-relaxed">{point}</p>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            <div id="article-body" className={cn("article-body", textSize, "transition-[font-size]")}>
              {isHtml(article.content?.body || "") ? (
                <div 
                  className="prose prose-sm sm:prose-base md:prose-lg max-w-none dark:prose-invert font-serif leading-relaxed prose-headings:font-bold prose-a:text-primary prose-a:underline [&>p:first-of-type]:first-letter:font-serif [&>p:first-of-type]:first-letter:text-6xl sm:[&>p:first-of-type]:first-letter:text-7xl [&>p:first-of-type]:first-letter:font-bold [&>p:first-of-type]:first-letter:text-primary [&>p:first-of-type]:first-letter:float-left [&>p:first-of-type]:first-letter:mr-3 [&>p:first-of-type]:first-letter:mt-1 [&>p:first-of-type]:first-letter:leading-[0.85]"
                  dangerouslySetInnerHTML={{ __html: article.content?.body || "" }} 
                />
              ) : (
                <div className="prose prose-sm sm:prose-base md:prose-lg max-w-none dark:prose-invert font-serif leading-relaxed prose-headings:font-bold prose-a:text-primary prose-a:underline [&>p:first-of-type]:first-letter:font-serif [&>p:first-of-type]:first-letter:text-6xl sm:[&>p:first-of-type]:first-letter:text-7xl [&>p:first-of-type]:first-letter:font-bold [&>p:first-of-type]:first-letter:text-primary [&>p:first-of-type]:first-letter:float-left [&>p:first-of-type]:first-letter:mr-3 [&>p:first-of-type]:first-letter:mt-1 [&>p:first-of-type]:first-letter:leading-[0.85]">
                  <ReactMarkdown>{article.content?.body || ""}</ReactMarkdown>
                </div>
              )}
            </div>

            {article.content?.timeline && article.content.timeline.length > 0 && (
              <section id="timeline" className="mt-14 pt-10 border-t border-border">
                <h2 className="overline text-primary mb-2">How this unfolded</h2>
                <p className="font-serif text-2xl sm:text-3xl font-bold tracking-tight mb-8">Timeline</p>
                <ol className="relative border-l-2 border-border pl-6 space-y-7">
                  {article.content.timeline.map((item, i) => (
                    <li key={i} className="relative">
                      <span className="absolute -left-[31px] top-1 h-4 w-4 rounded-full bg-background border-2 border-primary" />
                      <time className="font-serif italic text-xs text-primary uppercase tracking-wider mb-1 block">
                        {(item as any).date}
                      </time>
                      <p className="font-serif text-base sm:text-lg text-foreground leading-snug">
                        {(item as any).event}
                      </p>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {article.content?.explainer && article.content.explainer.length > 0 && (
              <section id="explainer" className="mt-14 pt-10 border-t border-border">
                <h2 className="overline text-primary mb-2">Questions answered</h2>
                <p className="font-serif text-2xl sm:text-3xl font-bold tracking-tight mb-8">In plain English</p>
                <dl className="space-y-7">
                  {article.content.explainer.map((qa, i) => (
                    <div key={i}>
                      <dt className="font-serif text-lg font-bold text-foreground mb-2">{(qa as any).question}</dt>
                      <dd className="text-base text-muted-foreground leading-relaxed">{(qa as any).answer}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {article.instagramUrl && (
              <section className="mt-14 pt-10 border-t border-border">
                <h2 className="overline text-primary mb-5">From social</h2>
                <InstagramEmbed url={article.instagramUrl} />
              </section>
            )}

            <footer className="mt-12 pt-8 border-t border-border flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span className="overline">End of article</span>
            </footer>
          </div>

          <aside className="hidden lg:block lg:col-span-2" aria-label="Related articles">
            <div className="sticky top-28 space-y-4">
              <h2 className="overline mb-4">Read next</h2>
              <RelatedArticles articleId={article?.id ?? ""} />
            </div>
          </aside>
        </div>
      </article>

      {/* Floating share bar — mobile only */}
      {article && (
        <div className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-background/95 backdrop-blur-md lg:hidden flex items-center justify-between px-4 py-2.5 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <h3 className="text-xs font-semibold truncate">{article.title}</h3>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-[#1877F2] hover:text-white transition-colors press"
              aria-label="Share on Facebook"
            >
              <Facebook className="h-4 w-4" />
            </a>
            <a
              href={`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-[#25D366] hover:text-white transition-colors press"
              aria-label="Share on WhatsApp"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </a>
            <div className="w-px h-6 bg-border mx-1" />
            <button
              onClick={handleShare}
              className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 hover:opacity-90 transition-opacity press"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </button>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 lg:pb-12">
        <CommentSection articleId={article?.id ?? ""} currentUserId={currentUserId} />
      </div>
    </div>
  );
};

function RelatedArticles({ articleId }: { articleId: string }) {
  const { data: related = [] } = useRelatedArticles(articleId);
  if (related.length === 0) return null;
  return (
    <div className="space-y-5">
      {related.slice(0, 5).map((a) => (
        <Link
          key={a.id}
          to={`/article/${a.slug}`}
          className="group block"
        >
          {a.thumbnailUrl && (
            <img
              src={a.thumbnailUrl}
              alt={`${a.title}`}
              className="w-full h-28 object-cover rounded-md mb-2"
              onError={handleImageFallback}
              loading="lazy"
            />
          )}
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">
            {a.category}
          </span>
          <h3 className="text-sm font-semibold leading-snug mt-0.5 group-hover:text-primary transition-colors line-clamp-2">
            {a.title}
          </h3>
          <span className="text-xs text-muted-foreground mt-1 block">
            {a.readTime} read
          </span>
        </Link>
      ))}
    </div>
  );
}

export default ArticlePage;
