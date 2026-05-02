from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from app.models.user import User as UserModel
from app.schemas.user import UserUpdate

async def update_user(db: AsyncIOMotorDatabase, user_id: str, user_data: dict) -> Optional[dict]:
    """Update user information."""
    if not user_data:
        return await db["users"].find_one({"_id": user_id})
        
    await db["users"].update_one({"_id": user_id}, {"$set": user_data})
    return await db["users"].find_one({"_id": user_id})

async def get_reading_list(db: AsyncIOMotorDatabase, user_id: str) -> List[dict]:
    """Get articles in user's reading list."""
    reading_list = await db["reading_lists"].find({"user_id": user_id}).to_list(length=None)
    article_ids = [rl["article_id"] for rl in reading_list]
    return await db["articles"].find({"_id": {"$in": article_ids}}).to_list(length=None)

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
