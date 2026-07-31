from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.models.digest import DigestStatus, DailyDigest
from app.schemas.article import ArticleResponse


class DigestCreate(BaseModel):
    date: str
    title: str
    overview: str
    article_ids: List[str]
    status: DigestStatus = DigestStatus.DRAFT


class DigestUpdate(BaseModel):
    title: Optional[str] = None
    overview: Optional[str] = None
    article_ids: Optional[List[str]] = None
    status: Optional[DigestStatus] = None


class DigestResponse(DailyDigest):
    # In a real response, we might populate the articles.
    # We will use DigestWithArticlesResponse for the full fetch.
    pass


class DigestWithArticlesResponse(DailyDigest):
    articles: List[ArticleResponse] = []
