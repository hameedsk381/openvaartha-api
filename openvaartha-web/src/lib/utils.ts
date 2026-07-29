import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1495020689067-958852a7765e?q=80&w=2069&auto=format&fit=crop";

export function getArticleImage(thumbnail?: string | null) {
  return thumbnail?.trim() || FALLBACK_IMAGE;
}

export function handleImageFallback(event: { currentTarget: HTMLImageElement }) {
  event.currentTarget.style.display = 'none';
}

export const relativeTime = (iso: string | null | undefined) => {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diffMs)) return '';
  const h = Math.round(diffMs / 3_600_000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};