"""Hard-delete integration-test comment records from the database.

The public DELETE endpoint soft-deletes comments (is_active=false), which is
correct for moderation but leaves the documents in Mongo where they still show
up in the admin moderation list. This script purges the documents entirely.

It matches comments whose body carries the integration-suite marker
``[IntegrationTest]``. Run it inside the API container (or anywhere with
MONGODB_URL set):

    docker compose exec api python scripts/cleanup_test_comments.py

Add ``--dry-run`` to only print what would be deleted.
"""

from pymongo import MongoClient
import sys
import os
import re

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.config import settings

MARKER = "[IntegrationTest]"


def cleanup(dry_run: bool = False) -> int:
    client = MongoClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]
    collection = db["comments"]

    # re.escape: the brackets in the marker are regex metacharacters (a
    # character class), so without escaping the pattern would match any body
    # containing any of the letters I,n,t,e,g,r,a,s,o,.
    query = {"body": {"$regex": re.escape(MARKER)}}
    count = collection.count_documents(query)
    print(f"Found {count} integration-test comment(s) matching {MARKER!r}.")

    if count == 0:
        client.close()
        return 0

    if dry_run:
        print("Dry run — nothing deleted.")
        for doc in collection.find(query, {"_id": 1, "body": 1}).limit(20):
            print(f"  would delete {doc['_id']}: {doc['body'][:60]}")
        client.close()
        return 0

    result = collection.delete_many(query)
    print(f"Deleted {result.deleted_count} comment(s).")
    client.close()
    return result.deleted_count


if __name__ == "__main__":
    dry_run = "--dry-run" in sys.argv
    cleanup(dry_run=dry_run)
