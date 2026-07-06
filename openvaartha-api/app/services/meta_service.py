import html
import json
import re
from datetime import datetime
from typing import Any, Dict, Optional

from app.config import settings

# Mirrors BRAND in openvaartha-web/src/lib/brand.ts — keep in sync.
SITE_NAME = "Open Vaartha"
SITE_TITLE = "Open Vaartha — An Open News Platform, Built by Gen Z"
# Kept under 160 chars, keywords first — long descriptions get truncated in
# search snippets and social previews.
SITE_DESCRIPTION = (
    "Open Vaartha is an independent, youth-led news initiative — open "
    "journalism built by Gen Z, for a freer internet."
)
TWITTER_HANDLE = "@openvaartha"
DEFAULT_IMAGE = "/logo.jpg"
PUBLISHER_LOGO = "/icon.svg"

# The block in index.html (between these markers) that gets replaced per-request.
_HEAD_BLOCK_RE = re.compile(r"<!--app-head-->.*?<!--/app-head-->", re.DOTALL)


def _base_url() -> str:
    return settings.SITE_URL.rstrip("/")


def _abs_url(path_or_url: str) -> str:
    if path_or_url.startswith(("http://", "https://")):
        return path_or_url
    return f"{_base_url()}/{path_or_url.lstrip('/')}"


def _iso(value: Any) -> Optional[str]:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, str) and value:
        return value
    return None


def _json_ld_script(data: Dict[str, Any]) -> str:
    # "</" inside a string could terminate the script tag early.
    payload = json.dumps(data).replace("</", "<\\/")
    return f'<script type="application/ld+json">{payload}</script>'


def build_head(
    *,
    title: str,
    description: str,
    canonical: str,
    image: str = DEFAULT_IMAGE,
    og_type: str = "website",
    extra: str = "",
) -> str:
    e = lambda s: html.escape(s, quote=True)  # noqa: E731
    image_url = _abs_url(image)
    lines = [
        "<!--app-head-->",
        f"<title>{e(title)}</title>",
        f'<meta name="description" content="{e(description)}">',
        f'<link rel="canonical" href="{e(canonical)}" />',
        f'<meta property="og:type" content="{e(og_type)}" />',
        f'<meta property="og:site_name" content="{e(SITE_NAME)}" />',
        f'<meta property="og:title" content="{e(title)}">',
        f'<meta property="og:description" content="{e(description)}">',
        f'<meta property="og:url" content="{e(canonical)}">',
        f'<meta property="og:image" content="{e(image_url)}">',
        '<meta name="twitter:card" content="summary_large_image" />',
        f'<meta name="twitter:site" content="{e(TWITTER_HANDLE)}" />',
        f'<meta name="twitter:title" content="{e(title)}">',
        f'<meta name="twitter:description" content="{e(description)}">',
        f'<meta name="twitter:image" content="{e(image_url)}">',
    ]
    if extra:
        lines.append(extra)
    lines.append("<!--/app-head-->")
    return "\n  ".join(lines)


# Distinct title/description for known static SPA routes so they don't all share
# the homepage title (duplicate-title/meta hurts indexing and snippet CTR).
# Keys are normalized paths (no leading/trailing slash). ``robots`` is the value
# of a <meta name="robots"> tag; None means index/follow (the default).
_STATIC_ROUTE_META: Dict[str, Dict[str, Optional[str]]] = {
    "trending": {
        "title": f"Trending News — {SITE_NAME}",
        "description": "The most-read stories right now — politics, tech, culture, and business, ranked by attention.",
        "robots": None,
    },
    "explainers": {
        "title": f"Explainers — {SITE_NAME}",
        "description": "In-depth explainers that break down the ideas and shifts shaping the internet you live in.",
        "robots": None,
    },
    "live": {
        "title": f"Live Updates — {SITE_NAME}",
        "description": "Live, rolling coverage of developing stories — verified, timestamped, no rumours.",
        "robots": None,
    },
    "about": {
        "title": f"About — {SITE_NAME}",
        "description": "Open Vaartha is an independent, youth-led news initiative operated by Gen Z, supported by FOSS Andhra Foundation.",
        "robots": None,
    },
    "contact": {
        "title": f"Contact — {SITE_NAME}",
        "description": "Reach the Open Vaartha team — story tips, corrections, feedback, and contributions.",
        "robots": None,
    },
    "search": {
        "title": f"Search — {SITE_NAME}",
        "description": SITE_DESCRIPTION,
        "robots": "noindex, follow",
    },
    # Auth and private routes: already Disallow'd in robots.txt; mark noindex too.
    "login": {"title": f"Sign in — {SITE_NAME}", "description": SITE_DESCRIPTION, "robots": "noindex, nofollow"},
    "register": {"title": f"Create account — {SITE_NAME}", "description": SITE_DESCRIPTION, "robots": "noindex, nofollow"},
    "forgot-password": {"title": f"Reset password — {SITE_NAME}", "description": SITE_DESCRIPTION, "robots": "noindex, nofollow"},
    "reset-password": {"title": f"Reset password — {SITE_NAME}", "description": SITE_DESCRIPTION, "robots": "noindex, nofollow"},
}


