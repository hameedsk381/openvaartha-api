from fastapi import APIRouter, HTTPException, Depends
from typing import List

from app.schemas.digest import DigestResponse, DigestWithArticlesResponse
from app.services.digest_service import (
    get_latest_digest,
    get_digest_by_date,
    generate_daily_digest,
    broadcast_digest_newsletter
)
from app.services.article_service import get_article_by_id
from app.core.dependencies import get_current_user
from app.models.user import UserRole

router = APIRouter()

@router.get("/latest", response_model=DigestWithArticlesResponse)
async def fetch_latest_digest():
    digest = await get_latest_digest()
    if not digest:
        raise HTTPException(status_code=404, detail="No digests found")
    
    # Populate articles
    articles = []
    for aid in digest.article_ids:
        art = await get_article_by_id(aid)
        if art:
            articles.append(art)
    
    return {**digest.model_dump(), "articles": articles}

@router.get("/{date}", response_model=DigestWithArticlesResponse)
async def fetch_digest_by_date(date: str):
    digest = await get_digest_by_date(date)
    if not digest:
        raise HTTPException(status_code=404, detail="Digest not found")
        
    articles = []
    for aid in digest.article_ids:
        art = await get_article_by_id(aid)
        if art:
            articles.append(art)
            
    return {**digest.model_dump(), "articles": articles}

@router.post("/generate", response_model=DigestResponse)
async def trigger_digest_generation(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in [UserRole.ADMIN.value, UserRole.EDITOR.value]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    digest = await generate_daily_digest()
    if not digest:
        raise HTTPException(status_code=500, detail="Failed to generate digest")
        
    # Also broadcast it
    await broadcast_digest_newsletter(digest)
    
    return digest
