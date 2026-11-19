from app.models.category import Category as CategoryModel
from app.models.article import Article as ArticleModel
from fastapi import APIRouter, Depends, Query, Request
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from app.core.rate_limit import AI_SEARCH_LIMIT, limiter
from app.database import get_db
from app.schemas.article import Article as ArticleSchema
from app.schemas.search import AISearchResponse
from app.services import ai_search_service, article_service
from app.services.article_service import _public_query

router = APIRouter()


@router.get("/ai", response_model=AISearchResponse)
@limiter.limit(AI_SEARCH_LIMIT)
async def ai_search(
    request: Request,
    q: str = Query(..., min_length=3, max_length=300, description="A question or keywords"),
    category: Optional[str] = Query(None, description="Filter by category name"),
    limit: int = Query(12, ge=1, le=40),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Answer a question about the archive and return the stories behind it.

    The answer is grounded in retrieved stories and cites them as [n], where
    results[n-1] is the story. When no model key is configured, the query is
    plain keywords, or the model fails, this degrades to ordinary search
    results and `mode` is "results".
    """
    payload = await ai_search_service.search(db, q, category=category, limit=limit)
    return AISearchResponse.model_validate(payload)


@router.get("/", response_model=List[ArticleSchema])
async def search_articles(
    q: str = Query(..., min_length=1, description="Search query"),
    category: Optional[str] = Query(None, description="Filter by category name"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Search articles by title, summary, or content with optional category filter."""
    articles = await article_service.search_articles(db, query=q, skip=skip, limit=limit, category=category)
    return articles


import re

@router.get("/suggestions")
async def search_suggestions(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(6, ge=1, le=10),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get rich search suggestions including titles, tags, and categories."""
    regex = {"$regex": f"{re.escape(q)}", "$options": "i"}

    articles = await ArticleModel.get_motor_collection().find(
        _public_query({"title": regex}),
        {"title": 1, "slug": 1}
    ).limit(limit).to_list(length=limit)

    tags = await ArticleModel.get_motor_collection().distinct("tags", _public_query({"tags": regex}))
    categories = await CategoryModel.get_motor_collection().find({"name": regex}, {"name": 1}).to_list(length=3)

    return {
        "titles": [{"title": a["title"], "slug": a.get("slug", "")} for a in articles],
        "tags": tags[:4],
        "categories": [c["name"] for c in categories],
    }
