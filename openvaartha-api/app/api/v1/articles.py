from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel
from typing import List, Optional, Union, Dict, Any

from app.database import get_db
from app.schemas.article import Article, ArticleCreate, ArticleUpdate, ContributionCreate
from app.services import article_service
from app.services.reaction_service import get_reaction_counts, toggle_reaction
from app.services.article_service import _public_query
from app.core.dependencies import get_current_active_admin, get_current_editor, get_current_user, get_current_user_optional
from app.core.rate_limit import limiter, MUTATION_LIMIT
from app.models.user import User as UserModel
from app.models.article import Article as ArticleModel

router = APIRouter()


def _caller_can_see_unpublished(current_user: Optional[UserModel]) -> bool:
    return bool(current_user and (current_user.is_admin or current_user.role == "editor"))


@router.get("/")
async def list_articles(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    category_id: Optional[str] = None,
    status: Optional[str] = None,
    tag: Optional[str] = Query(None, description="Filter by tag"),
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
        tag=tag,
    )

    if not include_total:
        return items

    query: dict = {} if include_unpublished else _public_query()
    if category_id:
        query["category_id"] = category_id
    if status:
        query["status"] = status
    if tag:
        query["tags"] = tag.lower()
    if search:
        query["$text"] = {"$search": search}
    total = await ArticleModel.get_motor_collection().count_documents(query)
    return {"items": items, "total": total}


@router.get("/tags/popular")
async def get_popular_tags(
    limit: int = Query(20, ge=1, le=50),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Get popular article tags."""
    return await article_service.get_popular_tags(db, limit=limit)


@router.get("/for-you", response_model=List[Article])
async def get_for_you_articles(
    limit: int = Query(15, ge=1, le=50),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Optional[UserModel] = Depends(get_current_user_optional),
):
    """Get personalized 'For You' articles feed based on user reading history."""
    user_id = current_user.id if current_user else None
    return await article_service.get_for_you_articles(db, user_id=user_id, limit=limit)


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
    result = await ArticleModel.get_motor_collection().update_one(
        {"slug": id_or_slug, "status": "published"}, 
        {"$inc": {"share_count": 1}}
    )
    if result.modified_count == 0:
        # Fallback to ID
        result = await ArticleModel.get_motor_collection().update_one(
            {"_id": id_or_slug, "status": "published"}, 
            {"$inc": {"share_count": 1}}
        )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Article not found or not published")
        
    return {"status": "success", "message": "Share count incremented"}


class ReactionCreate(BaseModel):
    reaction_type: str


@router.get("/{article_id}/reactions")
async def get_article_reactions(
    article_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Optional[UserModel] = Depends(get_current_user_optional),
) -> Dict[str, Any]:
    """Get count per reaction type for an article, and which reactions the user selected."""
    user_id = current_user.id if current_user else None
    return await get_reaction_counts(db, article_id, user_id=user_id)


@router.post("/{article_id}/reactions")
@limiter.limit("30/minute")
async def toggle_article_reaction(
    request: Request,
    article_id: str,
    reaction: ReactionCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Optional[UserModel] = Depends(get_current_user_optional),
) -> Dict[str, Any]:
    """Add or remove a reaction for an article."""
    # We allow anonymous reactions if user_id is None, though typically you'd 
    # want to track by IP or something else if current_user is None. 
    # Our reaction_service handles user_id, it can be IP or None if designed that way.
    # Actually, reaction_service uses request.client.host if user_id is None.
    # Let's pass request to get IP.
    
    # Wait, the reaction_service signature: toggle_reaction(db, article_id, reaction_type, user_id, ip_address)
    # Let's check reaction_service.py to be sure. It takes user_id and ip_address.
    user_id = current_user.id if current_user else None
    ip_address = request.client.host if request.client else "0.0.0.0"
    
    try:
        return await toggle_reaction(db, article_id, reaction.reaction_type, user_id=user_id, client_ip=ip_address)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{id_or_slug}/tts")
async def get_article_tts(
    id_or_slug: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Generate and stream TTS audio for an article using Groq."""
    article = await article_service.get_article_by_slug(db, slug=id_or_slug, include_unpublished=True)
    if not article:
        article = await article_service.get_article_by_id(db, article_id=id_or_slug, include_unpublished=True)
    
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
        
    text_content = article.get("title", "") + ".\n"
    if article.get("summary"):
        text_content += article.get("summary") + ".\n"
        
    body = article.get("content", {}).get("body", "")
    if body:
        # Very basic markdown strip for TTS (could be improved)
        clean_body = body.replace("#", "").replace("*", "").replace(">", "")
        text_content += clean_body
        
    if not text_content.strip():
        raise HTTPException(status_code=400, detail="Article has no content")
        
    from app.services.groq_tts_service import GroqTTSService
    tts_service = GroqTTSService()
    
    response = await tts_service.generate_speech(text_content)
    
    return StreamingResponse(
        response.aiter_bytes(),
        media_type="audio/mpeg"
    )




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


@router.post("/{article_id}/fact-check")
@limiter.limit(MUTATION_LIMIT)
async def generate_fact_check(
    request: Request,
    article_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: UserModel = Depends(get_current_editor),
):
    """Generate and save a Gemini fact check for an article."""
    existing = await article_service.get_article_by_id(db, article_id, include_unpublished=True)
    if not existing:
        raise HTTPException(status_code=404, detail="Article not found")

    body = existing.get("content", {}).get("body", "")
    if not body:
        raise HTTPException(status_code=400, detail="Article has no body content to analyze")

    from app.services.gemini_service import analyze_article_facts
    fact_check_data = await analyze_article_facts(body)

    if not fact_check_data:
        raise HTTPException(status_code=500, detail="Failed to generate fact check with Gemini")

    # Update article content
    content = existing.get("content", {})
    content["fact_check"] = fact_check_data
    
    await ArticleModel.get_motor_collection().update_one(
        {"_id": article_id},
        {"$set": {"content": content}}
    )

    return {"message": "Fact check generated successfully", "fact_check": fact_check_data}

@router.get("/{article_id}/explain")
async def explain_article(
    article_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Returns a Gen-Z friendly 'Explain it like I'm 5' summary of the article.
    """
    article = await article_service.get_article_by_id(db, article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
        
    text_to_explain = f"Title: {article.get('title', '')}\n\n{article.get('content', {}).get('body', '')}"
    
    from app.services.gemini_service import explain_article_eli5
    result = await explain_article_eli5(text_to_explain)
    
    if not result:
        raise HTTPException(status_code=500, detail="Explanation generation failed")
        
    return {"explanation": result}


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
