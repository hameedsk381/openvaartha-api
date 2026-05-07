from celery import Celery
from app.config import settings

celery_app = Celery(
    "openvaartha",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)


@celery_app.task(name="app.tasks.health_check")
def health_check():
    return {"status": "healthy"}
