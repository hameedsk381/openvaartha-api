import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.v1 import articles, categories, newsletter, search, users
from app.config import settings
from app.core.rate_limit import limiter
from app.database import db
from app.services.article_service import ensure_article_indexes
from app.services.category_service import ensure_category_indexes

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

# Include routers
app.include_router(articles.router, prefix="/api/v1/articles", tags=["Articles"])
app.include_router(categories.router, prefix="/api/v1/categories", tags=["Categories"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(search.router, prefix="/api/v1/search", tags=["Search"])
app.include_router(newsletter.router, prefix="/api/v1/newsletter", tags=["Newsletter"])


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.on_event("startup")
async def startup_indexes():
    await ensure_article_indexes(db)
    await ensure_category_indexes(db)


# Serve React SPA — mount after API routes so /api/* is never shadowed
_dist = os.path.join(os.path.dirname(__file__), "..", "static")
if os.path.isdir(_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(_dist, "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str):
        return FileResponse(os.path.join(_dist, "index.html"))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
