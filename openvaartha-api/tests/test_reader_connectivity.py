from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.api.v1 import ws
from app.database import get_db
from app.main import app
from app.services import comment_service


@pytest.mark.asyncio
@pytest.mark.parametrize("target", ["article_id", "dispatch_id"])
async def test_public_comment_list_route(monkeypatch, target):
    db = object()
    monkeypatch.setitem(app.dependency_overrides, get_db, lambda: db)
    list_comments = AsyncMock(return_value=[])
    monkeypatch.setattr(comment_service, "get_comments", list_comments)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/comments/", params={target: "test-id", "skip": 0, "limit": 50})
    assert response.status_code == 200
    assert response.json() == []
    target_args = dict(article_id=None, dispatch_id=None)
    target_args[target] = "test-id"
    list_comments.assert_awaited_once_with(db, skip=0, limit=50, **target_args)


def test_websocket_origin_allows_configured_site_and_rejects_other_sites(monkeypatch):
    monkeypatch.setattr(ws.settings, "SITE_URL", "https://openvaartha.com/editorial")
    monkeypatch.setattr(ws.settings, "CORS_ORIGINS", "https://staging.openvaartha.com/")
    for origin in ("https://openvaartha.com", "https://staging.openvaartha.com"):
        assert ws._origin_allowed(SimpleNamespace(headers={"origin": origin}))
    assert not ws._origin_allowed(SimpleNamespace(headers={"origin": "https://openvaartha.com.example.org"}))
