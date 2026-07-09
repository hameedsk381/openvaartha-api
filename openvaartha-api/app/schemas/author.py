from pydantic import BaseModel
from pydantic.alias_generators import to_camel
from typing import Optional
from datetime import datetime

class AuthorBase(BaseModel):
    name: str
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    twitter: Optional[str] = None

    class Config:
        alias_generator = to_camel
        populate_by_name = True

class AuthorCreate(AuthorBase):
    pass

class AuthorUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    twitter: Optional[str] = None

    class Config:
        alias_generator = to_camel
        populate_by_name = True

class Author(AuthorBase):
    id: str
    created_at: datetime

    class Config:
        alias_generator = to_camel
        populate_by_name = True
        from_attributes = True
