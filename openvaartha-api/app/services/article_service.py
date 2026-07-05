import re
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional, Any
from uuid import uuid4
from datetime import datetime, timezone
import json
from fastapi import HTTPException, status
from pymongo.errors import OperationFailure
from bson import ObjectId
from redis import asyncio as redis_async
from redis.exceptions import RedisError

from app.config import settings
from app.core.sanitize import sanitize_html, sanitize_points, sanitize_text
from app.models.article import ArticleStatus, PUBLIC_STATUS
from app.services.comment_service import ensure_comment_indexes

_redis_client: Optional[redis_async.Redis] = None


def _json_default(value):
    if isinstance(value, datetime):
        return value.isoformat()
    raise TypeError(f"Object of type {type(value).__name__} is not JSON serializable")


def _cache_key(namespace: str, **parts: Any) -> str:
    suffix = ":".join(f"{key}={parts[key]}" for key in sorted(parts))
    return f"openvaartha:articles:{namespace}:{suffix}"


async def _get_redis() -> Optional[redis_async.Redis]:
    global _redis_client
    if settings.CACHE_TTL_SECONDS <= 0:
        return None
    if _redis_client is None:
        _redis_client = redis_async.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis_client


async def _get_cached_list(key: str) -> Optional[List[dict]]:
    try:
        redis = await _get_redis()
        if redis is None:
            return None
        cached = await redis.get(key)
        return json.loads(cached) if cached else None
    except (RedisError, json.JSONDecodeError):
        return None


async def _set_cached_list(key: str, value: List[dict]) -> None:
    try:
        redis = await _get_redis()
        if redis is not None:
            await redis.setex(key, settings.CACHE_TTL_SECONDS, json.dumps(value, default=_json_default))
    except (RedisError, TypeError):
        return


async def invalidate_article_caches() -> None:
    """Clear cached article list variants after article mutations."""
    try:
        redis = await _get_redis()
        if redis is None:
            return
        async for key in redis.scan_iter("openvaartha:articles:*"):
            await redis.delete(key)
    except RedisError:
        return


def generate_slug(title: str) -> str:
    """Generate a URL-friendly slug from title."""
    slug = title.lower()
    slug = slug.replace(" ", "-")
    slug = slug.replace("--", "-")
    slug = ''.join(c for c in slug if c.isalnum() or c == '-')
    return slug.strip("-") or "article"


async def generate_unique_slug(db: AsyncIOMotorDatabase, title: str) -> str:
    """Generate a URL-friendly slug that does not already exist."""
    base_slug = generate_slug(title)
    slug = base_slug
    suffix = 2
    while await db["articles"].find_one({"slug": slug}, {"_id": 1}):
        slug = f"{base_slug}-{suffix}"
        suffix += 1
    return slug


async def ensure_article_indexes(db: AsyncIOMotorDatabase) -> None:
    """Create article indexes used by search and integrity-sensitive lookups."""
    # Text search: by default Mongo treats each document's `language` field as
    # its per-document text-index language, and Telugu ("te") is not a supported
    # value — which made every Telugu article insert fail with WriteError 17262.
    # Point the override at a field articles never set, and disable stemming
    # ("none") since Telugu has no Mongo stemmer anyway.
    _text_index_opts = {
        "name": "articles_text_search",
        "default_language": "none",
        "language_override": "text_search_lang",
    }
    try:
        await db["articles"].create_index(
            [("title", "text"), ("summary", "text")], **_text_index_opts
        )
    except OperationFailure:
        # An older index with the same name but default language options exists
        # (pre-fix deployments) — rebuild it with the corrected options.
        await db["articles"].drop_index("articles_text_search")
        await db["articles"].create_index(
            [("title", "text"), ("summary", "text")], **_text_index_opts
        )
    await db["articles"].create_index("slug", unique=True)
    await db["articles"].create_index("status")
    await db["article_content"].create_index("article_id")
    await db["reading_history"].create_index([("user_id", 1), ("article_id", 1)], unique=True)
    await ensure_comment_indexes(db)
    # Backfill: documents created before the status field defaulted to draft
    # would be invisible to the public list. Treat un-tagged docs as published
    # so existing inventories migrate cleanly.
    await db["articles"].update_many(
        {"status": {"$exists": False}},
        {"$set": {"status": PUBLIC_STATUS}},
    )


