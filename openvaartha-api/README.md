# OpenVaartha Backend Documentation

## Overview

OpenVaartha Backend is a FastAPI-based REST API service that powers the OpenVaartha news aggregation and summarization platform. It provides endpoints for article management, user authentication, news aggregation, AI-powered summarization, and real-time updates.

## Tech Stack

- **Framework**: FastAPI (Python 3.10+)
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Caching**: Redis
- **Authentication**: JWT (JSON Web Tokens)
- **Task Queue**: Celery with Redis broker
- **AI/ML**: OpenAI GPT API / Hugging Face Transformers
- **Search**: PostgreSQL Full-Text Search
- **Testing**: Pytest

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI application entry point
│   ├── config.py               # Configuration settings
│   ├── database.py             # Database connection setup
│   ├── models/                 # SQLAlchemy models
│   │   ├── __init__.py
│   │   ├── article.py
│   │   ├── user.py
│   │   ├── category.py
│   │   └── reading_list.py
│   ├── schemas/                # Pydantic schemas
│   │   ├── __init__.py
│   │   ├── article.py
│   │   ├── user.py
│   │   └── category.py
│   ├── api/                    # API routes
│   │   ├── __init__.py
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── articles.py
│   │   │   ├── categories.py
│   │   │   ├── users.py
│   │   │   ├── search.py
│   │   │   └── instagram.py
│   ├── services/               # Business logic
│   │   ├── __init__.py
│   │   ├── article_service.py
│   │   ├── auth_service.py
│   │   ├── news_aggregator.py
│   │   ├── summarization_service.py
│   │   └── categorization_service.py
│   ├── core/                   # Core utilities
│   │   ├── __init__.py
│   │   ├── security.py         # Password hashing, JWT
│   │   ├── dependencies.py     # Dependency injection
│   │   └── exceptions.py       # Custom exceptions
│   ├── tasks/                  # Celery background tasks
│   │   ├── __init__.py
│   │   ├── news_fetcher.py
│   │   └── trending_updater.py
│   └── utils/                  # Utility functions
│       ├── __init__.py
│       ├── logger.py
│       └── helpers.py
├── tests/                      # Test suite
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_articles.py
│   ├── test_users.py
│   └── test_auth.py
├── migrations/                 # Alembic migrations
├── alembic.ini
├── requirements.txt
├── .env.example
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## API Endpoints

### Articles

```
GET    /api/v1/articles                    - List all articles (paginated)
GET    /api/v1/articles/trending           - Get trending articles
GET    /api/v1/articles/breaking           - Get breaking news
GET    /api/v1/articles/{slug}             - Get article by slug
GET    /api/v1/categories/{category_id}/articles - Articles by category
POST   /api/v1/articles                    - Create article (admin)
PUT    /api/v1/articles/{article_id}       - Update article (admin)
DELETE /api/v1/articles/{article_id}       - Delete article (admin)
```

### Categories

```
GET    /api/v1/categories                  - List all categories
GET    /api/v1/categories/{category_id}    - Get category details
POST   /api/v1/categories                  - Create category (admin)
```

### Users & Authentication

```
POST   /api/v1/users/register              - Register new user
POST   /api/v1/users/login                 - User login
GET    /api/v1/users/me                    - Get current user profile
PUT    /api/v1/users/me                    - Update user profile
GET    /api/v1/users/me/reading-list       - Get user's reading list
POST   /api/v1/users/me/reading-list       - Add article to reading list
DELETE /api/v1/users/me/reading-list/{article_id} - Remove from reading list
```

### Search

```
GET    /api/v1/search?q=query              - Search articles
GET    /api/v1/search/suggestions?q=query  - Search suggestions
```

### Instagram Integration

```
GET    /api/v1/instagram/feed              - Get Instagram feed
```

### Admin

```
POST   /api/v1/admin/articles/import       - Import articles from RSS/API
POST   /api/v1/admin/articles/summarize    - Trigger AI summarization
GET    /api/v1/admin/stats                 - Get system statistics
```

