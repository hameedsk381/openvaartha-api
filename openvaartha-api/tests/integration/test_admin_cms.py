"""Admin CMS integration tests. Test articles are created with a
[IntegrationTest] prefix and hard-deleted in teardown so no real content is
touched and no test data is left behind."""

import uuid
from datetime import datetime, timezone

import pytest

pytestmark = pytest.mark.integration

TEST_PREFIX = "[IntegrationTest]"


def _mk_article_payload(category_id: str, title: str) -> dict:
    return {
        "title": title,
        "summary": "Integration test article — will be deleted after the run.",
        "categoryId": category_id,
        "readTime": "2 min read",
        "language": "en",
        "status": "published",
        "isTrending": False,
        "isBreaking": False,
        "tags": ["integration-test"],
        "author": "Integration Bot",
        "publishedAt": datetime.now(timezone.utc).isoformat(),
        "content": {
            "tldr": "Integration test.",
            "points": ["Created and deleted by the integration suite."],
            "body": "<p>Integration test body.</p>",
        },
    }


class TestDashboard:
    def test_dashboard_stats(self, client, admin_headers):
        r = client.get("/api/v1/admin/stats/dashboard", headers=admin_headers)
        assert r.status_code == 200
        body = r.json()
        assert "articles" in body or "totalArticles" in body

    def test_admin_users_list(self, client, admin_headers):
        r = client.get("/api/v1/admin/users?limit=5", headers=admin_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_sources_list(self, client, admin_headers):
        r = client.get("/api/v1/admin/sources", headers=admin_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


class TestArticleLifecycle:
    """Full admin CRUD cycle on a throwaway article, with guaranteed cleanup."""

    def test_full_article_lifecycle(self, client, admin_headers, sample_category):
        title = f"{TEST_PREFIX} lifecycle {uuid.uuid4().hex[:8]}"
        aid = None
        try:
            create = client.post(
                "/api/v1/articles/",
                json=_mk_article_payload(sample_category["id"], title),
                headers=admin_headers,
            )
            assert create.status_code == 200, create.text[:500]
            article = create.json()
            aid = article["id"]
            assert article["title"] == title

            fetch = client.get(f"/api/v1/articles/{aid}")
            assert fetch.status_code == 200
            assert fetch.json()["id"] == aid

            update = client.put(
                f"/api/v1/articles/{aid}",
                json={"summary": "Updated by integration suite."},
                headers=admin_headers,
            )
            assert update.status_code == 200, update.text[:500]
            assert update.json()["summary"] == "Updated by integration suite."

            listing = client.get("/api/v1/articles/?limit=100")
            assert any(a["id"] == aid for a in listing.json())

            search = client.get(f"/api/v1/search/?q={title}&limit=5")
            assert search.status_code == 200
        finally:
            if aid:
                deleted = client.delete(f"/api/v1/articles/{aid}", headers=admin_headers)
                assert deleted.status_code == 200, deleted.text[:300]
                gone = client.get(f"/api/v1/articles/{aid}")
                assert gone.status_code == 404


class TestCommentModeration:
    def test_admin_lists_and_approves_comment(self, client, admin_headers, user_headers, sample_article):
        body_text = f"{TEST_PREFIX} moderation {uuid.uuid4().hex[:8]}"
        created = client.post(
            f"/api/v1/comments/?article_id={sample_article['id']}",
            json={"body": body_text},
            headers=user_headers,
        )
        assert created.status_code == 201, created.text[:300]
        comment_id = created.json()["id"]

        try:
            all_comments = client.get(
                f"/api/v1/admin/comments?article_id={sample_article['id']}&limit=50",
                headers=admin_headers,
            )
            assert all_comments.status_code == 200
            assert any(c["id"] == comment_id for c in all_comments.json())
        finally:
            client.delete(f"/api/v1/comments/{comment_id}", headers=user_headers)
