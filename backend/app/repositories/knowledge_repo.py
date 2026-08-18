from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import KnowledgeChunk, KnowledgeSource, User


async def list_sources(
    db: AsyncSession, org_id: str, limit: int = 20, offset: int = 0
) -> list[dict]:
    added_by_name = (
        select(func.coalesce(User.name, User.email))
        .where(User.id == KnowledgeSource.addedById)
        .scalar_subquery()
    )
    stmt = (
        select(
            KnowledgeSource.id, KnowledgeSource.title, KnowledgeSource.type,
            KnowledgeSource.createdAt,
            func.count(KnowledgeChunk.id).label("chunkCount"),
            added_by_name.label("addedBy"),
        )
        .outerjoin(KnowledgeChunk, KnowledgeChunk.knowledgeSourceId == KnowledgeSource.id)
        .where(KnowledgeSource.organizationId == org_id)
        .group_by(KnowledgeSource.id)
        .order_by(KnowledgeSource.createdAt.desc())
        .limit(limit)
        .offset(offset)
    )
    rows = (await db.execute(stmt)).all()
    return [
        {"id": r.id, "title": r.title, "type": r.type,
         "chunkCount": r.chunkCount, "createdAt": r.createdAt, "addedBy": r.addedBy}
        for r in rows
    ]


async def count_sources(db: AsyncSession, org_id: str) -> int:
    return (
        await db.execute(
            select(func.count(KnowledgeSource.id)).where(
                KnowledgeSource.organizationId == org_id
            )
        )
    ).scalar_one()


async def get_source_for_org(
    db: AsyncSession, source_id: str, org_id: str
) -> KnowledgeSource | None:
    return (
        await db.execute(
            select(KnowledgeSource).where(
                KnowledgeSource.id == source_id,
                KnowledgeSource.organizationId == org_id,
            )
        )
    ).scalars().first()


async def delete_source(db: AsyncSession, source: KnowledgeSource) -> None:
    await db.delete(source)   # cascade deletes chunks
    await db.commit()