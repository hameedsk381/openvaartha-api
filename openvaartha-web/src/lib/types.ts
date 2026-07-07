export type ArticleStatus = "draft" | "published" | "archived";

export const ARTICLE_STATUSES: ArticleStatus[] = ["draft", "published", "archived"];

export interface ArticleContent {
  tldr: string;
  points: string[];
  body: string;
  timeline?: { date: string; event: string }[] | null;
  explainer?: { question: string; answer: string }[] | null;
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  summary: string;
  categoryId: string;
  category: string;
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
  viewCount: number;
  shareCount: number;
  createdAt: string;
  content?: ArticleContent | null;
}

export interface Category {
  id: string;
  name: string;
  colorCode: string;
  emoji: string;
  createdAt: string;
}

export const CATEGORY_NAMES = ["Politics", "Tech", "Business", "Cinema", "Local News", "Sports"] as const;
export type CategoryName = (typeof CATEGORY_NAMES)[number];

export const categoryColors: Record<string, string> = {
  Politics: "bg-[#550000]",
  Tech: "bg-[#4a5568]",
  Business: "bg-[#6b705c]",
  Cinema: "bg-[#cb997e]",
  "Local News": "bg-[#bc6c25]",
  Sports: "bg-[#ddb892]",
};

export interface Comment {
  id: string;
  articleId: string;
  userId: string;
  authorName: string;
  authorEmail: string;
  body: string;
  parentId?: string | null;
  likes: string[];
  isEdited: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
  replyCount: number;
}

export const categoryEmojis: Record<string, string> = {
  Politics: "🟣",
  Tech: "🔵",
  Business: "🟢",
  Cinema: "🟠",
  "Local News": "🔴",
  Sports: "🟡",
};
