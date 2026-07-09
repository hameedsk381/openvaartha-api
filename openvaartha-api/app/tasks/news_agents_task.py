import asyncio
import logging

from celery import shared_task
from app.database import db
from app.scripts.news_agents import run_news_agents

logger = logging.getLogger(__name__)

@shared_task(name="app.tasks.news_agents_task.run_agents")
def run_agents():
    """Wrapper to run the async news_agents pipeline inside a Celery task."""
    logger.info("Starting automated News Agents scraping task...")
    try:
        new_count = asyncio.run(run_news_agents(db))
        logger.info(f"News Agents scraping task completed. {new_count} new articles added as drafts.")
        return {"status": "success", "new_articles": new_count}
    except Exception as e:
        logger.error(f"News Agents scraping task failed: {e}", exc_info=True)
        return {"status": "error", "message": str(e)}
