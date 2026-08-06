import { ExternalLink, Link as LinkIcon } from "lucide-react";
import type { ArticleCitation } from "@/lib/types";

export function ArticleCitations({ citations }: { citations: ArticleCitation[] }) {
  if (!citations.length) return null;

  return (
    <section className="my-8 rounded-xl border border-border bg-card p-5" aria-label="Article sources">
      <h2 className="flex items-center gap-2 text-base font-bold"><LinkIcon className="h-4 w-4" /> Sources</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {citations.map((citation, index) => (
          <li key={`${citation.url}-${index}`}>
            <a className="inline-flex items-center gap-1 text-primary hover:underline" href={citation.url} target="_blank" rel="noreferrer">
              {citation.publisher || "Source"}<ExternalLink className="h-3 w-3" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
