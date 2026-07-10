from app.config import settings


def init_sentry() -> None:
    """Initialize Sentry error tracking if SENTRY_DSN is configured.

    Called independently from both ``app/main.py`` (the API/uvicorn process)
    and ``app/tasks/__init__.py`` (the Celery worker/beat processes) — they are
    separate entrypoints that never import each other, so each needs its own
    init call. A no-op when SENTRY_DSN is unset: every ``sentry_sdk.capture_*``
    call site elsewhere in the app is safe to call unconditionally either way,
    since the SDK silently drops events with no client initialized.

    Framework integrations (FastAPI, Celery, etc.) are auto-detected by
    sentry-sdk based on what's importable in the current process — no explicit
    integrations list needed.
    """
    if not settings.SENTRY_DSN:
        return

    import sentry_sdk

    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
        release=settings.APP_VERSION,
        traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
    )
