from celery import Celery
from celery.schedules import crontab
from app.config import settings

celery_app = Celery(
    "openvaartha",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.beat_schedule = {
    "process-rss-sources": {
        "task": "app.tasks.rss_generator.process_all_sources",
        "schedule": crontab(minute="*/30"),  # every 30 minutes
    },
}


@celery_app.task(name="app.tasks.health_check")
def health_check():
    return {"status": "healthy"}
