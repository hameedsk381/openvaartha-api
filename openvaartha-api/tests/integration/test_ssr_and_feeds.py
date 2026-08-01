"""SSR article pages, SEO meta, and machine-readable endpoints.

The /feed.xml, /llms.txt and /.well-known/agents.json assertions document a
known production bug: nginx.conf only proxies /robots.txt, /sitemap.xml and
/rss|atom.xml to the API; the other static-ish paths fall through to the SPA
fallback and return index.html instead of their real content."""

import pytest

pytestmark = pytest.mark.integration


class TestSSR:
    def test_article_page_renders_html(self, client, sample_article):
        r = client.get(f"/article/{sample_article['slug']}")
        assert r.status_code == 200
        assert "text/html" in r.headers["content-type"]
        body = r.text
        assert "<!doctype html" in body.lower()
        assert sample_article["title"] in body

    def test_article_page_has_canonical_and_meta(self, client, sample_article):
        r = client.get(f"/article/{sample_article['slug']}")
        body = r.text
        assert 'rel="canonical"' in body or "og:title" in body

    def test_article_page_has_ga_tag(self, client, sample_article):
        r = client.get(f"/article/{sample_article['slug']}")
        assert "googletagmanager.com" in r.text or "gtag" in r.text

    def test_unknown_article_slug_404(self, client):
        r = client.get("/article/this-article-does-not-exist-xyz")
        assert r.status_code == 404


class TestSEORoutes:
    def test_robots_txt(self, client):
        r = client.get("/robots.txt")
        assert r.status_code == 200
        assert "text/plain" in r.headers["content-type"]
        assert "Sitemap:" in r.text

    def test_sitemap_xml(self, client):
        r = client.get("/sitemap.xml")
        assert r.status_code == 200
        assert "application/xml" in r.headers["content-type"]
        assert "<urlset" in r.text

    def test_feed_xml_is_rss(self, client):
        r = client.get("/feed.xml")
        assert r.status_code == 200
        assert "xml" in r.headers["content-type"], (
            f"feed.xml served as {r.headers.get('content-type')}; nginx falls "
            "through to the SPA for /feed.xml"
        )
        assert "<rss" in r.text or "<?xml" in r.text

    def test_llms_txt_is_text(self, client):
        r = client.get("/llms.txt")
        assert r.status_code == 200
        assert "text/plain" in r.headers["content-type"]

    def test_agents_json(self, client):
        r = client.get("/.well-known/agents.json")
        assert r.status_code == 200
        assert "application/json" in r.headers["content-type"]
