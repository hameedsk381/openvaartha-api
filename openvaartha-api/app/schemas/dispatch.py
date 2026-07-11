from pydantic import BaseModel, Field, model_validator
from pydantic.alias_generators import to_camel
from typing import Optional
from datetime import datetime


class DispatchCreate(BaseModel):
    text: str = Field(..., min_length=1, max_length=280)
    article_id: Optional[str] = None

    class Config:
        alias_generator = to_camel
        populate_by_name = True


class Dispatch(BaseModel):
    id: str
    text: str
    article_id: Optional[str] = None
    # Denormalized at read time from the linked article (see dispatch_service);
    # never stored, so a later slug/title change is picked up automatically.
    article_slug: Optional[str] = None
    article_title: Optional[str] = None
    created_at: datetime
    created_by: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def map_mongo_id(cls, data):
        if isinstance(data, dict) and "_id" in data and "id" not in data:
            data = data.copy()
            data["id"] = str(data["_id"])
        return data

    class Config:
        alias_generator = to_camel
        populate_by_name = True
        from_attributes = True
