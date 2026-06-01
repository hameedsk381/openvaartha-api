from pydantic import BaseModel
from pydantic.alias_generators import to_camel
from typing import Optional, List
from datetime import datetime
from pydantic import Field


class CommentCreate(BaseModel):
    body: str
    parent_id: Optional[str] = None

    class Config:
        alias_generator = to_camel
        populate_by_name = True


class CommentUpdate(BaseModel):
    body: str

    class Config:
        alias_generator = to_camel
        populate_by_name = True


class Comment(BaseModel):
    id: str
    article_id: str
    user_id: str
    author_name: str
    author_email: str
    body: str
    parent_id: Optional[str] = None
    likes: List[str] = Field(default_factory=list)
    is_edited: bool = False
    is_active: bool = True
    created_at: datetime
    updated_at: Optional[datetime] = None
    reply_count: int = 0

    class Config:
        alias_generator = to_camel
        populate_by_name = True
        from_attributes = True
