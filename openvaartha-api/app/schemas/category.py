from pydantic import BaseModel, model_validator
from pydantic.alias_generators import to_camel
from typing import Optional
from datetime import datetime


class CategoryBase(BaseModel):
    name: str
    color_code: str
    emoji: str

    class Config:
        alias_generator = to_camel
        populate_by_name = True


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    color_code: Optional[str] = None
    emoji: Optional[str] = None

    class Config:
        alias_generator = to_camel
        populate_by_name = True


class Category(CategoryBase):
    id: str
    created_at: datetime

    @model_validator(mode="before")
    @classmethod
    def map_mongo_id(cls, data):
        if isinstance(data, dict) and "_id" in data and "id" not in data:
            data = data.copy()
            data["id"] = data["_id"]
        return data

    class Config:
        alias_generator = to_camel
        populate_by_name = True
        from_attributes = True
