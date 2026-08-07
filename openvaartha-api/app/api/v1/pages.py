"""Server-rendered HTML for crawlable, share-sensitive routes.

In the split deployment (nginx `web` container + FastAPI `api` container), nginx
proxies `/article/*`, `/category/*`, the homepage, and fixed content routes here
so the API injects route-specific `<head>` meta (distinct title/description/
canonical/JSON-LD) and, where useful, a crawlable `<body>` shell into the SPA's
index.html. See openvaartha-web/nginx.conf for the proxy mapping.
"""

import os
from pathlib import Path

from fastapi import APIRouter, Depends
from fastapi.responses import HTMLResponse
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.config import settings
from app.database import get_db
from app.services import article_service, category_service
from app.services.meta_service import (
    SITE_TITLE,
    build_category_head,
    build_default_head,
    build_list_body_shell,
    has_static_route,
    inject_body,
    inject_head,
    render_article_html,
)

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


@router.get("/", response_class=HTMLResponse)
async def home_page(db: AsyncIOMotorDatabase = Depends(get_db)):
    template = _load_template()
    head = build_default_head("")
    articles = await article_service.get_articles(db, limit=20, status="published")
    body = build_list_body_shell(articles, heading=SITE_TITLE, subheading="Latest")
    return HTMLResponse(content=inject_body(inject_head(template, head), body))


@router.get("/category/{name}", response_class=HTMLResponse)
async def category_page(name: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    template = _load_template()
    # The route slug is the category's slugified name (matches feed_service._slugify).
    category = None
    for c in await category_service.get_categories(db):
        if (c.get("name") or "").strip().lower() == name.replace("-", " ").strip().lower():
            category = c
            break

    if not category:
        head = build_default_head(f"category/{name}")
        return HTMLResponse(content=inject_head(template, head), status_code=404)

    articles = await article_service.get_articles(db, limit=20, category_id=str(category.get("_id")), status="published")
    head = build_category_head(category, canonical_path=f"category/{name}")
    body = build_list_body_shell(
        articles,
        heading=f"{category.get('name', '').title()} News",
        subheading=f"Latest from {category.get('name', '')}".strip(),
    )
    return HTMLResponse(content=inject_body(inject_head(template, head), body))


@router.get("/{route}", response_class=HTMLResponse)
async def static_route_page(route: str):
    """SSR head for the fixed SPA routes (trending, explainers, bytes, about,
    contact, policies…). Only routes with dedicated meta are served here;
    everything else falls through to the static SPA."""
    template = _load_template()
    head = build_default_head(route)
    if not has_static_route(route):
        # Not a route we SSR; the SPA's own client router owns it. Serving a head
        # here is harmless, but status reflects the unknown path.
        return HTMLResponse(content=inject_head(template, head), status_code=404)
    return HTMLResponse(content=inject_head(template, head))
