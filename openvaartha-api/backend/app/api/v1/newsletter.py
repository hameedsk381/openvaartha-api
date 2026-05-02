from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.newsletter import NewsletterSubscriber as NewsletterModel
from app.schemas.newsletter import NewsletterSubscribe, NewsletterSubscriber

router = APIRouter()


@router.post("/subscribe", response_model=dict)
def subscribe_newsletter(
    subscription: NewsletterSubscribe,
    db: Session = Depends(get_db)
):
    """Subscribe to the newsletter."""
    existing = db.query(NewsletterModel).filter(
        NewsletterModel.email == subscription.email
    ).first()
    
    if existing:
        if existing.is_active:
            raise HTTPException(
                status_code=400,
                detail="Email already subscribed"
            )
        else:
            existing.is_active = True
            db.commit()
            return {
                "message": "Successfully re-subscribed to newsletter",
                "email": subscription.email
            }
    
    new_subscriber = NewsletterModel(
        email=subscription.email
    )
    
    db.add(new_subscriber)
    db.commit()
    db.refresh(new_subscriber)
    
    return {
        "message": "Successfully subscribed to newsletter",
        "email": subscription.email
    }


@router.post("/unsubscribe", response_model=dict)
def unsubscribe_newsletter(
    subscription: NewsletterSubscribe,
    db: Session = Depends(get_db)
):
    """Unsubscribe from the newsletter."""
    subscriber = db.query(NewsletterModel).filter(
        NewsletterModel.email == subscription.email
    ).first()
    
    if not subscriber:
        raise HTTPException(
            status_code=404,
            detail="Email not found in subscribers list"
        )
    
    subscriber.is_active = False
    db.commit()
    
    return {
        "message": "Successfully unsubscribed from newsletter",
        "email": subscription.email
    }
