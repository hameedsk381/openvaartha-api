from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import timedelta, datetime, timezone
from uuid import uuid4

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from app.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_password_hash,
    verify_password,
)
from app.models.user import User
from app.schemas.user import UserCreate

# Reused across requests — internally caches Google's signing-key fetches
# rather than hitting Google's discovery endpoint on every sign-in.
_google_auth_request = google_requests.Request()


# Roles a self-service registration is allowed to set on its own account.
# Admin and editor must be granted by an existing admin or by the CLI.
_SELF_SERVICE_ROLES = {"user"}


async def get_user_by_email(db: AsyncIOMotorDatabase, email: str):
    """Get user by email."""
    user_doc = await User.get_motor_collection().find_one({"email": email})
    if user_doc:
        return User(**user_doc)
    return None


async def get_user_by_id(db: AsyncIOMotorDatabase, user_id: str):
    """Get user by ID."""
    user_doc = await User.get_motor_collection().find_one({"_id": user_id})
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

    await User(**user_doc).insert()
    user_doc = await User.get_motor_collection().find_one({"_id": user_id})
    return User(**user_doc)


async def authenticate_user(db: AsyncIOMotorDatabase, email: str, password: str):
    """Authenticate a user."""
    user = await get_user_by_email(db, email)
    if not user:
        return False

    if not verify_password(password, user.hashed_password):
        return False

    return user


async def authenticate_google(db: AsyncIOMotorDatabase, google_credential: str) -> User:
    """Verify a Google Identity Services ID token and return the matching
    (or newly created) local user.

    Raises ``ValueError`` on any invalid/expired/wrong-audience token — the
    same exception type ``google.oauth2.id_token.verify_oauth2_token`` itself
    raises, so callers can catch just ``ValueError``.
    """
    if not settings.GOOGLE_CLIENT_ID:
        raise ValueError("Google sign-in is not configured")

    import asyncio
    claims = await asyncio.to_thread(
        google_id_token.verify_oauth2_token,
        google_credential, _google_auth_request, settings.GOOGLE_CLIENT_ID
    )

    if not claims.get("email_verified", False):
        raise ValueError("Google account email is not verified")

    email = claims["email"]
    google_sub = claims["sub"]
    full_name = claims.get("name") or email.split("@")[0]
    avatar_url = claims.get("picture")

    user_doc = await User.get_motor_collection().find_one({"google_sub": google_sub})
    if user_doc:
        return User(**user_doc)

    # No account linked to this Google subject yet — check for a pre-existing
    # local account with the same (verified) email and link it, rather than
    # creating a duplicate account under the same address.
    user_doc = await User.get_motor_collection().find_one({"email": email})
    if user_doc:
        await User.get_motor_collection().update_one(
            {"_id": user_doc["_id"]},
            {"$set": {"google_sub": google_sub, "updated_at": datetime.now(timezone.utc)}},
        )
        user_doc["google_sub"] = google_sub
        return User(**user_doc)

    # Brand new account. Mirrors create_user()'s rule: sign-in can never grant
    # anything above the default "user" role — admin/editor is always a
    # separate, out-of-band elevation.
    user_id = str(uuid4())
    new_doc = {
        "_id": user_id,
        "email": email,
        "full_name": full_name,
        "hashed_password": None,
        "avatar_url": avatar_url,
        "is_active": True,
        "is_admin": False,
        "role": "user",
        "auth_provider": "google",
        "google_sub": google_sub,
        "created_at": datetime.now(timezone.utc),
    }
    await User(**new_doc).insert()
    return User(**new_doc)


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
