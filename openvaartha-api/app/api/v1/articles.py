from fastapi import APIRouter, Depends, HTTPException, Query, Request
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional, Union

from app.database import get_db
from app.schemas.article import Article, ArticleCreate, ArticleUpdate, ContributionCreate
from app.services import article_service
from app.services.article_service import _public_query
from app.core.dependencies import get_current_active_admin, get_current_editor, get_current_user, get_current_user_optional
from app.core.rate_limit import limiter, MUTATION_LIMIT
from app.models.user import User as UserModel

router = APIRouter()


def _caller_can_see_unpublished(current_user: Optional[UserModel]) -> bool:
    return bool(current_user and (current_user.is_admin or current_user.role == "editor"))


@router.get("/")
async def list_articles(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    category_id: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = Query(None, description="Full-text search across title and summary"),
    include_unpublished: bool = Query(False, description="Admin-only: include drafts/archived."),
    include_total: bool = Query(False, description="Return {items, total} instead of plain array"),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Optional[UserModel] = Depends(get_current_user_optional),
) -> Union[List[Article], dict]:
    """List articles. Drafts/archived are visible only to authenticated admins."""
    if include_unpublished and not _caller_can_see_unpublished(current_user):
        raise HTTPException(status_code=403, detail="Admin required to see unpublished articles")

    items = await article_service.get_articles(
        db,
        skip=skip,
        limit=limit,
        category_id=category_id,
        status=status,
        search=search,
        include_unpublished=include_unpublished,
    )

    if not include_total:
        return items

    query: dict = {} if include_unpublished else _public_query()
    if category_id:
        query["category_id"] = category_id
    if status:
        query["status"] = status
    if search:
        query["$text"] = {"$search": search}
    total = await db["articles"].count_documents(query)
    return {"items": items, "total": total}


@router.get("/trending", response_model=List[Article])
async def get_trending_articles(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Get trending articles."""
    return await article_service.get_trending_articles(db, limit=limit)


@router.get("/breaking", response_model=List[Article])
async def get_breaking_articles(
    limit: int = Query(5, ge=1, le=20),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Get breaking news articles."""
    return await article_service.get_breaking_articles(db, limit=limit)


@router.get("/{article_id}/related", response_model=List[Article])
async def get_related(
    article_id: str,
    limit: int = Query(5, ge=1, le=20),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Get related articles (same category, fallback to recent)."""
    return await article_service.get_related_articles(db, article_id, limit=limit)


@router.get("/explainers", response_model=List[Article])
async def get_explainer_articles(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Get articles with explainer content (in-depth analysis)."""
    return await article_service.get_explainer_articles(db, skip=skip, limit=limit)


@router.get("/live-updates")
async def get_live_updates(
    limit: int = Query(20, ge=1, le=100),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Get live timeline updates for developing stories (published only)."""
    breaking_cursor = db["articles"].find({
        "is_breaking": True,
        "$or": [{"status": "published"}, {"status": {"$exists": False}}],
    }).sort("published_at", -1).limit(limit)
    breaking_articles = await breaking_cursor.to_list(length=None)

    # Batch query article_content timeline data (only load timeline and article_id to avoid large bodies)
    breaking_ids = [a["_id"] for a in breaking_articles]
    contents = []
    if breaking_ids:
        contents = await db["article_content"].find(
            {"article_id": {"$in": breaking_ids}},
            {"timeline": 1, "article_id": 1}
        ).to_list(length=len(breaking_ids))
    content_map = {c["article_id"]: c for c in contents}

    updates = []
    for article in breaking_articles:
        updates.append({
            "id": str(article["_id"]),
            "time": article["published_at"].strftime("%H:%M") if article.get("published_at") else "00:00",
            "text": article["summary"],
            "type": "major",
            "title": article["title"],
            "slug": article["slug"],
            "published_at": article.get("published_at"),
        })

        content = content_map.get(article["_id"])
        if content and content.get("timeline"):
            for timeline_item in content["timeline"]:
                updates.append({
                    "id": f"{article['_id']}-{timeline_item.get('date', '')}",
                    "time": timeline_item.get("date", ""),
                    "text": timeline_item.get("event", ""),
                    "type": "major",
                    "title": article["title"],
                    "slug": article["slug"],
                    "published_at": article.get("published_at"),
                })

    updates.sort(key=lambda x: str(x.get("published_at", "")), reverse=True)
    return updates[:limit]


@router.get("/editor-picks", response_model=List[Article])
async def get_editor_picks(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Get editor's choice articles (published only)."""
    return await article_service.get_editor_pick_articles(db, limit=limit)


@router.get("/mine", response_model=List[Article])
async def list_my_contributions(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """List current user's contributions (requires login)."""
    return await article_service.get_articles(
        db,
        skip=skip,
        limit=limit,
        include_unpublished=True,
        author_id=current_user.id,
    )


@router.post("/contributions", response_model=Article)
@limiter.limit(MUTATION_LIMIT)
async def create_contributor_post(
    request: Request,
    contribution: ContributionCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """Submit a contributed opinion post."""
    if current_user.role not in ("contributor", "editor", "admin"):
        raise HTTPException(status_code=403, detail="Contributor permissions required")
        
    from app.schemas.article import ArticleCreate
    from app.models.article import ArticleStatus
    from datetime import datetime, timezone
    
    article_data = ArticleCreate(
        title=contribution.title,
        summary=contribution.summary,
        category_id=contribution.category_id,
        read_time=contribution.read_time,
        language=contribution.language,
        status=ArticleStatus.PENDING,
        is_trending=False,
        is_breaking=False,
        is_editor_pick=False,
        is_opinion=True,
        thumbnail_url=contribution.thumbnail_url,
        published_at=datetime.now(timezone.utc),
        author=current_user.full_name,
        content=contribution.content,
    )
    
    return await article_service.create_article(db, article_data, author_id=current_user.id)


@router.put("/contributions/{article_id}", response_model=Article)
@limiter.limit(MUTATION_LIMIT)
async def update_contributor_post(
    request: Request,
    article_id: str,
    contribution: ContributionCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """Update a contributed post before it gets published."""
    existing = await article_service.get_article_by_id(db, article_id, include_unpublished=True)
    if not existing:
        raise HTTPException(status_code=404, detail="Article not found")
        
    if existing.get("author_id") != current_user.id:
        raise HTTPException(status_code=403, detail="You do not own this contribution")
        
    if existing.get("status") not in ("pending", "draft"):
        raise HTTPException(status_code=400, detail="Cannot edit an article that is already published or archived")
        
    from app.schemas.article import ArticleUpdate, ArticleContentUpdate
    article_update = ArticleUpdate(
        title=contribution.title,
        summary=contribution.summary,
        category_id=contribution.category_id,
        read_time=contribution.read_time,
        language=contribution.language,
        content=ArticleContentUpdate(
            tldr=contribution.content.tldr,
            points=contribution.content.points,
            body=contribution.content.body,
            timeline=contribution.content.timeline,
            explainer=contribution.content.explainer,
        )
    )
    
    return await article_service.update_article(db, article_id, article_update)


@router.delete("/contributions/{article_id}")
@limiter.limit(MUTATION_LIMIT)
async def delete_contributor_post(
    request: Request,
    article_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """Withdraw a contributed post."""
    existing = await article_service.get_article_by_id(db, article_id, include_unpublished=True)
    if not existing:
        raise HTTPException(status_code=404, detail="Article not found")
        
    if existing.get("author_id") != current_user.id:
        raise HTTPException(status_code=403, detail="You do not own this contribution")
        
    if existing.get("status") not in ("pending", "draft"):
        raise HTTPException(status_code=400, detail="Cannot delete an article that is already published or archived")
        
    await article_service.delete_article(db, article_id)
    return {"message": "Contribution withdrawn successfully"}


@router.get("/{id_or_slug}", response_model=Article)
async def get_article(
    id_or_slug: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Optional[UserModel] = Depends(get_current_user_optional),
):
    """Get a single article by ID or slug. Drafts and archived posts are only
    visible to authenticated admins."""
    include_unpublished = _caller_can_see_unpublished(current_user)

    article = await article_service.get_article_by_slug(
        db, slug=id_or_slug, include_unpublished=include_unpublished
    )
    if not article:
        article = await article_service.get_article_by_id(
            db, article_id=id_or_slug, include_unpublished=include_unpublished
        )

    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article


@router.post("/{id_or_slug}/share")
async def track_share(
    id_or_slug: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Increment the share count for an article."""
    # Try updating by slug first
    result = await db["articles"].update_one(
        {"slug": id_or_slug, "status": "published"}, 
        {"$inc": {"share_count": 1}}
    )
    if result.modified_count == 0:
        # Fallback to ID
        result = await db["articles"].update_one(
            {"_id": id_or_slug, "status": "published"}, 
            {"$inc": {"share_count": 1}}
        )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Article not found or not published")
        
    return {"status": "success", "message": "Share count incremented"}



@router.post("/", response_model=Article)
@limiter.limit(MUTATION_LIMIT)
async def create_article(
    request: Request,
    article_data: ArticleCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: UserModel = Depends(get_current_editor),
):
    """Create a new article (admin only). Defaults to draft if status omitted."""
    return await article_service.create_article(db, article_data)


@router.put("/{article_id}", response_model=Article)
@limiter.limit(MUTATION_LIMIT)
async def update_article(
    request: Request,
    article_id: str,
    article_data: ArticleUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: UserModel = Depends(get_current_editor),
):
    """Update an existing article (admin only)."""
    # Look up without status filter so admins can edit drafts.
    existing = await article_service.get_article_by_id(db, article_id, include_unpublished=True)
    if not existing:
        raise HTTPException(status_code=404, detail="Article not found")
    return await article_service.update_article(db, article_id, article_data)


@router.delete("/{article_id}")
@limiter.limit(MUTATION_LIMIT)
async def delete_article(
    request: Request,
    article_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: UserModel = Depends(get_current_editor),
):
    """Delete an article (admin only)."""
    success = await article_service.delete_article(db, article_id)
    if not success:
        raise HTTPException(status_code=404, detail="Article not found")
    return {"message": "Article deleted successfully"}
