from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.category import Category
from app.schemas.category import Category as CategorySchema, CategoryCreate
from app.core.dependencies import get_current_active_admin
from app.models.user import User as UserModel
from app.schemas.article import Article
from app.models.article import Article as ArticleModel
from sqlalchemy import func
import uuid

router = APIRouter()


@router.get("/", response_model=List[CategorySchema])
def list_categories(db: Session = Depends(get_db)):
    """Get all categories."""
    categories = db.query(Category).all()
    return categories


@router.get("/{category_id}", response_model=CategorySchema)
def get_category(category_id: str, db: Session = Depends(get_db)):
    """Get a single category by ID."""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


@router.get("/{category_name}/articles", response_model=List[Article])
def get_category_articles(
    category_name: str,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """Get all articles for a specific category by name."""
    category = db.query(Category).filter(
        Category.name.ilike(category_name.replace("-", " "))
    ).first()
    
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    articles = db.query(ArticleModel).filter(
        ArticleModel.category_id == category.id
    ).order_by(
        ArticleModel.published_at.desc()
    ).offset(skip).limit(limit).all()
    
    return articles


@router.get("/stats")
def get_category_stats(db: Session = Depends(get_db)):
    """Get article count for each category."""
    stats = db.query(
        Category.name,
        Category.id,
        func.count(ArticleModel.id).label('article_count')
    ).outerjoin(
        ArticleModel, Category.id == ArticleModel.category_id
    ).group_by(
        Category.id, Category.name
    ).all()
    
    return [
        {
            "category_name": stat[0],
            "category_id": str(stat[1]),
            "article_count": stat[2]
        }
        for stat in stats
    ]


@router.post("/", response_model=CategorySchema)
def create_category(
    category_data: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_admin)
):
    """Create a new category (admin only)."""
    # Check if category already exists
    existing = db.query(Category).filter(Category.name == category_data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")
    
    db_category = Category(
        id=uuid.uuid4(),
        name=category_data.name,
        color_code=category_data.color_code,
        emoji=category_data.emoji
    )
    
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category
