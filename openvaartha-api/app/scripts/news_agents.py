import asyncio
import logging
from datetime import datetime, timezone
from uuid import uuid4

import httpx
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.config import settings
from app.services.ai_service import generate_article
from app.core.sanitize import sanitize_html

logger = logging.getLogger(__name__)

async def fetch_newsapi(query: str, limit: int = 5) -> list[dict]:
    if not settings.NEWS_API_KEY:
        return []
    
    url = f"https://newsapi.org/v2/everything?q={query}&pageSize={limit}&apiKey={settings.NEWS_API_KEY}&language=en"
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(url, timeout=10.0)
            resp.raise_for_status()
            data = resp.json()
            articles = data.get("articles", [])
            return [
                {
                    "title": a.get("title"),
                    "url": a.get("url"),
                    "description": a.get("description") or a.get("content") or "",
                    "source_name": a.get("source", {}).get("name", "NewsAPI"),
                    "author": a.get("author") or "NewsAPI",
                    "thumbnail": a.get("urlToImage"),
                }
                for a in articles if a.get("title") and a.get("url")
            ]
        except Exception as e:
            logger.error(f"NewsAPI error for {query}: {e}")
            return []

async def fetch_mediastack(query: str, limit: int = 5) -> list[dict]:
    if not settings.MEDIASTACK_API_KEY:
        return []
        
    url = f"http://api.mediastack.com/v1/news?access_key={settings.MEDIASTACK_API_KEY}&keywords={query}&limit={limit}&languages=en"
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(url, timeout=10.0)
            resp.raise_for_status()
            data = resp.json()
            articles = data.get("data", [])
            return [
                {
                    "title": a.get("title"),
                    "url": a.get("url"),
                    "description": a.get("description") or "",
                    "source_name": a.get("source", "MediaStack"),
                    "author": a.get("author") or "MediaStack",
                    "thumbnail": a.get("image"),
                }
                for a in articles if a.get("title") and a.get("url")
            ]
        except Exception as e:
            logger.error(f"MediaStack error for {query}: {e}")
            return []

def _slugify(text: str) -> str:
    import re
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[-\s]+", "-", text)
    return text[:100].strip("-")

def _estimate_read_time(text: str) -> str:
    words = len(text.split())
    minutes = max(1, round(words / 200))
    return f"{minutes} min"

async def process_articles(db: AsyncIOMotorDatabase, raw_articles: list[dict], category_id: str):
    new_count = 0
    for raw in raw_articles:
        # Deduplicate based on URL
        url = raw["url"]
        existing = await db["article_sources"].find_one({"url": url})
        if existing:
            continue
            
        source_content = f"{raw['title']}\n\n{raw['description']}"
        if not source_content.strip():
            continue
            
        try:
            result = await generate_article(
                topic=raw["title"],
                source_content=source_content,
                web_search=False,
            )
        except Exception as e:
            logger.error(f"AI generation failed for {url}: {e}")
            continue
            
        if not result:
            continue
            
        article_id = str(uuid4())
        slug = _slugify(raw["title"]) or f"article-{article_id[:8]}"
        
        # We default to draft for automated scrape so editors can review the rich content
        article_doc = {
            "_id": article_id,
            "slug": slug,
            "title": result["title"],
            "summary": result["summary"],
            "category_id": category_id,
            "read_time": _estimate_read_time(result.get("body", "")),
            "language": "en",
            "status": "draft",
            "is_trending": False,
            "is_breaking": False,
            "is_editor_pick": False,
            "thumbnail_url": raw.get("thumbnail"),
            "instagram_url": None,
            "published_at": None,
            "last_updated": datetime.now(timezone.utc),
            "author": raw.get("author") or raw.get("source_name"),
            "created_at": datetime.now(timezone.utc),
            "has_deep_content": bool(result.get("timeline") or result.get("explainer")),
        }
        await db["articles"].insert_one(article_doc)
        
        content_doc = {
            "article_id": article_id,
            "tldr": result.get("tldr", ""),
            "points": result.get("points", []),
            "body": sanitize_html(result.get("body", "")),
            "timeline": result.get("timeline", None),
            "explainer": result.get("explainer", None),
        }
        await db["article_content"].insert_one(content_doc)
        
        await db["article_sources"].insert_one({
            "article_id": article_id,
            "source_id": "news-agent",
            "guid": url,
            "url": url,
        })
        
        new_count += 1
        
    return new_count

async def run_news_agents(db: AsyncIOMotorDatabase) -> int:
    """Run the automated News APIs scraping pipeline."""
    if not settings.NEWS_API_KEY and not settings.MEDIASTACK_API_KEY:
        logger.info("News Agents skipped: No API keys configured.")
        return 0
        
    categories = await db["categories"].find({}).to_list(length=None)
    total_new = 0
    
    for cat in categories:
        cat_name = cat.get("name")
        cat_id = cat.get("_id")
        if not cat_name:
            continue
            
        logger.info(f"News Agent fetching for category: {cat_name}")
        
        # Fetch from sources
        newsapi_articles = await fetch_newsapi(cat_name, limit=3)
        mediastack_articles = await fetch_mediastack(cat_name, limit=3)
        
        combined = newsapi_articles + mediastack_articles
        if not combined:
            continue
            
        added = await process_articles(db, combined, cat_id)
        total_new += added
        
    return total_new

if __name__ == "__main__":
    from app.database import db
    asyncio.run(run_news_agents(db))
