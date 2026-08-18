import asyncio
from collections.abc import Callable

from firecrawl import FirecrawlApp

from app.core.config import settings
from app.services.knowledge.jobs import JobCancelledError

_app = FirecrawlApp(api_key=settings.FIRECRAWL_API_KEY)

_POLL_SECONDS = 2.0


def cancel_firecrawl_crawl(crawl_id: str) -> None:
    """Best-effort cancel of a Firecrawl job; never raises."""
    try:
        _app.cancel_crawl(crawl_id)
    except Exception as e:  # noqa: BLE001
        print("[crawl] firecrawl cancel failed:", repr(e))


def _extract_pages(result) -> list[dict]:
    """Normalize Firecrawl documents into [{title, markdown}] pages."""
    documents = getattr(result, "data", None) or []
    pages = []
    for doc in documents:
        # each doc is an object; fall back to dict access just in case
        md = getattr(doc, "markdown", None) or (doc.get("markdown") if isinstance(doc, dict) else "")
        meta = getattr(doc, "metadata", None) or (doc.get("metadata") if isinstance(doc, dict) else {}) or {}
        title = (meta.get("title") if isinstance(meta, dict) else getattr(meta, "title", None)) or ""
        if md:
            pages.append({"title": title, "markdown": md})
    return pages


def crawl_site(url: str, limit: int = 10) -> list[dict]:
    """Synchronous crawl (blocking Firecrawl v2 API). Kept for compatibility."""
    result = _app.crawl(
        url,
        limit=limit,
        scrape_options={"formats": ["markdown"]},
    )
    return _extract_pages(result)


async def crawl_site_async(
    url: str,
    limit: int = 10,
    on_progress: Callable[[int, int], None] | None = None,
    on_started: Callable[[str], None] | None = None,
    should_cancel: Callable[[], bool] | None = None,
) -> list[dict]:
    """Crawl a site via Firecrawl's async job API with progress reporting.

    ``on_progress(completed, total)`` is called on every status poll,
    ``on_started(firecrawl_job_id)`` once the crawl job exists, and
    ``should_cancel()`` is checked on each poll — when it returns True the
    Firecrawl job is cancelled and JobCancelledError is raised. The Firecrawl
    HTTP calls are synchronous, so they run in a worker thread to keep the
    event loop free.
    """
    started = await asyncio.to_thread(
        _app.start_crawl,
        url,
        limit=limit,
        scrape_options={"formats": ["markdown"]},
    )
    job_id = getattr(started, "id", None)
    if not job_id:
        raise RuntimeError("Firecrawl did not return a crawl job id")
    if on_started is not None:
        on_started(job_id)

    last = None
    while True:
        if should_cancel is not None and should_cancel():
            await asyncio.to_thread(cancel_firecrawl_crawl, job_id)
            raise JobCancelledError()
        status = await asyncio.to_thread(_app.get_crawl_status, job_id)
        last = status
        state = getattr(status, "status", "")
        completed = getattr(status, "completed", 0) or 0
        total = getattr(status, "total", 0) or 0
        if on_progress is not None:
            on_progress(completed, total)
        if state in ("completed", "failed", "cancelled"):
            break
        await asyncio.sleep(_POLL_SECONDS)

    if last is None or getattr(last, "status", "") != "completed":
        raise RuntimeError(f"Crawl ended with status: {getattr(last, 'status', 'unknown')}")
    return _extract_pages(last)
