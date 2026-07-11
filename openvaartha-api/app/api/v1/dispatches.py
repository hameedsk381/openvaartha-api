from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List

from app.core.dependencies import get_current_editor
from app.core.rate_limit import limiter, MUTATION_LIMIT
from app.database import get_db
from app.models.user import User as UserModel
from app.schemas.dispatch import Dispatch as DispatchSchema, DispatchCreate
from app.services import dispatch_service, push_service

router = APIRouter()


@router.get("/", response_model=List[DispatchSchema])
async def list_dispatches(
    limit: int = Query(50, ge=1, le=100),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Public: recent breaking-news dispatches — powers the JUST IN ticker and
    the Bytes page."""
    return await dispatch_service.list_dispatches(db, limit=limit)


@router.post("/", response_model=DispatchSchema, status_code=201)
@limiter.limit(MUTATION_LIMIT)
async def create_dispatch(
    request: Request,
    body: DispatchCreate,
    background_tasks: BackgroundTasks,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: UserModel = Depends(get_current_editor),
):
    """Create a dispatch (admin/editor only). Also pushes to subscribers with
    "Breaking News" enabled — fired after the response so a large subscriber
    base never delays the admin's save."""
    try:
        dispatch = await dispatch_service.create_dispatch(
            db, text=body.text, article_id=body.article_id, created_by=current_user.id
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    background_tasks.add_task(
        push_service.send_to_segment,
        db,
        "breaking",
        {
            "title": "Breaking — Open Vaartha",
            "body": dispatch["text"],
            "url": f"/article/{dispatch['article_slug']}" if dispatch.get("article_slug") else "/bytes",
        },
    )
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
