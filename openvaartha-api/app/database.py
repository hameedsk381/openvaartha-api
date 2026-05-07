from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

# MongoDB client
client = AsyncIOMotorClient(settings.MONGODB_URL)
db = client[settings.DATABASE_NAME]


# Collections
users_collection = db["users"]
articles_collection = db["articles"]
categories_collection = db["categories"]
newsletter_subscribers_collection = db["newsletter_subscribers"]
reading_lists_collection = db["reading_lists"]
reading_history_collection = db["reading_history"]
sources_collection = db["sources"]


# Dependency
async def get_db():
    yield db
