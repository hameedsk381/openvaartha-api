from app.models.article import Article
from app.models.reading_list import ReadingHistory
from app.models.category import Category
import re
import asyncio
import base64
import uuid
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
from app.services.gemini_service import generate_embedding
from app.services.indexnow_service import submit_article

import math
_redis_client: Optional[redis_async.Redis] = None

def _cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    if not vec1 or not vec2 or len(vec1) != len(vec2):
        return 0.0
    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    norm1 = math.sqrt(sum(a * a for a in vec1))
    norm2 = math.sqrt(sum(b * b for b in vec2))
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return dot_product / (norm1 * norm2)
def _json_default(value):
    if isinstance(value, datetime):
        return value.isoformat()
    raise TypeError(f"Object of type {type(value).__name__} is not JSON serializable")

import asyncio

def _save_base64_thumbnail_sync(thumbnail_url: str) -> str:
    """Decode a base64 data-URI thumbnail, compress it to WebP, and upload it to
    Google Cloud Storage, returning the public GCS URL.

    Raises HTTPException on any failure (unconfigured storage, invalid image, or
    a failed upload) so that raw base64 is never persisted to the database.
    Non-data-URI values (e.g. an already-hosted URL) are passed through unchanged.
    """
    if not thumbnail_url or not thumbnail_url.startswith("data:image/"):
        return thumbnail_url

    if not settings.GCS_BUCKET_NAME:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Image storage is not configured (GCS_BUCKET_NAME is unset).",
        )

    try:
        # Format: data:image/png;base64,iVBORw0KGgoAAA...
        header, base64_data = thumbnail_url.split(";base64,", 1)

        file_bytes = base64.b64decode(base64_data)

        # Compress and resize using Pillow
        from PIL import Image
        import io

        img = Image.open(io.BytesIO(file_bytes))

        # Convert to RGB (to support saving as WebP)
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")

        # Resize if width is larger than 800px (to optimize for web card display)
        max_width = 800
        if img.width > max_width:
            ratio = max_width / float(img.width)
            new_height = int(float(img.height) * float(ratio))
            img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)

        # Output as WebP
        out_io = io.BytesIO()
        img.save(out_io, format="WEBP", quality=75)
        compressed_bytes = out_io.getvalue()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid image data: {e}",
        )

    filename = f"{uuid.uuid4().hex}.webp"
    try:
        from app.services.storage_service import upload_image_bytes
        return upload_image_bytes(compressed_bytes, content_type="image/webp")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload image: {e}",
        )

async def _save_base64_thumbnail(thumbnail_url: str) -> str:
    return await asyncio.to_thread(_save_base64_thumbnail_sync, thumbnail_url)


from app.core.cache import fetch_with_cache_and_lock, get_redis

def _cache_key(namespace: str, **parts: Any) -> str:
    suffix = ":".join(f"{key}={parts[key]}" for key in sorted(parts))
    return f"openvaartha:articles:{namespace}:{suffix}"


def _article_detail_key(slug: str) -> str:
    # Under the ``openvaartha:articles:`` namespace so invalidate_article_caches
    # clears it alongside the list caches on any mutation.
    return f"openvaartha:articles:detail:slug={slug}"


# Keep strong references to fire-and-forget tasks so they aren't garbage
# collected mid-flight (asyncio only holds a weak reference).
_background_tasks: set = set()


def _fire_and_forget(coro) -> None:
    task = asyncio.create_task(coro)
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)


async def _increment_view_count(db: AsyncIOMotorDatabase, slug: str) -> None:
    try:
        await Article.get_motor_collection().update_one(
            _public_query({"slug": slug}), {"$inc": {"view_count": 1}}
        )
    except Exception:
        # A dropped view count must never surface as a request error.
        pass


async def invalidate_article_caches() -> None:
    """Clear cached article list variants after article mutations."""
    try:
        redis = await get_redis()
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
    while await Article.get_motor_collection().find_one({"slug": slug}, {"_id": 1}):
        slug = f"{base_slug}-{suffix}"
        suffix += 1
    return slug


