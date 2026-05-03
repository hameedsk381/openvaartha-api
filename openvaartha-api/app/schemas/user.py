from pydantic import BaseModel, EmailStr
from pydantic.alias_generators import to_camel
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: Optional[str] = "user"

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

    class Config:
        alias_generator = to_camel
        populate_by_name = True


class User(UserBase):
    id: str
    is_active: bool
    is_admin: bool
    role: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        alias_generator = to_camel
        populate_by_name = True
        from_attributes = True


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[str] = None
    email: Optional[str] = None
