import type { Article } from "@/lib/types";
import AnswerText from "./AnswerText";

/**
 * The answer card above the results. It is deliberately plain: a short
 * paragraph, the stories it cites, and a line saying where the words came from.
 */
export default function AiAnswer({
  answer,
  results,
  sources,
  keywords = [],
}: {
  answer: string;
  results: Article[];
  sources: number[];
  keywords?: string[];
}) {
  const cited = sources
    .map((position) => ({ position, article: results[position - 1] }))
    .filter((entry): entry is { position: number; article: Article } => Boolean(entry.article));

  return (
    <section
      aria-label="AI answer"
      className="mb-8 max-w-4xl rounded-2xl border border-border bg-[hsl(var(--surface))] p-5 sm:p-7"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="overline text-primary">Ask Open Vaartha</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Written from {cited.length || results.length} published {cited.length === 1 ? "story" : "stories"}
        </span>
      </div>

      <p className="font-serif text-lg sm:text-xl leading-relaxed text-foreground mt-3 max-w-[68ch]">
        <AnswerText answer={answer} results={results} anchor />
      </p>

      {cited.length > 0 && (
        <ol className="mt-5 grid gap-2 border-t border-border pt-4 max-w-[68ch]">
          {cited.map(({ position, article }) => (
            <li key={article.id} className="flex items-start gap-2 text-sm">
              <span className="font-display text-xs font-bold text-primary tabular-nums mt-0.5">
                {position}
              </span>
              <a
                href={`#story-${article.slug}`}
                className="min-w-0 text-muted-foreground hover:text-primary transition-colors line-clamp-2 sm:line-clamp-1"
              >
                {article.title}
              </a>
            </li>
          ))}
        </ol>
      )}

      {keywords.length > 0 && (
        <p className="mt-4 text-[11px] text-muted-foreground">
          Searched the archive for {keywords.map((k) => `“${k}”`).join(", ")}.
        </p>
      )}

      <p className="mt-1 text-[11px] text-muted-foreground">
        An AI summary of published reporting — it can misread a story. The cited stories are the record.
      </p>
    </section>
  );
}
