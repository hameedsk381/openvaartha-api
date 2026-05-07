from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from app.models.user import User as UserModel
from app.schemas.user import UserUpdate
from app.services import article_service

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

async def add_to_reading_list(db: AsyncIOMotorDatabase, user_id: str, article_id: str) -> bool:
    """Add an article to the user's reading list."""
    # Check if article exists
    article = await db["articles"].find_one({"_id": article_id})
    if not article:
        return False
        
    # Check if already in reading list
    existing = await db["reading_lists"].find_one({
        "user_id": user_id,
        "article_id": article_id
    })
    if existing:
        return True # Consider it a success if already there
        
    await db["reading_lists"].insert_one({
        "user_id": user_id,
        "article_id": article_id,
        "saved_at": datetime.utcnow()
    })
    return True

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
        {"$set": {"read_at": datetime.utcnow()}},
        upsert=True
    )
    return True
