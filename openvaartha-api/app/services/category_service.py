from app.models.article import Article
from app.models.category import Category
from datetime import datetime, timezone
from typing import List, Optional
from uuid import uuid4

from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError

from app.schemas.category import CategoryCreate, CategoryUpdate


async def ensure_category_indexes(db: AsyncIOMotorDatabase) -> None:
    """Case-insensitive unique index on category name so renames are safe and
    duplicates are caught at the database layer, not just the application."""
    await Category.get_motor_collection().create_index(
        "name",
        unique=True,
        collation={"locale": "en", "strength": 2},
        name="categories_name_unique_ci",
    )


async def get_categories(db: AsyncIOMotorDatabase) -> List[dict]:
    """Get all categories, ordered by editorial priority (lower first, see
    Category.priority) then name — this single ordering drives Navbar,
    homepage category strips, and every other category list in the app."""
    return await Category.get_motor_collection().find({}).sort(
        [("priority", 1), ("name", 1)]
    ).to_list(length=None)


async def get_category_by_id(db: AsyncIOMotorDatabase, category_id: str) -> Optional[dict]:
    """Get category by ID."""
    return await Category.get_motor_collection().find_one({"_id": category_id})


async def get_category_by_name(db: AsyncIOMotorDatabase, name: str) -> Optional[dict]:
    """Get category by name (case-insensitive)."""
    return await Category.get_motor_collection().find_one({
        "name": {"$regex": f"^{name.replace('-', ' ')}$", "$options": "i"}
    })


async def _name_is_taken(db: AsyncIOMotorDatabase, name: str, ignore_id: Optional[str] = None) -> bool:
    query: dict = {"name": {"$regex": f"^{name}$", "$options": "i"}}
    if ignore_id:
        query["_id"] = {"$ne": ignore_id}
    return await Category.get_motor_collection().find_one(query, {"_id": 1}) is not None


async def create_category(db: AsyncIOMotorDatabase, category_data: CategoryCreate) -> dict:
    """Create a new category. Caller is expected to have done the case-insensitive
    duplicate check already; this layer also catches the race via the unique index."""
    category_id = str(uuid4())
    category_doc = {
        "_id": category_id,
        "name": category_data.name.strip(),
        "color_code": category_data.color_code,
        "emoji": category_data.emoji,
        "priority": category_data.priority,
        "created_at": datetime.now(timezone.utc),
    }
    try:
        await Category(**category_doc).insert()
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

    update_dict["updated_at"] = datetime.now(timezone.utc)
    try:
        result = await Category.get_motor_collection().update_one({"_id": category_id}, {"$set": update_dict})
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
    article_count = await Article.get_motor_collection().count_documents({"category_id": category_id})
    if article_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Category has {article_count} article(s); reassign them before deleting.",
        )
    result = await Category.get_motor_collection().delete_one({"_id": category_id})
    return result.deleted_count > 0


# Lower = shown first across nav, homepage category strips, and filters.
# Tier 0-9: national/state politics and geo-civic coverage — the sociopolitical
# core. Tier 10-19: economy/tech/science, civic-adjacent but not the center.
# Tier 20-29: entertainment/lifestyle, kept but pushed last. Anything not
# listed here keeps the neutral default (50) rather than being guessed at.
CATEGORY_PRIORITY_DEFAULTS: dict[str, int] = {
    "politics": 0,
    "india": 1,
    "world": 2,
    "andhra": 3,
    "telangana": 4,
    "hyderabad": 5,
    "business": 10,
    "technology": 11,
    "science": 12,
    "entertainment": 20,
    "cinema": 21,
    "sports": 22,
}


async def apply_category_priority_defaults(db: AsyncIOMotorDatabase) -> int:
    """One-time-per-name, idempotent: assign the sociopolitical-first priority
    ranking to recognized category names, and backfill the neutral default
    (50) onto any category that predates the `priority` field entirely (a
    missing field would otherwise sort ahead of everything in get_categories'
    ascending sort). Safe to re-run — every category ends up with an explicit
    priority either way."""
    updated = 0
    cursor = Category.get_motor_collection().find({}, {"name": 1, "priority": 1})
    async for doc in cursor:
        name_key = doc["name"].strip().lower()
        target = CATEGORY_PRIORITY_DEFAULTS.get(name_key, doc.get("priority", 50))
        if doc.get("priority") == target:
            continue
        await Category.get_motor_collection().update_one(
            {"_id": doc["_id"]}, {"$set": {"priority": target}}
        )
        updated += 1
    return updated


async def get_category_stats(db: AsyncIOMotorDatabase) -> List[dict]:
    """Get stats for categories."""
    pipeline = [
        {"$group": {"_id": "$category_id", "article_count": {"$sum": 1}}}
    ]
    cursor = Article.get_motor_collection().aggregate(pipeline)
    article_counts = {item["_id"]: item["article_count"] for item in await cursor.to_list(length=None) if item["_id"]}

    categories = await get_categories(db)
    stats = []
    for category in categories:
        stats.append({
            "category_name": category["name"],
            "category_id": category["_id"],
            "article_count": article_counts.get(category["_id"], 0),
        })
    return stats
