from app.models.newsletter import NewsletterSubscriber
from typing import List, Optional
from datetime import datetime, timezone
import logging
from uuid import uuid4

from app.database import db
from app.models.digest import DailyDigest, DigestStatus
from app.models.article import PUBLIC_STATUS
from app.services.ai_service import generate_digest_overview
from app.services.article_service import get_articles
from app.services.email_service import send_email

logger = logging.getLogger(__name__)

from app.core.cache import fetch_with_cache_and_lock
from app.config import settings

async def get_latest_digest() -> Optional[DailyDigest]:
    async def _fetch():
        doc = await DailyDigest.get_motor_collection().find_one({"status": DigestStatus.PUBLISHED.value}, sort=[("date", -1)])
        if not doc:
            return None
        # Return dict to be cached properly and then converted to DailyDigest at caller or we can cache dict and return DailyDigest
        return doc.model_dump() if hasattr(doc, "model_dump") else (doc.dict() if hasattr(doc, "dict") else doc)

    key = "openvaartha:digest:latest"
    cached_doc = await fetch_with_cache_and_lock(key, settings.CACHE_TTL_SECONDS, _fetch)
    return DailyDigest(**cached_doc) if cached_doc else None

async def get_digest_by_date(date_str: str) -> Optional[DailyDigest]:
    async def _fetch():
        doc = await DailyDigest.get_motor_collection().find_one({"date": date_str})
        if not doc:
            return None
        return doc.model_dump() if hasattr(doc, "model_dump") else (doc.dict() if hasattr(doc, "dict") else doc)

    key = f"openvaartha:digest:date={date_str}"
    cached_doc = await fetch_with_cache_and_lock(key, settings.CACHE_TTL_SECONDS, _fetch)
    return DailyDigest(**cached_doc) if cached_doc else None

async def create_digest(digest_data: DailyDigest) -> DailyDigest:
    doc = digest_data.model_dump()
    doc["_id"] = doc.pop("id")
    await DailyDigest(**doc).insert()
    return digest_data

async def generate_daily_digest() -> Optional[DailyDigest]:
    """Generates the daily digest by taking today's top 5 articles and using AI."""
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Check if we already have one
    existing = await get_digest_by_date(today_str)
    if existing:
        return existing

    # Get top 5 published articles
    # For now, just grab latest 5 trending/breaking or just latest 5
    articles, _ = await get_articles(limit=5, status=PUBLIC_STATUS)
    if not articles:
        return None

    articles_data = [
        {
            "id": a.id,
            "title": a.title,
            "summary": a.summary
        } for a in articles
    ]

    overview_data = await generate_digest_overview(articles_data)
    if not overview_data:
        return None

    new_digest = DailyDigest(
        date=today_str,
        title=overview_data.get("title", f"Open Vaartha Daily Digest - {today_str}"),
        overview=overview_data.get("overview", ""),
        article_ids=[a["id"] for a in articles_data],
        status=DigestStatus.PUBLISHED
    )

    await create_digest(new_digest)
    return new_digest

async def broadcast_digest_newsletter(digest: DailyDigest):
    """Sends the digest to all active newsletter subscribers."""
    cursor = NewsletterSubscriber.get_motor_collection().find({"is_active": True})
    subscribers = await cursor.to_list(length=None)
    
    if not subscribers:
        return

    subject = f"📰 {digest.title}"
    body_html = f"""
    <html>
        <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #550000;">{digest.title}</h1>
            <p style="color: #666; font-size: 14px;">{digest.date}</p>
            <div style="font-size: 16px; line-height: 1.6; margin-top: 20px;">
                {digest.overview}
            </div>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
            <a href="https://openvaartha.com/digest/{digest.date}" style="display: inline-block; background: #550000; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Read full stories on Open Vaartha
            </a>
        </body>
    </html>
    """

    # In a real app, send via batching. Here we just loop (assuming small scale for now)
    for sub in subscribers:
        await send_email(sub["email"], subject, body_html)
