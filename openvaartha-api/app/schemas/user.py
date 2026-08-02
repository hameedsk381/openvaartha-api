from pydantic import BaseModel, EmailStr, model_validator
from pydantic.alias_generators import to_camel
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: Optional[str] = "user"
    contributor_status: Optional[str] = None

    class Config:
        alias_generator = to_camel
        populate_by_name = True


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    current_password: Optional[str] = None
    theme: Optional[str] = None
    font_size: Optional[str] = None
    avatar_url: Optional[str] = None

    class Config:
        alias_generator = to_camel
        populate_by_name = True


class User(UserBase):
    id: str
    is_active: bool
    is_admin: bool
    role: str
    contributor_status: Optional[str] = None
    avatar_url: Optional[str] = None
    auth_provider: str = "local"
    created_at: datetime
    updated_at: Optional[datetime] = None
    theme: Optional[str] = None
    font_size: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def map_mongo_id(cls, data):
        # Raw motor docs store the id under `_id`; fastapi feeds those into
        # this schema when a handler forgets to normalize. Map it so a plain
        # `**doc` / model_validate can never 500 on a missing `id`.
        if isinstance(data, dict) and "_id" in data and "id" not in data:
            data = data.copy()
            data["id"] = str(data["_id"])
        return data

    class Config:
        alias_generator = to_camel
        populate_by_name = True
        from_attributes = True


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class GoogleLoginRequest(BaseModel):
    id_token: str

    class Config:
        alias_generator = to_camel
        populate_by_name = True


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    refresh_token: str

    class Config:
        alias_generator = to_camel
        populate_by_name = True


class TokenData(BaseModel):
    user_id: Optional[str] = None
    email: Optional[str] = None
