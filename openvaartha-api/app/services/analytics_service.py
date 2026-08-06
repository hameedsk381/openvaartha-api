"""Editorial analytics: time-series trends and content breakdowns.

Computes aggregate engagement + editorial pipeline metrics for the admin
Analytics page. All functions take a ``days`` window (default 30) and return
plain dicts suitable for JSON responses.

Notes on the data model:
  - ``view_count`` is a running lifetime counter on each article, so there is no
    per-day view history; daily *reader activity* is approximated from
    ``reading_history`` (upserted with a fresh ``read_at`` on every read).
  - Reactions/comments/subscriber signups have timestamps and are bucketed per
    day directly.
"""
from datetime import datetime, timedelta, timezone

from motor.motor_asyncio import AsyncIOMotorDatabase


def _day_start(days_ago: int) -> datetime:
    """UTC midnight ``days_ago`` days before today."""
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    return today - timedelta(days=days_ago)


def _fill_daily_buckets(days: int, rows: list[dict], count_key: str = "count") -> list[dict]:
    """Zero-fill a per-day time series so charts have a continuous X axis.

    ``rows`` are ``{"_id": "YYYY-MM-DD", count_key: int}`` from an aggregation.
    Returns ``[{"date": "YYYY-MM-DD", count_key: int}]`` ascending, oldest first.
    """
    counts = {str(r["_id"]): int(r.get(count_key, 0)) for r in rows}
    series = []
    for i in range(days - 1, -1, -1):
        day = _day_start(i).strftime("%Y-%m-%d")
        series.append({"date": day, count_key: counts.get(day, 0)})
    return series


async def _daily_series(db: AsyncIOMotorDatabase, collection: str, date_field: str, days: int) -> list[dict]:
    """Count documents per day in a collection over the window (UTC dates)."""
    start = _day_start(days - 1)
    pipeline = [
        {"$match": {date_field: {"$gte": start}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": f"${date_field}"}},
            "count": {"$sum": 1},
        }},
    ]
    rows = await db[collection].aggregate(pipeline).to_list(length=None)
    return _fill_daily_buckets(days, rows)


async def get_published_series(db: AsyncIOMotorDatabase, days: int) -> list[dict]:
    """Articles published per day."""
    return await _daily_series(db, "articles", "published_at", days)


async def get_reactions_series(db: AsyncIOMotorDatabase, days: int) -> list[dict]:
    """Reactions per day."""
    return await _daily_series(db, "article_reactions", "created_at", days)


async def get_comments_series(db: AsyncIOMotorDatabase, days: int) -> list[dict]:
    """Active comments per day."""
    return await _daily_series(db, "comments", "created_at", days)


async def get_subscriber_series(db: AsyncIOMotorDatabase, days: int) -> list[dict]:
    """Newsletter signups per day (active subscribers only)."""
    start = _day_start(days - 1)
    pipeline = [
        {"$match": {"subscribed_at": {"$gte": start}, "is_active": True}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$subscribed_at"}},
            "count": {"$sum": 1},
        }},
    ]
    rows = await db["newsletter_subscribers"].aggregate(pipeline).to_list(length=None)
    return _fill_daily_buckets(days, rows)


async def get_unique_readers_series(db: AsyncIOMotorDatabase, days: int) -> list[dict]:
    """Distinct users who read at least one article per day.

    reading_history is upserted per (user, article) so read_at is the latest
    read; counting distinct user_ids per calendar day is a fair proxy for DAU
    on the article surface.
    """
    start = _day_start(days - 1)
    pipeline = [
        {"$match": {"read_at": {"$gte": start}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$read_at"}},
            "readers": {"$addToSet": "$user_id"},
        }},
        {"$project": {"count": {"$size": "$readers"}}},
    ]
    rows = await db["reading_history"].aggregate(pipeline).to_list(length=None)
    return _fill_daily_buckets(days, rows)


async def get_category_breakdown(db: AsyncIOMotorDatabase, days: int) -> list[dict]:
    """Per-category published articles + engagement in the window.

    Returns top categories by views, each with article count, total views,
    reactions and comments.
    """
    start = _day_start(days - 1)

    # Reactions + comments per article in the window.
    reaction_rows = await db["article_reactions"].aggregate([
        {"$match": {"created_at": {"$gte": start}}},
        {"$group": {"_id": "$article_id", "reactions": {"$sum": 1}}},
    ]).to_list(length=None)
    comment_rows = await db["comments"].aggregate([
        {"$match": {"created_at": {"$gte": start}, "is_active": True}},
        {"$group": {"_id": "$article_id", "comments": {"$sum": 1}}},
    ]).to_list(length=None)

    reactions = {r["_id"]: r["reactions"] for r in reaction_rows}
    comments = {r["_id"]: r["comments"] for r in comment_rows}

    # Articles published in window, joined with category names.
    pipeline = [
        {"$match": {"status": "published", "published_at": {"$gte": start}}},
        {"$lookup": {
            "from": "categories",
            "localField": "category_id",
            "foreignField": "_id",
            "as": "cat",
        }},
        {"$unwind": {"path": "$cat", "preserveNullAndEmptyArrays": True}},
        {"$group": {
            "_id": "$category_id",
            "name": {"$first": {"$ifNull": ["$cat.name", "General"]}},
            "articles": {"$sum": 1},
            "views": {"$sum": "$view_count"},
            "article_ids": {"$push": "$_id"},
        }},
        {"$sort": {"views": -1}},
        {"$limit": 15},
    ]

    categories = []
    for row in await db["articles"].aggregate(pipeline).to_list(length=None):
        ids = {str(aid) for aid in row["article_ids"]}
        categories.append({
            "id": row["_id"],
            "name": row["name"],
            "articles": row["articles"],
            "views": row["views"],
            "reactions": sum(v for aid, v in reactions.items() if aid in ids),
            "comments": sum(v for aid, v in comments.items() if aid in ids),
        })
    return categories


