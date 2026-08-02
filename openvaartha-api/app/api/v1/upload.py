from fastapi import APIRouter, File, UploadFile, Depends, HTTPException, status
from app.core.dependencies import get_current_user
from app.models.user import User as UserModel
from app.config import settings
from PIL import Image
import io
import uuid
import base64
import json
import asyncio
import shutil
import subprocess

router = APIRouter()

# Backend-enforced limits for direct video uploads (no recompression happens,
# unlike images, so these bound storage/bandwidth directly). Bytes are short
# Reels-style clips: at most 3 minutes long, and size-capped so a multi-GB
# source file can't be parked in GCS. Keep the byte cap comfortably under
# nginx's `client_max_body_size` for /api/v1/upload/video so a too-large file
# gets this JSON error instead of nginx's plain-text 413 page.
_MAX_VIDEO_BYTES = 100 * 1024 * 1024  # 100MB
_MAX_VIDEO_SECONDS = 180  # 3 minutes
_VIDEO_EXTENSIONS = {
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
}

# Path to ffprobe (ships with ffmpeg, installed in the API Dockerfile). When
# ffprobe is unavailable (e.g. a bare local dev env), duration validation is
# skipped rather than failing every upload — size is still always enforced.
_FFPROBE = shutil.which("ffprobe")


def _probe_video_duration_seconds(data: bytes) -> float | None:
    """Probe container/format duration via ffprobe, or None if it can't be
    determined (missing binary, probe failure, unparseable output)."""
    if not _FFPROBE:
        return None
    try:
        proc = subprocess.run(
            [_FFPROBE, "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", "-i", "pipe:0"],
            input=data, capture_output=True, timeout=45,
        )
    except (subprocess.TimeoutExpired, OSError):
        return None
    if proc.returncode != 0:
        return None
    try:
        return float(proc.stdout.decode("utf-8", errors="ignore").strip())
    except ValueError:
        return None


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


def _upload_image_sync(contents: bytes) -> str:
    try:
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
        return f"https://storage.googleapis.com/{settings.GCS_BUCKET_NAME}/{filename}"
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload image to storage: {e}"
        )


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

    contents = await file.read()
    url = await asyncio.to_thread(_upload_image_sync, contents)
    return {"url": url}


def _upload_video_sync(spooled_file, content_type: str, extension: str) -> str:
    filename = f"{uuid.uuid4().hex}.{extension}"
    try:
        bucket = _gcs_bucket()
        blob = bucket.blob(filename)
        blob.upload_from_file(spooled_file, content_type=content_type)
        return f"https://storage.googleapis.com/{settings.GCS_BUCKET_NAME}/{filename}"
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload video to storage: {e}",
        )


@router.post("/video")
async def upload_video(
    file: UploadFile = File(...),
    current_user: UserModel = Depends(get_current_user),
):
    """
    Upload a video file directly to Google Cloud Storage, unmodified (no
    recompression — Pillow can't process video, and transcoding is out of
    scope). Videos are capped at 3 minutes and 100MB — Bytes are short
    Reels-style clips. Returns the public GCS URL.
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

    # Read the whole upload once so ffprobe can measure the real duration.
    # UploadFile buffers to a spooled temp file as it's read, but feeding a
    # probe needs a seekable stream or the raw bytes, so read into memory
    # here (size-capped below, so worst case is ~100MB) and reset the spooled
    # file before streaming it to GCS.
    data = await file.read()
    size = len(data)
    if size > _MAX_VIDEO_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Video is too large ({size / 1024 / 1024:.1f}MB). Max is "
                   f"{_MAX_VIDEO_BYTES / 1024 / 1024:.0f}MB.",
        )

    duration = _probe_video_duration_seconds(data)
    if duration is not None and duration > _MAX_VIDEO_SECONDS:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Video is too long ({duration:.1f}s). Max is "
                   f"{_MAX_VIDEO_SECONDS // 60} minutes.",
        )

    file.file.seek(0)
    url = await asyncio.to_thread(_upload_video_sync, file.file, file.content_type, extension)
    return {"url": url}
