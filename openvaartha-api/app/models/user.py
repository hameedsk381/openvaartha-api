from pydantic import BaseModel, EmailStr, Field, model_validator
from typing import Optional
from datetime import datetime, timezone
from uuid import uuid4


class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    email: EmailStr
    # None for OAuth-only accounts (e.g. Google sign-in) that never set a
    # local password — verify_password() treats a missing hash as "no match"
    # rather than erroring, so these accounts simply can't use /login.
    hashed_password: Optional[str] = None
    full_name: str
    avatar_url: Optional[str] = None
    is_active: bool = True
    is_admin: bool = False
    role: str = "user"  # user, editor, admin, contributor
    contributor_status: Optional[str] = None  # None, requested, approved, rejected
    auth_provider: str = "local"  # local, google
    google_sub: Optional[str] = None  # Google's stable per-account subject id
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
