"""HTML sanitization for user-supplied editorial content.

All article text that may be rendered as HTML downstream MUST flow through
``sanitize_html`` before persistence. Plain-text fields (titles, summaries,
slugs, author bylines) use ``sanitize_text`` to strip any markup outright.

Allow-list is intentionally small — editors get formatting, never script.
"""

from __future__ import annotations

from typing import Iterable, Optional

import bleach

# Inline + block tags an editor reasonably needs in long-form copy.
_ALLOWED_TAGS: frozenset[str] = frozenset({
    "p", "br", "hr",
    "strong", "b", "em", "i", "u", "mark", "small", "sub", "sup",
    "a",
    "ul", "ol", "li",
    "blockquote", "q", "cite",
    "h2", "h3", "h4",
    "code", "pre",
    "figure", "figcaption", "img",
    "table", "thead", "tbody", "tr", "th", "td",
})

_ALLOWED_ATTRIBUTES: dict[str, list[str]] = {
    "a": ["href", "title", "rel"],
    "img": ["src", "alt", "title", "width", "height"],
    "th": ["scope"],
    "td": ["colspan", "rowspan"],
}

_ALLOWED_PROTOCOLS: frozenset[str] = frozenset({"http", "https", "mailto"})


def sanitize_html(value: Optional[str]) -> Optional[str]:
    """Return ``value`` with disallowed markup stripped.

    None and empty strings pass through unchanged. The cleaner also forces
    ``rel="noopener noreferrer"`` on outbound links so editors can't smuggle
    in window.opener attacks via free-text URLs.
    """
    if value is None or value == "":
        return value

    cleaned = bleach.clean(
        value,
        tags=_ALLOWED_TAGS,
        attributes=_ALLOWED_ATTRIBUTES,
        protocols=_ALLOWED_PROTOCOLS,
        strip=True,
        strip_comments=True,
    )
    return bleach.linkify(
        cleaned,
        callbacks=[bleach.callbacks.nofollow, _force_noopener],
        skip_tags=["pre", "code"],
    )


def sanitize_text(value: Optional[str]) -> Optional[str]:
    """Strip every tag — useful for title/summary/author/slug fields."""
    if value is None or value == "":
        return value
    return bleach.clean(value, tags=[], strip=True, strip_comments=True).strip()


def sanitize_points(points: Optional[Iterable[str]]) -> Optional[list[str]]:
    """Sanitize each bullet point as plain text; drop empties."""
    if points is None:
        return None
    cleaned: list[str] = []
    for point in points:
        text = sanitize_text(point)
        if text:
            cleaned.append(text)
    return cleaned


def _force_noopener(attrs: dict, new: bool = False) -> dict:
    """Bleach linkify callback — every <a> ends up safe to open in a new tab."""
    attrs[(None, "rel")] = "noopener noreferrer nofollow"
    return attrs
