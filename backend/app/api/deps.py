# backend/app/api/deps.py
from fastapi import Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models import User


async def get_current_user(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Resolve the authenticated user id (from the verified access token)
    to a User row. 401 when the account no longer exists."""
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(401, "Account not found")
    return user


async def require_org(user: User = Depends(get_current_user)) -> User:
    """Gate for any route that needs an org. 409 = frontend should onboard."""
    if user.organizationId is None:
        raise HTTPException(409, "No organization. Complete onboarding first.")
    return user


def require_role(*roles: str):
    """Gate for routes that require the user to hold one of the given roles."""
    async def _dep(user: User = Depends(require_org)) -> User:
        if user.role not in roles:
            raise HTTPException(403, "You don't have permission to do this.")
        return user
    return _dep