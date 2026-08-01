from pydantic import BaseModel
from beanie import Document, Field, model_validator
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
from uuid import uuid4


class ArticleStatus(str, Enum):
    DRAFT = "draft"
    PENDING = "pending"
    SCHEDULED = "scheduled"
    PUBLISHED = "published"
    ARCHIVED = "archived"


PUBLIC_STATUS = ArticleStatus.PUBLISHED.value


class ArticleContent(BaseModel):
    tldr: Optional[str] = ""
    points: Optional[List[str]] = Field(default_factory=list)
    body: Optional[str] = ""
    timeline: Optional[List[Dict[str, Any]]] = None
    explainer: Optional[Dict[str, Any]] = None
    video_url: Optional[str] = None


class ArticleSource(BaseModel):
    article_id: str
    source_id: str


class Source(Document):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    url: Optional[str] = None
    type: str = "manual"  # rss, api, manual


    class Settings:
        name = "sources"


class Article(Document):
    id: str = Field(default_factory=lambda: str(uuid4()))
    slug: str
    title: str
    summary: str
    category_id: str
    read_time: str
    language: str = "en"
    status: ArticleStatus = ArticleStatus.DRAFT
    scheduled_at: Optional[datetime] = None
    tags: List[str] = Field(default_factory=list)
    is_trending: bool = False
    is_breaking: bool = False
    is_editor_pick: bool = False
    is_opinion: bool = False
    thumbnail_url: Optional[str] = None
    instagram_url: Optional[str] = None
    published_at: datetime
    last_updated: Optional[datetime] = None
    author: str
    author_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None
    content: Optional[ArticleContent] = None
    sources: Optional[List[ArticleSource]] = None
    view_count: int = 0
    share_count: int = 0


    class Settings:
        name = "articles"
