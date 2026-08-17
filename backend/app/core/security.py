# backend/app/core/security.py
"""Custom authentication: bcrypt password hashing + short-lived JWT access
tokens. Access and refresh tokens are delivered as httpOnly cookies; the
refresh token is stored (hashed) in the DB so sessions can be revoked.
"""
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt

from app.core.config import settings

bearer = HTTPBearer(auto_error=False)

ACCESS_TOKEN_COOKIE = "access_token"
REFRESH_TOKEN_COOKIE = "refresh_token"


# --------------------------------------------------------------------------
# Passwords
# --------------------------------------------------------------------------

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(password: str, password_hash: str | None) -> bool:
    if not password_hash:
        return False
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


# --------------------------------------------------------------------------
# Tokens
# --------------------------------------------------------------------------

def _now() -> datetime:
    return datetime.now(timezone.utc)


def sha256(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_access_token(user_id: str) -> str:
    now = _now()
    payload = {
        "sub": user_id,
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=settings.ACCESS_TOKEN_TTL_MINUTES)).timestamp()),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token() -> str:
    """Opaque random token; only its sha256 hash is persisted."""
    return secrets.token_urlsafe(48)


def decode_access_token(token: str) -> str | None:
    """Return the user id if the token is a valid, unexpired access token."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except Exception:
        return None
    if payload.get("type") != "access":
        return None
    return payload.get("sub")


# --------------------------------------------------------------------------
# Cookie helpers
# --------------------------------------------------------------------------

def _cookie_kwargs() -> dict:
    return {
        "httponly": True,
        "secure": settings.COOKIE_SECURE,
        "samesite": "lax",
        "domain": settings.COOKIE_DOMAIN,
        "path": "/",
    }


def set_auth_cookies(response, user_id: str, refresh_token: str | None = None) -> None:
    """Attach access (+refresh) cookies to a response. Pass refresh_token=None
    to only set a fresh access token (e.g. after a silent refresh)."""
    response.set_cookie(
        ACCESS_TOKEN_COOKIE,
        create_access_token(user_id),
        max_age=settings.ACCESS_TOKEN_TTL_MINUTES * 60,
        **_cookie_kwargs(),
    )
    if refresh_token:
        response.set_cookie(
            REFRESH_TOKEN_COOKIE,
            refresh_token,
            max_age=settings.REFRESH_TOKEN_TTL_DAYS * 24 * 3600,
            **_cookie_kwargs(),
        )


def clear_auth_cookies(response) -> None:
    response.delete_cookie(ACCESS_TOKEN_COOKIE, **_cookie_kwargs())
    response.delete_cookie(REFRESH_TOKEN_COOKIE, **_cookie_kwargs())


# --------------------------------------------------------------------------
# FastAPI dependency
# --------------------------------------------------------------------------

def get_access_token(
    request: Request,
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> str | None:
    """Accept the access token from the Authorization header or the cookie."""
    if creds is not None:
        return creds.credentials
    return request.cookies.get(ACCESS_TOKEN_COOKIE)


def get_current_user_id(
    token: str | None = Depends(get_access_token),
) -> str:
    """Verify the access token and return the user id. 401 when missing/invalid."""
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    user_id = decode_access_token(token)
    if user_id is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    return user_id