## Database Schema

### Tables

#### articles
- `id` (UUID, Primary Key)
- `slug` (String, Unique)
- `title` (String)
- `summary` (Text)
- `category_id` (UUID, Foreign Key → categories)
- `read_time` (String)
- `language` (String)
- `is_trending` (Boolean)
- `is_breaking` (Boolean)
- `thumbnail_url` (String)
- `instagram_url` (String)
- `published_at` (DateTime)
- `last_updated` (DateTime)
- `author` (String)
- `created_at` (DateTime)
- `updated_at` (DateTime)

#### article_content
- `article_id` (UUID, Primary Key, Foreign Key → articles)
- `tldr` (Text)
- `points` (JSONB)
- `body` (Text)
- `timeline` (JSONB, nullable)
- `explainer` (JSONB, nullable)

#### categories
- `id` (UUID, Primary Key)
- `name` (String, Unique)
- `color_code` (String)
- `emoji` (String)
- `created_at` (DateTime)

#### users
- `id` (UUID, Primary Key)
- `email` (String, Unique)
- `hashed_password` (String)
- `full_name` (String)
- `is_active` (Boolean)
- `is_admin` (Boolean)
- `created_at` (DateTime)
- `updated_at` (DateTime)

#### reading_lists
- `user_id` (UUID, Foreign Key → users)
- `article_id` (UUID, Foreign Key → articles)
- `saved_at` (DateTime)
- Primary Key: (user_id, article_id)

#### sources
- `id` (UUID, Primary Key)
- `name` (String)
- `url` (String)
- `type` (String: 'rss', 'api', 'manual')

#### article_sources
- `article_id` (UUID, Foreign Key → articles)
- `source_id` (UUID, Foreign Key → sources)
- Primary Key: (article_id, source_id)

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Application
APP_NAME=OpenVaartha API
APP_VERSION=1.0.0
DEBUG=True
SECRET_KEY=your-super-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/openvaartha

# Redis
REDIS_URL=redis://localhost:6379/0

# JWT
JWT_SECRET_KEY=your-jwt-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# OpenAI (for summarization)
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4

# News APIs
NEWS_API_KEY=your-newsapi-key
MEDIASTACK_API_KEY=your-mediastack-key

# Instagram
INSTAGRAM_ACCESS_TOKEN=your-instagram-token
INSTAGRAM_USER_ID=your-instagram-user-id

# CORS
CORS_ORIGINS=http://localhost:8080,http://localhost:3000

# Celery
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/2

# Logging
LOG_LEVEL=INFO
```

## Setup Instructions

### Prerequisites

- Python 3.10+
- PostgreSQL 14+
- Redis 6+
- pip (Python package manager)

### Installation

1. **Clone and navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   
   # Windows
   venv\Scripts\activate
   
   # Linux/Mac
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Set up PostgreSQL database**
   ```bash
   # Create database
   createdb openvaartha
   
   # Or using psql
   psql -U postgres
   CREATE DATABASE openvaartha;
   ```

6. **Run database migrations**
   ```bash
   alembic upgrade head
   ```

7. **Seed initial data (optional)**
   ```bash
   python scripts/seed_data.py
   ```

### Running the Application

#### Development Mode

```bash
# Start FastAPI development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

Interactive API docs:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

#### With Docker

```bash
# Build and run with docker-compose
docker-compose up -d

# View logs
docker-compose logs -f
```

#### Production Mode

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Background Tasks (Celery)

Start Celery worker for background tasks:

```bash
celery -A app.tasks.celery_app worker --loglevel=info
```

Start Celery Beat for scheduled tasks:

```bash
celery -A app.tasks.celery_app beat --loglevel=info
```

## Testing

Run the test suite:

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app tests/

# Run specific test file
pytest tests/test_articles.py -v
```

## API Usage Examples

### Get All Articles

```bash
curl http://localhost:8000/api/v1/articles?page=1&limit=20
```

### Get Article by Slug

```bash
curl http://localhost:8000/api/v1/articles/andhra-budget-2026
```

### User Registration

```bash
curl -X POST http://localhost:8000/api/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123",
    "full_name": "John Doe"
  }'
