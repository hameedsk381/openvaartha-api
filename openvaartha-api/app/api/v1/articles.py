from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from app.database import get_db
from app.schemas.article import Article, ArticleCreate, ArticleUpdate
from app.services import article_service
from app.core.dependencies import get_current_active_admin
from app.models.user import User as UserModel

router = APIRouter()


@router.get("/", response_model=List[Article])
async def list_articles(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    category_id: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all articles with pagination and optional category filter."""
    return await article_service.get_articles(db, skip=skip, limit=limit, category_id=category_id)


@router.get("/trending", response_model=List[Article])
async def get_trending_articles(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get trending articles."""
    return await article_service.get_trending_articles(db, limit=limit)


@router.get("/breaking", response_model=List[Article])
async def get_breaking_articles(
    limit: int = Query(5, ge=1, le=20),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get breaking news articles."""
    return await article_service.get_breaking_articles(db, limit=limit)


@router.get("/explainers", response_model=List[Article])
async def get_explainer_articles(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get articles with explainer content (in-depth analysis)."""
    articles_with_content = await db["article_content"].find({
        "$or": [
            {"explainer": {"$ne": None, "$not": {"$size": 0}}},
            {"timeline": {"$ne": None, "$not": {"$size": 0}}}
        ]
    }).to_list(length=None)
    
    article_ids = [ac["article_id"] for ac in articles_with_content]
    
    cursor = db["articles"].find({"_id": {"$in": article_ids}}).sort("published_at", -1).skip(skip).limit(limit)
    articles = await cursor.to_list(length=limit)
    
    return [await article_service._populate_article_extras(db, a) for a in articles]


@router.get("/live-updates")
async def get_live_updates(
    limit: int = Query(20, ge=1, le=100),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get live timeline updates for developing stories."""
    breaking_articles = await db["articles"].find({"is_breaking": True}).sort("published_at", -1).limit(limit).to_list(length=None)
    
    updates = []
    for article in breaking_articles:
        update_type = "major"
        
        updates.append({
            "id": str(article["_id"]),
            "time": article["published_at"].strftime("%H:%M") if article.get("published_at") else "00:00",
            "text": article["summary"],
            "type": update_type,
            "title": article["title"],
            "slug": article["slug"],
            "published_at": article.get("published_at")
        })
        
        content = await db["article_content"].find_one({"article_id": article["_id"]})
        if content and content.get("timeline"):
            for timeline_item in content["timeline"]:
                updates.append({
                    "id": f"{article['_id']}-{timeline_item.get('date', '')}",
                    "time": timeline_item.get('date', ''),
                    "text": timeline_item.get('event', ''),
                    "type": "major",
                    "title": article["title"],
                    "slug": article["slug"],
                    "published_at": article.get("published_at")
                })
    
    updates.sort(key=lambda x: str(x.get('published_at', '')), reverse=True)
    
    return updates[:limit]


@router.get("/editor-picks", response_model=List[Article])
async def get_editor_picks(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get editor's choice articles (curated picks)."""
    articles = await db["articles"].find({"is_trending": True}).sort("published_at", -1).limit(limit).to_list(length=None)
    return [await article_service._populate_article_extras(db, a) for a in articles]


@router.get("/{id_or_slug}", response_model=Article)
async def get_article(id_or_slug: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Get a single article by ID or slug."""
    # Try slug first
    article = await article_service.get_article_by_slug(db, slug=id_or_slug)
    if not article:
        # Try ID
        article = await article_service.get_article_by_id(db, article_id=id_or_slug)
        
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article


@router.post("/", response_model=Article)
async def create_article(
    article_data: ArticleCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_admin)
):
    """Create a new article (admin only)."""
    return await article_service.create_article(db, article_data)


@router.put("/{article_id}", response_model=Article)
async def update_article(
    article_id: str,
    article_data: ArticleUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_admin)
):
    """Update an existing article (admin only)."""
    article = await article_service.update_article(db, article_id, article_data)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article


@router.delete("/{article_id}")
async def delete_article(
    article_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_admin)
):
    """Delete an article (admin only)."""
    success = await article_service.delete_article(db, article_id)
    if not success:
        raise HTTPException(status_code=404, detail="Article not found")
    return {"message": "Article deleted successfully"}
