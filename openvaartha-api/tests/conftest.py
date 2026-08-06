import pytest
from motor.motor_asyncio import AsyncIOMotorClient
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.config import Settings
from datetime import datetime, timezone
from uuid import uuid4


@pytest.fixture(scope="session")
def test_settings():
    """Test settings with test database."""
    return Settings(
        MONGODB_URL="mongodb://localhost:27017",
        DATABASE_NAME="openvaartha_test",
        JWT_SECRET_KEY="test-jwt-secret-key",
    )


@pytest.fixture(scope="function")
async def mongo_client(test_settings):
    """Create MongoDB client for testing."""
    client = AsyncIOMotorClient(test_settings.MONGODB_URL)
    yield client
    client.close()


@pytest.fixture(scope="function")
async def db(mongo_client, test_settings):
    """Create test database and clean up after each test.

    Beanie document models are (re)initialized here, in the same event loop
    as the test, so ``Model.get_motor_collection()`` calls used by service
    functions resolve to the local test database instead of the app's
    configured DB (e.g. the ``mongo`` hostname from .env).
    """
    from beanie import init_beanie
    from app.models.article import Article, Source
    from app.models.author import Author
    from app.models.category import Category
    from app.models.comment import Comment
    from app.models.digest import DailyDigest
    from app.models.dispatch import Dispatch
    from app.models.newsletter import NewsletterSubscriber
    from app.models.poll import Poll, PollVote
    from app.models.reaction import Reaction
    from app.models.reading_list import ReadingList, ReadingHistory
    from app.models.series import Series
    from app.models.user import User, PasswordResetToken

    db = mongo_client[test_settings.DATABASE_NAME]
    await init_beanie(database=db, document_models=[
        Article, Source, Author, Category, Comment, DailyDigest,
        Dispatch, NewsletterSubscriber, Poll, PollVote,
        Reaction, ReadingList, ReadingHistory, Series, User, PasswordResetToken
    ])

    collections = [
        "users", "articles", "categories", "newsletter_subscribers",
        "reading_lists", "reading_history", "sources", "article_content", "article_sources",
        "comments", "article_reactions", "article_corrections", "article_revisions",
        "sessions",
    ]
    for collection in collections:
        await db[collection].delete_many({})

    yield db

    for collection in collections:
        await db[collection].delete_many({})


@pytest.fixture(scope="function", autouse=True)
def reset_rate_limiter():
    """Clear SlowAPI in-memory state so per-IP limits don't leak across tests."""
    from app.core.rate_limit import limiter

    storage = getattr(limiter, "_storage", None) or getattr(limiter, "storage", None)
    if storage and hasattr(storage, "reset"):
        try:
            storage.reset()
        except Exception:
            pass
    yield


@pytest.fixture(scope="function")
async def client(db):
    """Create test client with overridden DB dependency."""
    from app.database import get_db

    async def _get_db_override():
        yield db

    app.dependency_overrides[get_db] = _get_db_override
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as async_client:
        yield async_client
    app.dependency_overrides.clear()


@pytest.fixture
async def test_user(db):
    """Create a test user."""
    from app.core.security import get_password_hash
    
    user_id = str(uuid4())
    user_data = {
        "_id": user_id,
        "id": user_id,
        "email": "test@example.com",
        "full_name": "Test User",
        "hashed_password": get_password_hash("testpassword123"),
        "is_active": True,
        "is_admin": False,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db["users"].insert_one(user_data)
    return user_data


@pytest.fixture
async def test_admin(db):
    """Create a test admin user."""
    from app.core.security import get_password_hash
    
    admin_id = str(uuid4())
    admin_data = {
        "_id": admin_id,
        "id": admin_id,
        "email": "admin@example.com",
        "full_name": "Admin User",
        "hashed_password": get_password_hash("adminpassword123"),
        "is_active": True,
        "is_admin": True,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db["users"].insert_one(admin_data)
    return admin_data


@pytest.fixture
async def test_category(db):
    """Create a test category."""
    category_id = str(uuid4())
    category_data = {
        "_id": category_id,
        "id": category_id,
        "name": "Technology",
        "color_code": "#3B82F6",
        "emoji": "💻",
        "created_at": datetime.now(timezone.utc)
    }
    
    await db["categories"].insert_one(category_data)
    return category_data


@pytest.fixture
async def test_article(db, test_category):
    """Create a test article."""
    article_id = str(uuid4())
    article_data = {
        "_id": article_id,
        "id": article_id,
        "slug": "test-article",
        "title": "Test Article",
        "summary": "This is a test article summary",
        "category_id": test_category["_id"],
        "read_time": "5 min",
        "language": "en",
        "is_trending": False,
        "is_breaking": False,
        "thumbnail_url": "https://example.com/image.jpg",
        "instagram_url": None,
        "published_at": datetime.now(timezone.utc),
        "last_updated": None,
        "author": "Test Author",
        "created_at": datetime.now(timezone.utc)
    }
    
    await db["articles"].insert_one(article_data)
    return article_data


@pytest.fixture
def auth_headers(test_user):
    """Generate auth headers for test user."""
    from app.core.security import create_access_token
    
    token = create_access_token(
        data={"sub": test_user["id"], "email": test_user["email"]}
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_headers(test_admin):
    """Generate auth headers for admin user."""
    from app.core.security import create_access_token
    
    token = create_access_token(
        data={"sub": test_admin["id"], "email": test_admin["email"]}
    )
    return {"Authorization": f"Bearer {token}"}
