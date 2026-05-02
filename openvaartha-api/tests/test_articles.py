import pytest
from httpx import AsyncClient
from uuid import uuid4
from datetime import datetime


class TestArticleListing:
    """Test article listing endpoints."""
    
    @pytest.mark.asyncio
    async def test_get_articles_empty(self, client: AsyncClient):
        """Test getting articles when database is empty."""
        response = await client.get("/api/v1/articles/")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0
    
    @pytest.mark.asyncio
    async def test_get_articles_with_data(self, client: AsyncClient, test_article):
        """Test getting articles with data."""
        response = await client.get("/api/v1/articles/")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["id"] == test_article["id"]
    
    @pytest.mark.asyncio
    async def test_get_articles_pagination(self, client: AsyncClient, db, test_category):
        """Test article pagination."""
        # Create multiple articles
        for i in range(25):
            article_id = str(uuid4())
            await db["articles"].insert_one({
                "_id": article_id,
                "id": article_id,
                "slug": f"test-article-{i}",
                "title": f"Test Article {i}",
                "summary": f"Summary {i}",
                "category_id": test_category["_id"],
                "read_time": "5 min",
                "language": "en",
                "is_trending": False,
                "is_breaking": False,
                "published_at": datetime.utcnow(),
                "author": "Test Author",
                "created_at": datetime.utcnow()
            })
        
        response = await client.get("/api/v1/articles/?skip=0&limit=10")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 10
    
    @pytest.mark.asyncio
    async def test_get_articles_by_category(self, client: AsyncClient, db, test_category, test_article):
        """Test filtering articles by category."""
        # Create another category
        other_category_id = str(uuid4())
        await db["categories"].insert_one({
            "_id": other_category_id,
            "id": other_category_id,
            "name": "Sports",
            "color_code": "#FF0000",
            "emoji": "⚽",
            "created_at": datetime.utcnow()
        })
        
        # Create article in other category
        other_article_id = str(uuid4())
        await db["articles"].insert_one({
            "_id": other_article_id,
            "id": other_article_id,
            "slug": "sports-article",
            "title": "Sports Article",
            "summary": "Sports summary",
            "category_id": other_category_id,
            "read_time": "5 min",
            "language": "en",
            "is_trending": False,
            "is_breaking": False,
            "published_at": datetime.utcnow(),
            "author": "Test Author",
            "created_at": datetime.utcnow()
        })
        
        response = await client.get(f"/api/v1/articles/?category_id={test_category['id']}")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["category_id"] == test_category["id"]


class TestTrendingArticles:
    """Test trending articles endpoint."""
    
    @pytest.mark.asyncio
    async def test_get_trending_articles(self, client: AsyncClient, db, test_category):
        """Test getting trending articles."""
        # Create trending article
        trending_id = str(uuid4())
        await db["articles"].insert_one({
            "_id": trending_id,
            "id": trending_id,
            "slug": "trending-article",
            "title": "Trending Article",
            "summary": "Trending summary",
            "category_id": test_category["_id"],
            "read_time": "5 min",
            "language": "en",
            "is_trending": True,
            "is_breaking": False,
            "published_at": datetime.utcnow(),
            "author": "Test Author",
            "created_at": datetime.utcnow()
        })
        
        response = await client.get("/api/v1/articles/trending")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert any(art["id"] == trending_id for art in data)


class TestBreakingArticles:
    """Test breaking articles endpoint."""
    
    @pytest.mark.asyncio
    async def test_get_breaking_articles(self, client: AsyncClient, db, test_category):
        """Test getting breaking articles."""
        # Create breaking article
        breaking_id = str(uuid4())
        await db["articles"].insert_one({
            "_id": breaking_id,
            "id": breaking_id,
            "slug": "breaking-article",
            "title": "Breaking Article",
            "summary": "Breaking summary",
            "category_id": test_category["_id"],
            "read_time": "5 min",
            "language": "en",
            "is_trending": False,
            "is_breaking": True,
            "published_at": datetime.utcnow(),
            "author": "Test Author",
            "created_at": datetime.utcnow()
        })
        
        response = await client.get("/api/v1/articles/breaking")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert any(art["id"] == breaking_id for art in data)


class TestArticleCRUD:
    """Test article CRUD operations."""
    
    @pytest.mark.asyncio
    async def test_get_article_by_slug(self, client: AsyncClient, test_article):
        """Test getting article by slug."""
        response = await client.get(f"/api/v1/articles/{test_article['slug']}")
        assert response.status_code == 200
        data = response.json()
        assert data["slug"] == test_article["slug"]
        assert data["title"] == test_article["title"]
    
    @pytest.mark.asyncio
    async def test_get_article_not_found(self, client: AsyncClient):
        """Test getting non-existent article."""
        response = await client.get("/api/v1/articles/non-existent-slug")
        assert response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_create_article_admin(self, client: AsyncClient, admin_headers, test_category):
        """Test creating article as admin."""
        response = await client.post(
            "/api/v1/articles/",
            json={
                "title": "New Article",
                "summary": "New article summary",
                "category_id": test_category["id"],
                "read_time": "5 min",
                "language": "en",
                "is_trending": False,
                "is_breaking": False,
                "published_at": datetime.utcnow().isoformat(),
                "author": "Test Author",
                "content": {
                    "tldr": "TLDR content",
                    "points": ["Point 1", "Point 2"],
                    "body": "Full article body"
                }
            },
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "New Article"
        assert data["slug"] == "new-article"
    
    @pytest.mark.asyncio
    async def test_create_article_non_admin(self, client: AsyncClient, auth_headers):
        """Test creating article as non-admin."""
        response = await client.post(
            "/api/v1/articles/",
            json={
                "title": "New Article",
                "summary": "New article summary",
                "category_id": str(uuid4()),
                "read_time": "5 min",
                "language": "en",
                "published_at": datetime.utcnow().isoformat(),
                "author": "Test Author",
                "content": {
                    "tldr": "TLDR",
                    "points": ["Point 1"],
                    "body": "Body"
                }
            },
            headers=auth_headers
        )
        assert response.status_code == 403
    
    @pytest.mark.asyncio
    async def test_update_article_admin(self, client: AsyncClient, admin_headers, test_article):
        """Test updating article as admin."""
        response = await client.put(
            f"/api/v1/articles/{test_article['id']}",
            json={"title": "Updated Title"},
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Updated Title"
    
    @pytest.mark.asyncio
    async def test_delete_article_admin(self, client: AsyncClient, admin_headers, test_article):
        """Test deleting article as admin."""
        response = await client.delete(
            f"/api/v1/articles/{test_article['id']}",
            headers=admin_headers
        )
        assert response.status_code == 200
        assert "deleted" in response.json()["message"].lower()
        
        # Verify deletion
        response = await client.get(f"/api/v1/articles/{test_article['slug']}")
        assert response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_update_article_not_found(self, client: AsyncClient, admin_headers):
        """Test updating non-existent article."""
        response = await client.put(
            f"/api/v1/articles/{str(uuid4())}",
            json={"title": "Updated Title"},
            headers=admin_headers
        )
        assert response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_delete_article_not_found(self, client: AsyncClient, admin_headers):
        """Test deleting non-existent article."""
        response = await client.delete(
            f"/api/v1/articles/{str(uuid4())}",
            headers=admin_headers
        )
        assert response.status_code == 404
