# Stage 1 — build React app
# Build context is the monorepo root, so paths are relative to it
FROM node:20-alpine AS web-builder
WORKDIR /web
COPY openvaartha-web/package*.json ./
RUN npm install
COPY openvaartha-web ./
RUN npm run build

# Stage 2 — Python API + static files
FROM python:3.11-slim
WORKDIR /app

RUN apt-get update && apt-get install -y gcc && rm -rf /var/lib/apt/lists/*

COPY openvaartha-api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY openvaartha-api/ .

# Copy built React dist into static/ so FastAPI can serve it
COPY --from=web-builder /web/dist ./static

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
