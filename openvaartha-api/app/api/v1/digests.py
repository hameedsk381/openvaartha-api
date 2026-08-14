from fastapi import APIRouter, HTTPException, Depends
from typing import List

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import get_db
from app.schemas.digest import DigestResponse, DigestWithArticlesResponse
from app.services.digest_service import (
    get_latest_digest,
    get_digest_by_date,
    generate_daily_digest,
    broadcast_digest_newsletter
)
from app.services.article_service import get_article_by_id
from app.core.dependencies import get_current_editor
from app.models.user import User as UserModel

router = APIRouter()

@router.get("/latest", response_model=DigestWithArticlesResponse)
async def fetch_latest_digest(db: AsyncIOMotorDatabase = Depends(get_db)):
    digest = await get_latest_digest()
    if not digest:
        raise HTTPException(status_code=404, detail="No digests found")
    
    # Populate articles
    articles = []
    for aid in digest.article_ids:
        art = await get_article_by_id(db, aid)
        if art:
            articles.append(art)
    
    return {**digest.model_dump(), "articles": articles}

@router.get("/{date}", response_model=DigestWithArticlesResponse)
async def fetch_digest_by_date(date: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    digest = await get_digest_by_date(date)
    if not digest:
        raise HTTPException(status_code=404, detail="Digest not found")
        
    articles = []
    for aid in digest.article_ids:
        art = await get_article_by_id(db, aid)
        if art:
            articles.append(art)
            
    return {**digest.model_dump(), "articles": articles}

@router.post("/generate", response_model=DigestResponse)
async def trigger_digest_generation(current_user: UserModel = Depends(get_current_editor)):
    digest = await generate_daily_digest()
    if not digest:
        raise HTTPException(status_code=500, detail="Failed to generate digest")
        
    # Also broadcast it
    await broadcast_digest_newsletter(digest)
    
    return digest

