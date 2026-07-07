import asyncio
import os
import base64
from motor.motor_asyncio import AsyncIOMotorClient

# Make sure we can import the app modules
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.config import settings
from app.services.article_service import _save_base64_thumbnail

async def run_migration():
    if not settings.GCS_BUCKET_NAME:
        print("ERROR: GCS_BUCKET_NAME is not set in environment!")
        return

    print(f"Starting migration to GCS bucket: {settings.GCS_BUCKET_NAME}")
    
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]
    
    articles = await db["articles"].find({}).to_list(length=None)
    
    migrated_count = 0
    skipped_count = 0
    error_count = 0
    
    for article in articles:
        thumb = article.get("thumbnail_url")
        if not thumb:
            skipped_count += 1
            continue
            
        # If it's already on GCS or external
        if thumb.startswith("https://storage.googleapis.com/") or thumb.startswith("http"):
            if not thumb.startswith("http://localhost") and not thumb.startswith("https://localhost"):
                skipped_count += 1
                continue
                
        new_url = None
        
        try:
            if thumb.startswith("data:image"):
                # It's a base64 image
                print(f"Migrating Base64 image for article {article['slug']}...")
                new_url = _save_base64_thumbnail(thumb)
                
            elif thumb.startswith("/media/"):
                # It's a local file
                print(f"Migrating Local file {thumb} for article {article['slug']}...")
                
                # We are running inside the container, so local path is /app/media/...
                filename = thumb.split("/")[-1]
                media_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "media")
                file_path = os.path.join(media_dir, filename)
                
                if os.path.exists(file_path):
                    with open(file_path, "rb") as f:
                        file_bytes = f.read()
                        
                    # Determine mime type based on extension
                    ext = filename.split(".")[-1].lower()
                    mime_type = f"image/{ext}" if ext != "jpg" else "image/jpeg"
                    
                    # Convert to base64 to leverage existing logic
                    b64_encoded = base64.b64encode(file_bytes).decode('utf-8')
                    b64_string = f"data:{mime_type};base64,{b64_encoded}"
                    
                    new_url = _save_base64_thumbnail(b64_string)
                else:
                    print(f"  -> File not found on disk: {file_path}")
                    error_count += 1
                    
            if new_url and new_url != thumb and new_url.startswith("https://storage.googleapis.com/"):
                # Update the database
                await db["articles"].update_one(
                    {"_id": article["_id"]},
                    {"$set": {"thumbnail_url": new_url}}
                )
                print(f"  -> Successfully migrated to {new_url}")
                migrated_count += 1
            elif new_url and not new_url.startswith("https://storage.googleapis.com/"):
                print(f"  -> Failed to migrate, _save_base64_thumbnail returned non-GCS URL: {new_url}")
                error_count += 1
                
        except Exception as e:
            print(f"  -> Error processing article {article['slug']}: {e}")
            error_count += 1

    print("\n--- Migration Complete ---")
    print(f"Total Migrated: {migrated_count}")
    print(f"Total Skipped: {skipped_count}")
    print(f"Total Errors: {error_count}")

if __name__ == "__main__":
    asyncio.run(run_migration())
