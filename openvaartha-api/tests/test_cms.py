"""CMS-level tests: draft/publish workflow, sanitization, self-promote prevention,
refresh-token typ enforcement, and partial content updates."""

from datetime import datetime, timezone
from uuid import uuid4

import pytest
from httpx import AsyncClient


def _article_payload(category_id: str, **overrides):
    body = {
        "title": "Test piece",
        "summary": "Test summary",
        "category_id": category_id,
        "read_time": "3 min",
        "language": "en",
        "published_at": datetime.now(timezone.utc).isoformat(),
        "author": "Newsroom",
        "content": {
            "tldr": "tldr",
            "points": ["one", "two"],
            "body": "<p>Body paragraph.</p>",
        },
    }
    body.update(overrides)
    return body


class TestTeluguContent:
    @pytest.mark.asyncio
    async def test_create_article_with_telugu_language(self, client: AsyncClient, admin_headers, test_category, db):
        """Regression: the articles text index used Mongo's default language
        override, so any document with language="te" failed to insert
        (WriteError 17262: 'language override unsupported: te'). On a Telugu
        news platform, Telugu articles must be creatable and searchable."""
        # In production the startup hook runs ensure_article_indexes; the ASGI
        # test transport doesn't fire startup, so run it explicitly — this also
        # exercises the old-index drop/rebuild migration path.
        from app.services.article_service import ensure_article_indexes

        await ensure_article_indexes(db)

        payload = _article_payload(
            test_category["id"],
            title="అమరావతి మెట్రో పనులకు ఆమోదం",
            summary="తెలుగు సారాంశం",
            language="te",
        )
        response = await client.post("/api/v1/articles/", json=payload, headers=admin_headers)
        assert response.status_code == 200, response.text
        assert response.json()["language"] == "te"

        # And it must be findable via text search once published
        article = response.json()
        publish = await client.put(
            f"/api/v1/articles/{article['id']}", json={"status": "published"}, headers=admin_headers
        )
        assert publish.status_code == 200
        search = await client.get("/api/v1/search/", params={"q": "మెట్రో"})
        assert search.status_code == 200
        assert any(a["id"] == article["id"] for a in search.json())


