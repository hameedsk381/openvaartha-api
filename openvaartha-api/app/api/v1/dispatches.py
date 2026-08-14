from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List

from app.core.dependencies import get_current_editor, get_current_user_optional, get_current_user
from app.core.rate_limit import limiter, MUTATION_LIMIT
from app.database import get_db
from app.models.user import User as UserModel
from app.schemas.dispatch import Dispatch as DispatchSchema, DispatchCreate, DispatchUpdate
from app.services import dispatch_service, push_service, dispatch_reaction_service
from app.worker import send_push_notification_task
from typing import Optional

router = APIRouter()


@router.get("/", response_model=List[DispatchSchema])
async def list_dispatches(
    limit: int = Query(50, ge=1, le=100),
    today_only: bool = Query(False),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Public: recent breaking-news dispatches — powers the JUST IN ticker and
    the Bytes page. ``today_only`` scopes Bytes to the current IST day."""
    return await dispatch_service.list_dispatches(db, limit=limit, today_only=today_only)


@router.post("/", response_model=DispatchSchema, status_code=201)
@limiter.limit(MUTATION_LIMIT)
async def create_dispatch(
    request: Request,
    body: DispatchCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: UserModel = Depends(get_current_editor),
):
    """Create a dispatch (admin/editor only). Also pushes to subscribers with
    "Breaking News" enabled — fired after the response so a large subscriber
    base never delays the admin's save."""
    try:
        dispatch = await dispatch_service.create_dispatch(
            db, text=body.text, article_id=body.article_id, created_by=current_user.id,
            image_url=body.image_url, video_url=body.video_url, category_id=body.category_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    send_push_notification_task.delay(
        "breaking",
        {
            "title": "Breaking — Open Vaartha",
            "body": dispatch["text"],
            "url": f"/article/{dispatch['article_slug']}" if dispatch.get("article_slug") else "/bytes",
        },
    )
    return dispatch


@router.post("/backfill-categories")
@limiter.limit(MUTATION_LIMIT)
async def backfill_dispatch_categories(
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: UserModel = Depends(get_current_editor),
):
    """AI-classify a category for every standalone dispatch (no linked
    article) that doesn't have one yet. Safe to re-run — already-categorized
    dispatches are skipped, so this also catches any new backlog over time."""
    updated = await dispatch_service.backfill_categories(db)
    return {"message": f"Categorized {updated} dispatch(es)", "updated": updated}


@router.get("/feed")
async def feed_dispatches(
    limit: int = Query(20, ge=1, le=50),
    cursor: Optional[str] = Query(None),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Optional[UserModel] = Depends(get_current_user_optional),
):
    """Paginated feed for the /feed page. Returns {items, nextCursor}."""
    user_id = current_user.id if current_user else None
    return await dispatch_service.list_dispatches_paginated(db, limit=limit, cursor=cursor, user_id=user_id)


@router.get("/{dispatch_id}", response_model=DispatchSchema)
async def get_dispatch(
    dispatch_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Optional[UserModel] = Depends(get_current_user_optional),
):
    """Public: fetch a single dispatch by id — powers shared /bytes/:id
    permalinks, which must keep resolving even after a byte has rolled out of
    the same-day feed."""
    user_id = current_user.id if current_user else None
    dispatch = await dispatch_service.get_dispatch(db, dispatch_id, user_id)
    if not dispatch:
        raise HTTPException(status_code=404, detail="Dispatch not found")
    return dispatch


@router.post("/{dispatch_id}/like")
@limiter.limit(MUTATION_LIMIT)
async def toggle_dispatch_like(
    request: Request,
    dispatch_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """Toggle like on a dispatch (auth required)."""
    return await dispatch_reaction_service.toggle_like(db, dispatch_id, current_user.id)


@router.put("/{dispatch_id}", response_model=DispatchSchema)
@limiter.limit(MUTATION_LIMIT)
async def update_dispatch(
    request: Request,
    dispatch_id: str,
    body: DispatchUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: UserModel = Depends(get_current_editor),
):
    """Edit a dispatch (admin/editor only)."""
    try:
        dispatch = await dispatch_service.update_dispatch(
            db, dispatch_id, text=body.text, article_id=body.article_id,
            image_url=body.image_url, video_url=body.video_url, category_id=body.category_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not dispatch:
        raise HTTPException(status_code=404, detail="Dispatch not found")
    return dispatch


@router.delete("/{dispatch_id}")
@limiter.limit(MUTATION_LIMIT)
async def delete_dispatch(
    request: Request,
    dispatch_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: UserModel = Depends(get_current_editor),
):
    """Delete a dispatch (admin/editor only)."""
    success = await dispatch_service.delete_dispatch(db, dispatch_id)
    if not success:
        raise HTTPException(status_code=404, detail="Dispatch not found")
    return {"message": "Dispatch deleted"}
