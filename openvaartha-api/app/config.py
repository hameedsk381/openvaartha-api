from typing import List, Set

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "OpenVaartha API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"  # development | staging | production

    # Security
    ADMIN_EMAILS: str = ""

    # Database
    MONGODB_URL: str = "mongodb://127.0.0.1:27017"
    DATABASE_NAME: str = "openvaartha"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    CACHE_TTL_SECONDS: int = 300
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # JWT
    JWT_SECRET_KEY: str = "your-jwt-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Password reset
    RESET_TOKEN_EXPIRE_HOURS: int = 1

    # Rate limits
    LOGIN_RATE_LIMIT: str = "10/minute"
    REFRESH_RATE_LIMIT: str = "30/minute"
    REGISTER_RATE_LIMIT: str = "5/minute"
    MUTATION_RATE_LIMIT: str = "60/minute"

    # AI generation
    AI_TEMPERATURE: float = 0.7
    AI_MAX_OUTPUT_TOKENS: int = 4096
    AI_MAX_POINTS: int = 8
    AI_TIMEOUT: int = 60  # seconds for Gemini API call

    # Gemini
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # Google Sign-In (verifies the ID token's audience — no client secret
    # needed since the frontend uses Google Identity Services' implicit flow)
    GOOGLE_CLIENT_ID: str = ""

    # News APIs
    NEWS_API_KEY: str = ""
    MEDIASTACK_API_KEY: str = ""

    # Instagram
    INSTAGRAM_ACCESS_TOKEN: str = ""
    INSTAGRAM_USER_ID: str = ""

    # SMTP (email sending)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "noreply@openvaartha.com"
    SMTP_FROM_NAME: str = "OpenVaartha"

    # Site URL (used for sitemaps, RSS feeds, and canonical links)
    SITE_URL: str = "http://localhost:8000"

    # CORS — comma-separated list of EXACT origins. Wildcards (``*``) are
    # rejected outright in production because ``allow_credentials=True`` makes
    # wildcard origins both insecure and meaningless.
    CORS_ORIGINS: str = (
        "http://localhost:8080,http://127.0.0.1:8080,http://[::1]:8080,"
        "http://localhost:3000,http://localhost:5173"
    )

    @property
    def allowed_origins(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def admin_email_set(self) -> Set[str]:
        return {
            email.strip().lower()
            for email in self.ADMIN_EMAILS.split(",")
            if email.strip()
        }

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    def assert_safe_for_production(self) -> None:
        """Fail fast if production config leaves a known security footgun in place."""
        if not self.is_production:
            return
        problems: list[str] = []
        if "change-in-production" in self.JWT_SECRET_KEY or len(self.JWT_SECRET_KEY) < 32:
            problems.append("JWT_SECRET_KEY is not set to a strong production value")
        origins_raw = self.CORS_ORIGINS or ""
        if "*" in origins_raw.split(","):
            problems.append("CORS_ORIGINS must be an explicit list in production (wildcard rejected)")
        if not self.allowed_origins:
            problems.append("CORS_ORIGINS must contain at least one explicit origin in production")
        if self.DEBUG:
            problems.append("DEBUG must be False in production")
        if problems:
            joined = "; ".join(problems)
            raise RuntimeError(f"Refusing to start: {joined}")

    # Logging
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = (".env", "../.env")
        case_sensitive = True
        extra = "ignore"


settings = Settings()
