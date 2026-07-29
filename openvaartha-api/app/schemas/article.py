from pydantic import BaseModel, Field
from pydantic.alias_generators import to_camel
from typing import Optional, List
from datetime import datetime

from app.models.article import ArticleStatus


class FactCheckClaim(BaseModel):
    claim: str
    assessment: str
    source_url: Optional[str] = None

class FactCheck(BaseModel):
    claims: List[FactCheckClaim] = Field(default_factory=list)
    bias_rating: str = "Neutral"
    confidence_score: int = 0
    summary: str = ""

    class Config:
        alias_generator = to_camel
        populate_by_name = True

class ArticleContentBase(BaseModel):
    tldr: Optional[str] = ""
    points: Optional[List[str]] = Field(default_factory=list)
    body: Optional[str] = ""
    timeline: Optional[List[dict]] = None
    explainer: Optional[List[dict]] = None
    video_url: Optional[str] = None
    poll_id: Optional[str] = None
    fact_check: Optional[FactCheck] = None

    class Config:
        alias_generator = to_camel
        populate_by_name = True


class ArticleContentCreate(ArticleContentBase):
    pass


class ArticleContentUpdate(BaseModel):
    """Partial update for nested article content. All fields optional so the
    admin form can patch any subset without nulling siblings."""
    tldr: Optional[str] = None
    points: Optional[List[str]] = None
    body: Optional[str] = None
    timeline: Optional[List[dict]] = None
    explainer: Optional[List[dict]] = None
    video_url: Optional[str] = None
    poll_id: Optional[str] = None
    fact_check: Optional[FactCheck] = None

    class Config:
        alias_generator = to_camel
        populate_by_name = True


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
    view_count: int = 0
    share_count: int = 0

    class Config:
        alias_generator = to_camel
        populate_by_name = True


class ArticleCreate(ArticleBase):
    content: ArticleContentCreate
    source_ids: Optional[List[str]] = []


class ContributionCreate(BaseModel):
    title: str
    summary: str
    category_id: str
    read_time: str = "5 min read"
    language: str = "en"
    thumbnail_url: Optional[str] = None
    content: ArticleContentCreate

    class Config:
        alias_generator = to_camel
        populate_by_name = True


class ArticleUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    summary: Optional[str] = None
    category_id: Optional[str] = None
    read_time: Optional[str] = None
    language: Optional[str] = None
    status: Optional[ArticleStatus] = None
    scheduled_at: Optional[datetime] = None
    tags: Optional[List[str]] = None
    is_trending: Optional[bool] = None
    is_breaking: Optional[bool] = None
    is_editor_pick: Optional[bool] = None
    is_opinion: Optional[bool] = None
    thumbnail_url: Optional[str] = None
    instagram_url: Optional[str] = None
    published_at: Optional[datetime] = None
    last_updated: Optional[datetime] = None
    author: Optional[str] = None
    author_id: Optional[str] = None
    content: Optional[ArticleContentUpdate] = None

    class Config:
        alias_generator = to_camel
        populate_by_name = True


class Article(ArticleBase):
    id: str
    slug: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    category: str = ""  # Default to empty string, will be populated with category name
    content: Optional[ArticleContent] = None

    class Config:
        alias_generator = to_camel
        populate_by_name = True
        from_attributes = True
