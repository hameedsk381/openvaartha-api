import asyncio
import logging
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi import HTTPException

from app.config import settings
from app.core.cache import close_redis
from app.services.article_service import after_article_publication, publish_article
from app.tasks import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.scheduler.publish_scheduled_articles", max_retries=3, default_retry_delay=60)
def publish_scheduled_articles():
    """Query scheduled articles whose scheduled_at timestamp has passed and publish them."""
    asyncio.run(_run())


async def _run():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]
    try:
        now = datetime.now(timezone.utc)
        query = {
            "status": "scheduled",
            "scheduled_at": {"$lte": now},
        }

        # Find all scheduled articles ready to go live
        cursor = db["articles"].find(query)
        scheduled_articles = await cursor.to_list(length=100)

        if not scheduled_articles:
            return {"published_count": 0}

        published_count = 0
        for article in scheduled_articles:
            article_id = article["_id"]
            try:
                published = await publish_article(
                    db, article, actor="scheduler", published_at=article.get("scheduled_at") or now
                )
            except HTTPException as exc:
                logger.warning("Scheduled article %s could not publish: %s", article_id, exc.detail)
                continue
            if published:
                await after_article_publication(article["slug"])
                published_count += 1
                logger.info("Published scheduled article '%s' (ID: %s)", article.get("title"), article_id)

        return {"published_count": published_count}
    except Exception as e:
        logger.error("Failed to publish scheduled articles: %s", e, exc_info=True)
        raise
    finally:
        client.close()
        await close_redis()
