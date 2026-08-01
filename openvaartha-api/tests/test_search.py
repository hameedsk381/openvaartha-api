import pytest
from httpx import AsyncClient
from uuid import uuid4
from datetime import datetime, timezone


class TestSearch:
    """Test search endpoints."""
    
    @pytest.mark.asyncio
    async def test_search_articles_by_title(self, client: AsyncClient, test_article):
        """Test searching articles by title."""
        response = await client.get("/api/v1/search/?q=Test")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert any(art["id"] == test_article["id"] for art in data)
    
    @pytest.mark.asyncio
    async def test_search_articles_no_results(self, client: AsyncClient):
        """Test search with no results."""
        response = await client.get("/api/v1/search/?q=nonexistent")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0
    
    @pytest.mark.asyncio
    async def test_search_case_insensitive(self, client: AsyncClient, test_article):
        """Test case-insensitive search."""
        response = await client.get("/api/v1/search/?q=test")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
    
    @pytest.mark.asyncio
    async def test_search_pagination(self, client: AsyncClient, db, test_category):
        """Test search with pagination."""
        # Create multiple articles
        for i in range(15):
            article_id = str(uuid4())
            await db["articles"].insert_one({
                "_id": article_id,
                "id": article_id,
                "slug": f"search-test-{i}",
                "title": f"Search Test {i}",
                "summary": f"Summary {i}",
                "category_id": test_category["_id"],
                "read_time": "5 min",
                "language": "en",
                "is_trending": False,
                "is_breaking": False,
                "published_at": datetime.now(timezone.utc),
                "author": "Test Author",
                "created_at": datetime.now(timezone.utc)
            })
        
        response = await client.get("/api/v1/search/?q=Search&skip=0&limit=5")
        assert response.status_code == 200
        data = response.json()
        assert len(data) <= 5
    
    @pytest.mark.asyncio
    async def test_search_suggestions(self, client: AsyncClient, test_article):
        """Test search suggestions."""
        response = await client.get("/api/v1/search/suggestions?q=Test")
        assert response.status_code == 200
        data = response.json()
        assert "titles" in data
        assert "tags" in data
        assert "categories" in data
        assert isinstance(data["titles"], list)
        assert len(data["titles"]) >= 1
        assert any(test_article["title"] in sug["title"] for sug in data["titles"])
    
    @pytest.mark.asyncio
    async def test_search_empty_query(self, client: AsyncClient):
        """Test search with empty query."""
        response = await client.get("/api/v1/search/?q=")
        assert response.status_code == 422
