from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional, Any
from uuid import uuid4
from datetime import datetime

def generate_slug(title: str) -> str:
    """Generate a URL-friendly slug from title."""
    slug = title.lower()
    slug = slug.replace(" ", "-")
    slug = slug.replace("--", "-")
    slug = ''.join(c for c in slug if c.isalnum() or c == '-')
    return slug

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
    query = {}
    if category_id:
        query["category_id"] = category_id
    
    cursor = db["articles"].find(query).sort("published_at", -1).skip(skip).limit(limit)
    articles = await cursor.to_list(length=limit)
    
    populated_articles = []
    for article in articles:
        populated_articles.append(await _populate_article_extras(db, article))
        
    return populated_articles

async def get_trending_articles(db: AsyncIOMotorDatabase, limit: int = 10):
    """Get trending articles."""
    cursor = db["articles"].find({"is_trending": True}).sort("published_at", -1).limit(limit)
    articles = await cursor.to_list(length=limit)
    
    return [await _populate_article_extras(db, a) for a in articles]

async def get_breaking_articles(db: AsyncIOMotorDatabase, limit: int = 5):
    """Get breaking news articles."""
    cursor = db["articles"].find({"is_breaking": True}).sort("published_at", -1).limit(limit)
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
    slug = generate_slug(article_data.title)
    article_id = str(uuid4())
    
    article_doc = {
        "_id": article_id,
        "id": article_id,
        "slug": slug,
        "title": article_data.title,
        "summary": article_data.summary,
        "category_id": str(article_data.category_id),
        "read_time": article_data.read_time,
        "language": article_data.language,
        "is_trending": article_data.is_trending,
        "is_breaking": article_data.is_breaking,
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
        
    return await get_article_by_id(db, article_id)

async def delete_article(db: AsyncIOMotorDatabase, article_id: str):
    """Delete an article."""
    result = await db["articles"].delete_one({"_id": article_id})
    if result.deleted_count > 0:
        await db["article_content"].delete_many({"article_id": article_id})
        return True
    return False

async def search_articles(db: AsyncIOMotorDatabase, query: str, skip: int = 0, limit: int = 20):
    """Search articles by title, summary, or content."""
    cursor = db["articles"].find({
        "$or": [
            {"title": {"$regex": query, "$options": "i"}},
            {"summary": {"$regex": query, "$options": "i"}}
        ]
    }).sort("published_at", -1).skip(skip).limit(limit)
    
    articles = await cursor.to_list(length=limit)
    return [await _populate_article_extras(db, a) for a in articles]
