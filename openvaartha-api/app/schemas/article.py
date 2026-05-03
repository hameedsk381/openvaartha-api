from pydantic import BaseModel, Field
from pydantic.alias_generators import to_camel
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class ArticleContentBase(BaseModel):
    tldr: str
    points: List[str]
    body: str
    timeline: Optional[List[dict]] = None
    explainer: Optional[List[dict]] = None

    class Config:
        alias_generator = to_camel
        populate_by_name = True


class ArticleContentCreate(ArticleContentBase):
    pass


class ArticleContent(ArticleContentBase):
    article_id: str

    class Config:
        alias_generator = to_camel
        populate_by_name = True
        from_attributes = True


class ArticleBase(BaseModel):
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

    class Config:
        alias_generator = to_camel
        populate_by_name = True


class ArticleCreate(ArticleBase):
    content: ArticleContentCreate
    source_ids: Optional[List[str]] = []


class ArticleUpdate(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    category_id: Optional[str] = None
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

    class Config:
        alias_generator = to_camel
        populate_by_name = True


class Article(ArticleBase):
    id: str
    slug: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    category: str = "" # Default to empty string, will be populated with category name
    content: Optional[ArticleContent] = None

    class Config:
        alias_generator = to_camel
        populate_by_name = True
        from_attributes = True
