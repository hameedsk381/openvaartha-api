"""
Seed script to populate database with initial data
Run this after setting up the database
"""
from app.database import SessionLocal, engine, Base
from app.models import Category, Article, ArticleContent, User
from app.core.security import get_password_hash
import uuid
from datetime import datetime

def seed_categories():
    """Seed initial categories."""
    db = SessionLocal()
    
    categories = [
        {"name": "Politics", "color_code": "#550000", "emoji": "🟣"},
        {"name": "Tech", "color_code": "#4a5568", "emoji": "🔵"},
        {"name": "Business", "color_code": "#6b705c", "emoji": "🟢"},
        {"name": "Cinema", "color_code": "#cb997e", "emoji": "🟠"},
        {"name": "Local News", "color_code": "#bc6c25", "emoji": "🔴"},
        {"name": "Sports", "color_code": "#ddb892", "emoji": "🟡"},
    ]
    
    for cat_data in categories:
        existing = db.query(Category).filter(Category.name == cat_data["name"]).first()
        if not existing:
            category = Category(
                id=uuid.uuid4(),
                **cat_data
            )
            db.add(category)
            print(f"Created category: {cat_data['name']}")
    
    db.commit()
    db.close()


def seed_admin_user():
    """Seed admin user."""
    db = SessionLocal()
    
    # Check if admin exists
    existing = db.query(User).filter(User.email == "admin@openvaartha.com").first()
    if not existing:
        admin = User(
            id=uuid.uuid4(),
            email="admin@openvaartha.com",
            full_name="Admin User",
            hashed_password=get_password_hash("admin123"),
            is_active=True,
            is_admin=True
        )
        db.add(admin)
        db.commit()
        print("Created admin user: admin@openvaartha.com / admin123")
    
    db.close()


def seed_sample_articles():
    """Seed sample articles from mock data."""
    db = SessionLocal()
    
    # Get categories
    politics_cat = db.query(Category).filter(Category.name == "Politics").first()
    cinema_cat = db.query(Category).filter(Category.name == "Cinema").first()
    local_cat = db.query(Category).filter(Category.name == "Local News").first()
    tech_cat = db.query(Category).filter(Category.name == "Tech").first()
    
    if not all([politics_cat, cinema_cat, local_cat, tech_cat]):
        print("Categories not found. Run seed_categories first.")
        return
    
    # Sample article 1: AP Budget
    existing = db.query(Article).filter(Article.slug == "andhra-budget-2026").first()
    if not existing:
        article1 = Article(
            id=uuid.uuid4(),
            slug="andhra-budget-2026",
            title="Andhra Pradesh Budget 2026: ₹2.8 Lakh Crore Focus on Infra & Welfare",
            summary="Key allocations focus on infrastructure, agriculture, and Amaravati development.",
            category_id=politics_cat.id,
            read_time="45 sec",
            language="en",
            is_trending=True,
            is_breaking=True,
            thumbnail_url="/thumbnails/ap_budget.png",
            published_at=datetime(2026, 4, 2, 8, 0, 0),
            author="Open Vaartha Desk"
        )
        db.add(article1)
        db.flush()
        
        content1 = ArticleContent(
            article_id=article1.id,
            tldr="AP government increases spending on infrastructure and welfare schemes. Amaravati capital city project gets renewed funding.",
            points=[
                "₹20,000 crore allocated for Amaravati capital development",
                "New irrigation projects across Rayalaseema region announced",
                "Focus on rural employment with ₹5,000 crore NREGS supplement",
                "Free laptop scheme for intermediate students expanded",
                "Healthcare budget increased by 18% year-over-year"
            ],
            body="The Andhra Pradesh government presented its annual budget for 2026-27 with a total outlay of ₹2.8 lakh crore..."
        )
        db.add(content1)
        print("Created article: Andhra Pradesh Budget 2026")
    
    # Sample article 2: RRR Sequel
    existing = db.query(Article).filter(Article.slug == "rrr-sequel-announcement").first()
    if not existing:
        article2 = Article(
            id=uuid.uuid4(),
            slug="rrr-sequel-announcement",
            title="SS Rajamouli Confirms RRR Sequel with Ram Charan & Jr NTR",
            summary="India's biggest director announces the much-awaited sequel, shooting begins October.",
            category_id=cinema_cat.id,
            read_time="30 sec",
            language="en",
            is_trending=True,
            thumbnail_url="/thumbnails/rrr_sequel.png",
            instagram_url="https://www.instagram.com/p/C58vQZSS_q9/",
            published_at=datetime(2026, 4, 1, 14, 0, 0),
            author="Cinema Intel Team"
        )
        db.add(article2)
        db.flush()
        
        content2 = ArticleContent(
            article_id=article2.id,
            tldr="SS Rajamouli officially confirms RRR 2 with both Ram Charan and Jr NTR returning.",
            points=[
                "Both Ram Charan and Jr NTR confirmed to return",
                "Budget estimated at ₹800 crore",
                "Shooting begins October 2026 across 5 countries",
                "MM Keeravani returns as music composer",
                "Planned for Sankranti 2028 release"
            ],
            body="In what is being called the biggest announcement in Indian cinema this year..."
        )
        db.add(content2)
        print("Created article: RRR Sequel Announcement")
    
    db.commit()
    db.close()
    print("Sample articles seeded successfully!")


if __name__ == "__main__":
    print("Starting database seeding...")
    
    # Create tables
    Base.metadata.create_all(bind=engine)
    print("Database tables created.")
    
    # Seed data
    seed_categories()
    seed_admin_user()
    seed_sample_articles()
    
    print("\n✅ Seeding completed successfully!")
    print("\nAdmin credentials:")
    print("Email: admin@openvaartha.com")
    print("Password: admin123")
