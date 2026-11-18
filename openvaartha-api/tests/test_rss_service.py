from datetime import datetime, timezone
import os
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import OperationFailure

from app.services import article_service, rss_service


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("url", "write_fails", "expected_status"),
    [
        ("https://example.com/story", False, "published"),
        ("", False, "draft"),
        ("https://example.com/story", True, "published"),
    ],
)
async def test_rss_writes_use_one_transaction(
    monkeypatch, url, write_fails, expected_status
):
    monkeypatch.setattr(rss_service, "fetch_and_parse", AsyncMock(return_value=[{
        "guid": "feed-entry",
        "title": "Example story",
        "content": "Source content",
        "link": url,
        "published": datetime(2026, 1, 2, tzinfo=timezone.utc),
    }]))
    monkeypatch.setattr(rss_service, "generate_article", AsyncMock(return_value={
        "title": "Example story",
        "summary": "Summary",
        "body": "<p>Story body.</p>",
    }))
    checkpoint = AsyncMock()
    invalidate = AsyncMock()
    monkeypatch.setattr(rss_service, "set_last_fetched", checkpoint)
    monkeypatch.setattr(article_service, "after_article_publication", invalidate)

    collections = {
        name: MagicMock(find_one=AsyncMock(return_value=None), insert_one=AsyncMock())
        for name in ("articles", "article_content", "article_sources")
    }
    collections["article_content"].find_one.return_value = {"body": "<p>Story body.</p>"}
    collections["article_sources"].find.return_value.to_list = AsyncMock(return_value=[
        {"url": url, "publisher": "Example publisher"}
    ])
    publish = AsyncMock(return_value=MagicMock(modified_count=1))
    collections["articles"].update_one = publish
    db = MagicMock()
    db.__getitem__.side_effect = collections.__getitem__
    session = MagicMock()
    session.__aenter__.return_value = session
    db.client.start_session = AsyncMock(return_value=session)

    async def run_transaction(callback):
        await callback(session)

    session.with_transaction = AsyncMock(side_effect=run_transaction)
    source = {
        "_id": "source-1",
        "name": "Example publisher",
        "feed_url": "https://example.com/feed.xml",
        "auto_publish": True,
        "last_fetched_at": datetime(2026, 1, 1),
    }
    if write_fails:
        collections["article_sources"].insert_one.side_effect = OperationFailure("write failed")
        with pytest.raises(OperationFailure, match="write failed"):
            await rss_service.process_source(db, source)
        checkpoint.assert_not_awaited()
        invalidate.assert_not_awaited()
    else:
        assert await rss_service.process_source(db, source) == 1
        checkpoint.assert_awaited_once()
        if expected_status == "published":
            invalidate.assert_awaited_once()
        else:
            invalidate.assert_not_awaited()

    session.with_transaction.assert_awaited_once()
    article = collections["articles"].insert_one.call_args.args[0]
    assert article["status"] == "draft"
    if expected_status == "published" and not write_fails:
        publish.assert_awaited_once()
        assert publish.call_args.args[1]["$set"]["status"] == "published"
        assert publish.call_args.kwargs["session"] is session
    else:
        publish.assert_not_awaited()
    for name in ("article_content", "article_sources"):
        assert collections[name].insert_one.call_args.args[0]["article_id"] == article["_id"]
    for collection in collections.values():
        assert collection.insert_one.call_args.kwargs == {"session": session}


@pytest.mark.asyncio
async def test_rss_transaction_rolls_back_and_retries(monkeypatch):
    url = os.environ.get("RSS_TRANSACTION_TEST_URL")
    if not url:
        pytest.skip("Requires an isolated MongoDB replica set")
    client = AsyncIOMotorClient(url, serverSelectionTimeoutMS=5000)
    db = client[f"openvaartha_rss_test_{uuid4().hex}"]
    source = {"_id": "rss-1", "name": "Example Press", "feed_url": "https://example.com/rss", "auto_publish": True}
    monkeypatch.setattr(rss_service, "fetch_and_parse", AsyncMock(return_value=[{
        "guid": "one", "title": "Example story", "content": "Source material",
        "link": "https://example.com/story", "published": None,
    }]))
    monkeypatch.setattr(rss_service, "generate_article", AsyncMock(return_value={
        "title": "Example story", "summary": "A summary", "body": "<p>Complete story.</p>",
    }))
    monkeypatch.setattr(article_service, "after_article_publication", AsyncMock())
    try:
        await db.create_collection("articles")
        await db.create_collection("article_content")
        await db.create_collection("sources")
        await db.create_collection("article_sources", validator={"required_for_test": True})
        await db["sources"].insert_one(source)
        with pytest.raises(OperationFailure, match="Document failed validation"):
            await rss_service.process_source(db, source)
        for collection in ("articles", "article_content", "article_sources"):
            assert await db[collection].count_documents({}) == 0
        assert "last_fetched_at" not in await db["sources"].find_one({"_id": source["_id"]})

        await db.command("collMod", "article_sources", validator={})
        assert await rss_service.process_source(db, source) == 1
        assert await rss_service.process_source(db, source) == 0
        story = await db["articles"].find_one({"status": "published"})
        assert story["published_by"] == "rss"
        assert await db["article_content"].count_documents({"article_id": story["_id"]}) == 1
        citation = await db["article_sources"].find_one({"article_id": story["_id"]})
        assert citation["publisher"] == source["name"]
        assert citation["url"] == "https://example.com/story"
    finally:
        await client.drop_database(db.name)
        client.close()
