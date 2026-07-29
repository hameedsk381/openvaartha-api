from fastapi import APIRouter, Depends, HTTPException, Query, Request
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel
from typing import List, Optional

from app.database import get_db
from app.services import series_service
from app.core.dependencies import get_current_editor
from app.models.user import User as UserModel

router = APIRouter()


class SeriesCreate(BaseModel):
    title: str
    slug: Optional[str] = None
    description: str
    cover_image_url: Optional[str] = None
    article_ids: List[str] = []


@router.get("/")
async def list_all_series(
    limit: int = Query(20, ge=1, le=50),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """List all article series/collections."""
    return await series_service.list_series(db, limit=limit)


@router.get("/article/{article_id}")
async def get_series_by_article(
    article_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Get series info if article belongs to one."""
    res = await series_service.get_series_for_article(db, article_id)
    if not res:
        return {}
    return res


@router.get("/{slug}")
async def get_series(
    slug: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Get single series details with all articles in order."""
    series = await series_service.get_series_by_slug(db, slug)
    if not series:
        raise HTTPException(status_code=404, detail="Series not found")
    return series


@router.post("/")
async def create_series(
    body: SeriesCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: UserModel = Depends(get_current_editor),
):
    """Create a new article series (editor/admin only)."""
    return await series_service.create_series(db, body.dict())
