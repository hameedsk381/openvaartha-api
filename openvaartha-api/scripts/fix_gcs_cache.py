"""One-time migration: set 1-year immutable cache on all existing GCS objects.

Run: docker compose run --rm api python scripts/fix_gcs_cache.py

Safe to re-run — idempotent (only updates objects that don't already have
the target cache-control header).
"""
import sys
sys.path.insert(0, "/app")

from app.services.storage_service import get_bucket

TARGET = "public, max-age=31536000, immutable"


def main():
    bucket = get_bucket()
    updated = 0
    skipped = 0
    for blob in bucket.list_blobs():
        if blob.cache_control == TARGET:
            skipped += 1
            continue
        blob.cache_control = TARGET
        blob.patch()
        updated += 1
        if updated % 50 == 0:
            print(f"  updated {updated} objects...")

    print(f"Done. Updated: {updated}, already correct: {skipped}")


if __name__ == "__main__":
    main()
