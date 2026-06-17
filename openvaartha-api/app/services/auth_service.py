from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import timedelta, datetime, timezone
from uuid import uuid4

from app.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_password_hash,
    verify_password,
)
from app.models.user import User
from app.schemas.user import UserCreate


# Roles a self-service registration is allowed to set on its own account.
# Admin and editor must be granted by an existing admin or by the CLI.
_SELF_SERVICE_ROLES = {"user"}


async def get_user_by_email(db: AsyncIOMotorDatabase, email: str):
    """Get user by email."""
    user_doc = await db["users"].find_one({"email": email})
    if user_doc:
        return User(**user_doc)
    return None


async def get_user_by_id(db: AsyncIOMotorDatabase, user_id: str):
    """Get user by ID."""
    user_doc = await db["users"].find_one({"_id": user_id})
    if user_doc:
        return User(**user_doc)
    return None


async def create_user(db: AsyncIOMotorDatabase, user_data: UserCreate):
    """Create a new user.

    Self-service registration ALWAYS creates a non-admin ``role="user"``
    account, even if the request body asks for ``admin``/``editor`` and even
    if the email appears in ``ADMIN_EMAILS``. Admin elevation happens out of
    band via ``scripts/setup_admin.py`` or an existing admin promoting them.
    """
    requested_role = (user_data.role or "user").lower()
    safe_role = requested_role if requested_role in _SELF_SERVICE_ROLES else "user"

    user_id = str(uuid4())
    user_doc = {
        "_id": user_id,
        "email": user_data.email,
        "full_name": user_data.full_name,
        "hashed_password": get_password_hash(user_data.password),
        "is_active": True,
        "is_admin": False,
        "role": safe_role,
        "created_at": datetime.now(timezone.utc),
    }

    await db["users"].insert_one(user_doc)
    user_doc = await db["users"].find_one({"_id": user_id})
    return User(**user_doc)


async def authenticate_user(db: AsyncIOMotorDatabase, email: str, password: str):
    """Authenticate a user."""
    user = await get_user_by_email(db, email)
    if not user:
        return False

    if not verify_password(password, user.hashed_password):
        return False

    return user


def create_tokens(user: User):
    """Create access and refresh tokens for a user."""
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    access_token = create_access_token(
        data={"sub": user.id, "email": user.email},
        expires_delta=access_token_expires,
    )

    refresh_token = create_refresh_token(
        data={"sub": user.id, "email": user.email},
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }
