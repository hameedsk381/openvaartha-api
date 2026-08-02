from app.models.user import User
from app.models.article import Article
from app.models.category import Category
from app.models.comment import Comment
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Literal
from pydantic import BaseModel

from app.core.dependencies import get_current_active_admin
from app.core.rate_limit import limiter
from app.database import get_db
from app.models.user import User as UserModel
from app.schemas.article import Article as ArticleSchema
from app.schemas.user import User as UserSchema
from app.schemas.comment import Comment as CommentSchema
from app.schemas.source import SourceCreate, SourceUpdate, Source as SourceSchema
from app.services import article_service, user_service
from app.services.ai_service import generate_article
from app.services.source_service import create_source, update_source, delete_source, get_source, list_sources
from app.services.rss_service import process_source

router = APIRouter(dependencies=[Depends(get_current_active_admin)])


@router.get("/stats/dashboard")
async def dashboard_stats(
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Get dashboard statistics (admin only)."""
    total_articles = await Article.get_motor_collection().count_documents({})
    published = await Article.get_motor_collection().count_documents({"status": "published"})
    drafts = await Article.get_motor_collection().count_documents({"status": "draft"})
    archived = await Article.get_motor_collection().count_documents({"status": "archived"})
    total_users = await User.get_motor_collection().count_documents({})
    total_comments = await Comment.get_motor_collection().count_documents({"is_active": True})
    total_subscribers = await db["newsletter_subscribers"].count_documents({"is_active": True})
    breaking = await Article.get_motor_collection().count_documents({"is_breaking": True, "status": "published"})
    trending = await Article.get_motor_collection().count_documents({"is_trending": True, "status": "published"})

    # Sparkline: last 7 days published counts
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    sparkline_data = []
    for i in range(6, -1, -1):
        day_start = today - timedelta(days=i)
        day_end = day_start + timedelta(days=1)
        count = await Article.get_motor_collection().count_documents({
            "status": "published",
            "published_at": {"$gte": day_start, "$lt": day_end}
        })
        sparkline_data.append(count)

    cursor = Article.get_motor_collection().find().sort("published_at", -1).limit(5)
    recent_docs = await cursor.to_list(length=5)
    recent_articles = []
    for doc in recent_docs:
        doc["id"] = str(doc["_id"])
        category = await Category.get_motor_collection().find_one({"_id": doc.get("category_id", "")})
        doc["category"] = category["name"] if category else "General"
        recent_articles.append(doc)

    # Fetch top articles by view count
    top_cursor = Article.get_motor_collection().find({"status": "published"}).sort("view_count", -1).limit(5)
    top_docs = await top_cursor.to_list(length=5)
    top_articles = []
    for doc in top_docs:
        doc["id"] = str(doc["_id"])
        category = await Category.get_motor_collection().find_one({"_id": doc.get("category_id", "")})
        doc["category"] = category["name"] if category else "General"
        top_articles.append(doc)
        
    # Calculate total views
    pipeline = [{"$group": {"_id": None, "total_views": {"$sum": "$view_count"}}}]
    views_result = await Article.get_motor_collection().aggregate(pipeline).to_list(length=1)
    total_views = views_result[0].get("total_views", 0) if views_result else 0

    # Reaction analytics breakdown
    reaction_pipeline = [
        {"$group": {"_id": "$reaction_type", "count": {"$sum": 1}}}
    ]
    reactions_docs = await db["article_reactions"].aggregate(reaction_pipeline).to_list(length=10)
    reaction_stats = {r["_id"]: r["count"] for r in reactions_docs}

    return {
        "articles": {
            "total": total_articles,
            "published": published,
            "drafts": drafts,
            "archived": archived,
            "breaking": breaking,
            "trending": trending,
        },
        "users": {"total": total_users},
        "comments": {"total": total_comments},
        "subscribers": {"total": total_subscribers},
        "views": {"total": total_views},
        "reactions": reaction_stats,
        "recent_articles": recent_articles,
        "top_articles": top_articles,
        "sparkline": sparkline_data,
    }


@router.get("/users")
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    include_total: bool = Query(False, description="Return {items, total} instead of plain array"),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """List all users (admin only)."""
    query: dict = {}
    if search:
        query["$or"] = [
            {"email": {"$regex": search, "$options": "i"}},
            {"full_name": {"$regex": search, "$options": "i"}},
        ]
    if role:
        if role == "admin":
            query["is_admin"] = True
        elif role == "user":
            query["is_admin"] = {"$ne": True}
        else:
            query["role"] = role

    total = 0
    if include_total:
        total = await User.get_motor_collection().count_documents(query)
    cursor = User.get_motor_collection().find(query).sort("created_at", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(length=limit)
    result = []
    for d in docs:
        if "_id" in d and "id" not in d:
            d["id"] = str(d["_id"])
        result.append(UserSchema(**d))
    if include_total:
        return {"items": result, "total": total}
    return result


class AdminUserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    is_admin: Optional[bool] = None
    is_active: Optional[bool] = None
    role: Optional[str] = None


@router.put("/users/{user_id}", response_model=UserSchema)
async def update_user(
    user_id: str,
    body: AdminUserUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Update any user (admin only). Allows promoting to admin, deactivating, etc."""
    update_data = body.model_dump(exclude_unset=True, exclude_none=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")
        
    if "role" in update_data:
        update_data["is_admin"] = update_data["role"] == "admin"
    elif "is_admin" in update_data:
        update_data["role"] = "admin" if update_data["is_admin"] else "user"

    updated_doc = await user_service.update_user(db, user_id, update_data)
    if not updated_doc:
        raise HTTPException(status_code=404, detail="User not found")
    if "_id" in updated_doc and "id" not in updated_doc:
        updated_doc["id"] = str(updated_doc["_id"])
    return UserSchema(**updated_doc)


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Delete a user (admin only)."""
    result = await User.get_motor_collection().delete_one({"_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted"}


@router.get("/comments")
async def list_all_comments(
    article_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    include_total: bool = Query(False, description="Return {items, total} instead of plain array"),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """List all comments across articles (admin only)."""
    query = {}
    if article_id:
        query["article_id"] = article_id
    total = 0
    if include_total:
        total = await Comment.get_motor_collection().count_documents(query)
    cursor = Comment.get_motor_collection().find(query).sort("created_at", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(length=limit)
    result = []
    for d in docs:
        if "_id" in d and "id" not in d:
            d["id"] = str(d["_id"])
        # Fetch article info
        article = await Article.get_motor_collection().find_one({"_id": d.get("article_id", "")})
        if article:
            d["article_title"] = article.get("title", "Unknown Article")
            d["article_slug"] = article.get("slug", "")
        else:
            d["article_title"] = "Unknown Article"
            d["article_slug"] = ""
        result.append(d)
    if include_total:
        return {"items": result, "total": total}
    return result


class BulkModerateComments(BaseModel):
    comment_ids: List[str]
    action: str  # "approve" | "delete"


@router.post("/comments/bulk-moderate")
async def bulk_moderate_comments(
    body: BulkModerateComments,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Approve or delete multiple comments in bulk (admin only)."""
    if body.action == "approve":
        await Comment.get_motor_collection().update_many(
            {"_id": {"$in": body.comment_ids}},
            {"$set": {"is_active": True, "updated_at": datetime.now(timezone.utc)}}
        )
    elif body.action == "delete":
        await Comment.get_motor_collection().update_many(
            {"_id": {"$in": body.comment_ids}},
            {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}}
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
    return {"message": f"Successfully performed {body.action} on {len(body.comment_ids)} comments"}


@router.put("/comments/{comment_id}/approve")
async def approve_comment(
    comment_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Approve/re-activate a comment (admin only)."""
    res = await Comment.get_motor_collection().update_one(
        {"_id": comment_id},
        {"$set": {"is_active": True, "updated_at": datetime.now(timezone.utc)}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Comment not found")
    return {"message": "Comment approved"}


@router.get("/newsletter/subscribers")
async def list_subscribers(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    include_total: bool = Query(False, description="Return {items, total} instead of plain array"),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """List newsletter subscribers (admin only)."""
    query = {"is_active": True}
    total = 0
    if include_total:
        total = await db["newsletter_subscribers"].count_documents(query)
    cursor = db["newsletter_subscribers"].find(query).sort("subscribed_at", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(length=limit)
    items = [
        {
            "id": str(d.get("_id", d.get("id", ""))),
            "email": d["email"],
            "subscribedAt": d.get("subscribed_at"),
            "isActive": d.get("is_active", True),
        }
        for d in docs
    ]
    if include_total:
        return {"items": items, "total": total}
    return items

class GenerateArticleRequest(BaseModel):
    topic: str
    source_content: Optional[str] = None
    style: Literal["standard", "investigative", "briefing", "opinion"] = "standard"
    tone: Literal["neutral", "analytical", "narrative"] = "neutral"
    length: Literal["short", "standard", "long"] = "standard"


class GenerateArticleResponse(BaseModel):
    title: str
    summary: str
    body: str
    tldr: str
    points: List[str]
    category_id: str = ""
    timeline: List[dict] = []
    explainer: List[dict] = []
    tags: List[str] = []
    read_time: str = ""


@router.post("/ai/generate-article", response_model=GenerateArticleResponse)
@limiter.limit("20/hour")
async def ai_generate_article(request: Request, body: GenerateArticleRequest):
    """Generate a complete article draft from a topic prompt using Groq."""
    result = await generate_article(
        topic=body.topic,
        source_content=body.source_content,
        style=body.style,
        tone=body.tone,
        length=body.length
    )
    if not result:
        raise HTTPException(
            status_code=503,
            detail="AI generation failed. Check the GROQ_API_KEY environment variable.",
        )
    
    return GenerateArticleResponse(**result)
class AIAssistRequest(BaseModel):
    action: Literal["headlines", "improve", "shorten", "points"]
    text: str
    context: Optional[str] = None


@router.post("/ai/assist")
@limiter.limit("30/hour")
async def ai_assist(request: Request, body: AIAssistRequest):
    """AI assistant for headlines, polishing copy, condensing text, and extracting points."""
    from app.services.ai_service import ai_assist_editor
    result = await ai_assist_editor(action=body.action, text=body.text, context=body.context)
    if not result:
        raise HTTPException(
            status_code=503,
            detail="AI assistant service unavailable or failed.",
        )
    return result


# ── RSS Sources ──────────────────────────────────────────────────────────────


@router.get("/sources", response_model=List[SourceSchema])
async def list_admin_sources(
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """List all RSS sources (admin only)."""
    return await list_sources(db)


@router.post("/sources", response_model=SourceSchema, status_code=201)
async def create_admin_source(
    body: SourceCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Create a new RSS source (admin only)."""
    return await create_source(db, body)


@router.get("/sources/{source_id}", response_model=SourceSchema)
async def get_admin_source(
    source_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Get a single RSS source (admin only)."""
    source = await get_source(db, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    return source


@router.put("/sources/{source_id}", response_model=SourceSchema)
async def update_admin_source(
    source_id: str,
    body: SourceUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Update an RSS source (admin only)."""
    source = await update_source(db, source_id, body)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    return source


@router.delete("/sources/{source_id}")
async def delete_admin_source(
    source_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Delete an RSS source (admin only)."""
    deleted = await delete_source(db, source_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Source not found")
    return {"message": "Source deleted"}


class ProcessResult(BaseModel):
    processed: int


@router.post("/sources/process", response_model=ProcessResult)
async def process_all_sources(
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Manually trigger RSS feed fetching + article generation for all active sources."""
    import logging

    logger = logging.getLogger(__name__)
    sources = await list_sources(db, active_only=True)
    total = 0
    for source in sources:
        try:
            n = await process_source(db, source)
            total += n
        except Exception as e:
            logger.error("Failed to process source %s: %s", source.get("name"), e)
    return {"processed": total}


@router.post("/sources/{source_id}/process", response_model=ProcessResult)
async def process_single_source(
    source_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Manually trigger RSS feed fetching + article generation for a single source (admin only)."""
    source = await get_source(db, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    try:
        n = await process_source(db, source)
        return {"processed": n}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process source: {str(e)}")


@router.get("/contributor-requests", response_model=List[UserSchema])
async def list_contributor_requests(
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """List all contributor requests (admin only)."""
    cursor = User.get_motor_collection().find({"contributor_status": "requested"})
    users = await cursor.to_list(length=100)
    return [UserModel(**u) for u in users]


class ContributorReviewRequest(BaseModel):
    action: str  # approve, reject


@router.post("/contributor-requests/{user_id}/review", response_model=UserSchema)
async def review_contributor_request(
    user_id: str,
    review: ContributorReviewRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Approve or reject a contributor request (admin only)."""
    user_doc = await User.get_motor_collection().find_one({"_id": user_id})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
        
    user = UserModel(**user_doc)
    if user.contributor_status != "requested":
        raise HTTPException(status_code=400, detail="User has no pending request")
        
    update_data = {}
    if review.action == "approve":
        update_data["role"] = "contributor"
        update_data["contributor_status"] = "approved"
    elif review.action == "reject":
        update_data["contributor_status"] = "rejected"
    else:
        raise HTTPException(status_code=400, detail="Invalid action: choose 'approve' or 'reject'")
        
    updated_user_doc = await user_service.update_user(db, user_id, update_data)
    return UserModel(**updated_user_doc)