async def _backfill_deep_content_flag(db: AsyncIOMotorDatabase) -> None:
    """One-time: populate ``has_deep_content`` on articles created before the flag
    existed. Idempotent — only touches docs still missing the field, so it's a
    no-op on every boot after the first. (Also corrects a latent bug in the old
    ``/explainers`` query, which used the array operator ``$size`` on the
    dict-typed ``explainer`` field and so never matched explainer-only articles.)"""
    missing = await Article.get_motor_collection().find(
        {"has_deep_content": {"$exists": False}}, {"_id": 1}
    ).to_list(length=None)
    if not missing:
        return
    missing_ids = [a["_id"] for a in missing]

    deep = await db["article_content"].find(
        {
            "article_id": {"$in": missing_ids},
            "$or": [
                {"timeline": {"$nin": [None, []]}},
                {"explainer": {"$nin": [None, {}]}},
            ],
        },
        {"article_id": 1},
    ).to_list(length=None)
    deep_ids = {c["article_id"] for c in deep}

    if deep_ids:
        await Article.get_motor_collection().update_many(
            {"_id": {"$in": list(deep_ids)}}, {"$set": {"has_deep_content": True}}
        )
    remaining = [i for i in missing_ids if i not in deep_ids]
    if remaining:
        await Article.get_motor_collection().update_many(
            {"_id": {"$in": remaining}}, {"$set": {"has_deep_content": False}}
        )


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
        await Article.get_motor_collection().create_index(
            [("title", "text"), ("summary", "text")], **_text_index_opts
        )
    except OperationFailure:
        # An older index with the same name but default language options exists
        # (pre-fix deployments) — rebuild it with the corrected options.
        await Article.get_motor_collection().drop_index("articles_text_search")
        await Article.get_motor_collection().create_index(
            [("title", "text"), ("summary", "text")], **_text_index_opts
        )
    await Article.get_motor_collection().create_index("slug", unique=True)
    await Article.get_motor_collection().create_index("status")
    
    # Compound indexes for fast, sorted lookups without memory sorts
    await Article.get_motor_collection().create_index([("status", 1), ("published_at", -1)])
    await Article.get_motor_collection().create_index([("category_id", 1), ("status", 1), ("published_at", -1)])
    await Article.get_motor_collection().create_index([("is_breaking", 1), ("status", 1), ("published_at", -1)])
    await Article.get_motor_collection().create_index([("is_opinion", 1), ("status", 1), ("published_at", -1)])
    await Article.get_motor_collection().create_index([("is_trending", 1), ("status", 1)])
    await Article.get_motor_collection().create_index([("is_editor_pick", 1), ("status", 1)])
    # Contributor dashboard ("my posts") filters by author_id.
    await Article.get_motor_collection().create_index([("author_id", 1), ("status", 1), ("published_at", -1)])
    # /explainers feed: query the denormalized flag directly instead of scanning content.
    await Article.get_motor_collection().create_index([("has_deep_content", 1), ("status", 1), ("published_at", -1)])
    
    # reading history index
    await ReadingHistory.get_motor_collection().create_index([("user_id", 1), ("read_at", -1)])

    await _backfill_deep_content_flag(db)

    await db["article_content"].create_index("article_id")
    await db["article_sources"].create_index(
        [("source_id", 1), ("guid", 1)], unique=True
    )
    await db["article_corrections"].create_index([("article_id", 1), ("corrected_at", -1)])
    await db["article_revisions"].create_index([("article_id", 1), ("revision", -1)], unique=True)
    await ReadingHistory.get_motor_collection().create_index([("user_id", 1), ("article_id", 1)], unique=True)
    await ensure_comment_indexes(db)
    from app.services.reaction_service import ensure_reaction_indexes
    await ensure_reaction_indexes(db)
    await Article.get_motor_collection().create_index("tags")
    await Article.get_motor_collection().create_index([("tags", 1), ("status", 1), ("published_at", -1)])

    # Auto-migration for existing base64 thumbnails in database
    try:
        async for art in Article.get_motor_collection().find({"thumbnail_url": {"$regex": "^data:image/"}}):
            old_url = art.get("thumbnail_url")
            new_url = await _save_base64_thumbnail(old_url)
            if new_url != old_url:
                await Article.get_motor_collection().update_one({"_id": art["_id"]}, {"$set": {"thumbnail_url": new_url}})
                print(f"Migrated base64 thumbnail to file for article {art.get('slug')}")
    except Exception as e:
        print(f"Failed to migrate base64 thumbnails: {e}")
        import sentry_sdk
        sentry_sdk.capture_exception(e)  # no-op if SENTRY_DSN unset

    # Backfill: documents created before the status field defaulted to draft
    # would be invisible to the public list. Treat un-tagged docs as published
    # so existing inventories migrate cleanly.
    await Article.get_motor_collection().update_many(
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
        category = await Category.get_motor_collection().find_one({"_id": article["category_id"]})
        if category:
            article["category"] = category["name"]
        else:
            article["category"] = "General"

    content = await db["article_content"].find_one({"article_id": article.get("id")})
    if content:
        if "_id" in content:
            content["id"] = str(content.pop("_id"))
        article["content"] = content

    citations = await db["article_sources"].find(
        {"article_id": article.get("id")},
        {"_id": 0, "publisher": 1, "url": 1, "published_at": 1},
    ).to_list(length=50)
    article["citations"] = citations

    corrections = await db["article_corrections"].find(
        {"article_id": article.get("id")},
        {"_id": 0, "id": 1, "summary": 1, "details": 1, "reason": 1, "severity": 1,
         "corrected_at": 1, "editor_id": 1, "editor_name": 1, "before": 1, "after": 1},
    ).sort("corrected_at", -1).to_list(length=50)
    article["corrections"] = corrections

    return article


async def _populate_articles_bulk(db: AsyncIOMotorDatabase, articles: list[dict]) -> list[dict]:
    """Bulk populate category names and contents for a list of article documents to avoid roundtrip latency."""
    if not articles:
        return articles

    # 1. Bulk load all categories (small collection, usually < 10 docs)
    categories = await Category.get_motor_collection().find().to_list(length=100)
    cat_map = {}
    for cat in categories:
        cid = str(cat.get("_id") or cat.get("id") or "")
        if cid:
            cat_map[cid] = cat.get("name", "General")

    # 2. Standardize article ID formats and collect IDs for batch query
    article_ids = []
    for a in articles:
        if a is None:
            continue
        if "_id" in a:
            a["id"] = str(a.pop("_id"))
        a.setdefault("status", PUBLIC_STATUS)
        
        aid = a.get("id")
        if aid:
            article_ids.append(aid)

    # 3. Batch query article contents using $in (exclude large body field for list endpoints)
    content_map = {}
    if article_ids:
        contents = await db["article_content"].find(
            {"article_id": {"$in": article_ids}},
            {"body": 0}
        ).to_list(length=len(article_ids))
        for c in contents:
            cid = c.get("article_id")
            if cid:
                if "_id" in c:
                    c["id"] = str(c.pop("_id"))
                content_map[cid] = c

    # 4. Map the fetched data back to each article in-memory
    for a in articles:
        if a is None:
            continue
        
        # Map Category Name
        cid = a.get("category_id")
        if cid:
            if isinstance(cid, ObjectId):
                cid = str(cid)
            a["category"] = cat_map.get(cid, "General")
        else:
            a["category"] = "General"

        # Map Content
        aid = a.get("id")
        if aid:
            a["content"] = content_map.get(aid)

    return articles



async def get_articles(
    db: AsyncIOMotorDatabase,
    skip: int = 0,
    limit: int = 20,
    category_id: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    include_unpublished: bool = False,
    is_opinion: Optional[bool] = None,
    author_id: Optional[str] = None,
    tag: Optional[str] = None,
):
    """Get articles. Public callers see only published items;
    callers in admin contexts may opt in to all statuses."""
    key = _cache_key(
        "list",
        skip=skip,
        limit=limit,
        category_id=category_id or "",
        status=status or "",
        search=search or "",
        is_opinion=str(is_opinion) if is_opinion is not None else "",
        author_id=author_id or "",
        tag=tag or "",
        scope="all" if include_unpublished else "public",
    )
    async def _fetch():
        query: dict = {} if include_unpublished else _public_query()
        if category_id:
            query["category_id"] = category_id
        if status:
            query["status"] = status
        if search:
            query["$text"] = {"$search": search}
        if is_opinion is not None:
            query["is_opinion"] = is_opinion
        if author_id is not None:
            query["author_id"] = author_id
        if tag:
            query["tags"] = tag.lower()

        cursor = Article.get_motor_collection().find(query, {"embedding": 0}).sort("published_at", -1).skip(skip).limit(limit)
        articles = await cursor.to_list(length=limit)
        return await _populate_articles_bulk(db, articles)

    if not include_unpublished:
        return await fetch_with_cache_and_lock(key, settings.CACHE_TTL_SECONDS, _fetch)
    return await _fetch()


async def get_popular_tags(db: AsyncIOMotorDatabase, limit: int = 20) -> List[dict]:
    """Get most frequent tags across published articles."""
    key = _cache_key("popular_tags", limit=limit)
    async def _fetch():
        pipeline = [
            {"$match": _public_query({"tags": {"$exists": True, "$ne": []}})},
            {"$unwind": "$tags"},
            {"$group": {"_id": "$tags", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": limit},
            {"$project": {"_id": 0, "name": "$_id", "count": "$count"}},
        ]
        cursor = Article.get_motor_collection().aggregate(pipeline)
        return await cursor.to_list(length=limit)

    return await fetch_with_cache_and_lock(key, settings.CACHE_TTL_SECONDS, _fetch)


async def get_trending_articles(db: AsyncIOMotorDatabase, limit: int = 10):
    """Get trending articles (published only)."""
    key = _cache_key("trending", limit=limit)
    async def _fetch():
        cursor = Article.get_motor_collection().find(_public_query({"is_trending": True}), {"embedding": 0}).sort("published_at", -1).limit(limit)
        articles = await cursor.to_list(length=limit)
        return await _populate_articles_bulk(db, articles)

    return await fetch_with_cache_and_lock(key, settings.CACHE_TTL_SECONDS, _fetch)


async def get_for_you_articles(db: AsyncIOMotorDatabase, user_id: Optional[str] = None, limit: int = 15):
    """Personalized 'For You' feed based on reader history category affinity.
    Falls back to a blend of trending & latest for anonymous or new users."""
    if not user_id:
        return await get_trending_articles(db, limit=limit)

    # Fetch user's recent reading history
    history = await ReadingHistory.get_motor_collection().find({"user_id": user_id}).sort("read_at", -1).to_list(length=20)
    if not history:
        return await get_trending_articles(db, limit=limit)

    read_article_ids = [h["article_id"] for h in history]

    # Retrieve embeddings for read articles
    read_articles = await Article.get_motor_collection().find(
        {"_id": {"$in": read_article_ids}, "embedding": {"$exists": True, "$ne": None}}, 
        {"embedding": 1, "category_id": 1}
    ).to_list(length=20)

    # If no embeddings found in history, fallback to category logic
    if not read_articles:
        read_articles_fallback = await Article.get_motor_collection().find({"_id": {"$in": read_article_ids}}, {"category_id": 1}).to_list(length=50)
        cat_counts = {}
        for a in read_articles_fallback:
            cid = a.get("category_id")
            if cid:
                cat_counts[cid] = cat_counts.get(cid, 0) + 1
        
        if not cat_counts:
            return await get_trending_articles(db, limit=limit)
            
        top_categories = sorted(cat_counts.keys(), key=lambda c: cat_counts[c], reverse=True)[:3]
        query = _public_query({
            "category_id": {"$in": top_categories},
            "_id": {"$nin": read_article_ids},
        })
        cursor = Article.get_motor_collection().find(query, {"embedding": 0}).sort("published_at", -1).limit(limit)
        articles = await cursor.to_list(length=limit)
        
        if len(articles) < limit:
            remaining = limit - len(articles)
            fetched_ids = [a["_id"] for a in articles] + read_article_ids
            fallback_cursor = Article.get_motor_collection().find(_public_query({"_id": {"$nin": fetched_ids}}), {"embedding": 0}).sort("published_at", -1).limit(remaining)
            articles.extend(await fallback_cursor.to_list(length=remaining))
            
        return await _populate_articles_bulk(db, articles)

    # Compute average embedding (profile vector)
    embeddings = [a["embedding"] for a in read_articles if "embedding" in a]
    if not embeddings:
        return await get_trending_articles(db, limit=limit)
        
    embedding_length = len(embeddings[0])
    profile_vector = [sum(e[i] for e in embeddings) / len(embeddings) for i in range(embedding_length)]

    # Fetch pool of recent unread articles to rank
    pool_cursor = Article.get_motor_collection().find(
        _public_query({"_id": {"$nin": read_article_ids}, "embedding": {"$exists": True, "$ne": None}}),
        {"title": 1, "summary": 1, "category_id": 1, "published_at": 1, "thumbnail_url": 1, "author": 1, "slug": 1, "status": 1, "read_time": 1, "embedding": 1}
    ).sort("published_at", -1).limit(200) # Get a decent pool of recent articles
    
    article_pool = await pool_cursor.to_list(length=200)
    
    if not article_pool:
        # No unread articles with embeddings, just return trending
        return await get_trending_articles(db, limit=limit)

    # Rank by cosine similarity
    for article in article_pool:
        article["_sim_score"] = _cosine_similarity(profile_vector, article["embedding"])

    article_pool.sort(key=lambda a: a["_sim_score"], reverse=True)
    top_articles = article_pool[:limit]

    # Remove the temporary score and embedding before populating (though they'd be ignored by schema, good to clean up)
    for article in top_articles:
        article.pop("_sim_score", None)
        article.pop("embedding", None)

    return await _populate_articles_bulk(db, top_articles)


async def get_breaking_articles(db: AsyncIOMotorDatabase, limit: int = 5):
    """Get breaking news articles (published only)."""
    key = _cache_key("breaking", limit=limit)
    async def _fetch():
        cursor = Article.get_motor_collection().find(_public_query({"is_breaking": True}), {"embedding": 0}).sort("published_at", -1).limit(limit)
        articles = await cursor.to_list(length=limit)
        return await _populate_articles_bulk(db, articles)

    return await fetch_with_cache_and_lock(key, settings.CACHE_TTL_SECONDS, _fetch)


async def get_editor_pick_articles(db: AsyncIOMotorDatabase, limit: int = 10):
    """Get editor-curated articles (published only)."""
    key = _cache_key("editor_pick", limit=limit)
    async def _fetch():
        cursor = Article.get_motor_collection().find(_public_query({"is_editor_pick": True}), {"embedding": 0}).sort("published_at", -1).limit(limit)
        articles = await cursor.to_list(length=limit)
        return await _populate_articles_bulk(db, articles)

    return await fetch_with_cache_and_lock(key, settings.CACHE_TTL_SECONDS, _fetch)


async def get_explainer_articles(db: AsyncIOMotorDatabase, skip: int = 0, limit: int = 20):
    """Get articles with explainer or timeline content (published only).

    Uses the denormalized ``has_deep_content`` flag (kept in sync on create/update
    and backfilled at startup) so this is a single indexed, paginated query
    instead of loading the entire ``article_content`` collection into memory.
    """
    key = _cache_key("explainers", skip=skip, limit=limit)
    async def _fetch():
        query = _public_query({"has_deep_content": True})
        cursor = Article.get_motor_collection().find(query, {"embedding": 0}).sort("published_at", -1).skip(skip).limit(limit)
        articles = await cursor.to_list(length=limit)
        return await _populate_articles_bulk(db, articles)

    return await fetch_with_cache_and_lock(key, settings.CACHE_TTL_SECONDS, _fetch)


async def get_article_by_slug(
    db: AsyncIOMotorDatabase,
    slug: str,
    include_unpublished: bool = False,
    count_view: bool = True,
):
    """Get a single article by slug. Drafts/archived are hidden unless caller is admin.

    ``count_view`` lets non-primary readers (e.g. the server-rendered article
    shell) fetch without inflating the view counter — the client's own
    ``/api/v1/articles/{slug}`` fetch on the same page load owns the count.
    """
    if include_unpublished:
        # Admin reads bypass the cache so drafts/edits are always seen fresh.
        article = await Article.get_motor_collection().find_one({"slug": slug})
        return await _populate_article_extras(db, article)

    # Count the view off the request's critical path (fire-and-forget) so it
    # never blocks the read; the cached copy's view_count may lag by up to the
    # cache TTL, which is acceptable for a read-heavy news feed.
    if count_view:
        _fire_and_forget(_increment_view_count(db, slug))

    async def _fetch():
        article = await Article.get_motor_collection().find_one(_public_query({"slug": slug}))
        return await _populate_article_extras(db, article)

    key = _article_detail_key(slug)
    return await fetch_with_cache_and_lock(key, settings.CACHE_TTL_SECONDS, _fetch)


async def get_article_by_id(
    db: AsyncIOMotorDatabase,
    article_id: str,
    include_unpublished: bool = False,
):
    """Get a single article by ID. Drafts/archived are hidden unless caller is admin."""
    if include_unpublished:
        article = await Article.get_motor_collection().find_one({"_id": article_id})
    else:
        article = await Article.get_motor_collection().find_one(_public_query({"_id": article_id}))
    return await _populate_article_extras(db, article)


async def _assert_category_exists(db: AsyncIOMotorDatabase, category_id: str) -> None:
    if not await Category.get_motor_collection().find_one({"_id": str(category_id)}, {"_id": 1}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown category_id: {category_id}",
        )


def _has_deep_content(content: Any) -> bool:
    """Whether an article carries explainer or timeline content (drives the
    ``/explainers`` feed). This boolean is denormalized onto the article doc so
    the feed is a single indexed query instead of a full scan of the
    ``article_content`` collection. Handles both pydantic content objects and
    raw dicts; empty dict/list/None all count as "no deep content"."""
    if content is None:
        return False
    if isinstance(content, dict):
        timeline = content.get("timeline")
        explainer = content.get("explainer")
    else:
        timeline = getattr(content, "timeline", None)
        explainer = getattr(content, "explainer", None)
    return bool(timeline) or bool(explainer)


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
        "scheduled_at": getattr(article_data, "scheduled_at", None),
        "tags": [tag.strip().lower() for tag in getattr(article_data, "tags", []) if tag.strip()],
        "is_trending": article_data.is_trending,
        "is_breaking": article_data.is_breaking,
        "is_editor_pick": article_data.is_editor_pick,
        "is_opinion": getattr(article_data, "is_opinion", False),
        "thumbnail_url": await _save_base64_thumbnail(article_data.thumbnail_url),
        "instagram_url": article_data.instagram_url,
        "published_at": article_data.published_at,
        "last_updated": article_data.last_updated or datetime.now(timezone.utc),
        "author": sanitize_text(article_data.author),
        "author_id": getattr(article_data, "author_id", None),
        "created_at": datetime.now(timezone.utc),
        "has_deep_content": _has_deep_content(getattr(article_data, "content", None)),
    }

    await Article(**article_doc).insert()

    if article_data.content:
        content_doc = {
            "article_id": article_id,
            "tldr": sanitize_text(article_data.content.tldr),
            "points": sanitize_points(article_data.content.points) or [],
            "body": sanitize_html(article_data.content.body),
            "timeline": article_data.content.timeline,
            "explainer": article_data.content.explainer,
            "video_url": article_data.content.video_url,
            "poll_id": article_data.content.poll_id,
            "fact_check": (
                article_data.content.fact_check.model_dump()
                if article_data.content.fact_check
                else None
            ),
        }
        await db["article_content"].insert_one(content_doc)

    # Generate vector embedding for personalization
    text_to_embed = f"{article_data.title}\n{article_data.summary}"
    tags = getattr(article_data, "tags", [])
    if tags:
        text_to_embed += f"\nTags: {', '.join(tags)}"
    
    embedding = await generate_embedding(text_to_embed)
    if embedding:
        await Article.get_motor_collection().update_one(
            {"_id": article_id}, 
            {"$set": {"embedding": embedding}}
        )

    await invalidate_article_caches()
    created = await get_article_by_id(db, article_id, include_unpublished=True)
    if article_status == PUBLIC_STATUS:
        _fire_and_forget(submit_article(created.get("slug") or slug))
    return created


_PLAIN_TEXT_FIELDS = {"title", "summary", "author"}


async def update_article(
    db: AsyncIOMotorDatabase,
    article_id: str,
    article_data: Any,
    editor_id: Optional[str] = None,
):
    """Update an existing article. Only fields the caller actually sent are touched.

    Partial nested-content updates are merged with ``$set`` on dotted paths so
    omitted keys don't wipe their siblings.
    """
    update_dict = article_data.model_dump(exclude_unset=True)
    content_data = update_dict.pop("content", None)

    # Save the exact pre-edit state before mutating it. Revisions are append
    # only; they provide an auditable record rather than a browser-local undo.
    if update_dict or content_data:
        previous_article = await Article.get_motor_collection().find_one(
            {"_id": article_id}, {"embedding": 0}
        )
        if previous_article:
            previous_content = await db["article_content"].find_one(
                {"article_id": article_id}, {"_id": 0}
            )
            revision_number = await db["article_revisions"].count_documents(
                {"article_id": article_id}
            ) + 1
            await db["article_revisions"].insert_one({
                "article_id": article_id,
                "revision": revision_number,
                "editor_id": editor_id,
                "created_at": datetime.now(timezone.utc),
                "article": previous_article,
                "content": previous_content,
            })

    if "category_id" in update_dict:
        await _assert_category_exists(db, update_dict["category_id"])

    if "status" in update_dict and hasattr(update_dict["status"], "value"):
        update_dict["status"] = update_dict["status"].value

    if "thumbnail_url" in update_dict:
        update_dict["thumbnail_url"] = await _save_base64_thumbnail(update_dict["thumbnail_url"])

    for field in _PLAIN_TEXT_FIELDS:
        if field in update_dict and update_dict[field] is not None:
            update_dict[field] = sanitize_text(update_dict[field])

    if update_dict:
        prev = await Article.get_motor_collection().find_one({"_id": article_id}, {"slug": 1, "status": 1, "published_at": 1})
        prev_status = prev.get("status") if prev else None
        prev_slug = prev.get("slug") if prev else ""

        # If the article is being published, ensure it has a published_at date
        if update_dict.get("status") == PUBLIC_STATUS:
            if not prev or not prev.get("published_at"):
                update_dict["published_at"] = datetime.now(timezone.utc)

        update_dict["last_updated"] = datetime.now(timezone.utc)
        update_dict["updated_at"] = datetime.now(timezone.utc)

        # Newly published → tell Bing/IndexNow immediately (best-effort, async,
        # never blocks or raises on failure).
        becoming_published = (
            update_dict.get("status") == PUBLIC_STATUS
            and prev_status != PUBLIC_STATUS
            and prev_slug
        )
        if becoming_published:
            _fire_and_forget(submit_article(prev_slug))

        await Article.get_motor_collection().update_one({"_id": article_id}, {"$set": update_dict})

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

        # Keep the denormalized ``has_deep_content`` flag in sync whenever the
        # deep-content fields are touched. Reads back the merged content since
        # updates are partial and either field alone can flip the flag.
        if "timeline" in content_data or "explainer" in content_data:
            merged = await db["article_content"].find_one(
                {"article_id": article_id}, {"timeline": 1, "explainer": 1}
            )
            await Article.get_motor_collection().update_one(
                {"_id": article_id},
                {"$set": {"has_deep_content": _has_deep_content(merged)}},
            )

    if "title" in update_dict or "summary" in update_dict or "tags" in update_dict:
        existing = await Article.get_motor_collection().find_one({"_id": article_id}, {"title": 1, "summary": 1, "tags": 1})
        if existing:
            title = update_dict.get("title", existing.get("title", ""))
            summary = update_dict.get("summary", existing.get("summary", ""))
            tags = update_dict.get("tags", existing.get("tags", []))
            
            text_to_embed = f"{title}\n{summary}"
            if tags:
                text_to_embed += f"\nTags: {', '.join(tags)}"
                
            embedding = await generate_embedding(text_to_embed)
            if embedding:
                await Article.get_motor_collection().update_one(
                    {"_id": article_id}, 
                    {"$set": {"embedding": embedding}}
                )

    await invalidate_article_caches()
    return await get_article_by_id(db, article_id, include_unpublished=True)


async def delete_article(db: AsyncIOMotorDatabase, article_id: str):
    """Delete an article."""
    result = await Article.get_motor_collection().delete_one({"_id": article_id})
    if result.deleted_count > 0:
        await db["article_content"].delete_many({"article_id": article_id})
        await invalidate_article_caches()
        return True
    return False


async def search_articles(db: AsyncIOMotorDatabase, query: str, skip: int = 0, limit: int = 20, category: Optional[str] = None):
    """Search published articles by title and summary with optional category filter."""

    text_filter = {"$text": {"$search": query}}
    if category:
        category_doc = await Category.get_motor_collection().find_one({"name": {"$regex": f"^{re.escape(category)}$", "$options": "i"}})
        if category_doc:
            text_filter["category_id"] = category_doc["_id"]

    try:
        cursor = Article.get_motor_collection().find(
            _public_query(text_filter),
            {"score": {"$meta": "textScore"}, "embedding": 0},
        ).sort([("score", {"$meta": "textScore"}), ("published_at", -1)]).skip(skip).limit(limit)
        articles = await cursor.to_list(length=limit)
    except OperationFailure:
        return []

    return await _populate_articles_bulk(db, articles)


async def get_related_articles(
    db: AsyncIOMotorDatabase,
    article_id: str,
    limit: int = 5,
):
    """Get related articles (same category, exclude self, published only).
    Falls back to most recent if not enough in the same category."""
    article = await Article.get_motor_collection().find_one({"$or": [{"_id": article_id}, {"slug": article_id}]}, {"category_id": 1, "_id": 1})
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    actual_id = article["_id"]
    category_id = article.get("category_id")
    same_category = await Article.get_motor_collection().find(
        _public_query({"_id": {"$ne": actual_id}, "category_id": category_id}),
        {"embedding": 0}
    ).sort("published_at", -1).limit(limit).to_list(length=limit)

    if len(same_category) >= limit:
        return await _populate_articles_bulk(db, same_category)

    seen = {actual_id, *(a["_id"] for a in same_category)}
    remaining = limit - len(same_category)
    recent = await Article.get_motor_collection().find(
        _public_query({"_id": {"$nin": list(seen)}}),
        {"embedding": 0}
    ).sort("published_at", -1).limit(remaining).to_list(length=remaining)

    combined = same_category + recent
    return await _populate_articles_bulk(db, combined)