async def get_author_breakdown(db: AsyncIOMotorDatabase, days: int) -> list[dict]:
    """Per-author output + views in the window (top by views)."""
    start = _day_start(days - 1)
    pipeline = [
        {"$match": {"status": "published", "published_at": {"$gte": start}}},
        {"$group": {
            "_id": {"$ifNull": ["$author", "Unknown"]},
            "articles": {"$sum": 1},
            "views": {"$sum": "$view_count"},
        }},
        {"$sort": {"views": -1}},
        {"$limit": 15},
    ]
    rows = await db["articles"].aggregate(pipeline).to_list(length=None)
    return [
        {"name": r["_id"], "articles": r["articles"], "views": r["views"]}
        for r in rows
    ]


async def get_pipeline_stats(db: AsyncIOMotorDatabase) -> dict:
    """Editorial pipeline health: status counts + median time-to-publish."""
    collection = db["articles"]

    statuses = {}
    for status in ("draft", "pending", "scheduled", "published", "archived"):
        statuses[status] = await collection.count_documents({"status": status})

    # Average hours from creation to publish for published articles.
    pipeline = [
        {"$match": {"status": "published", "published_at": {"$ne": None}, "created_at": {"$ne": None}}},
        {"$project": {
            "hours": {
                "$divide": [
                    {"$subtract": ["$published_at", "$created_at"]},
                    3600000.0,
                ]
            }
        }},
        {"$group": {"_id": None, "avg_hours": {"$avg": "$hours"}}},
    ]
    rows = await collection.aggregate(pipeline).to_list(length=None)
    avg_hours = rows[0]["avg_hours"] if rows else 0

    return {
        "statuses": statuses,
        "avg_time_to_publish_hours": round(avg_hours, 1),
    }


async def get_engagement_totals(db: AsyncIOMotorDatabase, days: int) -> dict:
    """Lifetime + windowed engagement headline numbers."""
    start = _day_start(days - 1)
    article_col = db["articles"]

    lifetime_views_rows = await article_col.aggregate([
        {"$group": {"_id": None, "views": {"$sum": "$view_count"}}},
    ]).to_list(length=None)
    lifetime_views = lifetime_views_rows[0]["views"] if lifetime_views_rows else 0

    published_total = await article_col.count_documents({"status": "published"})

    readers_rows = await db["reading_history"].aggregate([
        {"$match": {"read_at": {"$gte": start}}},
        {"$group": {"_id": None, "readers": {"$addToSet": "$user_id"}}},
    ]).to_list(length=None)
    active_readers = len(readers_rows[0]["readers"]) if readers_rows else 0

    reactions = await db["article_reactions"].count_documents({"created_at": {"$gte": start}})
    comments = await db["comments"].count_documents({"created_at": {"$gte": start}, "is_active": True})
    signups = await db["newsletter_subscribers"].count_documents(
        {"subscribed_at": {"$gte": start}, "is_active": True}
    )

    return {
        "lifetime_views": lifetime_views,
        "published_total": published_total,
        "avg_views_per_article": round(lifetime_views / published_total, 1) if published_total else 0,
        "active_readers": active_readers,
        "reactions": reactions,
        "comments": comments,
        "signups": signups,
    }


async def get_editorial_stats(db: AsyncIOMotorDatabase, days: int = 30) -> dict:
    """Full editorial metrics payload for the admin Analytics page."""
    return {
        "days": days,
        "published_series": await get_published_series(db, days),
        "reactions_series": await get_reactions_series(db, days),
        "comments_series": await get_comments_series(db, days),
        "subscriber_series": await get_subscriber_series(db, days),
        "reader_series": await get_unique_readers_series(db, days),
        "categories": await get_category_breakdown(db, days),
        "authors": await get_author_breakdown(db, days),
        "pipeline": await get_pipeline_stats(db),
        "engagement": await get_engagement_totals(db, days),
    }