from pydantic import BaseModel
from beanie import Document, Field, model_validator
from typing import Optional
from datetime import datetime, timezone
from uuid import uuid4

class Author(Document):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    twitter: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


    class Settings:
        name = "authors"
