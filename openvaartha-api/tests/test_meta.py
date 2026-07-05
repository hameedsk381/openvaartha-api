from datetime import datetime, timezone

import pytest

from app.config import settings
from app.services.meta_service import (
    SITE_TITLE,
    build_article_head,
    build_default_head,
    inject_head,
)

INDEX_HTML = (
    "<html><head>\n"
    "<!--app-head-->\n<title>default</title>\n<!--/app-head-->\n"
    "<link rel=\"manifest\" href=\"/manifest.webmanifest\" />\n"
    "</head><body></body></html>"
)


def _article(**overrides):
    article = {
        "slug": "cm-announces-new-scheme",
        "title": "CM announces new scheme",
        "summary": "A new welfare scheme was announced today.",
        "author": "Desk Reporter",
        "category_id": "cat-1",
        "thumbnail_url": "/thumbnails/scheme.jpg",
        "published_at": datetime(2026, 7, 1, 10, 30, tzinfo=timezone.utc),
        "last_updated": None,
        "content": {"tldr": "New scheme announced", "points": [], "body": "..."},
    }
    article.update(overrides)
    return article


class TestInjectHead:
    def test_replaces_marked_block(self):
        head = build_default_head("trending")
        result = inject_head(INDEX_HTML, head)
        assert "<title>default</title>" not in result
        assert f"{settings.SITE_URL.rstrip('/')}/trending" in result
        assert '<link rel="manifest"' in result  # untouched outside the block

    def test_html_without_markers_is_returned_unchanged(self):
        plain = "<html><head><title>x</title></head></html>"
        assert inject_head(plain, build_default_head("")) == plain


class TestDefaultHead:
    def test_contains_site_title_and_canonical(self):
        head = build_default_head("")
        assert SITE_TITLE.replace("&", "&amp;").replace("'", "&#x27;") in head
        assert f'rel="canonical" href="{settings.SITE_URL.rstrip("/")}"' in head


class TestArticleHead:
    def test_contains_article_meta_and_json_ld(self):
        head = build_article_head(_article(), category_name="Politics")
        base = settings.SITE_URL.rstrip("/")
        assert f'<link rel="canonical" href="{base}/article/cm-announces-new-scheme"' in head
        assert '<meta property="og:type" content="article" />' in head
        assert 'content="CM announces new scheme — Open Vaartha"' in head
        assert f'content="{base}/thumbnails/scheme.jpg"' in head
        assert '"@type": "NewsArticle"' in head
        assert '"@type": "BreadcrumbList"' in head
        assert '<meta property="article:section" content="Politics">' in head
        assert '<meta property="article:published_time" content="2026-07-01T10:30:00+00:00">' in head

    def test_escapes_html_in_title_and_summary(self):
        head = build_article_head(
            _article(title='<script>alert("x")</script>', summary='a "quoted" & <b>bold</b> claim')
        )
        # Meta/title attributes must be entity-escaped
        assert "&lt;script&gt;" in head
        assert "&quot;quoted&quot;" in head
        # JSON-LD may carry the raw string, but a literal </script> from content
        # must never survive (it would terminate the script block early). The
        # only </script> occurrences allowed are the two legitimate closing tags
        # of the NewsArticle and BreadcrumbList blocks.
        assert head.count("</script>") == 2
        assert "<\\/script>" in head  # escaped form of the content's closing tag

    def test_falls_back_to_tldr_when_no_summary(self):
        head = build_article_head(_article(summary=""))
        assert 'content="New scheme announced"' in head

    def test_absolute_thumbnail_url_is_kept(self):
        head = build_article_head(_article(thumbnail_url="https://cdn.example.com/a.jpg"))
        assert 'content="https://cdn.example.com/a.jpg"' in head


@pytest.mark.asyncio
async def test_robots_txt_advertises_sitemap(client):
    resp = await client.get("/robots.txt")
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/plain")
    body = resp.text
    assert "User-agent: *" in body
    assert f"Sitemap: {settings.SITE_URL.rstrip('/')}/sitemap.xml" in body
    assert "Disallow: /admin" in body
