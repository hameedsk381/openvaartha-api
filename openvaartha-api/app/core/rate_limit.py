"""Shared SlowAPI limiter + reusable rate-limit strings.

Limits are intentionally generous so the API stays usable under bursty
real-world traffic, but tight enough to make password-spray and runaway
admin tooling visible.

Per-route limit strings live here so the public endpoints can swap them
out without circular imports in main.py.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

# A single in-process limiter — backed by an in-memory store by default.
# Swap to ``storage_uri="redis://..."`` later if we run more than one worker.
limiter = Limiter(key_func=get_remote_address, default_limits=[])

# Public limits — chosen to be invisible to humans, painful to bots.
LOGIN_LIMIT = "10/minute"
REFRESH_LIMIT = "30/minute"
REGISTER_LIMIT = "5/minute"

# Admin write path — generous but bounded to surface runaway scripts.
MUTATION_LIMIT = "60/minute"
