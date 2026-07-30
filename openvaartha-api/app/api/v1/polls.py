from fastapi import APIRouter, Depends, HTTPException, status, Request
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.database import get_db
from app.core.dependencies import get_current_user, get_current_user_optional
from app.schemas.poll import PollCreate, PollResponse, PollVoteCreate
from app.models.user import User as UserModel
from app.core.rate_limit import limiter
from app.services import poll_service

router = APIRouter()

@router.post("/", response_model=str, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def create_poll(
    request: Request,
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
    if poll_id == "101":
        return {
            "id": "101",
            "question": "Do you think AI will replace software engineers in the next 5 years?",
            "options": [
                {"id": "opt1", "text": "Absolutely", "votes": 42, "percentage": 20.0},
                {"id": "opt2", "text": "No, it will augment them", "votes": 124, "percentage": 59.0},
                {"id": "opt3", "text": "Not at all", "votes": 44, "percentage": 21.0}
            ],
            "totalVotes": 210,
            "userVotedOptionId": None
        }
        
    user_id = current_user.id if current_user else None
    poll = await poll_service.get_poll_with_results(db, poll_id, user_id)
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    return poll

@router.post("/{poll_id}/vote", response_model=PollResponse)
@limiter.limit("5/minute")
async def vote_poll(
    request: Request,
    poll_id: str,
    vote: PollVoteCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: UserModel = Depends(get_current_user_optional)
):
    if poll_id == "101":
        # Return mock updated poll
        return {
            "id": "101",
            "question": "Do you think AI will replace software engineers in the next 5 years?",
            "options": [
                {"id": "opt1", "text": "Absolutely", "votes": 43 if vote.optionId == "opt1" else 42, "percentage": 20.0},
                {"id": "opt2", "text": "No, it will augment them", "votes": 125 if vote.optionId == "opt2" else 124, "percentage": 59.0},
                {"id": "opt3", "text": "Not at all", "votes": 45 if vote.optionId == "opt3" else 44, "percentage": 21.0}
            ],
            "totalVotes": 211,
            "userVotedOptionId": vote.optionId
        }
        
    user_id = current_user.id if current_user else None
    if not user_id:
        # If we allow anonymous voting, we could use IP or a generic ID.
        # But let's just require login for real polls.
        raise HTTPException(status_code=401, detail="Must be logged in to vote")

    try:
        await poll_service.vote_poll(db, poll_id, user_id, vote.optionId)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Return updated results
    poll = await poll_service.get_poll_with_results(db, poll_id, user_id)
    return poll
