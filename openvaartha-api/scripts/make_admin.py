from pymongo import MongoClient
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.config import settings

def make_admin(email):
    client = MongoClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]
    
    result = db["users"].update_one(
        {"email": email},
        {"$set": {"role": "admin", "is_admin": True}}
    )
    
    if result.matched_count > 0:
        print(f"Successfully updated {email} to Admin.")
    else:
        print(f"User with email {email} not found.")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python scripts/make_admin.py user@example.com")
    email = sys.argv[1]
    make_admin(email)
