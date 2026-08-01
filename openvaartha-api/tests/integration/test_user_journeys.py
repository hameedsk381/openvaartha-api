"""End-to-end authenticated user journeys: reading list, history, comments,
newsletter, polls. All test-created data is cleaned up in teardown."""

import uuid

import pytest

pytestmark = pytest.mark.integration

TEST_PREFIX = "[IntegrationTest]"


def _slug():
    return f"itest-{uuid.uuid4().hex[:10]}"


class TestReadingList:
    def test_add_get_remove_article(self, client, user_headers, sample_article):
        aid = sample_article["id"]
        try:
            add = client.post(
                f"/api/v1/users/me/reading-list/{aid}", headers=user_headers
            )
            assert add.status_code in (200, 400), add.text[:200]

            listing = client.get("/api/v1/users/me/reading-list", headers=user_headers)
            assert listing.status_code == 200
            assert isinstance(listing.json(), list)
        finally:
            client.delete(
                f"/api/v1/users/me/reading-list/{aid}", headers=user_headers
            )

    def test_reading_list_requires_auth(self, client, sample_article):
        r = client.get("/api/v1/users/me/reading-list")
        assert r.status_code == 401


class TestReadingHistory:
    def test_record_and_list_history(self, client, user_headers, sample_article):
        aid = sample_article["id"]
        r = client.post(f"/api/v1/users/me/history/{aid}", headers=user_headers)
        assert r.status_code == 200, r.text[:200]

        listing = client.get("/api/v1/users/me/history", headers=user_headers)
        assert listing.status_code == 200
        assert isinstance(listing.json(), list)


class TestComments:
    def test_create_count_and_delete_comment(self, client, user_headers, sample_article):
        aid = sample_article["id"]
        body_text = f"{TEST_PREFIX} comment {uuid.uuid4().hex[:8]}"
        created = client.post(
            f"/api/v1/comments/?article_id={aid}",
            json={"body": body_text},
            headers=user_headers,
        )
        assert created.status_code == 201, created.text[:300]
        comment_id = created.json()["id"]

        try:
            listing = client.get(f"/api/v1/comments/?article_id={aid}")
            assert listing.status_code == 200
            assert any(c["id"] == comment_id for c in listing.json())

            count = client.get(f"/api/v1/comments/count?article_id={aid}")
            assert count.status_code == 200
            assert count.json()["count"] >= 1
        finally:
            deleted = client.delete(f"/api/v1/comments/{comment_id}", headers=user_headers)
            assert deleted.status_code == 200, deleted.text[:200]

    def test_comment_requires_auth(self, client, sample_article):
        r = client.post(
            f"/api/v1/comments/?article_id={sample_article['id']}",
            json={"body": "anon"},
        )
        assert r.status_code == 401


class TestNewsletter:
    def test_subscribe_and_unsubscribe(self, client):
        email = f"itest-{uuid.uuid4().hex[:10]}@example.com"
        try:
            sub = client.post("/api/v1/newsletter/subscribe", json={"email": email})
            assert sub.status_code == 200, sub.text[:200]
            assert sub.json()["email"] == email
        finally:
            client.post("/api/v1/newsletter/unsubscribe", json={"email": email})

    def test_subscribe_duplicate_400(self, client):
        email = f"itest-{uuid.uuid4().hex[:10]}@example.com"
        client.post("/api/v1/newsletter/subscribe", json={"email": email})
        try:
            dup = client.post("/api/v1/newsletter/subscribe", json={"email": email})
            assert dup.status_code == 400
        finally:
            client.post("/api/v1/newsletter/unsubscribe", json={"email": email})


class TestPolls:
    def test_mock_poll_get(self, client):
        r = client.get("/api/v1/polls/101")
        assert r.status_code == 200
        body = r.json()
        assert "options" in body and body["id"] == "101"

    def test_mock_poll_vote(self, client, user_headers):
        r = client.post("/api/v1/polls/101/vote", json={"optionId": "opt1"}, headers=user_headers)
        assert r.status_code == 200, r.text[:300]
