# backend/app/api/v1/endpoints/auth.py
"""Custom authentication endpoints (replaces Clerk).

Session model: short-lived JWT access token + long-lived opaque refresh token,
both delivered as httpOnly cookies. The refresh token is stored hashed in the
DB so sessions can be revoked. Email verification and password reset use
single-use tokens emailed through Brevo.
"""
import base64
import hmac
import json
import secrets
import time
from datetime import datetime, timedelta, timezone
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.services.google_oauth import build_authorization_url, exchange_code, verify_id_token
from app.core.security import (
    create_refresh_token,
    hash_password,
    set_auth_cookies,
    clear_auth_cookies,
    sha256,
    verify_password,
)
from app.models import RefreshToken, User
from app.services.email import (
    send_password_reset_email,
    send_verification_email,
)

router = APIRouter()

VERIFY_TTL = timedelta(hours=24)
RESET_TTL = timedelta(hours=1)
MIN_PASSWORD_LEN = 8


# --------------------------------------------------------------------------
# Schemas
# --------------------------------------------------------------------------

class SignupRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=MIN_PASSWORD_LEN, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    password: str = Field(min_length=MIN_PASSWORD_LEN, max_length=128)


class VerifyEmailRequest(BaseModel):
    token: str


class ChangePasswordRequest(BaseModel):
    currentPassword: str
    newPassword: str = Field(min_length=MIN_PASSWORD_LEN, max_length=128)


class ProfileUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)


def _user_out(user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "emailVerified": user.emailVerified,
        "role": user.role,
        "organizationId": user.organizationId,
    }


# --------------------------------------------------------------------------
# Session helpers
# --------------------------------------------------------------------------

async def _create_session(db: AsyncSession, user_id: str, response: Response) -> None:
    """Issue a fresh access + refresh token pair and attach them as cookies."""
    token = create_refresh_token()
    db.add(
        RefreshToken(
            userId=user_id,
            tokenHash=sha256(token),
            expiresAt=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_TTL_DAYS),
        )
    )
    await db.commit()
    set_auth_cookies(response, user_id, refresh_token=token)


async def _revoke_refresh_token(db: AsyncSession, token: str | None) -> None:
    if not token:
        return
    row = (
        await db.execute(
            select(RefreshToken).where(RefreshToken.tokenHash == sha256(token))
        )
    ).scalars().first()
    if row is not None and row.revokedAt is None:
        row.revokedAt = datetime.now(timezone.utc)
        await db.commit()


async def _revoke_all_user_tokens(db: AsyncSession, user_id: str, keep: str | None = None) -> None:
    """Revoke every refresh session for a user, optionally keeping one token."""
    rows = (
        await db.execute(select(RefreshToken).where(RefreshToken.userId == user_id))
    ).scalars().all()
    now = datetime.now(timezone.utc)
    for row in rows:
        if row.revokedAt is None and row.tokenHash != (sha256(keep) if keep else None):
            row.revokedAt = now
    await db.commit()


async def _find_by_email(db: AsyncSession, email: str) -> User | None:
    return (
        await db.execute(
            select(User).where(User.email == email.lower().strip())
        )
    ).scalars().first()


# --------------------------------------------------------------------------
# Rate limiting (simple in-memory sliding window per IP)
# --------------------------------------------------------------------------

_attempts: dict[str, list[float]] = {}
_LIMIT = 10
_WINDOW = 900  # 15 minutes


def _check_rate_limit(request: Request) -> None:
    ip = request.client.host if request.client else "unknown"
    now = time.monotonic()
    bucket = _attempts.setdefault(ip, [])
    bucket[:] = [t for t in bucket if now - t < _WINDOW]
    if len(bucket) >= _LIMIT:
        raise HTTPException(429, "Too many attempts. Please try again later.")
    bucket.append(now)


# --------------------------------------------------------------------------
# Endpoints
# --------------------------------------------------------------------------

