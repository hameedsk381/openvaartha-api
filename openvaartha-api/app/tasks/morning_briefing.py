import asyncio
import logging

from motor.motor_asyncio import AsyncIOMotorClient

from app.config import settings
from app.services import push_service
from app.tasks import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.morning_briefing.send_morning_briefing")
def send_morning_briefing():
    """Daily digest push for subscribers with "Morning Briefing" enabled —
    the latest published article, once a day. Fires on the beat schedule in
    app/tasks/__init__.py."""
    asyncio.run(_run())


async def _run():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]
    try:
        latest = await db["articles"].find(
            {"status": "published"}, {"title": 1, "slug": 1}
        ).sort("published_at", -1).limit(1).to_list(length=1)

        if not latest:
            logger.info("Morning briefing: no published articles, skipping send")
            return {"sent": 0}

        article = latest[0]
        sent = await push_service.send_to_segment(
            db,
            "morning",
            {
                "title": "Your morning briefing — Open Vaartha",
                "body": article["title"],
                "url": f"/article/{article['slug']}",
            },
        )
        logger.info("Morning briefing sent to %d subscriber(s)", sent)
        return {"sent": sent}
    finally:
        client.close()
