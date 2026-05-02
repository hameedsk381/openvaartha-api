from pydantic import BaseModel, EmailStr, AliasGenerator
from pydantic.alias_generators import to_camel
from typing import Optional
from datetime import datetime


class NewsletterSubscribe(BaseModel):
    email: EmailStr

    class Config:
        alias_generator = to_camel
        populate_by_name = True


class NewsletterSubscriber(BaseModel):
    id: str
    email: str
    is_active: bool
    subscribed_at: datetime

    class Config:
        alias_generator = to_camel
        populate_by_name = True
        from_attributes = True
