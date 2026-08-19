# backend/app/api/v1/endpoints/admin.py
"""Admin-only authentication endpoints.

Only the account matching ADMIN_EMAIL (env) AND holding role \"admin\"
can access admin panel routes.
"""
from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_current_user
from app.core.config import settings
from app.models import User

router = APIRouter()


def _admin_out(user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "emailVerified": user.emailVerified,
        "role": user.role,
        "organizationId": user.organizationId,
    }


def _require_admin(user: User) -> None:
    """Validate that the user is an allowed admin.

    Rules:
      1. The user's role must be "admin".
      2. ADMIN_EMAIL must be configured in the environment.
      3. The user's email must match ADMIN_EMAIL.

    If ADMIN_EMAIL is not set, *all* admin access is denied to prevent
    unauthorised use of the admin panel.
    """
    if user.role != "admin":
        raise HTTPException(403, "Admin access required.")

    admin_email = settings.ADMIN_EMAIL.strip().lower()
    if not admin_email:
        raise HTTPException(403, "Admin access not configured. Set ADMIN_EMAIL in .env.")

    if not user.email or user.email.lower() != admin_email:
        raise HTTPException(403, "Admin access required.")


@router.get("/me")
async def admin_me(user: User = Depends(get_current_user)):
    """Return the current user only if they are an admin."""
    _require_admin(user)
    return _admin_out(user)


@router.post("/verify")
async def admin_verify(user: User = Depends(get_current_user)):
    """Lightweight endpoint to check admin status (no body returned on failure)."""
    _require_admin(user)
    return {"ok": True, "user": _admin_out(user)}
