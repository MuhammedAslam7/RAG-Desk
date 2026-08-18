"""Local embedding service using Qwen3-Embedding-0.6B via sentence-transformers.

No external API, no rate limit, no per-token cost. The model is loaded lazily
(first request) and truncated to EMBED_DIM via Matryoshka Representation
Learning, so it drops into the existing 768-dim pgvector column unchanged.

Encoding is CPU/GPU-bound synchronous work, so every call runs inside
asyncio.to_thread to avoid blocking the event loop — same pattern already
used for the cross-encoder reranker in app/services/rag/rerank.py.
"""

import asyncio
import threading
from collections import OrderedDict
from collections.abc import Callable
from functools import lru_cache

from app.core.config import settings


class EmbeddingRateLimitError(Exception):
    """Kept only for API compatibility with callers (e.g. main.py's exception
    handler). A local model has no external quota, so this should not fire
    in normal operation — it's retained in case model loading itself fails
    repeatedly (e.g. out of memory) and callers want a distinct error type."""

    def __init__(self, retry_after: float = 0.0):
        self.retry_after = retry_after
        super().__init__(f"Local embedding model unavailable (retry after ~{retry_after:.0f}s)")


# ---------------------------------------------------------------------------
# Lazy model load — first call pays the cost (weights download + load into
# memory), every call after reuses the cached instance.
# ---------------------------------------------------------------------------

@lru_cache(maxsize=1)
def _load_model():
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(
        settings.EMBED_MODEL,
        truncate_dim=settings.EMBED_DIM,
        device=settings.EMBED_DEVICE,
    )


_LOAD_LOCK: asyncio.Lock | None = None
_ENCODE_LOCK: asyncio.Lock | None = None
_LOCK_GUARD = threading.Lock()


def _locks() -> tuple[asyncio.Lock, asyncio.Lock]:
    """Create the locks lazily so they bind to the event loop that actually
    uses them, matching the pattern in rerank.py."""
    global _LOAD_LOCK, _ENCODE_LOCK
    with _LOCK_GUARD:
        if _LOAD_LOCK is None:
            _LOAD_LOCK = asyncio.Lock()
            _ENCODE_LOCK = asyncio.Lock()
    return _LOAD_LOCK, _ENCODE_LOCK


def _encode_query_sync(model, texts: list[str]) -> list[list[float]]:
    vectors = model.encode(
        texts,
        prompt_name="query",         # Qwen3's built-in retrieval-query instruction
        batch_size=settings.EMBED_BATCH_SIZE,
        normalize_embeddings=True,
        show_progress_bar=False,
    )
    return [v.tolist() for v in vectors]


def _encode_document_sync(model, texts: list[str]) -> list[list[float]]:
    vectors = model.encode(
        texts,                       # no prompt for documents — asymmetric retrieval
        batch_size=settings.EMBED_BATCH_SIZE,
        normalize_embeddings=True,
        show_progress_bar=False,
    )
    return [v.tolist() for v in vectors]


# ---------------------------------------------------------------------------
# LRU dedupe cache — unchanged in spirit from the Gemini version. Repeated
# paragraphs (FAQs, crawled pages) embed once and are reused within the
# process.
# ---------------------------------------------------------------------------

_CACHE: OrderedDict[str, list[float]] = OrderedDict()


def _cache_key(task_type: str, text: str) -> str:
    return f"{task_type}\x00{text}"


def _cache_get(key: str) -> list[float] | None:
    value = _CACHE.pop(key, None)
    if value is not None:
        _CACHE[key] = value  # refresh LRU position
    return value


def _cache_set(key: str, value: list[float]) -> None:
    _CACHE[key] = value
    if len(_CACHE) > settings.EMBED_CACHE_MAX:
        _CACHE.popitem(last=False)


# ---------------------------------------------------------------------------
# Public API — same names/signatures as the Gemini and Ollama versions, so
# ingest.py and retrieval.py need no changes.
# ---------------------------------------------------------------------------

async def embed_query(text: str) -> list[float]:
    """Embed a single search query."""
    key = _cache_key("query", text)
    cached = _cache_get(key)
    if cached is not None:
        return cached

    load_lock, encode_lock = _locks()
    async with load_lock:
        model = await asyncio.to_thread(_load_model)
    async with encode_lock:
        result = await asyncio.to_thread(_encode_query_sync, model, [text])

    embedding = result[0]
    _cache_set(key, embedding)
    return embedding


async def embed_document(text: str) -> list[float]:
    """Embed a single document chunk."""
    results = await embed_documents([text])
    return results[0]


async def embed_documents(
    texts: list[str],
    concurrency: int | None = None,
    on_progress: Callable[[int, int], None] | None = None,
) -> list[list[float]]:
    """Embed many texts. Unlike the API-based versions, this does NOT fan
    out into N concurrent requests — it batches everything into as few
    model.encode() calls as possible, which is far more efficient for a
    local model than issuing many small calls. `concurrency` is accepted
    for signature compatibility but unused. `on_progress(done, total)` is
    called after each model batch so callers can render a progress bar."""
    if not texts:
        return []

    # Split into cached vs. uncached up front so identical repeated chunks
    # (common in FAQs / crawled pages) never touch the model at all.
    keys = [_cache_key("document", t) for t in texts]
    cached = [_cache_get(k) for k in keys]
    to_embed_idx = [i for i, c in enumerate(cached) if c is None]

    if to_embed_idx:
        load_lock, encode_lock = _locks()
        async with load_lock:
            model = await asyncio.to_thread(_load_model)
        async with encode_lock:
            to_embed = [texts[i] for i in to_embed_idx]
            fresh: list[list[float]] = []
            done = 0
            for start in range(0, len(to_embed), settings.EMBED_BATCH_SIZE):
                batch = to_embed[start : start + settings.EMBED_BATCH_SIZE]
                fresh.extend(await asyncio.to_thread(_encode_document_sync, model, batch))
                done += len(batch)
                if on_progress is not None:
                    on_progress(done, len(to_embed))
        for idx, vec in zip(to_embed_idx, fresh):
            cached[idx] = vec
            _cache_set(keys[idx], vec)

    return cached  # type: ignore[return-value]