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
from motor.motor_asyncio import AsyncIOMotorDatabase


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

    return {
        "indexed": indexed,
        "admin_user": "ensured",
        "seed_result": seed_result,
    }