from pydantic import BaseModel
from beanie import Document
from pydantic import Field, model_validator
from typing import Optional, List
from datetime import datetime, timezone
from uuid import uuid4


class Comment(Document):
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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None


    class Settings:
        name = "comments"
