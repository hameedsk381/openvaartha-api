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