@router.post("/signup", status_code=201)
async def signup(
    body: SignupRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    _check_rate_limit(request)
    email = body.email.lower().strip()
    existing = await _find_by_email(db, email)
    if existing is not None:
        raise HTTPException(409, "An account with this email already exists.")

    user = User(
        email=email,
        name=body.name.strip(),
        passwordHash=hash_password(body.password),
        emailVerified=False,
    )
    # Single-use verification token (24h) — stored hashed.
    verify_token = create_refresh_token()  # same opaque generator
    user.emailVerifyToken = sha256(verify_token)
    user.emailVerifyExpiresAt = datetime.now(timezone.utc) + VERIFY_TTL
    db.add(user)
    await db.commit()
    await db.refresh(user)

    await send_verification_email(email, user.name, verify_token)
    return {"ok": True, "message": "Account created. Check your email to verify your address."}


@router.post("/login")
async def login(
    body: LoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    _check_rate_limit(request)
    user = await _find_by_email(db, body.email)
    if user is None or not verify_password(body.password, user.passwordHash):
        raise HTTPException(401, "Invalid email or password.")

    if not user.emailVerified:
        raise HTTPException(
            403,
            "Please verify your email address before signing in.",
            headers={"X-Auth-Error": "email_not_verified"},
        )

    await _create_session(db, user.id, response)
    return {"ok": True, "user": _user_out(user)}


@router.post("/refresh")
async def refresh(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(401, "Missing refresh token")
    row = (
        await db.execute(
            select(RefreshToken).where(RefreshToken.tokenHash == sha256(token))
        )
    ).scalars().first()
    if (
        row is None
        or row.revokedAt is not None
        or row.expiresAt.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc)
    ):
        clear_auth_cookies(response)
        raise HTTPException(401, "Session expired")

    # Rotate: revoke the old refresh token, issue a new one.
    row.revokedAt = datetime.now(timezone.utc)
    await _create_session(db, row.userId, response)
    return {"ok": True}


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    token = request.cookies.get("refresh_token")
    await _revoke_refresh_token(db, token)
    clear_auth_cookies(response)
    return {"ok": True}


@router.post("/verify-email")
async def verify_email(
    body: VerifyEmailRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    token_hash = sha256(body.token)
    user = (
        await db.execute(
            select(User).where(User.emailVerifyToken == token_hash)
        )
    ).scalars().first()
    if user is None or user.emailVerifyExpiresAt is None:
        raise HTTPException(400, "This verification link is invalid.")
    if user.emailVerifyExpiresAt.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(400, "This verification link has expired.")
    if user.emailVerified:
        # Idempotent — already verified, just sign them in.
        await _create_session(db, user.id, response)
        return {"ok": True, "user": _user_out(user)}

    user.emailVerified = True
    user.emailVerifyToken = None
    user.emailVerifyExpiresAt = None
    await db.commit()

    await _create_session(db, user.id, response)
    return {"ok": True, "user": _user_out(user)}


@router.post("/resend-verification")
async def resend_verification(
    body: ForgotPasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    _check_rate_limit(request)
    user = await _find_by_email(db, body.email)
    if user is not None and not user.emailVerified:
        token = create_refresh_token()
        user.emailVerifyToken = sha256(token)
        user.emailVerifyExpiresAt = datetime.now(timezone.utc) + VERIFY_TTL
        await db.commit()
        await send_verification_email(user.email, user.name, token)
    # Always report success to avoid leaking which emails are registered.
    return {"ok": True, "message": "If that account exists and is unverified, a new link was sent."}


@router.post("/forgot-password")
async def forgot_password(
    body: ForgotPasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    _check_rate_limit(request)
    user = await _find_by_email(db, body.email)
    if user is not None and user.emailVerified:
        token = create_refresh_token()
        user.passwordResetToken = sha256(token)
        user.passwordResetExpiresAt = datetime.now(timezone.utc) + RESET_TTL
        await db.commit()
        await send_password_reset_email(user.email, user.name, token)
    # Always report success to avoid leaking which emails are registered.
    return {"ok": True, "message": "If that account exists, a reset link is on its way."}


@router.post("/reset-password")
async def reset_password(
    body: ResetPasswordRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    token_hash = sha256(body.token)
    user = (
        await db.execute(
            select(User).where(User.passwordResetToken == token_hash)
        )
    ).scalars().first()
    if user is None or user.passwordResetExpiresAt is None:
        raise HTTPException(400, "This reset link is invalid.")
    if user.passwordResetExpiresAt.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(400, "This reset link has expired.")

    user.passwordHash = hash_password(body.password)
    user.passwordResetToken = None
    user.passwordResetExpiresAt = None
    await db.commit()

    # Revoke every session — password change invalidates old logins everywhere.
    await _revoke_all_user_tokens(db, user.id)
    clear_auth_cookies(response)
    return {"ok": True, "message": "Password updated. You can now sign in."}


@router.post("/change-password")
async def change_password(
    body: ChangePasswordRequest,
    request: Request,
    response: Response,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(body.currentPassword, user.passwordHash):
        raise HTTPException(400, "Your current password is incorrect.")
    if body.currentPassword == body.newPassword:
        raise HTTPException(400, "New password must be different from the current one.")

    user.passwordHash = hash_password(body.newPassword)
    await db.commit()
    # Keep the current session alive; kill every other one.
    await _revoke_all_user_tokens(db, user.id, keep=request.cookies.get("refresh_token"))
    return {"ok": True, "message": "Password updated."}


@router.patch("/profile")
async def update_profile(
    body: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.name is not None:
        user.name = body.name.strip()
        await db.commit()
        await db.refresh(user)
    return {"ok": True, "user": _user_out(user)}


@router.get("/me")
async def me(user: User = Depends(get_current_user)):
    return _user_out(user)


# --------------------------------------------------------------------------
# Google OAuth (Sign in with Google)
# --------------------------------------------------------------------------

OAUTH_STATE_COOKIE = "oauth_state"
OAUTH_STATE_TTL = 600  # 10 minutes


def _oauth_cookie_kwargs() -> dict:
    return {
        "httponly": True,
        "secure": settings.COOKIE_SECURE,
        "samesite": "lax",
        "domain": settings.COOKIE_DOMAIN,
        "path": "/",
    }


def _encode_oauth_state(state: str, next_url: str | None) -> str:
    raw = json.dumps({"state": state, "next": next_url}).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("ascii")


def _decode_oauth_state(value: str | None) -> dict | None:
    if not value:
        return None
    try:
        return json.loads(base64.urlsafe_b64decode(value.encode("ascii")))
    except Exception:
        return None


@router.get("/google/login")
async def google_login(
    request: Request,
    next: str | None = None,
):
    """Redirect the user to Google's consent screen."""
    _check_rate_limit(request)
    # Only allow relative paths to avoid open redirects.
    if not next or not next.startswith("/") or next.startswith("//"):
        next = None
    state = secrets.token_urlsafe(32)
    response = RedirectResponse(build_authorization_url(state))
    response.set_cookie(
        OAUTH_STATE_COOKIE,
        _encode_oauth_state(state, next),
        max_age=OAUTH_STATE_TTL,
        **_oauth_cookie_kwargs(),
    )
    return response


@router.get("/google/callback")
async def google_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Google redirects here after consent. Verify state, exchange the code,
    find-or-create the user (linking by verified email when possible), then
    issue a normal session and send the browser back to the frontend."""
    frontend = settings.FRONTEND_ORIGIN.rstrip("/")
    cookie_kwargs = _oauth_cookie_kwargs()

    def _fail(reason: str) -> RedirectResponse:
        resp = RedirectResponse(f"{frontend}/oauth/callback?error={quote(reason)}")
        resp.delete_cookie(OAUTH_STATE_COOKIE, **cookie_kwargs)
        return resp

    payload = _decode_oauth_state(request.cookies.get(OAUTH_STATE_COOKIE))
    if (
        payload is None
        or not isinstance(payload.get("state"), str)
        or not state
        or not hmac.compare_digest(payload["state"], state)
    ):
        return _fail("invalid_state")

    response = RedirectResponse(
        f"{frontend}/oauth/callback?next={quote(payload.get('next') or '/overview')}"
    )
    response.delete_cookie(OAUTH_STATE_COOKIE, **cookie_kwargs)

    if error or not code:
        # User cancelled / Google denied — go back to sign-in quietly.
        return RedirectResponse(f"{frontend}/sign-in")

    try:
        tokens = await exchange_code(code)
        claims = await verify_id_token(tokens["id_token"], tokens.get("access_token"))
    except Exception as e:
        print("Google OAuth callback failed:", repr(e))
        return _fail("google_error")

    google_id = claims.get("sub")
    if not google_id:
        return _fail("google_error")

    email = claims.get("email")
    email_verified = bool(claims.get("email_verified"))
    name = (claims.get("name") or "").strip() or ((email or "").split("@")[0] or "User")

    user = (
        await db.execute(select(User).where(User.googleId == google_id))
    ).scalars().first()

    if user is None and email and email_verified:
        # Same verified email on an existing password account → link them.
        user = await _find_by_email(db, email)
        if user is not None:
            user.googleId = google_id
            user.emailVerified = True
            if not user.name:
                user.name = name

    if user is None:
        user = User(
            googleId=google_id,
            email=email.lower() if email_verified else None,
            name=name,
            emailVerified=email_verified,
        )
        db.add(user)

    await db.commit()
    await db.refresh(user)
    await _create_session(db, user.id, response)
    return response
