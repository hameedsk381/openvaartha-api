from pydantic import BaseModel
from beanie import Document, Field
from typing import Optional
from datetime import datetime, timezone
from uuid import uuid4


class Category(Document):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    color_code: str
    emoji: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


    class Settings:
        name = "categories"
