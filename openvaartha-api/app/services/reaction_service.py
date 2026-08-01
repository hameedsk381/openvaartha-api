from app.models.article import Article
import logging
from typing import Dict, Optional
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.reaction import ReactionType

logger = logging.getLogger(__name__)


async def ensure_reaction_indexes(db: AsyncIOMotorDatabase):
    """Ensure indexes on reactions collection."""
    try:
        await db["article_reactions"].create_index(
            [("article_id", 1), ("reaction_type", 1)]
        )
        await db["article_reactions"].create_index(
            [("article_id", 1), ("user_id", 1), ("reaction_type", 1)],
            unique=True,
            partialFilterExpression={"user_id": {"$type": "string"}},
        )
    except Exception as e:
        logger.warning("Failed to create reaction indexes: %s", e)


async def get_reaction_counts(db: AsyncIOMotorDatabase, article_id: str, user_id: Optional[str] = None) -> Dict:
    """Get count per reaction type for an article, and which reactions the user selected."""
    pipeline = [
        {"$match": {"article_id": article_id}},
        {"$group": {"_id": "$reaction_type", "count": {"$sum": 1}}},
    ]

    cursor = db["article_reactions"].aggregate(pipeline)
    counts = {r.value: 0 for r in ReactionType}

    async for doc in cursor:
        r_type = doc["_id"]
        if r_type in counts:
            counts[r_type] = doc["count"]

    user_reactions = []
    if user_id:
        user_docs = await db["article_reactions"].find(
            {"article_id": article_id, "user_id": user_id}
        ).to_list(length=20)
        user_reactions = [d["reaction_type"] for d in user_docs]

    return {
        "counts": counts,
        "total": sum(counts.values()),
        "user_reactions": user_reactions,
    }


async def toggle_reaction(
    db: AsyncIOMotorDatabase,
    article_id: str,
    reaction_type: str,
    user_id: Optional[str] = None,
    client_ip: Optional[str] = None,
) -> Dict:
    """Add or remove a reaction for an article. Returns updated counts."""
    valid_types = {r.value for r in ReactionType}
    if reaction_type not in valid_types:
        raise ValueError(f"Invalid reaction type: {reaction_type}")

    # Ensure article exists
    article = await Article.find_one({"_id": article_id})
    if not article:
        return {"error": "Article not found"}

    query = {"article_id": article_id, "reaction_type": reaction_type}
    if user_id:
        query["user_id"] = user_id
    elif client_ip:
        query["client_ip"] = client_ip
    else:
        # Fallback for anonymous with no IP
        query["client_ip"] = "anonymous"

    existing = await db["article_reactions"].find_one(query)

    if existing:
        # User already reacted -> toggle off (remove)
        await db["article_reactions"].delete_one({"_id": existing["_id"]})
        added = False
    else:
        # Insert new reaction
        reaction_doc = {
            "article_id": article_id,
            "reaction_type": reaction_type,
            "user_id": user_id,
            "client_ip": client_ip,
            "created_at": datetime.now(timezone.utc),
        }
        await db[\"article_reactions\"].insert_one(reaction_doc)
        added = True

    updated_data = await get_reaction_counts(db, article_id, user_id=user_id)
    updated_data["added"] = added
    
    from app.core.ws_manager import manager
    await manager.broadcast("NEW_REACTION", {
        "article_id": article_id,
        "counts": updated_data["counts"],
        "total": updated_data["total"]
    })
    
    return updated_data
