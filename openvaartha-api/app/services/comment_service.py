from app.models.comment import Comment
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from uuid import uuid4
from datetime import datetime, timezone

from app.core.sanitize import sanitize_text


async def ensure_comment_indexes(db: AsyncIOMotorDatabase) -> None:
    await Comment.get_motor_collection().create_index([("article_id", 1), ("created_at", -1)])
    await Comment.get_motor_collection().create_index([("article_id", 1), ("is_active", 1), ("created_at", -1)])
    await Comment.get_motor_collection().create_index([("user_id", 1)])
    await Comment.get_motor_collection().create_index([("parent_id", 1)])


async def get_comments(
    db: AsyncIOMotorDatabase,
    article_id: str,
    skip: int = 0,
    limit: int = 50,
) -> List[dict]:
    pipeline = [
        {"$match": {"article_id": article_id, "is_active": True}},
        {"$sort": {"created_at": -1}},
        {"$skip": skip},
        {"$limit": limit},
        {
            "$lookup": {
                "from": "comments",
                "let": {"comment_id": "$_id"},
                "pipeline": [
                    {"$match": {"$expr": {"$eq": ["$parent_id", "$$comment_id"]}, "is_active": True}},
                    {"$count": "count"},
                ],
                "as": "replies",
            }
        },
        {
            "$addFields": {
                "reply_count": {
                    "$ifNull": [{"$arrayElemAt": ["$replies.count", 0]}, 0]
                },
                "id": "$_id",
            }
        },
        {"$project": {"replies": 0}},
    ]
    cursor = Comment.aggregate(pipeline)
    return await cursor.to_list(length=limit)


async def get_replies(
    db: AsyncIOMotorDatabase,
    parent_id: str,
    skip: int = 0,
    limit: int = 20,
) -> List[dict]:
    cursor = (
        Comment
        .find({"parent_id": parent_id, "is_active": True})
        .sort("created_at", 1)
        .skip(skip)
        .limit(limit)
    )
    return [{"id": c["_id"], **c} for c in await cursor.to_list(length=limit)]


async def create_comment(
    db: AsyncIOMotorDatabase,
    article_id: str,
    user_id: str,
    author_name: str,
    author_email: str,
    body: str,
    parent_id: Optional[str] = None,
) -> dict:
    comment_id = str(uuid4())

    if parent_id:
        parent = await Comment.find_one({"_id": parent_id, "is_active": True})
        if not parent:
            raise ValueError("Parent comment not found")

    doc = {
        "_id": comment_id,
        "article_id": article_id,
        "user_id": user_id,
        "author_name": author_name,
        "author_email": author_email,
        "body": sanitize_text(body),
        "parent_id": parent_id,
        "likes": [],
        "is_edited": False,
        "is_flagged": False,
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "updated_at": None,
    }
    await Comment(**doc).insert()
    result = {**doc, "id": comment_id, "reply_count": 0}
    
    from app.core.ws_manager import manager
    await manager.broadcast("NEW_COMMENT", {
        "article_id": article_id,
        "comment": result
    })
    
    return result


async def update_comment(
    db: AsyncIOMotorDatabase,
    comment_id: str,
    user_id: str,
    body: str,
) -> Optional[dict]:
    comment = await Comment.find_one({"_id": comment_id})
    if not comment:
        return None
    if comment["user_id"] != user_id:
        raise PermissionError("Cannot edit another user's comment")

    await Comment.update_one(
        {"_id": comment_id},
        {"$set": {"body": sanitize_text(body), "is_edited": True, "updated_at": datetime.now(timezone.utc)}},
    )
    return await Comment.find_one({"_id": comment_id})


async def delete_comment(
    db: AsyncIOMotorDatabase,
    comment_id: str,
    user_id: str,
    is_admin: bool = False,
) -> bool:
    comment = await Comment.find_one({"_id": comment_id})
    if not comment:
        return False
    if comment["user_id"] != user_id and not is_admin:
        raise PermissionError("Cannot delete another user's comment")

    await Comment.update_one(
        {"_id": comment_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}},
    )
    return True


async def toggle_like(db: AsyncIOMotorDatabase, comment_id: str, user_id: str) -> dict:
    comment = await Comment.find_one({"_id": comment_id, "is_active": True})
    if not comment:
        raise ValueError("Comment not found")

    if user_id in comment.get("likes", []):
        await Comment.update_one(
            {"_id": comment_id},
            {"$pull": {"likes": user_id}},
        )
        return {"liked": False}
    else:
        await Comment.update_one(
            {"_id": comment_id},
            {"$addToSet": {"likes": user_id}},
        )
        return {"liked": True}


async def get_comment_count(db: AsyncIOMotorDatabase, article_id: str) -> int:
    return await Comment.count_documents(
        {"article_id": article_id, "is_active": True}
    )
