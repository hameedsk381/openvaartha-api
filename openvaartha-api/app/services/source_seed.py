"""Idempotent category + RSS source seeding, run automatically at API startup.

The API container is the single writer that runs this at boot (in the app
lifespan), so a fresh `docker compose up --build -d` on the server seeds the
India-focused source catalog without manual steps.

Design notes:
  * Everything is idempotent — safe to run on every startup.
  * Sources are matched by ``feed_url``; existing ones are never duplicated.
  * Only *known legacy* feeds are deactivated when missing from the catalog,
    never arbitrary admin-created sources (those are managed via the admin API).
"""
from datetime import datetime, timezone
from uuid import uuid4

from motor.motor_asyncio import AsyncIOMotorDatabase

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
    ("The Hindu — National", "https://www.thehindu.com/news/national/feeder/default.rss", "politics"),
    ("The Hindu — Top Stories", "https://www.thehindu.com/feeder/default.rss", "politics"),
    ("Hindustan Times — Top Stories", "https://www.hindustantimes.com/feeds/rss/top-news/rssfeed.xml", "politics"),
    ("Indian Express — Politics", "https://indianexpress.com/section/political-pulse/feed/", "politics"),
    ("The Hindu — Sci-Tech", "https://www.thehindu.com/sci-tech/feeder/default.rss", "technology"),
    ("Indian Express — Technology", "https://indianexpress.com/section/technology/feed/", "technology"),
    ("Mint — Technology", "https://www.livemint.com/rss/technology", "technology"),
    ("The Hindu — Business", "https://www.thehindu.com/business/feeder/default.rss", "business"),
    ("Indian Express — Business", "https://indianexpress.com/section/business/feed/", "business"),
    ("Mint — Markets & Economy", "https://www.livemint.com/rss/markets", "business"),
    ("The Hindu — World", "https://www.thehindu.com/news/international/feeder/default.rss", "world"),
    ("Indian Express — World", "https://indianexpress.com/section/world/feed/", "world"),
    ("Hindustan Times — World", "https://www.hindustantimes.com/feeds/rss/world-news/rssfeed.xml", "world"),
    ("The Hindu — Science", "https://www.thehindu.com/sci-tech/science/feeder/default.rss", "science"),
    ("Indian Express — Entertainment", "https://indianexpress.com/section/entertainment/feed/", "entertainment"),
    ("The Hindu — Entertainment", "https://www.thehindu.com/entertainment/feeder/default.rss", "entertainment"),
    ("The Hindu — Sports", "https://www.thehindu.com/sport/feeder/default.rss", "sports"),
    ("Indian Express — Sports", "https://indianexpress.com/section/sports/feed/", "sports"),
    ("Hindustan Times — Sports", "https://www.hindustantimes.com/feeds/rss/sports/rssfeed.xml", "sports"),
]

# Feeds previously shipped that we removed from the catalog. On boot we
# deactivate these exact URLs so old (non-India) articles stop being ingested,
# while leaving any admin-created sources untouched.
LEGACY_FEEDS = [
    "http://feeds.bbci.co.uk/news/world/rss.xml",
    "http://feeds.bbci.co.uk/news/politics/rss.xml",
    "http://feeds.bbci.co.uk/news/business/rss.xml",
    "http://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
    "http://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml",
    "http://feeds.bbci.co.uk/sport/rss.xml?edition=int",
    "https://techcrunch.com/feed/",
    "https://www.theverge.com/rss/index.xml",
    "https://www.nasa.gov/rss/dyn/breaking_news.rss",
]


async def seed_categories_and_sources(db: AsyncIOMotorDatabase) -> dict:
    """Create missing categories and sources, and deactivate removed legacy
    feeds. Idempotent and safe to call on every API startup."""
    created_categories = 0
    created_sources = 0
    deactivated_legacy = 0

    category_ids: dict[str, str] = {}
    for name, color, emoji in CATEGORIES:
        existing = await db["categories"].find_one({"name": {"$regex": f"^{name}$", "$options": "i"}})
        if existing:
            category_ids[name] = existing["_id"]
            continue
        cat_id = str(uuid4())
        await db["categories"].insert_one({
            "_id": cat_id,
            "name": name,
            "color_code": color,
            "emoji": emoji,
            "created_at": datetime.now(timezone.utc),
        })
        category_ids[name] = cat_id
        created_categories += 1

    for name, feed_url, category_name in SOURCES:
        exists = await db["sources"].find_one({"feed_url": feed_url})
        if exists:
            continue
        await db["sources"].insert_one({
            "_id": str(uuid4()),
            "name": name,
            "feed_url": feed_url,
            "category_id": category_ids[category_name],
            "language": "en",
            "active": True,
            "auto_publish": True,
            "last_fetched_at": None,
            "created_at": datetime.now(timezone.utc),
        })
        created_sources += 1

    legacy = await db["sources"].find({"feed_url": {"$in": LEGACY_FEEDS}}).to_list(length=1000)
    for src in legacy:
        if src.get("active"):
            await db["sources"].update_one({"_id": src["_id"]}, {"$set": {"active": False}})
            deactivated_legacy += 1

    return {
        "categories_created": created_categories,
        "sources_created": created_sources,
        "legacy_sources_deactivated": deactivated_legacy,
    }