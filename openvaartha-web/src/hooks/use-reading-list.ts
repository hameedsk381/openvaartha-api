import { useState, useEffect } from 'react';
import type { Article } from '@/data/mockArticles';

export const useReadingList = () => {
    const [saved, setSaved] = useState<Article[]>([]);

    useEffect(() => {
        const userEmail = localStorage.getItem('user_email');
        if (!userEmail) {
            setSaved([]);
            return;
        }
        
        const key = `reading-list-${userEmail}`;
        const stored = localStorage.getItem(key);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setSaved(parsed);
            } catch (e) {
                console.error("Failed to parse reading list", e);
            }
        } else {
            setSaved([]);
        }
    }, []);

    const toggleSave = (article: Article) => {
        const userEmail = localStorage.getItem('user_email');
        if (!userEmail) return false;

        const isAlreadySaved = saved.some(a => a.id === article.id);
        let newList;
        if (isAlreadySaved) {
            newList = saved.filter(a => a.id !== article.id);
        } else {
            newList = [...saved, article];
        }
        setSaved(newList);
        localStorage.setItem(`reading-list-${userEmail}`, JSON.stringify(newList));
        return !isAlreadySaved;
    };

    const isSaved = (id: string) => saved.some(a => a.id === id);

    const remove = (id: string) => {
        const userEmail = localStorage.getItem('user_email');
        if (!userEmail) return;

        const newList = saved.filter(a => a.id !== id);
        setSaved(newList);
        localStorage.setItem(`reading-list-${userEmail}`, JSON.stringify(newList));
    };

    return { saved, toggleSave, isSaved, remove };
};
