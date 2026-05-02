from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from app.database import get_db
from app.schemas.article import Article
from app.services import article_service
from app.models.article import Article as ArticleModel
from app.models.category import Category
from sqlalchemy import or_

router = APIRouter()


@router.get("/", response_model=List[Article])
def search_articles(
    q: str = Query(..., min_length=1, description="Search query"),
    category: Optional[str] = Query(None, description="Filter by category name"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Search articles by title, summary, or content with optional category filter."""
    search_term = f"%{q}%"
    
    query = db.query(ArticleModel).filter(
        or_(
            ArticleModel.title.ilike(search_term),
            ArticleModel.summary.ilike(search_term)
        )
    )
    
    if category:
        category_obj = db.query(Category).filter(
            Category.name.ilike(category.replace("-", " "))
        ).first()
        
        if category_obj:
            query = query.filter(ArticleModel.category_id == category_obj.id)
    
    articles = query.order_by(
        ArticleModel.published_at.desc()
    ).offset(skip).limit(limit).all()
    
    return articles


@router.get("/suggestions")
def search_suggestions(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(5, ge=1, le=10),
    db: Session = Depends(get_db)
):
    """Get search suggestions based on article titles."""
    articles = article_service.search_articles(db, query=q, skip=0, limit=limit)
    suggestions = [article.title for article in articles]
    return {"suggestions": suggestions}
