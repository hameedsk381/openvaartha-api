import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import type { Article, Category, Comment, CorrectionIndexItem, Dispatch } from "./types";
import { apiFetch } from "./api";

export function useCorrectionsIndex(params?: { skip?: number; limit?: number }) {
  const { skip = 0, limit = 50 } = params || {};
  return useQuery<CorrectionIndexItem[]>({
    queryKey: ["corrections-index", skip, limit],
    queryFn: () => apiFetch<CorrectionIndexItem[]>(`/articles/corrections?skip=${skip}&limit=${limit}`),
  });
}

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

export function useForYouArticles(limit = 15) {
  return useQuery<Article[]>({
    queryKey: ["articles", "for-you", limit],
    queryFn: () => apiFetch<Article[]>(`/articles/for-you?limit=${limit}`),
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

export function useArticlesByCategory(categoryId: string | undefined, limit = 4) {
  const query = new URLSearchParams({ skip: "0", limit: String(limit) });
  if (categoryId) query.set("category_id", categoryId);

  return useQuery<Article[]>({
    queryKey: ["articles", "by-category", categoryId, limit],
    queryFn: () => apiFetch<Article[]>(`/articles/?${query}`),
    enabled: !!categoryId,
    placeholderData: [],
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

export function useDispatches(limit = 20, options: { todayOnly?: boolean } = {}) {
  const { todayOnly = false } = options;
  return useQuery<Dispatch[]>({
    queryKey: ["dispatches", limit, todayOnly],
    queryFn: () => apiFetch<Dispatch[]>(`/dispatches/?limit=${limit}&today_only=${todayOnly}`),
    placeholderData: [],
    refetchInterval: 10000, // Poll every 10 seconds — dispatches are meant to feel live
  });
}

// Powers /bytes/:id share permalinks — resolves regardless of same-day scoping.
export function useDispatch(id?: string) {
  return useQuery<Dispatch>({
    queryKey: ["dispatch", id],
    queryFn: () => apiFetch<Dispatch>(`/dispatches/${id}`),
    enabled: !!id,
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

export function useLatestDigest() {
  return useQuery({
    queryKey: ['digests', 'latest'],
    queryFn: () => apiFetch('/digests/latest'),
    retry: false
  });
}


// Infinite scroll feed
export function useFeed(limit = 20) {
  return useInfiniteQuery<{ items: Dispatch[]; nextCursor: string | null }>({
    queryKey: ['feed'],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: String(limit) });
      if (pageParam) params.set('cursor', pageParam as string);
      return apiFetch(`/dispatches/feed?${params}`);
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    refetchInterval: 30000, // Poll every 30s for new posts
  });
}

// Like toggle with optimistic update
export function useLikeDispatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dispatchId: string) => apiFetch(`/dispatches/${dispatchId}/like`, { method: 'POST' }),
    onMutate: async (dispatchId) => {
      // Optimistic update in the infinite query cache
      await qc.cancelQueries({ queryKey: ['feed'] });
      qc.setQueriesData({ queryKey: ['feed'] }, (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            items: page.items.map((item: any) =>
              item.id === dispatchId
                ? { ...item, hasLiked: !item.hasLiked, likeCount: (item.likeCount || 0) + (item.hasLiked ? -1 : 1) }
                : item
            ),
          })),
        };
      });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  });
}
