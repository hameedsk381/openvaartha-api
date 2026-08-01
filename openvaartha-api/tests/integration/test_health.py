"""Health, security headers, and error-handling checks against the live API."""

import pytest

pytestmark = pytest.mark.integration


def test_health_returns_healthy(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "healthy"


def test_health_env_requires_admin(client):
    assert client.get("/health/env").status_code == 401


def test_health_env_allows_admin(client, admin_headers):
    r = client.get("/health/env", headers=admin_headers)
    assert r.status_code == 200


def test_unknown_api_route_is_404(client):
    r = client.get("/api/v1/does-not-exist")
    assert r.status_code == 404


def test_security_headers_present(client):
    r = client.get("/")
    for header in (
        "content-security-policy",
        "x-frame-options",
        "x-content-type-options",
        "referrer-policy",
        "permissions-policy",
    ):
        assert header in r.headers, f"missing security header: {header}"
    assert r.headers["x-frame-options"].upper() in ("DENY", "SAMEORIGIN")


def test_csp_blocks_inline_scripts(client):
    r = client.get("/")
    csp = r.headers.get("content-security-policy", "")
    assert "default-src 'self'" in csp
    assert "object-src 'none'" in csp


def test_unknown_root_route_serves_spa(client):
    r = client.get("/this-page-does-not-exist")
    assert r.status_code == 200
    assert "text/html" in r.headers["content-type"]


def test_root_serves_html_spa(client):
    r = client.get("/")
    assert r.status_code == 200
    assert "text/html" in r.headers["content-type"]
