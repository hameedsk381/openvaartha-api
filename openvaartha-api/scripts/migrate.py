"""Idempotent database migration/bootstrap job: creates all collection indexes,
ensures the admin user, and seeds RSS categories/sources.

Used to run inline in the API's startup (app/main.py lifespan); it now runs once
as a dedicated job so API replicas never race index creation:

    docker compose run --rm api python scripts/migrate.py

Or via the ``migrate`` one-shot compose service (runs before api/celery start).
Safe to re-run at any time — every step skips existing data.
"""
import asyncio
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from motor.motor_asyncio import AsyncIOMotorClient

from app.config import settings
from app.database import init_db
from app.services.migration_service import migrate


async def run():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]
    await init_db()
    result = await migrate(db)
    print(result)
    print("\nDone. Indexes created, admin user ensured, sources seeded.")
    client.close()


if __name__ == "__main__":
    asyncio.run(run())
