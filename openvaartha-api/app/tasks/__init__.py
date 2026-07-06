from celery import Celery
from celery.schedules import crontab
from app.config import settings

# `include` makes the worker actually import rss_generator.py at startup so its
# @celery_app.task-decorated function registers. Without this, the beat entry
# below fires a task name the worker has never seen and rejects as unregistered
# — celery_app.task() only runs (and registers) when its module is imported.
celery_app = Celery(
    "openvaartha",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.tasks.rss_generator"],
)

celery_app.conf.beat_schedule = {
    "process-rss-sources": {
        "task": "app.tasks.rss_generator.process_all_sources",
        "schedule": crontab(minute="*/15"),  # every 15 minutes
    },
}


@celery_app.task(name="app.tasks.health_check")
def health_check():
    return {"status": "healthy"}
