import { useParams } from "react-router-dom";
import SingleArticle from "@/components/SingleArticle";
import Navbar from "@/components/Navbar";

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();

  const handleInView = (articleSlug: string, articleTitle: string) => {
    if (window.location.pathname === `/article/${articleSlug}`) {
      document.title = `${articleTitle} | Open Vaartha`;
    }
  };

  if (!slug) return null;

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-background selection:bg-primary/15 selection:text-primary flex flex-col">
      <div className="shrink-0 z-50">
        <Navbar isInsideStack={true} hideBottomNav={true} />
      </div>

      <div className="flex-1 overflow-hidden relative">
        <div className="relative h-full overflow-y-auto overflow-x-hidden pb-safe">
          <SingleArticle articleId={slug} onInView={handleInView} />
        </div>
      </div>
    </div>
  );
}
