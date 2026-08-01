from beanie import Document
from pydantic import Field, model_validator
from typing import Optional
from datetime import datetime, timezone
from uuid import uuid4

class Dispatch(Document):
    id: str = Field(default_factory=lambda: str(uuid4()))
    text: str
    article_id: Optional[str] = None
    image_url: Optional[str] = None
    category_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: Optional[str] = None
    
    @model_validator(mode="before")
    @classmethod
    def map_mongo_id(cls, data):
        if isinstance(data, dict) and "_id" in data and "id" not in data:
            data = data.copy()
            data["id"] = data["_id"]
        return data

    class Settings:
        name = "dispatches"
