from pydantic import BaseModel
from beanie import Document
from pydantic import EmailStr, Field
from typing import Optional
from datetime import datetime, timezone
from uuid import uuid4


class NewsletterSubscriber(Document):
    id: str = Field(default_factory=lambda: str(uuid4()))
    email: EmailStr
    is_active: bool = True
    subscribed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None


    class Settings:
        name = "newsletter_subscribers"
