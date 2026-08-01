from pydantic import BaseModel
from beanie import Document, Field
from typing import Optional, List
from datetime import datetime, timezone
from uuid import uuid4


class Series(Document):
    id: str = Field(default_factory=lambda: str(uuid4()))
    slug: str
    title: str
    description: str
    cover_image_url: Optional[str] = None
    article_ids: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None


    class Settings:
        name = "series"
