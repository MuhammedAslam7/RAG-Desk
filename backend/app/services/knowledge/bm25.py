"""Pure-Python BM25 keyword search over an org's knowledge chunks.

No external dependencies (rank_bm25/torch not required). The index is built
from the database once per org and cached in-process; it is invalidated via
``bump_bm25_version`` whenever chunks are added or removed.

BM25 catches exact terms — product names, error codes, SKUs — that vector
search on embeddings routinely misses, and is fused with vector search using
Reciprocal Rank Fusion in ``app.services.rag.retrieval``.
"""

import math
import re
import threading
import time

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import KnowledgeChunk, KnowledgeSource

_TOKEN_RE = re.compile(r"[a-z0-9][a-z0-9'_+-]*")


def tokenize(text: str) -> list[str]:
    """Lowercase word tokenizer. Keeps digits, underscores, apostrophes and
    hyphen/plus so codes like ``ERR_500`` or ``x86-64`` survive."""
    return _TOKEN_RE.findall((text or "").lower())


class BM25Index:
    """In-memory BM25 over a fixed corpus. k1=1.5, b=0.75 (standard defaults)."""

    def __init__(self, corpus: list[str], k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.doc_count = len(corpus)
        self._doc_freqs: list[dict[str, int]] = []
        self._doc_lengths: list[int] = []
        self._idf: dict[str, float] = {}
        self.avgdl = 0.0
        self._build(corpus)

    def _build(self, corpus: list[str]) -> None:
        df: dict[str, int] = {}
        for text in corpus:
            tokens = tokenize(text)
            self._doc_lengths.append(len(tokens))
            tf: dict[str, int] = {}
            for t in tokens:
                tf[t] = tf.get(t, 0) + 1
            self._doc_freqs.append(tf)
            for t in tf:
                df[t] = df.get(t, 0) + 1
        n = self.doc_count
        self.avgdl = (sum(self._doc_lengths) / n) if n else 0.0
        self._idf = {t: math.log(1 + (n - f + 0.5) / (f + 0.5)) for t, f in df.items()}

    def score_documents(self, query_tokens: list[str], top_k: int = 20) -> list[tuple[int, float]]:
        """Return ``(doc_index, score)`` for the top-k docs, best first."""
        if not self.doc_count or not query_tokens:
            return []
        scores = [0.0] * self.doc_count
        for qt in set(query_tokens):
            idf = self._idf.get(qt)
            if not idf:
                continue
            for i in range(self.doc_count):
                tf = self._doc_freqs[i].get(qt, 0)
                if not tf:
                    continue
                dl = self._doc_lengths[i]
                denom = tf + self.k1 * (1 - self.b + self.b * (dl / self.avgdl))
                scores[i] += idf * tf * (self.k1 + 1) / denom
        ranked = sorted(range(self.doc_count), key=lambda i: scores[i], reverse=True)
        return [(i, scores[i]) for i in ranked[:top_k] if scores[i] > 0]


# ---------------------------------------------------------------------------
# Per-org cached index
# ---------------------------------------------------------------------------

_INDEX_CACHE: dict[str, tuple[int, float, BM25Index, list[dict]]] = {}
_VERSION: dict[str, int] = {}
_LOCK = threading.Lock()
# Safety net: even if the in-process version bump is missed (e.g. another
# uvicorn worker ingested), the index is rebuilt at most every N seconds.
_TTL_SECONDS = 300


def bump_bm25_version(org_id: str) -> None:
    """Mark the org's index stale. Call after chunks are added or removed."""
    with _LOCK:
        _VERSION[org_id] = _VERSION.get(org_id, 0) + 1
        _INDEX_CACHE.pop(org_id, None)


async def get_bm25_index(db: AsyncSession, org_id: str) -> tuple[BM25Index, list[dict]]:
    """Return ``(index, docs)`` where ``docs`` is a list of chunk dicts with
    the metadata needed for retrieval (id, content, createdAt, heading,
    parentContent, sourceTitle). Docs align 1:1 with the index corpus."""
    now = time.time()
    with _LOCK:
        version = _VERSION.get(org_id, 0)
        cached = _INDEX_CACHE.get(org_id)
        if cached and cached[0] == version and now - cached[1] < _TTL_SECONDS:
            return cached[2], cached[3]

    stmt = (
        select(
            KnowledgeChunk.id,
            KnowledgeChunk.content,
            KnowledgeChunk.createdAt,
            KnowledgeChunk.heading,
            KnowledgeChunk.parentContent,
            KnowledgeSource.title.label("sourceTitle"),
        )
        .join(KnowledgeSource, KnowledgeSource.id == KnowledgeChunk.knowledgeSourceId)
        .where(KnowledgeChunk.organizationId == org_id)
    )
    rows = (await db.execute(stmt)).all()
    docs = [
        {
            "id": r.id,
            "content": r.content,
            "createdAt": r.createdAt,
            "heading": r.heading or "",
            "parentContent": r.parentContent,
            "sourceTitle": r.sourceTitle,
        }
        for r in rows
    ]
    index = BM25Index([d["content"] for d in docs])

    with _LOCK:
        _INDEX_CACHE[org_id] = (version, time.time(), index, docs)
    return index, docs
