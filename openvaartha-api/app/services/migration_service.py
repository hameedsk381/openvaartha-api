"""Consolidated database bootstrap operations (indexes, admin seed, RSS sources).

These used to run inline in app.main.lifespan, which ran them on every API
process start. They are now a dedicated, idempotent migration job launched via
``scripts/migrate.py`` (or ``docker compose run --rm api python scripts/migrate.py``)
so that:

- multiple API replicas never race each other creating indexes,
- the API boots even when the DB is unready (indexes are created only once),
- an operator can re-run migrations non-destructively at any time.

Every step is guarded against existing data (create_index is a no-op for an
existing identical index; seeding skips names that already exist), so this is
safe to run repeatedly.
"""
import re

from motor.motor_asyncio import AsyncIOMotorDatabase


async def cleanup_near_duplicate_articles(db: AsyncIOMotorDatabase) -> dict:
    """Delete auto-generated ``-2``/``-3`` near-duplicate articles.

    A story syndicated across sources used to be ingested once per source,
    producing the same article 2-3 times with slug suffixes (e.g.
    ``...-report``, ``...-report-2``). Only the unsuffixed (original) copy is
    kept; the suffixed copies are removed and their URLs are flagged as deleted
    via IndexNow so search engines drop them instead of crawling duplicates.

    Idempotent: on a re-run there is nothing left to delete. Slugs that merely
    *end* in a number (dates, ages) are left untouched.
    """
    from app.services.article_service import delete_article
    from app.services.indexnow_service import article_url, delete_url

    cursor = db["articles"].find(
        {"slug": {"$regex": r"^.+-\d+$"}},
        {"_id": 1, "slug": 1},
    )
    candidates = await cursor.to_list(length=10_000)

    deleted: list[str] = []
    kept_natural: list[str] = []
    for doc in candidates:
        m = re.match(r"^(.*)-(\d+)$", doc["slug"])
        if not m:
            continue
        base = m.group(1)
        base_exists = await db["articles"].find_one({"slug": base}, {"_id": 1})
        if not base_exists:
            # Slug naturally ends in a number (date, age) — not a duplicate.
            kept_natural.append(doc["slug"])
            continue
        deleted.append(doc["slug"])
        await delete_article(db, doc["_id"])
        delete_url(article_url(doc["slug"]))

    return {
        "deleted_near_duplicates": deleted,
        "kept_natural_number_slugs": kept_natural,
    }


async def ensure_all_indexes(db: AsyncIOMotorDatabase) -> list[str]:
    """Create every collection index the app relies on. Idempotent."""
    steps: list[str] = []

    from app.services.article_service import ensure_article_indexes
    await ensure_article_indexes(db)
    steps.append("article")

    from app.services.category_service import ensure_category_indexes
    await ensure_category_indexes(db)
    steps.append("category")

    from app.services.dispatch_service import ensure_dispatch_indexes
    await ensure_dispatch_indexes(db)
    steps.append("dispatch")

    from app.services.push_service import ensure_push_indexes
    await ensure_push_indexes(db)
    steps.append("push")

    from app.services.poll_service import ensure_poll_indexes
    await ensure_poll_indexes(db)
    steps.append("poll")

    from app.services.comment_service import ensure_comment_indexes
    await ensure_comment_indexes(db)
    steps.append("comment")

    from app.services.session_service import ensure_session_indexes
    await ensure_session_indexes(db)
    steps.append("session")

    return steps


async def migrate(db: AsyncIOMotorDatabase) -> dict:
    """Run the full, ordered bootstrap. Idempotent — safe to run repeatedly."""
    from app.services.seed_service import ensure_admin_user
    from app.services.source_seed import seed_categories_and_sources

    indexed = await ensure_all_indexes(db)
    await ensure_admin_user(db)
    seed_result = await seed_categories_and_sources(db)
    duplicates = await cleanup_near_duplicate_articles(db)

    return {
        "indexed": indexed,
        "admin_user": "ensured",
        "seed_result": seed_result,
        "duplicates": duplicates,
    }