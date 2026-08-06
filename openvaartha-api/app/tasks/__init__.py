from celery import Celery
from celery.schedules import crontab
from app.config import settings
from app.core.observability import init_sentry

# Celery worker/beat are a separate process from the API (uvicorn never imports
# this module's way in) — they need their own Sentry init call.
init_sentry()

# `include` makes the worker actually import rss_generator.py at startup so its
# @celery_app.task-decorated function registers. Without this, the beat entry
# below fires a task name the worker has never seen and rejects as unregistered
# — celery_app.task() only runs (and registers) when its module is imported.
celery_app = Celery(
    "openvaartha",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.tasks.rss_generator", "app.tasks.news_agents_task", "app.tasks.morning_briefing", "app.tasks.scheduler", "app.worker"],
)

# "Morning Briefing" in Settings promises 8 AM specifically for an Indian
# audience — without this, crontab(hour=8) fires at 8 AM UTC (1:30 PM IST).
celery_app.conf.timezone = "Asia/Kolkata"
celery_app.conf.enable_utc = False

celery_app.conf.beat_schedule = {
    "process-rss-sources": {
        "task": "app.tasks.rss_generator.process_all_sources",
        "schedule": crontab(minute="*/15"),  # every 15 minutes
    },
    "process-news-agents": {
        "task": "app.tasks.news_agents_task.run_agents",
        "schedule": crontab(minute="0,30"),  # every 30 minutes
    },
    "morning-briefing": {
        "task": "app.tasks.morning_briefing.send_morning_briefing",
        "schedule": crontab(hour=8, minute=0),  # 8:00 AM IST
    },
    "publish-scheduled-articles": {
        "task": "app.tasks.scheduler.publish_scheduled_articles",
        "schedule": crontab(minute="*"),  # every 1 minute
    },
}



@celery_app.task(name="app.tasks.health_check")
def health_check():
    return {"status": "healthy"}
