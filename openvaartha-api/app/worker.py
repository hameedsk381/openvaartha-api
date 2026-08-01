import asyncio
import logging
from typing import Any, Dict

from app.core.celery_app import celery_app
from app.database import AsyncIOMotorClient
from app.config import settings
from app.services import push_service

logger = logging.getLogger(__name__)

# Initialize a global client for the worker process
client = None

def get_db():
    global client
    if client is None:
        client = AsyncIOMotorClient(settings.MONGODB_URL)
    return client[settings.DATABASE_NAME]

@celery_app.task(name="send_push_notification")
def send_push_notification_task(segment: str, payload: Dict[str, Any]):
    """
    Celery task to send push notifications asynchronously.
    """
    logger.info(f"Starting push notification task for segment: {segment}")
    
    async def _run():
        db = get_db()
        await push_service.send_to_segment(db, segment, payload)
        
    asyncio.run(_run())
    logger.info("Push notification task completed.")
