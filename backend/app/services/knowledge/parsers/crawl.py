from firecrawl import FirecrawlApp

from app.core.config import settings

_app = FirecrawlApp(api_key=settings.FIRECRAWL_API_KEY)


def crawl_site(url: str, limit: int = 10) -> list[dict]:
    """Return a list of {title, markdown} pages."""
    result = _app.crawl_url(url, params={"limit": limit,
                                         "scrapeOptions": {"formats": ["markdown"]}})
    pages = []
    for item in result.get("data", []):
        md = item.get("markdown", "")
        title = (item.get("metadata", {}) or {}).get("title") or url
        if md:
            pages.append({"title": title, "markdown": md})
    return pages