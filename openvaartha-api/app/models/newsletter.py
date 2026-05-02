from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from uuid import uuid4


class NewsletterSubscriber(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    email: EmailStr
    is_active: bool = True
    subscribed_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