def _homepage_json_ld() -> str:
    base = _base_url()
    return "\n  ".join([
        _json_ld_script({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": SITE_NAME,
            "url": base,
            "logo": _abs_url(PUBLISHER_LOGO),
        }),
        _json_ld_script({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": SITE_NAME,
            "url": base,
            "potentialAction": {
                "@type": "SearchAction",
                "target": f"{base}/search?q={{search_term_string}}",
                "query-input": "required name=search_term_string",
            },
        }),
    ])


def build_default_head(path: str = "") -> str:
    normalized = path.strip("/")
    canonical = f"{_base_url()}/{normalized}".rstrip("/")

    # Private route trees (portal/*, admin/*) should never be indexed.
    first_segment = normalized.split("/", 1)[0]
    if first_segment in ("portal", "admin"):
        return build_head(
            title=f"{SITE_NAME}",
            description=SITE_DESCRIPTION,
            canonical=canonical,
            extra='<meta name="robots" content="noindex, nofollow">',
        )

    if normalized == "":
        return build_head(
            title=SITE_TITLE,
            description=SITE_DESCRIPTION,
            canonical=canonical,
            extra=_homepage_json_ld(),
        )

    meta = _STATIC_ROUTE_META.get(normalized)
    if meta is None:
        return build_head(title=SITE_TITLE, description=SITE_DESCRIPTION, canonical=canonical)

    extra = ""
    if meta.get("robots"):
        extra = f'<meta name="robots" content="{html.escape(meta["robots"], quote=True)}">'
    return build_head(
        title=meta["title"],
        description=meta["description"],
        canonical=canonical,
        extra=extra,
    )


def build_category_head(category: Dict[str, Any], canonical_path: str) -> str:
    """Per-category title/description so category pages don't share the homepage meta."""
    name = category.get("name", "").strip()
    display = name[:1].upper() + name[1:] if name else "News"
    canonical = f"{_base_url()}/{canonical_path.strip('/')}"
    return build_head(
        title=f"{display} News — {SITE_NAME}",
        description=f"Latest {display} news and updates from {SITE_NAME}. {SITE_DESCRIPTION}",
        canonical=canonical,
    )


def build_article_head(article: Dict[str, Any], category_name: str = "") -> str:
    base = _base_url()
    url = f"{base}/article/{article['slug']}"
    title = article.get("title") or SITE_TITLE
    content = article.get("content") or {}
    description = article.get("summary") or content.get("tldr") or SITE_DESCRIPTION
    image = article.get("thumbnail_url") or DEFAULT_IMAGE
    published = _iso(article.get("published_at"))
    modified = _iso(article.get("last_updated")) or published

    e = lambda s: html.escape(s, quote=True)  # noqa: E731
    extra_lines = []
    if published:
        extra_lines.append(f'<meta property="article:published_time" content="{e(published)}">')
    if modified:
        extra_lines.append(f'<meta property="article:modified_time" content="{e(modified)}">')
    if category_name:
        extra_lines.append(f'<meta property="article:section" content="{e(category_name)}">')

    news_ld: Dict[str, Any] = {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "headline": title,
        "description": description,
        "image": _abs_url(image),
        "author": {"@type": "Person", "name": article.get("author") or SITE_NAME},
        "publisher": {
            "@type": "Organization",
            "name": SITE_NAME,
            "logo": {"@type": "ImageObject", "url": _abs_url(PUBLISHER_LOGO)},
        },
        "mainEntityOfPage": {"@type": "WebPage", "@id": url},
        "url": url,
    }
    if published:
        news_ld["datePublished"] = published
        news_ld["dateModified"] = modified
    if category_name:
        news_ld["articleSection"] = category_name
    extra_lines.append(_json_ld_script(news_ld))

    breadcrumb_items = [
        {"@type": "ListItem", "position": 1, "name": "Home", "item": base},
        {"@type": "ListItem", "position": 2, "name": title, "item": url},
    ]
    if category_name:
        breadcrumb_items = [
            breadcrumb_items[0],
            {"@type": "ListItem", "position": 2, "name": category_name, "item": f"{base}/category/{article.get('category_id', '')}"},
            {"@type": "ListItem", "position": 3, "name": title, "item": url},
        ]
    extra_lines.append(
        _json_ld_script(
            {
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                "itemListElement": breadcrumb_items,
            }
        )
    )

    return build_head(
        title=f"{title} — {SITE_NAME}",
        description=description,
        canonical=url,
        image=image,
        og_type="article",
        extra="\n  ".join(extra_lines),
    )


def inject_head(index_html: str, head_block: str) -> str:
    """Replace the marked head block in index.html; returns html unchanged if markers are missing."""
    return _HEAD_BLOCK_RE.sub(lambda _m: head_block, index_html, count=1)
