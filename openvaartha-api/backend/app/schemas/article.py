from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class ArticleContentBase(BaseModel):
    tldr: str
    points: List[str]
    body: str
    timeline: Optional[List[dict]] = None
    explainer: Optional[List[dict]] = None


class ArticleContentCreate(ArticleContentBase):
    pass


class ArticleContent(ArticleContentBase):
    article_id: UUID

    class Config:
        from_attributes = True


class ArticleBase(BaseModel):
    title: str
    summary: str
    category_id: UUID
    read_time: str
    language: str = "en"
    is_trending: bool = False
    is_breaking: bool = False
    thumbnail_url: Optional[str] = None
    instagram_url: Optional[str] = None
    published_at: datetime
    last_updated: Optional[datetime] = None
    author: str


class ArticleCreate(ArticleBase):
    content: ArticleContentCreate
    source_ids: Optional[List[UUID]] = []


class ArticleUpdate(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    category_id: Optional[UUID] = None
    read_time: Optional[str] = None
    language: Optional[str] = None
    is_trending: Optional[bool] = None
    is_breaking: Optional[bool] = None
    thumbnail_url: Optional[str] = None
    instagram_url: Optional[str] = None
    published_at: Optional[datetime] = None
    last_updated: Optional[datetime] = None
    author: Optional[str] = None
    content: Optional[ArticleContentCreate] = None


class Article(ArticleBase):
    id: UUID
    slug: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    category: 'Category'
    content: Optional[ArticleContent] = None

    class Config:
        from_attributes = True


# Import Category to avoid circular dependency
from app.schemas.category import Category
Article.model_rebuild()
