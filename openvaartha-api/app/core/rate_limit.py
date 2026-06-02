"""Shared SlowAPI limiter + reusable rate-limit strings.

Limits are intentionally generous so the API stays usable under bursty
real-world traffic, but tight enough to make password-spray and runaway
admin tooling visible.

Per-route limit strings live here so the public endpoints can swap them
out without circular imports in main.py.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import settings

# A single in-process limiter — backed by an in-memory store by default.
# Swap to ``storage_uri="redis://..."`` later if we run more than one worker.
limiter = Limiter(key_func=get_remote_address, default_limits=[])

# Public limits — chosen to be invisible to humans, painful to bots.
LOGIN_LIMIT = settings.LOGIN_RATE_LIMIT
REFRESH_LIMIT = settings.REFRESH_RATE_LIMIT
REGISTER_LIMIT = settings.REGISTER_RATE_LIMIT

# Admin write path — generous but bounded to surface runaway scripts.
MUTATION_LIMIT = settings.MUTATION_RATE_LIMIT
