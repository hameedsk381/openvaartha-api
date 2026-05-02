from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
from uuid import UUID
from app.models.article import Article, ArticleContent, ArticleSource
from app.schemas.article import ArticleCreate, ArticleUpdate
import uuid


def get_articles(db: Session, skip: int = 0, limit: int = 20, category_id: Optional[UUID] = None):
    """Get all articles with optional filtering."""
    query = db.query(Article)
    
    if category_id:
        query = query.filter(Article.category_id == category_id)
    
    query = query.order_by(Article.published_at.desc())
    return query.offset(skip).limit(limit).all()


def get_trending_articles(db: Session, limit: int = 10):
    """Get trending articles."""
    return db.query(Article).filter(
        Article.is_trending == True
    ).order_by(
        Article.published_at.desc()
    ).limit(limit).all()


def get_breaking_articles(db: Session, limit: int = 5):
    """Get breaking news articles."""
    return db.query(Article).filter(
        Article.is_breaking == True
    ).order_by(
        Article.published_at.desc()
    ).limit(limit).all()


def get_article_by_slug(db: Session, slug: str):
    """Get a single article by slug."""
    article = db.query(Article).filter(Article.slug == slug).first()
    if article:
        # Load content relationship
        db.refresh(article, ['content'])
    return article


def get_article_by_id(db: Session, article_id: UUID):
    """Get a single article by ID."""
    article = db.query(Article).filter(Article.id == article_id).first()
    if article:
        db.refresh(article, ['content'])
    return article


def create_article(db: Session, article_data: ArticleCreate):
    """Create a new article."""
    # Generate slug from title
    slug = generate_slug(article_data.title)
    
    # Create article
    db_article = Article(
        id=uuid.uuid4(),
        slug=slug,
        title=article_data.title,
        summary=article_data.summary,
        category_id=article_data.category_id,
        read_time=article_data.read_time,
        language=article_data.language,
        is_trending=article_data.is_trending,
        is_breaking=article_data.is_breaking,
        thumbnail_url=article_data.thumbnail_url,
        instagram_url=article_data.instagram_url,
        published_at=article_data.published_at,
        last_updated=article_data.last_updated,
        author=article_data.author
    )
    
    db.add(db_article)
    db.flush()  # Get the article ID
    
    # Create article content
    db_content = ArticleContent(
        article_id=db_article.id,
        tldr=article_data.content.tldr,
        points=article_data.content.points,
        body=article_data.content.body,
        timeline=article_data.content.timeline,
        explainer=article_data.content.explainer
    )
    
    db.add(db_content)
    
    # Add sources if provided
    if article_data.source_ids:
        for source_id in article_data.source_ids:
            db_article_source = ArticleSource(
                article_id=db_article.id,
                source_id=source_id
            )
            db.add(db_article_source)
    
    db.commit()
    db.refresh(db_article)
    return db_article


def update_article(db: Session, article_id: UUID, article_data: ArticleUpdate):
    """Update an existing article."""
    db_article = get_article_by_id(db, article_id)
    if not db_article:
        return None
    
    update_data = article_data.dict(exclude_unset=True)
    
    # Update article fields
    for field, value in update_data.items():
        if field != 'content' and hasattr(db_article, field):
            setattr(db_article, field, value)
    
    # Update content if provided
    if article_data.content:
        if db_article.content:
            for field, value in article_data.content.dict(exclude_unset=True).items():
                setattr(db_article.content, field, value)
        else:
            db_content = ArticleContent(
                article_id=db_article.id,
                **article_data.content.dict()
            )
            db.add(db_content)
    
    db.commit()
    db.refresh(db_article)
    return db_article


def delete_article(db: Session, article_id: UUID):
    """Delete an article."""
    db_article = get_article_by_id(db, article_id)
    if not db_article:
        return False
    
    db.delete(db_article)
    db.commit()
    return True


def search_articles(db: Session, query: str, skip: int = 0, limit: int = 20):
    """Search articles by title, summary, or content."""
    search_term = f"%{query}%"
    
    results = db.query(Article).filter(
        or_(
            Article.title.ilike(search_term),
            Article.summary.ilike(search_term)
        )
    ).order_by(
        Article.published_at.desc()
    ).offset(skip).limit(limit).all()
    
    return results


def generate_slug(title: str) -> str:
    """Generate a URL-friendly slug from title."""
    slug = title.lower()
    slug = slug.replace(" ", "-")
    slug = slug.replace("--", "-")
    slug = ''.join(c for c in slug if c.isalnum() or c == '-')
    return slug
