from app.models.user import User
import bcrypt as _bcrypt
from datetime import datetime, timezone
from uuid import uuid4
from motor.motor_asyncio import AsyncIOMotorDatabase


def _hash_password(password: str) -> str:
    return _bcrypt.hashpw(password.encode(), _bcrypt.gensalt()).decode()


async def ensure_admin_user(db: AsyncIOMotorDatabase) -> None:
    """Create default admin & reader accounts if they don't exist.

    Idempotent — safe to call on every startup.
    """
    defaults = [
        ("admin@openvaartha.com", "OpenVaartha Admin", "admin123", True, True, "admin"),
        ("editor@openvaartha.com", "Test Editor", "editor123", True, False, "editor"),
        ("moderator@openvaartha.com", "Test Moderator", "moderator123", True, False, "moderator"),
        ("user@openvaartha.com",  "Test Reader",       "user123",  True, False, "user"),
    ]
    for email, name, pw, active, is_admin, role in defaults:
        existing = await User.get_motor_collection().find_one({"email": email})
        if existing:
            continue

        uid = str(uuid4())
        await User(**{
            "_id": uid,
            "id": uid,
            "email": email,
            "full_name": name,
            "hashed_password": _hash_password(pw),
            "is_active": active,
            "is_admin": is_admin,
            "role": role,
            "avatar_url": None,
            "created_at": datetime.now(timezone.utc),
        })
