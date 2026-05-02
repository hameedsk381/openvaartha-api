from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.database import get_db
from app.schemas.user import User as UserSchema, UserCreate, UserLogin, Token, UserUpdate
from app.schemas.article import Article as ArticleSchema
from app.services import auth_service, article_service
from app.core.dependencies import get_current_user
from app.models.user import User as UserModel
from app.models.reading_list import ReadingList
from app.models.article import Article

router = APIRouter()


@router.post("/register", response_model=UserSchema)
def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user."""
    # Check if user already exists
    existing_user = auth_service.get_user_by_email(db, email=user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    
    user = auth_service.create_user(db, user_data)
    return user


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login and get access token."""
    user = auth_service.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    tokens = auth_service.create_tokens(user)
    return tokens


@router.get("/me", response_model=UserSchema)
def get_current_user_info(current_user: UserModel = Depends(get_current_user)):
    """Get current user profile."""
    return current_user


@router.put("/me", response_model=UserSchema)
def update_user_profile(
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Update current user profile."""
    update_data = user_data.dict(exclude_unset=True)
    
    if "email" in update_data:
        existing_user = auth_service.get_user_by_email(db, update_data["email"])
        if existing_user and existing_user.id != current_user.id:
            raise HTTPException(status_code=400, detail="Email already in use")
    
    if "password" in update_data:
        from app.core.security import get_password_hash
        current_user.hashed_password = get_password_hash(update_data["password"])
        del update_data["password"]
    
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/me/reading-list", response_model=List[ArticleSchema])
def get_reading_list(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Get user's reading list."""
    reading_list = db.query(ReadingList).filter(
        ReadingList.user_id == current_user.id
    ).all()
    
    article_ids = [rl.article_id for rl in reading_list]
    articles = db.query(Article).filter(Article.id.in_(article_ids)).all()
    
    return articles


@router.post("/me/reading-list")
def add_to_reading_list(
    article_id: UUID,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Add article to reading list."""
    # Check if article exists
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    # Check if already in reading list
    existing = db.query(ReadingList).filter(
        ReadingList.user_id == current_user.id,
        ReadingList.article_id == article_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Article already in reading list")
    
    reading_list_item = ReadingList(
        user_id=current_user.id,
        article_id=article_id
    )
    
    db.add(reading_list_item)
    db.commit()
    
    return {"message": "Article added to reading list"}


@router.delete("/me/reading-list/{article_id}")
def remove_from_reading_list(
    article_id: UUID,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Remove article from reading list."""
    reading_list_item = db.query(ReadingList).filter(
        ReadingList.user_id == current_user.id,
        ReadingList.article_id == article_id
    ).first()
    
    if not reading_list_item:
        raise HTTPException(status_code=404, detail="Article not in reading list")
    
    db.delete(reading_list_item)
    db.commit()
    
    return {"message": "Article removed from reading list"}
