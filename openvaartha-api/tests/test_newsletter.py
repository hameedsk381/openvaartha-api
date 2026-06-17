import pytest
from httpx import AsyncClient


class TestNewsletter:
    """Test newsletter endpoints."""
    
    @pytest.mark.asyncio
    async def test_subscribe_success(self, client: AsyncClient):
        """Test successful newsletter subscription."""
        response = await client.post(
            "/api/v1/newsletter/subscribe",
            json={"email": "subscriber@example.com"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "subscribed" in data["message"].lower()
        assert data["email"] == "subscriber@example.com"
    
    @pytest.mark.asyncio
    async def test_subscribe_duplicate(self, client: AsyncClient):
        """Test duplicate subscription."""
        # Subscribe first time
        await client.post(
            "/api/v1/newsletter/subscribe",
            json={"email": "duplicate@example.com"}
        )
        
        # Subscribe second time
        response = await client.post(
            "/api/v1/newsletter/subscribe",
            json={"email": "duplicate@example.com"}
        )
        assert response.status_code == 400
        assert "already subscribed" in response.json()["detail"].lower()
    
    @pytest.mark.asyncio
    async def test_subscribe_invalid_email(self, client: AsyncClient):
        """Test subscription with invalid email."""
        response = await client.post(
            "/api/v1/newsletter/subscribe",
            json={"email": "invalid-email"}
        )
        assert response.status_code == 422
    
    @pytest.mark.asyncio
    async def test_unsubscribe_success(self, client: AsyncClient):
        """Test successful unsubscription."""
        # Subscribe first
        await client.post(
            "/api/v1/newsletter/subscribe",
            json={"email": "unsub@example.com"}
        )
        
        # Unsubscribe
        response = await client.post(
            "/api/v1/newsletter/unsubscribe",
            json={"email": "unsub@example.com"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "unsubscribed" in data["message"].lower()
    
    @pytest.mark.asyncio
    async def test_unsubscribe_nonexistent(self, client: AsyncClient):
        """Test unsubscription for non-existent email.
        Always returns 200 to prevent email enumeration."""
        response = await client.post(
            "/api/v1/newsletter/unsubscribe",
            json={"email": "nonexistent@example.com"}
        )
        assert response.status_code == 200
        assert "unsubscribed" in response.json()["message"].lower()
    
    @pytest.mark.asyncio
    async def test_resubscribe_after_unsubscribe(self, client: AsyncClient):
        """Test re-subscription after unsubscription."""
        email = "resub@example.com"
        
        # Subscribe
        await client.post(
            "/api/v1/newsletter/subscribe",
            json={"email": email}
        )
        
        # Unsubscribe
        await client.post(
            "/api/v1/newsletter/unsubscribe",
            json={"email": email}
        )
        
        # Re-subscribe
        response = await client.post(
            "/api/v1/newsletter/subscribe",
            json={"email": email}
        )
        assert response.status_code == 200
        assert "re-subscribed" in response.json()["message"].lower()
