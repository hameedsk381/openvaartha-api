"""Google Sign-In: token verification, account creation/linking, and the
guarantee that OAuth-only accounts can't be abused via the password grant.

Google's actual signature verification is mocked (verify_oauth2_token) since
tests can't hit Google's servers — the mock stands in for "Google says this
credential is valid and these are its claims," and every test below exercises
what OpenVaartha does with those claims, not Google's cryptography.
"""
from unittest.mock import patch

import pytest
from httpx import AsyncClient

from app.config import settings


def _claims(email="googleuser@example.com", sub="google-sub-123", **overrides):
    base = {
        "email": email,
        "email_verified": True,
        "sub": sub,
        "name": "Google User",
        "picture": "https://example.com/avatar.jpg",
    }
    base.update(overrides)
    return base


@pytest.fixture(autouse=True)
def google_client_id(monkeypatch):
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "test-google-client-id.apps.googleusercontent.com")


class TestGoogleSignIn:
    @pytest.mark.asyncio
    async def test_new_user_created_on_first_sign_in(self, client: AsyncClient, db):
        with patch("app.services.auth_service.google_id_token.verify_oauth2_token", return_value=_claims()):
            response = await client.post("/api/v1/users/google", json={"idToken": "fake-credential"})

        assert response.status_code == 200, response.text
        body = response.json()
        assert "access_token" in body and "refresh_token" in body

        user_doc = await db["users"].find_one({"email": "googleuser@example.com"})
        assert user_doc is not None
        assert user_doc["google_sub"] == "google-sub-123"
        assert user_doc["auth_provider"] == "google"
        assert user_doc["hashed_password"] is None
        assert user_doc["role"] == "user"  # never auto-admin
        assert user_doc["avatar_url"] == "https://example.com/avatar.jpg"

    @pytest.mark.asyncio
    async def test_repeat_sign_in_reuses_same_account(self, client: AsyncClient, db):
        with patch("app.services.auth_service.google_id_token.verify_oauth2_token", return_value=_claims()):
            await client.post("/api/v1/users/google", json={"idToken": "fake-credential"})
            await client.post("/api/v1/users/google", json={"idToken": "fake-credential-2"})

        count = await db["users"].count_documents({"email": "googleuser@example.com"})
        assert count == 1

    @pytest.mark.asyncio
    async def test_links_to_existing_local_account_by_email(self, client: AsyncClient, db, test_user):
        # test_user fixture already created "test@example.com" as a local account
        with patch(
            "app.services.auth_service.google_id_token.verify_oauth2_token",
            return_value=_claims(email="test@example.com", sub="google-sub-link"),
        ):
            response = await client.post("/api/v1/users/google", json={"idToken": "fake-credential"})

        assert response.status_code == 200
        count = await db["users"].count_documents({"email": "test@example.com"})
        assert count == 1  # linked, not duplicated

        user_doc = await db["users"].find_one({"email": "test@example.com"})
        assert user_doc["google_sub"] == "google-sub-link"
        assert user_doc["hashed_password"] is not None  # local password preserved

    @pytest.mark.asyncio
    async def test_unverified_email_rejected(self, client: AsyncClient):
        with patch(
            "app.services.auth_service.google_id_token.verify_oauth2_token",
            return_value=_claims(email_verified=False),
        ):
            response = await client.post("/api/v1/users/google", json={"idToken": "fake-credential"})
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_invalid_token_rejected(self, client: AsyncClient):
        with patch(
            "app.services.auth_service.google_id_token.verify_oauth2_token",
            side_effect=ValueError("Token expired"),
        ):
            response = await client.post("/api/v1/users/google", json={"idToken": "garbage"})
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_disabled_google_sign_in_rejected(self, client: AsyncClient, monkeypatch):
        monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "")
        response = await client.post("/api/v1/users/google", json={"idToken": "fake-credential"})
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_google_only_account_cannot_password_login(self, client: AsyncClient, db):
        """The core safety property: an account created via Google (no local
        password) must not become loginable via the password grant just
        because someone knows/guesses its email."""
        with patch("app.services.auth_service.google_id_token.verify_oauth2_token", return_value=_claims()):
            await client.post("/api/v1/users/google", json={"idToken": "fake-credential"})

        response = await client.post(
            "/api/v1/users/login",
            data={"username": "googleuser@example.com", "password": ""},
        )
        assert response.status_code in (401, 422)

        response = await client.post(
            "/api/v1/users/login",
            data={"username": "googleuser@example.com", "password": "anything-at-all"},
        )
        assert response.status_code == 401
