"""Operational health checks for the worker/beat/scheduler layer.

These run from the API process and inspect the shared Redis broker so an
operator can see, without logging into containers, whether:
- a Celery worker is actually consuming tasks,
- the single celery-beat scheduler holds its Redis lock (see beat_lock.py),
- task queues are draining (not growing unbounded).

Used by the /health/ops endpoint. All checks are best-effort and never raise.
"""
import logging

from app.config import settings

logger = logging.getLogger(__name__)


async def get_worker_health() -> dict:
    """Ping registered workers via the broker. Returns alive node hostnames."""
    from app.tasks import celery_app

    try:
        # control.ping sends a broadcast ping and returns {node: reply}. Runs
        # synchronously (it blocks the event loop briefly), so wrap in executor.
        import asyncio
        result = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: celery_app.control.ping(timeout=3.0),
        )
        nodes = sorted(result.keys()) if isinstance(result, dict) else []
        return {"alive": nodes, "count": len(nodes), "healthy": len(nodes) > 0}
    except Exception as e:  # broker down, auth error, etc.
        logger.warning("Worker ping failed: %s", e)
        return {"alive": [], "count": 0, "healthy": False, "error": str(e)}


async def get_beat_health() -> dict:
    """Check whether the single-scheduler lock is held (i.e. a beat is alive).

    beat_lock.py sets ``openvaartha:celery-beat:lock`` with a short TTL and
    renews it while running, so presence of the key == an active scheduler.
    """
    import redis.asyncio as aioredis

    try:
        r = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        held = bool(await r.exists("openvaartha:celery-beat:lock"))
        await r.aclose()
        return {"lock_held": held, "healthy": held}
    except Exception as e:
        logger.warning("Beat lock check failed: %s", e)
        return {"lock_held": False, "healthy": False, "error": str(e)}


async def get_queue_health() -> dict:
    """Report task queue depths from the broker's default queue.

    A queue growing without bound while workers are alive indicates a stuck
    task or consumer; alert when depth stays high.
    """
    import redis.asyncio as aioredis

    try:
        r = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        # Celery default queue uses a Redis list keyed by the queue name
        # ("celery" unless CELERY_TASK_DEFAULT_QUEUE is overridden).
        depth = await r.llen("celery")
        await r.aclose()
        return {"default_queue_depth": depth, "healthy": depth < 100}
    except Exception as e:
        logger.warning("Queue depth check failed: %s", e)
        return {"default_queue_depth": None, "healthy": False, "error": str(e)}


async def get_ops_health() -> dict:
    """Aggregate worker/beat/queue health into one response."""
    worker, beat, queue = (
        await get_worker_health(),
        await get_beat_health(),
        await get_queue_health(),
    )
    all_ok = worker["healthy"] and beat["healthy"] and queue["healthy"]
    return {
        "status": "healthy" if all_ok else "degraded",
        "worker": worker,
        "beat": beat,
        "queue": queue,
    }