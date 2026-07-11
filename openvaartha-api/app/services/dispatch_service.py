"""Dispatches: short, headline-only breaking-news blurbs — deliberately not
full articles. They power both the homepage "JUST IN" scrolling ticker and the
Live Updates timeline, so editors have one lightweight form for "something
just happened" instead of having to publish a complete article just to get a
line into the ticker.
"""

from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from uuid import uuid4
from datetime import datetime, timezone

from app.core.sanitize import sanitize_text


async def ensure_dispatch_indexes(db: AsyncIOMotorDatabase) -> None:
    await db["dispatches"].create_index([("created_at", -1)])


async def _populate_article_links(db: AsyncIOMotorDatabase, dispatches: List[dict]) -> List[dict]:
    """Batch-attach slug/title for dispatches that link to a full article."""
    article_ids = [d["article_id"] for d in dispatches if d.get("article_id")]
    if not article_ids:
        for d in dispatches:
            d.setdefault("article_slug", None)
            d.setdefault("article_title", None)
        return dispatches

    articles = await db["articles"].find(
        {"_id": {"$in": article_ids}}, {"slug": 1, "title": 1}
    ).to_list(length=len(article_ids))
    by_id = {a["_id"]: a for a in articles}

    for d in dispatches:
        article = by_id.get(d.get("article_id"))
        d["article_slug"] = article.get("slug") if article else None
        d["article_title"] = article.get("title") if article else None
    return dispatches


async def list_dispatches(db: AsyncIOMotorDatabase, limit: int = 50) -> List[dict]:
    """Most recent dispatches, newest first."""
    cursor = db["dispatches"].find().sort("created_at", -1).limit(limit)
    dispatches = [{**d, "id": d.pop("_id")} for d in await cursor.to_list(length=limit)]
    return await _populate_article_links(db, dispatches)


async def create_dispatch(
    db: AsyncIOMotorDatabase,
    text: str,
    article_id: Optional[str],
    created_by: Optional[str],
) -> dict:
    if article_id and not await db["articles"].find_one({"_id": article_id}, {"_id": 1}):
        raise ValueError(f"Unknown article_id: {article_id}")

    dispatch_id = str(uuid4())
    doc = {
        "_id": dispatch_id,
        "text": sanitize_text(text),
        "article_id": article_id,
        "created_at": datetime.now(timezone.utc),
        "created_by": created_by,
    }
    await db["dispatches"].insert_one(doc)

    result = {**doc, "id": dispatch_id}
    del result["_id"]
    populated = await _populate_article_links(db, [result])
    return populated[0]


async def delete_dispatch(db: AsyncIOMotorDatabase, dispatch_id: str) -> bool:
    result = await db["dispatches"].delete_one({"_id": dispatch_id})
    return result.deleted_count > 0
