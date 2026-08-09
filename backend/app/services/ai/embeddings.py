import asyncio
import random
import re
import threading
import time
from collections import OrderedDict

from google import genai
from google.genai import errors as genai_errors

from app.core.config import settings

_client = genai.Client(api_key=settings.GOOGLE_GENERATIVE_AI_API_KEY)


class EmbeddingRateLimitError(Exception):
    """Raised when the embedding API stays rate-limited after all retries."""

    def __init__(self, retry_after: float = 0.0):
        self.retry_after = retry_after
        super().__init__(f"Embedding API rate limit exceeded (retry after ~{retry_after:.0f}s)")


# ---------------------------------------------------------------------------
# Pacing — Gemini's free tier allows ~100 embed_content calls/minute/model.
# A token bucket in front of every request keeps the whole process safely
# under that ceiling (the bucket starts full for an instant burst, then
# refills at EMBED_RATE_PER_MIN/minute).
# ---------------------------------------------------------------------------

class _TokenBucket:
    def __init__(self, rate_per_min: int):
        self.rate = max(1.0, float(rate_per_min))
        self.capacity = self.rate
        self.tokens = self.capacity
        self.updated = time.monotonic()
        self.lock = asyncio.Lock()

    async def acquire(self) -> None:
        while True:
            async with self.lock:
                now = time.monotonic()
                elapsed = now - self.updated
                self.tokens = min(self.capacity, self.tokens + elapsed * self.rate / 60.0)
                self.updated = now
                if self.tokens >= 1.0:
                    self.tokens -= 1.0
                    return
                wait = (1.0 - self.tokens) * 60.0 / self.rate
            await asyncio.sleep(max(wait, 0.02))


_LIMITER: _TokenBucket | None = None
_LIMITER_GUARD = threading.Lock()


def _get_limiter() -> _TokenBucket:
    global _LIMITER
    if _LIMITER is None:
        with _LIMITER_GUARD:
            if _LIMITER is None:
                _LIMITER = _TokenBucket(settings.EMBED_RATE_PER_MIN)
    return _LIMITER


# ---------------------------------------------------------------------------
# LRU dedupe cache — repeated paragraphs/chunks (very common in pasted text,
# FAQs, crawled pages) embed once and are reused within the process.
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
# Retry with backoff — honors the server's retryDelay for 429s and uses
# exponential backoff (with jitter) for transient 5xx / network errors.
# ---------------------------------------------------------------------------

_RETRY_DELAY_RE = re.compile(r"retryDelay['\"]?\s*:\s*['\"]([\d.]+)s['\"]")


def _retry_delay_from(exc: Exception) -> float:
    m = _RETRY_DELAY_RE.search(str(exc))
    try:
        return float(m.group(1)) if m else 0.0
    except (ValueError, AttributeError):
        return 0.0


async def _embed_with_retry(task_type: str, text: str) -> list[float]:
    key = _cache_key(task_type, text)
    cached = _cache_get(key)
    if cached is not None:
        return cached

    limiter = _get_limiter()
    last_exc: Exception | None = None

    for attempt in range(settings.EMBED_RETRY_MAX + 1):
        await limiter.acquire()
        try:
            result = await _client.aio.models.embed_content(
                model=settings.EMBED_MODEL,
                contents=text,
                config={
                    "task_type": task_type,
                    "output_dimensionality": settings.EMBED_DIM,
                },
            )
            embedding = list(result.embeddings[0].values)
            _cache_set(key, embedding)
            return embedding
        except genai_errors.ClientError as e:
            if e.status_code == 429:
                last_exc = e
                delay = _retry_delay_from(e) or 20.0
            elif 500 <= e.status_code < 600:
                last_exc = e
                delay = float(2 ** attempt)
            else:
                raise  # auth/config errors — no point retrying
        except Exception as e:  # noqa: BLE001 — network timeouts, etc.
            last_exc = e
            delay = float(2 ** attempt)

        jitter = delay * (0.8 + random.random() * 0.4)
        print(f"[embed] {type(last_exc).__name__} ({last_exc}); retry {attempt + 1}/{settings.EMBED_RETRY_MAX} in {jitter:.0f}s")
        await asyncio.sleep(min(jitter, 60.0))

    if last_exc is None:  # defensive — unreachable, but keeps the invariant explicit
        raise RuntimeError("embedding retry loop exhausted without a failure")
    if isinstance(last_exc, genai_errors.ClientError) and last_exc.status_code == 429:
        raise EmbeddingRateLimitError(_retry_delay_from(last_exc)) from last_exc
    raise last_exc


async def embed_query(text: str) -> list[float]:
    """Embed a search query (RETRIEVAL_QUERY task type)."""
    return await _embed_with_retry("RETRIEVAL_QUERY", text)


async def embed_document(text: str) -> list[float]:
    """Embed a document chunk (RETRIEVAL_DOCUMENT task type)."""
    return await _embed_with_retry("RETRIEVAL_DOCUMENT", text)


async def embed_documents(texts: list[str], concurrency: int | None = None) -> list[list[float]]:
    """Embed many texts in parallel (capped), pacing each request under the
    per-minute quota. Used for the micro-unit embeddings that drive semantic
    chunking and for batched storage embeddings."""
    if not texts:
        return []
    limit = concurrency or settings.EMBED_MAX_CONCURRENCY
    sem = asyncio.Semaphore(limit)

    async def one(text: str) -> list[float]:
        async with sem:
            return await embed_document(text)

    return list(await asyncio.gather(*(one(t) for t in texts)))
