from pydantic import BaseModel
from beanie import Document, Field, model_validator
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
from uuid import uuid4


class DigestStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"


class DailyDigest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    date: str  # YYYY-MM-DD format
    title: str
    overview: str  # AI-generated summary
    article_ids: List[str] = Field(default_factory=list)
    status: DigestStatus = DigestStatus.DRAFT
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None

    @model_validator(mode="before")
    @classmethod
    def map_mongo_id(cls, data):
        if isinstance(data, dict) and "_id" in data and "id" not in data:
            data = data.copy()
            data["id"] = data["_id"]
        return data
