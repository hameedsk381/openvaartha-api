export type ArticleStatus = "draft" | "pending" | "scheduled" | "published" | "archived";

export const ARTICLE_STATUSES: ArticleStatus[] = ["draft", "pending", "scheduled", "published", "archived"];

export interface FactCheckClaim {
  claim: string;
  assessment: string;
  sourceUrl?: string | null;
}

export interface FactCheck {
  claims: FactCheckClaim[];
  biasRating: string;
  confidenceScore: number;
  summary: string;
  reviewStatus?: "automated_unverified" | "editor_confirmed";
}

export interface ArticleContent {
  tldr: string;
  points: string[];
  body: string;
  timeline?: { date: string; event: string }[] | null;
  explainer?: { question: string; answer: string }[] | null;
  videoUrl?: string | null;
  pollId?: string | null;
  factCheck?: FactCheck | null;
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
  scheduledAt?: string | null;
  tags?: string[];
  isTrending: boolean;
  isBreaking: boolean;
  isEditorPick: boolean;
  thumbnailUrl?: string | null;
  instagramUrl?: string | null;
  publishedAt: string;
  lastUpdated?: string | null;
  author: string;
  authorId?: string | null;
  viewCount: number;
  shareCount: number;
  createdAt: string;
  content?: ArticleContent | null;
  citations?: ArticleCitation[];
  corrections?: ArticleCorrection[];
}

export interface ArticleCitation {
  publisher: string;
  url: string;
  publishedAt?: string | null;
}

export interface ArticleCorrection {
  id: string;
  summary: string;
  details?: string | null;
  reason?: string | null;
  severity: "clarification" | "correction" | "retraction";
  correctedAt: string;
  editorId?: string | null;
  editorName?: string | null;
  before?: { fields: string[]; excerpt?: string | null } | null;
  after?: { fields: string[]; excerpt?: string | null } | null;
}

export interface CorrectionIndexItem {
  id: string;
  articleId: string;
  articleSlug: string;
  articleTitle: string;
  summary: string;
  severity: "clarification" | "correction" | "retraction";
  correctedAt: string;
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

export interface Dispatch {
  id: string;
  text: string;
  articleId?: string | null;
  articleSlug?: string | null;
  articleTitle?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  categoryId?: string | null;
  category?: string | null;
  createdAt: string;
  likeCount?: number;
  hasLiked?: boolean;
}

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

export interface Digest {
  id: string;
  date: string;
  title: string;
  overview: string;
  article_ids: string[];
  status: 'draft' | 'published';
  created_at: string;
}

export interface DigestWithArticles extends Digest {
  articles: Article[];
}


