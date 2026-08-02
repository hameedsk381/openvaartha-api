from pydantic import BaseModel, Field, model_validator
from pydantic.alias_generators import to_camel
from typing import Optional
from datetime import datetime


class DispatchCreate(BaseModel):
    text: str = Field(..., min_length=1, max_length=280)
    article_id: Optional[str] = None
    # Optional cover image — bytes are built for sharing (WhatsApp/Instagram/
    # X), and a photo makes a far stronger share card than plain text.
    image_url: Optional[str] = None
    # Optional short video (≤3 min, size-capped at upload — see
    # /api/v1/upload/video). A byte can carry either a video or an image,
    # rendered full-screen Reels-style on the Bytes page.
    video_url: Optional[str] = None
    # Manually chosen by the editor — a standalone dispatch (no article_id)
    # has no other source for a category. See dispatch_service.backfill_categories
    # for AI-classifying older dispatches that predate this field.
    category_id: Optional[str] = None

    class Config:
        alias_generator = to_camel
        populate_by_name = True


class DispatchUpdate(BaseModel):
    text: str = Field(..., min_length=1, max_length=280)
    article_id: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    category_id: Optional[str] = None

    class Config:
        alias_generator = to_camel
        populate_by_name = True


class Dispatch(BaseModel):
    id: str
    text: str
    article_id: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    # The dispatch's own explicit category choice (None if it instead
    # inherits one from a linked article — see `category` below). Exposed
    # mainly so the admin edit form can prefill the category picker.
    category_id: Optional[str] = None
    # Denormalized at read time from the linked article (see dispatch_service);
    # never stored, so a later slug/title change is picked up automatically.
    article_slug: Optional[str] = None
    article_title: Optional[str] = None
    # Resolved at read time (see dispatch_service._populate_dispatch_extras)
    # from either the dispatch's own category_id or its linked article's.
    category: Optional[str] = None
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
