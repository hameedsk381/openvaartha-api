import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.v1 import admin, articles, categories, comments, feeds, newsletter, search, users
from app.config import settings
from app.core.rate_limit import limiter
from app.core.security_headers import SecurityHeadersMiddleware
from app.database import db
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

# Root-level routes (sitemap, RSS feeds) — must register before SPA catch-all
app.include_router(feeds.router)


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "ai_available": bool(settings.GROQ_API_KEY),
        "ai_model": settings.GROQ_MODEL,
    }


@app.get("/health/env")
def env_check():
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


@app.on_event("startup")
async def startup_checks():
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
