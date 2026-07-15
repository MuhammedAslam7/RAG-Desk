# backend/app/repositories/user_repo.py
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User


async def list_org_members(db: AsyncSession, org_id: str) -> list[User]:
    return list(
        (
            await db.execute(
                select(User).where(User.organizationId == org_id).order_by(User.createdAt.asc())
            )
        ).scalars().all()
    )


async def get_in_org(db: AsyncSession, user_id: str, org_id: str) -> User | None:
    return (
        await db.execute(
            select(User).where(User.id == user_id, User.organizationId == org_id)
        )
    ).scalars().first()


async def update_email(db: AsyncSession, user: User, email: str) -> None:
    if user.email != email:
        user.email = email
        await db.commit()