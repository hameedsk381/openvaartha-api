from datetime import datetime
from typing import List, Optional
from uuid import uuid4

from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError

from app.schemas.category import CategoryCreate, CategoryUpdate


async def ensure_category_indexes(db: AsyncIOMotorDatabase) -> None:
    """Case-insensitive unique index on category name so renames are safe and
    duplicates are caught at the database layer, not just the application."""
    await db["categories"].create_index(
        "name",
        unique=True,
        collation={"locale": "en", "strength": 2},
        name="categories_name_unique_ci",
    )


async def get_categories(db: AsyncIOMotorDatabase) -> List[dict]:
    """Get all categories."""
    return await db["categories"].find({}).to_list(length=None)


async def get_category_by_id(db: AsyncIOMotorDatabase, category_id: str) -> Optional[dict]:
    """Get category by ID."""
    return await db["categories"].find_one({"_id": category_id})


async def get_category_by_name(db: AsyncIOMotorDatabase, name: str) -> Optional[dict]:
    """Get category by name (case-insensitive)."""
    return await db["categories"].find_one({
        "name": {"$regex": f"^{name.replace('-', ' ')}$", "$options": "i"}
    })


async def _name_is_taken(db: AsyncIOMotorDatabase, name: str, ignore_id: Optional[str] = None) -> bool:
    query: dict = {"name": {"$regex": f"^{name}$", "$options": "i"}}
    if ignore_id:
        query["_id"] = {"$ne": ignore_id}
    return await db["categories"].find_one(query, {"_id": 1}) is not None


async def create_category(db: AsyncIOMotorDatabase, category_data: CategoryCreate) -> dict:
    """Create a new category. Caller is expected to have done the case-insensitive
    duplicate check already; this layer also catches the race via the unique index."""
    category_id = str(uuid4())
    category_doc = {
        "_id": category_id,
        "name": category_data.name.strip(),
        "color_code": category_data.color_code,
        "emoji": category_data.emoji,
        "created_at": datetime.utcnow(),
    }
    try:
        await db["categories"].insert_one(category_doc)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category with this name already exists",
        )
    return category_doc


async def update_category(
    db: AsyncIOMotorDatabase,
    category_id: str,
    payload: CategoryUpdate,
) -> Optional[dict]:
    """Update a category. Returns the new document, or None if it doesn't exist."""
    update_dict = payload.model_dump(exclude_unset=True)
    if not update_dict:
        return await get_category_by_id(db, category_id)

    if "name" in update_dict:
        update_dict["name"] = update_dict["name"].strip()
        if await _name_is_taken(db, update_dict["name"], ignore_id=category_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category with this name already exists",
            )

    update_dict["updated_at"] = datetime.utcnow()
    try:
        result = await db["categories"].update_one({"_id": category_id}, {"$set": update_dict})
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category with this name already exists",
        )
    if result.matched_count == 0:
        return None
    return await get_category_by_id(db, category_id)


async def delete_category(db: AsyncIOMotorDatabase, category_id: str) -> bool:
    """Delete a category. Refuses to delete if any article still references it."""
    article_count = await db["articles"].count_documents({"category_id": category_id})
    if article_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Category has {article_count} article(s); reassign them before deleting.",
        )
    result = await db["categories"].delete_one({"_id": category_id})
    return result.deleted_count > 0


async def get_category_stats(db: AsyncIOMotorDatabase) -> List[dict]:
    """Get stats for categories."""
    categories = await get_categories(db)
    stats = []
    for category in categories:
        count = await db["articles"].count_documents({"category_id": category["_id"]})
        stats.append({
            "category_name": category["name"],
            "category_id": category["_id"],
            "article_count": count,
        })
    return stats
