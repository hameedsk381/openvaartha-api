from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.database import get_db
from app.core.dependencies import get_current_user, get_current_user_optional
from app.schemas.poll import PollCreate, PollResponse, PollVoteCreate
from app.models.user import User as UserModel
from app.services import poll_service

router = APIRouter()

@router.post("/", response_model=str, status_code=status.HTTP_201_CREATED)
async def create_poll(
    poll: PollCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    if current_user.role not in ("admin", "editor"):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    poll_id = await poll_service.create_poll(db, poll)
    return poll_id

@router.get("/{poll_id}", response_model=PollResponse)
async def get_poll(
    poll_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: UserModel = Depends(get_current_user_optional)
):
    user_id = current_user.id if current_user else None
    poll = await poll_service.get_poll_with_results(db, poll_id, user_id)
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    return poll

@router.post("/{poll_id}/vote", response_model=PollResponse)
async def vote_on_poll(
    poll_id: str,
    vote: PollVoteCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    try:
        await poll_service.vote_poll(db, poll_id, current_user.id, vote.optionId)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Return updated results
    poll = await poll_service.get_poll_with_results(db, poll_id, current_user.id)
    return poll
