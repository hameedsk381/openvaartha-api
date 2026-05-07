# OpenVaartha

OpenVaartha is a production-oriented monorepo for a FastAPI news API, React reader UI, MongoDB, Redis, and Celery worker. The React app is built into the API image and served by FastAPI, so production compose exposes one public HTTP service.

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
│   ├── Dockerfile              Multi-stage web build plus API runtime
│   └── requirements.txt
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
MONGO_INITDB_ROOT_PASSWORD
MONGODB_URL
REDIS_PASSWORD
REDIS_URL
CELERY_BROKER_URL
CELERY_RESULT_BACKEND
ADMIN_EMAILS
CORS_ORIGINS
```

3. Build and start the stack:

```bash
docker compose up --build -d
```

4. Check health:

```bash
docker compose ps
curl http://localhost:8000/health
```

The public app and API are served from `http://localhost:${API_PORT}`. MongoDB and Redis are internal-only services in compose and are not published to the host.

## Services

- `api`: FastAPI app serving `/api/v1/*` and the built React SPA.
- `worker`: Celery worker using the same image and centralized env.
- `mongo`: persistent MongoDB volume `mongo-data`.
- `redis`: persistent Redis volume `redis-data`, password-protected.

## Admin Access

Admin promotion is environment-driven. Add comma-separated emails to `ADMIN_EMAILS`, then register those users normally. Existing users can be promoted with:

```bash
docker compose exec api python scripts/make_admin.py admin@example.com
```

For bootstrap creation, pass credentials through env:

```bash
docker compose exec -e ADMIN_EMAIL=admin@example.com -e ADMIN_PASSWORD='change-me' api python scripts/setup_admin.py
```

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
