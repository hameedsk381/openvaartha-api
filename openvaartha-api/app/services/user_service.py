from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from uuid import uuid4, UUID
from datetime import datetime, timedelta, timezone
from app.models.user import User as UserModel
from app.schemas.user import UserUpdate
from app.services import article_service
from app.core.security import get_password_hash
from app.services.email_service import send_email, build_password_reset_email
from app.config import settings

async def update_user(db: AsyncIOMotorDatabase, user_id: str, user_data: dict) -> Optional[dict]:
    """Update user information."""
    if not user_data:
        return await db["users"].find_one({"_id": user_id})
        
    await db["users"].update_one({"_id": user_id}, {"$set": user_data})
    return await db["users"].find_one({"_id": user_id})

async def get_reading_list(db: AsyncIOMotorDatabase, user_id: str) -> List[dict]:
    """Get articles in user's reading list."""
    reading_list = await db["reading_lists"].find({"user_id": user_id}).sort("saved_at", -1).to_list(length=None)
    article_ids = [rl["article_id"] for rl in reading_list]
    articles = await db["articles"].find({"_id": {"$in": article_ids}}).to_list(length=None)
    order = {article_id: index for index, article_id in enumerate(article_ids)}
    articles.sort(key=lambda article: order.get(article["_id"], len(order)))
    return [await article_service._populate_article_extras(db, article) for article in articles]

async def add_to_reading_list(db: AsyncIOMotorDatabase, user_id: str, article_id: str) -> dict:
    """Add an article to the user's reading list.
    Returns {"success": True, "status": "added|already_exists"} or {"success": False, "status": "not_found"}."""
    article = await db["articles"].find_one({"_id": article_id})
    if not article:
        return {"success": False, "status": "not_found"}

    existing = await db["reading_lists"].find_one({
        "user_id": user_id,
        "article_id": article_id
    })
    if existing:
        return {"success": True, "status": "already_exists"}

    await db["reading_lists"].insert_one({
        "user_id": user_id,
        "article_id": article_id,
        "saved_at": datetime.now(timezone.utc)
    })
    return {"success": True, "status": "added"}

async def remove_from_reading_list(db: AsyncIOMotorDatabase, user_id: str, article_id: str) -> bool:
    """Remove an article from the user's reading list."""
    result = await db["reading_lists"].delete_one({
        "user_id": user_id,
        "article_id": article_id
    })
    return result.deleted_count > 0


async def get_reading_history(db: AsyncIOMotorDatabase, user_id: str) -> List[dict]:
    """Get articles the user has read, newest first."""
    history = await db["reading_history"].find({"user_id": user_id}).sort("read_at", -1).to_list(length=None)
    article_ids = [item["article_id"] for item in history]
    articles = await db["articles"].find({"_id": {"$in": article_ids}}).to_list(length=None)
    order = {article_id: index for index, article_id in enumerate(article_ids)}
    articles.sort(key=lambda article: order.get(article["_id"], len(order)))
    return [await article_service._populate_article_extras(db, article) for article in articles]


async def add_to_reading_history(db: AsyncIOMotorDatabase, user_id: str, article_id: str) -> bool:
    """Record an article read for a user."""
    article = await db["articles"].find_one({"_id": article_id})
    if not article:
        return False

    await db["reading_history"].update_one(
        {"user_id": user_id, "article_id": article_id},
        {"$set": {"read_at": datetime.now(timezone.utc)}},
        upsert=True
    )
    return True


async def create_password_reset_token(db: AsyncIOMotorDatabase, email: str) -> Optional[str]:
    """Create a password reset token and send email. Returns None if email not found."""
    user = await db["users"].find_one({"email": email})
    if not user:
        return None

    token = str(uuid4())
    await db["password_reset_tokens"].insert_one({
        "token": token,
        "user_id": user["_id"],
        "email": email,
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=settings.RESET_TOKEN_EXPIRE_HOURS),
        "used": False,
        "created_at": datetime.now(timezone.utc),
    })

    reset_url = f"{settings.SITE_URL.rstrip('/')}/reset-password?token={token}"
    await send_email(
        to=email,
        subject="Reset your OpenVaartha password",
        html_body=build_password_reset_email(reset_url),
    )
    return token


async def verify_reset_token(db: AsyncIOMotorDatabase, token: str) -> Optional[dict]:
    """Verify a reset token is valid and not expired. Returns the token doc or None."""
    doc = await db["password_reset_tokens"].find_one({"token": token, "used": False})
    if not doc:
        return None
    if doc["expires_at"].replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        return None
    return doc


async def reset_password(db: AsyncIOMotorDatabase, token: str, new_password: str) -> bool:
    """Reset a user's password using a valid reset token."""
    doc = await verify_reset_token(db, token)
    if not doc:
        return False

    hashed = get_password_hash(new_password)
    await db["users"].update_one({"_id": doc["user_id"]}, {"$set": {"hashed_password": hashed}})
    await db["password_reset_tokens"].update_one({"token": token}, {"$set": {"used": True}})
    return True
