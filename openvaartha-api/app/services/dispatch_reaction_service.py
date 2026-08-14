import uuid
from typing import List, Optional
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
import pymongo

async def ensure_dispatch_reaction_indexes(db: AsyncIOMotorDatabase) -> None:
    """Create compound unique indexes on (dispatch_id, user_id) in dispatch_reactions and dispatch_reposts collections."""
    await db.dispatch_reactions.create_index(
        [("dispatch_id", pymongo.ASCENDING), ("user_id", pymongo.ASCENDING)],
        unique=True
    )
    await db.dispatch_reactions.create_index([("dispatch_id", pymongo.ASCENDING)])

    await db.dispatch_reposts.create_index(
        [("dispatch_id", pymongo.ASCENDING), ("user_id", pymongo.ASCENDING)],
        unique=True
    )
    await db.dispatch_reposts.create_index([("dispatch_id", pymongo.ASCENDING)])

async def toggle_like(db: AsyncIOMotorDatabase, dispatch_id: str, user_id: str) -> dict:
    """Toggle a like. If already liked, remove it. Returns {liked: bool, like_count: int}."""
    collection = db.dispatch_reactions
    existing = await collection.find_one({"dispatch_id": dispatch_id, "user_id": user_id})
    
    if existing:
        await collection.delete_one({"_id": existing["_id"]})
        liked = False
    else:
        doc = {
            "_id": str(uuid.uuid4()),
            "dispatch_id": dispatch_id,
            "user_id": user_id,
            "created_at": datetime.now(timezone.utc)
        }
        await collection.insert_one(doc)
        liked = True
        
    like_count = await collection.count_documents({"dispatch_id": dispatch_id})
    return {"liked": liked, "like_count": like_count}

async def get_like_counts(db: AsyncIOMotorDatabase, dispatch_ids: List[str]) -> dict:
    """Batch fetch like counts for multiple dispatches. Returns {dispatch_id: count}."""
    if not dispatch_ids:
        return {}
    
    pipeline = [
        {"$match": {"dispatch_id": {"$in": dispatch_ids}}},
        {"$group": {"_id": "$dispatch_id", "count": {"$sum": 1}}}
    ]
    
    cursor = db.dispatch_reactions.aggregate(pipeline)
    counts = {doc["_id"]: doc["count"] async for doc in cursor}
    
    return {dispatch_id: counts.get(dispatch_id, 0) for dispatch_id in dispatch_ids}

async def has_user_liked(db: AsyncIOMotorDatabase, dispatch_ids: List[str], user_id: Optional[str]) -> dict:
    """Batch check if a user has liked each dispatch. Returns {dispatch_id: bool}."""
    if not user_id or not dispatch_ids:
        return {dispatch_id: False for dispatch_id in dispatch_ids}
        
    cursor = db.dispatch_reactions.find({
        "dispatch_id": {"$in": dispatch_ids},
        "user_id": user_id
    }, {"dispatch_id": 1})
    
    liked_set = {doc["dispatch_id"] async for doc in cursor}
    
    return {dispatch_id: (dispatch_id in liked_set) for dispatch_id in dispatch_ids}

# Repost functions
async def toggle_repost(db: AsyncIOMotorDatabase, dispatch_id: str, user_id: str) -> dict:
    """Toggle a repost. If already reposted, remove it. Returns {reposted: bool, repost_count: int}."""
    collection = db.dispatch_reposts
    existing = await collection.find_one({"dispatch_id": dispatch_id, "user_id": user_id})
    
    if existing:
        await collection.delete_one({"_id": existing["_id"]})
        reposted = False
    else:
        doc = {
            "_id": str(uuid.uuid4()),
            "dispatch_id": dispatch_id,
            "user_id": user_id,
            "created_at": datetime.now(timezone.utc)
        }
        await collection.insert_one(doc)
        reposted = True
        
    repost_count = await collection.count_documents({"dispatch_id": dispatch_id})
    return {"reposted": reposted, "repost_count": repost_count}

async def get_repost_counts(db: AsyncIOMotorDatabase, dispatch_ids: List[str]) -> dict:
    """Batch fetch repost counts for multiple dispatches."""
    if not dispatch_ids:
        return {}
    
    pipeline = [
        {"$match": {"dispatch_id": {"$in": dispatch_ids}}},
        {"$group": {"_id": "$dispatch_id", "count": {"$sum": 1}}}
    ]
    
    cursor = db.dispatch_reposts.aggregate(pipeline)
    counts = {doc["_id"]: doc["count"] async for doc in cursor}
    
    return {dispatch_id: counts.get(dispatch_id, 0) for dispatch_id in dispatch_ids}

async def has_user_reposted(db: AsyncIOMotorDatabase, dispatch_ids: List[str], user_id: Optional[str]) -> dict:
    """Batch check if a user has reposted each dispatch."""
    if not user_id or not dispatch_ids:
        return {dispatch_id: False for dispatch_id in dispatch_ids}
        
    cursor = db.dispatch_reposts.find({
        "dispatch_id": {"$in": dispatch_ids},
        "user_id": user_id
    }, {"dispatch_id": 1})
    
    reposted_set = {doc["dispatch_id"] async for doc in cursor}
    
    return {dispatch_id: (dispatch_id in reposted_set) for dispatch_id in dispatch_ids}

async def get_comment_counts(db: AsyncIOMotorDatabase, dispatch_ids: List[str]) -> dict:
    """Batch fetch comment counts for dispatches."""
    if not dispatch_ids:
        return {}
    
    pipeline = [
        {"$match": {"dispatch_id": {"$in": dispatch_ids}, "is_active": True}},
        {"$group": {"_id": "$dispatch_id", "count": {"$sum": 1}}}
    ]
    
    cursor = db.comments.aggregate(pipeline)
    counts = {doc["_id"]: doc["count"] async for doc in cursor}
    
    return {dispatch_id: counts.get(dispatch_id, 0) for dispatch_id in dispatch_ids}

