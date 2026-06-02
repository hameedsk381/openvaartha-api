import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getArticleImage(thumbnail?: string | null) {
  return thumbnail?.trim() || undefined;
}

export function handleImageFallback(event: { currentTarget: HTMLImageElement }) {
  event.currentTarget.style.display = 'none';
}
