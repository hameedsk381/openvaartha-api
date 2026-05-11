from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password)


def _encode(data: dict, expires_at: datetime, token_type: str) -> str:
    payload = data.copy()
    payload.update({"exp": expires_at, "typ": token_type})
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token tagged ``typ="access"``."""
    delta = expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return _encode(data, datetime.utcnow() + delta, "access")


def create_refresh_token(data: dict) -> str:
    """Create a JWT refresh token tagged ``typ="refresh"``.

    The ``typ`` claim lets ``get_current_user`` reject a refresh token that
    is presented as an access token, and lets ``/refresh`` reject anything
    other than a real refresh token.
    """
    delta = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    return _encode(data, datetime.utcnow() + delta, "refresh")


def decode_token(token: str) -> Optional[dict]:
    """Decode and verify a JWT token. Returns None on any failure."""
    try:
        return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        return None
