from app.models.article import Article
import hashlib
import logging
import re
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

import feedparser
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.config import settings
from app.core.sanitize import sanitize_html, sanitize_text
from app.services.ai_service import generate_article
from app.services.source_service import set_last_fetched

logger = logging.getLogger(__name__)


def _extract_thumbnail(entry) -> Optional[str]:
    """Try to pull an image URL from various RSS/Atom media extensions."""
    # media:content or media:thumbnail (feedparser normalises these)
    for attr in ("media_content", "media_thumbnail"):
        media = getattr(entry, attr, None)
        if media and isinstance(media, list):
            url = media[0].get("url", "")
            if url:
                return url

    # <enclosure> with image mime type
    for link in getattr(entry, "links", []):
        if link.get("type", "").startswith("image/"):
            return link.get("href", "")

    # Fallback: first <img> tag in content/summary HTML
    for html_field in ("summary", "description"):
        html = getattr(entry, html_field, "") or ""
        match = re.search(r'<img[^>]+src=["\']([^"\'>]+)', html)
        if match:
            return match.group(1)

    return None


def _parse_date(entry) -> Optional[datetime]:
    """Extract a datetime from a feed entry's published_parsed or updated_parsed.

    feedparser normalizes these to a UTC struct_time. ``time.mktime`` assumes
    its input is *local* time, so using it here silently shifted every
    RSS-sourced article's published_at by the server's UTC offset (a real bug
    on any container not running with TZ=UTC). ``calendar.timegm`` is the
    correct, timezone-independent inverse of a UTC struct_time.
    """
    for attr in ("published_parsed", "updated_parsed"):
        parsed = getattr(entry, attr, None)
        if parsed:
            try:
                from calendar import timegm
                return datetime.fromtimestamp(timegm(parsed), tz=timezone.utc)
            except Exception:
                continue
    return None


def _guid(entry) -> str:
    """Return a stable dedup key for a feed entry."""
    for attr in ("id", "link", "title"):
        val = getattr(entry, attr, None) or ""
        if val:
            return hashlib.sha256(val.encode()).hexdigest()
    return hashlib.sha256(str(entry).encode()).hexdigest()


async def fetch_and_parse(feed_url: str) -> list[dict]:
    """Fetch an RSS/Atom feed and return normalised entries.

    Each entry dict has: title, link, summary, content, published, guid, author.
    """
    loop = None
    try:
        import asyncio
        loop = asyncio.get_running_loop()
    except RuntimeError:
        pass

    if loop is not None:
        feed = await loop.run_in_executor(None, feedparser.parse, feed_url)
    else:
        feed = feedparser.parse(feed_url)

    if feed.bozo and not feed.entries:
        logger.warning("Failed to parse feed %s: %s", feed_url, feed.bozo_exception)
        return []

    entries = []
    for entry in feed.entries:
        published = _parse_date(entry)
        content_html = ""
        if hasattr(entry, "content") and entry.content:
            content_html = entry.content[0].get("value", "")
        elif hasattr(entry, "summary"):
            content_html = entry.summary or ""
        elif hasattr(entry, "description"):
            content_html = entry.description or ""

        entries.append({
            "guid": _guid(entry),
            "title": sanitize_text(getattr(entry, "title", "") or ""),
            "link": getattr(entry, "link", "") or "",
            "summary": sanitize_text(getattr(entry, "summary", "") or ""),
            "content": content_html,
            "published": published,
            "author": sanitize_text(getattr(entry, "author", "") or settings.APP_NAME),
            "thumbnail": _extract_thumbnail(entry),
        })

    return entries


def _estimate_read_time(text: str) -> str:
    """Rough read-time estimate based on word count."""
    words = len(text.split())
    minutes = max(1, round(words / 200))
    return f"{minutes} min"


async def process_source(db: AsyncIOMotorDatabase, source: dict) -> int:
    """Fetch RSS source, generate articles for new entries, save to DB.

    Returns the number of new articles created.
    """
    feed_url = source.get("feed_url", "")
    if not feed_url:
        return 0

    entries = await fetch_and_parse(feed_url)
    if not entries:
        return 0

    last_fetched = source.get("last_fetched_at")
    category_id = source.get("category_id", "")
    language = source.get("language", "en")
    auto_publish = source.get("auto_publish", settings.AUTO_PUBLISH_RSS)
    new_count = 0

    for entry in entries:
        published = entry["published"]

        if last_fetched and published and published <= last_fetched:
            continue

        guid = entry["guid"]
        existing = await Article_sources.find_one({"guid": guid, "source_id": source["_id"]})
        if existing:
            continue

        source_text = f"{entry['title']}\n\n{entry['content'] or entry['summary']}"
        if not source_text.strip():
            continue

        try:
            result = await generate_article(
                topic=entry["title"],
                source_content=source_text,
                web_search=False,
            )
        except Exception as e:
            logger.error("AI generation failed for entry %s: %s", guid, e)
            continue

        if not result:
            logger.warning("AI returned no result for entry %s", guid)
            continue

        article_id = str(uuid4())
        slug = _slugify(entry["title"]) or f"article-{article_id[:8]}"

        published_dt = published or datetime.now(timezone.utc)
        article_doc = {
            "_id": article_id,
            "slug": slug,
            "title": result["title"],
            "summary": result["summary"],
            "category_id": category_id,
            "read_time": _estimate_read_time(result.get("body", "")),
            "language": language,
            "status": "published" if auto_publish else "draft",
            "is_trending": False,
            "is_breaking": False,
            "is_editor_pick": False,
            "thumbnail_url": entry.get("thumbnail"),
            "instagram_url": None,
            "published_at": published_dt,
            "last_updated": datetime.now(timezone.utc),
            "author": entry.get("author") or settings.APP_NAME,
            "created_at": datetime.now(timezone.utc),
            # RSS-ingested articles carry no timeline/explainer content.
            "has_deep_content": False,
        }

        await Article(**article_doc).insert()

        content_doc = {
            "article_id": article_id,
            "tldr": result.get("tldr", ""),
            "points": result.get("points", []),
            "body": result.get("body", ""),
            "timeline": result.get("timeline", None),
            "explainer": result.get("explainer", None),
        }
        await Article_content(**content_doc).insert()
        
        from app.services.article_service import invalidate_article_caches
        await invalidate_article_caches()

        await Article_sources(**{
            "article_id": article_id,
            "source_id": source["_id"],
            "guid": guid,
            "url": entry.get("link", "").insert(),
        })

        new_count += 1

    await set_last_fetched(db, source["_id"])
    return new_count


def _slugify(text: str) -> str:
    import re
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[-\s]+", "-", text)
    return text[:100].strip("-")
