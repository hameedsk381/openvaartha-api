from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID


class CategoryBase(BaseModel):
    name: str
    color_code: str
    emoji: str


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    color_code: Optional[str] = None
    emoji: Optional[str] = None


class Category(CategoryBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
