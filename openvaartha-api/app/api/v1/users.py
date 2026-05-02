from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
from uuid import UUID
from app.database import get_db
from app.schemas.user import User as UserSchema, UserCreate, UserLogin, Token, UserUpdate
from app.schemas.article import Article as ArticleSchema
from app.services import auth_service, user_service
from app.core.dependencies import get_current_user
from app.models.user import User as UserModel

router = APIRouter()


@router.post("/register", response_model=UserSchema)
async def register_user(user_data: UserCreate, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Register a new user."""
    existing_user = await auth_service.get_user_by_email(db, email=user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    
    user = await auth_service.create_user(db, user_data)
    return user


@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncIOMotorDatabase = Depends(get_db)):
    """Login and get access token."""
    user = await auth_service.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    tokens = auth_service.create_tokens(user)
    return tokens


@router.get("/me", response_model=UserSchema)
async def get_current_user_info(current_user: UserModel = Depends(get_current_user)):
    """Get current user profile."""
    return current_user


@router.put("/me", response_model=UserSchema)
async def update_user_profile(
    user_data: UserUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Update current user profile."""
    update_data = user_data.model_dump(exclude_unset=True)
    
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
    
    # Remove current_password from update_data as it's not a field in the DB model
    if "current_password" in update_data:
        del update_data["current_password"]
        
    updated_user_doc = await user_service.update_user(db, current_user.id, update_data)
    return UserModel(**updated_user_doc)


@router.get("/me/reading-list", response_model=List[ArticleSchema])
async def get_reading_list(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Get user's reading list."""
    return await user_service.get_reading_list(db, current_user.id)


@router.post("/me/reading-list/{article_id}")
async def add_to_reading_list(
    article_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Add article to reading list."""
    success = await user_service.add_to_reading_list(db, current_user.id, article_id)
    if not success:
        raise HTTPException(status_code=404, detail="Article not found")
    
    return {"message": "Article added to reading list"}


@router.delete("/me/reading-list/{article_id}")
async def remove_from_reading_list(
    article_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Remove article from reading list."""
    success = await user_service.remove_from_reading_list(db, current_user.id, article_id)
    if not success:
        raise HTTPException(status_code=404, detail="Article not in reading list")
    
    return {"message": "Article removed from reading list"}
