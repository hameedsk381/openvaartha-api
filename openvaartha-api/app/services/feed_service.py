from app.models.article import Article
from app.models.category import Category
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from xml.etree.ElementTree import Element, SubElement, tostring

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.config import settings
from app.services.meta_service import SITE_NAME


def _rfc2822(dt: datetime) -> str:
    """Format a datetime as RFC 2822 for RSS pubDate."""
    return dt.strftime("%a, %d %b %Y %H:%M:%S %z") if dt.tzinfo else dt.strftime("%a, %d %b %Y %H:%M:%S") + " +0000"


def _w3cdtf(dt: datetime) -> str:
    """Format a datetime as W3C DTMF for sitemap lastmod."""
    if dt.tzinfo:
        return dt.isoformat()
    return dt.isoformat() + "Z"


def _slugify(name: str) -> str:
    return "".join(c.lower() if c.isalnum() or c in "-_" else "-" for c in name).strip("-")


async def build_sitemap(db: AsyncIOMotorDatabase) -> str:
    """Generate an XML sitemap listing all published articles and static pages."""
    base = settings.SITE_URL.rstrip("/")

    urlset = Element("urlset")
    urlset.set("xmlns", "http://www.sitemaps.org/schemas/sitemap/0.9")

    static_pages: list[tuple[str, str, str]] = [
        ("/", "daily", "1.0"),
        ("/trending", "daily", "0.9"),
        ("/explainers", "weekly", "0.8"),
        ("/bytes", "hourly", "0.7"),
        ("/about", "monthly", "0.5"),
        ("/contact", "monthly", "0.5"),
        ("/editorial", "yearly", "0.3"),
        ("/corrections", "yearly", "0.3"),
        ("/privacy", "yearly", "0.3"),
        ("/terms", "yearly", "0.3"),
    ]

    for path, freq, prio in static_pages:
        url = SubElement(urlset, "url")
        SubElement(url, "loc").text = f"{base}{path}"
        SubElement(url, "changefreq").text = freq
        SubElement(url, "priority").text = prio

    categories = await Category.get_motor_collection().find({}).to_list(length=None)
    for cat in categories:
        slug = _slugify(cat.get("name", ""))
        if not slug:
            continue
        url = SubElement(urlset, "url")
        SubElement(url, "loc").text = f"{base}/category/{slug}"
        SubElement(url, "changefreq").text = "daily"
        SubElement(url, "priority").text = "0.8"

    articles = await Article.get_motor_collection().find(
        {"status": "published"},
        {"slug": 1, "last_updated": 1, "updated_at": 1, "published_at": 1},
    ).sort("published_at", -1).to_list(length=None)

    for article in articles:
        loc = f"{base}/article/{article['slug']}"
        lastmod = article.get("last_updated") or article.get("updated_at") or article.get("published_at")
        url = SubElement(urlset, "url")
        SubElement(url, "loc").text = loc
        if lastmod:
            SubElement(url, "lastmod").text = _w3cdtf(lastmod)
        SubElement(url, "changefreq").text = "weekly"
        SubElement(url, "priority").text = "0.6"

    return '<?xml version="1.0" encoding="UTF-8"?>\n' + tostring(urlset, encoding="unicode")


_NEWS_SITEMAP_WINDOW_HOURS = 48
"""Google News sitemaps should only contain articles from the last 48 hours."""


async def build_news_sitemap(db: AsyncIOMotorDatabase) -> str:
    """Generate a Google News sitemap of articles published in the last 48 hours.

    This supplements (not replaces) the general sitemap: Google News requires
    the sitemap-news namespace and a 48-hour freshness window, which the regular
    sitemap does not model. URL count is inherently capped by the window.
    """
    base = settings.SITE_URL.rstrip("/")
    since = datetime.now(timezone.utc) - timedelta(hours=_NEWS_SITEMAP_WINDOW_HOURS)

    articles = await Article.get_motor_collection().find(
        {"status": "published", "published_at": {"$gte": since}},
        {"slug": 1, "title": 1, "published_at": 1},
    ).sort("published_at", -1).to_list(length=None)

    urlset = Element("urlset")
    urlset.set("xmlns", "http://www.sitemaps.org/schemas/sitemap/0.9")
    urlset.set("xmlns:news", "http://www.google.com/schemas/sitemap-news/0.9")

    for article in articles:
        pub_date = article.get("published_at")
        if not pub_date:
            continue
        url = SubElement(urlset, "url")
        SubElement(url, "loc").text = f"{base}/article/{article['slug']}"
        news = SubElement(url, "news:news")
        publication = SubElement(news, "news:publication")
        SubElement(publication, "news:name").text = SITE_NAME
        SubElement(publication, "news:language").text = "en"
        SubElement(news, "news:publication_date").text = _w3cdtf(pub_date)
        SubElement(news, "news:title").text = article.get("title", "")

    return '<?xml version="1.0" encoding="UTF-8"?>\n' + tostring(urlset, encoding="unicode")


async def build_rss(
    db: AsyncIOMotorDatabase,
    *,
    category_id: Optional[str] = None,
    max_items: int = 50,
) -> str:
    """Generate an RSS 2.0 feed of recent published articles, optionally filtered by category."""
    base = settings.SITE_URL.rstrip("/")

    query: dict = {"status": "published"}
    if category_id:
        query["category_id"] = category_id

    articles = await Article.get_motor_collection().find(query).sort("published_at", -1).limit(max_items).to_list(length=None)

    channel_title = settings.APP_NAME
    channel_desc = f"{settings.APP_NAME} — News Without Noise"
    channel_link = base

    if category_id:
        cat = await Category.get_motor_collection().find_one({"_id": category_id})
        if cat:
            channel_title = f"{settings.APP_NAME} — {cat['name']}"
            channel_desc = f"{channel_desc} — {cat['name']}"

    rss = Element("rss")
    rss.set("version", "2.0")
    rss.set("xmlns:atom", "http://www.w3.org/2005/Atom")

    channel = SubElement(rss, "channel")
    SubElement(channel, "title").text = channel_title
    SubElement(channel, "link").text = channel_link
    SubElement(channel, "description").text = channel_desc
    SubElement(channel, "language").text = "en"
    SubElement(channel, "lastBuildDate").text = _rfc2822(datetime.now(timezone.utc))

    atom_link = SubElement(channel, "atom:link")
    atom_link.set("href", f"{base}/feed.xml")
    atom_link.set("rel", "self")
    atom_link.set("type", "application/rss+xml")

    for article in articles:
        pub_date = article.get("published_at")
        item = SubElement(channel, "item")
        SubElement(item, "title").text = article.get("title", "")
        SubElement(item, "link").text = f"{base}/article/{article['slug']}"
        SubElement(item, "description").text = article.get("summary", "")
        SubElement(item, "guid").text = f"{base}/article/{article['slug']}"
        SubElement(item, "guid").set("isPermaLink", "true")
        if pub_date:
            SubElement(item, "pubDate").text = _rfc2822(pub_date)

    return '<?xml version="1.0" encoding="UTF-8"?>\n' + tostring(rss, encoding="unicode")
