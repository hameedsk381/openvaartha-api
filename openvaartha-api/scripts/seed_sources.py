"""Seed categories + RSS sources across multiple topics so the automated
RSS -> AI-rewrite -> auto-publish pipeline (app/tasks/rss_generator.py) has
actual input to work with every 30 minutes.

Idempotent: safe to re-run — skips categories/sources that already exist by
name/feed_url rather than duplicating them.

Every feed below is an official, publicly documented RSS feed the publisher
maintains specifically for syndication (not a scrape) — e.g. BBC's RSS feed
index at bbc.co.uk/news/10628494, NASA's official feed list, TechCrunch's and
The Verge's documented /feed endpoints.

Usage: python scripts/seed_sources.py
"""
import sys
import os
from datetime import datetime, timezone
from uuid import uuid4

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from pymongo import MongoClient
from app.config import settings

# (category name, hex color, emoji)
CATEGORIES = [
    ("politics", "#641313", "🏛️"),
    ("technology", "#1e3a8a", "💻"),
    ("business", "#166534", "📈"),
    ("world", "#78350f", "🌍"),
    ("science", "#5b21b6", "🔬"),
    ("entertainment", "#9d174d", "🎬"),
    ("sports", "#0f766e", "🏆"),
]

# (source name, feed URL, category name)
SOURCES = [
    ("BBC News — World", "http://feeds.bbci.co.uk/news/world/rss.xml", "world"),
    ("BBC News — Politics", "http://feeds.bbci.co.uk/news/politics/rss.xml", "politics"),
    ("BBC News — Business", "http://feeds.bbci.co.uk/news/business/rss.xml", "business"),
    ("BBC News — Science & Environment", "http://feeds.bbci.co.uk/news/science_and_environment/rss.xml", "science"),
    ("BBC News — Entertainment & Arts", "http://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml", "entertainment"),
    ("BBC Sport", "http://feeds.bbci.co.uk/sport/rss.xml?edition=int", "sports"),
    ("TechCrunch", "https://techcrunch.com/feed/", "technology"),
    ("The Verge", "https://www.theverge.com/rss/index.xml", "technology"),
    ("NASA Breaking News", "https://www.nasa.gov/rss/dyn/breaking_news.rss", "science"),
]


def seed():
    client = MongoClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]

    category_ids: dict[str, str] = {}
    for name, color, emoji in CATEGORIES:
        existing = db["categories"].find_one({"name": {"$regex": f"^{name}$", "$options": "i"}})
        if existing:
            category_ids[name] = existing["_id"]
            print(f"= category exists: {name}")
            continue
        cat_id = str(uuid4())
        db["categories"].insert_one({
            "_id": cat_id,
            "name": name,
            "color_code": color,
            "emoji": emoji,
            "created_at": datetime.now(timezone.utc),
        })
        category_ids[name] = cat_id
        print(f"+ created category: {name}")

    for name, feed_url, category_name in SOURCES:
        if db["sources"].find_one({"feed_url": feed_url}):
            print(f"= source exists: {name}")
            continue
        db["sources"].insert_one({
            "_id": str(uuid4()),
            "name": name,
            "feed_url": feed_url,
            "category_id": category_ids[category_name],
            "language": "en",
            "active": True,
            "last_fetched_at": None,
            "created_at": datetime.now(timezone.utc),
        })
        print(f"+ created source: {name} -> {category_name}")

    print("\nDone. Sources will be picked up by the next scheduled run "
          "(every 30 min via celery-beat), or trigger one immediately with "
          "POST /api/v1/admin/sources/process.")


if __name__ == "__main__":
    seed()
