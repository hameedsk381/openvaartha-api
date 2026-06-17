from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List

from pydantic import BaseModel, EmailStr

from app.core.dependencies import get_current_user
from app.core.rate_limit import limiter, LOGIN_LIMIT, REFRESH_LIMIT, REGISTER_LIMIT
from app.core.security import decode_token
from app.database import get_db
from app.models.user import User as UserModel
from app.schemas.article import Article as ArticleSchema
from app.schemas.user import (
    RefreshTokenRequest,
    Token,
    User as UserSchema,
    UserCreate,
    UserUpdate,
)
from app.services import auth_service, user_service

router = APIRouter()


@router.post("/register", response_model=UserSchema)
@limiter.limit(REGISTER_LIMIT)
async def register_user(
    request: Request,
    user_data: UserCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Register a new user."""
    existing_user = await auth_service.get_user_by_email(db, email=user_data.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = await auth_service.create_user(db, user_data)
    return user


@router.post("/login", response_model=Token)
@limiter.limit(LOGIN_LIMIT)
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Login and get access token."""
    user = await auth_service.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return auth_service.create_tokens(user)


@router.post("/refresh", response_model=Token)
@limiter.limit(REFRESH_LIMIT)
async def refresh_access_token(
    request: Request,
    token_data: RefreshTokenRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Exchange a valid refresh token for a fresh token pair."""
    payload = decode_token(token_data.refresh_token)
    if not payload or payload.get("typ") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    user = await auth_service.get_user_by_id(db, user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    return auth_service.create_tokens(user)


@router.get("/me", response_model=UserSchema)
async def get_current_user_info(current_user: UserModel = Depends(get_current_user)):
    """Get current user profile."""
    return current_user


@router.put("/me", response_model=UserSchema)
async def update_user_profile(
    user_data: UserUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """Update current user profile."""
    update_data = user_data.model_dump(exclude_unset=True)

    # Users may never self-promote or self-disable through this endpoint.
    for protected in ("is_admin", "is_active", "role"):
        update_data.pop(protected, None)

    if "email" in update_data:
        existing_user = await auth_service.get_user_by_email(db, update_data["email"])
        if existing_user and existing_user.id != current_user.id:
            raise HTTPException(status_code=400, detail="Email already in use")

    if "password" in update_data:
        if not user_data.current_password:
            raise HTTPException(status_code=400, detail="Current password required to change password")

        from app.core.security import verify_password, get_password_hash
        if not verify_password(user_data.current_password, current_user.hashed_password):
            raise HTTPException(status_code=400, detail="Incorrect current password")

        update_data["hashed_password"] = get_password_hash(update_data["password"])
        del update_data["password"]

    update_data.pop("current_password", None)

    updated_user_doc = await user_service.update_user(db, current_user.id, update_data)
    return UserModel(**updated_user_doc)


@router.get("/me/reading-list", response_model=List[ArticleSchema])
async def get_reading_list(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """Get user's reading list."""
    return await user_service.get_reading_list(db, current_user.id)


@router.post("/me/reading-list/{article_id}")
async def add_to_reading_list(
    article_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """Add article to reading list."""
    result = await user_service.add_to_reading_list(db, current_user.id, article_id)
    if not result["success"]:
        raise HTTPException(status_code=404, detail="Article not found")

    if result["status"] == "already_exists":
        raise HTTPException(status_code=400, detail="Article already in reading list")

    return {"message": "Article added to reading list"}


@router.delete("/me/reading-list/{article_id}")
async def remove_from_reading_list(
    article_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """Remove article from reading list."""
    success = await user_service.remove_from_reading_list(db, current_user.id, article_id)
    if not success:
        raise HTTPException(status_code=404, detail="Article not in reading list")

    return {"message": "Article removed from reading list"}


@router.get("/me/history", response_model=List[ArticleSchema])
async def get_reading_history(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """Get the authenticated user's reading history."""
    return await user_service.get_reading_history(db, current_user.id)


@router.post("/me/history/{article_id}")
async def add_to_reading_history(
    article_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """Record that the authenticated user read an article."""
    success = await user_service.add_to_reading_history(db, current_user.id, article_id)
    if not success:
        raise HTTPException(status_code=404, detail="Article not found")

    return {"message": "Article added to reading history"}


# --- Password reset ---

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/forgot-password")
@limiter.limit(LOGIN_LIMIT)
async def forgot_password(
    request: Request,
    body: ForgotPasswordRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Send a password reset email if the email exists.
    Always returns 200 to prevent email enumeration."""
    await user_service.create_password_reset_token(db, body.email)
    return {"message": "If that email is registered, a reset link has been sent"}


@router.post("/reset-password")
@limiter.limit(LOGIN_LIMIT)
async def reset_password(
    request: Request,
    body: ResetPasswordRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Reset password using a valid token."""
    success = await user_service.reset_password(db, body.token, body.new_password)
    if not success:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    return {"message": "Password reset successfully"}
