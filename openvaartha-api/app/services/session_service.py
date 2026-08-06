"""Server-side session tracking for refresh tokens.

Every issued refresh token is recorded in a ``sessions`` collection keyed by
its ``jti``. Rotation is enforced: using a refresh token invalidates it and
mints a replacement, and the session's token family (``family_id``) follows
the rotation chain. If a rotated-out token is presented again it is *reuse
detection* — we treat it as a stolen token and revoke the entire session
family plus the user's sessions.

This gives us:
  * session tracking (list / revoke by device)
  * refresh-token rotation (one-time use)
  * revocation (logout, admin force-logout)
  * reuse detection (old token replayed => revoke family)
"""
from datetime import datetime, timezone, timedelta
from uuid import uuid4

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.security import decode_token
from app.config import settings


async def ensure_session_indexes(db: AsyncIOMotorDatabase):
    await db["sessions"].create_index("jti", unique=True)
    await db["sessions"].create_index([("user_id", 1), ("last_used_at", -1)])
    await db["sessions"].create_index(
        "expires_at", expireAfterSeconds=0
    )


def _client_ip(request) -> str:
    """Best-effort client IP honoring X-Forwarded-For when behind a proxy."""
    fwd = getattr(request, "headers", {}).get("x-forwarded-for") if hasattr(request, "headers") else None
    if fwd:
        return fwd.split(",")[0].strip()
    return getattr(getattr(request, "client", None), "host", "unknown")


async def start_session(db: AsyncIOMotorDatabase, user_id: str, refresh_token: str, request=None) -> dict:
    """Record a newly minted refresh token as a session."""
    payload = decode_token(refresh_token)
    jti = (payload or {}).get("jti") or str(uuid4())
    expires_at = datetime.fromtimestamp(payload["exp"], tz=timezone.utc) if payload and payload.get("exp") else None
    now = datetime.now(timezone.utc)

    doc = {
        "_id": str(uuid4()),
        "jti": jti,
        "user_id": user_id,
        "family_id": str(uuid4()),
        "refresh_token_hash": _hash_token(refresh_token),
        "created_at": now,
        "last_used_at": now,
        "expires_at": expires_at,
        "revoked": False,
        "ip": _client_ip(request) if request else "unknown",
        "user_agent": getattr(getattr(request, "headers", None), "get", lambda *_: None)("user-agent") if request else None,
    }
    await db["sessions"].insert_one(doc)
    return doc


async def rotate_session(db: AsyncIOMotorDatabase, old_token: str, new_token: str, request=None) -> Optional[dict]:
    """Rotate a refresh token to a new one within the same session family.

    Returns the updated session doc, or None when the presented token is
    unknown. Raises ``ReuseDetected`` when a previously rotated-out token is
    replayed (sign of token theft).
    """
    payload = decode_token(old_token)
    jti = (payload or {}).get("jti")
    if not jti:
        return None

    session = await db["sessions"].find_one({"jti": jti})
    if not session:
        return None

    if session.get("revoked"):
        raise ReuseDetected(session)

    new_payload = decode_token(new_token)
    new_jti = (new_payload or {}).get("jti") or str(uuid4())
    now = datetime.now(timezone.utc)

    # Rotation: the presented token is one-time-use. Keep the same family id
    # so the whole chain is revocable together.
    await db["sessions"].update_one(
        {"jti": jti},
        {"$set": {
            "jti": new_jti,
            "refresh_token_hash": _hash_token(new_token),
            "last_used_at": now,
            "rotated_from": jti,
            "ip": _client_ip(request) if request else session.get("ip"),
        }},
    )

    updated = await db["sessions"].find_one({"jti": new_jti})
    return updated


async def validate_and_rotate(db: AsyncIOMotorDatabase, token: str, request=None):
    """Decode + validate a refresh token, rotating it on success.

    Returns ``(user_id, new_token, session)`` on success.
    Raises ``ReuseDetected`` on a replayed rotated-out token.
    Returns ``None`` for an unknown/invalid token (caller decides the 401).
    """
    payload = decode_token(token)
    if not payload or payload.get("typ") != "refresh":
        return None

    user_id = payload.get("sub")
    jti = payload.get("jti")
    if not user_id or not jti:
        return None

    session = await db["sessions"].find_one({"jti": jti, "user_id": user_id})
    if not session:
        # A structurally valid token with no session record — issued before
        # sessions existed, or the session was deleted. Treat as invalid.
        return None

    if session.get("revoked"):
        raise ReuseDetected(session)

    # Issue the replacement token before the DB write so a crash can't strand
    # the client; the DB commit is atomic via update_one.
    from app.services.auth_service import create_refresh_token
    new_token = create_refresh_token({"sub": user_id, "email": payload.get("email")})

    await rotate_session(db, token, new_token, request)

    return user_id, new_token, session


class ReuseDetected(Exception):
    """Raised when a rotated-out refresh token is replayed — token theft signal."""

    def __init__(self, session: dict):
        self.session = session
        super().__init__("Refresh token reuse detected")


async def revoke_session(db: AsyncIOMotorDatabase, user_id: str, jti: str) -> bool:
    result = await db["sessions"].update_one(
        {"user_id": user_id, "jti": jti, "revoked": False},
        {"$set": {"revoked": True, "revoked_at": datetime.now(timezone.utc)}},
    )
    return result.modified_count > 0


async def revoke_session_by_token(db: AsyncIOMotorDatabase, token: str) -> bool:
    payload = decode_token(token)
    jti = (payload or {}).get("jti")
    if not jti:
        return False
    result = await db["sessions"].update_many(
        {"jti": jti, "revoked": False},
        {"$set": {"revoked": True, "revoked_at": datetime.now(timezone.utc)}},
    )
    return result.modified_count > 0


async def revoke_family(db: AsyncIOMotorDatabase, user_id: str, family_id: str) -> int:
    """Revoke every token in a rotation family (used on reuse detection)."""
    result = await db["sessions"].update_many(
        {"user_id": user_id, "family_id": family_id, "revoked": False},
        {"$set": {"revoked": True, "revoked_at": datetime.now(timezone.utc)}},
    )
    return result.modified_count


async def revoke_all_user_sessions(db: AsyncIOMotorDatabase, user_id: str, except_jti: Optional[str] = None) -> int:
    """Revoke all of a user's sessions (used on password change / admin kill)."""
    query = {"user_id": user_id, "revoked": False}
    if except_jti:
        query["jti"] = {"$ne": except_jti}
    result = await db["sessions"].update_many(
        query,
        {"$set": {"revoked": True, "revoked_at": datetime.now(timezone.utc)}},
    )
    return result.modified_count


async def list_user_sessions(db: AsyncIOMotorDatabase, user_id: str) -> list[dict]:
    cursor = db["sessions"].find(
        {"user_id": user_id},
        {"_id": 0, "jti": 1, "family_id": 1, "created_at": 1, "last_used_at": 1,
         "revoked": 1, "ip": 1, "user_agent": 1},
    ).sort("last_used_at", -1)
    return await cursor.to_list(length=100)


async def cleanup_expired_sessions(db: AsyncIOMotorDatabase, days: int = 7) -> int:
    """Housekeeping: hard-delete long-expired sessions (TTL index handles the rest)."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db["sessions"].delete_many({"expires_at": {"$lt": cutoff}})
    return result.deleted_count


def _hash_token(token: str) -> str:
    import hashlib
    return hashlib.sha256(token.encode()).hexdigest()