def _public_query(extra: Optional[dict] = None) -> dict:
    """Build a query that matches published articles, treating legacy
    docs without a ``status`` field as published for backward compatibility."""
    query: dict = {
        "$or": [
            {"status": PUBLIC_STATUS},
            {"status": {"$exists": False}},
        ]
    }
    if extra:
        for key, value in extra.items():
            query[key] = value
    return query


async def _populate_article_extras(db: AsyncIOMotorDatabase, article: dict) -> dict:
    """Populate category name and nested content for an article doc."""
    if not article:
        return article

    if "_id" in article:
        article["id"] = str(article.pop("_id"))

    # Older docs predate the status field — assume published so they remain visible.
    article.setdefault("status", PUBLIC_STATUS)

    if "category_id" in article:
        if isinstance(article["category_id"], ObjectId):
            article["category_id"] = str(article["category_id"])
        category = await db["categories"].find_one({"_id": article["category_id"]})
        if category:
            article["category"] = category["name"]
        else:
            article["category"] = "General"

    content = await db["article_content"].find_one({"article_id": article.get("id")})
    if content:
        if "_id" in content:
            content["id"] = str(content.pop("_id"))
        article["content"] = content

    return article


async def get_articles(
    db: AsyncIOMotorDatabase,
    skip: int = 0,
    limit: int = 20,
    category_id: Optional[str] = None,
    search: Optional[str] = None,
    include_unpublished: bool = False,
):
    """Get articles. Public callers see only published items;
    callers in admin contexts may opt in to all statuses."""
    key = _cache_key(
        "list",
        skip=skip,
        limit=limit,
        category_id=category_id or "",
        search=search or "",
        scope="all" if include_unpublished else "public",
    )
    if not include_unpublished:
        cached = await _get_cached_list(key)
        if cached is not None:
            return cached

    query: dict = {} if include_unpublished else _public_query()
    if category_id:
        query["category_id"] = category_id
    if search:
        query["$text"] = {"$search": search}

    cursor = db["articles"].find(query).sort("published_at", -1).skip(skip).limit(limit)
    articles = await cursor.to_list(length=limit)

    populated = [await _populate_article_extras(db, a) for a in articles]
    if not include_unpublished:
        await _set_cached_list(key, populated)
    return populated


async def get_trending_articles(db: AsyncIOMotorDatabase, limit: int = 10):
    """Get trending articles (published only)."""
    key = _cache_key("trending", limit=limit)
    cached = await _get_cached_list(key)
    if cached is not None:
        return cached

    cursor = db["articles"].find(_public_query({"is_trending": True})).sort("published_at", -1).limit(limit)
    articles = await cursor.to_list(length=limit)

    populated = [await _populate_article_extras(db, a) for a in articles]
    await _set_cached_list(key, populated)
    return populated


async def get_breaking_articles(db: AsyncIOMotorDatabase, limit: int = 5):
    """Get breaking news articles (published only)."""
    key = _cache_key("breaking", limit=limit)
    cached = await _get_cached_list(key)
    if cached is not None:
        return cached

    cursor = db["articles"].find(_public_query({"is_breaking": True})).sort("published_at", -1).limit(limit)
    articles = await cursor.to_list(length=limit)

    populated = [await _populate_article_extras(db, a) for a in articles]
    await _set_cached_list(key, populated)
    return populated


