"""
Admin Setup Script for Local Testing
=====================================
This script creates an admin user for testing purposes.

Usage:
    python scripts/setup_admin.py

The script will:
1. Check if an admin user already exists
2. If not, create one with default credentials
3. Display the credentials for Swagger testing

Default admin credentials:
    Email: admin@openvaartha.com
    Password: admin123

IMPORTANT: This is for LOCAL TESTING ONLY. Change these credentials in production!
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash
from sqlalchemy.exc import IntegrityError


def setup_admin():
    """Create admin user if it doesn't exist."""
    db = SessionLocal()
    
    try:
        # Check if admin already exists
        existing_admin = db.query(User).filter(User.is_admin == True).first()
        
        if existing_admin:
            print("=" * 60)
            print("✅ Admin user already exists!")
            print("=" * 60)
            print(f"\nEmail: {existing_admin.email}")
            print(f"Full Name: {existing_admin.full_name}")
            print(f"User ID: {existing_admin.id}")
            print("\nTo test admin endpoints:")
            print("1. Login with these credentials in Swagger")
            print("2. Click the 'Authorize' button")
            print("3. Enter your Bearer token")
            print("4. Test admin-protected endpoints")
            print("=" * 60)
            return
        
        # Create new admin user
        admin_email = "admin@openvaartha.com"
        admin_password = "admin123"
        admin_name = "Admin User"
        
        admin_user = User(
            email=admin_email,
            hashed_password=get_password_hash(admin_password),
            full_name=admin_name,
            is_active=True,
            is_admin=True
        )
        
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        print("=" * 60)
        print("✅ Admin user created successfully!")
        print("=" * 60)
        print("\n🔐 Admin Credentials:")
        print(f"   Email: {admin_email}")
        print(f"   Password: {admin_password}")
        print("\n📝 How to use in Swagger:")
        print("   1. Go to http://localhost:8000/docs")
        print("   2. Find POST /api/v1/users/login")
        print("   3. Click 'Try it out'")
        print("   4. Enter credentials and execute")
        print("   5. Copy the access_token from response")
        print("   6. Click 'Authorize' button at top")
        print("   7. Enter: Bearer <your_token>")
        print("   8. Click 'Authorize'")
        print("   9. Now test admin endpoints!")
        print("\n⚠️  IMPORTANT:")
        print("   - Change these credentials in production!")
        print("   - This is for LOCAL TESTING ONLY")
        print("=" * 60)
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating admin user: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    setup_admin()
