from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.database import get_db
from app.schemas.newsletter import NewsletterSubscribe, NewsletterSubscriber
from app.services import newsletter_service
from datetime import datetime
from uuid import uuid4

router = APIRouter()


@router.post("/subscribe")
async def subscribe_newsletter(
    subscription: NewsletterSubscribe,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Subscribe to the newsletter."""
    result = await newsletter_service.subscribe(db, subscription.email)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["detail"])
        
    return {"message": result["detail"], "email": subscription.email}


@router.post("/unsubscribe")
async def unsubscribe_newsletter(
    subscription: NewsletterSubscribe,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Unsubscribe from the newsletter."""
    success = await newsletter_service.unsubscribe(db, subscription.email)
    if not success:
        raise HTTPException(status_code=404, detail="Email not found in subscribers list")
    
    return {"message": "Successfully unsubscribed from newsletter", "email": subscription.email}
