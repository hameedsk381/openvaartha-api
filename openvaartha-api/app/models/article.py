from pydantic import BaseModel, Field, model_validator
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
from uuid import uuid4


class ArticleStatus(str, Enum):
    DRAFT = "draft"
    PENDING = "pending"
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


class Source(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    url: Optional[str] = None
    type: str = "manual"  # rss, api, manual


class Article(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    slug: str
    title: str
    summary: str
    category_id: str
    read_time: str
    language: str = "en"
    status: ArticleStatus = ArticleStatus.DRAFT
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

    @model_validator(mode="before")
    @classmethod
    def map_mongo_id(cls, data):
        if isinstance(data, dict) and "_id" in data and "id" not in data:
            data = data.copy()
            data["id"] = data["_id"]
        return data
