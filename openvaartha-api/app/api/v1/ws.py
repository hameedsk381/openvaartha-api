import logging
import time
from typing import Dict, List

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketState

from app.config import settings
from app.core.security import decode_token
from app.core.ws_manager import manager

router = APIRouter()
logger = logging.getLogger(__name__)

# Simple in-memory per-IP connection throttle. In production behind a single
# API instance this is sufficient; multi-instance deployments should move this
# to Redis. Bucket semantics: count of connect attempts within a window.
_connect_attempts: Dict[str, List[float]] = {}


def _client_ip(websocket: WebSocket) -> str:
    fwd = websocket.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return websocket.client.host if websocket.client else "unknown"


def _origin_allowed(websocket: WebSocket) -> bool:
    origin = websocket.headers.get("origin")
    if not origin:
        # Non-browser clients (tests, native apps) may omit Origin. When the
        # app is served same-origin behind a proxy we allow missing origins;
        # browsers always send Origin so cross-site hijacking is still blocked.
        return True
    return origin.rstrip("/") in settings.allowed_origins


def _rate_limited(ip: str) -> bool:
    """Return True when the IP has exceeded the connect rate limit."""
    limit_value = settings.WS_CONNECT_RATE_LIMIT  # "N/unit"
    try:
        count, unit = limit_value.split("/")
        count = int(count)
    except ValueError:
        return False
    window = 60.0 if unit.startswith("minute") else float(unit)
    now = time.time()
    bucket = _connect_attempts.setdefault(ip, [])
    bucket = [t for t in bucket if now - t < window]
    _connect_attempts[ip] = bucket
    if len(bucket) >= count:
        return True
    bucket.append(now)
    return False


def _authenticate(websocket: WebSocket):
    """Extract and validate a bearer token, if provided.

    The connection is allowed as anonymous (public events only) when no token
    is supplied. A supplied-but-invalid token is rejected so a client can't
    falsely claim an identity. Returns user_id or None.
    """
    token = websocket.query_params.get("token")
    if not token:
        auth_header = websocket.headers.get("authorization")
        if auth_header and auth_header.lower().startswith("bearer "):
            token = auth_header[7:]
    if not token:
        return None
    payload = decode_token(token)
    if not payload or payload.get("typ") != "access":
        return None
    return payload.get("sub")


@router.websocket("")
async def websocket_endpoint(websocket: WebSocket):
    ip = _client_ip(websocket)

    if not _origin_allowed(websocket):
        await websocket.close(code=4403, reason="Origin not allowed")
        return

    if _rate_limited(ip):
        await websocket.close(code=4408, reason="Connection rate limit exceeded")
        return

    if manager.at_capacity():
        await websocket.close(code=4401, reason="Server at capacity")
        return

    user_id = _authenticate(websocket)
    if websocket.client_state == WebSocketState.CONNECTING and user_id is None and websocket.query_params.get("token"):
        # A token was supplied but failed validation — reject rather than
        # silently degrading to anonymous.
        await websocket.close(code=4401, reason="Invalid token")
        return

    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)
