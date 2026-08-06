"""Single-scheduler guard for celery-beat.

Celery beat has no built-in guarantee that only one instance fires the
schedule. If a beat container restarts while an old one lingers, or the service
is scaled, two beats will double-fire every task. This wrapper acquires an
advisory lock in Redis (SET NX with a short TTL, renewed while alive) and only
execs ``celery beat`` when the lock is held.

Usage (replaces the plain ``celery ... beat`` command):
    python -m app.tasks.beat_lock celery -A app.tasks:celery_app beat --loglevel=info
"""
import os
import sys
import time

import redis

from app.config import settings

_LOCK_KEY = "openvaartha:celery-beat:lock"
_LOCK_TTL = 30  # seconds; renewed on each loop tick
_RENEW_INTERVAL = 10


def _acquire(conn: redis.Redis) -> bool:
    return bool(conn.set(_LOCK_KEY, "1", nx=True, ex=_LOCK_TTL))


def _release(conn: redis.Redis) -> None:
    try:
        conn.delete(_LOCK_KEY)
    except Exception:
        pass


def main() -> int:
    conn = redis.from_url(settings.REDIS_URL, decode_responses=True)
    if not _acquire(conn):
        print("Another celery-beat instance holds the scheduler lock. Exiting.", flush=True)
        return 0

    cmd = sys.argv[1:] if len(sys.argv) > 1 else ["celery", "-A", "app.tasks:celery_app", "beat", "--loglevel=info"]
    print(f"Acquired scheduler lock. Running: {' '.join(cmd)}", flush=True)

    pid = os.fork()
    if pid == 0:
        # Child: renew the lock in the background and exec celery beat.
        def renew():
            while True:
                try:
                    conn.expire(_LOCK_KEY, _LOCK_TTL)
                except Exception:
                    pass
                time.sleep(_RENEW_INTERVAL)
        import threading
        threading.Thread(target=renew, daemon=True).start()
        os.execvp(cmd[0], cmd)

    # Parent: wait for the child, then release the lock.
    _, status = os.waitpid(pid, 0)
    _release(conn)
    return os.waitstatus_to_exitcode(status) if hasattr(os, "waitstatus_to_exitcode") else status


if __name__ == "__main__":
    sys.exit(main())
