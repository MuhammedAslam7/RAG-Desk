# backend/app/services/google_oauth.py
"""Sign in with Google — OAuth 2.0 authorization-code flow.

The backend acts as the OAuth client: it redirects the user to Google's
consent screen, receives the authorization code on the callback route, and
exchanges it for an ID token. The ID token is verified against Google's
public keys (JWKS, RS256) — checking signature, issuer and audience — before
a local session is created.
"""
from urllib.parse import urlencode

import httpx
from jose import jwt as jose_jwt

from app.core.config import settings

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs"
GOOGLE_ISSUERS = (
    "https://accounts.google.com",
    "https://accounts.google.com/.well-known/openid-configuration",
)


def build_authorization_url(state: str) -> str:
    """Build the consent-screen URL. `state` is bound to a cookie so the
    callback can verify the request isn't a forged cross-site redirect."""
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "prompt": "select_account",
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


async def exchange_code(code: str) -> dict:
    """Swap the authorization code for tokens (includes the ID token)."""
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
            headers={"Accept": "application/json"},
        )
        resp.raise_for_status()
        return resp.json()


async def verify_id_token(id_token: str) -> dict:
    """Verify a Google ID token (signature, issuer, audience) and return its claims."""
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(GOOGLE_CERTS_URL)
        resp.raise_for_status()
        jwks = resp.json()
    return jose_jwt.decode(
        id_token,
        jwks,
        algorithms=["RS256"],
        audience=settings.GOOGLE_CLIENT_ID,
        issuer=list(GOOGLE_ISSUERS),
    )
