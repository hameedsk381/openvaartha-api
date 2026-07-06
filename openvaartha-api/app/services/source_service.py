from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.schemas.source import SourceCreate, SourceUpdate


async def create_source(db: AsyncIOMotorDatabase, data: SourceCreate) -> dict:
    doc = {
        "_id": str(uuid4()),
        "name": data.name,
        "feed_url": data.feed_url,
        "category_id": data.category_id,
        "language": data.language,
        "active": data.active,
        "auto_publish": data.auto_publish,
        "last_fetched_at": None,
        "created_at": datetime.now(timezone.utc),
    }
    await db["sources"].insert_one(doc)
    doc["id"] = doc["_id"]
    return doc


async def update_source(db: AsyncIOMotorDatabase, source_id: str, data: SourceUpdate) -> Optional[dict]:
    update = data.model_dump(exclude_unset=True, exclude_none=True)
    if not update:
        doc = await db["sources"].find_one({"_id": source_id})
        if doc:
            doc["id"] = doc["_id"]
        return doc

    result = await db["sources"].find_one_and_update(
        {"_id": source_id},
        {"$set": update},
        return_document=True,
    )
    if result:
        result["id"] = result["_id"]
    return result


async def delete_source(db: AsyncIOMotorDatabase, source_id: str) -> bool:
    result = await db["sources"].delete_one({"_id": source_id})
    return result.deleted_count > 0


async def get_source(db: AsyncIOMotorDatabase, source_id: str) -> Optional[dict]:
    doc = await db["sources"].find_one({"_id": source_id})
    if doc:
        doc["id"] = doc["_id"]
        doc["article_count"] = await db["article_sources"].count_documents({"source_id": source_id})
    return doc


async def list_sources(db: AsyncIOMotorDatabase, active_only: bool = False) -> list[dict]:
    query = {}
    if active_only:
        query["active"] = True
    cursor = db["sources"].find(query).sort("created_at", -1)
    docs = await cursor.to_list(length=1000)
    for d in docs:
        d["id"] = d["_id"]
        d["article_count"] = await db["article_sources"].count_documents({"source_id": d["id"]})
    return docs


async def set_last_fetched(db: AsyncIOMotorDatabase, source_id: str):
    await db["sources"].update_one(
        {"_id": source_id},
        {"$set": {"last_fetched_at": datetime.now(timezone.utc)}},
    )
