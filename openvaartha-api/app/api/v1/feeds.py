from fastapi import APIRouter, Depends
from fastapi.responses import Response
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import get_db
from app.services.feed_service import build_sitemap, build_rss

router = APIRouter(tags=["Feeds"])


@router.get("/sitemap.xml", include_in_schema=False)
async def sitemap(db: AsyncIOMotorDatabase = Depends(get_db)):
    xml = await build_sitemap(db)
    return Response(content=xml, media_type="application/xml")


@router.get("/feed.xml", include_in_schema=False)
async def rss_feed(db: AsyncIOMotorDatabase = Depends(get_db)):
    xml = await build_rss(db)
    return Response(content=xml, media_type="application/rss+xml")


@router.get("/feed/{category_id}.xml", include_in_schema=False)
async def rss_category_feed(category_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    xml = await build_rss(db, category_id=category_id)
    return Response(content=xml, media_type="application/rss+xml")
