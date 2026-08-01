"""Integration-test fixtures that exercise a live OpenVaartha deployment over
real HTTP (nginx -> FastAPI -> MongoDB/Redis).

Target defaults to the production API and is overridable via the
``OPENVAARTHA_BASE_URL`` environment variable so the same suite can run against
a local docker-compose stack.

Production-safety rules baked into this file:
  * Every created record uses a uuid-suffixed unique identifier (emails,
    article titles) so runs are idempotent and never collide with real data.
  * Test-created articles, comments, and subscriptions are deleted/unsubscribed
    in teardown.
  * Auth credentials are fetched once per session (rate limits: login 10/min,
    register 5/min).
"""

import os
import uuid
from datetime import datetime, timezone

import pytest
import httpx

BASE_URL = os.environ.get("OPENVAARTHA_BASE_URL", "https://openvaartha.com")
ADMIN_EMAIL = os.environ.get("OPENVAARTHA_ADMIN_EMAIL", "admin@openvaartha.com")
ADMIN_PASSWORD = os.environ.get("OPENVAARTHA_ADMIN_PASSWORD", "admin123")


def _unique(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:12]}"


@pytest.fixture(scope="session")
def base_url() -> str:
    return BASE_URL


@pytest.fixture(scope="session")
def admin_credentials() -> dict:
    return {"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD}


@pytest.fixture(scope="session")
def client() -> httpx.Client:
    """Synchronous HTTP client (login/register are form/JSON exchanges that
    don't need async; keeps the suite simple and deterministic)."""
    with httpx.Client(base_url=BASE_URL, timeout=20.0) as c:
        yield c


@pytest.fixture(scope="session")
def admin_headers(client, admin_credentials) -> dict:
    """Session-scoped admin Bearer token, fetched once."""
    response = client.post(
        "/api/v1/users/login",
        data=admin_credentials,
    )
    assert response.status_code == 200, (
        f"admin login failed ({response.status_code}): {response.text[:300]}"
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def user_credentials(client) -> dict:
    """Register one unique test user for the whole session (register limit is
    5/min, so we register exactly once)."""
    email = _unique("itest") + "@example.com"
    password = "IntegrationTest!123"
    response = client.post(
        "/api/v1/users/register",
        json={
            "email": email,
            "fullName": "Integration Test User",
            "password": password,
        },
    )
    assert response.status_code == 200, (
        f"test-user register failed ({response.status_code}): {response.text[:300]}"
    )
    return {"username": email, "password": password, "email": email}


@pytest.fixture(scope="session")
def user_headers(client, user_credentials) -> dict:
    """Session-scoped non-admin Bearer token."""
    response = client.post(
        "/api/v1/users/login",
        data={"username": user_credentials["username"], "password": user_credentials["password"]},
    )
    assert response.status_code == 200, (
        f"test-user login failed ({response.status_code}): {response.text[:300]}"
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def sample_article(client, admin_headers) -> dict:
    """An existing published article id/slug for read-path tests. Does not
    create data — just reuses whatever the deployment already has."""
    response = client.get("/api/v1/articles/?limit=1")
    assert response.status_code == 200, "could not list articles"
    articles = response.json()
    assert isinstance(articles, list) and articles, "no published articles found"
    return articles[0]


@pytest.fixture(scope="session")
def sample_category(client) -> dict:
    response = client.get("/api/v1/categories/")
    assert response.status_code == 200, "could not list categories"
    categories = response.json()
    assert isinstance(categories, list) and categories, "no categories found"
    return categories[0]
