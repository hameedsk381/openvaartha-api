from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.config import settings

# Import all models here
from app.models.article import Article, Source
from app.models.author import Author
from app.models.category import Category
from app.models.comment import Comment
from app.models.digest import DailyDigest
from app.models.newsletter import NewsletterSubscriber
from app.models.poll import Poll, PollVote
from app.models.reaction import Reaction
from app.models.reading_list import ReadingList, ReadingHistory
from app.models.series import Series
from app.models.user import User, PasswordResetToken

# MongoDB client
client = AsyncIOMotorClient(settings.MONGODB_URL)
db = client[settings.DATABASE_NAME]


async def init_db():
    await init_beanie(database=db, document_models=[
        Article, Source, Author, Category, Comment, DailyDigest,
        NewsletterSubscriber, Poll, PollVote,
        Reaction, ReadingList, ReadingHistory, Series, User, PasswordResetToken
    ])

# Dependency
async def get_db():
    yield db
