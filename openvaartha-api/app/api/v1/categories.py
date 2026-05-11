from fastapi import APIRouter, Depends, HTTPException, Request, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List

from app.core.dependencies import get_current_active_admin
from app.core.rate_limit import limiter, MUTATION_LIMIT
from app.database import get_db
from app.models.user import User as UserModel
from app.schemas.article import Article
from app.schemas.category import Category as CategorySchema, CategoryCreate, CategoryUpdate
from app.services import category_service

router = APIRouter()


@router.get("/", response_model=List[CategorySchema])
async def list_categories(db: AsyncIOMotorDatabase = Depends(get_db)):
    """Get all categories."""
    return await category_service.get_categories(db)


@router.get("/stats/all")
async def get_all_category_stats(db: AsyncIOMotorDatabase = Depends(get_db)):
    """Get article count for each category."""
    return await category_service.get_category_stats(db)


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
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Get published articles for a category by name."""
    category = await category_service.get_category_by_name(db, category_name)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    cursor = db["articles"].find({
        "category_id": category["_id"],
        "$or": [{"status": "published"}, {"status": {"$exists": False}}],
    }).sort("published_at", -1).skip(skip).limit(limit)
    return await cursor.to_list(length=limit)


@router.post("/", response_model=CategorySchema)
@limiter.limit(MUTATION_LIMIT)
async def create_category(
    request: Request,
    category_data: CategoryCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_admin),
):
    """Create a new category (admin only)."""
    existing = await category_service.get_category_by_name(db, category_data.name)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category with this name already exists",
        )
    return await category_service.create_category(db, category_data)


@router.put("/{category_id}", response_model=CategorySchema)
@limiter.limit(MUTATION_LIMIT)
async def update_category(
    request: Request,
    category_id: str,
    payload: CategoryUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_admin),
):
    """Update a category (admin only)."""
    updated = await category_service.update_category(db, category_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Category not found")
    return updated


@router.delete("/{category_id}")
@limiter.limit(MUTATION_LIMIT)
async def delete_category(
    request: Request,
    category_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_admin),
):
    """Delete a category (admin only). Refuses if articles still reference it."""
    success = await category_service.delete_category(db, category_id)
    if not success:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted successfully"}
