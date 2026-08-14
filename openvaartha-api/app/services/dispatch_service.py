from app.models.article import Article
from app.models.category import Category
from app.models.dispatch import Dispatch
"""Dispatches: short, headline-only breaking-news blurbs — deliberately not
full articles. They power both the homepage "JUST IN" scrolling ticker and the
Bytes page (/bytes), so editors have one lightweight form for "something just
happened" instead of having to publish a complete article just to get a line
into the ticker.
"""

import logging
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from uuid import uuid4
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from app.core.sanitize import sanitize_text
from app.services import ai_service
from app.services import dispatch_reaction_service

logger = logging.getLogger(__name__)

# Bytes is a same-day feed for Indian readers — "today" means the calendar
# day in IST, not UTC, so the feed doesn't roll over at 5:30am local time.
IST = ZoneInfo("Asia/Kolkata")


def _ist_day_bounds_utc() -> tuple[datetime, datetime]:
    """UTC [start, end) bounds of the current IST calendar day."""
    now_ist = datetime.now(IST)
    start_ist = now_ist.replace(hour=0, minute=0, second=0, microsecond=0)
    end_ist = start_ist.replace(hour=23, minute=59, second=59, microsecond=999999)
    return start_ist.astimezone(timezone.utc), end_ist.astimezone(timezone.utc)


async def ensure_dispatch_indexes(db: AsyncIOMotorDatabase) -> None:
    await Dispatch.get_motor_collection().create_index([("created_at", -1)])


async def _category_names_for(db: AsyncIOMotorDatabase, category_ids: set) -> dict:
    if not category_ids:
        return {}
    categories = await Category.get_motor_collection().find(
        {"_id": {"$in": list(category_ids)}}, {"name": 1}
    ).to_list(length=len(category_ids))
    return {c["_id"]: c["name"] for c in categories}


async def _populate_dispatch_extras(db: AsyncIOMotorDatabase, dispatches: List[dict]) -> List[dict]:
    """Batch-attach slug/title/category. Category is resolved at read time —
    never stored redundantly on top of category_id — so a later
    re-categorization (of the dispatch itself or its linked article) is
    reflected immediately. A dispatch's own category_id (set at creation, via
    AI classification, or backfilled) takes priority over the linked
    article's, since an editor's explicit choice should win."""
    article_ids = [d["article_id"] for d in dispatches if d.get("article_id")]
    articles = await Article.get_motor_collection().find(
        {"_id": {"$in": article_ids}}, {"slug": 1, "title": 1, "category_id": 1}
    ).to_list(length=len(article_ids)) if article_ids else []
    articles_by_id = {a["_id"]: a for a in articles}

    category_ids = {d["category_id"] for d in dispatches if d.get("category_id")}
    category_ids |= {a["category_id"] for a in articles if a.get("category_id")}
    category_names = await _category_names_for(db, category_ids)

    for d in dispatches:
        article = articles_by_id.get(d.get("article_id"))
        d["article_slug"] = article.get("slug") if article else None
        d["article_title"] = article.get("title") if article else None
        resolved_category_id = d.get("category_id") or (article.get("category_id") if article else None)
        d["category"] = category_names.get(resolved_category_id)
    return dispatches


async def list_dispatches(db: AsyncIOMotorDatabase, limit: int = 50, today_only: bool = False) -> List[dict]:
    """Most recent dispatches, newest first. ``today_only`` scopes to the
    current IST calendar day — Bytes is meant to be a fresh, same-day feed."""
    query: dict = {}
    if today_only:
        start, end = _ist_day_bounds_utc()
        query["created_at"] = {"$gte": start, "$lte": end}
    cursor = Dispatch.get_motor_collection().find(query).sort("created_at", -1).limit(limit)
    dispatches = [{**d, "id": d.pop("_id")} for d in await cursor.to_list(length=limit)]
    return await _populate_dispatch_extras(db, dispatches)


async def get_dispatch(db: AsyncIOMotorDatabase, dispatch_id: str, user_id: Optional[str] = None) -> Optional[dict]:
    """Fetch a single dispatch by id, regardless of what day it was posted —
    shared links (see /bytes/:id) must keep working even after a byte has
    rolled out of the same-day feed."""
    doc = await Dispatch.get_motor_collection().find_one({"_id": dispatch_id})
    if not doc:
        return None
    dispatch = {**doc, "id": doc.pop("_id")}
    populated = await _populate_dispatch_extras(db, [dispatch])
    d = populated[0]

    like_counts = await dispatch_reaction_service.get_like_counts(db, [dispatch_id])
    has_liked = await dispatch_reaction_service.has_user_liked(db, [dispatch_id], user_id)
    repost_counts = await dispatch_reaction_service.get_repost_counts(db, [dispatch_id])
    has_reposted = await dispatch_reaction_service.has_user_reposted(db, [dispatch_id], user_id)
    comment_counts = await dispatch_reaction_service.get_comment_counts(db, [dispatch_id])

    d["like_count"] = like_counts.get(dispatch_id, 0)
    d["has_liked"] = has_liked.get(dispatch_id, False)
    d["repost_count"] = repost_counts.get(dispatch_id, 0)
    d["has_reposted"] = has_reposted.get(dispatch_id, False)
    d["comment_count"] = comment_counts.get(dispatch_id, 0)

    return d



