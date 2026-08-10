import html
import json
import re
from datetime import datetime
from typing import Any, Dict, Optional

from app.config import settings

# Mirrors BRAND in openvaartha-web/src/lib/brand.ts — keep in sync.
SITE_NAME = "Open Vaartha"
# Explicit entity positioning: name + category + geography, so search engines
# (and AI assistants) can immediately understand what Open Vaartha is and
# where it operates, rather than a cryptic tagline.
SITE_TITLE = "Open Vaartha | Independent Public-Interest Journalism from Andhra Pradesh"
# Kept under 160 chars, keywords first — long descriptions get truncated in
# search snippets and social previews.
SITE_DESCRIPTION = (
    "Open Vaartha is an independent digital news initiative focused on "
    "politics, governance, society, technology, environment and "
    "public-interest journalism from Andhra Pradesh."
)
TWITTER_HANDLE = "@openvaartha"
# Proper 1200x630 social-card composite (wordmark on the brand's cream
# background) — /logo.jpg is a square product-icon-shaped JPG with its own
# white background, a poor fit for link-preview cards on every platform.
DEFAULT_IMAGE = "/og-image.png"
# The actual current brand mark (maroon "D" wordmark) — /icon.svg is a stale,
# visually different placeholder (an "OV / VAARTHA" square badge) that was
# never updated after the real logo shipped. Every NewsArticle/Organization
# JSON-LD publisher.logo was serving that wrong image until this was fixed.
PUBLISHER_LOGO = "/pwa-512x512.png"

# Entity architecture — consistent machine-readable identity so search engines
# (and AI assistants) can connect Open Vaartha ↔ openvaartha.com ↔ FOSS Andhra
# Foundation ↔ official social profiles. Keep in sync with brand.ts.
# The @id is referenced by every NewsArticle publisher block on the site.
ORG_ID = "https://openvaartha.com/#organization"
ORG_TYPE = "NewsMediaOrganization"
ORG_DESCRIPTION = (
    "Open Vaartha is an independent digital news initiative focused on "
    "politics, governance, society, technology, environment and "
    "public-interest journalism from Andhra Pradesh."
)
ORG_PARENT_NAME = "FOSS Andhra Foundation"
ORG_SAME_AS = [
    "https://www.instagram.com/OPENVAARTHA/",
    "https://www.facebook.com/openvaartha/",
    "https://youtube.com/@openvaartha",
    "https://x.com/openvaartha",
]

# The block in index.html (between these markers) that gets replaced per-request.
_HEAD_BLOCK_RE = re.compile(r"<!--app-head-->.*?<!--/app-head-->", re.DOTALL)


def _base_url() -> str:
    return settings.SITE_URL.rstrip("/")


def _slugify(name: str) -> str:
    # Must match feed_service._slugify — category pages key off the slugified
    # name, not the UUID _id.
    return "".join(c.lower() if c.isalnum() or c in "-_" else "-" for c in name).strip("-")


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
    "bytes": {
        "title": f"Bytes — {SITE_NAME}",
        "description": "Quick hits from the desk — short, timestamped news bytes, scroll for the latest.",
        "robots": None,
    },
    "about": {
        "title": f"About — {SITE_NAME}",
        "description": "Open Vaartha is an independent, youth-led news initiative operated by Gen Z.",
        "robots": None,
    },
    "contact": {
        "title": f"Contact — {SITE_NAME}",
        "description": "Reach the Open Vaartha team — story tips, corrections, feedback, and contributions.",
        "robots": None,
    },
    "editorial": {
        "title": f"Editorial Standards — {SITE_NAME}",
        "description": "Open Vaartha's editorial standards: independence, sourcing and verification, use of AI, and accountability to readers.",
        "robots": None,
    },
    "corrections": {
        "title": f"Corrections Policy — {SITE_NAME}",
        "description": "How Open Vaartha reports, reviews, and corrects errors, transparently and promptly.",
        "robots": None,
    },
    "privacy": {
        "title": f"Privacy Policy — {SITE_NAME}",
        "description": "Open Vaartha's privacy policy: what data we collect, why, and how to exercise your rights.",
        "robots": None,
    },
    "terms": {
        "title": f"Terms of Use — {SITE_NAME}",
        "description": "Open Vaartha's terms of use: acceptable use, content ownership, contributor submissions, and disclaimers.",
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
            "@type": ORG_TYPE,
            "@id": f"{base}/#organization",
            "name": SITE_NAME,
            "url": base,
            "logo": {"@type": "ImageObject", "url": _abs_url(PUBLISHER_LOGO)},
            "image": _abs_url(PUBLISHER_LOGO),
            "description": ORG_DESCRIPTION,
            "parentOrganization": {
                "@type": "Organization",
                "name": ORG_PARENT_NAME,
            },
            "sameAs": ORG_SAME_AS,
            "contactPoint": {
                "@type": "ContactPoint",
                "email": "office@openvaartha.com",
                "contactType": "editorial",
            },
        }),
        _json_ld_script({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "@id": f"{base}/#website",
            "name": SITE_NAME,
            "url": base,
            "publisher": {"@id": f"{base}/#organization"},
            "potentialAction": {
                "@type": "SearchAction",
                "target": f"{base}/search?q={{search_term_string}}",
                "query-input": "required name=search_term_string",
            },
        }),
    ])


