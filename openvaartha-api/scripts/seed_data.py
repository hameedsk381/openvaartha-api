"""
Seed script to populate database with initial data

DEPRECATED: This script has been replaced by seed_db.py (async MongoDB).
Please use seed_db.py instead:

    docker compose exec api python scripts/seed_db.py

Or for local development:

    cd openvaartha-api
    python -m scripts.seed_db
"""
import sys
import asyncio


def main():
    print("=" * 60)
    print("  DEPRECATED: seed_data.py has been replaced by seed_db.py")
    print("=" * 60)
    print()
    print("  This script used SQLAlchemy which is not part of this project.")
    print("  The project uses Motor (async MongoDB) for database access.")
    print()
    print("  Please use the replacement script instead:")
    print()
    print("    docker compose exec api python scripts/seed_db.py")
    print()
    print("  Or for local development:")
    print()
    print("    cd openvaartha-api")
    print("    python -m scripts.seed_db")
    print()
    sys.exit(1)


if __name__ == "__main__":
    main()