```

### User Login

```bash
curl -X POST http://localhost:8000/api/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123"
  }'
```

### Add to Reading List

```bash
curl -X POST http://localhost:8000/api/v1/users/me/reading-list \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"article_id": "article-uuid"}'
```

### Search Articles

```bash
curl "http://localhost:8000/api/v1/search?q=budget&category=Politics"
```

## News Aggregation Pipeline

The backend automatically fetches and processes news through this pipeline:

1. **Fetch**: Pull articles from configured sources (RSS feeds, News APIs)
2. **Deduplicate**: Check for duplicate articles using similarity matching
3. **Categorize**: Auto-categorize using NLP and keyword matching
4. **Summarize**: Generate AI-powered summaries using OpenAI/Claude
5. **Store**: Save processed articles to database
6. **Index**: Update search indexes
7. **Trending**: Update trending scores based on recency and engagement

### Scheduled Tasks

- **News Fetching**: Every 15 minutes
- **Trending Update**: Every hour
- **Old Article Cleanup**: Daily at midnight
- **Analytics Aggregation**: Every 6 hours

## Security

- **Password Hashing**: bcrypt with salt rounds
- **JWT Authentication**: Access tokens (30 min) + Refresh tokens (7 days)
- **CORS**: Configurable allowed origins
- **Rate Limiting**: Implement per-endpoint rate limits
- **Input Validation**: Pydantic schemas for all inputs
- **SQL Injection Prevention**: SQLAlchemy ORM with parameterized queries
- **XSS Protection**: Output sanitization

## Performance Optimization

- **Database Indexing**: Indexes on frequently queried fields
- **Redis Caching**: Cache popular articles and user sessions
- **Pagination**: Cursor-based pagination for large datasets
- **Query Optimization**: Eager loading to prevent N+1 queries
- **Connection Pooling**: Database connection pool management
- **Async Operations**: Async database operations where possible

## Monitoring & Logging

- **Logging**: Structured logging with log levels
- **Error Tracking**: Sentry integration (optional)
- **Metrics**: Prometheus metrics endpoint `/metrics`
- **Health Check**: `/health` endpoint for uptime monitoring

## Deployment

### Production Checklist

- [ ] Set `DEBUG=False` in production
- [ ] Use strong `SECRET_KEY` and `JWT_SECRET_KEY`
- [ ] Configure proper CORS origins
- [ ] Set up SSL/TLS certificates
- [ ] Configure database backups
- [ ] Set up monitoring and alerting
- [ ] Enable rate limiting
- [ ] Configure proper logging
- [ ] Set up CI/CD pipeline
- [ ] Use environment-specific configurations

### Docker Deployment

```bash
# Build production image
docker build -t openvaartha-backend .

# Run with docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

### Cloud Deployment Options

- **AWS**: ECS/EKS with RDS PostgreSQL and ElastiCache Redis
- **Google Cloud**: Cloud Run with Cloud SQL and Memorystore
- **Azure**: Container Instances with Azure Database for PostgreSQL
- **DigitalOcean**: App Platform with Managed Database
- **Heroku**: Easy deployment with add-ons

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check PostgreSQL is running
   - Verify DATABASE_URL in .env
   - Ensure database exists

2. **Redis Connection Error**
   - Check Redis is running: `redis-cli ping`
   - Verify REDIS_URL in .env

3. **Import Errors**
   - Ensure virtual environment is activated
   - Run `pip install -r requirements.txt`

4. **Migration Errors**
   - Check Alembic configuration
   - Run `alembic current` to see current version
   - Run `alembic upgrade head` to apply all migrations

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests
5. Submit a pull request

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: [repository-url]/issues
- Email: support@openvaartha.com

---

**Version**: 1.0.0  
**Last Updated**: April 2026  
**Maintained by**: OpenVaartha Team
