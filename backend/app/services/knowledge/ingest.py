from sqlalchemy.ext.asyncio import AsyncSession

from app.models import KnowledgeChunk, KnowledgeSource
from app.services.ai.embeddings import embed_documents
from app.services.knowledge.bm25 import bump_bm25_version
from app.services.knowledge.chunk import chunk_document


async def ingest_document(
    db: AsyncSession, *, org_id: str, title: str, text: str, source_type: str = "text"
) -> KnowledgeSource:
    source = KnowledgeSource(title=title, type=source_type, organizationId=org_id)
    db.add(source)
    await db.flush()

    # Semantic chunking: long sections are split with embedding-based topic
    # detection. Micro-unit embeddings are reused when a child chunk is exactly
    # one micro-unit, so we never embed the same text twice; everything else is
    # embedded in one batched call.
    chunks = await chunk_document(text, embed_fn=embed_documents)

    to_embed = [c for c in chunks if c.embedding is None]
    embedded = await embed_documents([c.content for c in to_embed]) if to_embed else []
    # key by id(): Chunk is a mutable dataclass and therefore unhashable
    embedding_by_chunk = {id(c): e for c, e in zip(to_embed, embedded)}

    for c in chunks:
        db.add(KnowledgeChunk(
        content=c.content,
        embedding=c.embedding if c.embedding is not None else embedding_by_chunk[id(c)],
        organizationId=org_id,
        knowledgeSourceId=source.id,
        parentContent=c.parent_content or c.content,
        heading=c.heading or None,
    ))

    await db.commit()
    await db.refresh(source)

    # The keyword index changed — drop the cached BM25 index for this org.
    bump_bm25_version(org_id)
    return source
