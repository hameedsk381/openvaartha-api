from pydantic import BaseModel
from beanie import Document
from pydantic import Field
from typing import Optional
from datetime import datetime, timezone
from uuid import uuid4


class Category(Document):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    color_code: str
    emoji: str
    # Display order across nav, homepage category strips, and filters — lower
    # shows first. Default 50 is a neutral middle so an uncategorized/new
    # category doesn't jump ahead of or fall behind deliberately-ranked ones.
    priority: int = 50
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


    class Settings:
        name = "categories"
