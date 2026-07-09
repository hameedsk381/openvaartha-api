from pydantic import BaseModel, Field, model_validator
from typing import Optional
from datetime import datetime, timezone
from uuid import uuid4

class Author(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    twitter: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @model_validator(mode="before")
    @classmethod
    def map_mongo_id(cls, data):
        if isinstance(data, dict) and "_id" in data and "id" not in data:
            data = data.copy()
            data["id"] = str(data["_id"])
        return data
