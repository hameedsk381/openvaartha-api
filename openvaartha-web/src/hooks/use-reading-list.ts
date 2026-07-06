import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Article } from '@/lib/types';

const GUEST_KEY = 'reading-list-guest';

// Single shared cache key so every component using this hook (Navbar badge,
// PortalSaved, ArticlePage's bookmark button, ...) reads and updates the same
// in-memory list — toggling save in one place now updates all of them
// immediately, instead of each hook instance holding its own stale copy.
export const READING_LIST_KEY = ['reading-list'] as const;

function isAuthed(): boolean {
    return !!localStorage.getItem('token');
}

function readGuestList(): Article[] {
    try {
        const stored = localStorage.getItem(GUEST_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

/**
 * Moves a guest's locally-saved articles onto their account's server-side
 * reading list. Call this once, right after a successful login/register —
 * before that point there's no token for the server calls to authenticate
 * with, and after this point the guest key is gone.
 */
export async function migrateGuestReadingList(): Promise<void> {
    const guestItems = readGuestList();
    if (guestItems.length === 0) return;

    await Promise.all(
        guestItems.map((article) =>
            apiFetch(`/users/me/reading-list/${article.id}`, { method: 'POST' }).catch(() => {
                // 400 = already saved server-side, 404 = article since removed —
                // neither should block migrating the rest of the list.
            }),
        ),
    );
    localStorage.removeItem(GUEST_KEY);
}

export const useReadingList = () => {
    const queryClient = useQueryClient();

    const { data: saved = [] } = useQuery({
        queryKey: READING_LIST_KEY,
        queryFn: () =>
            isAuthed()
                ? apiFetch<Article[]>('/users/me/reading-list')
                : Promise.resolve(readGuestList()),
        staleTime: isAuthed() ? 30_000 : Infinity,
    });

    const isSaved = (id: string) => saved.some((a) => a.id === id);

    const persist = (next: Article[], previous: Article[]) => {
        queryClient.setQueryData(READING_LIST_KEY, next);
        if (isAuthed()) return; // server calls handle their own rollback
        localStorage.setItem(GUEST_KEY, JSON.stringify(next));
    };

    const toggleSave = (article: Article) => {
        const already = isSaved(article.id);
        const next = already ? saved.filter((a) => a.id !== article.id) : [...saved, article];
        persist(next, saved);

        if (isAuthed()) {
            const request = already
                ? apiFetch(`/users/me/reading-list/${article.id}`, { method: 'DELETE' })
                : apiFetch(`/users/me/reading-list/${article.id}`, { method: 'POST' });
            request.catch(() => queryClient.setQueryData(READING_LIST_KEY, saved));
        }
        return !already;
    };

    const remove = (id: string) => {
        const next = saved.filter((a) => a.id !== id);
        persist(next, saved);

        if (isAuthed()) {
            apiFetch(`/users/me/reading-list/${id}`, { method: 'DELETE' }).catch(() =>
                queryClient.setQueryData(READING_LIST_KEY, saved),
            );
        }
    };

    return { saved, toggleSave, isSaved, remove };
};
