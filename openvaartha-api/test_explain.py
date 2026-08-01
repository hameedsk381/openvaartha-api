import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import sys

# Ensure app is in path
sys.path.append('d:/openvaartha-api/openvaartha-api')
from app.services import article_service

async def main():
    client = AsyncIOMotorClient('mongodb://openvaartha:openvaartha@localhost:27017/openvaartha')
    db = client.openvaartha
    
    # Get a random article
    article = await db.articles.find_one()
    if not article:
        print("No articles found")
        return
        
    article_id = str(article["_id"])
    print(f"Testing with article ID: {article_id}")
    
    # Get the article via the service
    art = await article_service.get_article_by_id(db, article_id)
    print(f"Title: {art.get('title')}")
    print(f"Content length: {len(art.get('content', {}).get('body', ''))}")
    
    text_to_explain = f"Title: {art.get('title', '')}\n\n{art.get('content', {}).get('body', '')}"
    print(f"\nText passed to LLM (first 500 chars):\n{text_to_explain[:500]}")

asyncio.run(main())
