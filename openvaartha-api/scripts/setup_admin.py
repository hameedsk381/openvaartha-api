import sys
import os
import uuid
from datetime import datetime
from pymongo import MongoClient

# Add the project root to sys.path so we can import app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.security import get_password_hash

def setup_admin():
    client = MongoClient("mongodb://127.0.0.1:27017/")
    db = client["openvaartha"]
    users_collection = db["users"]
    
    admin_email = "hameedullahshaik@hamathopc.in"
    admin_password = "openvaartha@admin49"
    hashed_password = get_password_hash(admin_password)
    
    # 1. Remove admin access from everyone else
    result = users_collection.update_many(
        {"email": {"$ne": admin_email}},
        {"$set": {"is_admin": False, "role": "user"}}
    )
    print(f"Removed admin access from {result.modified_count} users.")
    
    # 2. Setup the specific admin user
    existing_admin = users_collection.find_one({"email": admin_email})
    
    if existing_admin:
        users_collection.update_one(
            {"email": admin_email},
            {"$set": {
                "hashed_password": hashed_password,
                "is_admin": True,
                "role": "admin",
                "is_active": True
            }}
        )
        print(f"Updated existing admin user: {admin_email}")
    else:
        user_id = str(uuid.uuid4())
        new_admin = {
            "_id": user_id,
            "id": user_id,
            "email": admin_email,
            "hashed_password": hashed_password,
            "full_name": "System Administrator",
            "is_active": True,
            "is_admin": True,
            "role": "admin",
            "created_at": datetime.utcnow()
        }
        users_collection.insert_one(new_admin)
        print(f"Created new admin user: {admin_email}")

if __name__ == "__main__":
    setup_admin()
