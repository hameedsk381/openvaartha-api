from fastapi import APIRouter, File, UploadFile, Depends, HTTPException, status
from app.core.dependencies import get_current_user
from app.models.user import User as UserModel
from app.config import settings
from PIL import Image
import io
import uuid
import base64
import json

router = APIRouter()

# Backend-enforced ceiling for direct video uploads (no recompression happens,
# unlike images, so this bounds storage/bandwidth directly). Keep comfortably
# under nginx's `client_max_body_size` for /api/v1/upload/video so a
# too-large file gets this JSON error instead of nginx's plain-text 413 page.
_MAX_VIDEO_BYTES = 200 * 1024 * 1024  # 200MB
_VIDEO_EXTENSIONS = {
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
}


def _gcs_bucket():
    """Shared GCS client/bucket setup for both the image and video upload
    endpoints. Raises HTTPException if storage isn't configured."""
    if not settings.GCS_BUCKET_NAME:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Image storage is not configured (GCS_BUCKET_NAME is unset)."
        )

    from google.cloud import storage
    if settings.GCS_CREDENTIALS_BASE64:
        from google.oauth2 import service_account

        # Safely handle missing base64 padding and whitespace
        b64_str = settings.GCS_CREDENTIALS_BASE64.strip()
        # Adding "===" ensures Python's b64decode never fails due to missing padding
        decoded_json = base64.b64decode(b64_str + "===").decode('utf-8')

        credentials_info = json.loads(decoded_json)
        credentials = service_account.Credentials.from_service_account_info(credentials_info)
        client = storage.Client(credentials=credentials, project=credentials_info.get("project_id"))
    else:
        client = storage.Client()

    return client.bucket(settings.GCS_BUCKET_NAME)


@router.post("/")
async def upload_image(
    file: UploadFile = File(...),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Upload an image file directly to Google Cloud Storage.
    Returns the public GCS URL.
    """
    if not settings.GCS_BUCKET_NAME:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Image storage is not configured (GCS_BUCKET_NAME is unset)."
        )

    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only image files are allowed."
        )

    try:
        contents = await file.read()
        img = Image.open(io.BytesIO(contents))

        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")

        out_io = io.BytesIO()
        img.save(out_io, format="WEBP", quality=75)
        compressed_bytes = out_io.getvalue()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid image data: {e}"
        )

    filename = f"{uuid.uuid4().hex}.webp"

    try:
        bucket = _gcs_bucket()
        blob = bucket.blob(filename)
        blob.upload_from_string(compressed_bytes, content_type="image/webp")

        url = f"https://storage.googleapis.com/{settings.GCS_BUCKET_NAME}/{filename}"
        return {"url": url}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload image to storage: {e}"
        )


@router.post("/video")
async def upload_video(
    file: UploadFile = File(...),
    current_user: UserModel = Depends(get_current_user),
):
    """
    Upload a video file directly to Google Cloud Storage, unmodified (no
    recompression — Pillow can't process video, and transcoding is out of
    scope). Returns the public GCS URL.
    """
    if not settings.GCS_BUCKET_NAME:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Video storage is not configured (GCS_BUCKET_NAME is unset)."
        )

    extension = _VIDEO_EXTENSIONS.get(file.content_type)
    if not extension:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only MP4, WebM, or MOV video files are allowed.",
        )

    # UploadFile buffers to a spooled temp file as it's read, so seeking to the
    # end here to check size (rather than loading the whole thing into memory
    # via .read()) works whether the file spilled to disk or stayed in memory.
    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)
    if size > _MAX_VIDEO_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Video is too large ({size / 1024 / 1024:.1f}MB). Max is "
                   f"{_MAX_VIDEO_BYTES / 1024 / 1024:.0f}MB.",
        )

    filename = f"{uuid.uuid4().hex}.{extension}"

    try:
        bucket = _gcs_bucket()
        blob = bucket.blob(filename)
        # Streams from the spooled temp file rather than buffering the whole
        # video in memory (unlike the image path, where recompression already
        # requires a full in-memory copy for Pillow to work on).
        blob.upload_from_file(file.file, content_type=file.content_type)

        url = f"https://storage.googleapis.com/{settings.GCS_BUCKET_NAME}/{filename}"
        return {"url": url}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload video to storage: {e}",
        )
