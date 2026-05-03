import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.config import settings
from app.api.v1 import articles, categories, users, search, newsletter

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="OpenVaartha News Aggregation API",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
