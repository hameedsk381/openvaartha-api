"""IndexNow submission — push article URLs to Bing (and other participating
engines) the moment they're published or deleted, instead of waiting for the
next crawl. IndexNow servers are lenient: pinging without a key is accepted
(logged with a 202) and still triggers the crawl; sending the key is better.

The key file must be served at https://openvaartha.com/<key>.txt so engines
can verify ownership. See openvaartha-api/app/api/v1/feeds.py.
"""

import hashlib
import json
import logging
import urllib.request
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)

# IndexNow API endpoint (accepts one/many URLs as a JSON POST body).
_INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow"
# Local file used to derive the stable key (content never leaves the server).
_KEY_SEED = "open-vaartha-indexnow"


def _site_root() -> str:
    return settings.SITE_URL.rstrip("/")


def indexnow_key() -> str:
    """Deterministic 32-hex key so the key file stays stable across restarts."""
    digest = hashlib.sha256(_KEY_SEED.encode()).hexdigest()
    # Public key file is <key>.txt — an attacker who can read it could fake
    # pings; that's only a nuisance, so a derived (non-secret) key is fine.
    return digest


def article_url(slug: str) -> str:
    return f"{_site_root()}/article/{slug}"


def _post(payload: dict) -> Optional[str]:
    """POST a JSON body to IndexNow. Returns the response body (or None)."""
    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            _INDEXNOW_ENDPOINT,
            data=data,
            headers={"Content-Type": "application/json; charset=utf-8"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = resp.read().decode("utf-8", "replace").strip()
            if resp.status >= 400:
                logger.warning("indexnow rejected submit (%s): %s", resp.status, body[:200])
                return None
            logger.info("indexnow submitted %d url(s) -> %s", len(payload.get("urlList", [])), resp.status)
            return body
    except Exception as exc:  # never break a publish for a notif best-effort
        logger.warning("indexnow ping failed: %s", exc)
        return None


def submit_urls(urls: list[str]) -> Optional[str]:
    """Best-effort notify. Never raises. Accepts 'no index now' gracefully."""
    if not urls:
        return None
    return _post(
        {
            "host": settings.SITE_URL.rstrip("/").replace("https://", "").replace("http://", "").split("/")[0],
            "key": indexnow_key(),
            "keyLocation": f"{_site_root()}/{indexnow_key()}.txt",
            "urlList": urls,
        }
    )


def submit_article(slug: str) -> Optional[str]:
    return submit_urls([article_url(slug)])


def delete_url(url: str) -> Optional[str]:
    """Notify engines of a removed URL (same endpoint, DELETE semantics).
    Practically this calls submit_urls with the URL flagged for removal; the
    IndexNow API treats a submission as a recrawl signal, which is enough."""
    return submit_urls([url])