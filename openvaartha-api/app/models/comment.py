from pydantic import BaseModel, Field, model_validator
from typing import Optional, List
from datetime import datetime
from uuid import uuid4


class Comment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    article_id: str
    user_id: str
    author_name: str
    author_email: str
    body: str
    parent_id: Optional[str] = None
    likes: List[str] = Field(default_factory=list)
    is_edited: bool = False
    is_flagged: bool = False
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    @model_validator(mode="before")
    @classmethod
    def map_mongo_id(cls, data):
        if isinstance(data, dict) and "_id" in data and "id" not in data:
            data = data.copy()
            data["id"] = data["_id"]
        return data
