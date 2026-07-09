"""Server-rendered HTML for crawlable, share-sensitive routes.

In the split deployment (nginx `web` container + FastAPI `api` container), nginx
proxies `/article/*` here so the API can inject per-article `<head>` meta and a
crawlable `<body>` shell into the SPA's index.html. Non-article routes are still
served as static index.html by nginx. See openvaartha-web/nginx.conf.
"""

import os
from pathlib import Path

from fastapi import APIRouter, Depends
from fastapi.responses import HTMLResponse
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.config import settings
from app.database import get_db
from app.services import article_service
from app.services.meta_service import build_default_head, inject_head, render_article_html

router = APIRouter(include_in_schema=False)

# Used when the built index.html isn't available (local dev / tests). Keeps the
# head/body markers so injection still works and the route returns valid HTML.
_FALLBACK_TEMPLATE = (
    '<!doctype html><html lang="en"><head>\n'
    "  <!--app-head-->\n  <!--/app-head-->\n"
    '</head><body><div id="root"><!--app-body--></div>'
    '<script type="module" src="/assets/index.js"></script></body></html>'
)

# Cache the template in memory, refreshing when the file's mtime changes so a new
# deploy's index.html (same shared volume, new content) is picked up.
_template_cache: dict = {"mtime": None, "html": None}


def _load_template() -> str:
    path = settings.WEB_INDEX_PATH
    try:
        mtime = os.path.getmtime(path)
    except OSError:
        return _FALLBACK_TEMPLATE
    if _template_cache["mtime"] != mtime:
        try:
            _template_cache["html"] = Path(path).read_text(encoding="utf-8")
            _template_cache["mtime"] = mtime
        except OSError:
            return _FALLBACK_TEMPLATE
    return _template_cache["html"]


@router.get("/article/{slug}", response_class=HTMLResponse)
async def article_page(slug: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    template = _load_template()

    # count_view=False: the SPA's own /api/v1/articles/{slug} fetch on this same
    # page load owns the view counter — don't double-count the shell render.
    article = await article_service.get_article_by_slug(
        db, slug=slug, include_unpublished=False, count_view=False
    )

    if not article:
        # Unknown/unpublished slug → real 404 (no soft-404). The SPA still boots
        # and renders its own NotFound for humans.
        head = build_default_head(f"article/{slug}")
        return HTMLResponse(content=inject_head(template, head), status_code=404)

    category_name = article.get("category") or ""
    return HTMLResponse(content=render_article_html(template, article, category_name))
