import { Fragment } from "react";
import type { Article } from "@/lib/types";
import { splitAnswer } from "@/lib/ai-search";

/**
 * Renders an AI answer, turning each [n] marker into a superscript number.
 * With `anchor`, the marker jumps to the matching story in the result list.
 */
export default function AnswerText({
  answer,
  results,
  anchor = false,
}: {
  answer: string;
  results: Article[];
  anchor?: boolean;
}) {
  return (
    <>
      {splitAnswer(answer).map((part, index) => {
        if ("text" in part) {
          return <Fragment key={index}>{part.text}</Fragment>;
        }

        const story = results[part.citation - 1];
        const label = (
          <span className="mx-0.5 align-super text-[0.68em] font-bold leading-none text-primary">
            {part.citation}
          </span>
        );

        if (!anchor || !story) {
          return <Fragment key={index}>{label}</Fragment>;
        }

        return (
          <a
            key={index}
            href={`#story-${story.slug}`}
            className="rounded-sm hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-label={`Jump to story ${part.citation}: ${story.title}`}
          >
            {label}
          </a>
        );
      })}
    </>
  );
}
