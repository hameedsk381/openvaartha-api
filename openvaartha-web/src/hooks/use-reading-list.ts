import { useState, useEffect } from 'react';
import type { Article } from '@/lib/types';

const GUEST_KEY = 'reading-list-guest';

const keyFor = (email: string | null) =>
    email ? `reading-list-${email}` : GUEST_KEY;

const readList = (email: string | null): Article[] => {
    try {
        const stored = localStorage.getItem(keyFor(email));
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

export const useReadingList = () => {
    const [saved, setSaved] = useState<Article[]>([]);

    useEffect(() => {
        const email = localStorage.getItem('user_email');

        // Migrate any guest-saved items into the user's list on first login
        if (email) {
            const guestItems = readList(null);
            const userItems  = readList(email);
            if (guestItems.length > 0) {
                const merged = [
                    ...userItems,
                    ...guestItems.filter(g => !userItems.some(u => u.id === g.id)),
                ];
                localStorage.setItem(keyFor(email), JSON.stringify(merged));
                localStorage.removeItem(GUEST_KEY);
                setSaved(merged);
                return;
            }
        }

        setSaved(readList(email));
    }, []);

    const persist = (next: Article[]) => {
        const email = localStorage.getItem('user_email');
        setSaved(next);
        localStorage.setItem(keyFor(email), JSON.stringify(next));
    };

    const toggleSave = (article: Article) => {
        const isAlreadySaved = saved.some(a => a.id === article.id);
        const next = isAlreadySaved
            ? saved.filter(a => a.id !== article.id)
            : [...saved, article];
        persist(next);
        return !isAlreadySaved;
    };

    const isSaved = (id: string) => saved.some(a => a.id === id);

    const remove = (id: string) => persist(saved.filter(a => a.id !== id));

    return { saved, toggleSave, isSaved, remove };
};
