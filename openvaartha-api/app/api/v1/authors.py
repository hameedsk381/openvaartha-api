from fastapi import APIRouter, Depends, HTTPException, Request, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional

from app.core.dependencies import get_current_editor
from app.core.rate_limit import limiter, MUTATION_LIMIT
from app.database import get_db
from app.models.user import User as UserModel
from app.models.author import Author as AuthorModel
from app.schemas.author import Author as AuthorSchema, AuthorCreate, AuthorUpdate
from uuid import uuid4
from datetime import datetime, timezone

router = APIRouter()

@router.get("/", response_model=List[AuthorSchema])
async def list_authors(db: AsyncIOMotorDatabase = Depends(get_db)):
    """Get all authors."""
    cursor = db["authors"].find({}).sort("name", 1)
    docs = await cursor.to_list(length=None)
    result = []
    for d in docs:
        if "_id" in d and "id" not in d:
            d["id"] = str(d["_id"])
        result.append(AuthorModel(**d))
    return result

@router.get("/{author_id}", response_model=AuthorSchema)
async def get_author(author_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Get a single author by ID."""
    doc = await db["authors"].find_one({"_id": author_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Author not found")
    if "_id" in doc and "id" not in doc:
        doc["id"] = str(doc["_id"])
    return AuthorModel(**doc)

@router.post("/", response_model=AuthorSchema)
@limiter.limit(MUTATION_LIMIT)
async def create_author(
    request: Request,
    author_data: AuthorCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: UserModel = Depends(get_current_editor),
):
    """Create a new author (editor/admin only)."""
    author_dict = author_data.model_dump()
    author_id = str(uuid4())
    author_dict["_id"] = author_id
    author_dict["created_at"] = datetime.now(timezone.utc)
    
    await db["authors"].insert_one(author_dict)
    
    author_dict["id"] = author_id
    return AuthorModel(**author_dict)

@router.put("/{author_id}", response_model=AuthorSchema)
@limiter.limit(MUTATION_LIMIT)
async def update_author(
    author_id: str,
    request: Request,
    author_data: AuthorUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: UserModel = Depends(get_current_editor),
):
    """Update an author's profile (editor/admin only)."""
    existing = await db["authors"].find_one({"_id": author_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Author not found")
        
    update_data = author_data.model_dump(exclude_unset=True)
    if update_data:
        await db["authors"].update_one({"_id": author_id}, {"$set": update_data})
        
    updated = await db["authors"].find_one({"_id": author_id})
    if "_id" in updated and "id" not in updated:
        updated["id"] = str(updated["_id"])
    return AuthorModel(**updated)

@router.delete("/{author_id}")
@limiter.limit(MUTATION_LIMIT)
async def delete_author(
    author_id: str,
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: UserModel = Depends(get_current_editor),
):
    """Delete an author (editor/admin only)."""
    existing = await db["authors"].find_one({"_id": author_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Author not found")
        
    await db["authors"].delete_one({"_id": author_id})
    return {"message": "Author deleted successfully"}
