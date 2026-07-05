import os
import re

from fastapi import FastAPI
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.v1 import admin, articles, categories, comments, feeds, newsletter, search, users
from app.config import settings
from app.core.rate_limit import limiter
from app.core.security_headers import SecurityHeadersMiddleware
from app.database import db
from app.services.article_service import ensure_article_indexes
from app.services.category_service import ensure_category_indexes
from app.services.meta_service import build_article_head, build_default_head, inject_head
from app.services.seed_service import ensure_admin_user

# Block known-unsafe production configs at import time.
settings.assert_safe_for_production()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="OpenVaartha News Aggregation API",
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
        "ai_available": bool(settings.GEMINI_API_KEY),
        "ai_model": settings.GEMINI_MODEL,
    }


@app.on_event("startup")
async def startup_checks():
    await ensure_article_indexes(db)
    await ensure_category_indexes(db)
    await ensure_admin_user(db)
    if not settings.GEMINI_API_KEY:
        print("WARNING: GEMINI_API_KEY is not set. AI article generation will be unavailable.")
    else:
        print(f"INFO: Gemini AI enabled (model: {settings.GEMINI_MODEL})")


# Serve React SPA — mount after API routes so /api/* is never shadowed
_dist = os.path.join(os.path.dirname(__file__), "..", "static")
if os.path.isdir(_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(_dist, "assets")), name="assets")

    # PWA files — serve before catch-all so they aren't swallowed by index.html.
    # robots.txt is intentionally absent: it is served dynamically by feeds.router
    # so it can advertise the sitemap URL derived from SITE_URL.
    _pwa_files = [
        "sw.js", "manifest.webmanifest", "registerSW.js", "offline.html",
        "icon.svg", "logo.jpg", "pwa-192x192.png", "pwa-512x512.png",
        "news-fallback.svg", "placeholder.svg",
    ]
    for _name in _pwa_files:
        _path = os.path.join(_dist, _name)
        if os.path.isfile(_path):

            def _serve_static(_p=_path):
                return FileResponse(_p)

            app.get(f"/{_name}", include_in_schema=False)(_serve_static)

    _index_path = os.path.join(_dist, "index.html")
    _article_path_re = re.compile(r"^article/([^/]+)/?$")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        # Inject route-specific meta (title/canonical/OG/JSON-LD) into the marked
        # <!--app-head--> block so no-JS crawlers (WhatsApp, Facebook, Twitter,
        # Googlebot first pass) see real article metadata instead of SPA defaults.
        with open(_index_path, encoding="utf-8") as f:
            index_html = f.read()

        head = None
        match = _article_path_re.match(full_path)
        if match:
            try:
                article = await db["articles"].find_one(
                    {"slug": match.group(1), "status": "published"}
                )
                if article:
                    category = await db["categories"].find_one(
                        {"_id": article.get("category_id")}
                    )
                    head = build_article_head(
                        article, category_name=(category or {}).get("name", "")
                    )
            except Exception:
                head = None  # never let meta enrichment take the page down

        if head is None:
            head = build_default_head(full_path)
        return HTMLResponse(inject_head(index_html, head))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("API_PORT", "8000")))
