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


@router.get("/me")
async def admin_me(user: User = Depends(get_current_user)):
    """Return the current user only if they are an admin."""
    # Check 1: role must be "admin"
    if user.role != "admin":
        raise HTTPException(403, "Admin access required.")

    # Check 2: email must match the configured admin email
    admin_email = settings.ADMIN_EMAIL.strip().lower()
    if admin_email and user.email and user.email.lower() != admin_email:
        raise HTTPException(403, "Admin access required.")

    return _admin_out(user)


@router.post("/verify")
async def admin_verify(user: User = Depends(get_current_user)):
    """Lightweight endpoint to check admin status (no body returned on failure)."""
    if user.role != "admin":
        raise HTTPException(403, "Admin access required.")

    admin_email = settings.ADMIN_EMAIL.strip().lower()
    if admin_email and user.email and user.email.lower() != admin_email:
        raise HTTPException(403, "Admin access required.")

    return {"ok": True, "user": _admin_out(user)}
