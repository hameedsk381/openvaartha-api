from pydantic import BaseModel, Field
from datetime import datetime, timezone


class ReadingList(BaseModel):
    user_id: str
    article_id: str
    saved_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
