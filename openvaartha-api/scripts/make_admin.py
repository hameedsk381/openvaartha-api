from pymongo import MongoClient
import sys

def make_admin(email):
    client = MongoClient("mongodb://localhost:27017/")
    db = client["openvaartha"]
    
    result = db["users"].update_one(
        {"email": email},
        {"$set": {"role": "admin", "is_admin": True}}
    )
    
    if result.matched_count > 0:
        print(f"Successfully updated {email} to Admin.")
    else:
        print(f"User with email {email} not found.")

if __name__ == "__main__":
    email = "mohammadasifkhanparchuru349@gmail.com"
    make_admin(email)
