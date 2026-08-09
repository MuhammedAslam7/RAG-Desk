"""Cross-encoder reranker for the retrieval stage.

Embeds-only similarity is noisy; a small cross-encoder re-scores the ~12 fused
candidates so the final top-k reflects actual query-document relevance rather
than raw embedding proximity.

The model is loaded lazily (first request) and runs inside a thread so the
async event loop is never blocked. If ``sentence-transformers`` is not
installed or the model fails to load, ``rerank`` raises and the caller keeps
the fusion order — retrieval degrades gracefully, it never fails hard.
"""

import asyncio
import threading
from functools import lru_cache

from app.core.config import settings


def cross_encoder_available() -> bool:
    try:
        import sentence_transformers  # noqa: F401
        return True
    except ImportError:
        return False


@lru_cache(maxsize=1)
def _load_model():
    from sentence_transformers import CrossEncoder

    return CrossEncoder(settings.RERANKER_MODEL)


def _predict(model, pairs: list[tuple[str, str]]):
    """Score pairs with a sigmoid so results land in (0, 1).

    sentence-transformers v5 renamed ``apply_sigmoid`` to ``activation_fn``;
    we pass whichever the installed version understands."""
    import torch

    try:
        return model.predict(pairs, activation_fn=torch.nn.Sigmoid())
    except TypeError:
        return model.predict(pairs, apply_sigmoid=True)


_LOAD_LOCK: asyncio.Lock | None = None
_PREDICT_LOCK: asyncio.Lock | None = None
_LOCK_GUARD = threading.Lock()


def _locks() -> tuple[asyncio.Lock, asyncio.Lock]:
    """Create the locks lazily so they bind to the event loop that actually
    uses them (a module-level Lock would bind to the first loop that awaits
    it, which is fragile across reloads/tests). A threading lock guards the
    one-time creation against concurrent first calls."""
    global _LOAD_LOCK, _PREDICT_LOCK
    with _LOCK_GUARD:
        if _LOAD_LOCK is None:
            _LOAD_LOCK = asyncio.Lock()
            _PREDICT_LOCK = asyncio.Lock()
    return _LOAD_LOCK, _PREDICT_LOCK


async def rerank(question: str, candidates: list[dict]) -> list[float]:
    """Return a relevance score (0..1) for each candidate (aligned order).

    ``candidates`` is a list of dicts with at least a ``content`` key — we
    score the small child chunks, not the parents (parents can exceed the
    cross-encoder's token window).
    """
    if not candidates:
        return []

    load_lock, predict_lock = _locks()

    async with load_lock:
        model = await asyncio.to_thread(_load_model)

    pairs = [(question, c.get("content") or "") for c in candidates]

    async with predict_lock:
        scores = await asyncio.to_thread(_predict, model, pairs)

    return [float(s) for s in scores]
