import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Article } from "./types";
import { apiFetch } from "./api";

export interface AiSearchResponse {
  query: string;
  mode: "answer" | "results";
  /** Grounded answer, with citations written as [n] where results[n-1] is the story. */
  answer: string | null;
  /** The search phrases the question was rewritten into. */
  keywords: string[];
  /** 1-based positions in `results` that the answer cites. */
  sources: number[];
  results: Article[];
}

// Keep in sync with _QUESTION_STARTERS in
// openvaartha-api/app/services/ai_search_service.py: the overlay uses this to
// decide whether a query is worth an AI round-trip before asking the server.
const QUESTION_STARTERS = new Set([
  "who", "what", "when", "where", "why", "how", "which",
  "is", "are", "was", "were", "did", "does", "do",
  "can", "could", "should", "would", "tell", "explain", "compare", "list",
]);

export function looksLikeQuestion(query: string): boolean {
  const text = query.trim();
  if (!text) return false;
  if (text.endsWith("?")) return true;
  const words = text.match(/[A-Za-z0-9']+/g) ?? [];
  if (words.length >= 5) return true;
  return words.length > 0 && QUESTION_STARTERS.has(words[0].toLowerCase());
}

/** Waits for the reader to stop typing before spending a model call. */
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function useAiSearch(query: string, category?: string, limit = 12) {
  const debounced = useDebouncedValue(query.trim(), 400);
  const params = new URLSearchParams({ q: debounced, limit: String(limit) });
  if (category) params.set("category", category);

  return useQuery<AiSearchResponse>({
    queryKey: ["search", "ai", debounced, category ?? "", limit],
    queryFn: () => apiFetch<AiSearchResponse>(`/search/ai?${params}`),
    enabled: debounced.length >= 3,
    staleTime: 60_000,
    retry: false,
  });
}

export type AnswerPart = { text: string } | { citation: number };

/** Splits "…as the report said [2]." into text and citation parts. */
export function splitAnswer(answer: string): AnswerPart[] {
  const parts: AnswerPart[] = [];
  const pattern = /\[(\d{1,2})\]/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(answer)) !== null) {
    if (match.index > cursor) {
      parts.push({ text: answer.slice(cursor, match.index) });
    }
    parts.push({ citation: Number(match[1]) });
    cursor = match.index + match[0].length;
  }

  if (cursor < answer.length) {
    parts.push({ text: answer.slice(cursor) });
  }

  return parts;
}
