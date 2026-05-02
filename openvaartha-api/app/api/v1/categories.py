from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
from app.database import get_db
from app.models.category import Category
from app.schemas.category import Category as CategorySchema, CategoryCreate
from app.core.dependencies import get_current_active_admin
from app.models.user import User as UserModel
from app.schemas.article import Article
from app.services import category_service
from datetime import datetime
from uuid import uuid4

router = APIRouter()


@router.get("/", response_model=List[CategorySchema])
async def list_categories(db: AsyncIOMotorDatabase = Depends(get_db)):
    """Get all categories."""
    return await category_service.get_categories(db)


@router.get("/{category_id}", response_model=CategorySchema)
async def get_category(category_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Get a single category by ID."""
    category = await category_service.get_category_by_id(db, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


@router.get("/{category_name}/articles", response_model=List[Article])
async def get_category_articles(
    category_name: str,
    skip: int = 0,
    limit: int = 20,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all articles for a specific category by name."""
    category = await category_service.get_category_by_name(db, category_name)
    
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    articles = await db["articles"].find({"category_id": category["_id"]}).sort("published_at", -1).skip(skip).limit(limit).to_list(length=limit)
    
    return articles


@router.get("/stats/all")
async def get_all_category_stats(db: AsyncIOMotorDatabase = Depends(get_db)):
    """Get article count for each category."""
    return await category_service.get_category_stats(db)


@router.post("/", response_model=CategorySchema)
async def create_category(
    category_data: CategoryCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_admin)
):
    """Create a new category (admin only)."""
    existing = await db["categories"].find_one({"name": category_data.name})
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")
    
    return await category_service.create_category(db, category_data)
