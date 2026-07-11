from fastapi import APIRouter, Depends, HTTPException, Request

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.config import settings
from app.core.dependencies import get_current_user
from app.core.rate_limit import limiter, MUTATION_LIMIT
from app.database import get_db
from app.models.user import User as UserModel
from app.schemas.push import PushPreferencesUpdate, PushSubscribe, PushUnsubscribe
from app.services import push_service

router = APIRouter()


@router.get("/vapid-public-key")
async def vapid_public_key():
    """Public: the VAPID public key the frontend passes to
    pushManager.subscribe({applicationServerKey})."""
    if not settings.VAPID_PUBLIC_KEY:
        raise HTTPException(status_code=503, detail="Push notifications are not configured.")
    return {"key": settings.VAPID_PUBLIC_KEY}


@router.post("/subscribe")
@limiter.limit(MUTATION_LIMIT)
async def subscribe(
    request: Request,
    body: PushSubscribe,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """Register (or update) this browser's push subscription for the signed-in user."""
    if not settings.VAPID_PUBLIC_KEY:
        raise HTTPException(status_code=503, detail="Push notifications are not configured.")
    await push_service.upsert_subscription(
        db,
        user_id=current_user.id,
        endpoint=body.endpoint,
        p256dh=body.keys.p256dh,
        auth=body.keys.auth,
        breaking=body.breaking,
        morning=body.morning,
    )
    return {"status": "subscribed"}


@router.patch("/preferences")
@limiter.limit(MUTATION_LIMIT)
async def update_preferences(
    request: Request,
    body: PushPreferencesUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """Update breaking/morning flags without re-registering the subscription
    at the browser level."""
    updated = await push_service.update_preferences(
        db, current_user.id, body.endpoint, body.breaking, body.morning
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return {"status": "updated"}


@router.post("/unsubscribe")
@limiter.limit(MUTATION_LIMIT)
async def unsubscribe(
    request: Request,
    body: PushUnsubscribe,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """Remove this browser's push subscription entirely."""
    await push_service.remove_subscription(db, current_user.id, body.endpoint)
    return {"status": "unsubscribed"}
