import uuid
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.poll import Poll, PollOption, PollVote
from app.schemas.poll import PollCreate, PollResponse, PollOptionResponse
from typing import Optional, List
import pymongo

async def ensure_poll_indexes(db: AsyncIOMotorDatabase):
    await db["poll_votes"].create_index([("poll_id", 1), ("user_id", 1)], unique=True)
    # Powers the Polls Hub list (newest first, optionally active-only).
    await Poll.get_motor_collection().create_index([("is_active", 1), ("created_at", -1)])

async def create_poll(db: AsyncIOMotorDatabase, poll_data: PollCreate) -> str:
    poll_id = str(uuid.uuid4())
    poll_options = [
        PollOption(id=opt.id, text=opt.text, votes=0) for opt in poll_data.options
    ]
    poll = Poll(_id=poll_id, question=poll_data.question, options=poll_options)
    await Poll(**poll.dict(by_alias=True)).insert()
    return poll_id

def _build_poll_response(poll_doc: dict, user_voted_option_id: Optional[str]) -> PollResponse:
    poll = Poll(**poll_doc)
    total = poll.total_votes
    options_responses = [
        PollOptionResponse(
            id=opt.id, text=opt.text, votes=opt.votes,
            percentage=round((opt.votes / total * 100) if total > 0 else 0.0, 1),
        )
        for opt in poll.options
    ]
    return PollResponse(
        id=poll.id,
        question=poll.question,
        options=options_responses,
        totalVotes=poll.total_votes,
        userVotedOptionId=user_voted_option_id,
        isActive=poll.is_active,
        createdAt=poll.created_at,
    )

async def get_poll_with_results(
    db: AsyncIOMotorDatabase, poll_id: str, current_user_id: Optional[str] = None
) -> Optional[PollResponse]:
    poll_doc = await Poll.get_motor_collection().find_one({"_id": poll_id})
    if not poll_doc:
        return None

    user_voted_option_id = None
    if current_user_id:
        vote_doc = await db["poll_votes"].find_one({"poll_id": poll_id, "user_id": current_user_id})
        if vote_doc:
            user_voted_option_id = vote_doc["option_id"]

    return _build_poll_response(poll_doc, user_voted_option_id)

async def list_polls(
    db: AsyncIOMotorDatabase,
    active_only: bool = True,
    current_user_id: Optional[str] = None,
    limit: int = 50,
) -> List[PollResponse]:
    """Polls Hub feed — newest first. ``active_only`` is the public default
    (closed/archived polls stay visible via direct link and in admin, just
    not cluttering the hub)."""
    query: dict = {"is_active": True} if active_only else {}
    cursor = Poll.get_motor_collection().find(query).sort("created_at", -1).limit(limit)
    poll_docs = await cursor.to_list(length=limit)
    if not poll_docs:
        return []

    user_votes: dict[str, str] = {}
    if current_user_id:
        poll_ids = [p["_id"] for p in poll_docs]
        vote_cursor = db["poll_votes"].find(
            {"poll_id": {"$in": poll_ids}, "user_id": current_user_id},
            {"poll_id": 1, "option_id": 1},
        )
        user_votes = {v["poll_id"]: v["option_id"] async for v in vote_cursor}

    return [_build_poll_response(doc, user_votes.get(doc["_id"])) for doc in poll_docs]

async def set_poll_active(db: AsyncIOMotorDatabase, poll_id: str, is_active: bool) -> Optional[PollResponse]:
    result = await Poll.get_motor_collection().update_one(
        {"_id": poll_id}, {"$set": {"is_active": is_active}}
    )
    if result.matched_count == 0:
        return None
    return await get_poll_with_results(db, poll_id)

async def vote_poll(db: AsyncIOMotorDatabase, poll_id: str, user_id: str, option_id: str) -> bool:
    # Check if poll exists
    poll_doc = await Poll.get_motor_collection().find_one({"_id": poll_id, "is_active": True})
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
    await Poll.get_motor_collection().update_one(
        {"_id": poll_id, "options.id": option_id},
        {
            "$inc": {
                "total_votes": 1,
                "options.$.votes": 1
            }
        }
    )

    return True
