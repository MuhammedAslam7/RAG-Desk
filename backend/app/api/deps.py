from fastapi import Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_clerk_id
from app.models import User


async def get_current_user(
    clerk_id: str = Depends(get_current_clerk_id),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Ensure a User row exists for this Clerk id. Never creates an org."""
    user = (
        await db.execute(select(User).where(User.clerkId == clerk_id))
    ).scalar_one_or_none()
    if user is None:
        user = User(clerkId=clerk_id, role="owner")
        db.add(user)
        await db.commit()
        await db.refresh(user)
    return user


async def require_org(user: User = Depends(get_current_user)) -> User:
    """Gate for any route that needs an org. 409 = frontend should onboard."""
    if user.organizationId is None:
        raise HTTPException(409, "No organization. Complete onboarding first.")
    return user