async def get_editor_pick_articles(db: AsyncIOMotorDatabase, limit: int = 10):
    """Get editor-curated articles (published only)."""
    cursor = db["articles"].find(_public_query({"is_editor_pick": True})).sort("published_at", -1).limit(limit)
    articles = await cursor.to_list(length=limit)
    return [await _populate_article_extras(db, a) for a in articles]


async def get_explainer_articles(db: AsyncIOMotorDatabase, skip: int = 0, limit: int = 20):
    """Get articles with explainer or timeline content (published only)."""
    articles_with_content = await db["article_content"].find({
        "$or": [
            {"explainer": {"$ne": None, "$not": {"$size": 0}}},
            {"timeline": {"$ne": None, "$not": {"$size": 0}}},
        ]
    }).to_list(length=None)

    article_ids = [content["article_id"] for content in articles_with_content]
    query = _public_query({"_id": {"$in": article_ids}})
    cursor = db["articles"].find(query).sort("published_at", -1).skip(skip).limit(limit)
    articles = await cursor.to_list(length=limit)
    return [await _populate_article_extras(db, a) for a in articles]


async def get_article_by_slug(
    db: AsyncIOMotorDatabase,
    slug: str,
    include_unpublished: bool = False,
):
    """Get a single article by slug. Drafts/archived are hidden unless caller is admin."""
    if include_unpublished:
        article = await db["articles"].find_one({"slug": slug})
    else:
        article = await db["articles"].find_one(_public_query({"slug": slug}))
    return await _populate_article_extras(db, article)


async def get_article_by_id(
    db: AsyncIOMotorDatabase,
    article_id: str,
    include_unpublished: bool = False,
):
    """Get a single article by ID. Drafts/archived are hidden unless caller is admin."""
    if include_unpublished:
        article = await db["articles"].find_one({"_id": article_id})
    else:
        article = await db["articles"].find_one(_public_query({"_id": article_id}))
    return await _populate_article_extras(db, article)


async def _assert_category_exists(db: AsyncIOMotorDatabase, category_id: str) -> None:
    if not await db["categories"].find_one({"_id": str(category_id)}, {"_id": 1}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown category_id: {category_id}",
        )


async def create_article(db: AsyncIOMotorDatabase, article_data: Any):
    """Create a new article. Defaults to draft. Body and summary are sanitized."""
    await _assert_category_exists(db, article_data.category_id)

    slug = await generate_unique_slug(db, article_data.title)
    article_id = str(uuid4())

    article_status = getattr(article_data, "status", ArticleStatus.DRAFT)
    if hasattr(article_status, "value"):
        article_status = article_status.value

    article_doc = {
        "_id": article_id,
        "slug": slug,
        "title": sanitize_text(article_data.title),
        "summary": sanitize_text(article_data.summary),
        "category_id": str(article_data.category_id),
        "read_time": article_data.read_time,
        "language": article_data.language,
        "status": article_status,
        "is_trending": article_data.is_trending,
        "is_breaking": article_data.is_breaking,
        "is_editor_pick": article_data.is_editor_pick,
        "thumbnail_url": article_data.thumbnail_url,
        "instagram_url": article_data.instagram_url,
        "published_at": article_data.published_at,
        "last_updated": article_data.last_updated or datetime.now(timezone.utc),
        "author": sanitize_text(article_data.author),
        "created_at": datetime.now(timezone.utc),
    }

    await db["articles"].insert_one(article_doc)

    if article_data.content:
        content_doc = {
            "article_id": article_id,
            "tldr": sanitize_text(article_data.content.tldr),
            "points": sanitize_points(article_data.content.points) or [],
            "body": sanitize_html(article_data.content.body),
            "timeline": article_data.content.timeline,
            "explainer": article_data.content.explainer,
        }
        await db["article_content"].insert_one(content_doc)

    await invalidate_article_caches()
    return await get_article_by_id(db, article_id, include_unpublished=True)


_PLAIN_TEXT_FIELDS = {"title", "summary", "author"}


