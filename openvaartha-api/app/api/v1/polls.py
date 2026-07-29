from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.db.mongodb import get_database
from app.api.deps import get_current_user, get_current_user_optional, check_role
from app.schemas.poll import PollCreate, PollResponse, PollVoteCreate
from app.models.user import User
from app.services import poll_service

router = APIRouter()

@router.post("/", response_model=str, status_code=status.HTTP_201_CREATED)
async def create_poll(
    poll: PollCreate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: User = Depends(get_current_user)
):
    check_role(current_user, ["admin", "editor"])
    poll_id = await poll_service.create_poll(db, poll)
    return poll_id

@router.get("/{poll_id}", response_model=PollResponse)
async def get_poll(
    poll_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: User = Depends(get_current_user_optional)
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
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: User = Depends(get_current_user)
):
    try:
        await poll_service.vote_poll(db, poll_id, current_user.id, vote.optionId)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Return updated results
    poll = await poll_service.get_poll_with_results(db, poll_id, current_user.id)
    return poll