async def _assert_valid_refs(db: AsyncIOMotorDatabase, article_id: Optional[str], category_id: Optional[str]) -> None:
    if article_id and not await Article.get_motor_collection().find_one({"_id": article_id}, {"_id": 1}):
        raise ValueError(f"Unknown article_id: {article_id}")
    if category_id and not await Category.get_motor_collection().find_one({"_id": category_id}, {"_id": 1}):
        raise ValueError(f"Unknown category_id: {category_id}")


async def create_dispatch(
    db: AsyncIOMotorDatabase,
    text: str,
    article_id: Optional[str],
    created_by: Optional[str],
    image_url: Optional[str] = None,
    video_url: Optional[str] = None,
    category_id: Optional[str] = None,
) -> dict:
    await _assert_valid_refs(db, article_id, category_id)

    dispatch_id = str(uuid4())
    doc = {
        "_id": dispatch_id,
        "text": sanitize_text(text),
        "article_id": article_id,
        "image_url": image_url or None,
        "video_url": video_url or None,
        "category_id": category_id,
        "created_at": datetime.now(timezone.utc),
        "created_by": created_by,
    }
    await Dispatch(**doc).insert()

    result = {**doc, "id": dispatch_id}
    del result["_id"]
    populated = await _populate_dispatch_extras(db, [result])
    return populated[0]


async def update_dispatch(
    db: AsyncIOMotorDatabase,
    dispatch_id: str,
    text: str,
    article_id: Optional[str],
    image_url: Optional[str] = None,
    video_url: Optional[str] = None,
    category_id: Optional[str] = None,
) -> Optional[dict]:
    await _assert_valid_refs(db, article_id, category_id)

    result = await Dispatch.get_motor_collection().update_one(
        {"_id": dispatch_id},
        {"$set": {
            "text": sanitize_text(text),
            "article_id": article_id,
            "image_url": image_url or None,
            "video_url": video_url or None,
            "category_id": category_id,
        }},
    )
    if result.matched_count == 0:
        return None
    return await get_dispatch(db, dispatch_id)


async def delete_dispatch(db: AsyncIOMotorDatabase, dispatch_id: str) -> bool:
    result = await Dispatch.get_motor_collection().delete_one({"_id": dispatch_id})
    return result.deleted_count > 0


async def list_dispatches_paginated(
    db: AsyncIOMotorDatabase,
    limit: int = 20,
    cursor: Optional[str] = None,
    user_id: Optional[str] = None,
) -> dict:
    """Cursor-based paginated feed. Returns {items: List[dict], nextCursor: str|None}.
    cursor is the created_at of the last item from the previous page.
    Enriches each dispatch with likeCount and hasLiked."""
    query = {}
    if cursor:
        try:
            cursor_dt = datetime.fromisoformat(cursor.replace("Z", "+00:00"))
            query["created_at"] = {"$lt": cursor_dt}
        except ValueError:
            pass

    db_cursor = Dispatch.get_motor_collection().find(query).sort("created_at", -1).limit(limit + 1)
    docs = await db_cursor.to_list(length=limit + 1)
    
    has_next = len(docs) > limit
    if has_next:
        docs.pop()
        
    dispatches = [{**d, "id": str(d.pop("_id"))} for d in docs]
    dispatches = await _populate_dispatch_extras(db, dispatches)
    
    dispatch_ids = [d["id"] for d in dispatches]
    like_counts = await dispatch_reaction_service.get_like_counts(db, dispatch_ids)
    has_user_liked = await dispatch_reaction_service.has_user_liked(db, dispatch_ids, user_id)
    repost_counts = await dispatch_reaction_service.get_repost_counts(db, dispatch_ids)
    has_user_reposted = await dispatch_reaction_service.has_user_reposted(db, dispatch_ids, user_id)
    comment_counts = await dispatch_reaction_service.get_comment_counts(db, dispatch_ids)
    
    for d in dispatches:
        d["like_count"] = like_counts.get(d["id"], 0)
        d["has_liked"] = has_user_liked.get(d["id"], False)
        d["repost_count"] = repost_counts.get(d["id"], 0)
        d["has_reposted"] = has_user_reposted.get(d["id"], False)
        d["comment_count"] = comment_counts.get(d["id"], 0)

        
    next_cursor = None
    if has_next and dispatches:
        next_cursor = dispatches[-1]["created_at"].isoformat()
        
    return {"items": dispatches, "nextCursor": next_cursor}


async def backfill_categories(db: AsyncIOMotorDatabase) -> int:
    """One-time (re-runnable) sweep: AI-classify a category for every
    standalone dispatch (no article_id) that doesn't have one yet. Safe to
    call repeatedly — already-categorized or article-linked dispatches are
    skipped."""
    categories = await Category.get_motor_collection().find({}, {"name": 1}).to_list(length=100)
    if not categories:
        return 0

    cursor = Dispatch.get_motor_collection().find(
        {"article_id": None, "category_id": None},
        {"text": 1},
    )
    uncategorized = await cursor.to_list(length=None)

    updated = 0
    for d in uncategorized:
        category_id = await ai_service.classify_category(d["text"], categories)
        if not category_id:
            continue
        await Dispatch.get_motor_collection().update_one({"_id": d["_id"]}, {"$set": {"category_id": category_id}})
        updated += 1

    logger.info(f"Dispatch category backfill: classified {updated}/{len(uncategorized)} standalone dispatches")
    return updated
