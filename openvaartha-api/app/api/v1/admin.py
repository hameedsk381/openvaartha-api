from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

from app.core.dependencies import get_current_active_admin
from app.database import get_db
from app.models.user import User as UserModel
from app.schemas.article import Article as ArticleSchema
from app.schemas.user import User as UserSchema
from app.schemas.comment import Comment as CommentSchema
from app.services import article_service, user_service
from app.services.ai_service import generate_article

router = APIRouter(dependencies=[Depends(get_current_active_admin)])


@router.get("/stats/dashboard")
async def dashboard_stats(
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Get dashboard statistics (admin only)."""
    total_articles = await db["articles"].count_documents({})
    published = await db["articles"].count_documents({"status": "published"})
    drafts = await db["articles"].count_documents({"status": "draft"})
    archived = await db["articles"].count_documents({"status": "archived"})
    total_users = await db["users"].count_documents({})
    total_comments = await db["comments"].count_documents({"is_active": True})
    total_subscribers = await db["newsletter_subscribers"].count_documents({"is_active": True})
    breaking = await db["articles"].count_documents({"is_breaking": True, "status": "published"})
    trending = await db["articles"].count_documents({"is_trending": True, "status": "published"})

    cursor = db["articles"].find().sort("published_at", -1).limit(5)
    recent_docs = await cursor.to_list(length=5)
    recent_articles = []
    for doc in recent_docs:
        doc["id"] = str(doc["_id"])
        category = await db["categories"].find_one({"_id": doc.get("category_id", "")})
        doc["category"] = category["name"] if category else "General"
        recent_articles.append(doc)

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
        "recent_articles": recent_articles,
    }


@router.get("/users", response_model=List[UserSchema])
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """List all users (admin only)."""
    cursor = db["users"].find().sort("created_at", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(length=limit)
    result = []
    for d in docs:
        if "_id" in d and "id" not in d:
            d["id"] = str(d["_id"])
        result.append(UserSchema(**d))
    return result


@router.put("/users/{user_id}", response_model=UserSchema)
async def update_user(
    user_id: str,
    body: dict,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Update any user (admin only). Allows promoting to admin, deactivating, etc."""
    allowed = {"full_name", "email", "is_admin", "is_active", "role"}
    update_data = {k: v for k, v in body.items() if k in allowed and v is not None}

    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    updated_doc = await user_service.update_user(db, user_id, update_data)
    if not updated_doc:
        raise HTTPException(status_code=404, detail="User not found")
    return UserSchema(**updated_doc)


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Delete a user (admin only)."""
    result = await db["users"].delete_one({"_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted"}


@router.get("/comments", response_model=List[CommentSchema])
async def list_all_comments(
    article_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """List all comments across articles (admin only)."""
    query = {}
    if article_id:
        query["article_id"] = article_id
    cursor = db["comments"].find(query).sort("created_at", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(length=limit)
    return docs


@router.get("/newsletter/subscribers")
async def list_subscribers(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """List newsletter subscribers (admin only)."""
    cursor = db["newsletter_subscribers"].find({"is_active": True}).sort("subscribed_at", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(length=limit)
    return [
        {
            "id": d.get("_id", d.get("id")),
            "email": d["email"],
            "subscribedAt": d.get("subscribed_at"),
            "isActive": d.get("is_active", True),
        }
        for d in docs
    ]


class GenerateArticleRequest(BaseModel):
    topic: str
    source_content: Optional[str] = None
    style: str = "standard"
    tone: str = "neutral"


class GenerateArticleResponse(BaseModel):
    title: str
    summary: str
    body: str
    tldr: str
    points: List[str]
    category_id: str = ""


@router.post("/ai/generate-article", response_model=GenerateArticleResponse)
async def ai_generate_article(body: GenerateArticleRequest):
    """Generate a complete article draft from a topic prompt using OpenAI."""
    result = await generate_article(topic=body.topic, source_content=body.source_content, style=body.style, tone=body.tone)
    if not result:
        raise HTTPException(
            status_code=503,
            detail="AI generation failed. Check the GEMINI_API_KEY environment variable.",
        )
    return result
