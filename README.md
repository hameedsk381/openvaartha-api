# Open Vaartha

South India's news platform — a monorepo containing the FastAPI backend and the React reader UI. The web app is built into the API image and served as static files, so a single container ships the whole product.

## Repo layout

```
.
├── openvaartha-api/         FastAPI backend (Python 3.11, MongoDB, Redis, Celery)
│   ├── app/
│   │   ├── api/v1/          Versioned route modules
│   │   ├── core/            Security, dependencies
│   │   ├── models/          MongoEngine documents
│   │   ├── schemas/         Pydantic request/response models
│   │   ├── services/        Business logic
│   │   ├── tasks/           Celery tasks
│   │   ├── utils/
│   │   ├── config.py
│   │   ├── database.py
│   │   └── main.py          App factory + SPA static mount
│   ├── scripts/             seed_data, setup_admin
│   ├── tests/
│   ├── Dockerfile           Multi-stage: web build → api + static
│   ├── requirements.txt
│   ├── pytest.ini
│   ├── .env.example
│   └── .env.test
│
├── openvaartha-web/         React + Vite + Tailwind reader UI
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── data/
│   │   ├── lib/
│   │   └── index.css
│   ├── package.json
│   ├── tailwind.config.ts
│   └── vite.config.ts
│
├── docker-compose.yml       Orchestrates api + mongo + redis
├── .dockerignore
└── .gitignore
```

## Quick start (Docker)

The compose file at the repo root builds the React app inside the API image.

```bash
cp openvaartha-api/.env.example openvaartha-api/.env  # edit secrets
docker compose up --build
```

The combined service is then on **http://localhost:8000** — both the React UI and the `/api/v1/*` JSON endpoints are served from the same origin.

## Local development

Run the API and web app independently for fast iteration.

**API**

```bash
cd openvaartha-api
python -m venv venv && source venv/bin/activate     # or .\venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Web**

```bash
cd openvaartha-web
npm install
npm run dev
```

In dev the web app runs on Vite's port (5173) and proxies API calls to `http://localhost:8000`.

## Tests

```bash
cd openvaartha-api
pytest
```

## Conventions

- **Python**: snake_case modules, Pydantic v2 schemas with `to_camel` alias generator so JSON stays camelCase.
- **TypeScript**: PascalCase components, camelCase hooks (`use-*`), kebab-case file names for utilities.
- **Imports**: web app uses `@/` path alias mapped to `src/`.
- **Styling**: Tailwind with design tokens in `src/index.css`; serif (Libre Baskerville) for headlines, Inter for UI.
