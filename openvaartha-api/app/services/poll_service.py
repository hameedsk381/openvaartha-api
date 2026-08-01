import uuid
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.poll import Poll, PollOption, PollVote
from app.schemas.poll import PollCreate, PollResponse, PollOptionResponse
from typing import Optional, List
import pymongo

async def ensure_poll_indexes(db: AsyncIOMotorDatabase):
    await db["poll_votes"].create_index([("poll_id", 1), ("user_id", 1)], unique=True)

async def create_poll(db: AsyncIOMotorDatabase, poll_data: PollCreate) -> str:
    poll_id = str(uuid.uuid4())
    poll_options = [
        PollOption(id=opt.id, text=opt.text, votes=0) for opt in poll_data.options
    ]
    poll = Poll(_id=poll_id, question=poll_data.question, options=poll_options)
    await Poll(**poll.dict(by_alias=True).insert())
    return poll_id

async def get_poll_with_results(
    db: AsyncIOMotorDatabase, poll_id: str, current_user_id: Optional[str] = None
) -> Optional[PollResponse]:
    poll_doc = await Poll.find_one({"_id": poll_id})
    if not poll_doc:
        return None

    poll = Poll(**poll_doc)
    
    # Check if the user voted
    user_voted_option_id = None
    if current_user_id:
        vote_doc = await db["poll_votes"].find_one({"poll_id": poll_id, "user_id": current_user_id})
        if vote_doc:
            user_voted_option_id = vote_doc["option_id"]

    # Calculate percentages
    total = poll.total_votes
    options_responses = []
    for opt in poll.options:
        percentage = (opt.votes / total * 100) if total > 0 else 0.0
        options_responses.append(
            PollOptionResponse(id=opt.id, text=opt.text, votes=opt.votes, percentage=round(percentage, 1))
        )
    
    return PollResponse(
        id=poll.id,
        question=poll.question,
        options=options_responses,
        totalVotes=poll.total_votes,
        userVotedOptionId=user_voted_option_id,
        createdAt=poll.created_at,
    )

async def vote_poll(db: AsyncIOMotorDatabase, poll_id: str, user_id: str, option_id: str) -> bool:
    # Check if poll exists
    poll_doc = await Poll.find_one({"_id": poll_id, "is_active": True})
    if not poll_doc:
        raise ValueError("Poll not found or inactive")
    
    # Verify option exists
    if not any(opt["id"] == option_id for opt in poll_doc["options"]):
        raise ValueError("Invalid poll option")

    # Create vote, relying on unique index to prevent race conditions
    vote = PollVote(poll_id=poll_id, user_id=user_id, option_id=option_id)
    try:
        await db["poll_votes"].insert_one(vote.dict(by_alias=True))
    except pymongo.errors.DuplicateKeyError:
        raise ValueError("User has already voted on this poll")
    
    # Increment total_votes and the specific option's votes in the polls collection
    await Poll.update_one(
        {"_id": poll_id, "options.id": option_id},
        {
            "$inc": {
                "total_votes": 1,
                "options.$.votes": 1
            }
        }
    )
    
    return True
