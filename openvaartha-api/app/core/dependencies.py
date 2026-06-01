from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional

from app.core.security import decode_token
from app.database import get_db
from app.models.user import User as UserModel

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/users/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> UserModel:
    """Get the current authenticated user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_token(token)
        if payload is None:
            raise credentials_exception

        # Refresh tokens MUST NOT be accepted as access tokens.
        if payload.get("typ") == "refresh":
            raise credentials_exception

        user_id: Optional[str] = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user_doc = await db["users"].find_one({"_id": user_id})
    if user_doc is None:
        raise credentials_exception

    user = UserModel(**user_doc)
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )

    return user


async def get_current_user_optional(
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> Optional[UserModel]:
    """Resolve the current user if a valid Bearer token is present; return None
    otherwise. Endpoints that adapt their response to auth state (e.g. drafts
    visible only to admins) consume this instead of forcing 401."""
    auth_header = request.headers.get("Authorization") or request.headers.get("authorization")
    if not auth_header or not auth_header.lower().startswith("bearer "):
        return None

    token = auth_header.split(" ", 1)[1].strip()
    if not token:
        return None

    payload = decode_token(token)
    if payload is None or payload.get("typ") == "refresh":
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    user_doc = await db["users"].find_one({"_id": user_id})
    if not user_doc:
        return None
    user = UserModel(**user_doc)
    return user if user.is_active else None


async def get_current_active_admin(
    current_user: UserModel = Depends(get_current_user)
) -> UserModel:
    """Get the current admin user."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user


async def get_current_editor(
    current_user: UserModel = Depends(get_current_user)
) -> UserModel:
    """Require editor role or admin. Editors can manage articles and categories."""
    if not current_user.is_admin and current_user.role != "editor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Editor or admin access required"
        )
    return current_user


async def get_current_moderator(
    current_user: UserModel = Depends(get_current_user)
) -> UserModel:
    """Require moderator role or admin. Moderators can manage comments and users."""
    if not current_user.is_admin and current_user.role != "moderator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Moderator or admin access required"
        )
    return current_user
