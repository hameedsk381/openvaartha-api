from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from httpx import ASGITransport, AsyncClient
from pymongo.errors import ConnectionFailure
from redis.exceptions import ConnectionError as RedisConnectionError

from app.core.dependencies import get_current_user
from app.core.ws_manager import manager
from app.database import get_db
from app.main import app
from app.services import health_service


@pytest.mark.asyncio
async def test_readiness_tracks_mongodb_and_redis(monkeypatch):
    command = AsyncMock(side_effect=[{"ok": 1}, ConnectionFailure("Mongo unavailable"), {"ok": 1}])
    ping = AsyncMock(side_effect=[True, True, RedisConnectionError("Redis unavailable")])
    monkeypatch.setitem(app.dependency_overrides, get_db, lambda: SimpleNamespace(command=command))
    monkeypatch.setattr(manager, "redis", SimpleNamespace(ping=ping))
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        assert (await client.get("/health/ready")).json() == {"status": "ready"}
        unavailable = await client.get("/health/ready")
        assert unavailable.status_code == 503
        assert unavailable.json() == {"status": "unavailable"}
        assert (await client.get("/health/ready")).status_code == 503


@pytest.mark.asyncio
async def test_operational_health_requires_an_admin(monkeypatch):
    diagnostics = AsyncMock(return_value={"status": "healthy"})
    monkeypatch.setattr(health_service, "get_ops_health", diagnostics)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        assert (await client.get("/health/ops")).status_code == 401
        monkeypatch.setitem(app.dependency_overrides, get_current_user, lambda: SimpleNamespace(role="user", is_admin=False))
        assert (await client.get("/health/ops")).status_code == 403
        diagnostics.assert_not_awaited()
        monkeypatch.setitem(app.dependency_overrides, get_current_user, lambda: SimpleNamespace(role="admin"))
        assert (await client.get("/health/ops")).status_code == 200
        diagnostics.assert_awaited_once()
