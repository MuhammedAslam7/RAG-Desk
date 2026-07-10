from sqlalchemy.ext.asyncio import AsyncSession

from app.models import KnowledgeChunk, KnowledgeSource
from app.services.ai.embeddings import embed_document
from app.services.knowledge.chunk import chunk_text


async def ingest_document(
    db: AsyncSession, *, org_id: str, title: str, text: str, source_type: str = "text"
) -> KnowledgeSource:
    source = KnowledgeSource(title=title, type=source_type, organizationId=org_id)
    db.add(source)
    await db.flush()

    for piece in chunk_text(text):
        embedding = await embed_document(piece)
        db.add(KnowledgeChunk(
            content=piece, embedding=embedding,
            organizationId=org_id, knowledgeSourceId=source.id,
        ))
    await db.commit()
    await db.refresh(source)
    return source