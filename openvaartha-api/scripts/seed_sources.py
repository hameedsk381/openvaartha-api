"""Seed categories + RSS sources across multiple topics so the automated
RSS -> AI-rewrite -> auto-publish pipeline (app/tasks/rss_generator.py) has
actual input to work with every 30 minutes.

This script now delegates to app/services/source_seed.py — the exact same
logic the API runs automatically at container startup (app/main.py lifespan).
It exists for manual/incremental runs:

    docker compose exec api python scripts/seed_sources.py

Idempotent: safe to re-run — skips categories/sources that already exist by
name/feed_url rather than duplicating them, and deactivates removed legacy
(non-India) feeds.
"""
import asyncio
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from motor.motor_asyncio import AsyncIOMotorClient

from app.config import settings
from app.services.source_seed import seed_categories_and_sources


async def seed():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]
    result = await seed_categories_and_sources(db)
    print(result)
    print("\nDone. Sources will be picked up by the next scheduled run "
          "(every 30 min via celery-beat), or trigger one immediately with "
          "POST /api/v1/admin/sources/process.")
    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
