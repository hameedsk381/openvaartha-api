from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class PollOption(BaseModel):
    id: str
    text: str
    votes: int = 0

class Poll(BaseModel):
    id: str = Field(alias="_id")
    question: str
    options: List[PollOption]
    total_votes: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class PollVote(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    poll_id: str
    user_id: str
    option_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
