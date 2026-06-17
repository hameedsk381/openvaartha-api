import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Article, Category, Comment } from "./types";
import { apiFetch } from "./api";

export function useArticles(params?: {
  category?: string;
  skip?: number;
  limit?: number;
}) {
  const { category, skip = 0, limit = 20 } = params || {};
  const query = new URLSearchParams({ skip: String(skip), limit: String(limit) });
  if (category) query.set("category_id", category);

  return useQuery<Article[]>({
    queryKey: ["articles", params],
    queryFn: () => apiFetch<Article[]>(`/articles/?${query}`),
  });
}

export function useArticle(idOrSlug: string) {
  return useQuery<Article>({
    queryKey: ["article", idOrSlug],
    queryFn: () => apiFetch<Article>(`/articles/${idOrSlug}`),
    enabled: !!idOrSlug,
  });
}

export function useTrendingArticles(limit = 10) {
  return useQuery<Article[]>({
    queryKey: ["articles", "trending", limit],
    queryFn: () => apiFetch<Article[]>(`/articles/trending?limit=${limit}`),
  });
}

export function useBreakingArticles(limit = 5) {
  return useQuery<Article[]>({
    queryKey: ["articles", "breaking", limit],
    queryFn: () => apiFetch<Article[]>(`/articles/breaking?limit=${limit}`),
  });
}

export function useEditorPicks(limit = 10) {
  return useQuery<Article[]>({
    queryKey: ["articles", "editor-picks", limit],
    queryFn: () => apiFetch<Article[]>(`/articles/editor-picks?limit=${limit}`),
  });
}

export function useExplainers(skip = 0, limit = 20) {
  return useQuery<Article[]>({
    queryKey: ["articles", "explainers", skip, limit],
    queryFn: () => apiFetch<Article[]>(`/articles/explainers?skip=${skip}&limit=${limit}`),
    placeholderData: [],
  });
}

export function useRelatedArticles(articleId: string, limit = 5) {
  return useQuery<Article[]>({
    queryKey: ["articles", "related", articleId, limit],
    queryFn: () => apiFetch<Article[]>(`/articles/${articleId}/related?limit=${limit}`),
    enabled: !!articleId,
    placeholderData: [],
  });
}

export function useLiveUpdates(limit = 20) {
  return useQuery<{ id: string; time: string; text: string; type: string; title: string; slug: string }[]>({
    queryKey: ["articles", "live-updates", limit],
    queryFn: () => apiFetch(`/articles/live-updates?limit=${limit}`),
    placeholderData: [],
  });
}

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => apiFetch<Category[]>("/categories/"),
  });
}

export function useSearch(query: string, skip = 0, limit = 20) {
  const params = new URLSearchParams({ q: query, skip: String(skip), limit: String(limit) });
  return useQuery<Article[]>({
    queryKey: ["search", query, skip, limit],
    queryFn: () => apiFetch<Article[]>(`/search/?${params}`),
    enabled: query.length > 0,
    placeholderData: [],
  });
}

export function useComments(articleId: string, skip = 0, limit = 50) {
  return useQuery<Comment[]>({
    queryKey: ["comments", articleId, skip, limit],
    queryFn: () => apiFetch<Comment[]>(`/comments/?article_id=${articleId}&skip=${skip}&limit=${limit}`),
    enabled: !!articleId,
    placeholderData: [],
  });
}

export function useCommentCount(articleId: string) {
  return useQuery<{ count: number }>({
    queryKey: ["comments", "count", articleId],
    queryFn: () => apiFetch<{ count: number }>(`/comments/count?article_id=${articleId}`),
    enabled: !!articleId,
    placeholderData: { count: 0 },
  });
}

export function useNewsletterSubscribe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (email: string) =>
      apiFetch<{ message: string; email: string }>("/newsletter/subscribe", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["newsletter"] });
    },
  });
}

export function useSearchSuggestions(query: string) {
  return useQuery<{ suggestions: string[] }>({
    queryKey: ["search", "suggestions", query],
    queryFn: () => apiFetch<{ suggestions: string[] }>(`/search/suggestions?q=${encodeURIComponent(query)}&limit=5`),
    enabled: query.length >= 2,
    placeholderData: { suggestions: [] },
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ articleId, body, parentId }: { articleId: string; body: string; parentId?: string }) =>
      apiFetch<Comment>(`/comments/?article_id=${articleId}`, {
        method: "POST",
        body: JSON.stringify({ body, parent_id: parentId || null }),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["comments", variables.articleId] });
    },
  });
}

export function useUpdateComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, body, articleId }: { commentId: string; body: string; articleId: string }) =>
      apiFetch<Comment>(`/comments/${commentId}`, {
        method: "PUT",
        body: JSON.stringify({ body }),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["comments", variables.articleId] });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, articleId }: { commentId: string; articleId: string }) =>
      apiFetch<{ message: string }>(`/comments/${commentId}`, { method: "DELETE" }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["comments", variables.articleId] });
    },
  });
}

export function useToggleCommentLike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, articleId }: { commentId: string; articleId: string }) =>
      apiFetch<{ liked: boolean }>(`/comments/${commentId}/like`, { method: "POST" }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["comments", variables.articleId] });
    },
  });
}
