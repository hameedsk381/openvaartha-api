from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import uuid4


class ArticleContent(BaseModel):
    tldr: str
    points: List[str]
    body: str
    timeline: Optional[List[Dict[str, Any]]] = None
    explainer: Optional[Dict[str, Any]] = None


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
    is_trending: bool = False
    is_breaking: bool = False
    thumbnail_url: Optional[str] = None
    instagram_url: Optional[str] = None
    published_at: datetime
    last_updated: Optional[datetime] = None
    author: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    content: Optional[ArticleContent] = None
    sources: Optional[List[ArticleSource]] = None
