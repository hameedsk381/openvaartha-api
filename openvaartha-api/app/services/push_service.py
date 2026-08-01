"""Web Push notifications (VAPID) — no Firebase/FCM dependency, works with any
browser's own push service. Sending is a no-op (returns 0, sends nothing)
whenever VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY are unset, so every call site here
is safe to call unconditionally without checking configuration first.
"""

import asyncio
import json
import logging
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorDatabase
from pywebpush import webpush, WebPushException

from app.config import settings

logger = logging.getLogger(__name__)


async def ensure_push_indexes(db: AsyncIOMotorDatabase) -> None:
    await Push_subscriptions.create_index("endpoint", unique=True)
    await Push_subscriptions.create_index("user_id")


async def upsert_subscription(
    db: AsyncIOMotorDatabase,
    user_id: str,
    endpoint: str,
    p256dh: str,
    auth: str,
    breaking: bool,
    morning: bool,
) -> None:
    await Push_subscriptions.update_one(
        {"endpoint": endpoint},
        {
            "$set": {
                "user_id": user_id,
                "keys": {"p256dh": p256dh, "auth": auth},
                "breaking": breaking,
                "morning": morning,
            }
        },
        upsert=True,
    )


async def update_preferences(
    db: AsyncIOMotorDatabase,
    user_id: str,
    endpoint: str,
    breaking: Optional[bool],
    morning: Optional[bool],
) -> bool:
    update: dict = {}
    if breaking is not None:
        update["breaking"] = breaking
    if morning is not None:
        update["morning"] = morning
    if not update:
        return True
    # Scoped to the caller's own subscription — a signed-in user can't repoint
    # someone else's push endpoint even if they somehow obtained the URL.
    result = await Push_subscriptions.update_one(
        {"endpoint": endpoint, "user_id": user_id}, {"$set": update}
    )
    return result.matched_count > 0


async def remove_subscription(db: AsyncIOMotorDatabase, user_id: str, endpoint: str) -> bool:
    result = await Push_subscriptions.delete_one({"endpoint": endpoint, "user_id": user_id})
    return result.deleted_count > 0


async def _send_one(db: AsyncIOMotorDatabase, sub: dict, payload: dict) -> None:
    try:
        # webpush() is a blocking synchronous HTTP call — run it in a worker
        # thread so a burst of sends never stalls the event loop for other
        # concurrent requests.
        await asyncio.to_thread(
            webpush,
            subscription_info={"endpoint": sub["endpoint"], "keys": sub["keys"]},
            data=json.dumps(payload),
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={"sub": settings.VAPID_CLAIMS_EMAIL},
        )
    except WebPushException as e:
        status_code = getattr(e.response, "status_code", None)
        if status_code in (404, 410):
            # Browser revoked or the subscription expired — self-clean rather
            # than retry a dead endpoint forever.
            await Push_subscriptions.delete_one({"endpoint": sub["endpoint"]})
        else:
            logger.error("Push send failed for %s: %s", sub.get("endpoint"), e)


async def send_to_segment(db: AsyncIOMotorDatabase, segment: str, payload: dict) -> int:
    """``segment`` is the preference flag to filter subscribers on — "breaking"
    or "morning". Returns the number of subscriptions attempted (0 if VAPID
    isn't configured, before any DB query)."""
    if not settings.VAPID_PRIVATE_KEY or not settings.VAPID_PUBLIC_KEY:
        return 0

    subs = await Push_subscriptions.find({segment: True}).to_list(length=None)
    if subs:
        await asyncio.gather(*(_send_one(db, sub, payload) for sub in subs))
    return len(subs)
