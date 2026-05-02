from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import uuid4


class Category(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    color_code: str
    emoji: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
