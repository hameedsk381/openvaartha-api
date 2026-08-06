from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import uuid4
from jose import JWTError, jwt
import bcrypt as _bcrypt

from app.config import settings


def verify_password(plain_password: str, hashed_password: Optional[str]) -> bool:
    """Verify a password against its hash.

    ``hashed_password`` is None for OAuth-only accounts (e.g. Google sign-in)
    that never set a local password — those must never authenticate via the
    password grant, so this returns False rather than raising.
    """
    if not hashed_password:
        return False
    return _bcrypt.checkpw(
        plain_password.encode(), hashed_password.encode()
    )


def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt directly (avoids passlib compat issues)."""
    return _bcrypt.hashpw(password.encode(), _bcrypt.gensalt()).decode()


def _encode(data: dict, expires_at: datetime, token_type: str) -> str:
    payload = data.copy()
    payload.update({
        "exp": expires_at,
        "typ": token_type,
        "jti": str(uuid4()),
        "iat": datetime.now(timezone.utc),
    })
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token tagged ``typ="access"``."""
    delta = expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return _encode(data, datetime.now(timezone.utc) + delta, "access")


def create_refresh_token(data: dict) -> str:
    """Create a JWT refresh token tagged ``typ="refresh"``.

    The ``typ`` claim lets ``get_current_user`` reject a refresh token that
    is presented as an access token, and lets ``/refresh`` reject anything
    other than a real refresh token. Each token carries a unique ``jti`` so
    sessions can be individually tracked and revoked server-side.
    """
    delta = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    return _encode(data, datetime.now(timezone.utc) + delta, "refresh")


def decode_token(token: str) -> Optional[dict]:
    """Decode and verify a JWT token. Returns None on any failure."""
    try:
        return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        return None
