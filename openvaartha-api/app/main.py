import os

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.v1 import admin, articles, categories, comments, feeds, newsletter, pages, search, users, authors
from app.config import settings
from app.core.dependencies import get_current_active_admin
from app.core.rate_limit import limiter
from app.core.security_headers import SecurityHeadersMiddleware
from app.database import db
from app.models.user import User as UserModel
from app.services.article_service import ensure_article_indexes
from app.services.category_service import ensure_category_indexes
from app.services.seed_service import ensure_admin_user

# Block known-unsafe production configs at import time.
settings.assert_safe_for_production()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="OpenVaartha News Aggregation API",
    # Don't expose the full API surface (routes, schemas) publicly in production.
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
    openapi_url=None if settings.is_production else "/openapi.json",
)

# Wire the SlowAPI limiter so per-route @limiter.limit decorators take effect.
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — origins are an explicit allowlist; ``assert_safe_for_production``
# already rejected wildcards in production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
    expose_headers=["Content-Disposition"],
)

# Security headers — CSP, X-Frame-Options, HSTS, etc.
app.add_middleware(SecurityHeadersMiddleware)
from app.api.v1 import articles, categories, users, feeds, search, newsletter, comments, pages, admin, upload, authors

# Compress large text responses (JS/CSS bundles, HTML, JSON). Serves the SPA's
# ~1.8MB JS bundle gzipped to mobile clients, which is the primary access pattern.
app.add_middleware(GZipMiddleware, minimum_size=1024)

# Include routers
app.include_router(articles.router, prefix="/api/v1/articles", tags=["Articles"])
app.include_router(categories.router, prefix="/api/v1/categories", tags=["Categories"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(search.router, prefix="/api/v1/search", tags=["Search"])
app.include_router(newsletter.router, prefix="/api/v1/newsletter", tags=["Newsletter"])
app.include_router(comments.router, prefix="/api/v1/comments", tags=["Comments"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin"])
app.include_router(upload.router, prefix="/api/v1/upload", tags=["Upload"])
app.include_router(authors.router, prefix="/api/v1/authors", tags=["Authors"])

# Root-level routes (sitemap, RSS feeds, server-rendered article HTML)
app.include_router(feeds.router)
app.include_router(pages.router)


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "ai_available": bool(settings.GROQ_API_KEY),
        "ai_model": settings.GROQ_MODEL,
    }


@app.get("/health/env")
def env_check(current_user: UserModel = Depends(get_current_active_admin)):
    # Admin-only: discloses exactly which secrets are configured (recon aid).
    # Helper to check if string contains actual config and not default fallback placeholders
    return {
        "MONGODB_URL_set": bool(settings.MONGODB_URL),
        "REDIS_URL_set": bool(settings.REDIS_URL),
        "GROQ_API_KEY_set": bool(settings.GROQ_API_KEY),
        "JWT_SECRET_KEY_configured": bool(settings.JWT_SECRET_KEY and settings.JWT_SECRET_KEY != "your-jwt-secret-key-change-in-production"),
        "GOOGLE_CLIENT_ID_set": bool(settings.GOOGLE_CLIENT_ID),
        "GCS_BUCKET_NAME_set": bool(settings.GCS_BUCKET_NAME),
        "SMTP_HOST_set": bool(settings.SMTP_HOST),
        "SMTP_USER_set": bool(settings.SMTP_USER),
        "SMTP_PASSWORD_set": bool(settings.SMTP_PASSWORD),
        "NEWS_API_KEY_set": bool(settings.NEWS_API_KEY),
        "MEDIASTACK_API_KEY_set": bool(settings.MEDIASTACK_API_KEY),
        "INSTAGRAM_ACCESS_TOKEN_set": bool(settings.INSTAGRAM_ACCESS_TOKEN),
        "INSTAGRAM_USER_ID_set": bool(settings.INSTAGRAM_USER_ID),
    }


@app.get("/health/test-email")
async def test_email_endpoint(to: str, current_user: UserModel = Depends(get_current_active_admin)):
    # Admin-only: sends mail through the configured SMTP relay. Left open this
    # would be an unauthenticated open relay (spam / domain-reputation abuse).
    from app.services.email_service import send_email
    success = await send_email(
        to=to,
        subject="OpenVaartha SMTP Test Check",
        html_body="<h1>SMTP is Connected!</h1><p>Your production SMTP server is working correctly.</p>"
    )
    if success:
        return {"status": "success", "message": f"Test email sent to {to}"}
    return {"status": "error", "message": "Failed to send email. Check container logs for SMTP stack trace."}


@app.get("/health/test-gcs")
async def test_gcs_endpoint(current_user: UserModel = Depends(get_current_active_admin)):
    # Admin-only: writes (and deletes) a blob in the storage bucket on demand.
    if not settings.GCS_BUCKET_NAME:
        return {"status": "error", "message": "GCS_BUCKET_NAME is not configured."}
    
    try:
        from google.cloud import storage
        client = storage.Client()
        bucket = client.bucket(settings.GCS_BUCKET_NAME)
        blob = bucket.blob("test-gcs-connection.txt")
        blob.upload_from_string("GCS is connected successfully!", content_type="text/plain")
        try:
            blob.delete()
        except Exception:
            pass
        return {"status": "success", "message": f"Successfully wrote and deleted test blob in bucket: {settings.GCS_BUCKET_NAME}"}
    except Exception as e:
        return {"status": "error", "message": f"GCS connection failed: {str(e)}"}


@app.get("/health/test-google")
async def test_google_endpoint(current_user: UserModel = Depends(get_current_active_admin)):
    # Admin-only: makes an outbound call to Google's OAuth servers.
    if not settings.GOOGLE_CLIENT_ID:
        return {"status": "error", "message": "GOOGLE_CLIENT_ID is not configured."}
    
    import httpx
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get("https://oauth2.googleapis.com/tokeninfo", timeout=5.0)
            return {
                "status": "success",
                "message": "Successfully contacted Google OAuth servers.",
                "google_response_status": resp.status_code,
                "client_id_configured": True
            }
    except Exception as e:
        return {"status": "error", "message": f"Failed to contact Google OAuth servers: {str(e)}"}


@app.on_event("startup")
async def startup_checks():
    import os
    import base64
    
    # Easily ingest Google Service Account credentials from a base64 string
    b64_creds = os.getenv("GOOGLE_CREDENTIALS_B64")
    if b64_creds:
        try:
            creds_json = base64.b64decode(b64_creds).decode("utf-8")
            creds_path = "/tmp/google-credentials.json"
            with open(creds_path, "w") as f:
                f.write(creds_json)
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = creds_path
            print("Successfully decoded and set GOOGLE_APPLICATION_CREDENTIALS from GOOGLE_CREDENTIALS_B64")
        except Exception as e:
            print(f"Failed to decode GOOGLE_CREDENTIALS_B64: {e}")

    await ensure_article_indexes(db)
    await ensure_category_indexes(db)
    await ensure_admin_user(db)
    if not settings.GROQ_API_KEY:
        print("WARNING: GROQ_API_KEY is not set. AI article generation will be unavailable.")
    else:
        print(f"INFO: Groq AI enabled (model: {settings.GROQ_MODEL})")


@app.get("/")
def read_root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "description": "OpenVaartha News Aggregation API is running. Health check at /health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("API_PORT", "8000")))
