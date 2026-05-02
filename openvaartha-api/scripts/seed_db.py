import asyncio
import motor.motor_asyncio
from datetime import datetime, timedelta
from uuid import uuid4
import sys
import os

# Add the parent directory to sys.path to import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings
from app.core.security import get_password_hash

async def seed_db():
    print("Starting database seeding...")
    client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]
    
    # Clear existing data (optional, but good for clean seed)
    # await db["users"].delete_many({})
    # await db["categories"].delete_many({})
    # await db["articles"].delete_many({})
    # await db["article_content"].delete_many({})
    
    # 1. Seed Categories
    categories = [
        {"name": "Politics", "color_code": "#550000", "emoji": "🟣"},
        {"name": "Tech", "color_code": "#4a5568", "emoji": "🔵"},
        {"name": "Business", "color_code": "#6b705c", "emoji": "🟢"},
        {"name": "Cinema", "color_code": "#cb997e", "emoji": "🟠"},
        {"name": "Local News", "color_code": "#bc6c25", "emoji": "🔴"},
        {"name": "Sports", "color_code": "#ddb892", "emoji": "🟡"},
    ]
    
    category_map = {}
    for cat in categories:
        existing = await db["categories"].find_one({"name": cat["name"]})
        if not existing:
            cat_id = str(uuid4())
            cat_doc = {
                "_id": cat_id,
                "id": cat_id,
                **cat,
                "created_at": datetime.utcnow()
            }
            await db["categories"].insert_one(cat_doc)
            category_map[cat["name"]] = cat_id
            print(f"Created category: {cat['name']}")
        else:
            category_map[cat["name"]] = existing["_id"]
            
    # 2. Seed Admin User
    admin_email = "admin@openvaartha.com"
    existing_admin = await db["users"].find_one({"email": admin_email})
    if not existing_admin:
        admin_id = str(uuid4())
        admin_doc = {
            "_id": admin_id,
            "id": admin_id,
            "email": admin_email,
            "full_name": "OpenVaartha Admin",
            "hashed_password": get_password_hash("admin123"),
            "is_active": True,
            "is_admin": True,
            "created_at": datetime.utcnow()
        }
        await db["users"].insert_one(admin_doc)
        print("Created admin user: admin@openvaartha.com / admin123")
        
    # 3. Seed some mock articles
    articles = [
        {
            "title": "Andhra Pradesh Budget 2026: ₹2.8 Lakh Crore Focus on Infra & Welfare",
            "summary": "State government announces record budget with significant allocations for irrigation and education.",
            "category_name": "Politics",
            "read_time": "5 min read",
            "is_breaking": True,
            "is_trending": True,
            "thumbnail_url": "https://images.unsplash.com/photo-1541872703-74c5e443d1f9?w=800&auto=format&fit=crop",
            "author": "Vignesh Kumar",
            "content": {
                "tldr": "Andhra Pradesh unveiled a massive budget for 2026 focusing on social welfare and infrastructure.",
                "points": ["₹2.8 Lakh Crore total outlay", "Heavy focus on Amaravati development", "Agriculture gets ₹30,000 Cr"],
                "body": "The Finance Minister today presented the state budget for the fiscal year 2026-27...",
                "timeline": [{"date": "10:00 AM", "event": "Budget session begins"}, {"date": "11:30 AM", "event": "Speech concludes"}]
            }
        },
        {
            "title": "NVIDIA's New AI Chipset Promises 10x Faster Real-time Translation",
            "summary": "The latest 'Hyperion' architecture set to revolutionize linguistic processing.",
            "category_name": "Tech",
            "read_time": "3 min read",
            "is_breaking": False,
            "is_trending": True,
            "thumbnail_url": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop",
            "author": "Sarah Chen",
            "content": {
                "tldr": "NVIDIA announces a breakthrough in AI hardware designed for real-time translation.",
                "points": ["10x speed improvement", "Energy efficient design", "Q3 2026 launch"],
                "body": "NVIDIA CEO Jensen Huang took the stage at GTC 2026 to reveal the next generation of AI chips...",
                "explainer": [{"question": "What is Hyperion?", "answer": "It is NVIDIA's latest AI architecture designed for low-latency tasks."}]
            }
        }
    ]
    
    for art in articles:
        slug = art["title"].lower().replace(" ", "-").replace(":", "").replace("₹", "")
        existing = await db["articles"].find_one({"slug": slug})
        if not existing:
            art_id = str(uuid4())
            content = art.pop("content")
            cat_name = art.pop("category_name")
            
            art_doc = {
                "_id": art_id,
                "id": art_id,
                "slug": slug,
                **art,
                "category_id": category_map.get(cat_name),
                "language": "en",
                "published_at": datetime.utcnow(),
                "created_at": datetime.utcnow()
            }
            await db["articles"].insert_one(art_doc)
            
            content_doc = {
                "article_id": art_id,
                **content
            }
            await db["article_content"].insert_one(content_doc)
            print(f"Created article: {art['title']}")

    print("Seeding completed successfully!")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_db())
