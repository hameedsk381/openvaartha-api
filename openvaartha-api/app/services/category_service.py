from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from uuid import uuid4
from app.models.category import Category
from app.schemas.category import CategoryCreate
from datetime import datetime

async def get_categories(db: AsyncIOMotorDatabase) -> List[dict]:
    """Get all categories."""
    return await db["categories"].find({}).to_list(length=None)

async def get_category_by_id(db: AsyncIOMotorDatabase, category_id: str) -> Optional[dict]:
    """Get category by ID."""
    return await db["categories"].find_one({"_id": category_id})

async def get_category_by_name(db: AsyncIOMotorDatabase, name: str) -> Optional[dict]:
    """Get category by name (case-insensitive regex)."""
    return await db["categories"].find_one({
        "name": {"$regex": f"^{name.replace('-', ' ')}$", "$options": "i"}
    })

async def create_category(db: AsyncIOMotorDatabase, category_data: CategoryCreate) -> dict:
    """Create a new category."""
    category_id = str(uuid4())
    category_doc = {
        "_id": category_id,
        "id": category_id,
        "name": category_data.name,
        "color_code": category_data.color_code,
        "emoji": category_data.emoji,
        "created_at": datetime.utcnow()
    }
    await db["categories"].insert_one(category_doc)
    return category_doc

async def get_category_stats(db: AsyncIOMotorDatabase) -> List[dict]:
    """Get stats for categories."""
    categories = await get_categories(db)
    stats = []
    for category in categories:
        count = await db["articles"].count_documents({"category_id": category["_id"]})
        stats.append({
            "category_name": category["name"],
            "category_id": category["_id"],
            "article_count": count
        })
    return stats
