import pytest
from httpx import AsyncClient
from uuid import uuid4
from datetime import datetime


class TestCategories:
    """Test category endpoints."""
    
    @pytest.mark.asyncio
    async def test_list_categories(self, client: AsyncClient, test_category):
        """Test listing all categories."""
        response = await client.get("/api/v1/categories/")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert any(cat["id"] == test_category["id"] for cat in data)
    
    @pytest.mark.asyncio
    async def test_get_category_by_id(self, client: AsyncClient, test_category):
        """Test getting category by ID."""
        response = await client.get(f"/api/v1/categories/{test_category['id']}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_category["id"]
        assert data["name"] == test_category["name"]
    
    @pytest.mark.asyncio
    async def test_get_category_not_found(self, client: AsyncClient):
        """Test getting non-existent category."""
        response = await client.get(f"/api/v1/categories/{str(uuid4())}")
        assert response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_create_category_admin(self, client: AsyncClient, admin_headers):
        """Test creating category as admin."""
        response = await client.post(
            "/api/v1/categories/",
            json={
                "name": "Science",
                "color_code": "#10B981",
                "emoji": "🔬"
            },
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Science"
        assert data["emoji"] == "🔬"
    
    @pytest.mark.asyncio
    async def test_create_category_duplicate(self, client: AsyncClient, admin_headers, test_category):
        """Test creating duplicate category."""
        response = await client.post(
            "/api/v1/categories/",
            json={
                "name": test_category["name"],
                "color_code": "#FF0000",
                "emoji": "🎯"
            },
            headers=admin_headers
        )
        assert response.status_code == 400
    
    @pytest.mark.asyncio
    async def test_create_category_non_admin(self, client: AsyncClient, auth_headers):
        """Test creating category as non-admin."""
        response = await client.post(
            "/api/v1/categories/",
            json={
                "name": "Science",
                "color_code": "#10B981",
                "emoji": "🔬"
            },
            headers=auth_headers
        )
        assert response.status_code == 403
    
    @pytest.mark.asyncio
    async def test_get_category_articles(self, client: AsyncClient, test_category, test_article):
        """Test getting articles for a category."""
        response = await client.get(f"/api/v1/categories/{test_category['name']}/articles")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
    
    @pytest.mark.asyncio
    async def test_get_category_stats(self, client: AsyncClient, test_category, test_article):
        """Test getting category statistics."""
        response = await client.get("/api/v1/categories/stats")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert any(stat["category_id"] == test_category["id"] for stat in data)
        assert "article_count" in data[0]
