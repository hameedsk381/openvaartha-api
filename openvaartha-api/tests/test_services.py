import pytest
from datetime import datetime, timezone
from uuid import uuid4
from app.services import article_service, auth_service
from app.schemas.article import ArticleCreate, ArticleContentCreate
from app.schemas.user import UserCreate
from app.core.security import verify_password


class TestArticleService:
    """Test article service functions."""
    
    @pytest.mark.asyncio
    async def test_get_articles(self, db, test_category, test_article):
        """Test retrieving articles."""
        articles = await article_service.get_articles(db, skip=0, limit=20)
        assert len(articles) >= 1
        assert any(a["id"] == test_article["id"] for a in articles)
    
    @pytest.mark.asyncio
    async def test_get_articles_by_category(self, db, test_category, test_article):
        """Test filtering articles by category."""
        articles = await article_service.get_articles(
            db, skip=0, limit=20, category_id=test_category["id"]
        )
        assert len(articles) >= 1
        assert all(a["category_id"] == test_category["id"] for a in articles)
    
    @pytest.mark.asyncio
    async def test_get_trending_articles(self, db, test_category):
        """Test retrieving trending articles."""
        # Create trending article
        trending_id = str(uuid4())
        await db["articles"].insert_one({
            "_id": trending_id,
            "id": trending_id,
            "slug": "trending-test",
            "title": "Trending Test",
            "summary": "Trending summary",
            "category_id": test_category["_id"],
            "read_time": "5 min",
            "language": "en",
            "is_trending": True,
            "is_breaking": False,
            "published_at": datetime.now(timezone.utc),
            "author": "Test",
            "created_at": datetime.now(timezone.utc)
        })
        
        articles = await article_service.get_trending_articles(db, limit=10)
        assert len(articles) >= 1
        assert any(a["id"] == trending_id for a in articles)
    
    @pytest.mark.asyncio
    async def test_get_breaking_articles(self, db, test_category):
        """Test retrieving breaking articles."""
        # Create breaking article
        breaking_id = str(uuid4())
        await db["articles"].insert_one({
            "_id": breaking_id,
            "id": breaking_id,
            "slug": "breaking-test",
            "title": "Breaking Test",
            "summary": "Breaking summary",
            "category_id": test_category["_id"],
            "read_time": "5 min",
            "language": "en",
            "is_trending": False,
            "is_breaking": True,
            "published_at": datetime.now(timezone.utc),
            "author": "Test",
            "created_at": datetime.now(timezone.utc)
        })
        
        articles = await article_service.get_breaking_articles(db, limit=5)
        assert len(articles) >= 1
        assert any(a["id"] == breaking_id for a in articles)
    
    @pytest.mark.asyncio
    async def test_get_article_by_slug(self, db, test_article):
        """Test retrieving article by slug."""
        article = await article_service.get_article_by_slug(db, test_article["slug"])
        assert article is not None
        assert article["id"] == test_article["id"]
    
    @pytest.mark.asyncio
    async def test_get_article_by_id(self, db, test_article):
        """Test retrieving article by ID."""
        article = await article_service.get_article_by_id(db, test_article["id"])
        assert article is not None
        assert article["id"] == test_article["id"]
    
    @pytest.mark.asyncio
    async def test_create_article(self, db, test_category):
        """Test creating a new article."""
        article_data = ArticleCreate(
            title="Service Test Article",
            summary="Test summary",
            category_id=test_category["id"],
            read_time="5 min",
            language="en",
            is_trending=False,
            is_breaking=False,
            published_at=datetime.now(timezone.utc),
            author="Test Author",
            content=ArticleContentCreate(
                tldr="TLDR",
                points=["Point 1"],
                body="Full body"
            )
        )
        
        article = await article_service.create_article(db, article_data)
        assert article is not None
        assert article["title"] == "Service Test Article"
        assert article["slug"] == "service-test-article"
    
    @pytest.mark.asyncio
    async def test_update_article(self, db, test_article):
        """Test updating an article."""
        from app.schemas.article import ArticleUpdate
        
        update_data = ArticleUpdate(title="Updated Title")
        article = await article_service.update_article(
            db, test_article["id"], update_data
        )
        
        assert article is not None
        assert article["title"] == "Updated Title"
    
    @pytest.mark.asyncio
    async def test_delete_article(self, db, test_article):
        """Test deleting an article."""
        success = await article_service.delete_article(db, test_article["id"])
        assert success is True
        
        # Verify deletion
        article = await article_service.get_article_by_id(db, test_article["id"])
        assert article is None
    
    @pytest.mark.asyncio
    async def test_search_articles(self, db, test_article):
        """Test searching articles."""
        results = await article_service.search_articles(db, query="Test")
        assert len(results) >= 1
        assert any(a["id"] == test_article["id"] for a in results)
    
    @pytest.mark.asyncio
    async def test_generate_slug(self):
        """Test slug generation."""
        slug = article_service.generate_slug("Hello World Test")
        assert slug == "hello-world-test"
        
        slug = article_service.generate_slug("Special  @#$ Characters")
        assert slug == "special--characters"


class TestAuthService:
    """Test authentication service functions."""
    
    @pytest.mark.asyncio
    async def test_get_user_by_email(self, db, test_user):
        """Test retrieving user by email."""
        user = await auth_service.get_user_by_email(db, test_user["email"])
        assert user is not None
        assert user.email == test_user["email"]
    
    @pytest.mark.asyncio
    async def test_get_user_by_id(self, db, test_user):
        """Test retrieving user by ID."""
        user = await auth_service.get_user_by_id(db, test_user["id"])
        assert user is not None
        assert user.id == test_user["id"]
    
    @pytest.mark.asyncio
    async def test_create_user(self, db):
        """Test creating a new user."""
        user_data = UserCreate(
            email="service-test@example.com",
            password="testpassword123",
            full_name="Service Test User"
        )
        
        user = await auth_service.create_user(db, user_data)
        assert user is not None
        assert user.email == "service-test@example.com"
        assert user.full_name == "Service Test User"
        assert verify_password("testpassword123", user.hashed_password)
    
    @pytest.mark.asyncio
    async def test_authenticate_user_success(self, db, test_user):
        """Test successful user authentication."""
        user = await auth_service.authenticate_user(
            db, test_user["email"], "testpassword123"
        )
        assert user is not False
        assert user.email == test_user["email"]
    
    @pytest.mark.asyncio
    async def test_authenticate_user_wrong_password(self, db, test_user):
        """Test authentication with wrong password."""
        user = await auth_service.authenticate_user(
            db, test_user["email"], "wrongpassword"
        )
        assert user is False
    
    @pytest.mark.asyncio
    async def test_authenticate_user_nonexistent(self, db):
        """Test authentication with non-existent user."""
        user = await auth_service.authenticate_user(
            db, "nonexistent@example.com", "password123"
        )
        assert user is False
    
    @pytest.mark.asyncio
    async def test_create_tokens(self, db, test_user):
        """Test token creation."""
        from app.models.user import User
        user = User(**test_user)
        tokens = auth_service.create_tokens(user)
        
        assert "access_token" in tokens
        assert "refresh_token" in tokens
        assert tokens["token_type"] == "bearer"
