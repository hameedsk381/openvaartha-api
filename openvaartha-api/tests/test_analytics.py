"""Tests for the editorial analytics service (app/services/analytics_service.py)."""
from datetime import datetime, timezone
from uuid import uuid4

import pytest

from app.services import analytics_service


def _days_ago(days: int) -> datetime:
    """UTC datetime ``days`` days before now, at a fixed time."""
    from datetime import timedelta
    return datetime.now(timezone.utc) - timedelta(days=days)


class TestEditorialAnalytics:
    @pytest.mark.asyncio
    async def test_published_series_buckets_by_day(self, db, test_category):
        now = datetime.now(timezone.utc)
        for i in range(3):
            article_id = str(uuid4())
            await db["articles"].insert_one({
                "_id": article_id,
                "id": article_id,
                "slug": f"series-{i}-{uuid4()}",
                "title": f"Series article {i}",
                "summary": "sum",
                "category_id": test_category["id"],
                "read_time": "3 min",
                "status": "published",
                "published_at": _days_ago(i),
                "created_at": now,
                "view_count": 0,
            })

        series = await analytics_service.get_published_series(db, days=7)
        assert len(series) == 7
        # Zero-filled ascending dates.
        assert series[0]["date"] < series[-1]["date"]
        assert all(s["count"] == 0 for s in series[:-3])
        # The three inserted articles land on (likely) distinct recent days.
        assert sum(s["count"] for s in series) == 3

    @pytest.mark.asyncio
    async def test_category_breakdown(self, db, test_category):
        now = datetime.now(timezone.utc)
        for i in range(2):
            article_id = str(uuid4())
            await db["articles"].insert_one({
                "_id": article_id,
                "id": article_id,
                "slug": f"cat-{i}-{uuid4()}",
                "title": f"Cat article {i}",
                "summary": "sum",
                "category_id": test_category["id"],
                "read_time": "3 min",
                "status": "published",
                "published_at": _days_ago(i),
                "created_at": now,
                "view_count": 10 + i,
            })
            await db["article_reactions"].insert_one({
                "_id": str(uuid4()),
                "article_id": article_id,
                "reaction_type": "fire",
                "created_at": now,
            })

        cats = await analytics_service.get_category_breakdown(db, days=30)
        assert len(cats) == 1
        cat = cats[0]
        assert cat["name"] == "Technology"
        assert cat["articles"] == 2
        assert cat["views"] == 21
        assert cat["reactions"] == 2

    @pytest.mark.asyncio
    async def test_author_breakdown(self, db, test_category):
        now = datetime.now(timezone.utc)
        for i in range(3):
            article_id = str(uuid4())
            await db["articles"].insert_one({
                "_id": article_id,
                "id": article_id,
                "slug": f"auth-{i}-{uuid4()}",
                "title": f"Auth article {i}",
                "summary": "sum",
                "category_id": test_category["id"],
                "read_time": "3 min",
                "status": "published",
                "published_at": _days_ago(i),
                "created_at": now,
                "author": "Reporter A",
                "view_count": 5,
            })

        authors = await analytics_service.get_author_breakdown(db, days=30)
        assert any(a["name"] == "Reporter A" and a["articles"] == 3 and a["views"] == 15 for a in authors)

    @pytest.mark.asyncio
    async def test_pipeline_stats_counts_statuses(self, db, test_category):
        now = datetime.now(timezone.utc)
        for status in ("draft", "pending", "scheduled", "published", "archived"):
            article_id = str(uuid4())
            await db["articles"].insert_one({
                "_id": article_id,
                "id": article_id,
                "slug": f"pipe-{status}-{uuid4()}",
                "title": f"Pipeline {status}",
                "summary": "sum",
                "category_id": test_category["id"],
                "read_time": "3 min",
                "status": status,
                "published_at": now,
                "created_at": now,
                "view_count": 0,
            })

        stats = await analytics_service.get_pipeline_stats(db)
        assert stats["statuses"] == {
            "draft": 1, "pending": 1, "scheduled": 1, "published": 1, "archived": 1,
        }

    @pytest.mark.asyncio
    async def test_pipeline_avg_time_to_publish(self, db, test_category):
        from datetime import timedelta

        now = datetime.now(timezone.utc)
        for hours in (1, 3):
            article_id = str(uuid4())
            await db["articles"].insert_one({
                "_id": article_id,
                "id": article_id,
                "slug": f"ttl-{hours}-{uuid4()}",
                "title": f"TTL {hours}",
                "summary": "sum",
                "category_id": test_category["id"],
                "read_time": "3 min",
                "status": "published",
                "published_at": now,
                "created_at": now - timedelta(hours=hours),
                "view_count": 0,
            })

        stats = await analytics_service.get_pipeline_stats(db)
        # avg of (1h, 3h) == 2h
        assert stats["avg_time_to_publish_hours"] == 2.0

    @pytest.mark.asyncio
    async def test_engagement_totals(self, db, test_category):
        now = datetime.now(timezone.utc)
        article_id = str(uuid4())
        await db["articles"].insert_one({
            "_id": article_id,
            "id": article_id,
            "slug": f"eng-{uuid4()}",
            "title": "Engagement article",
            "summary": "sum",
            "category_id": test_category["id"],
            "read_time": "3 min",
            "status": "published",
            "published_at": _days_ago(1),
            "created_at": now,
            "view_count": 50,
        })
        await db["reading_history"].insert_one({
            "_id": str(uuid4()),
            "user_id": str(uuid4()),
            "article_id": article_id,
            "read_at": now,
        })
        await db["comments"].insert_one({
            "_id": str(uuid4()),
            "article_id": article_id,
            "user_id": str(uuid4()),
            "author_name": "Reader",
            "author_email": "reader@example.com",
            "body": "Nice piece",
            "is_active": True,
            "created_at": now,
        })

        totals = await analytics_service.get_engagement_totals(db, days=30)
        assert totals["lifetime_views"] == 50
        assert totals["published_total"] == 1
        assert totals["avg_views_per_article"] == 50.0
        assert totals["active_readers"] == 1
        assert totals["comments"] == 1

    @pytest.mark.asyncio
    async def test_get_editorial_stats_full_payload(self, db, test_category):
        stats = await analytics_service.get_editorial_stats(db, days=7)
        for key in (
            "days", "published_series", "reactions_series", "comments_series",
            "subscriber_series", "reader_series", "categories", "authors",
            "pipeline", "engagement",
        ):
            assert key in stats
        assert stats["days"] == 7