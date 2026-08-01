from app.models.article import Article
from app.models.series import Series
import logging
from typing import List, Optional
from datetime import datetime, timezone
from uuid import uuid4
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.services.article_service import _populate_articles_bulk, _public_query, generate_slug

logger = logging.getLogger(__name__)


async def list_series(db: AsyncIOMotorDatabase, limit: int = 20) -> List[dict]:
    cursor = Series.get_motor_collection().find().sort("created_at", -1).limit(limit)
    series_list = await cursor.to_list(length=limit)
    for s in series_list:
        if "_id" in s:
            s["id"] = str(s.pop("_id"))
    return series_list


async def get_series_by_slug(db: AsyncIOMotorDatabase, slug: str) -> Optional[dict]:
    series = await Series.get_motor_collection().find_one({"slug": slug})
    if not series:
        return None

    if "_id" in series:
        series["id"] = str(series.pop("_id"))

    # Fetch and populate all articles in this series in order
    article_ids = series.get("article_ids", [])
    if article_ids:
        cursor = Article.get_motor_collection().find(_public_query({"_id": {"$in": article_ids}}))
        raw_articles = await cursor.to_list(length=len(article_ids))
        populated = await _populate_articles_bulk(db, raw_articles)

        # Preserve explicit article order
        art_map = {a["id"]: a for a in populated if a}
        series["articles"] = [art_map[aid] for aid in article_ids if aid in art_map]
    else:
        series["articles"] = []

    return series


async def get_series_for_article(db: AsyncIOMotorDatabase, article_id: str) -> Optional[dict]:
    series = await Series.get_motor_collection().find_one({"article_ids": article_id})
    if not series:
        return None

    if "_id" in series:
        series["id"] = str(series.pop("_id"))

    article_ids = series.get("article_ids", [])
    position = article_ids.index(article_id) + 1 if article_id in article_ids else 1

    return {
        "id": series["id"],
        "slug": series["slug"],
        "title": series["title"],
        "total_parts": len(article_ids),
        "current_part": position,
    }


async def create_series(db: AsyncIOMotorDatabase, data: dict) -> dict:
    series_id = str(uuid4())
    slug = data.get("slug") or generate_slug(data.get("title", "series"))
    
    doc = {
        "_id": series_id,
        "slug": slug,
        "title": data.get("title", ""),
        "description": data.get("description", ""),
        "cover_image_url": data.get("cover_image_url"),
        "article_ids": data.get("article_ids", []),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    await Series(**doc).insert()
    doc["id"] = series_id
    doc.pop("_id", None)
    return doc
