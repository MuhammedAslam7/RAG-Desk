from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Fact


async def get_active_facts(db: AsyncSession, org_id: str) -> list[dict]:
    rows = (
        await db.execute(
            select(Fact).where(Fact.organizationId == org_id, Fact.active.is_(True))
            .order_by(Fact.subject.asc())
        )
    ).scalars().all()
    return [{"subject": f.subject, "value": f.value} for f in rows]


async def upsert_facts(db: AsyncSession, items: list[dict], org_id: str) -> None:
    """Deactivate existing facts with the same subject, then insert new ones."""
    for item in items:
        subject = item["subject"].lower().strip()
        existing = (
            await db.execute(
                select(Fact).where(
                    Fact.organizationId == org_id,
                    Fact.subject == subject,
                    Fact.active.is_(True),
                )
            )
        ).scalars().all()
        for f in existing:
            f.active = False
        db.add(Fact(subject=subject, value=item["value"].strip(),
                    organizationId=org_id, active=True))
    await db.commit()