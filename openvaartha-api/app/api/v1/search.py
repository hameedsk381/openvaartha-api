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
    articles = await article_service.search_articles(db, query=q, skip=skip, limit=limit)
    return articles


@router.get("/suggestions")
async def search_suggestions(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(5, ge=1, le=10),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get search suggestions based on article titles."""
    articles = await article_service.search_articles(db, query=q, skip=0, limit=limit)
    suggestions = [article["title"] for article in articles]
    return {"suggestions": suggestions}
