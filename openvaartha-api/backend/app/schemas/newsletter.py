from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from uuid import UUID


class NewsletterSubscribe(BaseModel):
    email: EmailStr


class NewsletterSubscriber(BaseModel):
    id: UUID
    email: str
    is_active: bool
    subscribed_at: datetime

    class Config:
        from_attributes = True
