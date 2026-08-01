"""Public read-path integration tests: browsing, listing, searching."""

import pytest

pytestmark = pytest.mark.integration


class TestArticlesList:
    def test_articles_list_is_array(self, client):
        r = client.get("/api/v1/articles/?limit=5")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_articles_list_include_total_envelope(self, client):
        r = client.get("/api/v1/articles/?limit=2&include_total=true")
        assert r.status_code == 200
        body = r.json()
        assert isinstance(body, dict)
        assert "items" in body and "total" in body
        assert isinstance(body["items"], list)
        assert body["total"] >= len(body["items"])

    def test_articles_over_limit_is_422(self, client):
        r = client.get("/api/v1/articles/?limit=500")
        assert r.status_code == 422

    def test_articles_at_limit_ok(self, client):
        r = client.get("/api/v1/articles/?limit=100")
        assert r.status_code == 200
        assert len(r.json()) <= 100


class TestArticleDetail:
    def test_article_by_id(self, client, sample_article):
        r = client.get(f"/api/v1/articles/{sample_article['id']}")
        assert r.status_code == 200
        body = r.json()
        assert body["title"] == sample_article["title"]
        assert "content" in body

    def test_article_by_slug(self, client, sample_article):
        r = client.get(f"/api/v1/articles/{sample_article['slug']}")
        assert r.status_code == 200

    def test_article_not_found(self, client):
        r = client.get("/api/v1/articles/00000000-0000-0000-0000-000000000000")
        assert r.status_code == 404


class TestCuratedLists:
    def test_trending(self, client):
        r = client.get("/api/v1/articles/trending?limit=3")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_breaking(self, client):
        r = client.get("/api/v1/articles/breaking?limit=3")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_editor_picks(self, client):
        r = client.get("/api/v1/articles/editor-picks?limit=3")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_explainers(self, client):
        r = client.get("/api/v1/articles/explainers?limit=3")
        assert r.status_code == 200
        assert isinstance(r.json(), list)


class TestCategories:
    def test_list_categories(self, client):
        r = client.get("/api/v1/categories/")
        assert r.status_code == 200
        cats = r.json()
        assert isinstance(cats, list)
        assert cats, "no categories present"
        for cat in cats:
            assert cat["name"]

    def test_category_by_id(self, client, sample_category):
        r = client.get(f"/api/v1/categories/{sample_category['id']}")
        assert r.status_code == 200
        assert r.json()["name"] == sample_category["name"]

    def test_category_stats(self, client):
        r = client.get("/api/v1/categories/stats/all")
        assert r.status_code == 200
        body = r.json()
        assert isinstance(body, list)
        assert body, "no category stats"
        assert "category_name" in body[0] or "categoryName" in body[0]

    def test_category_articles(self, client, sample_category):
        r = client.get(f"/api/v1/categories/{sample_category['name']}/articles?limit=5")
        assert r.status_code == 200
        assert isinstance(r.json(), list)


class TestSearch:
    def test_search_returns_array(self, client):
        r = client.get("/api/v1/search/?q=the&limit=5")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_search_empty_query_422(self, client):
        r = client.get("/api/v1/search/?q=")
        assert r.status_code == 422

    def test_suggestions_shape(self, client):
        r = client.get("/api/v1/search/suggestions?q=the&limit=3")
        assert r.status_code == 200
        body = r.json()
        assert set(("titles", "tags", "categories")) <= set(body)
        assert isinstance(body["titles"], list)


class TestFeedsAndMisc:
    def test_articles_for_you(self, client):
        r = client.get("/api/v1/articles/for-you?limit=3")
        assert r.status_code == 200

    def test_articles_related(self, client, sample_article):
        r = client.get(f"/api/v1/articles/{sample_article['id']}/related")
        assert r.status_code == 200

    def test_dispatches_list(self, client):
        r = client.get("/api/v1/dispatches/?limit=3")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_popular_tags(self, client):
        r = client.get("/api/v1/articles/tags/popular?limit=5")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_series_list(self, client):
        r = client.get("/api/v1/series/?limit=5")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_authors_list(self, client):
        r = client.get("/api/v1/authors/")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_vapid_public_key(self, client):
        r = client.get("/api/v1/push/vapid-public-key")
        assert r.status_code == 200
        assert "key" in r.json()
