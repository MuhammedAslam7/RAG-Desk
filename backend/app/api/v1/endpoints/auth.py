# backend/app/api/v1/endpoints/auth.py
"""Custom authentication endpoints (replaces Clerk).

Session model: short-lived JWT access token + long-lived opaque refresh token,
both delivered as httpOnly cookies. The refresh token is stored hashed in the
DB so sessions can be revoked. Email verification and password reset use
single-use tokens emailed through Brevo.
"""
import time
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_db
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
