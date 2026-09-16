/**
 * Server-side API client for Astro pages.
 * Runs in Node.js (SSR), not in the browser — no auth tokens, no refresh logic.
 */

const API_BASE = import.meta.env.SITE_API_URL || "http://localhost:8000/api/v1";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Accept": "application/json" },
    // No auth for public pages; tokens handled by browser client when needed
  });

  if (!res.ok) {
    let detail = `API ${res.status}`;
    try {
      const body = await res.json();
      if (body.detail) detail = String(body.detail);
    } catch { /* not JSON */ }
    throw new ApiError(detail, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Convenience wrappers for common endpoints ──────────────────────

export interface Article {
  _id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  category_id?: string;
  thumbnail_url?: string;
  published_at: string;
  author: string;
  author_slug?: string;
  read_time?: string;
  is_trending?: boolean;
  tags?: string[];
}

export interface Category {
  _id: string;
  id: string;
  name: string;
}

export async function getArticles(params?: { category?: string; limit?: number; status?: string }) {
  const qs = new URLSearchParams();
  if (params?.category) qs.set("category", params.category);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.status) qs.set("status", params.status);
  const q = qs.toString();
  return apiFetch<Article[]>(`/articles/${q ? `?${q}` : ""}`);
}

export async function getArticleBySlug(slug: string) {
  return apiFetch<Article>(`/articles/${slug}`);
}

export async function getTrendingArticles(limit = 8) {
  return apiFetch<Article[]>(`/articles/trending?limit=${limit}`);
}

export async function getCategories() {
  return apiFetch<Category[]>("/categories/");
}
