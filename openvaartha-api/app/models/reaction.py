from pydantic import BaseModel
from beanie import Document, Field
from typing import Optional
from datetime import datetime, timezone
from enum import Enum
from uuid import uuid4


class ReactionType(str, Enum):
    FIRE = "fire"
    APPLAUSE = "applause"
    IDEA = "idea"
    SAD = "sad"
    MINDBLOWN = "mindblown"
    DEAD = "dead"
    SPICY = "spicy"
    SLAY = "slay"
    CAP = "cap"


class Reaction(Document):
    id: str = Field(default_factory=lambda: str(uuid4()))
    article_id: str
    reaction_type: ReactionType
    user_id: Optional[str] = None
    client_ip: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


    class Settings:
        name = "reactions"
