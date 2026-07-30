import asyncio
import os
import sys

# Ensure the app module can be found
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.ai_service import generate_article
from app.services.article_service import create_article
from app.database import db
from app.schemas.article import ArticleCreate

async def main():
    print("Generating article...")
    result = await generate_article(
        topic="The Future of Agentic AI",
        style="standard",
        tone="analytical",
        length="standard"
    )
    
    if not result:
        print("Failed to generate article")
        return

    print("Article generated. Saving to DB...")
    
    # create_article expects an ArticleCreate and user_id
    article_in = ArticleCreate(
        title=result["title"],
        summary=result["summary"],
        body=result["body"],
        category="Technology",
        tags=result.get("tags", []),
        status="published",
        # Adding dummy fields required for the schema
        thumbnailUrl="https://images.unsplash.com/photo-1677442136019-21780ecad995"
    )
    
    # We need a dummy user_id, let's just use "test_admin"
    created = await create_article(db, article_in, user_id="test_admin")
    print(f"Article saved! Slug: {created.slug}")

if __name__ == "__main__":
    asyncio.run(main())
