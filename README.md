# OpenVaartha

OpenVaartha is a news publishing monorepo with a React reader site and CMS, a FastAPI API, MongoDB, Redis, and Celery. The Compose stack serves the React build through nginx and uses FastAPI for the API, machine-readable feeds, and selected server-rendered pages.

## Structure

```text
.
├── docker-compose.yml          Production compose stack
├── .env.example                Single environment template for compose
├── .dockerignore
├── .gitignore
├── openvaartha-api/            FastAPI backend
│   ├── app/
│   │   ├── api/v1/             Versioned HTTP routes
│   │   ├── core/               Auth and request dependencies
│   │   ├── models/             Internal Pydantic domain models
│   │   ├── schemas/            Request/response schemas
│   │   ├── services/           Business logic and persistence access
│   │   ├── tasks/              Celery app and task modules
│   │   ├── config.py
│   │   ├── database.py
│   │   └── main.py
│   ├── scripts/                Operational scripts
│   ├── tests/
│   ├── Dockerfile              API and worker runtime
│   └── requirements.txt
├── openvaartha-astro/          Standalone Astro frontend outside production Compose
└── openvaartha-web/            React, Vite, Tailwind frontend
    ├── public/
    ├── src/
    │   ├── components/
    │   ├── hooks/
    │   ├── lib/
    │   └── pages/
    └── package.json
```

## Production Deploy

1. Create the runtime environment file:

```bash
cp .env.example .env
```

2. Edit `.env` and replace every placeholder secret. At minimum set:

```text
JWT_SECRET_KEY
MONGODB_URL          # external managed MongoDB (e.g. Atlas)
REDIS_URL            # external managed Redis (use rediss:// for TLS)
ADMIN_EMAILS
CORS_ORIGINS
```

MongoDB and Redis are **external managed services** — this stack no longer runs
them as containers. `CELERY_BROKER_URL` / `CELERY_RESULT_BACKEND` are optional:
leave them blank to reuse `REDIS_URL`, or set them if your Redis plan gives you
separate logical DBs.

3. Build and start the stack:

```bash
docker compose up --build -d
```

4. Check health:

```bash
docker compose ps
docker compose exec api python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/health/ready').read().decode())"
```

Dokploy routes the public domain to the `web` container on the external
`dokploy-network`. Compose does not publish host ports. MongoDB and Redis are
external services configured through `MONGODB_URL` and `REDIS_URL`.

## Services

- `api`: FastAPI app serving the API and rendering public HTML using the React build's shared HTML template.
- `web`: nginx serving React assets and browser routes, and forwarding API and server-rendered routes to FastAPI.
- `celery-worker`: Celery worker running RSS ingestion / AI rewrite tasks.
- `celery-beat`: Celery scheduler (single-instance via `beat_lock.py`).
- `migrate`: one-shot bootstrap (indexes + admin/RSS seed) run before the rest.

MongoDB and Redis are **external** (e.g. MongoDB Atlas + a managed Redis) and
are configured entirely through `.env`.

## Admin Access

Admin promotion is environment-driven. Add comma-separated emails to `ADMIN_EMAILS`, then register those users normally. Existing users can be promoted with:

```bash
docker compose exec api python scripts/make_admin.py admin@example.com
```

For bootstrap creation, pass credentials through env:

```bash
docker compose exec -e ADMIN_EMAIL=admin@example.com -e ADMIN_PASSWORD='change-me' api python scripts/setup_admin.py
```

## Route ownership

| Route | Browser UI | Initial production response |
| --- | --- | --- |
| `/`, `/article/:slug`, `/category/:name`, and selected public pages | React routes in `openvaartha-web/src/App.tsx` | nginx forwards to `openvaartha-api/app/api/v1/pages.py` |
| `/admin/*`, `/portal/*`, and other SPA routes | React routes in `openvaartha-web/src/App.tsx` | nginx serves the React shell |
| `/api/v1/*`, `/health/*`, `/feed.xml`, sitemaps | API or machine-readable response | nginx forwards to FastAPI |

Use `openvaartha-web/nginx.conf` for the full proxy mapping. Astro runs
independently on port 4321 for local development and is outside the current
production deployment.

## Local Development

Backend:

```bash
cd openvaartha-api
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Frontend:

```bash
cd openvaartha-web
npm install
npm run dev
```

Vite runs on port 8080 and proxies API requests to production by default.
For local API development, start Vite with
`$env:VITE_API_URL = "http://localhost:8000"; npm run dev` and allow the Vite
origin in your local API CORS settings.

For local backend runs, the settings loader supports `openvaartha-api/.env`, but the root `.env` remains the final override so compose and local runs share the same production contract.

## Verification

```bash
cd openvaartha-api
python -m compileall app scripts
python -m pytest

cd ../openvaartha-web
npm run build
```

The full backend test suite expects MongoDB on `localhost:27017`.

Automated ingestion requires a MongoDB replica set or sharded cluster so the article,
body, and source attribution can commit together. New RSS sources default to
editorial drafts. Existing source-level auto-publish settings still apply.

`/health` checks the API process. `/health/ready` checks MongoDB and Redis connectivity,
and detailed worker and queue diagnostics at `/health/ops` require admin access.

Run **Staging publishing smoke** from GitHub Actions after deploying staging.
Set `OPENVAARTHA_BASE_URL` and the admin credentials in the GitHub `staging`
environment. The workflow signs in against staging and creates and deletes a
test story while verifying public HTML and RSS through nginx.

## Editorial review

Editors can claim or release a contributor submission or automated draft from
**Review Queue**. The oldest items appear first. Claimed stories can be published
or archived with an editorial reason. Editors can add missing attribution in
the queue. The full editor shows the reviewer and archive reason. RSS
auto-publication remains a source-level opt-in. Automated drafts must have a body
and source attribution before publication.

## Reader measurement

React sends GA4 page views and the `reader_first_story`, `reader_second_story`,
`reader_newsletter_signup`, and `reader_return_7d` events. The milestones are
browser-level. A return is a new visit after at least 30 minutes and within
seven days of the first viewed story. Newsletter signup means the subscription
API accepted it. Reports can use the initial landing path and acquisition
channel carried on each event.

In the GA4 property, register event-scoped dimensions for `journey_landing`
and `journey_channel`, and disable automatic page views on browser history
changes. Use DebugView to validate one page view per route and the four
milestone events before setting a baseline.

## AI configuration

Set `GROQ_API_KEY` to enable article drafting, editor assistance, automated
claim review, digest summaries, reader explanations, and archive search answers.
The default text model is `openai/gpt-oss-120b`. An explicit `GROQ_MODEL` in
deployment settings takes precedence. For You ranks unread stories using the
reader's recent categories and fills the remaining slots with recent unread
stories.

AI search (`GET /api/v1/search/ai?q=…`) answers a question from published
stories and cites each claim as `[n]`, where `results[n-1]` is the story. It
makes two model calls per uncached question (rewrite the question into search
phrases, then write the answer) and caches the result for
`AI_SEARCH_CACHE_TTL_SECONDS` (default 900). Without a key, for plain keyword
queries, or if a model call fails, it returns ordinary `$text` results with
`mode: "results"` and no answer. Limit per client IP with
`AI_SEARCH_RATE_LIMIT` (default `30/minute`).
