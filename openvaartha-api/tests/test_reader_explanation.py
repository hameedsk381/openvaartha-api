from unittest.mock import AsyncMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.api.v1 import articles
from app.database import get_db
from app.main import app
from app.services import article_service, gemini_service


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("article", "generated", "status", "source"),
    [
        ({"title": "Public story", "summary": "Original summary", "content": {"body": "<p>First.</p><p>Second.</p>"}}, "Plain explanation", 200, "ai"),
        ({"title": "Public story", "summary": "Original summary", "content": None}, None, 200, "article_summary"),
        ({"title": "Public story", "content": {}}, None, 503, None),
        (None, None, 404, None),
    ],
)
async def test_reader_explanation(monkeypatch, article, generated, status, source):
    monkeypatch.setitem(app.dependency_overrides, get_db, lambda: object())
    get_article = AsyncMock(return_value=article)
    generate = AsyncMock(return_value=generated)
    monkeypatch.setattr(article_service, "get_article_by_id", get_article)
    monkeypatch.setattr(gemini_service, "explain_article_in_plain_language", generate)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/articles/story-1/explain")
    assert response.status_code == status
    if source:
        assert response.json() == {
            "explanation": generated if source == "ai" else "Original summary",
            "source": source,
        }
    if source == "ai":
        generate.assert_awaited_once_with("Public story\n\nOriginal summary\n\nFirst.\n\nSecond.")
    if article is None:
        generate.assert_not_awaited()


@pytest.mark.asyncio
async def test_reader_explanation_cache_follows_article_edits(monkeypatch):
    article = {"title": "Public story", "content": {"body": "<p>First version.</p>"}}
    cached = {}

    async def fetch(key, ttl, generate, **kwargs):
        if key not in cached:
            cached[key] = await generate()
        return cached[key]

    monkeypatch.setitem(app.dependency_overrides, get_db, lambda: object())
    monkeypatch.setattr(articles, "fetch_with_cache_and_lock", fetch)
    monkeypatch.setattr(article_service, "get_article_by_id", AsyncMock(return_value=article))
    generate = AsyncMock(side_effect=["First explanation", "Updated explanation"])
    monkeypatch.setattr(gemini_service, "explain_article_in_plain_language", generate)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        path = "/api/v1/articles/story-2/explain"
        assert (await client.get(path)).json()["explanation"] == "First explanation"
        assert (await client.get(path)).json()["explanation"] == "First explanation"
        article["content"]["body"] = "<p>Updated version.</p>"
        assert (await client.get(path)).json()["explanation"] == "Updated explanation"
    assert generate.await_count == 2
