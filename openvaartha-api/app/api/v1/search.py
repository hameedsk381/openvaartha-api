from app.models.category import Category
from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from app.database import get_db
from app.schemas.article import Article
from app.services import article_service

router = APIRouter()


@router.get("/", response_model=List[Article])
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
from app.services.article_service import _public_query


@router.get("/suggestions")
async def search_suggestions(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(6, ge=1, le=10),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get rich search suggestions including titles, tags, and categories."""
    regex = {"$regex": f"{re.escape(q)}", "$options": "i"}

    articles = await Article.get_motor_collection().find(
        _public_query({"title": regex}),
        {"title": 1, "slug": 1}
    ).limit(limit).to_list(length=limit)

    tags = await Article.get_motor_collection().distinct("tags", _public_query({"tags": regex}))
    categories = await Category.get_motor_collection().find({"name": regex}, {"name": 1}).to_list(length=3)

    return {
        "titles": [{"title": a["title"], "slug": a.get("slug", "")} for a in articles],
        "tags": tags[:4],
        "categories": [c["name"] for c in categories],
    }
