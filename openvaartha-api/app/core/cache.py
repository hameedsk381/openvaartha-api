import asyncio
import json
import logging
from typing import Callable, Any, Optional
import redis.asyncio as redis
from redis.exceptions import RedisError

from app.config import settings

logger = logging.getLogger(__name__)

# Global redis connection pool for caching operations
_redis_client: Optional[redis.Redis] = None

async def get_redis() -> Optional[redis.Redis]:
    global _redis_client
    if settings.CACHE_TTL_SECONDS <= 0:
        return None
    if _redis_client is None:
        _redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis_client

async def close_redis():
    global _redis_client
    if _redis_client is not None:
        await _redis_client.close()
        _redis_client = None

def _json_default(value):
    from datetime import datetime
    if isinstance(value, datetime):
        return value.isoformat()
    # Handle Pydantic models / Beanie documents
    if hasattr(value, "model_dump"):
        return value.model_dump()
    if hasattr(value, "dict"):
        return value.dict()
    # Handle ObjectId
    if hasattr(value, "__str__") and value.__class__.__name__ == "ObjectId":
        return str(value)
    raise TypeError(f"Object of type {type(value).__name__} is not JSON serializable")

async def fetch_with_cache_and_lock(
    key: str, 
    ttl: int, 
    fetch_func: Callable[[], Any],
    lock_timeout: float = 10.0,
    wait_timeout: float = 5.0,
) -> Any:
    """
    Fetch data from cache. If it misses, acquire a distributed lock to execute the fetch_func.
    If another worker has the lock, wait for it to finish and then serve from the newly populated cache.
    This prevents the "Thundering Herd" problem.
    """
    client = await get_redis()
    if not client:
        return await fetch_func()

    try:
        cached = await client.get(key)
        if cached:
            return json.loads(cached)
    except (RedisError, json.JSONDecodeError) as e:
        logger.warning(f"Cache read error for {key}: {e}")
        return await fetch_func()

    # Cache miss. Try to acquire lock.
    lock_name = f"lock:{key}"
    lock = client.lock(lock_name, timeout=lock_timeout)

    try:
        # blocking_timeout controls how long we wait for ANOTHER worker's lock
        acquired = await lock.acquire(blocking_timeout=wait_timeout)
        
        if acquired:
            try:
                # We got the lock! Fetch the data.
                data = await fetch_func()
                
                # Cache it
                try:
                    await client.setex(key, ttl, json.dumps(data, default=_json_default))
                except Exception as e:
                    logger.warning(f"Cache write error for {key}: {e}")
                    
                return data
            finally:
                await lock.release()
        else:
            # We waited for the lock but it timed out, or we couldn't get it.
            # Hopefully the other worker finished and populated the cache.
            # Let's check the cache one last time.
            cached = await client.get(key)
            if cached:
                return json.loads(cached)
            else:
                # The other worker failed or is taking too long. Fallback to DB.
                logger.warning(f"Lock wait timed out for {key}, falling back to direct fetch.")
                return await fetch_func()

    except RedisError as e:
        logger.warning(f"Redis lock error for {key}: {e}")
        return await fetch_func()
