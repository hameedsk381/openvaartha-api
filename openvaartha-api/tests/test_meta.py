from datetime import datetime, timezone

import pytest

from app.config import settings
from app.services.meta_service import (
    SITE_TITLE,
    _citable_passage,
    build_article_body_shell,
    build_article_head,
    build_default_head,
    build_list_body_shell,
    has_static_route,
    inject_body,
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


class TestStaticRouteMeta:
    def test_has_static_route_true_for_known(self):
        assert has_static_route("trending")
        assert has_static_route("about")
        assert has_static_route("/privacy/")  # normalized

    def test_has_static_route_false_for_unknown(self):
        assert not has_static_route("zzz-unknown-route")


class TestListBodyShell:
    def test_renders_headline_links(self):
        articles = [
            {"title": "Story One", "slug": "story-one"},
            {"title": "Story Two", "slug": "story-two"},
        ]
        shell = build_list_body_shell(articles, heading="Trending News", subheading="Most-read")
        base = settings.SITE_URL.rstrip("/")
        assert "<h1>Trending News</h1>" in shell
        assert f'href="{base}/article/story-one"' in shell
        assert f'href="{base}/article/story-two"' in shell
        assert "<ul>" in shell

    def test_inject_body_seeds_root(self):
        template = '<div id="root"><!--app-body--></div>'
        shell = "<article><h1>Hi</h1></article>"
        result = inject_body(template, shell)
        assert "<!--app-body-->" not in result
        assert "<h1>Hi</h1>" in result


class TestCitablePassage:
    def test_builds_self_contained_block(self):
        a = _article(
            summary="The Reserve Bank cut its benchmark rate by 25 basis points to 5.75%, the first reduction in two years. Economists say the move targets rising urban consumption while keeping inflation near the 4% target. Analysts expect further easing if monsoon rains stay weak across the northern states this quarter.",
        )
        passage = _citable_passage(a, summary=a["summary"])
        n = len(passage.split())
        assert 30 <= n, f"passage too short: {n} words"
        # The summary text survives (escaped) in the passage.
        assert "Reserve Bank cut its benchmark rate" in passage

    def test_appears_in_body_shell_under_what_happened(self):
        a = _article(
            summary="A self-contained answer about the decision: the government announced new rules today, the policy takes effect next month, and analysts say it changes the funding picture for small firms in meaningful ways that affect suppliers and customers alike.",
        )
        shell = build_article_body_shell(a)
        assert "<h2>What happened</h2>" in shell
        assert "A self-contained answer about the decision" in shell

    def test_too_thin_returns_empty(self):
        a = _article(summary="Too short.")
        assert _citable_passage(a, summary=a["summary"]) == ""

    def test_caps_overlong_passage_to_band(self):
        a = _article(summary=". ".join(["This is a factual sentence about the development." for _ in range(60)]))
        passage = _citable_passage(a, summary=a["summary"])
        assert len(passage.split()) <= 175


@pytest.mark.asyncio
async def test_robots_txt_advertises_sitemap(client):
    resp = await client.get("/robots.txt")
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/plain")
    body = resp.text
    assert "User-agent: *" in body
    assert f"Sitemap: {settings.SITE_URL.rstrip('/')}/sitemap.xml" in body
    assert "Disallow: /admin" in body
    # Key AI crawlers explicitly allowed for citation.
    for crawler in ("GPTBot", "OAI-SearchBot", "anthropic-ai", "PerplexityBot"):
        assert f"User-agent: {crawler}\nAllow: /" in body
