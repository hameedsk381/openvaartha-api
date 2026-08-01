from pydantic import BaseModel
from beanie import Document, Field
from datetime import datetime, timezone


class ReadingList(Document):
    user_id: str
    article_id: str
    saved_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


    class Settings:
        name = "reading_lists"
