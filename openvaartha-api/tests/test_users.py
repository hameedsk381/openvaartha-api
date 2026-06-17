import pytest
from httpx import AsyncClient
from uuid import uuid4


class TestUserProfile:
    """Test user profile operations."""
    
    @pytest.mark.asyncio
    async def test_get_current_user_profile(self, client: AsyncClient, auth_headers):
        """Test getting current user profile."""
        response = await client.get(
            "/api/v1/users/me",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "test@example.com"
        assert data["fullName"] == "Test User"
        assert "id" in data
    
    @pytest.mark.asyncio
    async def test_update_user_profile(self, client: AsyncClient, auth_headers):
        """Test updating user profile."""
        response = await client.put(
            "/api/v1/users/me",
            json={"full_name": "Updated Name"},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["fullName"] == "Updated Name"
    
    @pytest.mark.asyncio
    async def test_update_user_email_duplicate(self, client: AsyncClient, auth_headers, test_user, db):
        """Test updating email to existing email."""
        # Create another user
        from app.core.security import get_password_hash
        user2_id = str(uuid4())
        await db["users"].insert_one({
            "_id": user2_id,
            "id": user2_id,
            "email": "other@example.com",
            "full_name": "Other User",
            "hashed_password": get_password_hash("password123"),
            "is_active": True,
            "is_admin": False
        })
        
        response = await client.put(
            "/api/v1/users/me",
            json={"email": "other@example.com"},
            headers=auth_headers
        )
        assert response.status_code == 400


class TestReadingList:
    """Test reading list operations."""
    
    @pytest.mark.asyncio
    async def test_get_empty_reading_list(self, client: AsyncClient, auth_headers):
        """Test getting empty reading list."""
        response = await client.get(
            "/api/v1/users/me/reading-list",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0
    
    @pytest.mark.asyncio
    async def test_add_to_reading_list(self, client: AsyncClient, auth_headers, test_article):
        """Test adding article to reading list."""
        response = await client.post(
            f"/api/v1/users/me/reading-list/{test_article['id']}",
            headers=auth_headers
        )
        assert response.status_code == 200
        assert "added" in response.json()["message"].lower()
    
    @pytest.mark.asyncio
    async def test_add_duplicate_to_reading_list(self, client: AsyncClient, auth_headers, test_article):
        """Test adding duplicate article to reading list."""
        # Add first time
        await client.post(
            f"/api/v1/users/me/reading-list/{test_article['id']}",
            headers=auth_headers
        )
        
        # Add second time
        response = await client.post(
            f"/api/v1/users/me/reading-list/{test_article['id']}",
            headers=auth_headers
        )
        assert response.status_code == 400
        assert "already" in response.json()["detail"].lower()
    
    @pytest.mark.asyncio
    async def test_add_nonexistent_article_to_reading_list(self, client: AsyncClient, auth_headers):
        """Test adding non-existent article to reading list."""
        response = await client.post(
            f"/api/v1/users/me/reading-list/{str(uuid4())}",
            headers=auth_headers
        )
        assert response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_remove_from_reading_list(self, client: AsyncClient, auth_headers, test_article):
        """Test removing article from reading list."""
        # Add article
        await client.post(
            f"/api/v1/users/me/reading-list/{test_article['id']}",
            headers=auth_headers
        )
        
        # Remove article
        response = await client.delete(
            f"/api/v1/users/me/reading-list/{test_article['id']}",
            headers=auth_headers
        )
        assert response.status_code == 200
        assert "removed" in response.json()["message"].lower()
    
    @pytest.mark.asyncio
    async def test_remove_nonexistent_from_reading_list(self, client: AsyncClient, auth_headers):
        """Test removing non-existent article from reading list."""
        response = await client.delete(
            f"/api/v1/users/me/reading-list/{str(uuid4())}",
            headers=auth_headers
        )
        assert response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_get_reading_list_with_articles(self, client: AsyncClient, auth_headers, test_article):
        """Test getting reading list with articles."""
        # Add article
        await client.post(
            f"/api/v1/users/me/reading-list/{test_article['id']}",
            headers=auth_headers
        )
        
        # Get reading list
        response = await client.get(
            "/api/v1/users/me/reading-list",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["id"] == test_article["id"]
