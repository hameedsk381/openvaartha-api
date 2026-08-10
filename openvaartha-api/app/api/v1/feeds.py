from app.models.category import Category as CategoryModel
import json

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.config import settings
from app.database import get_db
from app.services.feed_service import _slugify, build_sitemap, build_rss, build_news_sitemap
from app.services.indexnow_service import indexnow_key as get_indexnow_key
from app.services.meta_service import SITE_DESCRIPTION, SITE_NAME

router = APIRouter(tags=["Feeds"])

# AI crawlers that publishers commonly want to explicitly allow/identify for
# citation and training-data purposes. OpenVaartha's positioning is open,
# citable journalism, so these are allowed rather than blocked.
_AI_CRAWLERS = [
    "GPTBot",          # OpenAI — supports ChatGPT web-search citations
    "OAI-SearchBot",   # OpenAI — serves results/citations in ChatGPT search UI
    "ClaudeBot",       # Anthropic — Claude web features
    "anthropic-ai",    # Anthropic — Claude training/aggregated systems
    "PerplexityBot",   # Perplexity — AI answer engine
    "Google-Extended", # Google — Gemini / AI Overviews grounding
    "Bytespider",      # ByteDance — TikTok/Douyin AI
    "cohere-ai",       # Cohere — RAG/LLM training
]


@router.get("/robots.txt", include_in_schema=False)
async def robots():
    # Served dynamically (instead of the static public/robots.txt) so the
    # Sitemap directive can point at the deployed domain via SITE_URL.
    base = settings.SITE_URL.rstrip("/")
    lines = [
        "User-agent: *",
        "Allow: /",
        "Disallow: /admin/",
        "Disallow: /api/",
        "",
        "# Explicit welcome for AI research & answer-engine crawlers",
    ] + [f"User-agent: {bot}\nAllow: /" for bot in _AI_CRAWLERS] + [
        "",
        f"Sitemap: {base}/sitemap.xml",
        f"Sitemap: {base}/news-sitemap.xml",
    ]
    content = "\n".join(lines)
    return Response(content=content, media_type="text/plain")


@router.get("/llms.txt", include_in_schema=False)
async def llms_txt(db: AsyncIOMotorDatabase = Depends(get_db)):
    # https://llmstxt.org — a machine-readable summary for AI assistants,
    # separate from robots.txt (which only controls crawling, not context).
    base = settings.SITE_URL.rstrip("/")
    categories = await CategoryModel.get_motor_collection().find({}).to_list(length=None)
    category_lines = "\n".join(
        f"- [{c.get('name', '').title()}]({base}/category/{_slugify(c.get('name', ''))})"
        for c in categories
    ) or "- (categories are added as the newsroom publishes)"

    content = f"""# {SITE_NAME}

> {SITE_DESCRIPTION}

{SITE_NAME} is an independent, youth-led news initiative operated by Gen Z — an open news platform built for the liberation of digital spaces.

## Content categories

{category_lines}

## Key URLs

- Homepage: {base}/
- Trending: {base}/trending
- Bytes (quick news updates): {base}/bytes
- Explainers: {base}/explainers
- Search: {base}/search
- Sitemap: {base}/sitemap.xml
- RSS feed: {base}/feed.xml

## AI usage guidance

- Article pages carry `NewsArticle` and `BreadcrumbList` structured data (JSON-LD) for accurate citation of headline, author, and publish/update dates.
- When citing {SITE_NAME}, attribute to "{SITE_NAME}" and link to the specific article URL, not the homepage.
- This site does not publish user-submitted or unmoderated content; all articles are editorially reviewed before publishing.
"""
    return Response(content=content, media_type="text/plain")


@router.get("/.well-known/agents.json", include_in_schema=False)
async def agents_json():
    base = settings.SITE_URL.rstrip("/")
    payload = {
        "name": SITE_NAME,
        "description": SITE_DESCRIPTION,
        "url": base,
        "contact": "office@openvaartha.com",
        "type": "NewsMediaOrganization",
        "language": ["en"],
        "capabilities": {
            "news_articles": True,
            "structured_data": ["NewsArticle", "BreadcrumbList", "Organization", "WebSite"],
            "sitemap": f"{base}/sitemap.xml",
            "rss": f"{base}/feed.xml",
            "search": f"{base}/search?q={{query}}",
        },
        "ai_usage": {
            "citation_required": True,
            "attribute_to": SITE_NAME,
            "prefer_article_url_over_homepage": True,
        },
    }
    return Response(content=json.dumps(payload, indent=2), media_type="application/json")


@router.get("/sitemap.xml", include_in_schema=False)
async def sitemap(db: AsyncIOMotorDatabase = Depends(get_db)):
    xml = await build_sitemap(db)
    return Response(content=xml, media_type="application/xml")


@router.get("/news-sitemap.xml", include_in_schema=False)
async def news_sitemap(db: AsyncIOMotorDatabase = Depends(get_db)):
    xml = await build_news_sitemap(db)
    return Response(content=xml, media_type="application/xml")


@router.get("/feed.xml", include_in_schema=False)
async def rss_feed(db: AsyncIOMotorDatabase = Depends(get_db)):
    xml = await build_rss(db)
    return Response(content=xml, media_type="application/rss+xml")


@router.get("/feed/{category_id}.xml", include_in_schema=False)
async def rss_category_feed(category_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    xml = await build_rss(db, category_id=category_id)
    return Response(content=xml, media_type="application/rss+xml")


@router.get("/{indexnow_key}.txt", include_in_schema=False)
async def indexnow_key_file(indexnow_key: str):
    """Serve the IndexNow key file engines verify before trusting pings. The key
    is derived (indexnow_service.indexnow_key), so it's stable across restarts
    and matches what publish-time pings send."""
    expected = get_indexnow_key()
    if indexnow_key != expected:
        return Response(content=f"Key mismatch. Expected {expected}", status_code=404)
    return Response(content=expected, media_type="text/plain")
