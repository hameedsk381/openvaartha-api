from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone


class SourceCreate(BaseModel):
    name: str
    feed_url: str
    category_id: str
    language: str = "en"
    active: bool = True
    auto_publish: bool = False


class SourceUpdate(BaseModel):
    name: Optional[str] = None
    feed_url: Optional[str] = None
    category_id: Optional[str] = None
    language: Optional[str] = None
    active: Optional[bool] = None
    auto_publish: Optional[bool] = None


class Source(BaseModel):
    id: str = ""
    name: str
    feed_url: str
    category_id: str
    language: str = "en"
    active: bool = True
    auto_publish: bool = False
    last_fetched_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    article_count: int = 0
