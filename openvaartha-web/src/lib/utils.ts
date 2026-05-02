import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const NEWS_FALLBACK_IMAGE = "/news-fallback.svg";

export function getArticleImage(thumbnail?: string | null) {
  return thumbnail?.trim() || NEWS_FALLBACK_IMAGE;
}

export function handleImageFallback(event: { currentTarget: HTMLImageElement }) {
  const image = event.currentTarget;

  if (image.src.endsWith(NEWS_FALLBACK_IMAGE)) return;

  image.src = NEWS_FALLBACK_IMAGE;
}
