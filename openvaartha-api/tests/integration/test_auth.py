"""Auth-flow integration tests: login, register, refresh, me, RBAC."""

import pytest

pytestmark = pytest.mark.integration


def test_login_success_returns_tokens(client, admin_headers):
    # admin_headers fixture already proves login works; assert token shape here.
    assert admin_headers["Authorization"].startswith("Bearer ")


def test_login_bad_password_401(client):
    r = client.post(
        "/api/v1/users/login",
        data={"username": "admin@openvaartha.com", "password": "definitely-wrong"},
    )
    assert r.status_code == 401


def test_login_rejects_json_body(client):
    r = client.post(
        "/api/v1/users/login",
        json={"username": "admin@openvaartha.com", "password": "admin123"},
    )
    assert r.status_code == 422


def test_refresh_token_roundtrip(client, user_credentials):
    login = client.post(
        "/api/v1/users/login",
        data={"username": user_credentials["username"], "password": user_credentials["password"]},
    )
    assert login.status_code == 200
    body = login.json()
    assert "refresh_token" in body and "access_token" in body

    refresh = client.post("/api/v1/users/refresh", json={"refreshToken": body["refresh_token"]})
    assert refresh.status_code == 200
    refreshed = refresh.json()
    assert "access_token" in refreshed


def test_refresh_with_bad_token_401(client, base_url):
    # Fresh client: no refresh_token cookie set by an earlier login, so the
    # invalid body token must be rejected (cookie takes precedence otherwise).
    import httpx

    with httpx.Client(base_url=base_url, timeout=20.0) as fresh:
        r = fresh.post("/api/v1/users/refresh", json={"refreshToken": "not-a-token"})
    assert r.status_code == 401


def test_me_requires_auth(client):
    assert client.get("/api/v1/users/me").status_code == 401


def test_me_returns_profile(client, user_headers):
    r = client.get("/api/v1/users/me", headers=user_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["email"]
    assert "fullName" in body


def test_auth_config_public(client):
    r = client.get("/api/v1/users/auth-config")
    assert r.status_code == 200
    assert "google_client_id" in r.json()


def test_register_duplicate_email_400(client, user_credentials):
    r = client.post(
        "/api/v1/users/register",
        json={
            "email": user_credentials["email"],
            "fullName": "Duplicate",
            "password": "Whatever!123",
        },
    )
    assert r.status_code == 400


def test_register_invalid_email_422(client):
    r = client.post(
        "/api/v1/users/register",
        json={"email": "not-an-email", "fullName": "Bad", "password": "Whatever!123"},
    )
    assert r.status_code == 422


class TestRBAC:
    """Non-admin users must be rejected from admin/editor endpoints."""

    def test_user_cannot_access_admin_dashboard(self, client, user_headers):
        r = client.get("/api/v1/admin/stats/dashboard", headers=user_headers)
        assert r.status_code == 403

    def test_user_cannot_list_admin_users(self, client, user_headers):
        r = client.get("/api/v1/admin/users", headers=user_headers)
        assert r.status_code == 403

    def test_user_cannot_create_article(self, client, user_headers):
        r = client.post("/api/v1/articles/", json={}, headers=user_headers)
        assert r.status_code in (403, 422)

    def test_admin_can_access_dashboard(self, client, admin_headers):
        r = client.get("/api/v1/admin/stats/dashboard", headers=admin_headers)
        assert r.status_code == 200
