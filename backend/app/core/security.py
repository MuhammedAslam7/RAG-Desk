import time

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt

from app.core.config import settings

bearer = HTTPBearer(auto_error=False)

_jwks_cache: dict = {"keys": None, "fetched_at": 0.0}
_JWKS_TTL = 3600


async def _get_jwks() -> dict:
    now = time.time()
    if _jwks_cache["keys"] and (now - _jwks_cache["fetched_at"]) < _JWKS_TTL:
        return _jwks_cache["keys"]
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(settings.CLERK_JWKS_URL)
        resp.raise_for_status()
        keys = resp.json()
    _jwks_cache["keys"] = keys
    _jwks_cache["fetched_at"] = now
    return keys


async def get_current_clerk_id(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> str:
    """Verify a Clerk session JWT; return the clerk user id (`sub`)."""
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    try:
        jwks = await _get_jwks()
        claims = jwt.decode(
            creds.credentials, jwks, algorithms=["RS256"],
            options={"verify_aud": False},
        )
        return claims["sub"]
    except Exception:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")