class TestDraftPublishWorkflow:
    @pytest.mark.asyncio
    async def test_articles_default_to_draft(self, client: AsyncClient, admin_headers, test_category):
        response = await client.post(
            "/api/v1/articles/",
            json=_article_payload(test_category["id"]),
            headers=admin_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "draft"

    @pytest.mark.asyncio
    async def test_drafts_hidden_from_public_list(self, client: AsyncClient, admin_headers, test_category):
        await client.post(
            "/api/v1/articles/",
            json=_article_payload(test_category["id"], title="Hidden draft"),
            headers=admin_headers,
        )
        response = await client.get("/api/v1/articles/")
        assert response.status_code == 200
        titles = [a["title"] for a in response.json()]
        assert "Hidden draft" not in titles

    @pytest.mark.asyncio
    async def test_draft_visible_to_admin_with_flag(
        self, client: AsyncClient, admin_headers, test_category
    ):
        await client.post(
            "/api/v1/articles/",
            json=_article_payload(test_category["id"], title="Hidden draft"),
            headers=admin_headers,
        )
        response = await client.get(
            "/api/v1/articles/?include_unpublished=true",
            headers=admin_headers,
        )
        assert response.status_code == 200
        titles = [a["title"] for a in response.json()]
        assert "Hidden draft" in titles

    @pytest.mark.asyncio
    async def test_include_unpublished_forbidden_for_non_admin(
        self, client: AsyncClient, auth_headers
    ):
        response = await client.get(
            "/api/v1/articles/?include_unpublished=true",
            headers=auth_headers,
        )
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_public_get_by_slug_404s_on_draft(
        self, client: AsyncClient, admin_headers, test_category
    ):
        created = await client.post(
            "/api/v1/articles/",
            json=_article_payload(test_category["id"], title="Secret draft"),
            headers=admin_headers,
        )
        slug = created.json()["slug"]

        anonymous = await client.get(f"/api/v1/articles/{slug}")
        assert anonymous.status_code == 404

        admin_view = await client.get(f"/api/v1/articles/{slug}", headers=admin_headers)
        assert admin_view.status_code == 200

    @pytest.mark.asyncio
    async def test_publish_via_update(self, client: AsyncClient, admin_headers, test_category):
        created = await client.post(
            "/api/v1/articles/",
            json=_article_payload(test_category["id"]),
            headers=admin_headers,
        )
        article_id = created.json()["id"]

        update = await client.put(
            f"/api/v1/articles/{article_id}",
            json={"status": "published"},
            headers=admin_headers,
        )
        assert update.status_code == 200
        assert update.json()["status"] == "published"

        public = await client.get(f"/api/v1/articles/{created.json()['slug']}")
        assert public.status_code == 200


class TestSanitization:
    @pytest.mark.asyncio
    async def test_script_tag_stripped_from_body(
        self, client: AsyncClient, admin_headers, test_category
    ):
        payload = _article_payload(test_category["id"])
        payload["content"]["body"] = "<p>Hello</p><script>alert('xss')</script>"
        response = await client.post("/api/v1/articles/", json=payload, headers=admin_headers)
        assert response.status_code == 200
        body = response.json()["content"]["body"]
        assert "<script" not in body
        # Note: bleach strips the script tag but preserves inner text,
        # so "alert('xss')" text content remains in the body.

    @pytest.mark.asyncio
    async def test_summary_strips_all_html(self, client: AsyncClient, admin_headers, test_category):
        payload = _article_payload(test_category["id"])
        payload["summary"] = "Plain <b>bold</b> <script>evil()</script>"
        response = await client.post("/api/v1/articles/", json=payload, headers=admin_headers)
        assert response.status_code == 200
        summary = response.json()["summary"]
        assert "<" not in summary
        assert "script" not in summary.lower()

    @pytest.mark.asyncio
    async def test_partial_content_update_preserves_siblings(
        self, client: AsyncClient, admin_headers, test_category
    ):
        created = await client.post(
            "/api/v1/articles/",
            json=_article_payload(test_category["id"]),
            headers=admin_headers,
        )
        article_id = created.json()["id"]
        original_tldr = created.json()["content"]["tldr"]
        original_points = created.json()["content"]["points"]

        response = await client.put(
            f"/api/v1/articles/{article_id}",
            json={"content": {"body": "<p>Updated body only.</p>"}},
            headers=admin_headers,
        )
        assert response.status_code == 200
        content = response.json()["content"]
        # The body changed; tldr and points must NOT have been wiped.
        assert "Updated body" in content["body"]
        assert content["tldr"] == original_tldr
        assert content["points"] == original_points


class TestSelfPromotePrevention:
    @pytest.mark.asyncio
    async def test_register_admin_role_is_ignored(self, client: AsyncClient):
        """Even if the request body says role=admin, the created user is not admin."""
        response = await client.post(
            "/api/v1/users/register",
            json={
                "email": "wannabe@example.com",
                "password": "verysecurepassword",
                "full_name": "Wannabe Admin",
                "role": "admin",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "user"
        assert data.get("is_admin") in (False, None)

    @pytest.mark.asyncio
    async def test_self_promote_via_admin_emails_no_longer_works(
        self, client: AsyncClient, monkeypatch, db
    ):
        """The ADMIN_EMAILS env var is decorative now — registering with one of
        those emails must not auto-grant admin."""
        from app.config import settings

        monkeypatch.setattr(settings, "ADMIN_EMAILS", "ceo@example.com")
        response = await client.post(
            "/api/v1/users/register",
            json={
                "email": "ceo@example.com",
                "password": "verysecurepassword",
                "full_name": "CEO",
            },
        )
        assert response.status_code == 200
        # Read directly from DB to be sure.
        doc = await db["users"].find_one({"email": "ceo@example.com"})
        assert doc is not None
        assert doc["is_admin"] is False
        assert doc["role"] == "user"

    @pytest.mark.asyncio
    async def test_user_cannot_self_promote_via_profile_update(
        self, client: AsyncClient, auth_headers, db, test_user
    ):
        response = await client.put(
            "/api/v1/users/me",
            json={"is_admin": True, "role": "admin"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        doc = await db["users"].find_one({"_id": test_user["id"]})
        assert doc["is_admin"] is False
        assert doc.get("role", "user") != "admin"


class TestRefreshTokenTypEnforcement:
    @pytest.mark.asyncio
    async def test_refresh_endpoint_rejects_access_token(
        self, client: AsyncClient, test_user
    ):
        from app.core.security import create_access_token

        access = create_access_token(data={"sub": test_user["id"], "email": test_user["email"]})
        response = await client.post(
            "/api/v1/users/refresh",
            json={"refresh_token": access},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_refresh_token_cannot_be_used_as_access_token(
        self, client: AsyncClient, test_user
    ):
        from app.core.security import create_refresh_token

        refresh = create_refresh_token(data={"sub": test_user["id"], "email": test_user["email"]})
        response = await client.get(
            "/api/v1/users/me",
            headers={"Authorization": f"Bearer {refresh}"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_refresh_endpoint_accepts_refresh_token(
        self, client: AsyncClient, test_user, db
    ):
        from app.core.security import create_refresh_token
        from app.services import session_service

        refresh = create_refresh_token(data={"sub": test_user["id"], "email": test_user["email"]})
        # Rotation requires a server-side session (sessions collection); a bare
        # token with no session record is treated as invalid.
        await session_service.start_session(db, test_user["id"], refresh, request=None)
        response = await client.post(
            "/api/v1/users/refresh",
            json={"refresh_token": refresh},
        )
        assert response.status_code == 200
        assert "access_token" in response.json()


class TestNewsletterAndUserAdminAccess:
    @pytest.mark.asyncio
    async def test_newsletter_subscribe_is_public(self, client: AsyncClient):
        response = await client.post(
            "/api/v1/newsletter/subscribe",
            json={"email": "reader@example.com"},
        )
        # Either 200 (new) or 400 (already) is acceptable — but never 401/403.
        assert response.status_code in (200, 400)