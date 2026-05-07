from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.user import User
from app.schemas.user import UserCreate
from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token
from datetime import timedelta
from app.config import settings
from datetime import datetime
from uuid import uuid4


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
    """Create a new user."""
    hashed_password = get_password_hash(user_data.password)
    
    user_id = str(uuid4())
    requested_role = (user_data.role or "user").lower()
    is_configured_admin = user_data.email.lower() in settings.admin_email_set
    role = "admin" if is_configured_admin else ("user" if requested_role == "admin" else requested_role)
    user_doc = {
        "_id": user_id,
        "email": user_data.email,
        "full_name": user_data.full_name,
        "hashed_password": hashed_password,
        "is_active": True,
        "is_admin": is_configured_admin,
        "role": role,
        "created_at": datetime.utcnow()
    }
    
    await db["users"].insert_one(user_doc)
    user = await db["users"].find_one({"_id": user_id})
    return User(**user)


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
        expires_delta=access_token_expires
    )
    
    refresh_token = create_refresh_token(
        data={"sub": user.id, "email": user.email}
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }
