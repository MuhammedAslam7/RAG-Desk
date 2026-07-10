from dataclasses import dataclass
from datetime import datetime, timezone
import math

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import KnowledgeChunk, KnowledgeSource
from app.services.ai.embeddings import embed_query


@dataclass
class RankedChunk:
    content: str
    createdAt: datetime
    sourceTitle: str
    distance: float
    score: float = 0.0


async def get_relevant_chunks(
    db: AsyncSession, question: str, org_id: str
) -> list[RankedChunk]:
    q_embedding = await embed_query(question)
    stmt = (
        select(
            KnowledgeChunk.content,
            KnowledgeChunk.createdAt,
            KnowledgeSource.title.label("sourceTitle"),
            KnowledgeChunk.embedding.cosine_distance(q_embedding).label("distance"),
        )
        .join(KnowledgeSource, KnowledgeSource.id == KnowledgeChunk.knowledgeSourceId)
        .where(KnowledgeChunk.organizationId == org_id)
        .order_by("distance")
        .limit(8)
    )
    rows = (await db.execute(stmt)).all()
    return [
        RankedChunk(content=r.content, createdAt=r.createdAt,
                    sourceTitle=r.sourceTitle, distance=float(r.distance))
        for r in rows
    ]


def rank_by_relevance_and_recency(chunks: list[RankedChunk]) -> list[RankedChunk]:
    """Port of the old rankByRelevanceAndRecency scoring."""
    if not chunks:
        return []
    max_d = max(c.distance for c in chunks)
    min_d = min(c.distance for c in chunks)
    rng = (max_d - min_d) or 1.0
    now = datetime.now(timezone.utc).timestamp()
    for c in chunks:
        similarity = 1 - (c.distance - min_d) / rng
        created = c.createdAt
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        age_days = (now - created.timestamp()) / 86400
        recency_bonus = math.exp(-age_days / 30) * 0.25
        c.score = similarity + recency_bonus
    return sorted(chunks, key=lambda c: c.score, reverse=True)[:5]