async def update_article(db: AsyncIOMotorDatabase, article_id: str, article_data: Any):
    """Update an existing article. Only fields the caller actually sent are touched.

    Partial nested-content updates are merged with ``$set`` on dotted paths so
    omitted keys don't wipe their siblings.
    """
    update_dict = article_data.model_dump(exclude_unset=True)
    content_data = update_dict.pop("content", None)

    if "category_id" in update_dict:
        await _assert_category_exists(db, update_dict["category_id"])

    if "status" in update_dict and hasattr(update_dict["status"], "value"):
        update_dict["status"] = update_dict["status"].value

    for field in _PLAIN_TEXT_FIELDS:
        if field in update_dict and update_dict[field] is not None:
            update_dict[field] = sanitize_text(update_dict[field])

    if update_dict:
        update_dict["last_updated"] = datetime.now(timezone.utc)
        update_dict["updated_at"] = datetime.now(timezone.utc)
        await db["articles"].update_one({"_id": article_id}, {"$set": update_dict})

    if content_data:
        sanitized_content: dict[str, Any] = {}
        for key, value in content_data.items():
            if value is None:
                continue
            if key == "body":
                sanitized_content[key] = sanitize_html(value)
            elif key == "tldr":
                sanitized_content[key] = sanitize_text(value)
            elif key == "points":
                sanitized_content[key] = sanitize_points(value) or []
            else:
                sanitized_content[key] = value
        if sanitized_content:
            await db["article_content"].update_one(
                {"article_id": article_id},
                {"$set": sanitized_content, "$setOnInsert": {"article_id": article_id}},
                upsert=True,
            )

    await invalidate_article_caches()
    return await get_article_by_id(db, article_id, include_unpublished=True)


async def delete_article(db: AsyncIOMotorDatabase, article_id: str):
    """Delete an article."""
    result = await db["articles"].delete_one({"_id": article_id})
    if result.deleted_count > 0:
        await db["article_content"].delete_many({"article_id": article_id})
        await invalidate_article_caches()
        return True
    return False


async def search_articles(db: AsyncIOMotorDatabase, query: str, skip: int = 0, limit: int = 20, category: Optional[str] = None):
    """Search published articles by title and summary with optional category filter."""
    await ensure_article_indexes(db)

    text_filter = {"$text": {"$search": query}}
    if category:
        category_doc = await db["categories"].find_one({"name": {"$regex": f"^{re.escape(category)}$", "$options": "i"}})
        if category_doc:
            text_filter["category_id"] = category_doc["_id"]

    try:
        cursor = db["articles"].find(
            _public_query(text_filter),
            {"score": {"$meta": "textScore"}},
        ).sort([("score", {"$meta": "textScore"}), ("published_at", -1)]).skip(skip).limit(limit)
        articles = await cursor.to_list(length=limit)
    except OperationFailure:
        return []

    return [await _populate_article_extras(db, a) for a in articles]


async def get_related_articles(
    db: AsyncIOMotorDatabase,
    article_id: str,
    limit: int = 5,
):
    """Get related articles (same category, exclude self, published only).
    Falls back to most recent if not enough in the same category."""
    article = await db["articles"].find_one({"_id": article_id}, {"category_id": 1})
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    category_id = article.get("category_id")
    same_category = await db["articles"].find(
        _public_query({"_id": {"$ne": article_id}, "category_id": category_id})
    ).sort("published_at", -1).limit(limit).to_list(length=limit)

    if len(same_category) >= limit:
        return [await _populate_article_extras(db, a) for a in same_category]

    seen = {article_id, *(a["_id"] for a in same_category)}
    remaining = limit - len(same_category)
    recent = await db["articles"].find(
        _public_query({"_id": {"$nin": list(seen)}})
    ).sort("published_at", -1).limit(remaining).to_list(length=remaining)

    combined = same_category + recent
    return [await _populate_article_extras(db, a) for a in combined]
