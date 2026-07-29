import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { Layers } from "lucide-react";
import { ArrowRight } from "@/components/animate-ui/icons/arrow-right";

interface SeriesInfo {
  id: string;
  slug: string;
  title: string;
  total_parts: number;
  current_part: number;
}

interface Props {
  articleId: string;
}

export default function SeriesBanner({ articleId }: Props) {
  const { data: series } = useQuery<SeriesInfo>({
    queryKey: ["series", "article", articleId],
    queryFn: () => apiFetch<SeriesInfo>(`/series/article/${articleId}`),
    enabled: !!articleId,
  });

  if (!series || !series.slug) return null;

  return (
    <div className="my-6 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5 backdrop-blur">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
              Part {series.current_part} of {series.total_parts} Series
            </span>
            <h4 className="text-sm sm:text-base font-bold text-foreground font-serif">
              {series.title}
            </h4>
          </div>
        </div>

        <Link
          to={`/series/${series.slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline group"
        >
          View Full Series <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