def has_static_route(route: str) -> bool:
    """Whether a fixed SPA route has dedicated (non-homepage) meta, so the SSR
    layer can decide to proxy it for head injection."""
    return route.strip("/") in _STATIC_ROUTE_META


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

    author_name = article.get("author") or SITE_NAME
    author_slug = article.get("author_slug") or _slugify(author_name) or "desk"
    news_ld: Dict[str, Any] = {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "headline": title,
        "description": description,
        "image": _abs_url(image),
        "author": {
            "@type": "Person",
            "@id": f"{base}/#author-{author_slug}",
            "name": author_name,
            "url": f"{base}/authors/{author_slug}",
        },
        "publisher": {"@id": f"{base}/#organization"},
        "mainEntityOfPage": {"@type": "WebPage", "@id": url},
        "url": url,
        "inLanguage": "en",
    }
    if published:
        news_ld["datePublished"] = published
        news_ld["dateModified"] = modified
    if category_name:
        news_ld["articleSection"] = category_name
    tags = article.get("tags") or []
    if tags:
        news_ld["keywords"] = ", ".join(str(t) for t in tags if t)
    extra_lines.append(_json_ld_script(news_ld))

    breadcrumb_items = [
        {"@type": "ListItem", "position": 1, "name": "Home", "item": base},
        {"@type": "ListItem", "position": 2, "name": title, "item": url},
    ]
    if category_name:
        breadcrumb_items = [
            breadcrumb_items[0],
            {"@type": "ListItem", "position": 2, "name": category_name, "item": f"{base}/category/{_slugify(category_name)}"},
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


# ── Server-rendered article body shell ──────────────────────────────────────
# The SPA mounts into `<div id="root">`. We seed that container with a static,
# crawlable rendering of the article so (a) non-JS crawlers (WhatsApp, Google
# News/Discover) see real headline + body text and (b) humans get a meaningful
# first paint before the React bundle loads. React's createRoot() replaces this
# content on mount, so it is a transient shell, not hydrated markup.
_BODY_MARKER = "<!--app-body-->"


def _plain_paragraphs(text: str) -> str:
    """Render body text as escaped <p> blocks. The stored body may contain
    markdown; for the shell we present it as readable, escaped text (crawlers
    index the words; React later renders the fully-formatted version)."""
    if not text:
        return ""
    blocks = [b.strip() for b in re.split(r"\n\s*\n", text) if b.strip()]
    return "".join(f"<p>{html.escape(b)}</p>" for b in blocks)


def _citable_passage(article: Dict[str, Any], summary: str = "", body: str = "") -> str:
    """Build a self-contained ~100-170 word answer paragraph for AI citation.

    AI citation extractors favor quotable blocks of roughly 134-167 words near
    the top of a page. We assemble one from the strongest available text and pad
    it to a citable length with the article's headline context and attribution."""
    content = article.get("content") or {}
    tldr = content.get("tldr") or ""
    title = article.get("title") or ""
    candidates = [t for t in (summary, tldr) if t]
    if not candidates:
        return ""

    text = " ".join(candidates).strip()
    words = text.split()
    if len(words) < 60 and body:
        body_paras = [b.strip() for b in re.split(r"\n\s*\n", body) if b.strip()]
        if body_paras:
            more = " ".join(body_paras[0].split())
            # Merge on top of the summary so facts come first.
            text = (text + " " + more).strip()
    words = text.split()
    if len(words) < 30:
        # Genuinely too thin to quote — the TL;DR/summary alone is kept in its own
        # block, so a near-empty "What happened" passage adds no citation value.
        return ""
    # Trim / cap to the ideal citable band (~130-170 words) without cutting mid-sentence.
    if len(words) > 175:
        trimmed = " ".join(words[:170]).rsplit(".", 1)[0].rstrip()
        text = trimmed + "."
    return text


def build_article_body_shell(article: Dict[str, Any], category_name: str = "") -> str:
    e = lambda s: html.escape(s, quote=True)  # noqa: E731
    content = article.get("content") or {}
    title = article.get("title") or ""
    summary = article.get("summary") or ""
    tldr = content.get("tldr") or ""
    points = content.get("points") or []
    body = content.get("body") or ""
    author = article.get("author") or SITE_NAME
    published = _iso(article.get("published_at"))

    # Minimal inline styling so the pre-React paint is readable, not full-bleed.
    parts = ['<article style="max-width:720px;margin:0 auto;padding:24px;font-family:system-ui,-apple-system,sans-serif;line-height:1.6;">']
    if category_name:
        parts.append(f'<p style="text-transform:uppercase;letter-spacing:.08em;font-size:12px;font-weight:700;">{e(category_name)}</p>')
    parts.append(f"<h1>{e(title)}</h1>")
    if summary:
        parts.append(f'<p style="font-size:1.15rem;color:#444;">{e(summary)}</p>')
    byline = f"By {e(author)}"
    if published:
        byline += f' · <time datetime="{e(published)}">{e(published[:10])}</time>'
    parts.append(f'<p style="font-size:13px;color:#666;">{byline}</p>')
    # Citable answer passage: a self-contained 100-170 word "X is…/What happened…"
    # block near the top so non-JS crawlers and AI citation extractors can pull an
    # isolated, quotable answer without context. AI systems favor quotes of this
    # length found in the first ~30% of a page.
    passage = _citable_passage(article, summary, body)
    if passage:
        parts.append('<h2>What happened</h2><p>' + e(passage) + "</p>")
    if tldr:
        parts.append(f"<h2>TL;DR</h2><p>{e(tldr)}</p>")
    if points:
        items = "".join(f"<li>{e(str(p))}</li>" for p in points if p)
        if items:
            parts.append(f"<h2>Key points</h2><ul>{items}</ul>")
    if body:
        parts.append(_plain_paragraphs(body))
    parts.append("</article>")
    return "".join(parts)


def inject_body(index_html: str, body_shell: str) -> str:
    """Seed the SPA mount point with a server-rendered shell. No-op if the
    marker is absent (e.g. an older index.html)."""
    return index_html.replace(_BODY_MARKER, body_shell, 1)


def build_list_body_shell(
    articles: list[Dict[str, Any]],
    *,
    heading: str = "Latest News",
    subheading: str = "",
) -> str:
    """Server-rendered crawlable list for index/category/feed pages: an <h1>,
    a short lede, and an <ol> of article headlines linking to each story. Non-JS
    crawlers (Google, Bing) get real text + internal links instead of an empty
    shell, and it boots fast before React mounts. React replaces it on mount."""
    e = lambda s: html.escape(s, quote=True)  # noqa: E731
    parts = ['<article style="max-width:720px;margin:0 auto;padding:24px;font-family:system-ui,-apple-system,sans-serif;line-height:1.6;">']
    if subheading:
        parts.append(f'<p style="text-transform:uppercase;letter-spacing:.08em;font-size:12px;font-weight:700;">{e(subheading)}</p>')
    parts.append(f"<h1>{e(heading)}</h1>")
    if not articles:
        parts.append("<p>No stories published yet.</p>")
    else:
        parts.append("<ul>")
        for a in articles:
            title = a.get("title") or ""
            slug = a.get("slug") or ""
            if not (title and slug):
                continue
            href = _abs_url(f"/article/{slug}")
            parts.append(f'<li><a href="{e(href)}">{e(title)}</a></li>')
        parts.append("</ul>")
    parts.append("</article>")
    return "".join(parts)


def render_article_html(template_html: str, article: Dict[str, Any], category_name: str = "") -> str:
    """Inject per-article <head> meta and a crawlable body shell into index.html."""
    out = inject_head(template_html, build_article_head(article, category_name))
    return inject_body(out, build_article_body_shell(article, category_name))
