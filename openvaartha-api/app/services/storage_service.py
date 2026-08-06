"""Centralized Google Cloud Storage access.

Both the upload API and article thumbnail pipeline previously built public
URLs and credentials inline in separate places. This module is the single
place that:

  * builds the bucket client from ``GCS_CREDENTIALS_BASE64`` (or ADC)
  * uploads blobs
  * returns either the legacy public URL (bucket grants public read) or a
    short-lived V4 signed URL when ``GCS_PRIVATE_BUCKET`` is enabled.

Signed URLs let us run a private bucket without exposing objects to anonymous
GETs — clients fetch media through expiring signed links instead.
"""
import base64
import io
import json
import logging
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status

from app.config import settings

logger = logging.getLogger(__name__)


def _get_credentials():
    """Return (credentials, project_id) or (None, None) for ADC."""
    if not settings.GCS_CREDENTIALS_BASE64:
        return None, None
    b64_str = settings.GCS_CREDENTIALS_BASE64.strip()
    decoded_json = base64.b64decode(b64_str + "===").decode("utf-8")
    credentials_info = json.loads(decoded_json)
    from google.oauth2 import service_account
    credentials = service_account.Credentials.from_service_account_info(credentials_info)
    return credentials, credentials_info.get("project_id")


def get_bucket():
    """Shared GCS bucket accessor. Raises HTTPException when unconfigured."""
    if not settings.GCS_BUCKET_NAME:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Storage is not configured (GCS_BUCKET_NAME is unset).",
        )
    from google.cloud import storage
    credentials, project = _get_credentials()
    if credentials is not None:
        client = storage.Client(credentials=credentials, project=project)
    else:
        client = storage.Client()
    return client.bucket(settings.GCS_BUCKET_NAME)


def blob_url(blob_name: str) -> str:
    """Return a client-fetchable URL for a stored blob.

    Private buckets get a signed URL; public buckets keep the plain storage URL.
    """
    if not settings.GCS_PRIVATE_BUCKET:
        return f"https://storage.googleapis.com/{settings.GCS_BUCKET_NAME}/{blob_name}"
    try:
        bucket = get_bucket()
        blob = bucket.blob(blob_name)
        url = blob.generate_signed_url(
            version="v4",
            expiration=timedelta(seconds=settings.GCS_SIGNED_URL_TTL_SECONDS),
            method="GET",
        )
        return url
    except Exception as e:
        logger.error(f"Failed to generate signed URL for {blob_name}: {e}")
        # Fall back to the public URL path; if the bucket is truly private this
        # will 403 but is better than failing the upload response entirely.
        return f"https://storage.googleapis.com/{settings.GCS_BUCKET_NAME}/{blob_name}"


def upload_image_bytes(contents: bytes, content_type: str = "image/webp") -> str:
    """Upload raw bytes to GCS and return a client URL.

    The caller is responsible for producing the bytes (image compression etc.).
    """
    try:
        bucket = get_bucket()
        blob = bucket.blob(_new_object_name(content_type))
        blob.upload_from_string(contents, content_type=content_type)
        return blob_url(blob.name)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload to storage: {e}",
        )


def upload_stream(file_obj, content_type: str, extension: str) -> str:
    """Stream a spooled file to GCS and return a client URL."""
    name = f"{_new_object_name(content_type).rsplit('.', 1)[0]}.{extension}"
    try:
        bucket = get_bucket()
        blob = bucket.blob(name)
        blob.upload_from_file(file_obj, content_type=content_type)
        return blob_url(blob.name)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload to storage: {e}",
        )


def _new_object_name(content_type: str) -> str:
    import uuid
    ext = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}.get(content_type, "bin")
    return f"{uuid.uuid4().hex}.{ext}"
