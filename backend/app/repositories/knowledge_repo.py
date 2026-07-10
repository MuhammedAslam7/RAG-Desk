from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import KnowledgeChunk, KnowledgeSource


async def list_sources(db: AsyncSession, org_id: str) -> list[dict]:
    stmt = (
        select(
            KnowledgeSource.id, KnowledgeSource.title, KnowledgeSource.type,
            KnowledgeSource.createdAt,
            func.count(KnowledgeChunk.id).label("chunkCount"),
        )
        .outerjoin(KnowledgeChunk, KnowledgeChunk.knowledgeSourceId == KnowledgeSource.id)
        .where(KnowledgeSource.organizationId == org_id)
        .group_by(KnowledgeSource.id)
        .order_by(KnowledgeSource.createdAt.desc())
    )
    rows = (await db.execute(stmt)).all()
    return [
        {"id": r.id, "title": r.title, "type": r.type,
         "chunkCount": r.chunkCount, "createdAt": r.createdAt}
        for r in rows
    ]


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