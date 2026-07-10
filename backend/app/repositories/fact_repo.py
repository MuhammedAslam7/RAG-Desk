from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Fact


async def list_active(db: AsyncSession, org_id: str) -> list[Fact]:
    return list(
        (
            await db.execute(
                select(Fact).where(Fact.organizationId == org_id, Fact.active.is_(True))
                .order_by(Fact.subject.asc())
            )
        ).scalars().all()
    )


async def get_for_org(db: AsyncSession, fact_id: str, org_id: str) -> Fact | None:
    return (
        await db.execute(
            select(Fact).where(Fact.id == fact_id, Fact.organizationId == org_id)
        )
    ).scalars().first()


async def soft_delete(db: AsyncSession, fact: Fact) -> None:
    fact.active = False
    await db.commit()


async def update_value(db: AsyncSession, fact: Fact, value: str) -> None:
    fact.value = value.strip()
    await db.commit()