from pydantic import BaseModel, EmailStr, Field, model_validator
from typing import Optional
from datetime import datetime, timezone
from uuid import uuid4


class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    email: EmailStr
    hashed_password: str
    full_name: str
    avatar_url: Optional[str] = None
    is_active: bool = True
    is_admin: bool = False
    role: str = "user"  # user, editor, admin
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None
    theme: Optional[str] = None
    font_size: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def map_mongo_id(cls, data):
        if isinstance(data, dict) and "_id" in data and "id" not in data:
            data = data.copy()
            data["id"] = data["_id"]
        return data
