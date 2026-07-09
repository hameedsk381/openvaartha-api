from fastapi import APIRouter, File, UploadFile, Depends, HTTPException, status
from app.core.dependencies import get_current_user
from app.models.user import UserModel
from app.config import settings
from PIL import Image
import io
import uuid
import base64
import json

router = APIRouter()

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
        from google.cloud import storage
        if settings.GCS_CREDENTIALS_BASE64:
            from google.oauth2 import service_account
            decoded_json = base64.b64decode(settings.GCS_CREDENTIALS_BASE64).decode('utf-8')
            credentials_info = json.loads(decoded_json)
            credentials = service_account.Credentials.from_service_account_info(credentials_info)
            client = storage.Client(credentials=credentials, project=credentials_info.get("project_id"))
        else:
            client = storage.Client()
            
        bucket = client.bucket(settings.GCS_BUCKET_NAME)
        blob = bucket.blob(filename)
        blob.upload_from_string(compressed_bytes, content_type="image/webp")
        
        url = f"https://storage.googleapis.com/{settings.GCS_BUCKET_NAME}/{filename}"
        return {"url": url}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload image to storage: {e}"
        )
