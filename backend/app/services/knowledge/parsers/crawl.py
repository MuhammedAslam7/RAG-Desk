from firecrawl import FirecrawlApp

from app.core.config import settings

_app = FirecrawlApp(api_key=settings.FIRECRAWL_API_KEY)


def crawl_site(url: str, limit: int = 10) -> list[dict]:
    """Return a list of {title, markdown} pages. Firecrawl v2 API."""
    result = _app.crawl(
        url,
        limit=limit,
        scrape_options={"formats": ["markdown"]},
    )

    # v2 returns an object with `.data` (list of documents), not a dict
    documents = getattr(result, "data", None) or []

    pages = []
    for doc in documents:
        # each doc is an object; fall back to dict access just in case
        md = getattr(doc, "markdown", None) or (doc.get("markdown") if isinstance(doc, dict) else "")
        meta = getattr(doc, "metadata", None) or (doc.get("metadata") if isinstance(doc, dict) else {}) or {}
        title = (meta.get("title") if isinstance(meta, dict) else getattr(meta, "title", None)) or url
        if md:
            pages.append({"title": title, "markdown": md})
    return pages