export type Category = {
  id: string;
  name: string;
  colorCode: string;
  emoji: string;
  createdAt: string;
};

export type ArticleStatus = "draft" | "published" | "archived";

export const ARTICLE_STATUSES: ArticleStatus[] = ["draft", "published", "archived"];

export type ArticleContent = {
  tldr: string;
  points: string[];
  body: string;
  timeline?: Array<{ date: string; event: string }> | null;
  explainer?: Array<{ question: string; answer: string }> | null;
};

export type Article = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  categoryId: string;
  category?: string;
  readTime: string;
  language: string;
  status: ArticleStatus;
  isTrending: boolean;
  isBreaking: boolean;
  isEditorPick: boolean;
  thumbnailUrl?: string | null;
  instagramUrl?: string | null;
  publishedAt: string;
  lastUpdated?: string | null;
  author: string;
  createdAt: string;
  content?: ArticleContent | null;
};
