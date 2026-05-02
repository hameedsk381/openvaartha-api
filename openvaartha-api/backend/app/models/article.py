from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base, GUID


class Article(Base):
    __tablename__ = "articles"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    slug = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=False)
    summary = Column(Text, nullable=False)
    category_id = Column(GUID, ForeignKey("categories.id"), nullable=False)
    read_time = Column(String, nullable=False)
    language = Column(String, nullable=False, default="en")
    is_trending = Column(Boolean, default=False)
    is_breaking = Column(Boolean, default=False)
    thumbnail_url = Column(String, nullable=True)
    instagram_url = Column(String, nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=False)
    last_updated = Column(DateTime(timezone=True), nullable=True)
    author = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    category = relationship("Category", backref="articles")
    content = relationship("ArticleContent", back_populates="article", uselist=False)
    sources = relationship("ArticleSource", back_populates="article")


class ArticleContent(Base):
    __tablename__ = "article_content"

    article_id = Column(GUID, ForeignKey("articles.id"), primary_key=True)
    tldr = Column(Text, nullable=False)
    points = Column(JSON, nullable=False)
    body = Column(Text, nullable=False)
    timeline = Column(JSON, nullable=True)
    explainer = Column(JSON, nullable=True)

    # Relationship
    article = relationship("Article", back_populates="content")


class Source(Base):
    __tablename__ = "sources"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    url = Column(String, nullable=True)
    type = Column(String, nullable=False, default="manual")  # rss, api, manual


class ArticleSource(Base):
    __tablename__ = "article_sources"

    article_id = Column(GUID, ForeignKey("articles.id"), primary_key=True)
    source_id = Column(GUID, ForeignKey("sources.id"), primary_key=True)
    
    # Relationships
    article = relationship("Article", back_populates="sources")
    source = relationship("Source", backref="article_sources")
