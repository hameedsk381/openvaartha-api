from pydantic import BaseModel, Field
from pydantic.alias_generators import to_camel
from typing import Literal, Optional, List
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
    # AI output is never treated as a completed editorial fact check until a
    # named newsroom reviewer confirms it. Origin metadata records which model
    # produced the automated review so readers can audit reproducibility.
    model: str = ""
    model_version: str = ""
    review_status: Literal["automated_unverified", "editor_confirmed"] = "automated_unverified"
    reviewer_id: Optional[str] = None
    reviewer_name: Optional[str] = None
    confirmation_date: Optional[datetime] = None
    # Ordered list of evidence URLs a human reviewer relied on when confirming.
    evidence: List[str] = Field(default_factory=list)

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


class ArticleCitation(BaseModel):
    publisher: str = ""
    url: str
    published_at: Optional[datetime] = None


class CorrectionCreate(BaseModel):
    summary: str = Field(min_length=1, max_length=280)
    details: Optional[str] = Field(default=None, max_length=4000)
    severity: Literal["clarification", "correction", "retraction"] = "correction"
    reason: Optional[str] = Field(default=None, max_length=1000)


class ArticleCorrectionSnapshot(BaseModel):
    """A shallow snapshot of what changed, surfaced in correction panels."""
    fields: List[str] = Field(default_factory=list)
    excerpt: Optional[str] = None


class ArticleCorrection(CorrectionCreate):
    id: str
    corrected_at: datetime
    editor_id: Optional[str] = None
    editor_name: Optional[str] = None
    before: Optional[ArticleCorrectionSnapshot] = None
    after: Optional[ArticleCorrectionSnapshot] = None


class CorrectionIndexItem(BaseModel):
    id: str
    article_id: str
    article_slug: str
    article_title: str
    summary: str
    severity: Literal["clarification", "correction", "retraction"] = "correction"
    corrected_at: datetime

    class Config:
        alias_generator = to_camel
        populate_by_name = True


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
    published_at: Optional[datetime] = None
    last_updated: Optional[datetime] = None
    author: Optional[str] = None
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
    citations: List[ArticleCitation] = Field(default_factory=list)
    corrections: List[ArticleCorrection] = Field(default_factory=list)
    embedding: Optional[List[float]] = None

    class Config:
        alias_generator = to_camel
        populate_by_name = True
        from_attributes = True
