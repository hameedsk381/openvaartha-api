from typing import List, Literal, Optional

from pydantic import BaseModel, Field

from app.schemas.article import Article


class AISearchResponse(BaseModel):
    """Answer-plus-sources payload for the AI search endpoint.

    ``results`` is ordered so the stories cited in ``answer`` come first:
    citation ``[1]`` always points at ``results[0]``.
    """

    query: str
    mode: Literal["answer", "results"]
    answer: Optional[str] = None
    keywords: List[str] = Field(default_factory=list)
    sources: List[int] = Field(default_factory=list)
    results: List[Article] = Field(default_factory=list)
