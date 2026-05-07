from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional, Any
from uuid import uuid4
from datetime import datetime
import json
from pymongo.errors import OperationFailure
from redis import asyncio as redis_async
from redis.exceptions import RedisError
from app.config import settings

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
    await db["articles"].create_index([("title", "text"), ("summary", "text")], name="articles_text_search")
    await db["articles"].create_index("slug", unique=True)
    await db["article_content"].create_index("article_id")
    await db["reading_history"].create_index([("user_id", 1), ("article_id", 1)], unique=True)

async def _populate_article_extras(db: AsyncIOMotorDatabase, article: dict) -> dict:
    """Populate category name and nested content for an article doc."""
    if not article:
        return article
        
    # Convert _id to id if needed
    if "_id" in article and "id" not in article:
        article["id"] = article["_id"]
        
    # Fetch category name
    if "category_id" in article:
        category = await db["categories"].find_one({"_id": article["category_id"]})
        if category:
            article["category"] = category["name"]
        else:
            article["category"] = "General"
            
    # Fetch content
    content = await db["article_content"].find_one({"article_id": article["_id"]})
    if content:
        article["content"] = content
        
    return article

async def get_articles(db: AsyncIOMotorDatabase, skip: int = 0, limit: int = 20, category_id: Optional[str] = None):
    """Get all articles with optional filtering."""
    key = _cache_key("list", skip=skip, limit=limit, category_id=category_id or "")
    cached = await _get_cached_list(key)
    if cached is not None:
        return cached

    query = {}
    if category_id:
        query["category_id"] = category_id
    
    cursor = db["articles"].find(query).sort("published_at", -1).skip(skip).limit(limit)
    articles = await cursor.to_list(length=limit)
    
    populated_articles = []
    for article in articles:
        populated_articles.append(await _populate_article_extras(db, article))
        
    await _set_cached_list(key, populated_articles)
    return populated_articles

async def get_trending_articles(db: AsyncIOMotorDatabase, limit: int = 10):
    """Get trending articles."""
    key = _cache_key("trending", limit=limit)
    cached = await _get_cached_list(key)
    if cached is not None:
        return cached

    cursor = db["articles"].find({"is_trending": True}).sort("published_at", -1).limit(limit)
    articles = await cursor.to_list(length=limit)
    
    populated = [await _populate_article_extras(db, a) for a in articles]
    await _set_cached_list(key, populated)
    return populated

async def get_breaking_articles(db: AsyncIOMotorDatabase, limit: int = 5):
    """Get breaking news articles."""
    key = _cache_key("breaking", limit=limit)
    cached = await _get_cached_list(key)
    if cached is not None:
        return cached

    cursor = db["articles"].find({"is_breaking": True}).sort("published_at", -1).limit(limit)
    articles = await cursor.to_list(length=limit)
    
    populated = [await _populate_article_extras(db, a) for a in articles]
    await _set_cached_list(key, populated)
    return populated

async def get_editor_pick_articles(db: AsyncIOMotorDatabase, limit: int = 10):
    """Get editor-curated articles."""
    cursor = db["articles"].find({"is_editor_pick": True}).sort("published_at", -1).limit(limit)
    articles = await cursor.to_list(length=limit)
    return [await _populate_article_extras(db, a) for a in articles]

async def get_explainer_articles(db: AsyncIOMotorDatabase, skip: int = 0, limit: int = 20):
    """Get articles with explainer or timeline content."""
    articles_with_content = await db["article_content"].find({
        "$or": [
            {"explainer": {"$ne": None, "$not": {"$size": 0}}},
            {"timeline": {"$ne": None, "$not": {"$size": 0}}}
        ]
    }).to_list(length=None)

    article_ids = [content["article_id"] for content in articles_with_content]
    cursor = db["articles"].find({"_id": {"$in": article_ids}}).sort("published_at", -1).skip(skip).limit(limit)
    articles = await cursor.to_list(length=limit)
    return [await _populate_article_extras(db, a) for a in articles]

async def get_article_by_slug(db: AsyncIOMotorDatabase, slug: str):
    """Get a single article by slug."""
    article = await db["articles"].find_one({"slug": slug})
    return await _populate_article_extras(db, article)

async def get_article_by_id(db: AsyncIOMotorDatabase, article_id: str):
    """Get a single article by ID."""
    article = await db["articles"].find_one({"_id": article_id})
    return await _populate_article_extras(db, article)

async def create_article(db: AsyncIOMotorDatabase, article_data: Any):
    """Create a new article."""
    slug = await generate_unique_slug(db, article_data.title)
    article_id = str(uuid4())
    
    article_doc = {
        "_id": article_id,
        "slug": slug,
        "title": article_data.title,
        "summary": article_data.summary,
        "category_id": str(article_data.category_id),
        "read_time": article_data.read_time,
        "language": article_data.language,
        "is_trending": article_data.is_trending,
        "is_breaking": article_data.is_breaking,
        "is_editor_pick": article_data.is_editor_pick,
        "thumbnail_url": article_data.thumbnail_url,
        "instagram_url": article_data.instagram_url,
        "published_at": article_data.published_at,
        "last_updated": article_data.last_updated or datetime.utcnow(),
        "author": article_data.author,
        "created_at": datetime.utcnow()
    }
    
    await db["articles"].insert_one(article_doc)
    
    if article_data.content:
        content_doc = {
            "article_id": article_id,
            "tldr": article_data.content.tldr,
            "points": article_data.content.points,
            "body": article_data.content.body,
            "timeline": article_data.content.timeline,
            "explainer": article_data.content.explainer
        }
        await db["article_content"].insert_one(content_doc)
    
    await invalidate_article_caches()
    return await get_article_by_id(db, article_id)

async def update_article(db: AsyncIOMotorDatabase, article_id: str, article_data: Any):
    """Update an existing article."""
    update_dict = article_data.model_dump(exclude_unset=True)
    content_data = update_dict.pop("content", None)
    
    if update_dict:
        update_dict["last_updated"] = datetime.utcnow()
        await db["articles"].update_one({"_id": article_id}, {"$set": update_dict})
        
    if content_data:
        await db["article_content"].update_one(
            {"article_id": article_id},
            {"$set": content_data},
            upsert=True
        )
    
    await invalidate_article_caches()
    return await get_article_by_id(db, article_id)

async def delete_article(db: AsyncIOMotorDatabase, article_id: str):
    """Delete an article."""
    result = await db["articles"].delete_one({"_id": article_id})
    if result.deleted_count > 0:
        await db["article_content"].delete_many({"article_id": article_id})
        await invalidate_article_caches()
        return True
    return False

async def search_articles(db: AsyncIOMotorDatabase, query: str, skip: int = 0, limit: int = 20):
    """Search articles by title and summary using MongoDB text search."""
    await ensure_article_indexes(db)
    try:
        cursor = db["articles"].find(
            {"$text": {"$search": query}},
            {"score": {"$meta": "textScore"}}
        ).sort([("score", {"$meta": "textScore"}), ("published_at", -1)]).skip(skip).limit(limit)
        articles = await cursor.to_list(length=limit)
    except OperationFailure:
        return []
    
    return [await _populate_article_extras(db, a) for a in articles]
