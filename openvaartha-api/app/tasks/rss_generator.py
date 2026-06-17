import asyncio
import logging

from motor.motor_asyncio import AsyncIOMotorClient

from app.config import settings
from app.services.source_service import list_sources
from app.services.rss_service import process_source
from app.tasks import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.rss_generator.process_all_sources", max_retries=2, default_retry_delay=300)
def process_all_sources():
    """Fetch all active RSS sources and generate articles for new entries."""
    asyncio.run(_run())


async def _run():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]
    try:
        sources = await list_sources(db, active_only=True)
        if not sources:
            logger.info("No active RSS sources configured")
            return {"processed": 0, "total_sources": 0}

        total_new = 0
        for source in sources:
            try:
                new_count = await process_source(db, source)
                total_new += new_count
                logger.info("Source %s: %d new articles", source.get("name"), new_count)
            except Exception as e:
                logger.error("Failed to process source %s: %s", source.get("name"), e)

        return {"processed": total_new, "total_sources": len(sources)}
    finally:
        client.close()
