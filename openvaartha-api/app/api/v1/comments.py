from fastapi import APIRouter, Depends, HTTPException, Query, Request
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List

from app.core.dependencies import get_current_moderator, get_current_user, get_current_user_optional
from app.core.rate_limit import limiter, MUTATION_LIMIT
from app.database import get_db
from app.models.user import User as UserModel
from app.schemas.comment import Comment as CommentSchema, CommentCreate, CommentUpdate
from app.services import comment_service

router = APIRouter()


@router.get("/", response_model=List[CommentSchema])
async def list_comments(
    article_id: str = Query(..., description="Article ID to fetch comments for"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Get top-level comments for an article (with reply counts)."""
    return await comment_service.get_comments(db, article_id, skip=skip, limit=limit)


@router.get("/replies", response_model=List[CommentSchema])
async def get_replies(
    parent_id: str = Query(...),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Get replies to a specific comment."""
    return await comment_service.get_replies(db, parent_id, skip=skip, limit=limit)


@router.get("/count")
async def comment_count(
    article_id: str = Query(...),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Get comment count for an article."""
    count = await comment_service.get_comment_count(db, article_id)
    return {"count": count}


@router.post("/", response_model=CommentSchema, status_code=201)
@limiter.limit(MUTATION_LIMIT)
async def create_comment(
    request: Request,
    article_id: str = Query(...),
    body: CommentCreate = ...,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """Create a comment on an article (auth required)."""
    try:
        return await comment_service.create_comment(
            db,
            article_id=article_id,
            user_id=current_user.id,
            author_name=current_user.full_name,
            author_email=current_user.email,
            body=body.body,
            parent_id=body.parent_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{comment_id}", response_model=CommentSchema)
@limiter.limit(MUTATION_LIMIT)
async def update_comment(
    request: Request,
    comment_id: str,
    body: CommentUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """Update own comment (auth required)."""
    try:
        updated = await comment_service.update_comment(
            db, comment_id, current_user.id, body.body
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Comment not found")
        return updated
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.delete("/{comment_id}")
@limiter.limit(MUTATION_LIMIT)
async def delete_comment(
    request: Request,
    comment_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """Delete own comment (auth required). Admins and moderators can delete any comment."""
    can_moderate = current_user.is_admin or current_user.role == "moderator"
    try:
        success = await comment_service.delete_comment(
            db, comment_id, current_user.id, is_admin=can_moderate
        )
        if not success:
            raise HTTPException(status_code=404, detail="Comment not found")
        return {"message": "Comment deleted"}
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.post("/{comment_id}/like")
@limiter.limit(MUTATION_LIMIT)
async def toggle_comment_like(
    request: Request,
    comment_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """Like or unlike a comment (auth required)."""
    try:
        return await comment_service.toggle_like(db, comment_id, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
