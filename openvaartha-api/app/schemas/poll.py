from pydantic import BaseModel
from pydantic.alias_generators import to_camel
from typing import List, Optional
from datetime import datetime

class PollOptionCreate(BaseModel):
    id: str
    text: str

class PollCreate(BaseModel):
    question: str
    options: List[PollOptionCreate]

    class Config:
        alias_generator = to_camel
        populate_by_name = True

class PollOptionResponse(BaseModel):
    id: str
    text: str
    votes: int
    percentage: float = 0.0

class PollResponse(BaseModel):
    id: str
    question: str
    options: List[PollOptionResponse]
    totalVotes: int
    userVotedOptionId: Optional[str] = None
    createdAt: datetime

    class Config:
        alias_generator = to_camel
        populate_by_name = True

class PollVoteCreate(BaseModel):
    optionId: str

    class Config:
        alias_generator = to_camel
        populate_by_name = True
