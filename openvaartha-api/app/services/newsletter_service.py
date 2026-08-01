from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional
from uuid import uuid4
from datetime import datetime, timezone
from app.schemas.newsletter import NewsletterSubscribe

async def subscribe(db: AsyncIOMotorDatabase, email: str) -> dict:
    """Subscribe to the newsletter."""
    existing = await Newsletter_subscribers.find_one({"email": email})
    
    if existing:
        if existing.get("is_active", True):
            return {"success": False, "detail": "Email already subscribed", "re_subscribed": False}
        else:
            await Newsletter_subscribers.update_one(
                {"email": email},
                {"$set": {"is_active": True, "updated_at": datetime.now(timezone.utc)}}
            )
            return {"success": True, "detail": "Successfully re-subscribed", "re_subscribed": True}
    
    subscriber_id = str(uuid4())
    new_subscriber = {
        "_id": subscriber_id,
        "id": subscriber_id,
        "email": email,
        "is_active": True,
        "subscribed_at": datetime.now(timezone.utc)
    }
    await Newsletter_subscribers(**new_subscriber).insert()
    return {"success": True, "detail": "Successfully subscribed", "re_subscribed": False}

async def unsubscribe(db: AsyncIOMotorDatabase, email: str) -> bool:
    """Unsubscribe from the newsletter."""
    subscriber = await Newsletter_subscribers.find_one({"email": email})
    if not subscriber:
        return False
    
    await Newsletter_subscribers.update_one(
        {"email": email},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}}
    )
    return True
