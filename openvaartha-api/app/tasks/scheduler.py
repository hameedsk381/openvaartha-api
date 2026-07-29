import asyncio
import logging
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

from app.config import settings
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
            result = await db["articles"].update_one(
                {"_id": article_id, "status": "scheduled"},
                {
                    "$set": {
                        "status": "published",
                        "published_at": article.get("scheduled_at") or now,
                        "last_updated": now,
                        "updated_at": now,
                    }
                },
            )
            if result.modified_count > 0:
                published_count += 1
                logger.info("Published scheduled article '%s' (ID: %s)", article.get("title"), article_id)

        return {"published_count": published_count}
    except Exception as e:
        logger.error("Failed to publish scheduled articles: %s", e, exc_info=True)
        raise
    finally:
        client.close()
