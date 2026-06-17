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
        response = await client.get("/api/v1/categories/stats/all")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert any(stat["category_id"] == test_category["id"] for stat in data)
        assert "article_count" in data[0]

    @pytest.mark.asyncio
    async def test_create_category_case_insensitive_duplicate(
        self, client: AsyncClient, admin_headers, test_category
    ):
        """Case-only differences should still collide."""
        response = await client.post(
            "/api/v1/categories/",
            json={"name": test_category["name"].upper(), "color_code": "#000", "emoji": "🆎"},
            headers=admin_headers,
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_update_category_admin(self, client: AsyncClient, admin_headers, test_category):
        response = await client.put(
            f"/api/v1/categories/{test_category['id']}",
            json={"name": "Renamed", "emoji": "✨"},
            headers=admin_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Renamed"
        assert data["emoji"] == "✨"

    @pytest.mark.asyncio
    async def test_update_category_non_admin_forbidden(
        self, client: AsyncClient, auth_headers, test_category
    ):
        response = await client.put(
            f"/api/v1/categories/{test_category['id']}",
            json={"name": "Renamed"},
            headers=auth_headers,
        )
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_update_category_collides(self, client: AsyncClient, admin_headers, db, test_category):
        from uuid import uuid4
        from datetime import datetime, timezone

        other_id = str(uuid4())
        await db["categories"].insert_one({
            "_id": other_id,
            "name": "Other",
            "color_code": "#fff",
            "emoji": "🟪",
            "created_at": datetime.now(timezone.utc),
        })
        response = await client.put(
            f"/api/v1/categories/{other_id}",
            json={"name": test_category["name"]},
            headers=admin_headers,
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_delete_category_admin(self, client: AsyncClient, admin_headers, db):
        from uuid import uuid4
        from datetime import datetime, timezone

        cat_id = str(uuid4())
        await db["categories"].insert_one({
            "_id": cat_id,
            "name": "Disposable",
            "color_code": "#fff",
            "emoji": "🗑",
            "created_at": datetime.now(timezone.utc),
        })
        response = await client.delete(
            f"/api/v1/categories/{cat_id}",
            headers=admin_headers,
        )
        assert response.status_code == 200
        assert await db["categories"].find_one({"_id": cat_id}) is None

    @pytest.mark.asyncio
    async def test_delete_category_with_articles_blocked(
        self, client: AsyncClient, admin_headers, test_category, test_article
    ):
        """A category with articles should not be silently destroyable."""
        response = await client.delete(
            f"/api/v1/categories/{test_category['id']}",
            headers=admin_headers,
        )
        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_delete_category_non_admin_forbidden(
        self, client: AsyncClient, auth_headers, test_category
    ):
        response = await client.delete(
            f"/api/v1/categories/{test_category['id']}",
            headers=auth_headers,
        )
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_create_article_with_unknown_category_rejected(
        self, client: AsyncClient, admin_headers
    ):
        from uuid import uuid4
        from datetime import datetime, timezone

        response = await client.post(
            "/api/v1/articles/",
            json={
                "title": "Orphan article",
                "summary": "x",
                "category_id": str(uuid4()),
                "read_time": "1 min",
                "language": "en",
                "published_at": datetime.now(timezone.utc).isoformat(),
                "author": "Tester",
                "content": {"tldr": "x", "points": ["p"], "body": "b"},
            },
            headers=admin_headers,
        )
        assert response.status_code == 400
        assert "category" in response.json()["detail"].lower()
