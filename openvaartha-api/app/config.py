from pydantic_settings import BaseSettings
from typing import List, Set


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "OpenVaartha API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Security
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ADMIN_EMAILS: str = ""
    
    # Database
    MONGODB_URL: str = "mongodb://127.0.0.1:27017"
    DATABASE_NAME: str = "openvaartha"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    CACHE_TTL_SECONDS: int = 300
    
    # JWT
    JWT_SECRET_KEY: str = "your-jwt-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # OpenAI
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4"
    
    # News APIs
    NEWS_API_KEY: str = ""
    MEDIASTACK_API_KEY: str = ""
    
    # Instagram
    INSTAGRAM_ACCESS_TOKEN: str = ""
    INSTAGRAM_USER_ID: str = ""
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:8080,http://127.0.0.1:8080,http://[::1]:8080,http://localhost:3000,http://localhost:5173"
    
    @property
    def allowed_origins(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    @property
    def admin_email_set(self) -> Set[str]:
        return {
            email.strip().lower()
            for email in self.ADMIN_EMAILS.split(",")
            if email.strip()
        }
    
    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    class Config:
        env_file = (".env", "../.env")
        case_sensitive = True
        extra = "ignore"


settings = Settings()
