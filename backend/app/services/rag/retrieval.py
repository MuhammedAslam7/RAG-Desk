"""Hybrid retrieval: vector search + BM25, fused with Reciprocal Rank Fusion,
then re-ranked by a cross-encoder, then tie-broken by recency.

Pipeline
--------
1. Vector search  — pgvector cosine distance over chunk embeddings (top 20)
2. BM25 keyword  — exact-term scoring over the same chunks (top 20)
3. RRF fusion    — merge both ranked lists (parent-child siblings kept)
4. Cross-encoder — re-score the fused top-12 against the actual question
5. Recency       — gentle bonus for newer entries, then return top-k

Because chunks are children of larger sections, the returned ``RankedChunk``
carries the section text in ``parentContent`` so the LLM gets full context.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
import math

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import KnowledgeChunk, KnowledgeSource
from app.services.ai.embeddings import embed_query
from app.services.knowledge.bm25 import get_bm25_index, tokenize
from app.services.rag.rerank import cross_encoder_available, rerank


@dataclass
class RankedChunk:
    content: str
    createdAt: datetime
    sourceTitle: str
    distance: float
    parentContent: str | None = None
    heading: str = ""
    fusionScore: float = 0.0
    rerankScore: float | None = None
    score: float = 0.0


# ---------------------------------------------------------------------------
# Candidate sources
# ---------------------------------------------------------------------------

async def _vector_candidates(
    db: AsyncSession, question: str, org_id: str, limit: int
) -> list[dict]:
    q_embedding = await embed_query(question)
    stmt = (
        select(
            KnowledgeChunk.id,
            KnowledgeChunk.content,
            KnowledgeChunk.createdAt,
            KnowledgeChunk.heading,
            KnowledgeChunk.parentContent,
            KnowledgeSource.title.label("sourceTitle"),
            KnowledgeChunk.embedding.cosine_distance(q_embedding).label("distance"),
        )
        .join(KnowledgeSource, KnowledgeSource.id == KnowledgeChunk.knowledgeSourceId)
        .where(KnowledgeChunk.organizationId == org_id)
        .order_by("distance")
        .limit(limit)
    )
    rows = (await db.execute(stmt)).all()
    return [
        {
            "id": r.id,
            "content": r.content,
            "createdAt": r.createdAt,
            "heading": r.heading or "",
            "parentContent": r.parentContent,
            "sourceTitle": r.sourceTitle,
            "distance": float(r.distance),
        }
        for r in rows
    ]


async def _bm25_candidates(
    db: AsyncSession, question: str, org_id: str, limit: int
) -> list[tuple[int, dict, float]]:
    """Return ``(corpus_index, doc, score)`` for the top BM25 hits, best first."""
    index, docs = await get_bm25_index(db, org_id)
    hits = index.score_documents(tokenize(question), top_k=limit)
    return [(i, docs[i], score) for i, score in hits]


# ---------------------------------------------------------------------------
# Fusion, rerank, finalize
# ---------------------------------------------------------------------------

def _rrf_fusion(
    vector_rows: list[dict],
    bm25_hits: list[tuple[int, dict, float]],
    k: int = 60,
) -> list[tuple[str, float]]:
    """Reciprocal Rank Fusion over the two ranked lists."""
    fused: dict[str, float] = {}
    for rank, row in enumerate(vector_rows):
        fused[row["id"]] = fused.get(row["id"], 0.0) + 1.0 / (k + rank + 1)
    for rank, (_, doc, _) in enumerate(bm25_hits):
        fused[doc["id"]] = fused.get(doc["id"], 0.0) + 1.0 / (k + rank + 1)
    return sorted(fused.items(), key=lambda kv: kv[1], reverse=True)


_RERANK_UNAVAILABLE_WARNED = False


async def _rerank_candidates(question: str, candidates: list[RankedChunk]) -> None:
    """In-place: fill ``rerankScore`` for each candidate. Never raises."""
    global _RERANK_UNAVAILABLE_WARNED
    if not candidates:
        return
    if not cross_encoder_available():
        if not _RERANK_UNAVAILABLE_WARNED:
            _RERANK_UNAVAILABLE_WARNED = True
            print(
                "[retrieval] sentence-transformers not installed — cross-encoder "
                "reranking is OFF (keeping fusion order). Run `pip install -e .` "
                "in backend/ to enable it."
            )
        return
    try:
        scores = await rerank(question, [{"content": c.content} for c in candidates])
    except Exception as e:  # noqa: BLE001
        print(f"[retrieval] rerank failed ({e!r}); keeping fusion order")
        return
    for c, s in zip(candidates, scores):
        c.rerankScore = s


def _finalize(candidates: list[RankedChunk], top_k: int) -> list[RankedChunk]:
    if not candidates:
        return []
    now = datetime.now(timezone.utc).timestamp()
    for c in candidates:
        created = c.createdAt
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        age_days = max(0.0, (now - created.timestamp()) / 86400)
        recency = math.exp(-age_days / 30.0)
        if c.rerankScore is not None:
            c.score = c.rerankScore + recency * 0.02
        else:
            c.score = c.fusionScore + recency * 0.004
    ordered = sorted(candidates, key=lambda c: c.score, reverse=True)

    # Sibling children of the same parent section would feed the LLM near-identical
    # parent text twice — keep only the best child per parent.
    seen: set[str] = set()
    out: list[RankedChunk] = []
    for c in ordered:
        key = c.content
        if key in seen:
            continue
        seen.add(key)
        out.append(c)
        if len(out) >= top_k:
            break
    return out


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def retrieve_relevant_chunks(
    db: AsyncSession,
    question: str,
    org_id: str,
    top_k: int | None = None,
) -> list[RankedChunk]:
    """Hybrid retrieval with reranking. Each stage degrades independently —
    vector failure falls back to BM25 and vice versa; rerank failure keeps the
    fusion order — so a single flaky service can never kill chat."""
    top_k = top_k or settings.RERANK_TOP_K
    question = (question or "").strip()
    if not question:
        return []

    vector_rows: list[dict] = []
    bm25_hits: list[tuple[int, dict, float]] = []
    try:
        vector_rows = await _vector_candidates(db, question, org_id, settings.VECTOR_CANDIDATES)
    except Exception as e:  # noqa: BLE001
        print(f"[retrieval] vector search failed ({e!r}); BM25 only")
    try:
        bm25_hits = await _bm25_candidates(db, question, org_id, settings.BM25_CANDIDATES)
    except Exception as e:  # noqa: BLE001
        print(f"[retrieval] BM25 failed ({e!r}); vector only")

    if not vector_rows and not bm25_hits:
        return []

    fused = _rrf_fusion(vector_rows, bm25_hits, settings.RRF_K)

    meta: dict[str, dict] = {row["id"]: row for row in vector_rows}
    for _, doc, _ in bm25_hits:
        meta.setdefault(doc["id"], doc)

    candidates: list[RankedChunk] = []
    for chunk_id, fus_score in fused[: settings.FUSION_CANDIDATES]:
        m = meta.get(chunk_id)
        if m is None:
            continue
        candidates.append(
            RankedChunk(
                content=m["content"],
                createdAt=m["createdAt"],
                sourceTitle=m["sourceTitle"],
                distance=float(m.get("distance", 1.0)),
                parentContent=m.get("parentContent"),
                heading=m.get("heading", ""),
                fusionScore=fus_score,
            )
        )
    print(f"[retrieval-debug] {len(candidates)} candidates before dedup, question={question!r}")
    for c in candidates:
        parent_preview = (c.parentContent or "")[:60]
        print(f"    fusion={c.fusionScore:.4f} heading={c.heading!r} parent={parent_preview!r} child={c.content[:60]!r}")
    # --- END TEMP DEBUG ---

    await _rerank_candidates(question, candidates)
    return _finalize(candidates, top_k)
