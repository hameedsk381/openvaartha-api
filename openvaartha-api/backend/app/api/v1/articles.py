from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from app.database import get_db
from app.schemas.article import Article, ArticleCreate, ArticleUpdate
from app.services import article_service
from app.core.dependencies import get_current_active_admin
from app.models.user import User as UserModel
from app.models.article import Article as ArticleModel, ArticleContent
from sqlalchemy import or_

router = APIRouter()


@router.get("/", response_model=List[Article])
def list_articles(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    category_id: Optional[UUID] = None,
    db: Session = Depends(get_db)
):
    """Get all articles with pagination and optional category filter."""
    articles = article_service.get_articles(db, skip=skip, limit=limit, category_id=category_id)
    return articles


@router.get("/trending", response_model=List[Article])
def get_trending_articles(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """Get trending articles."""
    articles = article_service.get_trending_articles(db, limit=limit)
    return articles


@router.get("/breaking", response_model=List[Article])
def get_breaking_articles(
    limit: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db)
):
    """Get breaking news articles."""
    articles = article_service.get_breaking_articles(db, limit=limit)
    return articles


@router.get("/explainers", response_model=List[Article])
def get_explainer_articles(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get articles with explainer content (in-depth analysis)."""
    articles = db.query(ArticleModel).join(
        ArticleContent, ArticleModel.id == ArticleContent.article_id
    ).filter(
        or_(
            ArticleContent.explainer.isnot(None),
            ArticleContent.timeline.isnot(None)
        )
    ).order_by(
        ArticleModel.published_at.desc()
    ).offset(skip).limit(limit).all()
    
    return articles


@router.get("/live-updates", response_model=List[dict])
def get_live_updates(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get live timeline updates for developing stories."""
    breaking_articles = db.query(ArticleModel).filter(
        ArticleModel.is_breaking == True
    ).order_by(
        ArticleModel.published_at.desc()
    ).limit(limit).all()
    
    updates = []
    for article in breaking_articles:
        content = db.query(ArticleContent).filter(
            ArticleContent.article_id == article.id
        ).first()
        
        update_type = "major" if article.is_breaking else "standard"
        
        updates.append({
            "id": str(article.id),
            "time": article.published_at.strftime("%H:%M") if article.published_at else "00:00",
            "text": article.summary,
            "type": update_type,
            "title": article.title,
            "slug": article.slug,
            "category": article.category.name if article.category else None,
            "published_at": article.published_at
        })
    
    for article in breaking_articles:
        if article.content and article.content.timeline:
            for timeline_item in article.content.timeline:
                updates.append({
                    "id": f"{article.id}-{timeline_item.get('date', '')}",
                    "time": timeline_item.get('date', ''),
                    "text": timeline_item.get('event', ''),
                    "type": "major",
                    "title": article.title,
                    "slug": article.slug,
                    "category": article.category.name if article.category else None,
                    "published_at": article.published_at
                })
    
    updates.sort(key=lambda x: x.get('time', ''), reverse=True)
    
    return updates[:limit]


@router.get("/editor-picks", response_model=List[Article])
def get_editor_picks(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """Get editor's choice articles (curated picks)."""
    articles = db.query(ArticleModel).filter(
        ArticleModel.is_trending == True
    ).order_by(
        ArticleModel.published_at.desc()
    ).limit(limit).all()
    
    return articles


@router.get("/{slug}", response_model=Article)
def get_article_by_slug(slug: str, db: Session = Depends(get_db)):
    """Get a single article by slug."""
    article = article_service.get_article_by_slug(db, slug=slug)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article


@router.post("/", response_model=Article)
def create_article(
    article_data: ArticleCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_admin)
):
    """Create a new article (admin only)."""
    article = article_service.create_article(db, article_data)
    return article


@router.put("/{article_id}", response_model=Article)
def update_article(
    article_id: UUID,
    article_data: ArticleUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_admin)
):
    """Update an existing article (admin only)."""
    article = article_service.update_article(db, article_id, article_data)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article


@router.delete("/{article_id}")
def delete_article(
    article_id: UUID,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_admin)
):
    """Delete an article (admin only)."""
    success = article_service.delete_article(db, article_id)
    if not success:
        raise HTTPException(status_code=404, detail="Article not found")
    return {"message": "Article deleted successfully"}
